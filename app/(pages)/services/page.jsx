"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

function useServicesData() {
  const [data, setData] = useState(null);
  useEffect(() => {
fetch("/api/data?collection=services")
  .then((r) => r.json())
  .then((res) => {
    console.log("API response:", res); // ← شوف الشكل هنا
    const doc = Array.isArray(res) ? res[0] : res;
    setData(doc);
  })
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

function ArrowRight({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function Check({ size = 11 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1D6FD8" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}

function Label({ text, visible, dark = false }) {
  return (
    <div className={`flex items-center gap-2 mb-3 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="w-4 sm:w-5 h-px bg-[#1D6FD8]" />
      <span className={`text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase ${dark ? "text-gray-400" : "text-[#1D6FD8]"}`}>{text}</span>
    </div>
  );
}

export default function ServicesPage() {
  const { language, isRTL } = useLanguage();
  const data = useServicesData();

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
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
        <HeroSection data={data} t={t} />
        <ServicesList data={data} t={t} />
        <StatsStrip data={data} t={t} />
      </div>
    </>
  );
}
function HeroSection({ data, t }) {
  return (
    <section className="relative h-[48vh] sm:h-[55vh] md:h-[62vh] overflow-hidden bg-[#f4f4f4]">
      <div className="absolute inset-0 z-0">
        <Image src={data.hero.backgroundImage} alt={t.hero.headline ?? "Services background"} fill className="object-cover object-center" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-24 sm:h-32 md:h-40 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-10 w-full h-full items-start px-5 sm:px-8 md:px-6 pt-10 sm:pt-16 md:pt-24">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter max-w-2xl mb-2 sm:mb-4 animate-fadein-up leading-[1.15] sm:leading-[1.05]">
            {t.hero.headline.split(",").map((chunk, i, arr) =>
              i === arr.length - 1
                ? <span key={i} className="text-[#1D6FD8]">{chunk}</span>
                : <span key={i}>{chunk},<br /></span>
            )}
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

const ID_MAP = {
  "Study in Spain": "study-spain",
  "Visa Services": "visa",
  "language Courses": "language",
};

function ServicesList({ data, t }) {
  const merged = data.services.map((svc) => {
    const i18nKey = ID_MAP[svc.id] ?? svc.id;
    return { ...svc, ...(t.services[i18nKey] ?? {}) };
  });

  return (
    <section className="py-14 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-0">
        {merged.map((svc, i) => <ServiceRow key={svc.id} service={svc} index={i} />)}
      </div>
    </section>
  );
}

function ServiceRow({ service, index }) {
  const [ref, visible] = useReveal(0.08);
  const isEven = index % 2 === 0;
  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-0 items-stretch border-b border-gray-100 last:border-0">
      {/* Image — always first on mobile */}
      <div className={`relative overflow-hidden min-h-[220px] sm:min-h-[300px] lg:min-h-[460px] order-1 ${isEven ? "lg:order-1" : "lg:order-2"} transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
        <Image src={service.image} alt={service.title ?? "Service image"} fill  className="object-cover hover:scale-105 transition-transform duration-700" unoptimized />
        <div className="absolute top-0 inset-x-0 h-[4px]" style={{ background: service.color }} />
        <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <span className="text-white font-black text-base sm:text-xl leading-none">{String(index + 1).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col justify-center px-5 sm:px-8 md:px-10 py-8 sm:py-12 lg:py-20 order-2 ${isEven ? "lg:order-2 bg-white" : "lg:order-1 bg-[#f7f7f7]"} transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3 sm:mb-4">{service.title}</h2>
        <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed mb-6 sm:mb-8">{service.desc}</p>
        <ul className="flex flex-col gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          {(service.features ?? []).map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 sm:gap-3">
              <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><Check size={20} /></span>
              <span className="text-[#0a0a0a] text-xs sm:text-sm font-medium">{f}</span>
            </li>
          ))}
        </ul>
        <div>
          <Link href={service.ctaHref}
            className="inline-flex items-center gap-2 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg text-sm text-white transition-all active:scale-95 shadow-sm"
            style={{ background: service.color }}>
            {service.cta} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatsStrip({ data, t }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className="relative py-16 sm:py-20 md:py-28 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 z-0 opacity-10">
        <Image src={data.stats.backgroundImage} alt="" aria-hidden="true" fill className="object-cover" unoptimized />
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
`;