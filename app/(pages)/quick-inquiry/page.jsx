"use client";

// app/(pages)/quick-inquiry/page.jsx
//
// 🆕 صفحة مخصصة لفورم "Quick Inquiry" (نفس الفورم البسيط بتاع صفحة /contact
// لما نختار Other / General Inquiry) — مفيهاش غير الفورم ده وبس.
// بتتفتح من أزرار صفحة الخدمات، ومعاها query param اسمه ?service=<قيمة الخدمة>
// (study-spain / study-romania / admissions / visa / scholarships / courses ...) عشان
// الخدمة تتسجّل مع الرسالة في الداتابيز. لو مفيش param بتتسجّل "other".

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingScreen from "@/app/components/LoadingScreen";
import SimpleInquiryForm from "@/app/components/contact/SimpleInquiryForm";

function useContactData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=contact")
      .then((r) => r.json())
      .then((res) => setData(Array.isArray(res) ? res[0] : res))
      .catch(console.error);
  }, []);
  return data;
}

// قيم مسموحة فقط (بنفس قيم صفحة /contact) — أي حاجة تانية بتتحول لـ "other"
const ALLOWED_SERVICES = new Set([
  "study-spain",
  "study-romania",
  "admissions",
  "visa",
  "scholarships",
  "courses",
  "career",
  "language",
  "translation",
  "other",
]);

export default function QuickInquiryPage() {
  // useSearchParams لازم يكون جوه Suspense في Next (عشان الـ prerender).
  return (
    <Suspense fallback={<LoadingScreen />}>
      <QuickInquiryInner />
    </Suspense>
  );
}

function QuickInquiryInner() {
  const data = useContactData();
  const { language: lang } = useLanguage();
  const params = useSearchParams();

  const raw = (params.get("service") || "").trim().toLowerCase();
  const service = ALLOWED_SERVICES.has(raw) ? raw : "other";

  if (!data) return <LoadingScreen />;

  const t = data.i18n?.[lang] ?? data.i18n?.en;
  if (!t) return <LoadingScreen />;
  const isRTL = lang === "ar";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-[70vh] bg-white text-[#0a0a0a] flex items-start justify-center px-5 sm:px-8 py-12 sm:py-20">
      <div className="w-full max-w-xl p-5 sm:p-8 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <SimpleInquiryForm t={t} lang={lang} selectedService={service} requireAttachment />
      </div>
    </div>
  );
}