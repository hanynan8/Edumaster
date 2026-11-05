// app/api/meetings/[id]/token/route.js
//
// 🆕 GET /api/meetings/[id]/token — بيولّد meeting token قصير العمر للدخول
// على غرفة Daily الخاصة بالاجتماع ده (شوف createDailyRoom في app/lib/daily.js
// — الغرفة بقت "private" فمعرفة الرابط لوحدها مش كافية للدخول).
//
// 🔒 ده الفحص الحقيقي الوحيد لصلاحية الدخول الفعلي على الفيديو نفسه (مش بس
// "هل الرابط يظهر في واجهة /meet ولا لأ"):
//   - مدرس/أدمن صاحب الاجتماع → owner token (صلاحيات تحكم كاملة في الغرفة).
//   - طالب → لازم يكون عنده enrollment/membership فعلية على كورس الاجتماع
//     (نفس فحص getCourseAccessForUser المستخدم لمحتوى الكورس العادي).
//   - 🆕 مدعو بالإيميل (Meeting.invitedEmails) → بيدخل حتى لو مش طالب في الكورس.
//   - غير كده → 403، ومفيش توكن يتولّد خالص.
//
// بيرجع 400 واضح لو الاجتماع source == "manual" (رابط منصة تانية، مفيش
// Daily room نتولّدله توكن أصلًا).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { requireSession, isMeetingStaff, isMeetingRoomHost } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createMeetingToken, createDailyRoom, deleteDailyRoom, isDailyRoomGoneError, checkDailyRoomExists } from "@/app/lib/daily";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { checkMeetingAccess } from "@/app/lib/meetingInvites";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🆕 self-heal: لو غرفة Daily اتمسحت/اتفقدت وإحنا لسه جوه وقت المحاضرة، بنعمل غرفة جديدة
// بنفس المعاد ونحدّث الاجتماع — بدل ما الطلاب كلهم يفضلوا بيشوفوا خطأ لحد ما حد يتدخّل يدويًا.
// الاستبدال ذرّي (بشرط إن dailyRoomName لسه القديم) عشان لو طالبين دخلوا في نفس اللحظة
// ماتتعملش غرفتين: اللي يخسر السباق بيمسح غرفته ويستخدم اللي اتحفظت.
async function recreateMeetingRoom(Meeting, meeting, endDate) {
  let created;
  try {
    created = await createDailyRoom({ startDate: meeting.scheduledAt, endDate });
  } catch (err) {
    console.error("[/api/meetings/[id]/token] room re-creation failed:", err);
    return null;
  }
  const updated = await Meeting.findOneAndUpdate(
    { _id: meeting._id, dailyRoomName: meeting.dailyRoomName },
    { $set: { dailyRoomName: created.roomName, link: created.joinUrl } },
    { new: true }
  );
  if (updated) return { roomName: updated.dailyRoomName, link: updated.link };
  await deleteDailyRoom(created.roomName);
  const fresh = await Meeting.findById(meeting._id, "dailyRoomName link").lean();
  return fresh?.dailyRoomName ? { roomName: fresh.dailyRoomName, link: fresh.link } : null;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Meeting = getMeetingModel();
    const meeting = await Meeting.findById(id);
    if (!meeting) return jsonResponse({ error: "not_found" }, 404);

    if (meeting.source !== "daily" || !meeting.dailyRoomName) {
      return jsonResponse({ error: "not_a_daily_meeting" }, 400);
    }

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY: كل نداء هنا بيولّد meeting token حقيقي عن طريق نداء
    // Daily.co API فعلي (تكلفة + استهلاك). من غير الحد ده، أي مستخدم مسجّل
    // دخول (حتى لو معاه صلاحية شرعية) يقدر يقصف الـ endpoint ده آلاف المرات
    // في الدقيقة (سكريبت، تاب مفتوح بيعمل retry تلقائي...) — مفتاح الحد هنا
    // بالـ user id (مش IP بس) عشان يمنع نفس المستخدم من تجاوز الحد بتغيير
    // شبكته/IP، والحد نفسه (30 كل دقيقة) سخي كفاية لأي استخدام طبيعي (فتح
    // المودال، إعادة محاولة يدوية بعد خطأ شبكة، ...).
    const rl = await enforceRateLimit(request, {
      keyPrefix: "meetings:token",
      limit: 30,
      windowSeconds: 60,
      extraKey: session.user.id,
    });
    if (rl) return rl;

    // 🆕 الدخول: المدرّس بيدخل زي الطالب (مدعو بالإيميل / جلسة عامة / enrollment)
    // — isManager (تخطّي فحص الدخول) للأدمن/الموديريتور بس.
    const isManager = isMeetingStaff(session);
    // 🆕 لكن جوه الغرفة نفسها: أي مدرّس (طالما اتسمحله يدخل) بياخد Daily owner
    // token = أدمن الميتنج (يكتم/يطرد مشاركين، يبدأ تسجيل...). ده مابيدّيهوش
    // صلاحية إنشاء/تعديل/حذف الميتنجس من الموقع.
    const isRoomHost = isMeetingRoomHost(session);
    // 🔒 فحص الدخول الموحّد (app/lib/meetingInvites.js checkMeetingAccess):
    //   مدرس/أدمن صاحب الاجتماع، أو 🆕 مدعو بالإيميل (Meeting.invitedEmails)،
    //   أو جلسة عامة (أي مستخدم مسجّل)، أو طالب بوصول فعلي على كورس الاجتماع.
    //   access.reason بيدي سبب دقيق (اشتراك منتهي، enrollment اتلغى...) —
    //   شوف app/lib/access.js وapp/components/DailyMeetingModal.jsx.
    const Course = getCourseModel();
    const accessCheck = await checkMeetingAccess({
      meeting,
      session,
      isManager,
      findCourse: (courseId) => Course.findById(courseId, "_id").lean(),
      getCourseAccess: getCourseAccessForUser,
    });
    if (!accessCheck.allowed) {
      return jsonResponse(
        { error: accessCheck.error, ...(accessCheck.reason ? { reason: accessCheck.reason } : {}) },
        accessCheck.status
      );
    }

    // 🕐 نفس هامش الغرفة (ربع ساعة قبل / ساعتين بعد) — لو المستخدم بيحاول
    // ياخد توكن بعيد جدًا عن معاد المحاضرة، Daily نفسها هترفض الدخول برضه
    // (nbf/exp على مستوى الغرفة)، فمش لازم نكرر الفحص هنا يدويًا.
    const endDate = new Date(meeting.scheduledAt.getTime() + meeting.durationMinutes * 60_000);

    // 🆕 الغرفة بتنتهي بعد نهاية المحاضرة بساعتين (شوف createDailyRoom) — مفيش داعي
    // نكلّم Daily لو الوقت عدّى.
    if (Date.now() > endDate.getTime() + 2 * 60 * 60_000) {
      return jsonResponse({ error: "meeting_ended" }, 410);
    }

    const issueToken = (roomName) =>
      createMeetingToken({
        roomName,
        userId: session.user.id,
        userName: session.user.name,
        isOwner: isRoomHost,
        startDate: meeting.scheduledAt,
        endDate,
      });

    let token;
    let roomName = meeting.dailyRoomName;
    let roomUrl = meeting.link;

    // 🆕 Daily بتولّد توكن حتى لو الغرفة اتمسحت، فالـ self-heal تحت مكانش بيشتغل
    // والدخول كان بيفشل بـ "You are not allowed to join this meeting".
    // بنتأكد الأول إن الغرفة موجودة، وإلا نعيد إنشاءها بنفس المعاد.
    if (!(await checkDailyRoomExists(roomName))) {
      console.warn(`[/api/meetings/${id}/token] Daily room "${roomName}" not found (404) — re-creating`);
      const healed = await recreateMeetingRoom(Meeting, meeting, endDate);
      if (!healed) return jsonResponse({ error: "room_unavailable" }, 410);
      roomName = healed.roomName;
      roomUrl = healed.link;
    }

    try {
      token = await issueToken(roomName);
    } catch (tokenErr) {
      console.error("[/api/meetings/[id]/token] createMeetingToken failed:", tokenErr);
      if (!isDailyRoomGoneError(tokenErr)) throw tokenErr;
      // 🆕 الغرفة اتمسحت/اتفقدت عند Daily → نحاول نعيد إنشاءها (self-heal).
      const healed = await recreateMeetingRoom(Meeting, meeting, endDate);
      if (!healed) return jsonResponse({ error: "room_unavailable" }, 410);
      roomName = healed.roomName;
      roomUrl = healed.link;
      try {
        token = await issueToken(roomName);
      } catch (retryErr) {
        console.error("[/api/meetings/[id]/token] token after re-creation failed:", retryErr);
        if (isDailyRoomGoneError(retryErr)) return jsonResponse({ error: "room_unavailable" }, 410);
        throw retryErr;
      }
    }

    return jsonResponse({ token, url: roomUrl, roomName });
  } catch (err) {
    console.error("[/api/meetings/[id]/token] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}