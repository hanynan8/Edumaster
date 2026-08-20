"use client";

/* ════════════════════════════════════════════════════════════════════
   app/page.jsx  —  HOME PAGE (GUEST / NOT LOGGED IN)
   ------------------------------------------------------------------
   Sections (top → bottom):
     1) Hero               → same as the current Home page (collection=home)
     2) Courses            → ALL courses, same fetch as /courses page
                              (GET /api/courses?limit=50) — reformatted as
                              a 4-per-row grid
     3) Services           → same data as /services page
                              (GET /api/data?collection=services) —
                              reformatted as a 4-per-row card grid instead
                              of the alternating full-width rows
     4) Countries (preview)→ same data as /countries page
                              (GET /api/data?collection=countries) — only
                              a few highlight cards (some from Spain, some
                              from Romania), 4 per row, with a "see all"
                              link to /countries
     5) Mission & Vision   → same data as /about page
                              (GET /api/data?collection=about)
     6) Membership (preview)→ same data as /membership page
                              (GET /api/membership-plans) — only the first
                              4 active plans, 4 per row, with a "see all"
                              link to /membership
     7) Numbers Speak      → same as the current Home page "Stats" section
                              (collection=home)

   IMPORTANT: every fetch below hits the EXACT same endpoint/collection the
   original page uses, so editing content from the admin panel (which
   feeds those same collections/endpoints) updates this section too.

   No extra component files were created — every piece lives in this
   single file, as requested.
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import { Check as CheckIcon, Crown, Loader, CheckCircle2 } from "lucide-react";

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
    filterCategory: "Category",
    filterLevel: "Level",
    filterPrice: "Price",
    allCategories: "All Categories",
    allLevels: "All Levels",
    allPrices: "Any Price",
    paid: "Paid",
    clearFilters: "Clear filters",
    noMatch: "No courses match your search or filters.",
    resultsCount: (n) => `${n} course${n === 1 ? "" : "s"}`,

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
    filterCategory: "التصنيف",
    filterLevel: "المستوى",
    filterPrice: "السعر",
    allCategories: "كل التصنيفات",
    allLevels: "كل المستويات",
    allPrices: "أي سعر",
    paid: "مدفوع",
    clearFilters: "مسح الفلاتر",
    noMatch: "مفيش كورسات مطابقة لبحثك أو الفلاتر اللي اخترتها.",
    resultsCount: (n) => `${n} كورس`,

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
    filterCategory: "Categoría",
    filterLevel: "Nivel",
    filterPrice: "Precio",
    allCategories: "Todas las categorías",
    allLevels: "Todos los niveles",
    allPrices: "Cualquier precio",
    paid: "De pago",
    clearFilters: "Borrar filtros",
    noMatch: "Ningún curso coincide con tu búsqueda o filtros.",
    resultsCount: (n) => `${n} curso${n === 1 ? "" : "s"}`,

    servicesTitle: "Cómo Te Ayudamos a Estudiar Fuera",
    servicesCta: "Ver Todos los Servicios",

    countriesTitle: "Dónde Podrías Estudiar",
    countriesCta: "Descubre Todos los Países",

    mvTitle: "Nuestra Misión y Visión",
  },
};

const LEVEL_COLORS = {
  beginner: "#10b981",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

const FALLBACK_COURSE_IMAGE =
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&q=80";

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

// same as /membership page: GET /api/membership-plans (active plans only)
function useMembershipPlans() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/membership-plans")
      .then((r) => r.json())
      .then((res) => setPlans(Array.isArray(res) ? res : []))
      .catch(() => setError(true));
  }, []);
  return { plans, error };
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

// same as /courses page: GET /api/courses?limit=50
function useAllCourses() {
  const [rawCourses, setRawCourses] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/courses?limit=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancelled) return;
        setRawCourses(Array.isArray(res?.courses) ? res.courses : []);
      })
      .catch(() => !cancelled && setRawCourses([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return rawCourses;
}

// same normalization logic as /courses page
function localizeCourse(c, language, ui) {
  const i18nEntry = c.i18n?.[language] || c.i18n?.en || null;
  const categoryI18nEntry = c.categoryI18n?.[language] || c.categoryI18n?.en || null;
  const categoryName = categoryI18nEntry?.name || c.categoryName || "";
  const title = i18nEntry?.title || c.title;
  return {
    id: c.id,
    title,
    shortDescription: i18nEntry?.shortDescription || c.shortDescription || c.description || "",
    thumbnail: c.thumbnail,
    categoryName,
    teacherName: c.teacherName || "",
    level: c.level,
    levelLabel: ui.levels[c.level] || c.level,
    levelColor: LEVEL_COLORS[c.level] || "#1D6FD8",
    durationLabel: c.durationLabel || (c.totalDurationSeconds > 0 ? formatSeconds(c.totalDurationSeconds) : ""),
    studentsCount: c.studentsCount || 0,
    ratingAverage: c.ratingAverage || 0,
    ratingCount: c.ratingCount || 0,
    isFree: c.isFree,
    price: c.price || 0,
    currency: c.currency || "",
    createdAt: c.createdAt ? new Date(c.createdAt).getTime() : 0,
    searchBlob: [title, c.teacherName, categoryName, ...(c.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}
function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
  const rawCourses = useAllCourses();

  const { language: lang } = useLanguage();
  const ui = UI[lang] ?? UI.en;
  const isRTL = lang === "ar";

  if (!homeData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Loading</span>
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
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
      >
        {/* 1) HERO — unchanged, same as current Home */}
        <Hero data={homeData} t={tHome} />

        {/* 2) ALL COURSES — same source as /courses, 4-per-row grid */}
        <CoursesSection rawCourses={rawCourses} lang={lang} ui={ui} />

        {/* 3) COUNTRIES PREVIEW — same source as /countries, a few cards only */}
        {countriesData && <CountriesPreviewSection data={countriesData} lang={lang} ui={ui} />}

        {/* 4) SERVICES — same source as /services, 4-per-row grid */}
        {servicesData && <ServicesSection data={servicesData} lang={lang} ui={ui} />}

        {/* 5) MISSION & VISION — same source as /about */}
        {aboutData && <MissionVisionSection data={aboutData} lang={lang} ui={ui} />}

        {/* 6) MEMBERSHIP — same source as /membership, copied as-is from the /services page */}
        <MembershipSection isRTL={isRTL} />

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
    <section className="relative overflow-hidden bg-white px-6 sm:px-12 md:px-20 pt-6 sm:pt-10">
      <div className="relative w-full h-[300px] sm:h-[360px] md:h-[420px]">
        <Image
          src={data.hero.backgroundImage}
          alt="hero"
          fill
          className="object-cover object-center"
          priority
          unoptimized
        />

        {/* White card overlapping the image, Udemy-style */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-5 sm:px-8 md:px-12">
            <div className="bg-white rounded-none sm:rounded-md shadow-xl w-full max-w-[300px] sm:max-w-[340px] md:max-w-[400px] px-6 sm:px-8 py-6 sm:py-8 animate-fadein-up">
              <h1 className="font-black tracking-tight text-[#1c1d1f] text-xl sm:text-2xl md:text-3xl leading-tight mb-2 sm:mb-3">
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

/* ═══════════════════════════════════════
   2) COURSES — ALL courses, 4 per row, with search + filters
═══════════════════════════════════════ */
function CoursesSection({ rawCourses, lang, ui }) {
  const [ref, visible] = useReveal();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [price, setPrice] = useState("all");

  const courses = useMemo(() => {
    if (!rawCourses) return null;
    return rawCourses.map((c) => localizeCourse(c, lang, ui));
  }, [rawCourses, lang, ui]);

  const categoryOptions = useMemo(() => {
    if (!courses) return [{ value: "all", label: ui.allCategories }];
    const present = new Set(courses.map((c) => c.categoryName).filter(Boolean));
    return [{ value: "all", label: ui.allCategories }, ...[...present].map((name) => ({ value: name, label: name }))];
  }, [courses, ui]);

  const levelOptions = [
    { value: "all", label: ui.allLevels },
    { value: "beginner", label: ui.levels.beginner },
    { value: "intermediate", label: ui.levels.intermediate },
    { value: "advanced", label: ui.levels.advanced },
  ];

  const priceOptions = [
    { value: "all", label: ui.allPrices },
    { value: "free", label: ui.free },
    { value: "paid", label: ui.paid },
  ];

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (q && !c.searchBlob.includes(q)) return false;
      if (category !== "all" && c.categoryName !== category) return false;
      if (level !== "all" && c.level !== level) return false;
      if (price === "free" && !c.isFree) return false;
      if (price === "paid" && c.isFree) return false;
      return true;
    });
  }, [courses, search, category, level, price]);

  const hasActiveFilters = search || category !== "all" || level !== "all" || price !== "all";

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setLevel("all");
    setPrice("all");
  }

  return (
    <section ref={ref} className="py-8 sm:py-14 md:py-20 bg-white">
      <div className="px-5 sm:px-10 md:px-16">
        <div
          className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-7 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
              {ui.coursesTitle}
            </h2>
            <p className="text-gray-500 text-sm mt-2 max-w-md">{ui.coursesSubtitle}</p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 border-2 border-[#0a0a0a] text-[#0a0a0a] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#0a0a0a] hover:text-white transition-all shrink-0 self-start sm:self-auto w-fit"
          >
            {ui.coursesCta}
            <ArrowRight size={13} />
          </Link>
        </div>

        {courses !== null && courses.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 mb-6 sm:mb-8">
            <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
              <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon size={15} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={ui.searchPlaceholder}
                className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs sm:text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A227]/20 focus:border-[#C9A227] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar">
              <FilterSelect value={category} onChange={setCategory} options={categoryOptions} />
              <FilterSelect value={level} onChange={setLevel} options={levelOptions} />
              <FilterSelect value={price} onChange={setPrice} options={priceOptions} />

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors px-2 py-1"
                >
                  <XIcon size={12} />
                  {ui.clearFilters}
                </button>
              )}
            </div>
          </div>
        )}

        {courses === null && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400">{ui.coursesLoading}</span>
          </div>
        )}

        {courses?.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-16">{ui.coursesEmpty}</div>
        )}

        {courses?.length > 0 && filtered.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-16">{ui.noMatch}</div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {filtered.map((course, i) => (
              <CourseCard key={course.id} course={course} ui={ui} visible={visible} delay={i * 50} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CourseCard({ course, ui, visible, delay }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className={`group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-[#C9A227]/30 hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="relative h-32 sm:h-40 overflow-hidden bg-gray-100">
        <Image
          src={course.thumbnail || FALLBACK_COURSE_IMAGE}
          alt={course.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        {course.levelLabel && (
          <span
            className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-white text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: course.levelColor + "e6" }}
          >
            {course.levelLabel}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        {course.categoryName && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227]">{course.categoryName}</span>
        )}
        <h3 className="font-black text-[#0a0a0a] text-sm leading-snug line-clamp-2 min-h-[2.4em] group-hover:text-[#C9A227] transition-colors duration-150">
          {course.title}
        </h3>
        {course.teacherName && <p className="text-xs text-gray-400">{ui.by} {course.teacherName}</p>}

        <div className="flex items-center gap-1 mt-0.5">
          {course.ratingCount > 0 ? (
            <>
              <span className="text-xs font-bold text-amber-600">{course.ratingAverage.toFixed(1)}</span>
              <StarIcon size={11} />
              <span className="text-[11px] text-gray-400">({course.ratingCount})</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-400">{ui.noRatingYet}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-black" style={{ color: course.isFree ? "#10b981" : "#0a0a0a" }}>
            {course.isFree || !course.price ? ui.free : `${course.price} ${course.currency}`}
          </span>
          {course.studentsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <UsersIcon size={11} /> {ui.students(course.studentsCount)}
            </span>
          )}
        </div>
      </div>
    </Link>
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
    <section ref={ref} className="py-8 sm:py-14 md:py-20 bg-white">
      <div className="px-5 sm:px-10 md:px-16">
        <div
          className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-7 sm:mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
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
                <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: s.color }} />
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="font-black text-[#0a0a0a] text-sm leading-snug group-hover:text-[#C9A227] transition-colors duration-150">
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
   4) COUNTRIES PREVIEW — same data as /countries, a few cards only
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
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
                  <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: card.countryColor }} />
                  <div className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 w-8 h-8 rounded-lg flex items-center justify-center shadow-md" style={{ background: meta.color }}>
                    <Icon size={14} color="white" />
                  </div>
                  <span className="absolute bottom-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-white text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: card.countryColor }}>
                    {card.countryName}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="font-black text-[#0a0a0a] text-sm leading-snug group-hover:text-[#C9A227] transition-colors duration-150">
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
   5) MISSION & VISION — same data as /about page
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
    <section ref={ref} className="py-8 sm:py-14 md:py-20 bg-[#f7f7f7]">
      <div className="px-5 sm:px-10 md:px-16">
        <div className={`mb-7 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">{t.mvTitle || ui.mvTitle}</h2>
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
              <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: card.color }} />
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-5 sm:mb-6"
                style={{ background: `${card.color}12`, color: card.color }}
              >
                {card.icon}
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-3" style={{ color: card.color }}>
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
   6) MEMBERSHIP — copied as-is from app/(pages)/services/page.jsx
═══════════════════════════════════════ */
const MEMBERSHIP_STRINGS = {
  ar: {
    label: "خطط الاشتراك",
    title: "افتح كل الكورسات باشتراك واحد",
    subtitle: "اختار الخطة اللي تناسبك وابدأ تعلّم من غير ما تدفع كل كورس لوحده",
    free: "مجانية",
    perMonth: "/شهر",
    perYear: "/سنة",
    allCourses: "كل الكورسات متاحة",
    someCourses: (n) => `${n} كورس متاح`,
    cta: "اشترك دلوقتي",
    viewAll: "شوف كل خطط الاشتراك",
    loading: "جارِ تحميل الخطط...",
    empty: "لسه مفيش خطط اشتراك متاحة",
    popular: "الأكتر طلبًا",
    subscribing: "جارِ التفعيل...",
    redirecting: "جارِ التحويل لـ PayPal...",
    subscribed: "خطتك الحالية",
    login: "سجّل دخولك للاشتراك",
    paymentSoon: "الدفع الإلكتروني غير متاح حاليًا — تواصل مع الإدارة للتفعيل اليدوي",
    paymentGatewayError: "تعذّر بدء عملية الدفع، حاول مرة أخرى",
    error: "تعذّر تحميل الخطط",
  },
  en: {
    label: "Membership Plans",
    title: "Unlock every course with one membership",
    subtitle: "Pick the plan that fits you and start learning without paying per course",
    free: "Free",
    perMonth: "/mo",
    perYear: "/yr",
    allCourses: "All courses included",
    someCourses: (n) => `${n} courses included`,
    cta: "Subscribe now",
    viewAll: "View all membership plans",
    loading: "Loading plans...",
    empty: "No membership plans available yet",
    popular: "Most popular",
    subscribing: "Activating...",
    redirecting: "Redirecting to PayPal...",
    subscribed: "Your current plan",
    login: "Log in to subscribe",
    paymentSoon: "Online payment isn't available right now — contact us to activate manually",
    paymentGatewayError: "Couldn't start the payment, please try again",
    error: "Couldn't load plans",
  },
};

function MembershipSection({ isRTL }) {
  const { language } = useLanguage();
  const t = MEMBERSHIP_STRINGS[language] ?? MEMBERSHIP_STRINGS.en;
  const { plans, error } = useMembershipPlans();
  const [ref, visible] = useReveal(0.08);

  // نفس بالظبط منطق /membership: تسجيل الدخول + الدفع (مجاني أو PayPal)
  const { data: session, status: sessionStatus } = useSession();
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [subscribingId, setSubscribingId] = useState(null);
  const [subscribeError, setSubscribeError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrentPlanId(data?.status === "active" ? data?.plan?.id || null : null))
      .catch(() => {});
  }, [sessionStatus]);

  async function handleSubscribeWithPaypal(plan) {
    setSubscribeError("");
    setSubscribingId(plan.id);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "membership", id: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.approveUrl) {
        setSubscribeError(
          data.error === "payment_gateway_not_configured" ? t.paymentSoon : t.paymentGatewayError
        );
        setSubscribingId(null);
        return;
      }
      window.location.href = data.approveUrl;
    } catch {
      setSubscribeError(t.paymentGatewayError);
      setSubscribingId(null);
    }
  }

  async function handleSubscribe(plan) {
    if (!session?.user) {
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }

    const isFree = plan.billingCycle === "free" || plan.price === 0;
    if (!isFree) {
      return handleSubscribeWithPaypal(plan);
    }

    setSubscribeError("");
    setSubscribingId(plan.id);
    try {
      const res = await fetch(`/api/membership-plans/${plan.id}/subscribe`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "payment_required") return handleSubscribeWithPaypal(plan);
        setSubscribeError(t.error);
        return;
      }
      setCurrentPlanId(plan.id);
    } catch {
      setSubscribeError(t.error);
    } finally {
      setSubscribingId(null);
    }
  }

  // مفيش أي شرط تسجيل دخول لعرض الخطط — القسم ده لازم يظهر لأي زائر عادي.
  if (error) return null;

  return (
    <section ref={ref} className="py-14 sm:py-16 md:py-20 bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
        <div className={`max-w-2xl mx-auto text-center mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <Label text={t.label} visible={visible} />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3">{t.title}</h2>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed">{t.subtitle}</p>
        </div>

        {plans === null && (
          <div className="flex justify-center py-16">
            <Loader className="animate-spin text-[#1D6FD8]" size={28} />
          </div>
        )}

        {plans?.length === 0 && (
          <p className="text-center text-gray-400 py-10">{t.empty}</p>
        )}

        {subscribeError && (
          <div className="max-w-xl mx-auto bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-xl text-center mb-8">
            {subscribeError}
          </div>
        )}

        {plans?.length > 0 && (() => {
          const featuredIndex = Math.floor((plans.length - 1) / 2);
          return (
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-7">
              {plans.map((plan, i) => {
                const isCurrent = currentPlanId === plan.id;
                const isFree = plan.billingCycle === "free" || plan.price === 0;
                const isFeatured = plans.length > 1 && i === featuredIndex;
                return (
                  <div
                    key={plan.id}
                    className={`relative w-full sm:w-[260px] bg-white rounded-2xl border p-6 flex flex-col transition-all duration-500 ${
                      isCurrent
                        ? "border-[#1D6FD8] ring-2 ring-[#1D6FD8]/20"
                        : isFeatured
                        ? "border-[#1D6FD8] shadow-xl shadow-[#1D6FD8]/10 sm:scale-110 z-10"
                        : "border-gray-100 sm:scale-95 opacity-100"
                    } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    {isFeatured && !isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1D6FD8] text-white px-3 py-1 rounded-full whitespace-nowrap">
                        {t.popular}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1D6FD8] text-white px-3 py-1 rounded-full whitespace-nowrap">
                        {t.subscribed}
                      </span>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isFeatured || isCurrent ? "bg-[#1D6FD8]/10" : "bg-amber-50"}`}>
                      <Crown size={18} className={isFeatured || isCurrent ? "text-[#1D6FD8]" : "text-amber-500"} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-gray-400 mb-4">{plan.description}</p>}

                    <p className="text-2xl font-black text-gray-900 mb-1">
                      {isFree ? t.free : `${plan.price} ${plan.currency || "EGP"}`}
                      {!isFree && (
                        <span className="text-sm font-medium text-gray-400">
                          {plan.billingCycle === "yearly" ? t.perYear : t.perMonth}
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-gray-400 mb-4">
                      {(plan.allowedCourses?.length ?? 0) === 0 ? t.allCourses : t.someCourses(plan.allowedCourses.length)}
                    </p>

                    {plan.features?.length > 0 && (
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.slice(0, 4).map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckIcon size={15} className="text-[#1D6FD8] shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    {isCurrent ? (
                      <div className="mt-auto flex items-center justify-center gap-2 bg-green-50 text-green-700 font-bold py-2.5 rounded-xl text-sm">
                        <CheckCircle2 size={15} /> {t.subscribed}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={subscribingId === plan.id}
                        className={`mt-auto w-full inline-flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl transition-opacity text-sm text-center disabled:opacity-60 ${
                          isFeatured ? "bg-[#1D6FD8] text-white hover:opacity-90" : "bg-[#0a0a0a] text-white hover:opacity-90"
                        }`}
                      >
                        {subscribingId === plan.id
                          ? (isFree ? t.subscribing : t.redirecting)
                          : t.cta}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {plans?.length > 0 && (
          <div className="flex justify-center mt-8 sm:mt-10">
            <Link href="/membership" className="inline-flex items-center gap-2 font-bold text-[#1D6FD8] hover:underline text-sm">
              {t.viewAll} <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {showAuthModal && (
        <AuthModal mode={authMode} onClose={() => setShowAuthModal(false)} onSwitch={(next) => setAuthMode(next)} />
      )}
    </section>
  );
}

/* ═══════════════════════════════════════
   7) NUMBERS SPEAK  (identical to current Home "Stats" section)
═══════════════════════════════════════ */
function Stats({ data, t }) {
  const [ref, visible] = useReveal();
  const merged = data.stats.items.map((item, i) => ({ ...item, label: t.stats.items[i] }));

  return (
    <section ref={ref} className="relative py-8 sm:py-14 md:py-20 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 z-0 opacity-15">
        <Image src={data.stats.backgroundImage} alt="" fill className="object-cover" unoptimized />
      </div>
      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#C9A227] z-10" />
      <div className="relative z-10 px-5 sm:px-10 md:px-16">
        <div className={`mb-7 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">{t.stats.title}</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.08] rounded-2xl overflow-hidden border border-white/[0.08]">
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

/* ═══════════════════════════════════════
   SHARED UI BITS
═══════════════════════════════════════ */
function Label({ text, visible }) {
  return (
    <div className={`flex items-center gap-2 mb-3 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="w-4 sm:w-5 h-px bg-[#C9A227]" />
      <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[#C9A227]">{text}</span>
    </div>
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
function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function ChevronDownIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer bg-white border border-gray-200 rounded-lg pl-3 pr-8 rtl:pl-8 rtl:pr-3 py-2 text-xs sm:text-[13px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A227]/20 focus:border-[#C9A227] transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <ChevronDownIcon size={13} />
      </span>
    </div>
  );
}
function StarIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function UsersIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
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