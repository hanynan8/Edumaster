// app/api/admin/courses/[id]/approve/route.js
//
// POST: موافقة الأدمن على كورس (عادةً status="pending") — بينشره فعليًا
// (status="published") ويظهر للطلاب على طول. admin-only (requireRole).
// نفس فلسفة app/api/admin/users/[id]/route.js: audit log بعد النجاح +
// إشعار داخلي لصاحب الكورس.
//
// 🔒 مقصود إننا مانفحصش إن الكورس status==="pending" قبل الموافقة — أدمن
// ممكن يوافق على كورس "draft" مباشرة برضه لو حب (مثلاً كورس مدرس قديم قبل
// ما نظام المراجعة ده يتفعّل)، المهم إنه مش "published" أصلاً (منطقيًا
// مفيش داعي "توافق" على حاجة منشورة بالفعل).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getCategoryModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { logAudit } from "@/app/lib/auditLog";
import { createNotification } from "@/app/lib/notificationHelpers";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeCourse(c) {
  return {
    id: c._id.toString(),
    title: c.title,
    slug: c.slug,
    thumbnail: resolveSecureStoredUrl(c.thumbnail),
    category: c.category?._id ? c.category._id.toString() : c.category?.toString(),
    categoryName: c.category?.name,
    teacher: c.teacher?._id ? c.teacher._id.toString() : c.teacher?.toString(),
    teacherName: c.teacher?.name,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function POST(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    getCategoryModel();
    const Course = getCourseModel();

    const course = await Course.findById(id).populate([
      { path: "category", select: "name slug" },
      { path: "teacher", select: "name" },
    ]);
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    if (course.status === "published") {
      return jsonResponse({ error: "already_published" }, 409);
    }

    const previousStatus = course.status;
    course.status = "published";
    await course.save();

    await logAudit({
      request,
      actor: session.user,
      action: "course.approved",
      targetId: course._id.toString(),
      details: { title: course.title, previousStatus },
    });

    // 🆕 best-effort — فشل الإشعار مايوقفش نجاح الموافقة نفسها
    const teacherId = course.teacher?._id || course.teacher;
    if (teacherId) {
      createNotification({
        user: teacherId,
        type: "course_approved",
        title: "تمت الموافقة على كورسك",
        message: `الأدمن وافق على نشر كورس "${course.title}" — بقى ظاهر للطلاب دلوقتي.`,
        link: `/teacher/courses/${course._id.toString()}`,
        course: course._id,
      }).catch((err) => console.error("[/api/admin/courses/[id]/approve] notify error:", err));
    }

    return jsonResponse(serializeCourse(course));
  } catch (err) {
    console.error("[/api/admin/courses/[id]/approve] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}