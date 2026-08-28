"use client";

// app/teacher/components/CourseTabs.jsx
//
// Phase 4: تبويبات بسيطة للتنقل بين صفحات إدارة كورس معيّن (المحتوى،
// الكويزات، الواجبات، أداء الطلاب) — نفس فكرة الـ tabs في admin panel بس
// أبسط، من غير state مشترك (كل تبويبة صفحة Next مستقلة).

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 تسميات التابات كانت عربي ثابت — دلوقتي بتتبع اللغة المختارة من الناف
// بار.
const TABS = [
  { key: "content", label: { en: "Content", ar: "المحتوى", es: "Contenido" }, href: (id) => `/teacher/courses/${id}` },
  { key: "quizzes", label: { en: "Quizzes", ar: "الكويزات", es: "Cuestionarios" }, href: (id) => `/teacher/courses/${id}/quizzes` },
  { key: "assignments", label: { en: "Assignments", ar: "الواجبات", es: "Tareas" }, href: (id) => `/teacher/courses/${id}/assignments` },
  { key: "announcements", label: { en: "Announcements", ar: "إعلانات", es: "Anuncios" }, href: (id) => `/teacher/courses/${id}/announcements` },
  { key: "performance", label: { en: "Student performance", ar: "أداء الطلاب", es: "Rendimiento de alumnos" }, href: (id) => `/teacher/courses/${id}/performance` },
];

export default function CourseTabs({ courseId, active }) {
  const { language } = useLanguage();
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href(courseId)}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
            active === tab.key
              ? "border-[#0f2d57] text-[#0f2d57]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab.label[language] || tab.label.en}
        </Link>
      ))}
    </div>
  );
}