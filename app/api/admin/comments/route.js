// app/api/admin/comments/route.js
//
// 🆕 GET: قائمة التعليقات/الردود لمراجعة الأدمن — نفس فلسفة
// GET /api/courses?status=pending (Course Review) بس هنا للتعليقات. أي
// تعليق/رد جديد بيتولد بـ status="pending" (شوف Comment.js) ومش ظاهر على
// صفحة الكورس التفصيلية (LessonComments) لحد ما يظهر هنا ويوافق عليه
// الأدمن — أو يرفضه، فيفضل مخفي عن الكل غير صاحبه.
//
// ?status=pending|approved|rejected (افتراضي pending) — نفس نمط فلترة
// الكورسات. admin-only (requireRole).

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCommentModel, getLessonModel, getCourseModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serialize(c) {
  return {
    id: c._id.toString(),
    body: c.body,
    status: c.status,
    user: {
      id: c.user?._id ? c.user._id.toString() : c.user?.toString(),
      name: c.user?.name ?? null,
      avatar: resolveSecureStoredUrl(c.user?.profile?.avatar ?? null),
    },
    lesson: {
      id: c.lesson?._id ? c.lesson._id.toString() : c.lesson?.toString(),
      title: c.lesson?.title ?? null,
    },
    course: {
      id: c.course?._id ? c.course._id.toString() : c.course?.toString(),
      title: c.course?.title ?? null,
    },
    // سؤال أصلي (parentComment=null) ولا رد؟ لو رد، بنبعت نص السؤال الأصلي
    // كمان عشان الأدمن يراجع السياق من غير ما يفتح الدرس نفسه.
    parentComment: c.parentComment
      ? {
          id: c.parentComment._id ? c.parentComment._id.toString() : c.parentComment.toString(),
          body: c.parentComment.body ?? null,
        }
      : null,
    createdAt: c.createdAt,
  };
}

export async function GET(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = ["pending", "approved", "rejected"].includes(searchParams.get("status"))
      ? searchParams.get("status")
      : "pending";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1), 200);

    await connectToMongo();
    getAuthModel();
    getLessonModel();
    getCourseModel();
    const Comment = getCommentModel();

    const comments = await Comment.find({ status })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("user", "name profile.avatar")
      .populate("lesson", "title")
      .populate("course", "title")
      .populate("parentComment", "body")
      .lean();

    return jsonResponse({ comments: comments.map(serialize) });
  } catch (err) {
    console.error("[/api/admin/comments] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}