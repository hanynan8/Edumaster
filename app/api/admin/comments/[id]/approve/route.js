// app/api/admin/comments/[id]/approve/route.js
//
// POST: موافقة الأدمن على تعليق/رد (status="pending" أو حتى "rejected" لو
// عاد الأدمن رأيه) — بتخليه يظهر على طول تحت محتوى الدرس في صفحة الكورس
// التفصيلية (LessonComments/GET /api/lessons/[id]/comments). admin-only.
//
// 🔔 دلوقتي بس، وقت الموافقة الفعلية، بنبعت إشعار comment_reply/
// comment_question الأصلي (للمدرس صاحب الكورس لو سؤال جديد، أو لصاحب
// السؤال الأصلي لو رد) — نفس الرسايل اللي كانت بتتبعت وقت الإنشاء قبل ما
// نظام المراجعة يتفعّل، بس دلوقتي بعد ما يبقى فعلاً مرئي.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCommentModel, getCourseModel, getLessonModel } from "@/app/lib/models";
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

    await connectToMongo();
    getCourseModel();
    getLessonModel();
    const Comment = getCommentModel();

    const comment = await Comment.findById(id).populate([
      { path: "course", select: "teacher" },
      { path: "lesson", select: "title" },
      { path: "parentComment", select: "user" },
    ]);
    if (!comment) return jsonResponse({ error: "not_found" }, 404);
    if (comment.status === "approved") return jsonResponse({ error: "already_approved" }, 409);

    const previousStatus = comment.status;
    comment.status = "approved";
    comment.moderatedBy = session.user.id;
    comment.moderatedAt = new Date();
    await comment.save();

    await logAudit({
      request,
      actor: session.user,
      action: "comment.approved",
      targetId: comment._id.toString(),
      details: { previousStatus, isReply: !!comment.parentComment },
    });

    // 🆕 best-effort — إشعار للطرف المعني إن التعليق بقى ظاهر
    if (comment.parentComment) {
      const askerId = comment.parentComment.user;
      if (askerId && String(askerId) !== String(comment.user)) {
        createNotification({
          user: askerId,
          type: "comment_reply",
          title: "رد جديد على سؤالك",
          message: comment.body.slice(0, 200),
          link: `/courses/${comment.course._id || comment.course}`,
          course: comment.course._id || comment.course,
        }).catch((err) => console.error("[/api/admin/comments/[id]/approve] notify error:", err));
      }
    } else {
      const teacherId = comment.course?.teacher;
      if (teacherId && String(teacherId) !== String(comment.user)) {
        createNotification({
          user: teacherId,
          type: "comment_question",
          title: `سؤال جديد على درس "${comment.lesson?.title || ""}"`,
          message: comment.body.slice(0, 200),
          link: `/courses/${comment.course._id || comment.course}`,
          course: comment.course._id || comment.course,
        }).catch((err) => console.error("[/api/admin/comments/[id]/approve] notify error:", err));
      }
    }

    // 🆕 وبنبلّغ صاحب التعليق نفسه إن تعليقه بقى ظاهر
    createNotification({
      user: comment.user,
      type: "comment_approved",
      title: "تمت الموافقة على تعليقك",
      message: "تعليقك بقى ظاهر تحت الدرس دلوقتي.",
      link: `/courses/${comment.course._id || comment.course}`,
      course: comment.course._id || comment.course,
    }).catch((err) => console.error("[/api/admin/comments/[id]/approve] notify error:", err));

    return jsonResponse({ id: comment._id.toString(), status: comment.status });
  } catch (err) {
    console.error("[/api/admin/comments/[id]/approve] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}