// app/api/meetings/[id]/presence/route.js
//
// 🆕 GET /api/meetings/[id]/presence — بيرجّع هل فيه حد داخل غرفة Daily
// الخاصة بالمحاضرة دي *فعليًا دلوقتي* ولا لأ (عدد الحاضرين الحقيقي).
//
// المشكلة اللي بيحلّها: حالة "شغالة/خلصت" في app/meet/page.jsx كانت بتتحسب
// بس من scheduledAt + durationMinutes مقابل الوقت الحالي — لو المدرس مدّ
// المحاضرة فعليًا أكتر من المدة المكتوبة، الواجهة كانت بتحطها في "خلصت"
// غلط رغم إنها لسه شغالة. الفرونت إند (app/meet/page.jsx) بينده الـ route
// ده بس للمحاضرات اللي حسابها الوقتي طلع "خلصت" حديثًا (مش لكل المحاضرات،
// تفاديًا لاستدعاءات زيادة لـ Daily API)، ولو فيه حاضرين فعليًا بيعاملها
// كـ"شغالة" برضه.
//
// نفس فحص الصلاحية بتاع token/route.js: مدرس/أدمن صاحب الاجتماع أو طالب
// عنده وصول فعلي على الكورس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { getDailyRoomPresence } from "@/app/lib/daily";

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
      // اجتماع يدوي — مفيش حاجة نقدر نتحقق منها فعليًا، بنسيب الحساب
      // الوقتي زي ما هو في الفرونت إند.
      return jsonResponse({ active: false, count: 0 });
    }

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const isManager = isOwnerOrAdmin(session, meeting.teacher);
    if (!isManager) {
      const Course = getCourseModel();
      const course = await Course.findById(meeting.course, "_id").lean();
      if (!course) return jsonResponse({ error: "not_found" }, 404);
      const access = await getCourseAccessForUser({ userId: session.user.id, courseId: meeting.course });
      if (!access.hasAccess) return jsonResponse({ error: "forbidden", reason: access.reason }, 403);
    }

    const { count } = await getDailyRoomPresence(meeting.dailyRoomName);
    return jsonResponse({ active: count > 0, count });
  } catch (err) {
    console.error("[/api/meetings/[id]/presence] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}