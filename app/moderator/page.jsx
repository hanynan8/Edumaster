"use client";

// app/moderator/page.jsx
//
// 🆕 داشبورد الموديريتور للأدمن: نفس صفحة /teacher لكن بوضع الموديريتور
// (بيشوف كل كورسات المدرّسين ويضيف كورس ويختار المدرّس المشرف).
import TeacherCoursesPage from "@/app/teacher/page";

export default function ModeratorDashboardPage() {
  return <TeacherCoursesPage asModerator />;
}
