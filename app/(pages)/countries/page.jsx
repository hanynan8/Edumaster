"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

function useCountriesData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=countries")
      .then((r) => r.json())
      .then((res) => { const doc = Array.isArray(res) ? res[0] : res; setData(doc); })
      .catch(console.error);
  }, []);
  return data;
}

function useReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function ArrowRight({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function Check({ size = 11, color = "#1D6FD8" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}
function BookOpen({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>;
}
function ClipboardList({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></svg>;
}
function Wallet({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" /><circle cx="17" cy="13" r="1" fill="currentColor" /></svg>;
}
function Briefcase({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v4M10 14h4" /></svg>;
}
function FileCheck({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 15l2 2 4-4" /></svg>;
}
function Sun({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
function GraduationCap({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /><path d="M22 10v6" /></svg>;
}

// Meta for EVERY possible section across ALL countries. Which of these actually
// render for a given country is driven by that country's own `sections` object
// (see getSectionKeys below), not by a single hardcoded list.
// NOTE: images are NOT here anymore — they now live entirely in the JSON data
// (country.image for the banner, country.sections[key].image for each section).
// This object only keeps the icon + accent color, which are purely visual/UI
// concerns and not content.
const SECTION_META = {
  educationSystem:       { icon: BookOpen,       color: "#1D6FD8" },
  admissionRequirements: { icon: ClipboardList,  color: "#a855f7" },
  costOfLiving:          { icon: Wallet,         color: "#10b981" },
  partTimeWork:          { icon: Briefcase,      color: "#f59e0b" },
  visaProcess:           { icon: FileCheck,      color: "#3b82f6" },
  lifeInSpain:           { icon: Sun,            color: "#10b981" },
  lifeInRomania:         { icon: Sun,            color: "#3b82f6" },
  universities:          { icon: GraduationCap,  color: "#0ea5e9" },
};

// Preferred display order; any section not listed here (future additions)
// still renders, appended in whatever order it appears in the data.
const SECTION_ORDER = [
  "educationSystem",
  "admissionRequirements",
  "costOfLiving",
  "partTimeWork",
  "visaProcess",
  "lifeInSpain",
  "lifeInRomania",
  "universities",
];

// Build the list of section keys to render for a specific country, based on
// what that country actually has in its `sections` object (from the DB doc),
// instead of assuming every country shares Spain's fixed section list.
function getSectionKeys(country) {
  const available = Object.keys(country.sections || {});
  const ordered = SECTION_ORDER.filter((k) => available.includes(k));
  const extra = available.filter((k) => !SECTION_ORDER.includes(k));
  return [...ordered, ...extra];
}

export default function CountriesPage() {
  const { language, isRTL } = useLanguage();
  const data = useCountriesData();
  const [activeSection, setActiveSection] = useState(null);
  const [selectedId, setSelectedId] = useState("spain");

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Loading</span>
        </div>
      </div>
    );
  }

  const t = data.i18n[language] ?? data.i18n["en"];
  const allCountries = data.countries.map((c) => ({ ...c, ...t.countries[c.id] }));
  const activeCountry = allCountries.find((c) => c.id === selectedId) ?? allCountries[0];

  return (
    <>
      <style>{STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
        <HeroSection data={data} t={t} />
        <CountryFilter countries={allCountries} selectedId={selectedId} setSelectedId={setSelectedId} />
        {activeCountry && (
          <CountryDetail key={activeCountry.id} country={activeCountry} t={t} activeSection={activeSection} setActiveSection={setActiveSection} />
        )}
        <StatsStrip data={data} t={t} />
      </div>
    </>
  );
}

function CountryFilter({ countries, selectedId, setSelectedId }) {
  return (
    <div className="sticky top-[60px] sm:top-[68px] z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
        {countries.map((c) => {
          const isActive = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 ${
                isActive ? "text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={isActive ? { background: c.color } : {}}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeroSection({ data, t }) {
  return (
    <section className="relative h-[48vh] sm:h-[55vh] md:h-[62vh] overflow-hidden bg-[#f4f4f4]">
      <div className="absolute inset-0 z-0">
        <Image src={data.hero.backgroundImage} alt="countries hero" fill className="object-cover object-center" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-24 sm:h-32 md:h-40 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-10 w-full h-full items-start px-5 sm:px-8 md:px-6 pt-10 sm:pt-16 md:pt-24">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter max-w-2xl mb-2 sm:mb-4 animate-fadein-up leading-[1.15] sm:leading-[1.05]">
            {(() => {
              const words = t.hero.headline.split(" ");
              return (<><span className="text-[#0a0a0a]">{words.slice(0, 2).join(" ")}</span><br /><span className="text-[#1D6FD8]">{words.slice(2).join(" ")}</span></>);
            })()}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed animate-fadein-up2">{t.hero.subheadline}</p>
        </div>
      </div>
      <div className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2 animate-bounce">
        <div className="w-px h-8 bg-gray-300" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-gray-400 font-medium">Scroll</span>
      </div>
    </section>
  );
}
function CountryDetail({ country, t, activeSection, setActiveSection }) {
  const [headerRef, headerVisible] = useReveal(0.1);
  const sectionKeys = getSectionKeys(country);

  return (
    <div>
      <div ref={headerRef} className="relative overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image src={country.image} alt={country.name} fill className="object-cover" unoptimized />
        </div>
        <div className="absolute top-0 inset-x-0 h-[3px] z-10" style={{ background: country.color }} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-6 py-24 sm:py-28 md:py-32">
          <div className={`transition-all duration-700 ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <div className="mb-3 sm:mb-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">{country.name}</h2>
              <p className="text-gray-400 text-xs sm:text-sm font-medium mt-0.5">{country.tagline}</p>
            </div>
            <p className="text-gray-300 text-sm sm:text-[15px] max-w-2xl leading-relaxed">{country.desc}</p>
          </div>
        </div>
      </div>

      <SectionNav sectionKeys={sectionKeys} t={t} activeSection={activeSection} setActiveSection={setActiveSection} country={country} />

      <div>
        {sectionKeys.map((key, i) => (
          <SectionRow key={key} countryId={country.id} sectionKey={key} sectionData={country.sections[key]} content={country[key]} meta={SECTION_META[key] || { icon: BookOpen, color: "#1D6FD8" }} index={i} id={`section-${country.id}-${key}`} />
        ))}
      </div>
    </div>
  );
}

function SectionNav({ sectionKeys, t, activeSection, setActiveSection, country }) {
  const scrollToSection = (key) => {
    setActiveSection(`${country.id}-${key}`);
    const el = document.getElementById(`section-${country.id}-${key}`);
    if (el) {
      const offset = 190;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };
  return (
    <div className="sticky top-[112px] sm:top-[128px] z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {sectionKeys.map((key) => {
          const meta = SECTION_META[key] || { icon: BookOpen, color: "#1D6FD8" };
          const Icon = meta.icon;
          const isActive = activeSection === `${country.id}-${key}`;
          return (
            <button key={key} onClick={() => scrollToSection(key)}
              className={`shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 ${
                isActive ? "text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={isActive ? { background: meta.color } : {}}>
              <Icon size={10} />
              {t.nav[key] || key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionRow({ countryId, sectionKey, sectionData, content, meta, index, id }) {
  const [ref, visible] = useReveal(0.06);
  const isEven = index % 2 === 0;
  const Icon = meta.icon;
  if (!content) return null;
  // Image now comes straight from the JSON data (country.sections[key].image),
  // no more code-side override lookup.
  const imageSrc = sectionData?.image;

  // The "universities" section has a different shape (two labeled lists of
  // institution names) instead of a flat `points` array — render it separately.
  const isUniversityList = Array.isArray(content.publicUniversities) || Array.isArray(content.privateUniversities);

  return (
    <div id={id} ref={ref} className="grid lg:grid-cols-2 gap-0 items-stretch border-b border-gray-100 last:border-0 scroll-mt-36">
      {/* Image — always on top on mobile */}
      <div className={`relative overflow-hidden min-h-[220px] sm:min-h-[300px] lg:min-h-[480px] order-1 ${isEven ? "lg:order-1" : "lg:order-2"} transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
        {imageSrc && (
          <Image src={imageSrc} alt={content.title} fill className="object-cover hover:scale-105 transition-transform duration-700" unoptimized />
        )}
        <div className="absolute top-0 inset-x-0 h-[4px]" style={{ background: meta.color }} />
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: meta.color }}>
          <Icon size={16} color="white" />
        </div>
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/60 to-transparent">
          <span className="inline-flex items-center gap-1.5 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <div className="w-3 sm:w-4 h-px bg-white/60" />{content.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col justify-center px-5 sm:px-8 md:px-10 py-8 sm:py-12 lg:py-20 order-2 ${isEven ? "lg:order-2 bg-white" : "lg:order-1 bg-[#f7f7f7]"} transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight mb-3 sm:mb-4">{content.title}</h3>
        <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed mb-6 sm:mb-8">{content.desc}</p>

        {isUniversityList ? (
          <div className="flex flex-col gap-6 sm:gap-8">
            {Array.isArray(content.publicUniversities) && content.publicUniversities.length > 0 && (
              <div>
                <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 sm:mb-3">{content.publicUniversitiesLabel}</h4>
                <ul className="flex flex-col gap-2">
                  {content.publicUniversities.map((uni, i) => (
                    <li key={i} className={`flex items-start gap-2.5 sm:gap-3 transition-all duration-500 ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`} style={{ transitionDelay: `${150 + i * 40}ms` }}>
                      <span className="shrink-0 mt-0.5"><Check size={18} color={meta.color} /></span>
                      <span className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{uni}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(content.privateUniversities) && content.privateUniversities.length > 0 && (
              <div>
                <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 sm:mb-3">{content.privateUniversitiesLabel}</h4>
                <ul className="flex flex-col gap-2">
                  {content.privateUniversities.map((uni, i) => (
                    <li key={i} className={`flex items-start gap-2.5 sm:gap-3 transition-all duration-500 ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`} style={{ transitionDelay: `${150 + i * 40}ms` }}>
                      <span className="shrink-0 mt-0.5"><Check size={18} color={meta.color} /></span>
                      <span className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{uni}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5 sm:gap-3">
            {(content.points || []).map((point, i) => (
              <li key={i}
                className={`flex items-start gap-2.5 sm:gap-3 transition-all duration-500 ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
                style={{ transitionDelay: `${150 + i * 60}ms` }}>
                <span className="shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                  <Check size={20} color={meta.color} />
                </span>
                <span className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatsStrip({ data, t }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className="relative py-16 sm:py-20 md:py-28 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 z-0 opacity-10">
        <Image src={data.stats.backgroundImage} alt="" fill className="object-cover" unoptimized />
      </div>
      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#1D6FD8] z-10" />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
        <div className={`mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">{t.stats.title}</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/8">
          {data.stats.items.map((s, i) => (
            <div key={i} className={`bg-[#111] p-5 sm:p-7 md:p-10 flex flex-col gap-2 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <span className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">{s.value}</span>
              <span className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-1 sm:mt-2">{t.stats.items[i]}</span>
              <div className="w-5 sm:w-6 h-0.5 bg-[#1D6FD8] mt-1 sm:mt-2" />
            </div>
          ))}
        </div>
      </div>
    </section>
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
  .scroll-mt-36 { scroll-margin-top: 12rem; }
`;