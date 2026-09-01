"use client";

/* ════════════════════════════════════════════════════════════════════
   components/ServicesSection.jsx
   ------------------------------------------------------------------
   Shared "Services" section, extracted from the guest home page so it
   can also be rendered on the logged-in home page. Fetches the exact
   same collection the /services page uses:
     GET /api/data?collection=services

   Props:
     - lang  (string)  current language ("en" | "ar" | "es")
     - ui     (object) translation strings — must contain:
         servicesTitle, servicesCta
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Languages, GraduationCap } from "lucide-react";
import ConsultationModal from "./consultation/ConsultationModal";
import TranslationModal from "./translation/TranslationModal";
import EnglishProgramModal from "./englishProgram/EnglishProgramModal";

// نصوص زرار طلب الاستشارة — مستقلة عن الـ ui prop الجاي من صفحة الهوم
// (لوج-إن ولوج-أوت) عشان مانحتاجش نعدّل كل ملفات الهوم لإضافة مفتاح جديد.
const CONSULT_STRINGS = {
  en: { cta: "Book a Paid Consultation", badge: "45 min · 1300 EGP" },
  ar: { cta: "احجز استشارة مدفوعة", badge: "٤٥ دقيقة · ١٣٠٠ جنيه" },
  es: { cta: "Reservar una consulta", badge: "45 min · 1300 EGP" },
};

// 🆕 نصوص زراير نموذج طلب الترجمة ونموذج التسجيل في برنامج اللغة الإنجليزية —
// نفس فلسفة CONSULT_STRINGS، بتظهر في الهوم (لوج-إن ولوج-أوت) وصفحة الخدمات.
const QUICK_FORM_STRINGS = {
  en: { translationCta: "Translation Request Form", englishCta: "Join English Program" },
  ar: { translationCta: "نموذج طلب ترجمة", englishCta: "التسجيل في برنامج الإنجليزية" },
  es: { translationCta: "Solicitud de traducción", englishCta: "Únete al programa de inglés" },
};

const SERVICE_ID_MAP = {
  "Study in Spain": "study-spain",
  "Visa Services": "visa",
  "language Courses": "language",
};

/* same as /services page: collection=services */
function useServicesData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=services")
      .then((r) => r.json())
      .then((res) => setData(Array.isArray(res) ? res[0] : res))
      .catch(console.error);
  }, []);
  return data;
}

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

function ArrowRight({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function ServicesSection({ lang, ui }) {
  const data = useServicesData();
  const [ref, visible] = useReveal();
  const [consultOpen, setConsultOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [englishProgramOpen, setEnglishProgramOpen] = useState(false);
  const cs = CONSULT_STRINGS[lang] ?? CONSULT_STRINGS.en;
  const qf = QUICK_FORM_STRINGS[lang] ?? QUICK_FORM_STRINGS.en;

  const t = data ? (data.i18n[lang] ?? data.i18n.en) : null;
  const merged = t
    ? (data.services || []).map((svc) => {
        const i18nKey = SERVICE_ID_MAP[svc.id] ?? svc.id;
        return { ...svc, ...(t.services?.[i18nKey] ?? {}) };
      })
    : [];

  // ⚠️ لازم الـ <section ref={ref}> يترسم من أول render حتى لو البيانات
  // لسه مجاش (return null قبله كان بيمنع الـ IntersectionObserver من
  // الـ attach، فالقسم فضل opacity-0 للأبد بمجرد ما البيانات توصل — نفس
  // الأسلوب المتبع في CoursesSection.jsx).
  return (
    <section ref={ref} className="py-8 sm:py-14 md:py-20 bg-[#f7f7f7]">
      <div className="px-5 sm:px-10 md:px-16">
        <div
          className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-7 sm:mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
              {ui.servicesTitle}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setConsultOpen(true)}
              className="inline-flex items-center gap-2 bg-[#003A91] text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:opacity-90 transition-all w-fit"
            >
              <CalendarClock size={15} />
              {cs.cta}
              <span className="hidden sm:inline text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full">{cs.badge}</span>
            </button>
            <button
              type="button"
              onClick={() => setTranslationOpen(true)}
              className="inline-flex items-center gap-2 border-2 border-[#003A91] text-[#003A91] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#003A91] hover:text-white transition-all w-fit"
            >
              <Languages size={15} />
              {qf.translationCta}
            </button>
            <button
              type="button"
              onClick={() => setEnglishProgramOpen(true)}
              className="inline-flex items-center gap-2 border-2 border-[#C9A227] text-[#8a6d10] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#C9A227] hover:text-white transition-all w-fit"
            >
              <GraduationCap size={15} />
              {qf.englishCta}
            </button>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 border-2 border-[#0a0a0a] text-[#0a0a0a] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#0a0a0a] hover:text-white transition-all w-fit"
            >
              {ui.servicesCta}
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {!data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {merged.map((s, i) => (
              <Link
                key={s.id}
                href="/services"
                className={`group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-[#C9A227]/30 hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="relative h-32 sm:h-40 overflow-hidden bg-gray-100">
                  {s.image && (
                    <Image src={s.image} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                  )}
                  <div className="absolute top-0 inset-x-0 h-0.75" style={{ background: s.color }} />
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="font-semibold text-[#0a0a0a] text-sm leading-snug group-hover:text-[#C9A227] transition-colors duration-150">
                    {s.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed flex-1 line-clamp-3">{s.desc}</p>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#C9A227] mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200">
                    <ArrowRight size={11} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConsultationModal open={consultOpen} onClose={() => setConsultOpen(false)} />
      <TranslationModal open={translationOpen} onClose={() => setTranslationOpen(false)} />
      <EnglishProgramModal open={englishProgramOpen} onClose={() => setEnglishProgramOpen(false)} />
    </section>
  );
}