// ═══════════════════════════════════════════════
//  courses.jsx — مصدرين، قايمة واحدة، نفس الشكل بالظبط:
//   1) كورسات الأدمن  → GET /api/data?collection=courses (بيتعدّلوا من لوحة
//      الأدمن — محرر المحتوى الحالي، زي ما هو).
//   2) كورسات المدرس  → GET /api/courses (بيتعدّلوا من لوحة المدرس، وده
//      كورس حقيقي بدروس وتسجيل ودفع).
//  الاتنين بيتحوّلوا لنفس الشكل (normalize) وبيتعرضوا مع بعض هنا بنفس
//  الكارت بالظبط، وبيودّوا لنفس صفحة التفاصيل /courses/[id] — اللي
//  بتفرّق داخليًا حسب الـ id (admin- prefix ولا id حقيقي من MongoDB).
// ═══════════════════════════════════════════════
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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

const ACCENT_PALETTE = ["#1D6FD8", "#a855f7", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

const STRINGS = {
  en: {
    badge: "What We Offer",
    headline: "Courses Built for\nYour Future",
    subheadline: "Browse everything available on our platform right now.",
    filterAll: "All Courses",
    who: "Requirements",
    outcomes: "What you'll learn",
    cta: "View Course",
    free: "Free",
    lessons: (n) => `${n} lessons`,
    students: (n) => `${n} students`,
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    loading: "Loading",
    empty: "No courses available yet — check back soon.",
    error: "Couldn't load courses. Please try again.",
  },
  ar: {
    badge: "كورساتنا",
    headline: "كورسات مصمّمة\nلمستقبلك",
    subheadline: "تصفّح كل الكورسات المتاحة على المنصة دلوقتي.",
    filterAll: "كل الكورسات",
    who: "المتطلبات",
    outcomes: "هتتعلم إيه",
    cta: "التفاصيل والتسجيل",
    free: "مجاني",
    lessons: (n) => `${n} درس`,
    students: (n) => `${n} طالب`,
    levels: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" },
    loading: "جارِ التحميل",
    empty: "لسه مفيش كورسات متاحة — تابعنا قريبًا.",
    error: "تعذّر تحميل الكورسات، حاول تاني.",
  },
  es: {
    badge: "Lo Que Ofrecemos",
    headline: "Cursos diseñados\npara tu futuro",
    subheadline: "Explora todo lo disponible en nuestra plataforma ahora.",
    filterAll: "Todos los Cursos",
    who: "Requisitos",
    outcomes: "Lo que aprenderás",
    cta: "Ver Curso",
    free: "Gratis",
    lessons: (n) => `${n} lecciones`,
    students: (n) => `${n} estudiantes`,
    levels: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" },
    loading: "Cargando",
    empty: "Aún no hay cursos disponibles — vuelve pronto.",
    error: "No se pudieron cargar los cursos. Inténtalo de nuevo.",
  },
};

// ─── تطبيع كورسات الأدمن (المحتوى الثابت) لنفس شكل كورسات المدرس ───
function normalizeAdminCourses(contentDoc, language) {
  if (!contentDoc?.courses) return [];
  const t = contentDoc.i18n?.[language] ?? contentDoc.i18n?.en;
  if (!t) return [];
  return contentDoc.courses.map((raw) => {
    const i18nCourse = t.courses?.[raw.id] || {};
    return {
      id: `admin-${raw.id}`,
      title: i18nCourse.title || raw.id,
      shortDescription: i18nCourse.desc || "",
      thumbnail: raw.image || null,
      categoryName: i18nCourse.category || "",
      levelLabel: raw.level || "",
      levelColor: raw.levelColor || "#1D6FD8",
      durationLabel: raw.duration || "",
      requirements: i18nCourse.whoIsThisFor || [],
      outcomes: i18nCourse.outcomes || [],
      studentsCount: 0,
      isFree: null, // مفيش سعر لكورسات الأدمن أصلاً — بادچ السعر بيتخفي ليها
      accent: raw.color || "#1D6FD8",
      source: "admin",
    };
  });
}

// ─── تطبيع كورسات المدرس (الحقيقية من الداتابيز) لنفس الشكل ───
function normalizeTeacherCourses(apiCourses, t, index0 = 0) {
  return (apiCourses || []).map((c, i) => ({
    id: c.id,
    title: c.title,
    shortDescription: c.shortDescription || c.description || "",
    thumbnail: c.thumbnail,
    categoryName: c.categoryName || "",
    levelLabel: t.levels[c.level] || c.level,
    levelColor: LEVEL_COLORS[c.level] || "#1D6FD8",
    durationLabel:
      c.totalDurationSeconds > 0
        ? formatSeconds(c.totalDurationSeconds)
        : t.lessons(c.totalLessonsCount || 0),
    requirements: c.requirements || [],
    outcomes: c.outcomes || [],
    studentsCount: c.studentsCount || 0,
    isFree: c.isFree,
    price: c.price,
    currency: c.currency,
    accent: ACCENT_PALETTE[(index0 + i) % ACCENT_PALETTE.length],
    source: "teacher",
  }));
}

function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function useAllCourses(language) {
  const [adminDoc, setAdminDoc] = useState(undefined); // undefined = لسه بيحمّل
  const [teacherCourses, setTeacherCourses] = useState(undefined);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/data?collection=courses").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/courses?limit=50").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([dataRes, coursesRes, categoriesRes]) => {
        if (cancelled) return;
        setAdminDoc(Array.isArray(dataRes) ? dataRes[0] : dataRes);
        setTeacherCourses(Array.isArray(coursesRes?.courses) ? coursesRes.courses : []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      })
      .catch(() => {
        if (!cancelled) {
          setAdminDoc(null);
          setTeacherCourses([]);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { adminDoc, teacherCourses, categories, error };
}

function useReveal(threshold = 0.08) {
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

function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function Check({ size = 11, color = "#1D6FD8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
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
function Award({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
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
function Target({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export default function CoursesPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const { adminDoc, teacherCourses, categories, error } = useAllCourses(language);
  const [activeFilter, setActiveFilter] = useState("all");

  const merged = useMemo(() => {
    if (adminDoc === undefined || teacherCourses === undefined) return null; // لسه بيحمّل
    const admin = normalizeAdminCourses(adminDoc, language);
    const teacher = normalizeTeacherCourses(teacherCourses, t, admin.length);
    return [...admin, ...teacher];
  }, [adminDoc, teacherCourses, language, t]);

  const filterKeys = useMemo(() => {
    if (!merged) return ["all"];
    const present = new Set(merged.map((c) => c.categoryName).filter(Boolean));
    const fromCategories = categories.map((c) => c.name).filter((n) => present.has(n));
    const extra = [...present].filter((n) => !fromCategories.includes(n));
    return ["all", ...fromCategories, ...extra];
  }, [merged, categories]);

  const filtered = !merged
    ? []
    : activeFilter === "all"
    ? merged
    : merged.filter((c) => c.categoryName === activeFilter);

  if (merged === null) {
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
        className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
      >
        <HeroSection t={t} />
        {merged.length > 0 && (
          <FilterBar filterKeys={filterKeys} t={t} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        )}
        {error && <div className="max-w-3xl mx-auto px-5 pt-8 text-center text-sm text-red-500">{t.error}</div>}
        {merged.length === 0 && !error ? (
          <div className="max-w-3xl mx-auto px-5 py-24 text-center text-gray-400 text-sm">{t.empty}</div>
        ) : (
          <CoursesList courses={filtered} t={t} />
        )}
      </div>
    </>
  );
}

function HeroSection({ t }) {
  return (
    <section className="relative h-[40vh] sm:h-[46vh] md:h-[52vh] overflow-hidden bg-[#f4f4f4]">
      <div className="absolute inset-0 z-0">
        <Image src={FALLBACK_IMAGE} alt="courses hero" fill className="object-cover object-center" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-24 sm:h-32 md:h-40 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-10 w-full h-full items-start px-5 sm:px-8 md:px-6 pt-10 sm:pt-16 md:pt-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter max-w-2xl mb-2 sm:mb-4 animate-fadein-up leading-[1.15] sm:leading-[1.05] whitespace-pre-line">
            {t.headline}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed animate-fadein-up2">{t.subheadline}</p>
        </div>
      </div>
    </section>
  );
}

function FilterBar({ filterKeys, t, activeFilter, setActiveFilter }) {
  return (
    <div className="sticky top-[60px] sm:top-[68px] z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {filterKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 ${
              activeFilter === key ? "bg-[#1D6FD8] text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {key === "all" ? t.filterAll : key}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoursesList({ courses, t }) {
  return (
    <section className="py-14 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-0">
        {courses.map((course, i) => (
          <CourseRow key={course.id} course={course} index={i} t={t} />
        ))}
      </div>
    </section>
  );
}

function CourseRow({ course, index, t }) {
  const [ref, visible] = useReveal(0.06);
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-0 items-stretch border-b border-gray-100 last:border-0">
      {/* الصورة */}
      <div
        className={`relative overflow-hidden min-h-[220px] sm:min-h-[300px] lg:min-h-[520px] order-1 ${
          isEven ? "lg:order-1" : "lg:order-2"
        } transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <Image
          src={course.thumbnail || FALLBACK_IMAGE}
          alt={course.title}
          fill
          className="object-cover hover:scale-105 transition-transform duration-700"
          unoptimized
        />
        <div className="absolute top-0 inset-x-0 h-[4px]" style={{ background: course.accent }} />
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/70 to-transparent flex items-end gap-2 sm:gap-3 flex-wrap">
          {course.durationLabel && (
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <Clock size={11} />
              {course.durationLabel}
            </span>
          )}
          {course.levelLabel && (
            <span
              className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: course.levelColor + "cc" }}
            >
              <Award size={11} />
              {course.levelLabel}
            </span>
          )}
          {course.studentsCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <Users size={11} />
              {t.students(course.studentsCount)}
            </span>
          )}
        </div>
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <span className="text-white font-black text-sm sm:text-base leading-none">{String(index + 1).padStart(2, "0")}</span>
        </div>
      </div>

      {/* المحتوى */}
      <div
        className={`flex flex-col justify-center px-5 sm:px-8 md:px-10 py-8 sm:py-12 lg:py-20 gap-5 sm:gap-6 lg:gap-8 order-2 ${
          isEven ? "lg:order-2 bg-white" : "lg:order-1 bg-[#f7f7f7]"
        } transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div>
          {course.categoryName && (
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 inline-block" style={{ color: course.accent }}>
              {course.categoryName}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-2 sm:mb-3">{course.title}</h2>
          <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed">{course.shortDescription}</p>
        </div>

        {course.requirements?.length > 0 && (
          <InfoBlock icon={<Users size={13} />} title={t.who} color={course.accent}>
            <ul className="flex flex-col gap-2 mt-2">
              {course.requirements.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-white">
                    <Check size={18} color={course.accent} />
                  </span>
                  <span className="text-gray-600 text-xs sm:text-sm leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </InfoBlock>
        )}

        {course.outcomes?.length > 0 && (
          <InfoBlock icon={<Target size={13} />} title={t.outcomes} color={course.accent}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {course.outcomes.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                    <Check size={20} color={course.accent} />
                  </span>
                  <span className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </InfoBlock>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href={`/courses/${course.id}`}
            className="inline-flex items-center gap-2 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg text-sm text-white transition-all active:scale-95 shadow-sm hover:opacity-90"
            style={{ background: course.accent }}
          >
            {t.cta} <ArrowRight size={13} />
          </Link>
          {course.isFree !== null && (
            <span className="text-sm font-bold" style={{ color: course.isFree ? "#10b981" : "#0a0a0a" }}>
              {course.isFree || !course.price ? t.free : `${course.price} ${course.currency || ""}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, title, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
      </div>
      {children}
    </div>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@400;700;800&display=swap');
  @keyframes fadein     { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadein-up  { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadein      { animation: fadein    0.6s ease both; }
  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;