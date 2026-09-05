"use client";

/* ════════════════════════════════════════════════════════════════════
   components/CoursesSection.jsx
   ------------------------------------------------------------------
   Shared "All Courses" section, extracted from both home pages
   (logged-in and guest). Fetches the exact same endpoint the
   /courses page uses: GET /api/courses?limit=50, and reformats it
   as a 4-per-row grid with search + filters.

   Props:
     - lang            (string)  current language ("en" | "ar" | "es")
     - ui               (object) translation strings — must contain:
         coursesTitle, coursesSubtitle, coursesEmpty, coursesLoading,
         coursesCta, by, free, students, noRatingYet, levels,
         searchPlaceholder, allCategories, allLevels, allPrices,
         paid, clearFilters, noMatch
         (coursesLabel is optional — only used if showLabel is true)
     - showLabel        (bool, optional) render the small eyebrow
                         label above the title (uses ui.coursesLabel)
     - bgClassName       (string, optional) section background,
                         default "bg-white"
     - paddingClassName  (string, optional) section vertical padding,
                         default "py-8 sm:py-14 md:py-20"
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPriceForCurrency } from "@/app/lib/currency";
import { buildClassMarkerTestUrl } from "@/app/lib/classMarker";
import LoadingScreen from "./LoadingScreen";

// 🆕 زرار "اختبر مستواك" في كارت الكورس على الصفحة الرئيسية — نص بسيط
// حسب اللغة (مش جوه ui المُمرّرة من الصفحة الأب عشان منضطرش نعدّل كل
// الصفحات اللي بتستخدم CoursesSection).
const LEVEL_TEST_BTN_LABEL = {
  en: "Test Your Level",
  ar: "اختبر مستواك",
  es: "Evalúa tu nivel",
};

const LEVEL_COLORS = {
  beginner: "#10b981",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

const FALLBACK_COURSE_IMAGE =
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&q=80";

/* same as /courses page: GET /api/courses?limit=50 */
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
    categorySlug: c.categorySlug || "",
    classMarkerQuizId: c.classMarkerQuizId || "",
    teacherName: c.teacherName || "",
    level: c.level,
    levelLabel: ui.levels[c.level] || c.level,
    levelColor: LEVEL_COLORS[c.level] || "#003A91",
    durationLabel: c.durationLabel || (c.totalDurationSeconds > 0 ? formatSeconds(c.totalDurationSeconds) : ""),
    studentsCount: c.studentsCount || 0,
    ratingAverage: c.ratingAverage || 0,
    ratingCount: c.ratingCount || 0,
    isFree: c.isFree,
    price: getPriceForCurrency(c.prices, language).amount,
    currency: getPriceForCurrency(c.prices, language).currency,
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

/* scroll reveal hook */
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
   MAIN EXPORT
═══════════════════════════════════════ */
export default function CoursesSection({
  lang,
  ui,
  showLabel = false,
  bgClassName = "bg-white",
  paddingClassName = "py-8 sm:py-14 md:py-20",
}) {
  const rawCourses = useAllCourses();
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
    <section ref={ref} className={`${paddingClassName} ${bgClassName}`}>
      <div className="px-5 sm:px-10 md:px-16">
        <div
          className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-7 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            {showLabel && ui.coursesLabel && <Label text={ui.coursesLabel} visible={visible} />}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
              {ui.coursesTitle}
            </h2>
            <p className="text-gray-500 text-sm mt-2 max-w-md">{ui.coursesSubtitle}</p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 border-2 border-[#0a0a0a] text-[#0a0a0a] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#0a0a0a] hover:text-white transition-all shrink-0 self-start sm:self-auto w-fit"
          >
            {ui.coursesCta}
            <ArrowIcon size={13} />
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
          <LoadingScreen compact />
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
              <CourseCard key={course.id} course={course} ui={ui} lang={lang} visible={visible} delay={i * 50} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CourseCard({ course, ui, lang, visible, delay }) {
  // 🆕 نفس فكرة زرار "اختبر مستواك" في /courses، بس هنا (كارت الصفحة
  // الرئيسية): بيظهر لو الكورس عنده classMarkerQuizId، وبيفتح رابط
  // ClassMarker في تاب جديد من غير ما يودّي لصفحة تفاصيل الكورس.
  const showLevelTestBtn = Boolean(course.classMarkerQuizId);
  const levelTestLabel = LEVEL_TEST_BTN_LABEL[lang] || LEVEL_TEST_BTN_LABEL.en;

  function handleLevelTestClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const url = buildClassMarkerTestUrl(course.classMarkerQuizId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

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
        <h3 className="font-semibold text-[#0a0a0a] text-sm leading-snug line-clamp-2 min-h-[2.4em] group-hover:text-[#C9A227] transition-colors duration-150">
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

        {showLevelTestBtn && (
          <button
            type="button"
            onClick={handleLevelTestClick}
            className="inline-flex items-center justify-center gap-1.5 mt-1 border border-[#C9A227]/40 text-[#8a6d10] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#C9A227] hover:text-white hover:border-[#C9A227] transition-colors"
          >
            <GraduationCapIcon size={13} />
            {levelTestLabel}
          </button>
        )}

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

/* ─────────────────────────────────────────
   SHARED UI BITS (local to this component)
───────────────────────────────────────── */
function Label({ text, visible }) {
  return (
    <div className={`flex items-center gap-2 mb-3 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="w-4 sm:w-5 h-px bg-[#C9A227]" />
      <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[#C9A227]">{text}</span>
    </div>
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

/* icons */
function ArrowIcon({ size = 16, color = "currentColor" }) {
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
function GraduationCapIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
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