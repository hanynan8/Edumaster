"use client";

// app/components/LoadingScreen.jsx
//
// 🆕 لودينج واحد موحّد لكل الموقع بدل ما كل صفحة تكرر نفس الكود
// (سبينر دائري أسود + نص "Loading" بالحروف الكبيرة). بيتبع اللغة
// المختارة تلقائيًا زي باقي الموقع.
//
// الاستخدام:
//   <LoadingScreen />                → شاشة كاملة (min-h-screen) — الحالة الافتراضية
//   <LoadingScreen compact />        → نسخة مصغّرة تتحط جوه سكشن (زي CoursesSection)
//   <LoadingScreen label="..." />    → نص مخصص بدل النص الافتراضي المترجم

import { useLanguage } from "@/contexts/LanguageContext";

const T = {
  en: { loading: "Loading" },
  ar: { loading: "جاري التحميل" },
  es: { loading: "Cargando" },
};

export default function LoadingScreen({ label, compact = false, className = "", dir }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const text = label ?? t.loading;

  const inner = (
    <div className={compact ? "flex flex-col items-center gap-3 py-16" : "flex flex-col items-center gap-4"}>
      <div
        className={`${compact ? "w-7 h-7" : "w-8 h-8"} border-2 border-black border-t-transparent rounded-full animate-spin`}
      />
      <span
        className={`text-xs font-bold uppercase text-gray-400 ${compact ? "tracking-[0.15em]" : "tracking-[0.2em]"}`}
      >
        {text}
      </span>
    </div>
  );

  if (compact) return inner;

  return (
    <div dir={dir} className={`min-h-screen bg-white flex items-center justify-center ${className}`}>
      {inner}
    </div>
  );
}
