"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

function useStoriesData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=successStories").then((r) => r.json())
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
function Quote({ size = 28 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" /></svg>;
}
function Check({ size = 11, color = "#fff" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}
function Star({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
}


export default function SuccessStoriesPage() {
  const { language, isRTL } = useLanguage();
  const data = useStoriesData();

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

  return (
    <>
      <style>{STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">
        <HeroSection data={data} t={t} />
        <StatsStrip data={data} t={t} />
        <Testimonials data={data} t={t} />
        <Journeys data={data} t={t} />
        <Approvals data={data} t={t} />
        {/* <CtaBanner t={t} /> */}
      </div>
    </>
  );
}

function HeroSection({ data, t }) {
  return (
    <section className="relative min-h-[52vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src={data.hero.backgroundImage} alt="success stories" fill className="object-cover object-center" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-10 w-full px-5 sm:px-8 md:px-6 pb-12 sm:pb-16 md:pb-20 pt-24 sm:pt-30 md:pt-36">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight max-w-2xl mb-4 sm:mb-5 animate-fadein-up leading-[1.05]">
            {(() => {
              const words = t.hero.headline.split(" ");
              return (<><span className="text-[#0a0a0a]">{words.slice(0, 2).join(" ")}</span><br /><span className="text-[#1D6FD8]">{words.slice(2).join(" ")}</span></>);
            })()}
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-lg leading-relaxed animate-fadein-up2">{t.hero.subheadline}</p>
        </div>
      </div>
    </section>
  );
}

function StatsStrip({ data, t }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className="py-10 sm:py-12 md:py-14 px-5 sm:px-8 md:px-6 bg-[#f7f7f7] border-y border-gray-100">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 rounded-2xl overflow-hidden">
        {data.stats.items.map((s, i) => (
          <div key={i} className={`bg-white px-5 sm:px-8 py-7 sm:py-10 flex flex-col gap-1 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 80}ms` }}>
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a0a0a] tracking-tighter leading-none">{s.value}</span>
            <span className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-1">{t.stats.items[i]}</span>
            <div className="w-4 sm:w-5 h-0.5 bg-[#1D6FD8] mt-1.5 sm:mt-2" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ data, t }) {
  const [ref, visible] = useReveal();
  const merged = data.testimonials.map((item) => ({ ...item, ...t.testimonials[item.id] }));
  const TAG_COLORS = { university: "#a855f7", visa: "#10b981", career: "#3b82f6" };
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 px-5 sm:px-8 md:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className={`mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">{t.sections.testimonials}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {merged.map((item, i) => (
            <div key={item.id}
              className={`bg-[#f7f7f7] rounded-2xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 border border-gray-100 hover:border-[#1D6FD8]/20 hover:shadow-lg transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 70}ms` }}>
              <div className="text-[#1D6FD8]/15"><Quote size={28} /></div>
              <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={11} />)}</div>
              <p className="text-gray-700 text-xs sm:text-sm leading-relaxed flex-1 italic">"{item.quote}"</p>
              <span className="self-start text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full text-white"
                style={{ background: TAG_COLORS[item.type] ?? "#1D6FD8" }}>{item.tag}</span>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0">
                  <Image src={item.avatar} alt={item.name} fill className="object-cover" unoptimized />
                </div>
                <div>
                  <p className="font-black text-xs sm:text-sm text-[#0a0a0a]">{item.country} {item.name}</p>
                  <p className="text-gray-400 text-xs">{item.program}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Journeys({ data, t }) {
  const [ref, visible] = useReveal();
  const merged = data.journeys.map((j) => ({ ...j, ...t.journeys[j.id] }));
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 px-5 sm:px-8 md:px-6 bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto">
        <div className={`mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">{t.sections.journeys}</h2>
        </div>
        <div className="flex flex-col gap-4 sm:gap-5">
          {merged.map((j, i) => (
            <div key={j.id}
              className={`bg-white rounded-2xl border border-gray-100 overflow-hidden grid lg:grid-cols-[auto_1fr_1fr] gap-0 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              {/* Avatar */}
              <div className="flex flex-row lg:flex-col items-center gap-4 lg:gap-3 justify-start lg:justify-center px-5 sm:px-8 py-5 sm:py-8 border-b lg:border-b-0 lg:border-r border-gray-100">
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0">
                  <Image src={j.avatar} alt={j.name} fill className="object-cover" unoptimized />
                </div>
                <div className="lg:text-center">
                  <p className="font-black text-sm">{j.country} {j.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{j.program}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full bg-[#0a0a0a]">{j.duration}</span>
                </div>
              </div>
              {/* Before */}
              <div className="px-5 sm:px-8 py-5 sm:py-8 border-b lg:border-b-0 lg:border-r border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2 sm:mb-3">Before</p>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{j.before}</p>
              </div>
              {/* After */}
              <div className="px-5 sm:px-8 py-5 sm:py-8 relative">
                <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: j.color }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: j.color }}>After</p>
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed font-medium">{j.after}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Approvals({ data, t }) {
  const [ref, visible] = useReveal();
  const ta = t.approvals;
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 px-5 sm:px-8 md:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className={`mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-2 sm:mb-3">{ta.title}</h2>
          <p className="text-gray-500 max-w-xl text-sm sm:text-[15px] leading-relaxed">{ta.desc}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {ta.items.map((item, i) => {
            const isVisa = item.type === "visa";
            const color = isVisa ? "#10b981" : "#a855f7";
            const label = isVisa ? ta.visaLabel : ta.uniLabel;
            return (
              <div key={i}
                className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-500 hover:shadow-md ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ borderColor: color + "30", background: color + "06", transitionDelay: `${i * 60}ms` }}>
                <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ background: color }}>
                  <Check size={12} color="#fff" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color }}>{label}</p>
                  <p className="font-black text-xs sm:text-sm text-[#0a0a0a] truncate">{item.country} {item.name}</p>
                  <p className="text-gray-400 text-xs truncate">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// function CtaBanner({ t }) {
  // const [ref, visible] = useReveal();
//   return (
//     <section ref={ref} className="relative py-16 sm:py-20 md:py-28 px-5 sm:px-8 md:px-6 overflow-hidden bg-[#0a0a0a]">
//       <div className="absolute top-0 inset-x-0 h-[3px] bg-[#1D6FD8]" />
//       <div className="relative z-10 max-w-3xl mx-auto text-center">
//         <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
//           <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight mb-3 sm:mb-4">{t.cta.title}</h2>
//           <p className="text-gray-400 text-sm sm:text-[15px] mb-8 sm:mb-10 leading-relaxed">{t.cta.desc}</p>
//           <Link href="/contact"
//             className="inline-flex items-center gap-2 bg-[#1D6FD8] text-white font-bold px-7 sm:px-8 py-3.5 sm:py-4 rounded-lg text-sm sm:text-base hover:bg-[#a50d24] transition-colors shadow-lg">
//             {t.cta.button} <ArrowRight size={16} />
//           </Link>
//         </div>
//       </div>
//     </section>
//   );
// }

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@400;700;800&display=swap');
  @keyframes fadein    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadein-up { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadein     { animation: fadein    0.6s ease both; }
  .animate-fadein-up  { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2 { animation: fadein-up 0.7s ease 0.25s both; }
`;