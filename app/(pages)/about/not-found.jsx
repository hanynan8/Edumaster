"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─────────────────────────────────────────
   INLINE SVG ICON
───────────────────────────────────────── */
function ArrowRight({ size = 18, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/* ─────────────────────────────────────────
   GLOBAL STYLES (exactly the same as your home page)
───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@300;400;700;800&display=swap');

  @keyframes fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fadein-up {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .animate-fadein      { animation: fadein    0.6s ease both; }
  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }

  /* Extra small breakpoint (< 480px) for xs: utilities */
  @media (min-width: 480px) {
    .xs\\:flex-row { flex-direction: row; }
    .xs\\:w-auto   { width: auto; }
  }
`;

/* ═══════════════════════════════════════
   NOT FOUND PAGE (app/not-found.tsx)
═══════════════════════════════════════ */
export default function NotFound() {
  const { language: lang } = useLanguage();
  const isRTL = lang === "ar";

  /* Hardcoded translations for 404 (you can move these to your API later if you want) */
  const content = {
    en: {
      badge: "Oops!",
      title: "404",
      subtitle: "Page Not Found",
      desc: "Sorry, the page you're looking for doesn't exist or has been moved.",
      cta: "Back to Home",
    },
    ar: {
      badge: "عفواً!",
      title: "404",
      subtitle: "الصفحة غير موجودة",
      desc: "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
      cta: "العودة إلى الصفحة الرئيسية",
    },
  };

  const t = content[lang] || content.en;

  return (
    <>
      <style>{STYLES}</style>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden flex items-center justify-center"
      >
        <div className="max-w-2xl w-full px-5 text-center">
          {/* Overline (same style as your Hero) */}
          <div className="flex items-center justify-center gap-3 mb-8 animate-fadein">
            <div className="w-6 sm:w-8 h-px bg-[#C9A227]" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#C9A227]">
              {t.badge}
            </span>
            <div className="w-6 sm:w-8 h-px bg-[#C9A227]" />
          </div>

          {/* Giant 404 */}
          <h1 className="text-[120px] sm:text-[160px] md:text-[180px] font-semibold tracking-tight leading-none text-[#C9A227] mb-2 animate-fadein-up">
            {t.title}
          </h1>

          {/* Subtitle */}
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-6 animate-fadein-up">
            {t.subtitle}
          </h2>

          {/* Description */}
          <p className="text-gray-500 text-lg sm:text-xl max-w-md mx-auto mb-10 leading-relaxed animate-fadein-up2">
            {t.desc}
          </p>

          {/* CTA Button (exactly same style as your Hero CTAs) */}
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#C9A227] text-white px-8 sm:px-10 py-4 rounded-lg text-base font-bold hover:bg-[#977a1d] transition-colors shadow-lg shadow-amber-900/20"
          >
            {t.cta}
            <ArrowRight size={18} />
          </Link>

          {/* Optional small hint */}
          <p className="text-xs text-gray-400 mt-12">
            {isRTL ? "ستعود إلى الصفحة الرئيسية" : "You will be redirected to the homepage"}
          </p>
        </div>
      </div>
    </>
  );
}