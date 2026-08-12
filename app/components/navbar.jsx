"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { signIn, signOut, useSession } from "next-auth/react";

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

/* ─────────────────────────────────────────
  ICONS
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
function EyeIcon({ size = 16, open = true }) {
  return open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ─────────────────────────────────────────
   LANGUAGE DROPDOWN
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
   USER DROPDOWN
───────────────────────────────────────── */
function UserDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

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
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-150"
      >
        <span className="w-7 h-7 rounded-full bg-[#C9A227] text-white text-xs font-bold flex items-center justify-center">
          {initial}
        </span>
        <span className="hidden sm:block text-sm font-semibold text-[#0a0a0a] max-w-[80px] truncate">
          {user?.name}
        </span>
        <span className={`transition-transform duration-200 text-gray-400 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={12} />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/8 overflow-hidden z-50 animate-dropdown">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-[#0a0a0a] truncate">{user?.name}</p>
            {user?.phone && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{user.phone}</p>
            )}
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
   AUTH i18n STRINGS
───────────────────────────────────────── */
const AUTH_I18N = {
  ar: {
    font: "'Tajawal', sans-serif",
    dir: "rtl",
    login: {
      title: "أهلاً بعودتك",
      subtitle: "سجّل دخولك للمتابعة",
      identifier: "الاسم أو الإيميل",
      identifierPlaceholder: "ادخل اسمك أو إيميلك",
      password: "كلمة المرور",
      submit: "تسجيل الدخول",
      switchText: "مش عندك حساب؟",
      switchCta: "سجّل دلوقتي",
      errEmpty: "من فضلك ادخل جميع البيانات",
      errWrong: "الاسم أو الباسورد غلط",
    },
    register: {
      title: "إنشاء حساب",
      subtitle: "ادخل بياناتك لإنشاء حساب جديد",
      name: "الاسم الكامل",
      namePlaceholder: "الاسم الكامل",
      email: "الإيميل",
      password: "كلمة المرور",
      submit: "إنشاء الحساب",
      switchText: "عندك حساب بالفعل؟",
      switchCta: "سجّل دخولك",
      errEmpty: "من فضلك ادخل جميع البيانات",
      errFail: "حصل خطأ، حاول تاني",
      errRegistered: "تم التسجيل، حاول تسجيل الدخول",
      errNameTaken: "الاسم ده موجود بالفعل، جرب اسم تاني",
      errEmailTaken: "الإيميل ده مسجل بالفعل، جرب تسجيل الدخول",
    },
  },
  en: {
    font: "'DM Sans', sans-serif",
    dir: "ltr",
    login: {
      title: "Welcome back",
      subtitle: "Sign in to continue",
      identifier: "Name or Email",
      identifierPlaceholder: "Enter your name or email",
      password: "Password",
      submit: "Sign in",
      switchText: "Don't have an account?",
      switchCta: "Sign up",
      errEmpty: "Please fill in all fields",
      errWrong: "Incorrect name or password",
      errNameTaken: "This name is already taken",
      errEmailTaken: "This email is already registered",
    },
    register: {
      title: "Create account",
      subtitle: "Enter your details to get started",
      name: "Full Name",
      namePlaceholder: "Your full name",
      email: "Email",
      password: "Password",
      submit: "Create account",
      switchText: "Already have an account?",
      switchCta: "Sign in",
      errEmpty: "Please fill in all fields",
      errFail: "Something went wrong, try again",
      errRegistered: "Registered! Please sign in",
      errNameTaken: "This name is already taken",
      errEmailTaken: "This email is already registered",
    },
  },
  es: {
    font: "'DM Sans', sans-serif",
    dir: "ltr",
    errNameTaken: "Este nombre ya está en uso",
    errEmailTaken: "Este correo ya está registrado",
    login: {
      title: "Bienvenido de nuevo",
      subtitle: "Inicia sesión para continuar",
      identifier: "Nombre o correo",
      identifierPlaceholder: "Tu nombre o correo electrónico",
      password: "Contraseña",
      submit: "Iniciar sesión",
      switchText: "¿No tienes cuenta?",
      switchCta: "Regístrate",
      errEmpty: "Por favor completa todos los campos",
      errWrong: "Nombre o contraseña incorrectos",
    },
    register: {
      title: "Crear cuenta",
      subtitle: "Ingresa tus datos para comenzar",
      name: "Nombre completo",
      namePlaceholder: "Tu nombre completo",
      email: "Correo electrónico",
      password: "Contraseña",
      submit: "Crear cuenta",
      switchText: "¿Ya tienes cuenta?",
      switchCta: "Inicia sesión",
      errEmpty: "Por favor completa todos los campos",
      errFail: "Algo salió mal, inténtalo de nuevo",
      errRegistered: "Registrado. Por favor inicia sesión",
      errNameTaken: "Este nombre ya está en uso",
      errEmailTaken: "Este correo ya está registrado",
    },
  },
};

/* ─────────────────────────────────────────
   AUTH MODAL
───────────────────────────────────────── */
function AuthModal({ mode, onClose, onSwitch }) {
  const { language, isRTL } = useLanguage();
  const [form, setForm] = useState({ nameOrEmail: "", name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);

  const i18n = AUTH_I18N[language] ?? AUTH_I18N["en"];
  const isLogin = mode === "login";
  const tx = isLogin ? i18n.login : i18n.register;

  useEffect(() => { setError(""); }, [language, mode]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.nameOrEmail || !form.password) { setError(tx.errEmpty); return; }
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      nameOrEmail: form.nameOrEmail,
      password: form.password,
    });
    setLoading(false);
    if (res?.error) setError(tx.errWrong);
    else onClose();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError(tx.errEmpty); return; }
    setLoading(true);
    try {
      // ✅ التسجيل والتحقق من التكرار بيحصلوا دلوقتي بالكامل على السيرفر
      // (/api/register) — المتصفح مايشوفش أي باسورد لمستخدمين تانيين خالص.
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        if (data.error === "name_taken")  { setError(tx.errNameTaken);  return; }
        if (data.error === "email_taken") { setError(tx.errEmailTaken); return; }
        setError(tx.errFail);
        return;
      }

      const signInRes = await signIn("credentials", {
        redirect: false,
        nameOrEmail: form.email,
        password: form.password,
      });
      setLoading(false);
      if (signInRes?.error) { setError(tx.errRegistered); onSwitch("login"); }
      else onClose();
    } catch {
      setLoading(false);
      setError(tx.errFail);
    }
  };

  const eyePositionClass = isRTL ? "left-3" : "right-3";
  const passwordPaddingClass = isRTL ? "pl-11" : "pr-11";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(10,10,10,0.55)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="modal-card relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        dir={i18n.dir}
        style={{ fontFamily: i18n.font }}
      >
        <div className="h-1 w-full bg-[#C9A227]" />

        <button
          onClick={onClose}
          className="absolute top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10"
          style={{ right: isRTL ? "auto" : "1rem", left: isRTL ? "1rem" : "auto" }}
        >
          <XIcon size={16} />
        </button>

        {/* Modal padding: smaller on mobile */}
        <div className="px-5 sm:px-8 pt-7 sm:pt-8 pb-8 sm:pb-10">
          <div className="mb-6 sm:mb-7">
            <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] tracking-tight">
              {tx.title}<span className="text-[#C9A227]">.</span>
            </h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">{tx.subtitle}</p>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="flex flex-col gap-4">

            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {i18n.register.name}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder={i18n.register.namePlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {isLogin ? i18n.login.identifier : i18n.register.email}
              </label>
              <input
                type={isLogin ? "text" : "email"}
                value={isLogin ? form.nameOrEmail : form.email}
                onChange={handleChange(isLogin ? "nameOrEmail" : "email")}
                placeholder={isLogin ? i18n.login.identifierPlaceholder : "example@email.com"}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all"
                dir={isLogin && isRTL ? "rtl" : "ltr"}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {tx.password}
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 ${passwordPaddingClass} rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all`}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className={`absolute ${eyePositionClass} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors`}
                >
                  <EyeIcon size={16} open={showPass} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth={2.5} strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-xs font-semibold text-[#C9A227]">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-3.5 bg-[#C9A227] text-white text-sm font-bold rounded-xl hover:bg-[#977a1d] active:scale-[0.98] transition-all shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25} />
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
              ) : (
                <>
                  {tx.submit}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-5 sm:mt-6 font-medium">
            {tx.switchText}{" "}
            <button
              onClick={() => onSwitch(isLogin ? "register" : "login")}
              className="text-[#C9A227] font-bold hover:underline transition-all"
            >
              {tx.switchCta}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
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

  if (!data) return null;

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