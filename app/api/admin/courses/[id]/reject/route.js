// app/api/admin/courses/[id]/reject/route.js
//
// POST: رفض الأدمن لكورس (عادةً status="pending") — بيتحذف بالكامل (الكورس
// + كل الـ Sections/Lessons بتاعته)، مفيش status="rejected" وسيط، الرفض
// نهائي وواضح زي ما اتطلب: "رفضه وحذفه بالكامل". admin-only (requireRole).
//
// body اختياري: { reason: string } — بتتبعت لصاحب الكورس في الإشعار (لو
// موجودة) عشان يعرف يظبط إيه لو حب يعيد المحاولة بكورس جديد.
//
// 🔒 SECURITY / DATA SAFETY: نفس حماية DELETE /api/courses/[id] — لو
// studentsCount > 0 بنرفض الحذف (كورس بالوضع ده مايفروضش يبقى فيه طلاب
// أصلاً لأنه مش published، لكن بنتحقق دفاعيًا زي أي حذف تاني في السيستم).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getSectionModel, getLessonModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { logAudit } from "@/app/lib/auditLog";
import { createNotification } from "@/app/lib/notificationHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    const body = await request.json().catch(() => ({}));
    const reason = String(body?.reason || "").trim().slice(0, 500);

    await connectToMongo();
    const Course = getCourseModel();
    const Section = getSectionModel();
    const Lesson = getLessonModel();

    const course = await Course.findById(id).populate({ path: "teacher", select: "name" });
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    if (course.status === "published") {
      return jsonResponse({ error: "already_published" }, 409);
    }

    const studentsCount = Number(course.studentsCount) || 0;
    if (studentsCount > 0) {
      return jsonResponse({ error: "course_has_students", studentsCount }, 409);
    }

    // بنحتفظ ببيانات الكورس اللي هنحتاجها بعد الحذف (للإشعار + الـ audit log)
    const courseTitle = course.title;
    const teacherId = course.teacher?._id || course.teacher;

    await Promise.all([
      Lesson.deleteMany({ course: course._id }),
      Section.deleteMany({ course: course._id }),
    ]);
    await course.deleteOne();

    await logAudit({
      request,
      actor: session.user,
      action: "course.rejected",
      targetId: id,
      details: { title: courseTitle, reason: reason || undefined },
    });

    // 🆕 best-effort — بعد الحذف مش قبله، عشان لو فشل الإشعار الحذف يفضل
    // ناجح برضه (الإشعار تفصيلة ثانوية، مش شرط لنجاح عملية الرفض)
    if (teacherId) {
      createNotification({
        user: teacherId,
        type: "course_rejected",
        title: "تم رفض كورسك",
        message: reason
          ? `الأدمن رفض كورس "${courseTitle}" وتم حذفه. السبب: ${reason}`
          : `الأدمن رفض كورس "${courseTitle}" وتم حذفه.`,
        link: "/teacher",
      }).catch((err) => console.error("[/api/admin/courses/[id]/reject] notify error:", err));
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/admin/courses/[id]/reject] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
