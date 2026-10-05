// PATH: app/(pages)/services/[slug]/page.jsx
"use client";

//
// صفحة مخصصة لكل خدمة (Study in Spain → /services/study-in-spain،
// Visa & Documentation → /services/visa-services ... إلخ). الـ slug مشتق من
// id الخدمة الحقيقي في collection="services" اللي بتتحكم فيه لوحة الأدمن،
// فأي خدمة جديدة بتاخد صفحتها تلقائيًا. أي slug مش موجود بيروح لصفحة 404.
//
// الأزرار بتتصرف بنفس منطق ServiceRow في /services:
//   - Study Spain / Romania / Admissions / Visa → Quick Inquiry + طلب استشارة
//   - Scholarships  → نموذج تقييم المنح + Quick Inquiry
//   - Translation   → Quick Inquiry
//   - Call Center   → استمارة التسجيل في الدورة
//   - Language      → نماذج الإنجليزي/الإسباني/العربي + منهج Aula Plus

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, notFound } from "next/navigation";
import { CalendarClock, GraduationCap, Award, Headphones, Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingScreen from "@/app/components/LoadingScreen";
import { useCollectionDoc } from "@/app/lib/useCollection";
import {
  slugifyServiceId,
  serviceCardHref,
  mergeService,
  getServiceKind,
  getQuickInquiryService,
  getUnifiedServiceColor,
  fixLanguageDesc,
} from "@/app/lib/serviceUtils";

const ConsultationModal = dynamic(() => import("@/app/components/consultation/ConsultationModal"), { ssr: false });
const EnglishProgramModal = dynamic(() => import("@/app/components/englishProgram/EnglishProgramModal"), { ssr: false });
const ScholarshipModal = dynamic(() => import("@/app/components/scholarship/ScholarshipModal"), { ssr: false });
const CallCenterModal = dynamic(() => import("@/app/components/callCenter/CallCenterModal"), { ssr: false });
const LanguageProgramModal = dynamic(() => import("@/app/components/languageCourses/LanguageProgramModal"), { ssr: false });
const TranslationModal = dynamic(() => import("@/app/components/translation/TranslationModal"), { ssr: false });

const STRINGS = {
  en: {
    crumb: "Services",
    included: "What's included",
    others: "Explore other services",
    learnMore: "Learn more",
    backAll: "View all services",
    consult: "Book a consultation",
    quick: "Quick Inquiry",
    english: "Join English courses",
    spanish: "Join Spanish courses",
    arabic: "Join Arabic courses",
    callCenter: "Register for Call Center Operations Course",
    translationForm: "Translation Request Form",
  },
  ar: {
    crumb: "الخدمات",
    included: "ماذا تشمل الخدمة",
    others: "اكتشف خدمات أخرى",
    learnMore: "اعرف المزيد",
    backAll: "عرض كل الخدمات",
    consult: "احجز استشارة",
    quick: "استفسار سريع",
    english: "التسجيل في دورات اللغة الانجليزية",
    spanish: "التسجيل في دورات الإسبانية",
    arabic: "التسجيل في دورات العربية",
    callCenter: "التسجيل في دورة Call Center Operations",
    translationForm: "نموذج طلب ترجمة",
  },
  es: {
    crumb: "Servicios",
    included: "Qué incluye",
    others: "Descubre otros servicios",
    learnMore: "Saber más",
    backAll: "Ver todos los servicios",
    consult: "Reserva una consulta",
    quick: "Consulta rápida",
    english: "Inscribirse en cursos de inglés",
    spanish: "Inscribirse en cursos de español",
    arabic: "Inscribirse en cursos de árabe",
    callCenter: "Inscribirse en el curso Call Center Operations",
    translationForm: "Solicitud de traducción",
  },
};

function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function Check({ size = 20, color = "#003A91" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
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

const PRIMARY_BTN =
  "inline-flex items-center gap-2 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg text-sm text-white transition-all active:scale-95 shadow-sm";
const OUTLINE_BTN =
  "inline-flex items-center gap-2 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg text-sm border-2 border-[#003A91] text-[#003A91] transition-all active:scale-95 hover:bg-[#003A91] hover:text-white";

export default function ServiceDetailPage() {
  const { language, isRTL } = useLanguage();
  const params = useParams();
  const slug = decodeURIComponent(String(params?.slug ?? "")).toLowerCase();
  const data = useCollectionDoc("services");

  const [consultOpen, setConsultOpen] = useState(false);
  const [englishOpen, setEnglishOpen] = useState(false);
  const [scholarshipOpen, setScholarshipOpen] = useState(false);
  const [callCenterOpen, setCallCenterOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [spanishOpen, setSpanishOpen] = useState(false);
  const [arabicOpen, setArabicOpen] = useState(false);
  const [heroRef, heroVisible] = useReveal(0.05);

  if (!data) return <LoadingScreen />;

  const t = data.i18n?.[language] ?? data.i18n?.en;
  const base = (data.services || []).find((s) => slugifyServiceId(s.id) === slug);
  if (!base || !t) notFound();

  const unifiedColor = getUnifiedServiceColor(data.services || []);
  const merged = mergeService(base, t);
  const kind = getServiceKind(merged);
  // لون موحّد لكل الخدمات + وصف اللغات بكلمة "language" بدل English
  const service = {
    ...merged,
    color: unifiedColor,
    desc: kind === "language" ? fixLanguageDesc(merged.desc, language) : merged.desc,
  };
  const s = STRINGS[language] ?? STRINGS.en;
  const quickService = kind === "language" || kind === "callcenter" ? null : getQuickInquiryService(service) ?? "other";
  const quickHref = quickService ? `/quick-inquiry?service=${quickService}` : null;
  const others = (data.services || [])
    .filter((x) => x.id !== base.id)
    .map((x) => mergeService(x, t));

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link href="/services" className="hover:text-[#0a0a0a] transition-colors">{s.crumb}</Link>
        <span aria-hidden="true" className="text-gray-300">/</span>
        <span className="font-bold" style={{ color: service.color }}>{service.title}</span>
      </nav>

      {/* ── Hero + details ── */}
      <section ref={heroRef} className="grid lg:grid-cols-2 gap-0 items-stretch">
        <div className={`relative overflow-hidden min-h-60 sm:min-h-80 lg:min-h-130 transition-opacity duration-700 ${heroVisible ? "opacity-100" : "opacity-0"}`}>
          {service.image && (
            <Image src={service.image} alt={service.title ?? "Service image"} fill priority className="object-cover" unoptimized />
          )}
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: service.color }} />
        </div>

        <div className={`flex flex-col justify-center px-5 sm:px-8 md:px-12 py-8 sm:py-12 lg:py-20 bg-[#f7f7f7] transition-all duration-700 delay-100 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {service.category && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 sm:w-5 h-px" style={{ background: service.color }} />
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase" style={{ color: service.color }}>
                {service.category}
              </span>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-4">{service.title}</h1>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8">{service.desc}</p>

          {(service.features ?? []).length > 0 && (
            <>
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">{s.included}</h2>
              <ul className="flex flex-col gap-2.5 sm:gap-3 mb-8 sm:mb-10">
                {service.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 sm:gap-3">
                    <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><Check /></span>
                    <span className="text-[#0a0a0a] text-sm font-medium">{f}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* ── الأزرار حسب نوع الخدمة ── */}
          <div className="flex flex-wrap items-center gap-3">
            {kind === "scholarship" && (
              <>
                <button type="button" onClick={() => setScholarshipOpen(true)} className={PRIMARY_BTN} style={{ background: service.color }}>
                  <Award size={15} /> {s.consult}
                </button>
                {quickHref && (
                  <Link href={quickHref} className={OUTLINE_BTN}>{s.quick} <ArrowRight size={13} /></Link>
                )}
              </>
            )}

            {kind === "callcenter" && (
              <button type="button" onClick={() => setCallCenterOpen(true)} className={PRIMARY_BTN} style={{ background: service.color }}>
                <Headphones size={15} /> {s.callCenter}
              </button>
            )}

            {kind === "language" && (
              <>
                {service.ctaHref && (
                  <Link href={service.ctaHref} className={PRIMARY_BTN} style={{ background: service.color }}>
                    {service.cta} <ArrowRight size={13} />
                  </Link>
                )}
                <button type="button" onClick={() => setSpanishOpen(true)} className={OUTLINE_BTN}>
                  <GraduationCap size={15} /> {s.spanish}
                </button>
                <button type="button" onClick={() => setArabicOpen(true)} className={OUTLINE_BTN}>
                  <GraduationCap size={15} /> {s.arabic}
                </button>
              </>
            )}

            {kind === "translation" && (
              <>
                {quickHref && (
                  <Link href={quickHref} className={PRIMARY_BTN} style={{ background: service.color }}>
                    {s.quick} <ArrowRight size={13} />
                  </Link>
                )}
                <button type="button" onClick={() => setTranslationOpen(true)} className={OUTLINE_BTN}>
                  <Languages size={15} /> {s.translationForm}
                </button>
              </>
            )}

            {kind === "standard" && (
              <>
                {quickHref ? (
                  <Link href={quickHref} className={PRIMARY_BTN} style={{ background: service.color }}>
                    {s.quick} <ArrowRight size={13} />
                  </Link>
                ) : service.ctaHref ? (
                  <Link href={service.ctaHref} className={PRIMARY_BTN} style={{ background: service.color }}>
                    {service.cta} <ArrowRight size={13} />
                  </Link>
                ) : null}
                <button type="button" onClick={() => setConsultOpen(true)} className={OUTLINE_BTN}>
                  <CalendarClock size={15} /> {s.consult}
                </button>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── خدمات أخرى ── */}
      {others.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
            <div className="flex items-end justify-between gap-4 mb-7 sm:mb-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">{s.others}</h2>
              <Link href="/services" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-[#003A91] hover:underline shrink-0">
                {s.backAll} <ArrowRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {others.map((o) => (
                <Link
                  key={o.id}
                  href={serviceCardHref(o)}
                  className="group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-[#C9A227]/30 hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300"
                >
                  <div className="relative h-32 sm:h-36 overflow-hidden bg-gray-100">
                    {o.image && (
                      <Image src={o.image} alt={o.title ?? ""} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                    )}
                    <div className="absolute top-0 inset-x-0 h-0.75" style={{ background: o.color }} />
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-semibold text-sm leading-snug group-hover:text-[#C9A227] transition-colors">{o.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 flex-1">{o.desc}</p>
                    <span className="text-[11px] font-bold text-[#C9A227] inline-flex items-center gap-1">
                      {s.learnMore} <ArrowRight size={11} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <ConsultationModal open={consultOpen} onClose={() => setConsultOpen(false)} initialService={service.title || ""} />
      <TranslationModal open={translationOpen} onClose={() => setTranslationOpen(false)} />
      <EnglishProgramModal open={englishOpen} onClose={() => setEnglishOpen(false)} />
      <ScholarshipModal open={scholarshipOpen} onClose={() => setScholarshipOpen(false)} />
      <CallCenterModal open={callCenterOpen} onClose={() => setCallCenterOpen(false)} />
      <LanguageProgramModal program="spanish" open={spanishOpen} onClose={() => setSpanishOpen(false)} />
      <LanguageProgramModal program="arabic" open={arabicOpen} onClose={() => setArabicOpen(false)} />
    </div>
  );
}