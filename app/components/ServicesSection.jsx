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
import { CalendarClock, Languages, GraduationCap, Award, Headphones, ChevronDown } from "lucide-react";
import ConsultationModal from "./consultation/ConsultationModal";
import TranslationModal from "./translation/TranslationModal";
import EnglishProgramModal from "./englishProgram/EnglishProgramModal";
// 🆕 باقي الفورمات اللي ممكن تتملي في المشروع — بتتفتح كلها دلوقتي من
// قائمة منسدلة تحت زرار "View All Services" بدل ما يودّي لصفحة تانية.
import ScholarshipModal from "./scholarship/ScholarshipModal";
import CallCenterModal from "./callCenter/CallCenterModal";

// نصوص زرار طلب الاستشارة — مستقلة عن الـ ui prop الجاي من صفحة الهوم
// (لوج-إن ولوج-أوت) عشان مانحتاجش نعدّل كل ملفات الهوم لإضافة مفتاح جديد.
const CONSULT_STRINGS = {
  en: { cta: "Book a Consultation", badge: "45 min · 1300 EGP" },
  ar: { cta: "احجز استشارة مدفوعة", badge: "٤٥ دقيقة · ١٣٠٠ جنيه" },
  es: { cta: "Reservar una consulta", badge: "45 min · 1300 EGP" },
};

// 🆕 نصوص زراير نموذج طلب الترجمة ونموذج التسجيل في برنامج اللغة الإنجليزية —
// نفس فلسفة CONSULT_STRINGS، بتظهر في الهوم (لوج-إن ولوج-أوت) وصفحة الخدمات.
const QUICK_FORM_STRINGS = {
  en: {
    translationCta: "Translation Request Form",
    englishCta: "Join English Program",
    scholarshipCta: "Request a Scholarship Assessment",
    callCenterCta: "Register for Call Center Operations",
    browseAllCta: "Browse full services page",
    menuLabel: "All service forms",
  },
  ar: {
    translationCta: "نموذج طلب ترجمة",
    englishCta: "التسجيل في برنامج الإنجليزية",
    scholarshipCta: "طلب تقييم فرص المنح الدراسية",
    callCenterCta: "التسجيل في دورة الـ Call Center",
    browseAllCta: "تصفح صفحة الخدمات كاملة",
    menuLabel: "كل استمارات الخدمات",
  },
  es: {
    translationCta: "Solicitud de traducción",
    englishCta: "Únete al programa de inglés",
    scholarshipCta: "Solicitar evaluación de becas",
    callCenterCta: "Inscribirse en Call Center Operations",
    browseAllCta: "Ver la página completa de servicios",
    menuLabel: "Todos los formularios",
  },
};

const SERVICE_ID_MAP = {
  "Study in Spain": "study-spain",
  "Visa Services": "visa",
  "language Courses": "language",
};

// 🆕 بنحوّل الـ id الحقيقي بتاع الخدمة (الجاي من الـ API) لصيغة صالحة كـ
// HTML id، بالظبط زي الـ function الموجودة في app/(pages)/services/page.jsx،
// عشان اللينك #<id> اللي بنولّده هنا يطابق الـ anchor id الموجود هناك.
function slugifyServiceId(id) {
  return String(id ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  // 🆕 المودالات الباقية اللي كانت متاحة بس من صفحة /services — دلوقتي
  // بتتفتح من نفس القائمة المنسدلة الجديدة.
  const [scholarshipOpen, setScholarshipOpen] = useState(false);
  const [callCenterOpen, setCallCenterOpen] = useState(false);
  // 🆕 "View All Services" مبقاش بيودي لمكان — بقى زرار بيفتح/يقفل
  // القائمة المنسدلة دي، اللي فيها كل الفورمات اللي ممكن تتملي في المشروع.
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const cs = CONSULT_STRINGS[lang] ?? CONSULT_STRINGS.en;
  const qf = QUICK_FORM_STRINGS[lang] ?? QUICK_FORM_STRINGS.en;

  // اقفل القائمة لو اليوزر دوس بره منها
  useEffect(() => {
    if (!servicesMenuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setServicesMenuOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setServicesMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [servicesMenuOpen]);

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
          className={`relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-7 sm:mb-14 transition-all duration-700 ${
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
            <div className="relative w-fit" ref={menuRef}>
              <button
                type="button"
                onClick={() => setServicesMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={servicesMenuOpen}
                className={`inline-flex items-center gap-2 border-2 border-[#0a0a0a] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm transition-all w-fit ${
                  servicesMenuOpen ? "bg-[#0a0a0a] text-white" : "text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
                }`}
              >
                {ui.servicesCta}
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 ${servicesMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {servicesMenuOpen && (
                <div className="absolute top-full mt-2 end-0 z-50 w-[19rem] max-w-[calc(100vw-2.5rem)] bg-white border border-gray-100 rounded-xl shadow-2xl shadow-black/10 p-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { setScholarshipOpen(true); setServicesMenuOpen(false); }}
                    className="w-full inline-flex items-center justify-center gap-2 border-2 border-[#10b981] text-[#0d7a5f] font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#10b981] hover:text-white transition-all"
                  >
                    <Award size={15} />
                    {qf.scholarshipCta}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCallCenterOpen(true); setServicesMenuOpen(false); }}
                    className="w-full inline-flex items-center justify-center gap-2 border-2 border-[#3b82f6] text-[#1d4ed8] font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#3b82f6] hover:text-white transition-all"
                  >
                    <Headphones size={15} />
                    {qf.callCenterCta}
                  </button>

                  <Link
                    href="/services"
                    onClick={() => setServicesMenuOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-2 border-2 border-[#0a0a0a] text-[#0a0a0a] font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#0a0a0a] hover:text-white transition-all"
                  >
                    {qf.browseAllCta}
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
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
                href={`/services#${slugifyServiceId(s.id)}`}
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
      <ScholarshipModal open={scholarshipOpen} onClose={() => setScholarshipOpen(false)} />
      <CallCenterModal open={callCenterOpen} onClose={() => setCallCenterOpen(false)} />
    </section>
  );
}