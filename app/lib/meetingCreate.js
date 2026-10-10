// app/lib/meetingCreate.js
//
// 🆕 منطق إنشاء محاضرة (أو سلسلة محاضرات متكررة) مشترك بين:
//   - POST /api/courses/[id]/meetings   (محاضرة داخل كورس)
//   - POST /api/meetings                (جلسة عامة بدون كورس)
// قبل كده نفس الكود (parse الـ body + غرفة Daily + fallback اليدوي) كان
// متكرر في الـ route-ين؛ بعد إضافة التكرار والمدعوين بالإيميل بقى منطق كبير
// فمركزناه هنا.
//
// body المقبول: { title, scheduledAt, description?, durationMinutes?, link?,
//   invitedEmails? (array أو نص), timeZone?, recurrence? }
// invitedEmails: إيميلات مستخدمين مسجّلين في الموقع بس، من غير حد أقصى للعدد.
// recurrence: { frequency: "daily"|"weekly"|"monthly", interval?, daysOfWeek?,
//   endType: "count"|"until", count?, until? } — شوف app/lib/meetingRecurrence.js

import mongoose from "mongoose";
import { getMeetingModel } from "@/app/lib/models";
import { getAuthModel } from "@/app/lib/mongodb";
import { isDailyConfigured, createDailyRoom, deleteDailyRoom } from "@/app/lib/daily";
import { createNotificationsForUsers } from "@/app/lib/notificationHelpers";
import { sendMeetingInviteEmails } from "@/app/lib/emailHelpers";
import { parseInvitedEmails } from "@/app/lib/meetingInvites";
import {
  expandRecurrence,
  normalizeRecurrence,
  normalizeTimeZone,
  describeRecurrence,
} from "@/app/lib/meetingRecurrence";

const ROOM_BATCH_SIZE = 5;

export function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function fail(status, body) {
  return { ok: false, status, body };
}

/**
 * 🆕 الإيميلات (lowercase) اللي مالهاش حساب مسجّل في الموقع. المنتقي في الواجهة
 * بيعرض مستخدمين مسجّلين بس، لكن الـ API لازم يتحقق برضه (مايتوثقش في الفرونت).
 * بنقسّم الاستعلام على دفعات عشان قوائم المدعوين الكبيرة.
 */
export async function findUnregisteredEmails(emails) {
  if (!emails || emails.length === 0) return [];
  const AuthModel = getAuthModel();
  const found = new Set();
  const CHUNK = 1000;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const users = await AuthModel.find({ email: { $in: emails.slice(i, i + CHUNK) } }, "email").lean();
    for (const u of users) found.add(String(u.email).toLowerCase());
  }
  return emails.filter((e) => !found.has(e));
}

// بينشئ غرف Daily لكل المواعيد (بحد أقصى 5 في نفس الوقت). لو أي غرفة فشلت،
// بنمسح اللي اتعمل منها ونرمي الخطأ (كله أو مفيش — مفيش سلسلة نص مكتملة).
async function createRoomsForDates(dates, durationMinutes) {
  const rooms = new Array(dates.length).fill(null);
  let failure = null;

  for (let i = 0; i < dates.length && !failure; i += ROOM_BATCH_SIZE) {
    const batch = dates.slice(i, i + ROOM_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((startDate) =>
        createDailyRoom({ startDate, endDate: new Date(startDate.getTime() + durationMinutes * 60_000) })
      )
    );
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") rooms[i + j] = s.value;
      else if (!failure) failure = s.reason;
    });
  }

  if (failure) {
    await Promise.all(rooms.filter(Boolean).map((r) => deleteDailyRoom(r.roomName)));
    throw failure;
  }
  return rooms;
}

/**
 * @param {object} params
 * @param {string} params.teacherId
 * @param {string|null} params.courseId
 * @param {object} params.body
 * @returns {Promise<{ok:true, meetings:object[], seriesId:string|null, invitedEmails:string[], recurrenceRule:object|null} | {ok:false, status:number, body:object}>}
 */
export async function createMeetingOrSeries({ teacherId, courseId = null, body }) {
  const title = String(body?.title || "").trim();
  const manualLink = String(body?.link || "").trim();
  const description = String(body?.description || "").trim();
  if (!title) return fail(400, { error: "missing_title" });

  const scheduledAt = new Date(body?.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return fail(400, { error: "invalid_scheduled_at" });

  let durationMinutes = Number(body?.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) durationMinutes = 60;
  durationMinutes = Math.min(480, Math.max(5, Math.round(durationMinutes)));

  // 📧 المدعوين بالإيميل
  const { emails: invitedEmails, invalid } = parseInvitedEmails(body?.invitedEmails);
  if (invalid.length > 0) return fail(400, { error: "invalid_emails", invalid });
  // 🔒 الدعوة لمستخدمين مسجّلين في الموقع بس (مفيش حد أقصى للعدد).
  const unknownEmails = await findUnregisteredEmails(invitedEmails);
  if (unknownEmails.length > 0) return fail(400, { error: "unknown_emails", invalid: unknownEmails });

  // 🔁 التكرار
  const timeZone = normalizeTimeZone(body?.timeZone);
  let dates = [scheduledAt];
  let recurrenceRule = null;
  const wantsRecurrence = body?.recurrence && body.recurrence.frequency && body.recurrence.frequency !== "none";
  if (wantsRecurrence) {
    const norm = normalizeRecurrence(body.recurrence);
    if (norm.error) return fail(400, { error: norm.error });
    const expanded = expandRecurrence({ startDate: scheduledAt, recurrence: body.recurrence, timeZone });
    if (expanded.error) return fail(400, { error: expanded.error });
    dates = expanded.dates;
    recurrenceRule = { ...norm.value, timeZone };
  }

  // 🔗 الروابط: Daily أولًا (غرفة لكل محاضرة)، وإلا الرابط اليدوي لكل المحاضرات.
  let links; // [{ link, source, dailyRoomName }]
  const manualLinks = () =>
    dates.map(() => ({ link: manualLink, source: "manual", dailyRoomName: null }));

  if (isDailyConfigured()) {
    try {
      const rooms = await createRoomsForDates(dates, durationMinutes);
      links = rooms.map((r) => ({ link: r.joinUrl, source: "daily", dailyRoomName: r.roomName }));
    } catch (err) {
      console.error("[meetingCreate] Daily auto-create failed, falling back:", err);
      if (!manualLink || !isValidHttpUrl(manualLink)) {
        return fail(502, {
          error: "daily_meeting_failed",
          message: "فشل إنشاء الاجتماع تلقائيًا عبر Daily — أرسل رابطًا يدويًا كبديل.",
        });
      }
      links = manualLinks();
    }
  } else {
    if (!manualLink || !isValidHttpUrl(manualLink)) return fail(400, { error: "invalid_link" });
    links = manualLinks();
  }

  const seriesId = dates.length > 1 ? new mongoose.Types.ObjectId() : null;
  const Meeting = getMeetingModel();
  let created;
  try {
    created = await Meeting.insertMany(
      dates.map((date, i) => ({
        course: courseId,
        teacher: teacherId,
        title: title.slice(0, 200),
        description: description.slice(0, 2000),
        link: links[i].link,
        source: links[i].source,
        dailyRoomName: links[i].dailyRoomName,
        scheduledAt: date,
        durationMinutes,
        invitedEmails,
        seriesId,
        seriesIndex: seriesId ? i + 1 : null,
        recurrence: seriesId ? recurrenceRule : null,
      }))
    );
  } catch (err) {
    // الداتابيز فشلت بعد ما الغرف اتعملت — نمسحها بدل ما تفضل معلّقة.
    await Promise.all(links.filter((l) => l.dailyRoomName).map((l) => deleteDailyRoom(l.dailyRoomName)));
    throw err;
  }

  return {
    ok: true,
    meetings: created,
    seriesId: seriesId ? seriesId.toString() : null,
    invitedEmails,
    recurrenceRule,
  };
}

/**
 * 📨 بيبعت دعوات الإيميل + إشعار داخل الموقع للمدعوين اللي ليهم حساب.
 * best-effort بالكامل (فشله مايوقفش نجاح الإنشاء). بيتنده مرة واحدة لكل
 * سلسلة (على أول محاضرة) — مش لكل محاضرة.
 * @param {object} params
 * @param {string[]} params.emails - الإيميلات اللي هتتبعتلها دعوة (بعد استبعاد اللي اتبلّغوا بطريقة تانية)
 */
export async function sendInvitations({
  emails,
  inviterId,
  inviterName,
  firstMeeting,
  courseTitle = "",
  occurrences = 1,
  recurrenceRule = null,
}) {
  try {
    if (!emails || emails.length === 0) return { emailed: 0 };

    // إشعار داخل الموقع للمدعوين اللي عندهم حساب (غير المنشئ نفسه).
    try {
      const AuthModel = getAuthModel();
      const users = await AuthModel.find({ email: { $in: emails } }, "_id").lean();
      const userIds = users.map((u) => u._id.toString()).filter((id) => id !== String(inviterId));
      if (userIds.length > 0) {
        await createNotificationsForUsers(userIds, {
          type: "meeting_scheduled",
          title: `تمت دعوتك لمحاضرة مباشرة: ${firstMeeting.title}`,
          message: `${new Date(firstMeeting.scheduledAt).toLocaleString("ar-EG")}${
            occurrences > 1 ? ` — سلسلة من ${occurrences} محاضرات` : ""
          }`,
          link: "/meet",
          course: firstMeeting.course || null,
        });
      }
    } catch (err) {
      console.error("[meetingCreate] invite in-app notifications failed:", err);
    }

    const emailed = await sendMeetingInviteEmails(emails, {
      inviterName,
      meetingTitle: firstMeeting.title,
      description: firstMeeting.description || "",
      scheduledAt: firstMeeting.scheduledAt,
      durationMinutes: firstMeeting.durationMinutes,
      courseTitle,
      occurrences,
      recurrenceLabel: recurrenceRule ? describeRecurrence(recurrenceRule, "en") : "",
    });
    return { emailed };
  } catch (err) {
    console.error("[meetingCreate] sendInvitations failed:", err);
    return { emailed: 0 };
  }
}
