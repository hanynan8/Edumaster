"use client";

// app/components/CourseAnnouncements.jsx
//
// Phase 6 — اليوم 46-47: "Announcements: المدرس ينشر إعلان على الكورس،
// يظهر لكل الطلاب المسجلين". الـ API (GET /api/courses/[id]/announcements)
// وموديل Announcement.js كانوا جاهزين، بس مفيش أي واجهة كانت بتعرض
// الإعلانات دي للطالب — الكومبوننت ده هو العرض بس (النشر/الحذف من لوحة
// المدرس، شوف app/teacher/courses/[id]/announcements/page.jsx).
//
// بيتحط في sidebar صفحة تفاصيل الكورس (app/(pages)/courses/[id]/page.jsx)
// لأي طالب مسجّل فعليًا أو صاحب الكورس — نفس شرط الوصول اللي الـ API
// بيفرضه أصلًا (403 enrollment_required لغير كده).

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: { title: "إعلانات الكورس" },
  en: { title: "Course Announcements" },
};

function formatDate(dateStr, language) {
  return new Date(dateStr).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

export default function CourseAnnouncements({ courseId }) {
  const { language } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const [announcements, setAnnouncements] = useState(null);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/courses/${courseId}/announcements`)
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((data) => {
        if (!ignore) setAnnouncements(data.announcements || []);
      })
      .catch(() => {
        if (!ignore) setAnnouncements([]);
      });
    return () => {
      ignore = true;
    };
  }, [courseId]);

  // مفيش إعلانات (أو لسه بتحمّل) → مفيش داعي نشغل مساحة في الـ sidebar
  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Megaphone size={15} className="text-[#1D6FD8]" /> {t.title}
      </h3>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {announcements.map((a) => (
          <div key={a.id} className="border-s-2 border-[#1D6FD8]/30 ps-3">
            <p className="text-sm font-semibold text-gray-800">{a.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{a.body}</p>
            <p className="text-[10px] text-gray-400 mt-1">{formatDate(a.createdAt, language)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}