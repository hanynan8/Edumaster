"use client";

/* ════════════════════════════════════════════════════════════════════
   app/page.jsx  —  HOME PAGE (LOGGED-IN USER)
   ------------------------------------------------------------------
   Sections (top → bottom), same order as the guest home page:
     1) Welcome section — replaces the Hero. Shows "Welcome back, {name}",
        email, phone (if the user has one), a read-only avatar, and a
        link to the Student page (labeled "Profile"). Nothing here is
        editable — editing still only happens on /student, exactly like
        today. Data comes from the SAME endpoint the Student page already
        uses: GET /api/profile (identical to app/student/page.jsx), so
        editing the profile from /student updates this section too.
     2) Services — shared <ServicesSection /> component
        (components/ServicesSection.jsx), same source as /services page
        (GET /api/data?collection=services).
     3) All courses — shared <CoursesSection /> component
        (components/CoursesSection.jsx), same fetch as /courses page
        (GET /api/courses?limit=50).
     4) Membership (preview) — shared <MembershipSection /> component
        (components/MembershipSection.jsx), same source as /membership
        page (GET /api/membership-plans).

   Services, Courses and Membership are shared with the guest home page,
   so all three now live in components/ServicesSection.jsx,
   components/CoursesSection.jsx and components/MembershipSection.jsx —
   imported below instead of being duplicated inline.

   The Footer is already rendered globally by app/layout.jsx right after
   <main>, so it automatically appears under this page — nothing extra
   needed here.
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import CoursesSection from "../components/CoursesSection";
import MembershipSection from "../components/MembershipSection";
import ServicesSection from "../components/ServicesSection";
import LoadingScreen from "../components/LoadingScreen";
import SuccessStoriesSection from "../components/SuccessStoriesSection";
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
    servicesTitle: "How We Help You Study Abroad",
    servicesCta: "View All Services",
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
    searchPlaceholder: "Search courses, instructors, topics...",
    allCategories: "All Categories",
    allLevels: "All Levels",
    allPrices: "Any Price",
    paid: "Paid",
    clearFilters: "Clear filters",
    noMatch: "No courses match your search or filters.",
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
    servicesTitle: "إزاي بنساعدك تدرس بره",
    servicesCta: "شوف كل خدماتنا",
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
    searchPlaceholder: "ابحث عن كورس، مدرس، أو موضوع...",
    allCategories: "كل التصنيفات",
    allLevels: "كل المستويات",
    allPrices: "أي سعر",
    paid: "مدفوع",
    clearFilters: "مسح الفلاتر",
    noMatch: "مفيش كورسات مطابقة لبحثك أو الفلاتر اللي اخترتها.",
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
    servicesTitle: "Cómo Te Ayudamos a Estudiar Fuera",
    servicesCta: "Ver Todos los Servicios",
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
    searchPlaceholder: "Buscar cursos, instructores, temas...",
    allCategories: "Todas las categorías",
    allLevels: "Todos los niveles",
    allPrices: "Cualquier precio",
    paid: "De pago",
    clearFilters: "Borrar filtros",
    noMatch: "Ningún curso coincide con tu búsqueda o filtros.",
  },
};

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

/* ═══════════════════════════════════════
   ROOT PAGE — LOGGED-IN HOME
═══════════════════════════════════════ */
export default function HomePageLoggedIn() {
  const { data: session, status } = useSession();
  const profileUser = useProfile();

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
      <LoadingScreen dir={isRTL ? "rtl" : "ltr"} />
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
      >
        {/* 1) WELCOME SECTION — replaces the Hero */}
        <WelcomeSection user={user} role={role} ui={ui} isRTL={isRTL} />

        {/* 2) SERVICES — shared component, same source as /services */}
        <ServicesSection lang={lang} ui={ui} />

        {/* 3) ALL COURSES — shared component */}
        <CoursesSection
          lang={lang}
          ui={ui}
          showLabel
          bgClassName="bg-white"
          paddingClassName="py-10 sm:py-20 md:py-28"
        />

        <SuccessStoriesSection lang={lang} bgClassName="bg-[#f7f7f7]" paddingClassName="py-10 sm:py-20 md:py-28" />
        {/* 3.5) SUCCESS STORIES — 4 videos, "View More" → /success-stories */}

        {/* 4) MEMBERSHIP — shared component, same source as /membership */}
        {/* <MembershipSection /> */}
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
            <h1 className="font-semibold tracking-tight text-white text-2xl sm:text-3xl md:text-4xl leading-tight animate-fadein-up">
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

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  * { box-sizing: border-box; }
  img { max-width: 100%; }
`;