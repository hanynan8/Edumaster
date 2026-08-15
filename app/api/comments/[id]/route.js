// app/api/comments/[id]/route.js
//
// Phase 6 — اليوم 48-49: حذف تعليق واحد — صاحب التعليق نفسه، أو صاحب
// الكورس/أدمن (moderation). لو التعليق ده سؤال أصلي (parentComment=null)،
// بنمسح ردوده كمان عشان ميفضلش ردود يتيمة على سؤال محذوف.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getCommentModel } from "@/app/lib/models";
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
    const Comment = getCommentModel();
    const comment = await Comment.findById(id);
    if (!comment) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const isAuthor = String(comment.user) === String(session.user.id);
    if (!isAuthor) {
      const Course = getCourseModel();
      const course = await Course.findById(comment.course, "teacher").lean();
      if (!course || !isOwnerOrAdmin(session, course.teacher)) {
        return jsonResponse({ error: "forbidden" }, 403);
      }
    }

    if (!comment.parentComment) {
      await Comment.deleteMany({ parentComment: comment._id });
    }
    await comment.deleteOne();

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/comments/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}