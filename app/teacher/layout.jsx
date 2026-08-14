"use client";

// app/teacher/layout.jsx
//
// 🔒 ملحوظة: middleware.js أصلاً بيحمي أي مسار يبدأ بـ /teacher (بيredirect
// أي حد role مش teacher/admin أو مش مسجل دخول). الفحص هنا طبقة UX إضافية
// بس (يظهر شاشة تحميل/رفض واضحة بدل ما يستنى الـ redirect)، مش بديل عنها.

import { useSession } from "next-auth/react";
import { Loader, GraduationCap } from "lucide-react";
import Link from "next/link";

function Blocked() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <GraduationCap className="text-red-400" size={30} />
      </div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">مفيش صلاحية وصول</h2>
      <p className="text-gray-400 mb-4">الصفحة دي لمدرّسين الموقع بس.</p>
      <Link href="/" className="text-blue-600 font-semibold hover:underline">
        الرجوع للرئيسية
      </Link>
    </div>
  );
}

export default function TeacherLayout({ children }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const role = session?.user?.role;
  if (status === "unauthenticated" || !["teacher", "admin"].includes(role)) {
    return <Blocked />;
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}