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
//   - غير كده → 403، ومفيش توكن يتولّد خالص.
//
// بيرجع 400 واضح لو الاجتماع source == "manual" (رابط منصة تانية، مفيش
// Daily room نتولّدله توكن أصلًا).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createMeetingToken } from "@/app/lib/daily";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
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

    const isManager = isOwnerOrAdmin(session, meeting.teacher);
    if (!isManager) {
      // طالب: لازم وصول فعلي على كورس الاجتماع ده تحديدًا.
      const Course = getCourseModel();
      const course = await Course.findById(meeting.course, "_id").lean();
      if (!course) return jsonResponse({ error: "not_found" }, 404);

      const access = await getCourseAccessForUser({ userId: session.user.id, courseId: meeting.course });
      // 🆕 access.reason بيدي سبب دقيق (اشتراك منتهي، enrollment اتلغى...)
      // بدل رسالة عامة — شوف app/lib/access.js وapp/components/DailyMeetingModal.jsx.
      if (!access.hasAccess) return jsonResponse({ error: "forbidden", reason: access.reason }, 403);
    }

    // 🕐 نفس هامش الغرفة (ربع ساعة قبل / ساعتين بعد) — لو المستخدم بيحاول
    // ياخد توكن بعيد جدًا عن معاد المحاضرة، Daily نفسها هترفض الدخول برضه
    // (nbf/exp على مستوى الغرفة)، فمش لازم نكرر الفحص هنا يدويًا.
    const endDate = new Date(meeting.scheduledAt.getTime() + meeting.durationMinutes * 60_000);

    const token = await createMeetingToken({
      roomName: meeting.dailyRoomName,
      userId: session.user.id,
      userName: session.user.name,
      isOwner: isManager,
      startDate: meeting.scheduledAt,
      endDate,
    });

    return jsonResponse({ token, url: meeting.link, roomName: meeting.dailyRoomName });
  } catch (err) {
    console.error("[/api/meetings/[id]/token] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}