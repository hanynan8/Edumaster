"use client";

// app/components/DashboardMeetingsWidget.jsx
//
// 🆕 نفس فكرة CourseMeetingBanner بس على مستوى الداشبورد كله (كل كورسات
// الطالب مع بعض) بدل كورس واحد — بتحل نفس مشكلة "مفيش أي إشارة... في
// الداشبورد" (issue #1) لصفحة app/student/page.jsx. بتستخدم GET
// /api/meetings الموجودة (بترجع اجتماعات كل كورسات الطالب المسجّل فيها).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Clock, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 نفس مشكلة CourseMeetingBanner: النصوص كانت عربي ثابت وتنسيق التاريخ
// مربوط بـ "ar-EG" دايمًا. دلوقتي كل حاجة بتتبع اللغة المختارة من الناف بار.
const LOCALE_BY_LANG = { en: "en-US", ar: "ar-EG", es: "es-ES" };

const T = {
  en: {
    liveNow: "Live lecture happening now",
    upcoming: (when) => `Upcoming lecture — ${when}`,
  },
  ar: {
    liveNow: "محاضرة لايف شغالة دلوقتي",
    upcoming: (when) => `محاضرة قريبة — ${when}`,
  },
  es: {
    liveNow: "Clase en vivo ahora mismo",
    upcoming: (when) => `Próxima clase — ${when}`,
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

function pickHighlight(meetings) {
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

export default function DashboardMeetingsWidget() {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const [highlight, setHighlight] = useState(undefined);

  useEffect(() => {
    let ignore = false;
    function load() {
      fetch("/api/meetings")
        .then((r) => (r.ok ? r.json() : { meetings: [] }))
        .then((data) => {
          if (ignore) return;
          const meetings = Array.isArray(data?.meetings) ? data.meetings : [];
          setHighlight(pickHighlight(meetings));
        })
        .catch(() => {
          if (!ignore) setHighlight(null);
        });
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  if (!highlight) return null;

  const { meeting, phase } = highlight;
  const isLive = phase === "live";

  return (
    <Link
      href="/meet"
      className={`mb-8 flex items-center gap-3 rounded-2xl px-5 py-4 border transition-colors ${
        isLive ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-blue-50 border-blue-200 hover:bg-blue-100"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLive ? "bg-red-100" : "bg-blue-100"}`}>
        {isLive ? <Radio size={18} className="text-red-600 animate-pulse" /> : <Clock size={18} className="text-blue-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${isLive ? "text-red-700" : "text-blue-700"}`}>
          {isLive ? t.liveNow : t.upcoming(formatDateTime(meeting.scheduledAt, language))}
        </p>
        <p className="text-sm text-gray-600 truncate">
          {meeting.title} {meeting.courseTitle ? `· ${meeting.courseTitle}` : ""}
        </p>
      </div>
      <ArrowLeft size={16} className="text-gray-400 shrink-0" />
    </Link>
  );
}