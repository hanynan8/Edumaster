"use client";

// app/components/NotificationBell.jsx
//
// Phase 6 — اليوم 50-51: "نظام Notifications داخلي (جرس إشعارات)". كل
// البنية التحتية كانت جاهزة (Notification model + notificationHelpers.js +
// GET/PATCH /api/notifications) — بس مفيش أي واجهة (جرس/dropdown) بتستخدمها
// خالص في أي مكان بالمشروع. الملف ده هو الجرس نفسه، بيتحط في navbar.jsx.
//
// - Polling كل 30 ثانية لعدد الإشعارات غير المقروءة (مفيش WebSocket/SSE في
//   المشروع أصلاً، فده أبسط حل يشتغل مع أي استضافة من غير بنية تحتية إضافية).
// - الضغط على إشعار: بيتحط isRead=true (optimistic update محليًا + PATCH
//   في الخلفية) وبيودّي لـ link بتاعه لو موجود.

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    title: "الإشعارات",
    empty: "لا توجد إشعارات حتى الآن",
    justNow: "الآن",
    minutesAgo: (n) => `منذ ${n} د`,
    hoursAgo: (n) => `منذ ${n} س`,
    daysAgo: (n) => `منذ ${n} يوم`,
  },
  en: {
    title: "Notifications",
    empty: "No notifications yet",
    justNow: "Just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
  },
};

function timeAgo(dateStr, t) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t.justNow;
  if (mins < 60) return t.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.hoursAgo(hours);
  return t.daysAgo(Math.floor(hours / 24));
}

const POLL_MS = 30000;

export default function NotificationBell() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=15");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setLoaded(true);
    } catch {
      // best-effort — الجرس مش critical UI، فشل التحميل (مثلاً مشكلة شبكة
      // عابرة) بيتجاهل بهدوء لحد الـ poll الجاي.
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
    } catch {
      // best-effort — لو فشل التحديث، الحالة هترجع تتظبط لوحدها في أول
      // poll جاي (مش بيبوّظ أي حاجة تانية).
    }
  }

  function handleItemClick(n) {
    if (!n.isRead) markRead(n.id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-[#0a0a0a] rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={t.title}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${isRTL ? "left-0" : "right-0"} top-[calc(100%+8px)] w-80 max-w-[85vw] bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/8 overflow-hidden z-50 animate-dropdown`}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-[#0a0a0a]">{t.title}</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <div className="py-8 text-center text-xs text-gray-400">…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">{t.empty}</div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "#"}
                  onClick={() => handleItemClick(n)}
                  className={`block px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    !n.isRead ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#0f2d57] mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt, t)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}