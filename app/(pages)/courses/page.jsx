// ═══════════════════════════════════════════════
//  courses.jsx — مصدر واحد بس: GET /api/courses (كورسات حقيقية، بتتعدّل من
//  لوحة المدرس/الأدمن، بدعم 3 لغات لكل كورس عبر course.i18n). كل كورس —
//  بما فيهم أي كورس جديد يتضاف بعد كده — بنفس البنية بالظبط، مفيش تفرقة
//  بين "كورس تسويقي" و"كورس حقيقي" خالص.
//
//  🔄 UI REDESIGN: اتحول من عرض "صف بصف" (alternating rows) لتصميم شبكة
//  كروت (card grid) + بحث + فلاتر + ترتيب، زي أنماط منصات الـ LMS الكبيرة.
//  اتاخد بس العناصر الأساسية اللي بتفرق فعليًا في تجربة البحث عن كورس:
//    - صندوق بحث نصي (عنوان/وصف/مدرس/تصنيف/تاجات) — كله client-side على
//      البيانات المحملة فعليًا، مفيش API جديد أو حقول جديدة في الموديل.
//    - فلاتر: التصنيف، المستوى، السعر (الكل/مجاني/مدفوع).
//    - ترتيب: الأكثر شعبية، الأعلى تقييمًا، الأحدث، السعر (من الأقل/الأعلى).
//    - كارت كورس يعرض: صورة، تصنيف، مستوى، عنوان، اسم المدرس، تقييم
//      (نجوم من ratingAverage/ratingCount الموجودين أصلًا في الموديل)،
//      عدد الطلاب، المدة، السعر.
//  اتعمد عدم إضافة حاجات مش موجودة في الـ backend حاليًا (مفيش reviews
//  page منفصلة، مفيش wishlist، مفيش forum) — دي هتتضاف لاحقًا لما يبقى
//  ليها API فعلي.
// ═══════════════════════════════════════════════
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&q=80";

const LEVEL_COLORS = {
  beginner: "#10b981",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

const STRINGS = {
  en: {
    badge: "What We Offer",
    headline: "Courses Built for Your Future",
    subheadline: "Browse everything available on our platform right now.",
    searchPlaceholder: "Search courses, instructors, topics...",
    filterCategory: "Category",
    filterLevel: "Level",
    filterPrice: "Price",
    allCategories: "All Categories",
    allLevels: "All Levels",
    allPrices: "Any Price",
    free: "Free",
    paid: "Paid",
    sortLabel: "Sort by",
    sort: { popular: "Most Popular", rating: "Highest Rated", newest: "Newest", priceLow: "Price: Low to High", priceHigh: "Price: High to Low" },
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    resultsCount: (n) => `${n} course${n === 1 ? "" : "s"}`,
    clearFilters: "Clear filters",
    by: "By",
    students: (n) => `${n.toLocaleString()} students`,
    noRatingYet: "No ratings yet",
    cta: "View Course",
    loading: "Loading",
    empty: "No courses available yet — check back soon.",
    noMatch: "No courses match your search or filters.",
    error: "Couldn't load courses. Please try again.",
  },
  ar: {
    badge: "كورساتنا",
    headline: "كورسات مصمّمة لمستقبلك",
    subheadline: "تصفّح كل الكورسات المتاحة على المنصة دلوقتي.",
    searchPlaceholder: "ابحث عن كورس، مدرس، أو موضوع...",
    filterCategory: "التصنيف",
    filterLevel: "المستوى",
    filterPrice: "السعر",
    allCategories: "كل التصنيفات",
    allLevels: "كل المستويات",
    allPrices: "أي سعر",
    free: "مجاني",
    paid: "مدفوع",
    sortLabel: "ترتيب حسب",
    sort: { popular: "الأكثر شعبية", rating: "الأعلى تقييمًا", newest: "الأحدث", priceLow: "السعر: من الأقل", priceHigh: "السعر: من الأعلى" },
    levels: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" },
    resultsCount: (n) => `${n} كورس`,
    clearFilters: "مسح الفلاتر",
    by: "بواسطة",
    students: (n) => `${n.toLocaleString()} طالب`,
    noRatingYet: "لسه مفيش تقييمات",
    cta: "التفاصيل والتسجيل",
    loading: "جارِ التحميل",
    empty: "لسه مفيش كورسات متاحة — تابعنا قريبًا.",
    noMatch: "مفيش كورسات مطابقة لبحثك أو الفلاتر اللي اخترتها.",
    error: "تعذّر تحميل الكورسات، حاول تاني.",
  },
  es: {
    badge: "Lo Que Ofrecemos",
    headline: "Cursos diseñados para tu futuro",
    subheadline: "Explora todo lo disponible en nuestra plataforma ahora.",
    searchPlaceholder: "Buscar cursos, instructores, temas...",
    filterCategory: "Categoría",
    filterLevel: "Nivel",
    filterPrice: "Precio",
    allCategories: "Todas las categorías",
    allLevels: "Todos los niveles",
    allPrices: "Cualquier precio",
    free: "Gratis",
    paid: "De pago",
    sortLabel: "Ordenar por",
    sort: { popular: "Más popular", rating: "Mejor valorado", newest: "Más reciente", priceLow: "Precio: menor a mayor", priceHigh: "Precio: mayor a menor" },
    levels: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" },
    resultsCount: (n) => `${n} curso${n === 1 ? "" : "s"}`,
    clearFilters: "Borrar filtros",
    by: "Por",
    students: (n) => `${n.toLocaleString()} estudiantes`,
    noRatingYet: "Sin valoraciones aún",
    cta: "Ver Curso",
    loading: "Cargando",
    empty: "Aún no hay cursos disponibles — vuelve pronto.",
    noMatch: "Ningún curso coincide con tu búsqueda o filtros.",
    error: "No se pudieron cargar los cursos. Inténtalo de nuevo.",
  },
};

// ─── تطبيع كورس حقيقي (i18n-aware) لشكل موحّد يستخدمه العرض ───
function localizeCourse(c, language, t) {
  const i18nEntry = c.i18n?.[language] || c.i18n?.en || null;
  const categoryI18nEntry = c.categoryI18n?.[language] || c.categoryI18n?.en || null;

  return {
    id: c.id,
    title: i18nEntry?.title || c.title,
    shortDescription: i18nEntry?.shortDescription || c.shortDescription || c.description || "",
    thumbnail: c.thumbnail,
    categoryName: categoryI18nEntry?.name || c.categoryName || "",
    teacherName: c.teacherName || "",
    level: c.level,
    levelLabel: t.levels[c.level] || c.level,
    levelColor: LEVEL_COLORS[c.level] || "#1D6FD8",
    durationLabel:
      c.durationLabel ||
      (c.totalDurationSeconds > 0 ? formatSeconds(c.totalDurationSeconds) : ""),
    lessonsCount: c.totalLessonsCount || 0,
    studentsCount: c.studentsCount || 0,
    ratingAverage: c.ratingAverage || 0,
    ratingCount: c.ratingCount || 0,
    isFree: c.isFree,
    price: c.price || 0,
    currency: c.currency || "",
    createdAt: c.createdAt ? new Date(c.createdAt).getTime() : 0,
    searchBlob: [c.title, c.shortDescription, c.teacherName, categoryI18nEntry?.name || c.categoryName, ...(c.tags || [])]
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

function useAllCourses() {
  const [rawCourses, setRawCourses] = useState(undefined);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/courses?limit=50").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([coursesRes, categoriesRes]) => {
        if (cancelled) return;
        setRawCourses(Array.isArray(coursesRes?.courses) ? coursesRes.courses : []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      })
      .catch(() => {
        if (!cancelled) {
          setRawCourses([]);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rawCourses, categories, error };
}

/* ─── Icons ─── */
function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function ChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function StarIcon({ size = 13, filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth={1.5}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function Clock({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function Users({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
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

/* ─── Star rating display ─── */
function RatingStars({ rating, count, t }) {
  if (!count) {
    return <span className="text-[11px] text-gray-400">{t.noRatingYet}</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-bold text-amber-600">{rating.toFixed(1)}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon key={i} size={12} filled={i <= Math.round(rating)} />
        ))}
      </div>
      <span className="text-[11px] text-gray-400">({count.toLocaleString()})</span>
    </div>
  );
}

/* ─── Reusable dropdown (native select styled) ─── */
function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer bg-white border border-gray-200 rounded-lg pl-3 pr-8 rtl:pl-8 rtl:pr-3 py-2 text-xs sm:text-[13px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1D6FD8]/20 focus:border-[#1D6FD8] transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <ChevronDown size={13} />
      </span>
    </div>
  );
}

export default function CoursesPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const { rawCourses, error } = useAllCourses();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("popular");

  const localized = useMemo(() => {
    if (rawCourses === undefined) return null;
    return rawCourses.map((c) => localizeCourse(c, language, t));
  }, [rawCourses, language, t]);

  const categoryOptions = useMemo(() => {
    if (!localized) return [{ value: "all", label: t.allCategories }];
    const present = new Set(localized.map((c) => c.categoryName).filter(Boolean));
    return [{ value: "all", label: t.allCategories }, ...[...present].map((name) => ({ value: name, label: name }))];
  }, [localized, t]);

  const levelOptions = [
    { value: "all", label: t.allLevels },
    { value: "beginner", label: t.levels.beginner },
    { value: "intermediate", label: t.levels.intermediate },
    { value: "advanced", label: t.levels.advanced },
  ];

  const priceOptions = [
    { value: "all", label: t.allPrices },
    { value: "free", label: t.free },
    { value: "paid", label: t.paid },
  ];

  const sortOptions = [
    { value: "popular", label: t.sort.popular },
    { value: "rating", label: t.sort.rating },
    { value: "newest", label: t.sort.newest },
    { value: "priceLow", label: t.sort.priceLow },
    { value: "priceHigh", label: t.sort.priceHigh },
  ];

  const filtered = useMemo(() => {
    if (!localized) return [];
    const q = search.trim().toLowerCase();

    let list = localized.filter((c) => {
      if (q && !c.searchBlob.includes(q)) return false;
      if (category !== "all" && c.categoryName !== category) return false;
      if (level !== "all" && c.level !== level) return false;
      if (price === "free" && !c.isFree) return false;
      if (price === "paid" && c.isFree) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "rating":
          return b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount;
        case "newest":
          return b.createdAt - a.createdAt;
        case "priceLow":
          return (a.isFree ? 0 : a.price) - (b.isFree ? 0 : b.price);
        case "priceHigh":
          return (b.isFree ? 0 : b.price) - (a.isFree ? 0 : a.price);
        case "popular":
        default:
          return b.studentsCount - a.studentsCount;
      }
    });

    return list;
  }, [localized, search, category, level, price, sort]);

  const hasActiveFilters = search || category !== "all" || level !== "all" || price !== "all";

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setLevel("all");
    setPrice("all");
  }

  if (localized === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen bg-[#f7f7f8] text-[#0a0a0a] overflow-x-hidden"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
      >
        <HeroSearchSection t={t} search={search} setSearch={setSearch} />

        {localized.length > 0 && (
          <div className="sticky top-[60px] sm:top-[68px] z-40 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
              <FilterSelect value={category} onChange={setCategory} options={categoryOptions} />
              <FilterSelect value={level} onChange={setLevel} options={levelOptions} />
              <FilterSelect value={price} onChange={setPrice} options={priceOptions} />

              <span className="w-px h-6 bg-gray-200 shrink-0 mx-1" />

              <FilterSelect value={sort} onChange={setSort} options={sortOptions} />

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors px-2 py-1"
                >
                  <XIcon size={12} />
                  {t.clearFilters}
                </button>
              )}

              <span className="shrink-0 ms-auto text-[11px] sm:text-xs font-semibold text-gray-400 whitespace-nowrap">
                {t.resultsCount(filtered.length)}
              </span>
            </div>
          </div>
        )}

        {error && <div className="max-w-3xl mx-auto px-5 pt-8 text-center text-sm text-red-500">{t.error}</div>}

        {localized.length === 0 && !error ? (
          <div className="max-w-3xl mx-auto px-5 py-24 text-center text-gray-400 text-sm">{t.empty}</div>
        ) : filtered.length === 0 ? (
          <div className="max-w-3xl mx-auto px-5 py-24 text-center text-gray-400 text-sm">{t.noMatch}</div>
        ) : (
          <CoursesGrid courses={filtered} t={t} />
        )}
      </div>
    </>
  );
}

function HeroSearchSection({ t, search, setSearch }) {
  return (
    <section className="relative bg-gradient-to-br from-[#0a2a5e] via-[#123a7a] to-[#1D6FD8] overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-8 sm:pb-10">
        <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70 mb-3 animate-fadein">
          {t.badge}
        </span>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white max-w-2xl mb-3 leading-[1.15] animate-fadein-up">
          {t.headline}
        </h1>
        <p className="text-white/70 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed mb-7 sm:mb-8 animate-fadein-up2">
          {t.subheadline}
        </p>

        <div className="relative max-w-xl animate-fadein-up2">
          <span className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon size={18} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-white rounded-xl pl-11 pr-4 rtl:pl-4 rtl:pr-11 py-3.5 sm:py-4 text-sm text-gray-800 placeholder:text-gray-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/20"
          />
        </div>
      </div>
    </section>
  );
}

function CoursesGrid({ courses, t }) {
  return (
    <section className="py-8 sm:py-10 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} t={t} />
        ))}
      </div>
    </section>
  );
}

function CourseCard({ course, t }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
        <Image
          src={course.thumbnail || FALLBACK_IMAGE}
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

      <div className="flex flex-col gap-2 p-4 flex-1">
        {course.categoryName && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1D6FD8]">{course.categoryName}</span>
        )}

        <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.5em]">
          {course.title}
        </h3>

        {course.teacherName && (
          <p className="text-xs text-gray-400">
            {t.by} {course.teacherName}
          </p>
        )}

        <RatingStars rating={course.ratingAverage} count={course.ratingCount} t={t} />

        <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
          {course.durationLabel && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {course.durationLabel}
            </span>
          )}
          {course.studentsCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users size={11} />
              {t.students(course.studentsCount)}
            </span>
          )}
        </div>

        <div className="mt-auto pt-2.5 flex items-center justify-between">
          <span className="text-base font-black" style={{ color: course.isFree ? "#10b981" : "#0a0a0a" }}>
            {course.isFree || !course.price ? t.free : `${course.price} ${course.currency}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@400;700;800&display=swap');
  @keyframes fadein     { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadein-up  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadein      { animation: fadein    0.6s ease both; }
  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
`;