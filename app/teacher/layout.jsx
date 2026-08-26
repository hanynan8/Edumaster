"use client";

// app/teacher/layout.jsx
//
// 🔒 ملحوظة: middleware.js أصلاً بيحمي أي مسار يبدأ بـ /teacher (بيredirect
// أي حد role مش teacher/admin أو مش مسجل دخول). الفحص هنا طبقة UX إضافية
// بس (يظهر شاشة تحميل/رفض واضحة بدل ما يستنى الـ redirect)، مش بديل عنها.

import { useSession } from "next-auth/react";
import { Loader, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 "مفيش صلاحية وصول" وباقي نصوص الشاشة كانت عربي ثابت — دلوقتي بتتبع
// اللغة المختارة من الناف بار.
const T = {
  en: {
    noAccess: "Access denied",
    teachersOnly: "This page is for the site's teachers only.",
    backHome: "Back to home",
  },
  ar: {
    noAccess: "مفيش صلاحية وصول",
    teachersOnly: "الصفحة دي لمدرّسين الموقع بس.",
    backHome: "الرجوع للرئيسية",
  },
  es: {
    noAccess: "Acceso denegado",
    teachersOnly: "Esta página es solo para los profesores del sitio.",
    backHome: "Volver al inicio",
  },
};

function Blocked({ t, isRTL }) {
  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <GraduationCap className="text-red-400" size={30} />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.noAccess}</h2>
      <p className="text-gray-400 mb-4">{t.teachersOnly}</p>
      <Link href="/" className="text-blue-600 font-semibold hover:underline">
        {t.backHome}
      </Link>
    </div>
  );
}

export default function TeacherLayout({ children }) {
  const { data: session, status } = useSession();
  const { language, isRTL } = useLanguage();
  const t = T[language] || T.en;

  if (status === "loading") {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const role = session?.user?.role;
  if (status === "unauthenticated" || !["teacher", "admin"].includes(role)) {
    return <Blocked t={t} isRTL={isRTL} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}