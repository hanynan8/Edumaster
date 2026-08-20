"use client";

/* ════════════════════════════════════════════════════════════════════
   app/page.jsx  —  HOME PAGE (LOGGED-IN USER)
   ------------------------------------------------------------------
   Only 2 sections, exactly as requested:
     1) Welcome section — replaces the Hero. Shows "Welcome back, {name}",
        email, phone (if the user has one), a read-only avatar, and a
        link to the Student page (labeled "Profile"). Nothing here is
        editable — editing still only happens on /student, exactly like
        today. Data comes from the SAME endpoint the Student page already
        uses: GET /api/profile (identical to app/student/page.jsx), so
        editing the profile from /student updates this section too.
     2) All courses — same fetch as /courses page
        (GET /api/courses?limit=50), reformatted as a grid.

   The Footer is already rendered globally by app/layout.jsx right after
   <main>, so it automatically appears under this page — nothing extra
   needed here.

   No extra component files were created — everything lives in this
   single file, as requested.
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─────────────────────────────────────────
   UI COPY (presentational only)
───────────────────────────────────────── */
const UI = {
  en: {
    welcomeBack: (name) => `Welcome back, ${name}!`,
    subtitleByRole: {
      student: "Great to see you again. Ready to keep learning?",
      teacher: "Great to see you again. Ready to manage your courses?",
      admin: "Great to see you again.",
    },
    profileLinkByRole: {
      student: "Profile",
      teacher: "Go to Dashboard",
      admin: "Go to Dashboard",
    },
    dashboardHrefByRole: { student: "/student", teacher: "/teacher", admin: "/admin" },
    noPhone: "",
    coursesLabel: "Keep Learning",
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
  },
  ar: {
    welcomeBack: (name) => `أهلاً بيك تاني، ${name}!`,
    subtitleByRole: {
      student: "سعداء برجوعك. جاهز تكمل تعلّمك؟",
      teacher: "سعداء برجوعك. جاهز تتابع كورساتك؟",
      admin: "سعداء برجوعك.",
    },
    profileLinkByRole: {
      student: "الملف الشخصي",
      teacher: "لوحة التحكم",
      admin: "لوحة التحكم",
    },
    dashboardHrefByRole: { student: "/student", teacher: "/teacher", admin: "/admin" },
    noPhone: "",
    coursesLabel: "كمّل تعلّمك",
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
  },
  es: {
    welcomeBack: (name) => `¡Bienvenido de nuevo, ${name}!`,
    subtitleByRole: {
      student: "Qué bueno verte otra vez. ¿Listo para seguir aprendiendo?",
      teacher: "Qué bueno verte otra vez. ¿Listo para gestionar tus cursos?",
      admin: "Qué bueno verte otra vez.",
    },
    profileLinkByRole: {
      student: "Perfil",
      teacher: "Ir al panel",
      admin: "Ir al panel",
    },
    dashboardHrefByRole: { student: "/student", teacher: "/teacher", admin: "/admin" },
    noPhone: "",
    coursesLabel: "Sigue Aprendiendo",
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
   FETCH HOOKS
───────────────────────────────────────── */

// same endpoint the Student page uses: GET /api/profile → { user: {...} }
function useProfile() {
  const [profileUser, setProfileUser] = useState(null);
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.user) setProfileUser(res.user);
      })
      .catch(console.error);
  }, []);
  return profileUser;
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

function localizeCourse(c, language, ui) {
  const i18nEntry = c.i18n?.[language] || c.i18n?.en || null;
  const categoryI18nEntry = c.categoryI18n?.[language] || c.categoryI18n?.en || null;
  return {
    id: c.id,
    title: i18nEntry?.title || c.title,
    thumbnail: c.thumbnail,
    categoryName: categoryI18nEntry?.name || c.categoryName || "",
    teacherName: c.teacherName || "",
    level: c.level,
    levelLabel: ui.levels[c.level] || c.level,
    levelColor: LEVEL_COLORS[c.level] || "#1D6FD8",
    studentsCount: c.studentsCount || 0,
    ratingAverage: c.ratingAverage || 0,
    ratingCount: c.ratingCount || 0,
    isFree: c.isFree,
    price: c.price || 0,
    currency: c.currency || "",
  };
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
   ROOT PAGE — LOGGED-IN HOME
═══════════════════════════════════════ */
export default function HomePageLoggedIn() {
  const { data: session, status } = useSession();
  const profileUser = useProfile();
  const rawCourses = useAllCourses();

  const { language: lang } = useLanguage();
  const ui = UI[lang] ?? UI.en;
  const isRTL = lang === "ar";

  // Fall back to next-auth session fields while /api/profile is loading,
  // so the welcome section can render instantly.
  const user = profileUser || (session?.user
    ? { name: session.user.name, email: session.user.email, phone: session.user.phone, avatar: session.user.avatar || session.user.image, role: session.user.role }
    : null);
  const role = user?.role || session?.user?.role || "student";

  if (status === "loading" && !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Loading</span>
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
        {/* 1) WELCOME SECTION — replaces the Hero */}
        <WelcomeSection user={user} role={role} ui={ui} isRTL={isRTL} />

        {/* 2) ALL COURSES */}
        <CoursesSection rawCourses={rawCourses} lang={lang} ui={ui} />
      </div>
      {/* Footer is already rendered globally by app/layout.jsx below <main> */}
    </>
  );
}

/* ═══════════════════════════════════════
   1) WELCOME SECTION (read-only — editing happens on /student)
═══════════════════════════════════════ */
function WelcomeSection({ user, role, ui, isRTL }) {
  const name = user?.name || "";
  const initial = name?.charAt(0)?.toUpperCase() || "U";
  const subtitle = ui.subtitleByRole[role] || ui.subtitleByRole.student;
  const profileLabel = ui.profileLinkByRole[role] || ui.profileLinkByRole.student;
  const dashboardHref = ui.dashboardHrefByRole[role] || "/student";

  return (
    <section className="relative overflow-hidden bg-[#1E3561]">
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 md:px-10 py-10 sm:py-16 md:py-20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          {/* Read-only avatar */}
          <div className="shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white/10"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#C9A227] text-white font-black flex items-center justify-center text-3xl sm:text-4xl ring-4 ring-white/10">
                {initial}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h1 className="font-black tracking-tight text-white text-2xl sm:text-3xl md:text-4xl leading-tight animate-fadein-up">
              {ui.welcomeBack(name)}
            </h1>
            <p className="text-gray-300 text-sm sm:text-base mt-2 animate-fadein-up2">{subtitle}</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 mt-4 text-gray-300 text-xs sm:text-sm">
              {user?.email && (
                <span className="inline-flex items-center gap-1.5">
                  <MailIcon size={14} /> {user.email}
                </span>
              )}
              {user?.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <PhoneIcon size={14} /> {user.phone}
                </span>
              )}
            </div>

            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 bg-[#C9A227] text-[#0a0a0a] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:opacity-90 transition-all mt-6"
            >
              {profileLabel}
              <ArrowIcon size={13} flip={isRTL} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   2) ALL COURSES — same fetch as /courses page
═══════════════════════════════════════ */
function CoursesSection({ rawCourses, lang, ui }) {
  const [ref, visible] = useReveal();

  const courses = useMemo(() => {
    if (!rawCourses) return null;
    return rawCourses.map((c) => localizeCourse(c, lang, ui));
  }, [rawCourses, lang, ui]);

  return (
    <section ref={ref} className="py-10 sm:py-20 md:py-28 bg-white">
      <div className="px-5 sm:px-10 md:px-16">
        <div
          className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-7 sm:mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            <Label text={ui.coursesLabel} visible={visible} />
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
            <ArrowIcon size={13} />
          </Link>
        </div>

        {courses === null && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400">{ui.coursesLoading}</span>
          </div>
        )}

        {courses?.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-16">{ui.coursesEmpty}</div>
        )}

        {courses?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {courses.map((course, i) => (
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
function ArrowIcon({ size = 16, color = "currentColor", flip = false }) {
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
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
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
function MailIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}
function PhoneIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
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

  * { box-sizing: border-box; }
  img { max-width: 100%; }
`;