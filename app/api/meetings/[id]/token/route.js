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
import { createMeetingToken, ensureDailyRoom, isDailyRoomGoneError, isSameDailyAccount } from "@/app/lib/daily";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { checkMeetingAccess } from "@/app/lib/meetingInvites";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 مفيش "استبدال غرفة" هنا خالص (اتشال الـ self-heal القديم اللي كان بيكتب غرفة جديدة
// فوق القديمة في الداتابيز). ده كان سبب إن المدرس والطلاب يلاقوا نفسهم في غرفتين مختلفتين
// (حصة 6/11: الغرفة اتعملت من جديد بعد البداية بـ 26 دقيقة). دلوقتي:
//   - اسم الغرفة ثابت (Meeting.dailyRoomName) وما بيتغيّرش أبدًا.
//   - لو الغرفة مش موجودة عند Daily بنعملها بنفس الاسم → نفس الرابط بالظبط.
//   - لو حساب Daily اللي السيرفر شغال بيه (DAILY_API_KEY) غير حساب رابط المحاضرة،
//     بنرفض (409 daily_account_mismatch) بدل ما نعمل غرفة في حساب تاني ونقسّم الناس.

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

    // الغرفة المخزّنة في الداتابيز هي المرجع الوحيد — بنتأكد إنها موجودة (أو بنعملها بنفس
    // اسمها) من غير ما نكتب أي حاجة في الميتنج.
    const roomName = meeting.dailyRoomName;
    const ensureRoom = () =>
      ensureDailyRoom({ name: roomName, startDate: meeting.scheduledAt, endDate });

    let room;
    try {
      room = await ensureRoom();
    } catch (err) {
      console.error(`[/api/meetings/${id}/token] ensureDailyRoom("${roomName}") failed:`, err);
      return jsonResponse({ error: "internal_error" }, 502);
    }

    // 🔒 حارس الحساب: لو السيرفر ده شغال بمفتاح Daily لحساب غير اللي اتعملت فيه المحاضرة
    // (مثلًا نسخة تانية من الموقع بمفتاح قديم)، الغرفة اللي لسه اتأكدنا منها/عملناها في
    // حساب تاني ومش هي اللي الباقيين فيها. بنرفض بوضوح بدل ما نقسّم المدرس عن الطلاب.
    if (!isSameDailyAccount(room.joinUrl, meeting.link)) {
      console.error(
        `[/api/meetings/${id}/token] DAILY ACCOUNT MISMATCH: meeting.link="${meeting.link}" but this server's Daily account returned "${room.joinUrl}". ` +
          "Check DAILY_API_KEY on this deployment (all deployments must use the same key)."
      );
      return jsonResponse({ error: "daily_account_mismatch" }, 409);
    }
    if (room.created) {
      console.warn(`[/api/meetings/${id}/token] Daily room "${roomName}" was missing — re-created with the same name`);
    }

    let token;
    try {
      token = await issueToken(roomName);
    } catch (tokenErr) {
      console.error(`[/api/meetings/${id}/token] createMeetingToken failed:`, tokenErr);
      if (!isDailyRoomGoneError(tokenErr)) throw tokenErr;
      // الغرفة اتمسحت بين التأكد وإصدار التوكن (نادر جدًا) → نعيدها بنفس الاسم ونحاول مرة تانية.
      try {
        const again = await ensureRoom();
        if (!isSameDailyAccount(again.joinUrl, meeting.link)) {
          return jsonResponse({ error: "daily_account_mismatch" }, 409);
        }
        token = await issueToken(roomName);
      } catch (retryErr) {
        console.error(`[/api/meetings/${id}/token] retry after room loss failed:`, retryErr);
        return jsonResponse({ error: isDailyRoomGoneError(retryErr) ? "room_unavailable" : "internal_error" }, 502);
      }
    }

    // 🔒 الرابط والاسم دايمًا من الداتابيز (نفس القيمة لكل المشاركين).
    return jsonResponse({ token, url: meeting.link, roomName });
  } catch (err) {
    console.error("[/api/meetings/[id]/token] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}