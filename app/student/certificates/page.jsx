"use client";

// app/student/certificates/page.jsx
//
// 🩹 Day 59 audit fix: الملف ده كان نسخة قديمة متروكة بالغلط من
// app/student/page.jsx ("كورساتي") — بيانات ومحتوى تاني تمامًا، من غير أي
// اتصال بـ GET /api/certificates ولا زرار تحميل. يعني آخر خطوة في رحلة
// الطالب (تسجيل → اشتراك → دفع → دراسة → كويز → شهادة) كانت مكسورة فعليًا
// في الواجهة حتى لو الـ API والـ PDF generation شغالين صح. اتبنى من جديد
// هنا كصفحة شهادات حقيقية:
//
//   - GET /api/certificates → { certificates: [{ id, certificateId,
//       course, courseTitle, courseSlug, courseThumbnail, studentName,
//       issuedAt }] }
//   - زرار "تحميل" لكل شهادة بيروح لـ
//       GET /api/certificates/[id]/download (PDF, attachment)
//   - زرار "تحقق" بيودّي لصفحة /verify/[certificateId] العامة (لو موجودة)

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { Award, Loader, Download, ShieldCheck, BookOpen, Calendar, ArrowRight, ArrowLeft } from "lucide-react";

const STRINGS = {
  ar: {
    title: "شهاداتي",
    subtitle: "الشهادات اللي حصلت عليها بعد إكمال الكورسات",
    myCourses: "كورساتي",
    empty: "لسه معندكش أي شهادة",
    emptyHint: "كمّل أي كورس بنسبة 100% وهتلاقي شهادتك هنا تلقائيًا",
    browse: "تصفّح الكورسات",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل شهاداتك",
    issuedOn: (d) => `صدرت في ${d}`,
    download: "تحميل PDF",
    downloading: "جارِ التحميل...",
    downloadError: "تعذّر تحميل الشهادة، حاول تاني",
    verify: "رابط التحقق",
    certId: "رقم الشهادة",
  },
  en: {
    title: "My Certificates",
    subtitle: "Certificates you've earned after completing courses",
    myCourses: "My Courses",
    empty: "You don't have any certificates yet",
    emptyHint: "Complete a course 100% and your certificate will appear here automatically",
    browse: "Browse Courses",
    loading: "Loading...",
    error: "Couldn't load your certificates",
    issuedOn: (d) => `Issued on ${d}`,
    download: "Download PDF",
    downloading: "Downloading...",
    downloadError: "Couldn't download the certificate, try again",
    verify: "Verify link",
    certId: "Certificate ID",
  },
};

function CertificateCard({ cert, t, isRTL }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  async function handleDownload() {
    setDownloading(true);
    setDownloadError("");
    try {
      const res = await fetch(`/api/certificates/${cert.id}/download`);
      if (!res.ok) throw new Error("download_failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edumaster-certificate-${cert.certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t.downloadError);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-32 bg-gradient-to-br from-[#0a0a0a] to-[#1D6FD8] flex items-center justify-center">
        {cert.courseThumbnail ? (
          <Image src={cert.courseThumbnail} alt={cert.courseTitle || ""} fill unoptimized className="object-cover opacity-30" />
        ) : null}
        <Award className="text-white relative z-10" size={40} />
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-1">{cert.courseTitle || "—"}</h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <Calendar size={13} /> {t.issuedOn(new Date(cert.issuedAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US"))}
        </div>
        <p className="text-[11px] text-gray-300 mb-3 font-mono">{t.certId}: {cert.certificateId}</p>

        {downloadError && <p className="text-xs text-red-500 mb-2">{downloadError}</p>}

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#1D6FD8] text-white px-3 py-2.5 rounded-xl hover:bg-[#1a5fc0] transition-colors disabled:opacity-60"
          >
            {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? t.downloading : t.download}
          </button>
          <Link
            href={`/verify/${cert.certificateId}`}
            target="_blank"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-600 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            title={t.verify}
          >
            <ShieldCheck size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StudentCertificatesPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;

  const [certificates, setCertificates] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/certificates")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setCertificates(Array.isArray(data?.certificates) ? data.certificates : []))
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f7f7]" style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/student" className="hover:text-gray-700 flex items-center gap-1.5">
            <BackArrow size={14} /> {t.myCourses}
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-semibold">{t.title}</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0a0a0a] to-[#1D6FD8] flex items-center justify-center">
            <Award className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
            <p className="text-sm text-gray-400">{t.subtitle}</p>
          </div>
        </div>

        {certificates === null && !error && (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-[#1D6FD8]" size={32} />
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {certificates?.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <Award className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 mb-1">{t.empty}</p>
            <p className="text-gray-400 text-sm mb-4">{t.emptyHint}</p>
            <Link href="/courses" className="inline-flex items-center gap-1.5 text-[#1D6FD8] font-semibold hover:underline">
              <BookOpen size={15} /> {t.browse}
            </Link>
          </div>
        )}

        {certificates?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} cert={cert} t={t} isRTL={isRTL} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}