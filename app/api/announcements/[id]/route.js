// app/api/announcements/[id]/route.js
//
// Phase 6 — اليوم 46-47: حذف إعلان واحد — صاحب الكورس (اللي الإعلان تابع
// له) أو أدمن بس. مفيش PUT/edit عن قصد (زي فلسفة Announcement.js: موديل
// بسيط، حذف وإعادة نشر أبسط من تتبع "معدَّل" على إعلان).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getAnnouncementModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Announcement = getAnnouncementModel();
    const announcement = await Announcement.findById(id);
    if (!announcement) return jsonResponse({ error: "not_found" }, 404);

    const Course = getCourseModel();
    const course = await Course.findById(announcement.course, "teacher").lean();
    // 🔒 لو الكورس نفسه اتمسح لأي سبب (نادر جدًا، Course.js بيمنع حذف
    // كورسات فيها طلاب) بنسمح للأدمن بس يمسح الإعلان اليتيم ده.
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    const canDelete = course ? isOwnerOrAdmin(session, course.teacher) : session.user.role === "admin";
    if (!canDelete) return jsonResponse({ error: "forbidden" }, 403);

    await announcement.deleteOne();
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/announcements/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}