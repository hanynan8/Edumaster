// PATH: app/(pages)/countries/page.jsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingScreen from "@/app/components/LoadingScreen";
import { CountryDetail, StatsStrip, COUNTRY_STYLES } from "@/app/components/countries/CountryParts";

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

// 🆕 يقرأ ?country=<id> (أو #<id>) من الرابط عند الدخول للصفحة، عشان لينك
// الهوفر بتاع "Countries" في الناف بار يقدر يفتح الصفحة على دولة معيّنة
// (مثلًا /countries?country=romania) بدل ما ترجع دايمًا لإسبانيا الافتراضية.
// قراءة client-side بسيطة من window.location بدل useSearchParams عشان
// نتجنب شرط الـ Suspense boundary اللي next.js بيطلبه مع الـ hook ده.
function useRequestedCountryId() {
  const [id, setId] = useState(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("country");
      if (fromQuery) { setId(fromQuery); return; }
      const fromHash = window.location.hash ? window.location.hash.replace(/^#/, "") : "";
      if (fromHash) setId(fromHash);
    } catch {
      /* no-op — أي بيئة من غير window (SSR) بترجع من غير تحديد */
    }
  }, []);
  return id;
}

export default function CountriesPage() {
  const { language, isRTL } = useLanguage();
  const data = useCountriesData();
  const requestedId = useRequestedCountryId();
  const [activeSection, setActiveSection] = useState(null);
  const [selectedId, setSelectedId] = useState("spain");

  // لما الداتا توصل ولو الرابط كان بيطلب دولة معينة (?country=romania مثلًا)
  // وهي فعلًا موجودة في الداتا، بنحدد selectedId عليها بدل الافتراضي.
  useEffect(() => {
    if (!data || !requestedId) return;
    const match = (data.countries || []).find((c) => c.id === requestedId);
    if (match) setSelectedId(match.id);
  }, [data, requestedId]);

  if (!data) {
    return (
      <LoadingScreen />
    );
  }

  const t = data.i18n[language] ?? data.i18n["en"];
  const allCountries = data.countries.map((c) => ({ ...c, ...t.countries[c.id] }));
  const activeCountry = allCountries.find((c) => c.id === selectedId) ?? allCountries[0];

  return (
    <>
      <style>{COUNTRY_STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">
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
    <div className="sticky top-15 sm:top-17 z-50 bg-white border-b border-gray-100">
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
    <section className="relative overflow-hidden bg-white px-0 min-[851px]:px-20">
      <div className="relative w-full">
        <div className="relative w-full h-75 sm:h-90 md:h-105">
          <Image
            src={data.hero.backgroundImage}
            alt="countries hero"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
        </div>

        {/* White card: stacked below the image up to 850px, overlapping it above 850px — matches guest home hero */}
        <div className="min-[851px]:absolute min-[851px]:inset-0 flex items-center">
          <div className="w-full px-0 min-[851px]:px-12">
            <div className="bg-white rounded-none min-[851px]:rounded-md shadow-none min-[851px]:shadow-xl w-full max-w-full min-[851px]:max-w-100 px-6 sm:px-8 py-6 sm:py-8 animate-fadein-up">
              <h1 className="font-semibold tracking-tight text-[#1c1d1f] text-xl sm:text-2xl md:text-3xl leading-tight mb-2 sm:mb-3">
                {(() => {
                  const words = t.hero.headline.split(" ");
                  return (<><span className="text-[#1c1d1f]">{words.slice(0, 2).join(" ")}</span> <span className="text-[#003A91]">{words.slice(2).join(" ")}</span></>);
                })()}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed animate-fadein-up2">
                {t.hero.subheadline}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}