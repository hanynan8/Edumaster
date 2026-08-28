"use client";

// app/(pages)/verify/[certId]/page.jsx
//
// Phase 5 — اليوم 45: "صفحة عامة للتحقق من صحة الشهادة /verify/[certId]".
// صفحة عامة بالكامل (من غير أي auth، ومش تحت middleware.js's PAGE_ROLE_RULES
// — راجع middleware.js) — أي حد (جهة توظيف مثلاً) يقدر يفتح الرابط المطبوع
// على الشهادة نفسها ويتأكد إنها حقيقية صادرة من EduMaster فعلاً، من غير ما
// يحتاج حساب. البيانات جايه من GET /api/certificates/verify/[certId] اللي
// هو كمان عام بالكامل ومقصود إنه يرجّع بس المعلومات المطبوعة على وش
// الشهادة نفسها (مفيش إيميل الطالب ولا أي بيانات حساسة تانية).

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader, ShieldCheck, ShieldX, Award, Calendar, BookOpen, Hash } from "lucide-react";

const STRINGS = {
  ar: {
    loading: "جارِ التحقق من الشهادة...",
    validTitle: "شهادة صحيحة ✓",
    validSubtitle: "الشهادة دي صادرة فعلًا من منصة EduMaster",
    invalidTitle: "رقم شهادة غير صحيح",
    invalidSubtitle: "مفيش شهادة مسجّلة بالرقم ده في منصة EduMaster",
    studentName: "اسم الطالب/ة",
    courseTitle: "الكورس",
    issuedAt: "تاريخ الإصدار",
    certificateId: "رقم الشهادة",
    home: "الرجوع للرئيسية",
    browse: "تصفّح الكورسات",
  },
  en: {
    loading: "Verifying certificate...",
    validTitle: "Valid Certificate ✓",
    validSubtitle: "This certificate was genuinely issued by EduMaster",
    invalidTitle: "Invalid Certificate ID",
    invalidSubtitle: "No certificate is registered with this ID on EduMaster",
    studentName: "Student Name",
    courseTitle: "Course",
    issuedAt: "Issued On",
    certificateId: "Certificate #",
    home: "Back to Home",
    browse: "Browse Courses",
  },
};

export default function VerifyCertificatePage({ params }) {
  const { certId } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const locale = language === "ar" ? "ar-EG" : "en-US";

  const [result, setResult] = useState(null); // { valid, certificate? } | "error"
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/certificates/verify/${encodeURIComponent(certId)}`)
      .then((r) => r.json())
      .then((data) => setResult(data?.valid ? data : { valid: false }))
      .catch(() => setResult({ valid: false }))
      .finally(() => setChecked(true));
  }, [certId]);

  if (!checked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f7f7f7]">
        <Loader className="animate-spin text-[#003A91]" size={28} />
        <p className="text-sm text-gray-400">{t.loading}</p>
      </div>
    );
  }

  const isValid = result?.valid === true;
  const cert = result?.certificate;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f7f7f7] py-14 px-4"
    >
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className={`h-1.5 ${isValid ? "bg-gradient-to-r from-[#0a0a0a] to-[#003A91]" : "bg-red-400"}`} />

          <div className="p-8 text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isValid ? "bg-[#0a0a0a]" : "bg-red-50"
              }`}
            >
              {isValid ? (
                <ShieldCheck className="text-white" size={30} />
              ) : (
                <ShieldX className="text-red-400" size={30} />
              )}
            </div>

            <h1 className="text-xl font-semibold text-gray-800 mb-1">
              {isValid ? t.validTitle : t.invalidTitle}
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              {isValid ? t.validSubtitle : t.invalidSubtitle}
            </p>

            {isValid && cert && (
              <div className="text-start space-y-3 bg-gray-50 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3">
                  <Award size={16} className="text-[#003A91] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">{t.studentName}</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{cert.studentName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen size={16} className="text-[#003A91] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">{t.courseTitle}</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{cert.courseTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-[#003A91] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">{t.issuedAt}</p>
                    <p className="text-sm font-bold text-gray-800">
                      {new Date(cert.issuedAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Hash size={16} className="text-[#003A91] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400">{t.certificateId}</p>
                    <p className="text-sm font-mono font-bold text-gray-800 truncate">{cert.certificateId}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-800">
                {t.home}
              </Link>
              {!isValid && (
                <>
                  <span className="text-gray-300">·</span>
                  <Link href="/courses" className="text-sm font-semibold text-[#003A91] hover:underline">
                    {t.browse}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}