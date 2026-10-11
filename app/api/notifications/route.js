// app/api/notifications/route.js
//
// Phase 6 — اليوم 50-51: "نظام Notifications داخلي (جرس إشعارات)".
//
// GET /api/notifications?page=&limit=  → { notifications, unreadCount,
//   page, pages } — إشعارات المستخدم الحالي، الأحدث أولًا. unreadCount
//   بيترجع دايمًا (بغض النظر عن الصفحة المطلوبة) عشان الـ badge على جرس
//   الإشعارات في الـ navbar يفضل صحيح حتى لو المستخدم فاتح صفحة تانية
//   غير الأولى.

import { connectToMongo } from "@/app/lib/mongodb";
import { getNotificationModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { renderNotificationText, resolveNotificationLang } from "@/app/lib/notificationTemplates";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🆕 النص بيتترجم هنا حسب ?lang= (لغة الموقع عند المستخدم) من key/params المخزّنين.
// الإشعارات القديمة (مالهاش key) أو لو lang مش مبعوت → النص المخزَّن زي ما هو.
function serializeNotification(n, lang) {
  const localized = lang && n.key ? renderNotificationText(n.key, n.params, lang) : null;
  return {
    id: n._id.toString(),
    type: n.type,
    title: localized?.title ?? n.title,
    message: localized?.message ?? n.message,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const lang = resolveNotificationLang(searchParams.get("lang"));

    await connectToMongo();
    const Notification = getNotificationModel();

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: session.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: session.user.id }),
      Notification.countDocuments({ user: session.user.id, isRead: false }),
    ]);

    return jsonResponse({
      notifications: notifications.map((n) => serializeNotification(n, lang)),
      unreadCount,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("[/api/notifications] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}