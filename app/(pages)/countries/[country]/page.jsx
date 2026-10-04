// PATH: app/(pages)/countries/[country]/page.jsx
"use client";

//
// صفحة مخصصة لكل دولة (Study in Spain → /countries/spain،
// Study in Romania → /countries/romania) بتعرض بيانات الدولة دي بس
// (الهيرو + الأقسام + نموذج الاستشارة) من نفس collection="countries" اللي
// بتتحكم فيه لوحة الأدمن، من غير فلتر تبديل بين الدول. أي id مش موجود في
// الداتا بيروح لصفحة 404.

import { useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingScreen from "@/app/components/LoadingScreen";
import { useCollectionDoc } from "@/app/lib/useCollection";
import { CountryDetail, StatsStrip, COUNTRY_STYLES } from "@/app/components/countries/CountryParts";

const CRUMBS = {
  en: { all: "Countries" },
  ar: { all: "الدول" },
  es: { all: "Países" },
};

export default function CountryPage() {
  const { language, isRTL } = useLanguage();
  const params = useParams();
  const countryId = decodeURIComponent(String(params?.country ?? "")).toLowerCase();
  const data = useCollectionDoc("countries");
  const [activeSection, setActiveSection] = useState(null);

  if (!data) return <LoadingScreen />;

  const t = data.i18n?.[language] ?? data.i18n?.en;
  const base = (data.countries || []).find((c) => c.id === countryId);
  if (!base || !t) notFound();

  const country = { ...base, ...(t.countries?.[base.id] ?? {}) };
  const crumb = CRUMBS[language] ?? CRUMBS.en;

  return (
    <>
      <style>{COUNTRY_STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">
        <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <Link href="/countries" className="hover:text-[#0a0a0a] transition-colors">{crumb.all}</Link>
          <span aria-hidden="true" className="text-gray-300">/</span>
          <span className="font-bold" style={{ color: country.color }}>{country.name}</span>
        </nav>

        <CountryDetail
          key={country.id}
          country={country}
          t={t}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          standalone
        />
        <StatsStrip data={data} t={t} />
      </div>
    </>
  );
}