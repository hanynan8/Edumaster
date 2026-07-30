// ═══════════════════════════════════════════════
//  courses.tsx  — MOBILE RESPONSIVE VERSION
// ═══════════════════════════════════════════════
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

function useCoursesData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=courses").then((r) => r.json())
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
function Clock({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
}
function Award({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>;
}
function Users({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
}
function Target({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
}


export default function CoursesPage() {
  const { language, isRTL } = useLanguage();
  const data = useCoursesData();
  const [activeFilter, setActiveFilter] = useState("all");

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
  const mergedCourses = data.courses.map((c) => ({ ...c, ...t.courses[c.id] }));
  const filtered = activeFilter === "all" ? mergedCourses : mergedCourses.filter((c) => c.category === activeFilter);
  const filterKeys = ["all", "Language", "Career", "Academic", "Career + Language"];

  return (
    <>
      <style>{STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
        <HeroSection data={data} t={t} />
        <FilterBar filterKeys={filterKeys} t={t} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        <CoursesList courses={filtered} t={t} language={language} />
        <StatsStrip data={data} t={t} />
      </div>
    </>
  );
}

function HeroSection({ data, t }) {
  return (
    <section className="relative h-[48vh] sm:h-[55vh] md:h-[62vh] overflow-hidden bg-[#f4f4f4]">
      <div className="absolute inset-0 z-0">
        <Image src={data.hero.backgroundImage} alt="courses hero" fill className="object-cover object-center" priority unoptimized />
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
function FilterBar({ filterKeys, t, activeFilter, setActiveFilter }) {
  return (
    <div className="sticky top-[60px] sm:top-[68px] z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {filterKeys.map((key) => (
          <button key={key} onClick={() => setActiveFilter(key)}
            className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 ${
              activeFilter === key ? "bg-[#1D6FD8] text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}>
            {t.filter[key] ?? key}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoursesList({ courses, t, language }) {
  return (
    <section className="py-14 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-0">
        {courses.map((course, i) => <CourseRow key={course.id} course={course} index={i} />)}
      </div>
    </section>
  );
}

function CourseRow({ course, index }) {
  const [ref, visible] = useReveal(0.06);
  const isEven = index % 2 === 0;
  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-0 items-stretch border-b border-gray-100 last:border-0">
      {/* Image — always first on mobile */}
      <div className={`relative overflow-hidden min-h-[220px] sm:min-h-[300px] lg:min-h-[520px] order-1 ${isEven ? "lg:order-1" : "lg:order-2"} transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
        <Image src={course.image} alt={course.title} fill className="object-cover hover:scale-105 transition-transform duration-700" unoptimized />
        <div className="absolute top-0 inset-x-0 h-[4px]" style={{ background: course.color }} />
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/70 to-transparent flex items-end gap-2 sm:gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            <Clock size={11} />{course.duration}
          </span>
          <span className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: course.levelColor + "cc" }}>
            <Award size={11} />{course.level}
          </span>
        </div>
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <span className="text-white font-black text-sm sm:text-base leading-none">{String(index + 1).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col justify-center px-5 sm:px-8 md:px-10 py-8 sm:py-12 lg:py-20 gap-5 sm:gap-6 lg:gap-8 order-2 ${isEven ? "lg:order-2 bg-white" : "lg:order-1 bg-[#f7f7f7]"} transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-2 sm:mb-3">{course.title}</h2>
          <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed">{course.desc}</p>
        </div>
        <InfoBlock icon={<Users size={13} />} title="Who Is This For" color={course.color}>
          <ul className="flex flex-col gap-2 mt-2">
            {course.whoIsThisFor.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 border-gray-200 flex items-center justify-center bg-white"><Check size={18} color={course.color} /></span>
                <span className="text-gray-600 text-xs sm:text-sm leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </InfoBlock>
        <InfoBlock icon={<Target size={13} />} title="Learning Outcomes" color={course.color}>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {course.outcomes.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"><Check size={20} color={course.color} /></span>
                <span className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </InfoBlock>
        <div>
          <Link href={course.ctaHref}
            className="inline-flex items-center gap-2 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg text-sm text-white transition-all active:scale-95 shadow-sm hover:opacity-90"
            style={{ background: course.color }}>
            {course.cta} <ArrowRight size={13} />
          </Link>
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
`;