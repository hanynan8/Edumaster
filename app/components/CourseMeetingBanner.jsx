"use client";

// app/components/CourseMeetingBanner.jsx
//
// 🆕 يحل مشكلة "مفيش أي إشارة في صفحة الكورس أو الداشبورد" — قبل كده الطالب
// كان لازم يروح /meet بنفسه أو يدوس على إشعار الجرس عشان يعرف إن فيه
// محاضرة لايف. الكومبوننت ده بيتحط في صفحة تفاصيل الكورس (وبيتعاد استخدامه
// من app/student/page.jsx للداشبورد) وبيوري بانر واضح لو فيه محاضرة شغالة
// دلوقتي أو جاية قريب على الكورس ده.
//
// بيستخدم GET /api/courses/[id]/meetings الموجودة بالفعل (نفس فحص الوصول:
// enrollment/membership فعلية أو صاحب الكورس) — مفيش endpoint جديد.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video, Radio, Clock, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل النصوص في البانر كانت عربي ثابت، وكمان تنسيق التاريخ كان مربوط
// بـ locale "ar-EG" دايمًا. دلوقتي كل حاجة بتتبع اللغة المختارة من الناف بار.
const LOCALE_BY_LANG = { en: "en-US", ar: "ar-EG", es: "es-ES" };

const T = {
  en: {
    liveNow: "Live lecture happening now",
    upcomingCompact: (when) => `Upcoming lecture: ${when}`,
    liveToday: "Today's lecture is live now 🔴",
    upcomingToday: (when) => `Today's lecture at ${when}`,
    joinNow: "Join now",
    viewDetails: "View details",
  },
  ar: {
    liveNow: "محاضرة لايف شغالة دلوقتي",
    upcomingCompact: (when) => `محاضرة قريبة: ${when}`,
    liveToday: "محاضرة النهاردة شغالة دلوقتي 🔴",
    upcomingToday: (when) => `محاضرة النهاردة الساعة ${when}`,
    joinNow: "ادخل دلوقتي",
    viewDetails: "شوف التفاصيل",
  },
  es: {
    liveNow: "Clase en vivo ahora mismo",
    upcomingCompact: (when) => `Próxima clase: ${when}`,
    liveToday: "La clase de hoy está en vivo ahora 🔴",
    upcomingToday: (when) => `Clase de hoy a las ${when}`,
    joinNow: "Unirse ahora",
    viewDetails: "Ver detalles",
  },
};

function formatDateTime(dateStr, language) {
  try {
    return new Date(dateStr).toLocaleString(LOCALE_BY_LANG[language] || "en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return dateStr;
  }
}

function getPhase(meeting) {
  const start = new Date(meeting.scheduledAt).getTime();
  const end = start + (meeting.durationMinutes || 60) * 60 * 1000;
  const now = Date.now();
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "ended";
}

// أقرب محاضرة "تستاهل" بانر — شغالة دلوقتي (أولوية قصوى)، أو جاية خلال
// الـ 24 ساعة الجاية (عشان مفيش زحمة بانرات لمحاضرات بعيدة). بيرجع null لو
// مفيش حاجة تستاهل تتعرض.
function pickHighlightMeeting(meetings) {
  const live = meetings.filter((m) => getPhase(m) === "live");
  if (live.length > 0) {
    return { meeting: live.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0], phase: "live" };
  }
  const upcoming = meetings
    .filter((m) => getPhase(m) === "upcoming")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const soon = upcoming.find((m) => new Date(m.scheduledAt).getTime() - Date.now() < 24 * 60 * 60 * 1000);
  if (soon) return { meeting: soon, phase: "upcoming" };
  return null;
}

/**
 * @param {string} courseId
 * @param {boolean} [compact] - نسخة مصغّرة (للداشبورد، بطاقة واحدة صغيرة)
 *   بدل البانر الكامل العريض (لصفحة الكورس نفسها).
 */
export default function CourseMeetingBanner({ courseId, compact = false }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const [highlight, setHighlight] = useState(undefined); // undefined = بيحمّل، null = مفيش حاجة

  useEffect(() => {
    let ignore = false;
    fetch(`/api/courses/${courseId}/meetings`)
      .then((r) => (r.ok ? r.json() : { meetings: [] }))
      .then((data) => {
        if (ignore) return;
        const meetings = Array.isArray(data?.meetings) ? data.meetings : [];
        setHighlight(pickHighlightMeeting(meetings));
      })
      .catch(() => {
        if (!ignore) setHighlight(null);
      });
    // بنعيد الفحص كل دقيقة عشان "لسه هتبدأ" تتحول لـ"شغالة دلوقتي" لوحدها
    // من غير ما الطالب يعمل refresh.
    const interval = setInterval(() => {
      fetch(`/api/courses/${courseId}/meetings`)
        .then((r) => (r.ok ? r.json() : { meetings: [] }))
        .then((data) => {
          if (ignore) return;
          const meetings = Array.isArray(data?.meetings) ? data.meetings : [];
          setHighlight(pickHighlightMeeting(meetings));
        })
        .catch(() => {});
    }, 60_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [courseId]);

  if (!highlight) return null;

  const { meeting, phase } = highlight;
  const isLive = phase === "live";

  if (compact) {
    return (
      <Link
        href="/meet"
        className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
          isLive
            ? "bg-red-50 border-red-200 hover:bg-red-100"
            : "bg-blue-50 border-blue-200 hover:bg-blue-100"
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isLive ? "bg-red-100" : "bg-blue-100"}`}>
          {isLive ? <Radio size={16} className="text-red-600 animate-pulse" /> : <Clock size={16} className="text-blue-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold truncate ${isLive ? "text-red-700" : "text-blue-700"}`}>
            {isLive ? t.liveNow : t.upcomingCompact(formatDateTime(meeting.scheduledAt, language))}
          </p>
          <p className="text-xs text-gray-500 truncate">{meeting.title}</p>
        </div>
        <ArrowLeft size={15} className="text-gray-400 shrink-0" />
      </Link>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap ${
        isLive ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isLive ? "bg-red-100" : "bg-blue-100"}`}>
          {isLive ? (
            <Radio size={20} className="text-red-600 animate-pulse" />
          ) : (
            <Video size={20} className="text-blue-600" />
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${isLive ? "text-red-700" : "text-blue-700"}`}>
            {isLive ? t.liveToday : t.upcomingToday(formatDateTime(meeting.scheduledAt, language))}
          </p>
          <p className="text-sm text-gray-600 truncate">{meeting.title}</p>
        </div>
      </div>
      <Link
        href="/meet"
        className={`shrink-0 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white ${
          isLive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isLive ? t.joinNow : t.viewDetails}
      </Link>
    </div>
  );
}