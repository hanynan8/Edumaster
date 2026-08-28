"use client";

// app/teacher/settings/page.jsx
//
// صفحة "إعدادات المدرس" — بتستخدم نفس المكوّن المشترك اللي بيتعرض في
// /student (ProfileSettingsCard)، عشان المدرس يقدر يعدّل اسمه/رقمه/صورته
// بنفس المنطق بالظبط، من غير أي تكرار كود. الحماية (تسجيل الدخول + الدور)
// متكفّل بيها app/teacher/layout.jsx و middleware.js أصلاً.

import Link from "next/link";
import { ArrowRight, Settings, BookOpen } from "lucide-react";
import ProfileSettingsCard from "@/app/components/ProfileSettingsCard";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 العنوان والوصف وزرار "كورساتي" كانوا عربي ثابت، والكارت نفسه كان
// مفروض عليه locale="ar" ثابت (متجاهل اللغة المختارة من الناف بار خالص).
// دلوقتي الصفحة كلها بتتبع useLanguage().
const T = {
  en: {
    title: "Account settings",
    subtitle: "Edit your name, phone number, and profile photo",
    myCourses: "My courses",
  },
  ar: {
    title: "إعدادات الحساب",
    subtitle: "عدّل اسمك ورقم هاتفك وصورة البروفايل",
    myCourses: "كورساتي",
  },
  es: {
    title: "Configuración de la cuenta",
    subtitle: "Edita tu nombre, número de teléfono y foto de perfil",
    myCourses: "Mis cursos",
  },
};

export default function TeacherSettingsPage() {
  const { language, isRTL } = useLanguage();
  const t = T[language] || T.en;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003A91] to-[#003A91] flex items-center justify-center">
            <Settings className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{t.title}</h1>
            <p className="text-sm text-gray-400">{t.subtitle}</p>
          </div>
        </div>
        <Link
          href="/teacher"
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:border-[#5279B4] hover:text-[#003A91] transition-colors"
        >
          <BookOpen size={16} /> {t.myCourses}
          <ArrowRight size={16} />
        </Link>
      </div>

      <ProfileSettingsCard />
    </div>
  );
}