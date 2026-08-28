"use client";

// app/teacher/layout.jsx
//
// 🔒 ملحوظة: middleware.js أصلاً بيحمي أي مسار يبدأ بـ /teacher (بيredirect
// أي حد role مش teacher/admin أو مش مسجل دخول). الفحص هنا طبقة UX إضافية
// بس (يظهر شاشة تحميل/رفض واضحة بدل ما يستنى الـ redirect)، مش بديل عنها.
//
// 🎨 التصميم اتظبط عشان يتماشى مع هوية الموقع الرئيسي (navbar.jsx / footer.jsx):
//    - الأزرق #0f2d57  → اللون الأساسي للوحة تحكم المدرّس والاجتماعات
//    - الأسود #0a0a0a / الرمادي  → النصوص
//    - خلفية #f7f7f7 (نفس خلفية الموقع)

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
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center justify-center bg-[#f7f7f7] text-center px-6">
      <div className="w-16 h-16 rounded-full bg-[#eceef2] border border-[#b2bcc9] flex items-center justify-center mb-4">
        <GraduationCap className="text-[#0f2d57]" size={30} />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.noAccess}</h2>
      <p className="text-gray-400 mb-4">{t.teachersOnly}</p>
      <Link href="/" className="text-[#0f2d57] font-semibold hover:text-[#0c2547] hover:underline transition-colors">
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
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-[#f7f7f7]">
        <Loader className="animate-spin text-[#0f2d57]" size={40} />
      </div>
    );
  }

  const role = session?.user?.role;
  if (status === "unauthenticated" || !["teacher", "admin"].includes(role)) {
    return <Blocked t={t} isRTL={isRTL} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f7f7]">
      {children}
    </div>
  );
}
