// app/api/notifications/[id]/route.js
//
// Phase 6 — اليوم 50-51: تحديث إشعار واحد لما المستخدم يضغط عليه (يتحط
// isRead=true). صاحب الإشعار بس — مفيش سبب لأي حد تاني (حتى أدمن) يعدّل
// حالة "مقروء/غير مقروء" بتاعة إشعار مستخدم تاني.
//
// PATCH /api/notifications/[id] { isRead: true }

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getNotificationModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY: حماية خفيفة ضد ضرب سريع غير طبيعي (bot/سكريبت) على
    // endpoint بسيط بيتنادى كتير من الواجهة عادةً.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "notifications:patch",
      limit: 60,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    const body = await request.json().catch(() => null);
    const isRead = body?.isRead !== false; // افتراضي true (ده الاستخدام الوحيد فعليًا دلوقتي)

    await connectToMongo();
    const Notification = getNotificationModel();

    // 🔒 صاحب الإشعار بس — الفلتر {_id, user} نفسه بيمنع أي حد يعدّل
    // إشعار مش بتاعه (بدل فحص منفصل بعد الجلب).
    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: session.user.id },
      { $set: { isRead } },
      { new: true }
    ).lean();

    if (!updated) return jsonResponse({ error: "not_found" }, 404);

    return jsonResponse({ id: updated._id.toString(), isRead: updated.isRead });
  } catch (err) {
    console.error("[/api/notifications/[id]] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}