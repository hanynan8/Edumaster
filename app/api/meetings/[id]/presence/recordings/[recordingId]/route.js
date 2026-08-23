// app/api/meetings/[id]/recordings/[recordingId]/route.js
//
// 🆕 GET — بيولّد رابط تشغيل/تحميل مؤقت (access-link) لتسجيل معيّن مرتبط
// بمحاضرة، ويحوّل الطلب عليه مباشرة (302). بنولّد الرابط وقت الطلب مش
// بنخزّنه جاهز، لأنه بينتهي بعد فترة قصيرة من Daily نفسها (شوف
// getDailyRecordingAccessLink في app/lib/daily.js).
//
// نفس فحص صلاحية الدخول على المحاضرة نفسها (مدرس/أدمن صاحبها، أو طالب
// عنده وصول فعلي على الكورس) — التسجيل جزء من محتوى المحاضرة، فمينفعش أي
// حد عنده الرابط يشوفه من غير ما يتأكد إنه فعلًا يستاهل يشوفها.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { getDailyRecordingAccessLink } from "@/app/lib/daily";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const { id, recordingId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Meeting = getMeetingModel();
    const meeting = await Meeting.findById(id);
    if (!meeting) return jsonResponse({ error: "not_found" }, 404);

    const hasRecording = meeting.recordings.some((r) => r.dailyRecordingId === recordingId);
    if (!hasRecording) return jsonResponse({ error: "recording_not_found" }, 404);

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

    const downloadLink = await getDailyRecordingAccessLink(recordingId);
    return jsonResponse({ url: downloadLink });
  } catch (err) {
    console.error("[/api/meetings/[id]/recordings/[recordingId]] GET error:", err);
    return jsonResponse({ error: "recording_unavailable" }, 502);
  }
}