"use client";

// app/teacher/components/CourseTabs.jsx
//
// Phase 4: تبويبات بسيطة للتنقل بين صفحات إدارة كورس معيّن (المحتوى،
// الكويزات، الواجبات، أداء الطلاب) — نفس فكرة الـ tabs في admin panel بس
// أبسط، من غير state مشترك (كل تبويبة صفحة Next مستقلة).

import Link from "next/link";

const TABS = [
  { key: "content", label: "المحتوى", href: (id) => `/teacher/courses/${id}` },
  { key: "quizzes", label: "الكويزات", href: (id) => `/teacher/courses/${id}/quizzes` },
  { key: "assignments", label: "الواجبات", href: (id) => `/teacher/courses/${id}/assignments` },
  { key: "performance", label: "أداء الطلاب", href: (id) => `/teacher/courses/${id}/performance` },
];

export default function CourseTabs({ courseId, active }) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href(courseId)}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
            active === tab.key
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}