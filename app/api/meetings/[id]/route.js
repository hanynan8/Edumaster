// app/api/meetings/[id]/route.js
//
// PUT/DELETE على اجتماع واحد — صاحب الاجتماع (المدرس اللي أنشأه) أو أدمن
// بس. عكس Announcement (حذف بس، مفيش تعديل)، هنا سمحنا بـ PUT لأن تفاصيل
// المحاضرة (المعاد، اللينك) بتتغيّر فعليًا أكتر من إعلان نصي.
//
// 🆕 المحاضرات المتكررة (Meeting.seriesId): زي Teams بالظبط، التعديل والحذف
// ليهم نطاقين (scope):
//   - "single" (الافتراضي): المحاضرة دي بس.
//   - "following": المحاضرة دي + كل المحاضرات اللي بعدها في نفس السلسلة. اللي
//     قبلها (خلصت بتسجيلاتها) مابتتأثرش أبدًا.
// بيتبعت في body.scope (PUT) أو ?scope= (PUT/DELETE). لو الاجتماع مش ضمن
// سلسلة، بيتعامل معاه كـ "single" تلقائيًا.
//
// 🔁 تعديل موعد "following": المحاضرة المعدّلة بتاخد الموعد الجديد بالظبط،
// وباقي المحاضرات بتتزحزح بنفس فرق الأيام + الساعة المحلية الجديدة (بتوقيت
// recurrence.timeZone) — فالساعة بتفضل ثابتة حتى لو DST اتغيّر في النص.
//
// 📧 invitedEmails في PUT = القائمة الكاملة الجديدة. الإيميلات المضافة بس
// بيتبعتلها دعوة؛ المحذوفة بتفقد صلاحية الدخول فورًا.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { deleteDailyRoom, updateDailyRoom } from "@/app/lib/daily";
import { serializeMeeting } from "@/app/lib/meetingSerialize";
import { notifyMeetingChange } from "@/app/lib/meetingNotify";
import {
  isValidHttpUrl,
  sendInvitations,
  findUnregisteredEmails,
  findTeacherConflict,
  isInPast,
} from "@/app/lib/meetingCreate";
import { parseInvitedEmails, diffInvitedEmails } from "@/app/lib/meetingInvites";
import { shiftWallClock, getZonedParts, localDayDiff, normalizeTimeZone } from "@/app/lib/meetingRecurrence";

// قوائم مدعوين كبيرة = إيميلات كتير (Resend batch) — نرفع حد وقت التنفيذ على Vercel.
export const maxDuration = 60;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// بيرجّع الاجتماعات المستهدفة حسب النطاق (دايمًا فيها الاجتماع نفسه).
async function resolveTargets(Meeting, meeting, scope) {
  if (scope === "following" && meeting.seriesId) {
    return Meeting.find({ seriesId: meeting.seriesId, scheduledAt: { $gte: meeting.scheduledAt } }).sort({
      scheduledAt: 1,
    });
  }
  return [meeting];
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Meeting = getMeetingModel();
    const meeting = await Meeting.findById(id);
    if (!meeting) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isOwnerOrAdmin(session, meeting.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "invalid_body" }, 400);

    const scope = (body.scope || new URL(request.url).searchParams.get("scope")) === "following" ? "following" : "single";

    // ---- تحقق من كل المدخلات الأول (قبل ما نغيّر أي حاجة في أي اجتماع) ----
    let title;
    if (body.title !== undefined) {
      title = String(body.title).trim();
      if (!title) return jsonResponse({ error: "missing_title" }, 400);
      title = title.slice(0, 200);
    }

    const description = body.description !== undefined ? String(body.description).trim().slice(0, 2000) : undefined;

    let newLink;
    if (body.link !== undefined) {
      newLink = String(body.link).trim();
      if (!newLink || !isValidHttpUrl(newLink)) return jsonResponse({ error: "invalid_link" }, 400);
      // 🔒 لو اللينك مطابق للي في المحاضرة المعدّلة نفسها، يبقى المدرس ماغيّروش
      // (الواجهة بتبعته دايمًا مع باقي الحقول). لازم نتجاهله هنا، وإلا في تعديل
      // "following" كل غرف Daily بتاعة باقي السلسلة هتتمسح وتتحول يدوي بنفس
      // لينك المحاضرة دي.
      if (newLink === meeting.link) newLink = undefined;
    }

    let newScheduledAt;
    if (body.scheduledAt !== undefined) {
      newScheduledAt = new Date(body.scheduledAt);
      if (Number.isNaN(newScheduledAt.getTime())) return jsonResponse({ error: "invalid_scheduled_at" }, 400);
      // 🕐 الواجهة بتبعت scheduledAt دايمًا (حتى لو المدرس عدّل العنوان بس) — فالرفض
      // بيتم بس لو الموعد اتغيّر فعلًا لوقت في الماضي، مش لمجرد إن المحاضرة قديمة.
      // 🔧 الفورم بيقصّ الموعد لأقرب دقيقة (datetime-local) — فمحاضرة موعدها فيه ثواني/ms
      // كان تعديل عنوانها بس بيتحسب "تغيير موعد" (إشعار للطلاب + تحديث غرفة Daily).
      // فرق أقل من دقيقة = من غير تغيير.
      if (Math.abs(newScheduledAt.getTime() - meeting.scheduledAt.getTime()) < 60_000) {
        newScheduledAt = undefined;
      } else if (isInPast(newScheduledAt)) {
        return jsonResponse({ error: "scheduled_in_past" }, 400);
      }
    }

    let newDuration;
    if (body.durationMinutes !== undefined) {
      newDuration = Number(body.durationMinutes);
      if (!Number.isFinite(newDuration) || newDuration <= 0) newDuration = 60;
      newDuration = Math.min(480, Math.max(5, Math.round(newDuration)));
    }

    let newInvitedEmails;
    let addedEmails = [];
    if (body.invitedEmails !== undefined) {
      const { emails, invalid } = parseInvitedEmails(body.invitedEmails);
      if (invalid.length > 0) return jsonResponse({ error: "invalid_emails", invalid }, 400);
      newInvitedEmails = emails;
      addedEmails = diffInvitedEmails(meeting.invitedEmails, emails).added;
      // 🔒 الإيميلات المضافة حديثًا لازم تكون لمستخدمين مسجّلين في الموقع (مفيش حد أقصى للعدد).
      const unknownEmails = await findUnregisteredEmails(addedEmails);
      if (unknownEmails.length > 0) return jsonResponse({ error: "unknown_emails", invalid: unknownEmails }, 400);
    }

    const targets = await resolveTargets(Meeting, meeting, scope);

    // 🔁 زحزحة الموعد لباقي السلسلة (بالساعة المحلية) — محسوبة من تغيير
    // المحاضرة المعدّلة نفسها.
    let shift = null;
    if (newScheduledAt && meeting.scheduledAt.getTime() !== newScheduledAt.getTime() && targets.length > 1) {
      const tz = normalizeTimeZone(meeting.recurrence?.timeZone || body.timeZone);
      const np = getZonedParts(newScheduledAt, tz);
      shift = {
        tz,
        deltaDays: localDayDiff(meeting.scheduledAt, newScheduledAt, tz),
        hour: np.hour,
        minute: np.minute,
      };
    }

    const originalId = meeting._id.toString();
    let dailyWarning = null;
    let dateChanged = false;

    // الموعد الجديد المخطَّط لكل محاضرة مستهدفة (null = من غير تغيير).
    const plannedDate = (target) => {
      if (!newScheduledAt) return null;
      const isEdited = target._id.toString() === originalId;
      return isEdited ? newScheduledAt : shift ? shiftWallClock(target.scheduledAt, shift, shift.tz) : null;
    };

    // ⚔️ تعارض مواعيد المدرس — بنفحص قبل ما نحفظ أي حاجة (كله أو مفيش)، وبنستبعد
    // المحاضرات اللي بتتعدّل نفسها. بنفحص بس اللي موعده أو مدته اتغيّر فعلًا.
    const changedSlots = [];
    for (const target of targets) {
      const nextDate = plannedDate(target);
      const start = nextDate || target.scheduledAt;
      const duration = newDuration !== undefined ? newDuration : target.durationMinutes;
      const slotDateChanged = nextDate && target.scheduledAt.getTime() !== nextDate.getTime();
      const durationChanged = newDuration !== undefined && target.durationMinutes !== newDuration;
      if (slotDateChanged || durationChanged) changedSlots.push({ start, durationMinutes: duration });
    }
    if (changedSlots.length > 0) {
      const conflict = await findTeacherConflict({
        teacherId: meeting.teacher,
        slots: changedSlots,
        excludeIds: targets.map((t) => t._id),
      });
      if (conflict) return jsonResponse({ error: "schedule_conflict", conflict }, 409);
    }

    for (const target of targets) {
      let scheduleChanged = false;

      if (title !== undefined) target.title = title;
      if (description !== undefined) target.description = description;
      if (newInvitedEmails !== undefined) target.invitedEmails = newInvitedEmails;

      if (newLink !== undefined) {
        // 🆕 لو المدرس عدّل اللينك يدويًا لاجتماع كان متولّد عن طريق Daily،
        // بقى دلوقتي مصدره "manual" — ونمسح غرفة Daily القديمة (best-effort،
        // مش لازم توقف حفظ التعديل لو الحذف فشل).
        if (target.source === "daily" && target.link !== newLink) {
          await deleteDailyRoom(target.dailyRoomName);
          target.dailyRoomName = null;
          target.source = "manual";
        }
        target.link = newLink;
      }

      if (newScheduledAt) {
        const nextDate = plannedDate(target);
        if (nextDate && target.scheduledAt.getTime() !== nextDate.getTime()) {
          scheduleChanged = true;
          dateChanged = true;
          target.scheduledAt = nextDate;
          // 🔔 الموعد اتغيّر → التذكير اللي اتبعت (لو اتبعت) كان للموعد القديم؛ نصفّره
          // عشان الـ cron يبعت تذكير جديد قبل الموعد الجديد بـ10 دقايق.
          target.reminderSentAt = null;
        }
      }

      if (newDuration !== undefined && target.durationMinutes !== newDuration) {
        scheduleChanged = true;
        target.durationMinutes = newDuration;
      }

      await target.save();

      // 🆕 لو المعاد أو المدة اتغيّروا لاجتماع مصدره Daily، لازم نحدّث nbf/exp
      // في الغرفة الفعلية على Daily برضه — وإلا الغرفة تفضل حابسة على المعاد
      // القديم وترفض الدخول حتى لو الداتابيز عندنا محدّثة (شوف تعليق
      // updateDailyRoom في app/lib/daily.js). best-effort: فشل التحديث مايمنعش
      // حفظ التعديل نفسه، بس بنرجّع تحذير واضح للواجهة.
      if (scheduleChanged && target.source === "daily" && target.dailyRoomName) {
        try {
          const endDate = new Date(target.scheduledAt.getTime() + target.durationMinutes * 60_000);
          await updateDailyRoom(target.dailyRoomName, { startDate: target.scheduledAt, endDate });
        } catch (err) {
          console.error("[/api/meetings/[id]] Daily room update failed:", err);
          dailyWarning =
            "تم حفظ التعديل، لكن حدثت مشكلة في تحديث موعد الغرفة على Daily لواحدة أو أكتر من المحاضرات — إذا رفض الرابط الدخول، احذف المحاضرة وأنشئها من جديد.";
        }
      }
    }

    // ⚠️ في تعديل "هذه والتالية" الـ targets بتتجاب بـ find() جديد، فالـ doc اللي في
    // `meeting` فوق مش هو اللي اتحفظ (قيمه قديمة). بنستخدم النسخة المحفوظة فعلًا
    // للإشعار والدعوات والرد.
    const edited = targets.find((t) => t._id.toString() === originalId) || meeting;

    // 🔔 إبلاغ المسجّلين والمدعوين بتغيير الموعد (إشعار داخل الموقع، best-effort).
    if (dateChanged) {
      await notifyMeetingChange({
        meeting: edited,
        kind: "rescheduled",
        actorId: session.user.id,
        count: targets.length,
      });
    }

    // 📧 دعوات للإيميلات المضافة حديثًا بس (مرة واحدة، على المحاضرة المعدّلة).
    let invitesSent = 0;
    if (addedEmails.length > 0) {
      let courseTitle = "";
      if (meeting.course) {
        const Course = getCourseModel();
        const course = await Course.findById(meeting.course, "title").lean();
        courseTitle = course?.title || "";
      }
      const invites = await sendInvitations({
        emails: addedEmails,
        inviterId: session.user.id,
        inviterName: session.user.name,
        firstMeeting: edited,
        courseTitle,
        // 🔁 تعديل "هذه والتالية": الدعوة بتوصف السلسلة المتأثرة كلها (بتتبعت مرة واحدة).
        occurrences: targets.length,
        recurrenceRule: targets.length > 1 ? edited.recurrence : null,
      });
      invitesSent = invites.emailed;
    }

    return jsonResponse({
      ...serializeMeeting(edited, { includeInvitees: true }),
      updated: targets.length,
      invitesSent,
      ...(dailyWarning ? { warning: dailyWarning } : {}),
    });
  } catch (err) {
    console.error("[/api/meetings/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Meeting = getMeetingModel();
    const meeting = await Meeting.findById(id);
    if (!meeting) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isOwnerOrAdmin(session, meeting.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const scope = new URL(request.url).searchParams.get("scope") === "following" ? "following" : "single";
    const targets = await resolveTargets(Meeting, meeting, scope);

    // 🆕 best-effort — لو الاجتماع كان متولّد عن طريق Daily، نمسح الغرفة
    // الفعلية معاه بدل ما نسيبها معلّقة لحد exp (شوف app/lib/daily.js).
    await Promise.all(
      targets
        .filter((t) => t.source === "daily" && t.dailyRoomName)
        .map((t) => deleteDailyRoom(t.dailyRoomName))
    );

    const ids = targets.map((t) => t._id.toString());
    await Meeting.deleteMany({ _id: { $in: targets.map((t) => t._id) } });

    // 🔔 إبلاغ المتأثرين بالإلغاء — بس للمحاضرات اللي لسه ماحصلتش (حذف محاضرة قديمة
    // لتنظيف القائمة مايستاهلش إشعار). المستند اتحذف بس لسه object في الذاكرة.
    const upcoming = targets.filter((t) => t.scheduledAt.getTime() > Date.now());
    if (upcoming.length > 0) {
      await notifyMeetingChange({
        meeting: upcoming[0],
        kind: "cancelled",
        actorId: session.user.id,
        count: upcoming.length,
      });
    }
    return jsonResponse({ success: true, deleted: ids.length, ids });
  } catch (err) {
    console.error("[/api/meetings/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
