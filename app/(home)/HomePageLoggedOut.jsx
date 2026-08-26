"use client";

/* ════════════════════════════════════════════════════════════════════
   app/page.jsx  —  HOME PAGE (GUEST / NOT LOGGED IN)
   ------------------------------------------------------------------
   Sections (top → bottom):
     1) Hero               → same as the current Home page (collection=home)
     2) Services           → same data as /services page
                              (GET /api/data?collection=services)
     3) Courses            → shared <CoursesSection /> component
                              (components/CoursesSection.jsx), same fetch
                              as /courses page (GET /api/courses?limit=50)
     4) Countries (preview)→ same data as /countries page
                              (GET /api/data?collection=countries)
     5) Mission & Vision   → same data as /about page
                              (GET /api/data?collection=about)
     6) Membership (preview)→ shared <MembershipSection /> component
                              (components/MembershipSection.jsx), same
                              source as /membership page
                              (GET /api/membership-plans)
     7) Numbers Speak      → same as the current Home page "Stats" section
                              (collection=home)

   Courses and Membership are shared with the logged-in home page, so
   both now live in components/CoursesSection.jsx and
   components/MembershipSection.jsx — imported below instead of being
   duplicated inline.

   IMPORTANT: every other fetch below still hits the EXACT same
   endpoint/collection the original page uses, so editing content from
   the admin panel updates this section too.
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import CoursesSection from "../components/CoursesSection";
import MembershipSection from "../components/MembershipSection";

/* ─────────────────────────────────────────
   TEXT FOR THE NEW SECTION HEADERS
   (UI copy only — not tied to any collection, purely presentational)
───────────────────────────────────────── */
const UI = {
  en: {
    coursesTitle: "All Our Courses",
    coursesSubtitle: "Every course available on the platform, in one place.",
    coursesEmpty: "No courses available yet — check back soon.",
    coursesLoading: "Loading courses...",
    coursesCta: "View All Courses",
    by: "By",
    free: "Free",
    students: (n) => `${n.toLocaleString()} students`,
    noRatingYet: "No ratings yet",
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    searchPlaceholder: "Search courses, instructors, topics...",
    allCategories: "All Categories",
    allLevels: "All Levels",
    allPrices: "Any Price",
    paid: "Paid",
    clearFilters: "Clear filters",
    noMatch: "No courses match your search or filters.",

    servicesTitle: "How We Help You Study Abroad",
    servicesCta: "View All Services",

    countriesTitle: "Where You Could Be Studying",
    countriesCta: "Discover All Countries",

    mvTitle: "Our Mission & Vision",
  },
  ar: {
    coursesTitle: "كل الكورسات عندنا",
    coursesSubtitle: "كل الكورسات المتاحة على المنصة، في مكان واحد.",
    coursesEmpty: "لسه مفيش كورسات متاحة — تابعنا قريبًا.",
    coursesLoading: "جارِ تحميل الكورسات...",
    coursesCta: "شوف كل الكورسات",
    by: "بواسطة",
    free: "مجاني",
    students: (n) => `${n.toLocaleString()} طالب`,
    noRatingYet: "لسه مفيش تقييمات",
    levels: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" },
    searchPlaceholder: "ابحث عن كورس، مدرس، أو موضوع...",
    allCategories: "كل التصنيفات",
    allLevels: "كل المستويات",
    allPrices: "أي سعر",
    paid: "مدفوع",
    clearFilters: "مسح الفلاتر",
    noMatch: "مفيش كورسات مطابقة لبحثك أو الفلاتر اللي اخترتها.",

    servicesTitle: "إزاي بنساعدك تدرس بره",
    servicesCta: "شوف كل خدماتنا",

    countriesTitle: "ممكن تدرس فين",
    countriesCta: "اكتشف كل الدول",

    mvTitle: "رسالتنا ورؤيتنا",
  },
  es: {
    coursesTitle: "Todos Nuestros Cursos",
    coursesSubtitle: "Todos los cursos disponibles en la plataforma, en un solo lugar.",
    coursesEmpty: "Aún no hay cursos disponibles — vuelve pronto.",
    coursesLoading: "Cargando cursos...",
    coursesCta: "Ver todos los cursos",
    by: "Por",
    free: "Gratis",
    students: (n) => `${n.toLocaleString()} estudiantes`,
    noRatingYet: "Sin valoraciones aún",
    levels: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" },
    searchPlaceholder: "Buscar cursos, instructores, temas...",
    allCategories: "Todas las categorías",
    allLevels: "Todos los niveles",
    allPrices: "Cualquier precio",
    paid: "De pago",
    clearFilters: "Borrar filtros",
    noMatch: "Ningún curso coincide con tu búsqueda o filtros.",

    servicesTitle: "Cómo Te Ayudamos a Estudiar Fuera",
    servicesCta: "Ver Todos los Servicios",

    countriesTitle: "Dónde Podrías Estudiar",
    countriesCta: "Descubre Todos los Países",

    mvTitle: "Nuestra Misión y Visión",
  },
};

/* ─────────────────────────────────────────
   FETCH HOOKS — same endpoints/collections as the source pages
───────────────────────────────────────── */

// same as the current Home page: collection=home (hero + stats)
function useHomeData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=home")
      .then((r) => r.json())
      .then((res) => setData(Array.isArray(res) ? res[0] : res))
      .catch(console.error);
  }, []);
  return data;
}

// same as /services page: collection=services
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

// same as /countries page: collection=countries
function useCountriesData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=countries")
      .then((r) => r.json())
      .then((res) => setData(Array.isArray(res) ? res[0] : res))
      .catch(console.error);
  }, []);
  return data;
}

// same as /about page: collection=about
function useAboutData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=about")
      .then((r) => r.json())
      .then((res) => setData(Array.isArray(res) ? res[0] : res))
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
   ROOT PAGE — GUEST HOME
═══════════════════════════════════════ */
export default function HomePageLoggedOut() {
  const homeData = useHomeData();
  const servicesData = useServicesData();
  const countriesData = useCountriesData();
  const aboutData = useAboutData();

  const { language: lang } = useLanguage();
  const ui = UI[lang] ?? UI.en;
  const isRTL = lang === "ar";

  if (!homeData) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">{ui.coursesLoading}</span>
        </div>
      </div>
    );
  }

  const tHome = homeData.i18n[lang] ?? homeData.i18n.en;

  return (
    <>
      <style>{STYLES}</style>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
      >
        {/* 1) HERO — unchanged, same as current Home */}
        <Hero data={homeData} t={tHome} />

        {/* 2) SERVICES — same source as /services, 4-per-row grid */}
        {servicesData && <ServicesSection data={servicesData} lang={lang} ui={ui} />}

        {/* 3) ALL COURSES — shared component, same source as /courses */}
        <CoursesSection
          lang={lang}
          ui={ui}
          bgClassName="bg-white"
          paddingClassName="py-8 sm:py-14 md:py-20"
        />

        {/* 4) COUNTRIES PREVIEW — same source as /countries, a few cards only */}
        {countriesData && <CountriesPreviewSection data={countriesData} lang={lang} ui={ui} />}

        {/* 5) MISSION & VISION — same source as /about */}
        {aboutData && <MissionVisionSection data={aboutData} lang={lang} ui={ui} />}

        {/* 6) MEMBERSHIP — shared component, same source as /membership */}
        <MembershipSection />

        {/* 7) NUMBERS SPEAK — unchanged, same as current Home "Stats" */}
        <Stats data={homeData} t={tHome} />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   1) HERO  (compact Udemy-style banner:
   smaller image with a white card of
   headline/subheadline overlapping it)
═══════════════════════════════════════ */
function Hero({ data, t }) {
  return (
    <section className="relative overflow-hidden bg-white px-0 min-[851px]:px-20">
      <div className="relative w-full">
        <div className="relative w-full h-75 sm:h-90 md:h-105">
          <Image
            src={data.hero.backgroundImage}
            alt="hero"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
        </div>

        {/* White card: stacked below the image up to 850px, overlapping it above 850px */}
        <div className="min-[851px]:absolute min-[851px]:inset-0 flex items-center">
          <div className="w-full px-0 min-[851px]:px-12">
            <div className="bg-white rounded-none min-[851px]:rounded-md shadow-none min-[851px]:shadow-xl w-full max-w-full min-[851px]:max-w-100 px-6 sm:px-8 py-6 sm:py-8 animate-fadein-up">
              <h1 className="font-semibold tracking-tight text-[#1c1d1f] text-xl sm:text-2xl md:text-3xl leading-tight mb-2 sm:mb-3">
                {t.hero.headline}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed animate-fadein-up2">
                {t.hero.subheadline}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const SERVICE_ID_MAP = {
  "Study in Spain": "study-spain",
  "Visa Services": "visa",
  "language Courses": "language",
};

function ServicesSection({ data, lang, ui }) {
  const [ref, visible] = useReveal();
  const t = data.i18n[lang] ?? data.i18n.en;

  const merged = (data.services || []).map((svc) => {
    const i18nKey = SERVICE_ID_MAP[svc.id] ?? svc.id;
    return { ...svc, ...(t.services?.[i18nKey] ?? {}) };
  });

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
          <Link
            href="/services"
            className="inline-flex items-center gap-2 border-2 border-[#0a0a0a] text-[#0a0a0a] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#0a0a0a] hover:text-white transition-all shrink-0 self-start sm:self-auto w-fit"
          >
            {ui.servicesCta}
            <ArrowRight size={13} />
          </Link>
        </div>

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
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   COUNTRIES PREVIEW — same data as /countries, a few cards only
═══════════════════════════════════════ */
const COUNTRY_SECTION_META = {
  educationSystem: { icon: BookOpenIcon, color: "#1D6FD8" },
  admissionRequirements: { icon: ClipboardIcon, color: "#a855f7" },
  costOfLiving: { icon: WalletIcon, color: "#10b981" },
  partTimeWork: { icon: BriefcaseIcon, color: "#f59e0b" },
  visaProcess: { icon: FileCheckIcon, color: "#3b82f6" },
  lifeInSpain: { icon: SunIcon, color: "#10b981" },
  lifeInRomania: { icon: SunIcon, color: "#3b82f6" },
  universities: { icon: GraduationIcon, color: "#0ea5e9" },
};
const COUNTRY_SECTION_ORDER = [
  "educationSystem",
  "admissionRequirements",
  "costOfLiving",
  "partTimeWork",
  "visaProcess",
  "lifeInSpain",
  "lifeInRomania",
  "universities",
];

function getCountrySectionKeys(country) {
  const available = Object.keys(country.sections || {});
  const ordered = COUNTRY_SECTION_ORDER.filter((k) => available.includes(k));
  const extra = available.filter((k) => !COUNTRY_SECTION_ORDER.includes(k));
  return [...ordered, ...extra];
}

function CountriesPreviewSection({ data, lang, ui }) {
  const [ref, visible] = useReveal();
  const t = data.i18n[lang] ?? data.i18n.en;

  // كل الدول اللي موجودة فعليًا في data.countries (مش هاردكودد لاسبانيا/رومانيا
  // بس) — أي دولة جديدة تتضاف من لوحة الأدمن هتظهر هنا تلقائي.
  const countries = (data.countries || []).map((c) => ({ ...c, ...(t.countries?.[c.id] ?? {}) }));

  // نفس كل الأقسام الموجودة لكل دولة — بالظبط زي ما هي معروضة في صفحة
  // /countries، مفيش اقتصاص على عدد معين.
  const cards = [];
  countries.forEach((country) => {
    const keys = getCountrySectionKeys(country);
    keys.forEach((key) => cards.push(buildCountryCard(country, key)));
  });

  if (cards.length === 0) return null;

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
              {ui.countriesTitle}
            </h2>
          </div>
          <Link
            href="/countries"
            className="inline-flex items-center gap-2 border-2 border-[#0a0a0a] text-[#0a0a0a] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#0a0a0a] hover:text-white transition-all shrink-0 self-start sm:self-auto w-fit"
          >
            {ui.countriesCta}
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {cards.map((card, i) => {
            const meta = COUNTRY_SECTION_META[card.key] || { icon: BookOpenIcon, color: "#1D6FD8" };
            const Icon = meta.icon;
            return (
              <Link
                href="/countries"
                key={`${card.countryId}-${card.key}`}
                className={`group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-[#C9A227]/30 hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="relative h-32 sm:h-40 overflow-hidden bg-gray-100">
                  {card.image && (
                    <Image src={card.image} alt={card.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                  )}
                  <div className="absolute top-0 inset-x-0 h-0.75" style={{ background: card.countryColor }} />
                  <div className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 w-8 h-8 rounded-lg flex items-center justify-center shadow-md" style={{ background: meta.color }}>
                    <Icon size={14} color="white" />
                  </div>
                  <span className="absolute bottom-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-white text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: card.countryColor }}>
                    {card.countryName}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="font-semibold text-[#0a0a0a] text-sm leading-snug group-hover:text-[#C9A227] transition-colors duration-150">
                    {card.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed flex-1 line-clamp-3">{card.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function buildCountryCard(country, key) {
  const content = country[key] || {};
  return {
    countryId: country.id,
    countryName: country.name,
    countryColor: country.color,
    key,
    title: content.title,
    desc: content.desc,
    image: country.sections?.[key]?.image,
  };
}

/* ═══════════════════════════════════════
   MISSION & VISION — same data as /about page
═══════════════════════════════════════ */
function MissionVisionSection({ data, lang, ui }) {
  const [ref, visible] = useReveal();
  const t = data.i18n[lang] ?? data.i18n.en;
  if (!t.vision || !t.mission) return null;

  const cards = [
    { key: "vision", icon: <EyeIcon />, title: t.vision.title, body: t.vision.body, color: "#1a56a0" },
    { key: "mission", icon: <TargetIcon />, title: t.mission.title, body: t.mission.body, color: "#C9A227" },
  ];

  return (
    <section ref={ref} className="py-8 sm:py-14 md:py-20 bg-white">
      <div className="px-5 sm:px-10 md:px-16">
        <div className={`mb-7 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">{t.mvTitle || ui.mvTitle}</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {cards.map((card, i) => (
            <div
              key={card.key}
              className={`relative bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 md:p-10 overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-black/5 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="absolute top-0 inset-x-0 h-0.75" style={{ background: card.color }} />
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-5 sm:mb-6"
                style={{ background: `${card.color}12`, color: card.color }}
              >
                {card.icon}
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ color: card.color }}>
                {card.title}
              </h3>
              <ul className="flex flex-col gap-1.5 list-none">
                {(card.body || "").split("\n").filter((line) => line.trim() !== "").map((line, li) =>
                  li === 0 ? (
                    <li key={li} className="text-gray-800 text-sm sm:text-[15px] font-black leading-relaxed mb-1">
                      {line}
                    </li>
                  ) : (
                    <li key={li} className="flex items-start gap-2 text-gray-600 text-sm sm:text-[15px] leading-relaxed">
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: card.color }} />
                      {line}
                    </li>
                  )
                )}
              </ul>
              <div
                className="absolute -bottom-4 -right-2 text-[90px] sm:text-[120px] font-black leading-none opacity-[0.04] select-none pointer-events-none"
                style={{ color: card.color }}
              >
                {card.title?.charAt(0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   NUMBERS SPEAK  (identical to current Home "Stats" section)
═══════════════════════════════════════ */
function Stats({ data, t }) {
  const [ref, visible] = useReveal();
  const merged = data.stats.items.map((item, i) => ({ ...item, label: t.stats.items[i] }));

  return (
    <section ref={ref} className="relative py-8 sm:py-14 md:py-20 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 z-0 opacity-15">
        <Image src={data.stats.backgroundImage} alt="" fill className="object-cover" unoptimized />
      </div>
      <div className="absolute top-0 inset-x-0 h-0.75 bg-[#C9A227] z-10" />
      <div className="relative z-10 px-5 sm:px-10 md:px-16">
        <div className={`mb-7 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-white leading-tight">{t.stats.title}</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/8">
          {merged.map((s, i) => (
            <div
              key={i}
              className={`bg-[#111] p-4 sm:p-8 md:p-10 flex flex-col gap-2 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="text-2xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">{s.value}</span>
              <span className="text-gray-400 text-[9px] sm:text-xs font-semibold uppercase tracking-widest mt-1 sm:mt-2 leading-tight">{s.label}</span>
              <div className="w-4 sm:w-6 h-0.5 bg-[#C9A227] mt-1.5 sm:mt-2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   INLINE SVG ICONS
───────────────────────────────────────── */
function ArrowRight({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function BookOpenIcon({ size = 15, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}
function ClipboardIcon({ size = 15, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}
function WalletIcon({ size = 15, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
    </svg>
  );
}
function BriefcaseIcon({ size = 15, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}
function FileCheckIcon({ size = 15, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 15l2 2 4-4" />
    </svg>
  );
}
function SunIcon({ size = 15, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function GraduationIcon({ size = 15, color = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}
function EyeIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TargetIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/* ═══════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@300;400;700;800&display=swap');

  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadein-up { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }

  .animate-fadein      { animation: fadein    0.6s ease both; }
  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }

  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  * { box-sizing: border-box; }
  img { max-width: 100%; }
`;