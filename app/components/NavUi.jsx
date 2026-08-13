"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { signOut } from "next-auth/react";

/* ─────────────────────────────────────────
  ICONS
───────────────────────────────────────── */
export function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
export function ArrowLeft({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
export function ChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
export function Globe({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}
export function MenuIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
export function XIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
export function EyeIcon({ size = 16, open = true }) {
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

// 🔒 SECURITY: أيقونة درع بسيطة تُستخدم في خطوة كود الـ MFA وواجهة الأدمن.
export function ShieldIcon({ size = 16, color = "#2563eb" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ─────────────────────────────────────────
   LANGUAGE DROPDOWN
───────────────────────────────────────── */
export function LangDropdown({ languages }) {
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
export function UserDropdown({ user }) {
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