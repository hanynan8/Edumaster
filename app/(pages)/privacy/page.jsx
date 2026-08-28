"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingScreen from "@/app/components/LoadingScreen";

/* ─────────────────────────────────────────
   FETCH HOOK
───────────────────────────────────────── */
function usePrivacyData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=privacy")
      .then((r) => r.json())
      .then((res) => {
        const doc = Array.isArray(res) ? res[0] : res;
        setData(doc);
      })
      .catch(console.error);
  }, []);
  return data;
}

/* ─────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ═══════════════════════════════════════
   ROOT PAGE
═══════════════════════════════════════ */
export default function PrivacyPage() {
  const data = usePrivacyData();
  const { language: lang } = useLanguage();

  if (!data) {
    return (
      <LoadingScreen />
    );
  }

  const t = data.i18n[lang];
  const isRTL = lang === "ar";

  return (
    <>
      <style>{STYLES}</style>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
      >
        <PageHeader t={t} />
        <CompanyInfo t={t} />
        <Sections t={t} />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   PAGE HEADER
═══════════════════════════════════════ */
function PageHeader({ t }) {
  return (
    <section className="relative overflow-hidden bg-[#1E3561]">
      <div className="w-full px-5 sm:px-10 md:px-16 py-12 sm:py-20 md:py-28">
        <h1 className="font-semibold tracking-tight mb-3 sm:mb-4 leading-[1.1] text-white animate-fadein-up text-2xl sm:text-4xl md:text-5xl">
          {t.pageTitle}
        </h1>
        <p className="text-gray-300 text-sm sm:text-base animate-fadein-up2">
          {t.lastUpdated}
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   COMPANY INFO
═══════════════════════════════════════ */
function CompanyInfo({ t }) {
  const [ref, visible] = useReveal();

  return (
    <section ref={ref} className="py-10 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 md:px-16">
        <h2
          className={`text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight mb-5 sm:mb-8 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {t.companyInfo.title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
          {t.companyInfo.fields.map((field, i) => (
            <div
              key={i}
              className={`bg-white p-4 sm:p-6 flex flex-col gap-1 transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <span className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                {field.label}
              </span>
              <span className="text-[#0a0a0a] font-semibold text-sm sm:text-base break-words">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   SECTIONS (Privacy / Cookies / Terms)
═══════════════════════════════════════ */
function Sections({ t }) {
  return (
    <section className="py-10 sm:py-16 md:py-20 bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 md:px-16 flex flex-col gap-10 sm:gap-16">
        {t.sections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>
    </section>
  );
}

function SectionBlock({ section }) {
  const [ref, visible] = useReveal();

  return (
    <div
      ref={ref}
      className={`bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 md:p-10 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight leading-tight mb-3 sm:mb-5">
        {section.title}
      </h3>

      {section.intro && (
        <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed mb-4">
          {section.intro}
        </p>
      )}

      {section.text && (
        <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed mb-2">
          {section.text}
        </p>
      )}

      {section.contact && (
        <p className="font-bold text-[#C9A227] text-sm sm:text-[15px]">
          {section.contact}
        </p>
      )}

      {section.items && (
        <ul className="flex flex-col divide-y divide-gray-100 mt-2">
          {section.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 py-3 sm:py-3.5"
            >
              <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mt-0.5">
                <Check size={18} color="#C9A227" />
              </span>
              <span className="text-gray-700 font-medium text-sm sm:text-[15px] leading-snug">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}

      {section.subsections && (
        <div className="flex flex-col gap-5 sm:gap-7 mt-4">
          {section.subsections.map((sub, i) => (
            <div key={i}>
              <h4 className="font-black text-[#0a0a0a] text-sm sm:text-base mb-2 sm:mb-3">
                {sub.title}
              </h4>

              {sub.text && (
                <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed mb-2">
                  {sub.text}
                </p>
              )}

              {sub.contact && (
                <p className="font-bold text-[#C9A227] text-sm sm:text-[15px]">
                  {sub.contact}
                </p>
              )}

              {sub.items && (
                <ul className="flex flex-col divide-y divide-gray-100">
                  {sub.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-3 py-2.5 sm:py-3"
                    >
                      <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mt-0.5">
                        <Check size={18} color="#C9A227" />
                      </span>
                      <span className="text-gray-700 font-medium text-sm sm:text-[15px] leading-snug">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   INLINE SVG ICON
═══════════════════════════════════════ */
function Check({ size = 16, color = "currentColor" }) {
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
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* ═══════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@300;400;700;800&display=swap');

  @keyframes fadein-up {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }

  * { box-sizing: border-box; }
  img { max-width: 100%; }
`;