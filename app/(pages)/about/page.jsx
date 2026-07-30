"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

function useAboutData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=about")
      .then((r) => r.json())
      .then((res) => { const doc = Array.isArray(res) ? res[0] : res; setData(doc); })
      .catch(console.error);
  }, []);
  return data;
}

function useReveal(threshold = 0.1) {
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

function Check({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#1D6FD8" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function Target({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function Eye({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Label({ text, visible, dark = false }) {
  return (
    <div className={`flex items-center gap-2 mb-3 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="w-4 sm:w-5 h-px bg-[#1D6FD8]" />
      <span className={`text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase ${dark ? "text-gray-400" : "text-[#1D6FD8]"}`}>
        {text}
      </span>
    </div>
  );
}

export default function AboutPage() {
  const { language, isRTL } = useLanguage();
  const data = useAboutData();

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
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
      >
        <HeroSection   data={data} t={t} />
        <WhoWeAre      data={data} t={t} />
        <MissionVision data={data} t={t} />
        <WhyChooseUs   data={data} t={t} />
        <StatsStrip    data={data} t={t} />
      </div>
    </>
  );
}
function HeroSection({ data, t }) {
  return (
    <section className="relative h-[48vh] sm:h-[55vh] md:h-[62vh] overflow-hidden bg-[#f4f4f4]">
      <div className="absolute inset-0 z-0">
        <Image src={data.hero.backgroundImage} alt="about hero" fill className="object-cover object-center" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-24 sm:h-32 md:h-40 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-10 w-full h-full items-start px-5 sm:px-8 md:px-6 pt-10 sm:pt-16 md:pt-24">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter max-w-2xl mb-2 sm:mb-4 animate-fadein-up leading-[1.15] sm:leading-[1.05]">
            {(() => {
              const words = t.hero.headline.split(" ");
              const black = words.slice(0, 2).join(" ");
              const blue  = words.slice(2).join(" ");
              return (
                <>
                  <span className="text-[#0a0a0a]">{black}</span>
                  <br />
                  <span className="text-[#1D6FD8]">{blue}</span>
                </>
              );
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

function WhoWeAre({ data, t }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6 grid lg:grid-cols-2 gap-10 md:gap-16 lg:gap-20 items-center">
        <div className={`relative overflow-hidden rounded-2xl aspect-[4/3] transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <Image src={data.whoWeAre.image} alt="Who We Are" fill className="object-cover" unoptimized />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1D6FD8]" />
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 bg-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-lg">
            <p className="text-xl sm:text-2xl font-black text-[#0a0a0a] leading-none">{data.whoWeAre.badge.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{t.whoWeAre.badgeLabel}</p>
          </div>
        </div>
        <div>
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-5 sm:mb-6 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.whoWeAre.title}
          </h2>
          <div className={`space-y-4 transition-all duration-700 delay-150 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.whoWeAre.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-600 text-sm sm:text-[15px] leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MissionVision({ data, t }) {
  const [ref, visible] = useReveal();
const cards = [
  { key: "vision",  icon: <Eye />,    title: t.vision.title,  body: t.vision.body,  color: "#1a56a0" },
  { key: "mission", icon: <Target />, title: t.mission.title, body: t.mission.body, color: "#1D6FD8" },
];
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-28 bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
        <div className={`mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">{t.mvTitle}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {cards.map((card, i) => (
            <div key={card.key}
              className={`relative bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 md:p-10 overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-black/5 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: card.color }} />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-5 sm:mb-6" style={{ background: `${card.color}12`, color: card.color }}>
                {card.icon}
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-3" style={{ color: card.color }}>{card.title}</h3>
<ul className="flex flex-col gap-1.5 list-none">
  {card.body.split("\n").filter(line => line.trim() !== "").map((line, i) => (
    i === 0 ? (
      <li key={i} className="text-gray-800 text-sm sm:text-[15px] font-black leading-relaxed mb-1">
        {line}
      </li>
    ) : (
      <li key={i} className="flex items-start gap-2 text-gray-600 text-sm sm:text-[15px] leading-relaxed">
        <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: card.color }} />
        {line}
      </li>
    )
  ))}
</ul>
              <div className="absolute -bottom-4 -right-2 text-[90px] sm:text-[120px] font-black leading-none opacity-[0.04] select-none pointer-events-none" style={{ color: card.color }}>
                {card.title.charAt(0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyChooseUs({ data, t }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6 grid lg:grid-cols-2 gap-10 md:gap-16 lg:gap-20 items-center">
        <div>
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-8 sm:mb-10 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.why.title}
          </h2>
          <ul className="flex flex-col divide-y divide-gray-100">
            {t.why.points.map((point, i) => (
              <li key={i}
                className={`flex items-start gap-4 py-4 sm:py-5 transition-all duration-500 ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`}
                style={{ transitionDelay: `${150 + i * 80}ms` }}
              >
                <span className="shrink-0 mt-0.5 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
                  <Check size={20} />
                </span>
                <div>
                  <p className="text-[#0a0a0a] font-bold text-sm sm:text-[15px] leading-snug">{point.title}</p>
                  {point.desc && <p className="text-gray-500 text-xs sm:text-sm mt-1 leading-relaxed">{point.desc}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className={`relative overflow-hidden rounded-2xl aspect-[4/3] transition-all duration-700 delay-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <Image src={data.why.image} alt="Why Choose Edumaster" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
            <p className="text-white font-black text-base sm:text-xl leading-snug drop-shadow-md">{t.why.imageCaption}</p>
          </div>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#1D6FD8]" />
        </div>
      </div>
    </section>
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
            <div key={i}
              className={`bg-[#111] p-5 sm:p-7 md:p-10 flex flex-col gap-2 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
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
`;