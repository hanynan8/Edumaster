"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { signOut, useSession } from "next-auth/react";
import AuthModal from "./auth/authModel";
import NotificationBell from "./NotificationBell";

/* ═══════════════════════════════════════════════════════
   هذا الملف ناتج عن دمج navbar.jsx + NavUi.jsx في ملف واحد:
   - الأيقونات + LangDropdown + UserDropdown كانوا جزء من NavUi.jsx
   - باقي الملف (useNavbarData + Navbar) من navbar.jsx
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   ICONS  (كانت في NavUi.jsx)
───────────────────────────────────────── */
function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function ChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function Globe({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}
function MenuIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function XIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/* ─────────────────────────────────────────
   LANGUAGE DROPDOWN  (كان في NavUi.jsx)
───────────────────────────────────────── */
function LangDropdown({ languages }) {
  const { language, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#0a0a0a] border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-150"
      >
        <Globe size={13} />
        <span>{current.code.toUpperCase()}</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={12} />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-40 sm:w-44 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/8 overflow-hidden z-50 animate-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 ${
                lang.code === language
                  ? "bg-[#f7f7f7] text-[#0a0a0a] font-bold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#0a0a0a] font-medium"
              }`}
            >
              <span>{lang.label}</span>
              {lang.code === language && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   USER DROPDOWN  (كان في NavUi.jsx)
───────────────────────────────────────── */
function UserAvatar({ user, size = 28 }) {
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || "avatar"}
        className="rounded-full object-cover ring-1 ring-black/5 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full bg-[#C9A227] text-white font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

function UserDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // روابط لوحة الطالب متاحة لأي مستخدم مسجّل دخول (student/teacher/admin —
  // نفس منطق app/student/layout.jsx: مدرس أو أدمن ممكن يكونوا مسجلين في
  // كورس زي أي طالب عادي). روابط لوحة المدرس/الأدمن بتتضاف فوقها حسب الدور.
  const links = [
    { href: "/student", label: "كورساتي" },
    { href: "/student/grades", label: "درجاتي" },
    { href: "/student/certificates", label: "شهاداتي" },
    { href: "/student/payments", label: "مدفوعاتي" },
  ];
  if (user?.role === "teacher" || user?.role === "admin") {
    links.push({ href: "/teacher", label: "لوحة المدرس" });
  }
  if (user?.role === "admin") {
    links.push({ href: "/admin", label: "لوحة الأدمن" });
  }

  return (
    <div ref={ref} className="relative flex items-center">
      {/* 🆕 الصورة + الاسم + السهم بقوا كلهم جوه زرار واحد بس، دوسة واحدة
          عليه بتفتح/تقفل القائمة المنسدلة (زي أي دروب داون قياسي). رابط
          لوحة الطالب اتنقل جوه القائمة نفسها (أول عنصر فيها). */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open user menu"
        className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 pr-2 py-1.5 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
      >
        <UserAvatar user={user} size={28} />
        <span className="hidden sm:block text-sm font-semibold text-[#0a0a0a] max-w-[80px] truncate">
          {user?.name}
        </span>
        <span className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={12} />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 top-[calc(100%+8px)] w-52 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/8 overflow-hidden z-50 animate-dropdown">
          <Link
            href="/student"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <UserAvatar user={user} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0a0a0a] truncate">{user?.name}</p>
              {user?.phone ? (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{user.phone}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
              )}
            </div>
          </Link>
          <div className="py-1 border-b border-gray-100">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <button
            onClick={() => { signOut({ callbackUrl: "/" }); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#C9A227] hover:bg-amber-50 transition-colors font-medium border-t border-gray-100"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   FETCH HOOK  (كان في navbar.jsx)
───────────────────────────────────────── */
function useNavbarData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=navbar")
      .then((r) => r.json())
      .then((res) => {
        const doc = Array.isArray(res) ? res[0] : res;
        setData(doc);
      })
      .catch(console.error);
  }, []);
  return data;
}

/* ═══════════════════════════════════════
  NAVBAR COMPONENT
═══════════════════════════════════════ */
export default function Navbar() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const data = useNavbarData();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);

  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (pathname.startsWith("/admin")) return null;
  if (!data || !data.i18n) return null;

  const t = data.i18n[language] ?? data.i18n["en"];
  const isRTL = language === "ar";

  const openModal = (mode) => {
    setMenuOpen(false);
    setAuthModal(mode);
  };

  const AuthControls = () => {
    if (isLoading) {
      return <div className="w-20 sm:w-24 h-9 rounded-lg bg-gray-100 animate-pulse" />;
    }
    if (isLoggedIn) {
      return (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <NotificationBell />
          <UserDropdown user={session.user} />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openModal("login")}
          className="px-3 sm:px-4 py-2 text-sm font-bold text-[#0a0a0a] border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
        >
          Log in
        </button>
        <button
          onClick={() => openModal("register")}
          className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#C9A227] text-white text-sm font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-[#977a1d] active:scale-95 transition-all shadow-sm shadow-amber-900/20"
        >
          Sign up
          <ArrowRight size={13} />
        </button>
      </div>
    );
  };

  const MobileAuthControls = () => {
    if (isLoading) return null;
    if (isLoggedIn) {
      return (
        <>
          <div className="flex items-center justify-between gap-3 py-3 px-2 border-b border-gray-100">
            <Link
              href="/student"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 -m-1 p-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserAvatar user={session.user} size={32} />
              <div>
                <p className="text-sm font-bold text-[#0a0a0a]">{session.user?.name}</p>
                {session.user?.phone && (
                  <p className="text-xs text-gray-400">{session.user.phone}</p>
                )}
              </div>
            </Link>
            <NotificationBell />
          </div>
          <button
            onClick={() => { signOut({ callbackUrl: "/" }); setMenuOpen(false); }}
            className="w-full text-left py-3 px-2 text-base font-medium text-[#C9A227] hover:opacity-80 transition-opacity"
          >
            Sign out
          </button>
        </>
      );
    }
    return (
      <div className="flex gap-2 mt-3 pt-2">
        <button
          onClick={() => openModal("login")}
          className="flex-1 text-center py-3 text-sm font-bold border border-gray-200 rounded-lg text-[#0a0a0a] hover:bg-gray-50 transition-colors"
        >
          Log in
        </button>
        <button
          onClick={() => openModal("register")}
          className="flex-1 text-center py-3 text-sm font-bold bg-[#C9A227] text-white rounded-lg hover:bg-[#977a1d] transition-colors"
        >
          Sign up
        </button>
      </div>
    );
  };

  return (
    <>
      <style>{NAV_STYLES}</style>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
        />
      )}
      <nav
        dir={isRTL ? "rtl" : "ltr"}
        className="sticky top-0 z-50 bg-white border-b border-gray-100"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
      >
        {/* Navbar bar — px-5 on mobile, px-16 on desktop */}
        <div className="mx-auto px-5 sm:px-8 md:px-16 h-[60px] sm:h-[68px] flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity">
            {data.logoHref && (
              <img
                src={data.logoHref}
                alt={t.brand}
                className="h-12 w-12 sm:h-14 sm:w-14 md:h-14 md:w-14 object-cover rounded-full ring-2 ring-[#C9A227]/30"
              />
            )}
            <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-[#C9A227]">
              {t.brand}
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {data.links
              .filter((_, i) => i !== 4 && i !== 5)
              .map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="relative px-3 py-2 text-lg font-medium text-gray-500 hover:text-[#0a0a0a] transition-colors tracking-wide group"
                >
                  {t.links[link.id]}
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#C9A227] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
                </Link>
              ))}
          </div>

          {/* Desktop right controls */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <LangDropdown languages={data.languages} />
            <AuthControls />
          </div>

          {/* Mobile right controls */}
          <div className="lg:hidden flex items-center gap-2">
            <LangDropdown languages={data.languages} />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        }`}>
          <div className="bg-white border-t border-gray-100 px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-1">
            {data.links
              .filter((_, i) => i !== 4 && i !== 5)
              .map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between py-3 px-2 text-base font-medium text-gray-700 hover:text-[#C9A227] border-b border-gray-50 last:border-0 transition-colors group"
                >
                  {t.links[link.id]}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={13} />
                  </span>
                </Link>
              ))}
            <MobileAuthControls />
          </div>
        </div>
      </nav>
    </>
  );
}

const NAV_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=Tajawal:wght@400;700;800&display=swap');

  @keyframes dropdown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-dropdown { animation: dropdown 0.18s ease both; }

  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .modal-card { animation: modal-in 0.22s cubic-bezier(0.34,1.4,0.64,1) both; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .animate-spin { animation: spin 0.7s linear infinite; }

  /* xs breakpoint for flag visibility */
  @media (min-width: 480px) {
    .xs\\:inline { display: inline; }
  }
`;