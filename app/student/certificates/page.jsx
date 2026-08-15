"use client";

// app/student/page.jsx
//
// Phase 2 — اليوم 20-21: صفحة "My Courses". بتجيب:
//   - GET /api/enrollments   → كورسات الطالب المسجل فيها (populated بعنوان/
//     thumbnail الكورس) + progressPercent + source (free/membership/purchase/
//     admin_grant)
//   - GET /api/membership    → حالة عضوية الطالب الحالية (لو موجودة)

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BookOpen, Loader, CheckCircle2, Clock, Crown, AlertTriangle, ArrowRight, ArrowLeft, GraduationCap, Award,
} from "lucide-react";

const STRINGS = {
  ar: {
    title: "كورساتي",
    subtitle: "الكورسات اللي انت مسجل فيها",
    empty: "لسه معملتش enroll في أي كورس",
    browse: "تصفّح الكورسات",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل كورساتك",
    lessons: (n) => `${n} درس`,
    progress: (p) => `${p}% مكتمل`,
    completed: "مكتمل",
    sourceLabels: { free: "مجاني", membership: "عن طريق اشتراكك", purchase: "شراء", admin_grant: "منحة من الإدارة" },
    membershipTitle: "اشتراكك الحالي",
    noMembership: "معندكش اشتراك membership فعّال حاليًا",
    viewPlans: "اطّلع على خطط الاشتراك",
    expiresOn: (d) => `ينتهي في ${d}`,
    neverExpires: "من غير تاريخ انتهاء",
    statusLabels: { active: "فعّالة", inactive: "غير مفعّلة", expired: "منتهية", cancelled: "ملغاة" },
    continueLabel: "استكمال",
    myGrades: "درجاتي ونتائجي",
    myCertificates: "شهاداتي",
  },
  en: {
    title: "My Courses",
    subtitle: "Courses you're enrolled in",
    empty: "You haven't enrolled in any course yet",
    browse: "Browse Courses",
    loading: "Loading...",
    error: "Couldn't load your courses",
    lessons: (n) => `${n} lessons`,
    progress: (p) => `${p}% complete`,
    completed: "Completed",
    sourceLabels: { free: "Free", membership: "Via your membership", purchase: "Purchased", admin_grant: "Granted by admin" },
    membershipTitle: "Your current membership",
    noMembership: "You don't have an active membership right now",
    viewPlans: "View membership plans",
    expiresOn: (d) => `Expires on ${d}`,
    neverExpires: "No expiry date",
    statusLabels: { active: "Active", inactive: "Inactive", expired: "Expired", cancelled: "Cancelled" },
    continueLabel: "Continue",
    myGrades: "My Grades & Results",
    myCertificates: "My Certificates",
  },
};

function MembershipCard({ membership, t, isRTL }) {
  if (!membership || !membership.plan || membership.status === "inactive") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Crown size={18} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">{t.noMembership}</p>
        </div>
        <Link href="/membership" className="text-sm font-semibold text-[#1D6FD8] hover:underline">
          {t.viewPlans}
        </Link>
      </div>
    );
  }

  const isActive = membership.status === "active";
  const isExpired = membership.status === "expired";

  return (
    <div
      className={`rounded-2xl border p-5 flex items-center justify-between flex-wrap gap-4 ${
        isActive ? "bg-gradient-to-r from-[#0a0a0a] to-[#1D6FD8] text-white border-transparent" : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? "bg-white/15" : "bg-amber-50"}`}>
          {isExpired ? <AlertTriangle size={20} className="text-amber-500" /> : <Crown size={20} className={isActive ? "text-white" : "text-amber-500"} />}
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider font-bold ${isActive ? "text-white/70" : "text-gray-400"}`}>{t.membershipTitle}</p>
          <p className="text-lg font-black">{membership.plan.name}</p>
        </div>
      </div>
      <div className="text-end">
        <span
          className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-1 ${
            isActive ? "bg-white/20 text-white" : isExpired ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {t.statusLabels[membership.status] || membership.status}
        </span>
        <p className={`text-xs ${isActive ? "text-white/80" : "text-gray-400"}`}>
          {membership.expiresAt
            ? t.expiresOn(new Date(membership.expiresAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US"))
            : t.neverExpires}
        </p>
      </div>
    </div>
  );
}

export default function StudentMyCoursesPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;

  const [enrollments, setEnrollments] = useState(null);
  const [membership, setMembership] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/enrollments").then((r) => (r.ok ? r.json() : { enrollments: [] })),
      fetch("/api/membership").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([enrollmentsData, membershipData]) => {
        setEnrollments(Array.isArray(enrollmentsData?.enrollments) ? enrollmentsData.enrollments : []);
        setMembership(membershipData);
      })
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f7f7]" style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0a0a0a] to-[#1D6FD8] flex items-center justify-center">
              <BookOpen className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
              <p className="text-sm text-gray-400">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/student/grades"
              className="flex items-center gap-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:border-[#1D6FD8] hover:text-[#1D6FD8] transition-colors"
            >
              <GraduationCap size={16} /> {t.myGrades}
            </Link>
            <Link
              href="/student/certificates"
              className="flex items-center gap-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:border-[#1D6FD8] hover:text-[#1D6FD8] transition-colors"
            >
              <Award size={16} /> {t.myCertificates}
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <MembershipCard membership={membership} t={t} isRTL={isRTL} />
        </div>

        {enrollments === null && !error && (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-[#1D6FD8]" size={32} />
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {enrollments?.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400 mb-4">{t.empty}</p>
            <Link href="/courses" className="text-[#1D6FD8] font-semibold hover:underline">
              {t.browse}
            </Link>
          </div>
        )}

        {enrollments?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((e) => (
              <Link
                key={e.id}
                href={`/courses/${e.course}`}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-36 bg-gray-100">
                  {e.courseThumbnail ? (
                    <Image src={e.courseThumbnail} alt={e.courseTitle || ""} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <BookOpen size={32} />
                    </div>
                  )}
                  <span className="absolute top-2.5 start-2.5 text-[10px] font-bold bg-white/90 text-gray-700 px-2 py-1 rounded-full">
                    {t.sourceLabels[e.source] || e.source}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-2 group-hover:text-[#1D6FD8] transition-colors">
                    {e.courseTitle || "—"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <Clock size={13} /> {t.lessons(e.courseTotalLessonsCount || 0)}
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-[#1D6FD8] rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, e.progressPercent || 0))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{t.progress(e.progressPercent || 0)}</span>
                    {e.status === "completed" ? (
                      <span className="flex items-center gap-1 text-green-600 font-semibold">
                        <CheckCircle2 size={13} /> {t.completed}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#1D6FD8] font-semibold">
                        {t.continueLabel} <BackArrow size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}