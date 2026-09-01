// app/api/admin/comments/[id]/reject/route.js
//
// POST: رفض الأدمن لتعليق/رد — بيفضل status="rejected" (مش بيتمسح تلقائيًا،
// عكس رفض الكورسات) عشان يفضل فيه أثر (audit) ويقدر صاحبه يشوف إن سؤاله
// اتراجع، بس بيفضل مخفي عن كل حد غيره. body اختياري: { reason }.
// admin-only.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCommentModel } from "@/app/lib/models";
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
    const Comment = getCommentModel();

    const comment = await Comment.findById(id);
    if (!comment) return jsonResponse({ error: "not_found" }, 404);
    if (comment.status === "rejected") return jsonResponse({ error: "already_rejected" }, 409);

    const previousStatus = comment.status;
    comment.status = "rejected";
    comment.moderatedBy = session.user.id;
    comment.moderatedAt = new Date();
    await comment.save();

    await logAudit({
      request,
      actor: session.user,
      action: "comment.rejected",
      targetId: comment._id.toString(),
      details: { previousStatus, reason: reason || undefined },
    });

    createNotification({
      user: comment.user,
      type: "comment_rejected",
      title: "تم رفض تعليقك",
      message: reason ? `الأدمن رفض تعليقك. السبب: ${reason}` : "الأدمن رفض تعليقك ولن يظهر تحت الدرس.",
      link: `/courses/${comment.course}`,
      course: comment.course,
    }).catch((err) => console.error("[/api/admin/comments/[id]/reject] notify error:", err));

    return jsonResponse({ id: comment._id.toString(), status: comment.status });
  } catch (err) {
    console.error("[/api/admin/comments/[id]/reject] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}