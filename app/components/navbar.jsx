"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { signOut, useSession } from "next-auth/react";
import { ArrowRight, MenuIcon, XIcon, LangDropdown, UserDropdown } from "./NavUI";
import AuthModal from "./AuthModal";

/* ─────────────────────────────────────────
  FETCH HOOK
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

  if (pathname.startsWith("/admin")) return null;

  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

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
      return <UserDropdown user={session.user} />;
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
          <div className="flex items-center gap-3 py-3 px-2 border-b border-gray-100">
            <span className="w-8 h-8 rounded-full bg-[#C9A227] text-white text-sm font-bold flex items-center justify-center">
              {session.user?.name?.charAt(0)?.toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-bold text-[#0a0a0a]">{session.user?.name}</p>
              {session.user?.phone && (
                <p className="text-xs text-gray-400">{session.user.phone}</p>
              )}
            </div>
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