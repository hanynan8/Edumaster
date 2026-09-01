"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─────────────────────────────────────────
   FETCH HOOK
───────────────────────────────────────── */
function useFooterData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=footer")
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
function ArrowRight({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function Mail({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}
function Phone({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
    </svg>
  );
}
function MapPin({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function SocialIcon({ name, size = 16 }) {
  if (name === "facebook") return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>;
  if (name === "instagram") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
  if (name === "twitter") return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
  if (name === "linkedin") return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>;
  if (name === "youtube") return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg>;
  if (name === "tiktok") return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" /></svg>;
  return null;
}

/* ─────────────────────────────────────────
   NEWSLETTER FORM
───────────────────────────────────────── */
function Newsletter({ t }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!email) return;
    setSent(true);
    setEmail("");
  };

  return (
    <div>
      <p className="text-gray-400 text-sm mb-3">{t.newsletterDesc}</p>
      {sent ? (
        <p className="text-[#C9A227] text-sm font-bold">{t.newsletterSuccess}</p>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════
   FOOTER COMPONENT
═══════════════════════════════════════ */
export default function Footer() {
  const pathname = usePathname();
  const { language, isRTL } = useLanguage();
  const data = useFooterData();

  // 🆕 صفحة /onboarding عندها layout مستقل (هيدر بسيط بس، من غير navbar/
  // footer الموقع العادي) — زي تدفق Coursera بالظبط.
  if (pathname.startsWith("/onboarding")) return null;

  if (!data) return null;

  const t    = data.i18n[language] ?? data.i18n["en"];
  const year = new Date().getFullYear();

  return (
    <>
      <style>{FOOTER_STYLES}</style>
      <footer
        dir={isRTL ? "rtl" : "ltr"}
        className="bg-[#0a0a0a] text-white"
      >
        <div className="h-[3px] bg-[#C9A227]" />

        {/* Main grid — 1 col mobile → 2 col tablet → 4 col desktop */}
        <div className="px-5 sm:px-8 md:px-16 pt-12 sm:pt-14 md:pt-16 pb-10 sm:pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-10 lg:gap-12">

            {/* Brand + About + Socials */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="inline-block text-2xl font-black tracking-tighter text-white mb-4 hover:opacity-80 transition-opacity">
                {t.brand}
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">{t.about}</p>
              <div className="flex flex-wrap gap-2">
                {data.socials.map((s) => (
                  <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-[#C9A227] border border-white/8 hover:border-[#C9A227] flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200">
                    <SocialIcon name={s.name} size={15} />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 mb-4 sm:mb-5">{t.quickLinksTitle}</h4>
              <ul className="flex flex-col gap-2.5">
                {data.quickLinks.map((link) => (
                  <li key={link.id}>
                    <Link href={link.href}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white group transition-colors duration-150">
                      <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-[#C9A227]">
                        <ArrowRight size={11} />
                      </span>
                      {t.quickLinks[link.id]}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/privacy"
                    className="flex items-center gap-2 text-sm font-bold text-[#C9A227] hover:text-white group transition-colors duration-150">
                    <span className="w-3 overflow-hidden transition-all duration-200">
                      <ArrowRight size={11} />
                    </span>
                    {language === "ar" ? "سياسة الخصوصية" : language === "es" ? "Política de Privacidad" : "Privacy Policy"}
                  </Link>
                </li>
                <li>
                  <Link href="/terms"
                    className="flex items-center gap-2 text-sm font-bold text-[#C9A227] hover:text-white group transition-colors duration-150">
                    <span className="w-3 overflow-hidden transition-all duration-200">
                      <ArrowRight size={11} />
                    </span>
                    {language === "ar" ? "الشروط والأحكام" : language === "es" ? "Términos y Condiciones" : "Terms & Condition"}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 mb-4 sm:mb-5">{t.contactTitle}</h4>
              <ul className="flex flex-col gap-4">
                <li className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="mt-0.5 shrink-0 text-[#C9A227]"><MapPin /></span>
                  <span className="leading-snug">{data.contact.address}</span>
                </li>
                <li>
                  <a href={`tel:${data.contact.phone}`} className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors">
                    <span className="shrink-0 text-[#C9A227]"><Phone /></span>
                    {data.contact.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${data.contact.email}`} className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors break-all">
                    <span className="shrink-0 text-[#C9A227]"><Mail /></span>
                    {data.contact.email}
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter + Languages */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 mb-4 sm:mb-5">{t.newsletterTitle}</h4>
              <Newsletter t={t} />
              <div className="mt-7 sm:mt-8">
                <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 mb-3">{t.langTitle}</h4>
                <div className="flex flex-wrap gap-2">
                  {data.languages.map((l) => (
                    <span key={l.code} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-gray-400 font-medium">
                       {l.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Bottom bar */}
        <div className="px-5 sm:px-8 md:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
          <p className="text-gray-600 text-xs tracking-wide text-center sm:text-start">
            &copy; {year} {t.brand}. {t.rights}
          </p>
        </div>
      </footer>
    </>
  );
}

const FOOTER_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=Tajawal:wght@400;700;800&display=swap');
`;