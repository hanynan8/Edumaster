// path: app/components/CookieConsent.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "edumaster_cookie_consent";

const TEXT = {
  ar: {
    message:
      "بنستخدم الكوكيز عشان نحسّن تجربتك على المنصة، نفتكر تفضيلاتك، ونحلل استخدام الموقع. تقدر تعرف التفاصيل في",
    privacy: "سياسة الخصوصية",
    and: "و",
    terms: "الشروط والأحكام",
    accept: "موافق",
    decline: "رفض",
  },
  en: {
    message:
      "We use cookies to improve your experience, remember your preferences, and analyze site usage. Learn more in our",
    privacy: "Privacy Policy",
    and: "and",
    terms: "Terms & Condition",
    accept: "Accept",
    decline: "Decline",
  },
  es: {
    message:
      "Usamos cookies para mejorar tu experiencia, recordar tus preferencias y analizar el uso del sitio. Más información en nuestra",
    privacy: "Política de Privacidad",
    and: "y",
    terms: "Términos y Condiciones",
    accept: "Aceptar",
    decline: "Rechazar",
  },
};

export default function CookieConsent() {
  const { language, isRTL } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // يظهر بس للزائر اللي بيفتح الموقع لأول مرة (مفيش قيمة متخزنة في المتصفح)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const respond = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  const t = TEXT[language] ?? TEXT.en;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[9999] px-4 pb-4 sm:px-6 sm:pb-6 animate-cookie-slide-up"
    >
      <style>{`
        @keyframes cookie-slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-cookie-slide-up { animation: cookie-slide-up 0.4s ease both; }
      `}</style>

      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0a0a0a] text-white shadow-2xl px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm leading-relaxed text-gray-300 flex-1">
          {t.message}{" "}
          <Link href="/privacy" className="text-[#C9A227] font-bold hover:underline">
            {t.privacy}
          </Link>{" "}
          {t.and}{" "}
          <Link href="/terms" className="text-[#C9A227] font-bold hover:underline">
            {t.terms}
          </Link>
          .
        </p>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => respond("declined")}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold text-gray-300 border border-white/15 hover:bg-white/5 transition-colors"
          >
            {t.decline}
          </button>
          <button
            onClick={() => respond("accepted")}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold bg-[#C9A227] text-[#0a0a0a] hover:brightness-110 transition-all"
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}