// ═══════════════════════════════════════════════
//  app/(pages)/courses/[id]/page.jsx
//
//  اليوم 13: صفحة تفاصيل كورس عامة. بتجيب:
//    - GET /api/courses/[id]           → بيانات الكورس (404 لو draft/مش موجود)
//    - GET /api/courses/[id]/sections  → شجرة الأقسام/الدروس (السيرفر بيقرر
//      يبعت رابط الفيديو الحقيقي ولا لأ حسب الوصول — شوف الـ route)
//    - GET /api/enrollments?course=id  → { enrolled, hasAccess, accessSource }
//      (لو مسجل دخول أصلاً)
//
//  الفيديو نفسه مقفول (بيظهر قفل بدل الزرار) لأي درس مش preview ومفيش
//  videoUrl راجع من السيرفر — يعني الطالب لسه مالوش وصول. الزرار "اشترك"
//  بيستخدم POST /api/enrollments (كورسات مجانية، أو كورس مدفوع لو عنده
//  membership نشطة بتغطيه — Phase 2 اليوم 18-19/22؛ غير كده بيوجّه لرسالة
//  "قريبًا" لحد ما يتبني مسار الدفع المباشر).
//
//  🔒 Phase 2 — اليوم 22: عضو membership نشطة بيشوف المحتوى مفتوح فورًا
//  (hasAccess=true) حتى لو مالوش سجل Enrollment صريح لسه — بنسجّله تلقائيًا
//  وبهدوء في الخلفية أول ما نكتشف كده (عشان تتبع التقدّم يشتغل من غير ما
//  نطلب منه يضغط زرار).
// ═══════════════════════════════════════════════
"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import {
  Lock, PlayCircle, FileText, FileType2, HelpCircle, ChevronDown,
  Clock, Users, Award, BookOpen, CheckCircle2, Loader, ArrowRight, ArrowLeft,
} from "lucide-react";

const LESSON_ICONS = { video: PlayCircle, pdf: FileType2, text: FileText, quiz: HelpCircle };

const STRINGS = {
  ar: {
    back: "كل الكورسات",
    by: "بواسطة",
    free: "مجاني",
    levels: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" },
    lessonsCount: (n) => `${n} درس`,
    studentsCount: (n) => `${n} طالب`,
    content: "محتوى الكورس",
    requirements: "المتطلبات",
    outcomes: "هتتعلم إيه",
    enroll: "اشترك في الكورس",
    buyNow: "اشترِ الآن",
    enrolling: "جارِ التسجيل...",
    redirecting: "جارِ التحويل لـ PayPal...",
    enrolled: "أنت مسجّل في هذا الكورس",
    includedInMembership: "متضمّن في اشتراكك الحالي",
    loginToEnroll: "سجّل دخولك للاشتراك في الكورس",
    login: "تسجيل الدخول",
    paymentSoon: "الدفع الإلكتروني غير متاح حاليًا — تواصل مع الإدارة للتسجيل اليدوي",
    paymentGatewayError: "تعذّر بدء عملية الدفع، حاول مرة أخرى",
    ownCourse: "هذا كورسك — تقدر تدير محتواه من لوحة المدرس",
    manage: "إدارة المحتوى",
    locked: "مقفول",
    preview: "معاينة مجانية",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل الكورس",
    noSections: "لسه مفيش محتوى مضاف للكورس ده",
    lockedHint: "اشترك في الكورس عشان تفتح الدرس ده",
  },
  en: {
    back: "All Courses",
    by: "by",
    free: "Free",
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    lessonsCount: (n) => `${n} lessons`,
    studentsCount: (n) => `${n} students`,
    content: "Course Content",
    requirements: "Requirements",
    outcomes: "What you'll learn",
    enroll: "Enroll in this course",
    buyNow: "Buy Now",
    enrolling: "Enrolling...",
    redirecting: "Redirecting to PayPal...",
    enrolled: "You're enrolled in this course",
    includedInMembership: "Included in your current membership",
    loginToEnroll: "Log in to enroll in this course",
    login: "Log In",
    paymentSoon: "Online payment isn't available right now — contact us to enroll manually",
    paymentGatewayError: "Couldn't start the payment, please try again",
    ownCourse: "This is your course — manage its content from the teacher dashboard",
    manage: "Manage Content",
    locked: "Locked",
    preview: "Free Preview",
    loading: "Loading...",
    error: "Couldn't load this course",
    noSections: "No content has been added to this course yet",
    lockedHint: "Enroll in the course to unlock this lesson",
  },
};

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function VideoEmbed({ lesson }) {
  if (!lesson.videoUrl) return null;
  if (lesson.videoProvider === "youtube") {
    // يقبل رابط youtube كامل أو ID مباشرة
    const match = lesson.videoUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{6,})/);
    const videoId = match ? match[1] : lesson.videoUrl;
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video controls className="w-full aspect-video rounded-xl bg-black" src={lesson.videoUrl} />
  );
}

function LessonRow({ lesson, t, isOpen, onToggle }) {
  const Icon = LESSON_ICONS[lesson.type] || FileText;
  const unlocked = Boolean(lesson.videoUrl || lesson.textContent || lesson.fileUrl) || lesson.isPreview;
  const canOpen = unlocked && (lesson.type === "video" ? Boolean(lesson.videoUrl) : true);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => canOpen && onToggle(lesson.id)}
        className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-start transition-colors ${
          canOpen ? "hover:bg-gray-50 cursor-pointer" : "cursor-not-allowed opacity-70"
        }`}
      >
        {canOpen ? (
          <Icon size={17} className="text-[#1D6FD8] shrink-0" />
        ) : (
          <Lock size={16} className="text-gray-400 shrink-0" />
        )}
        <span className="flex-1 text-sm font-medium text-gray-700 truncate">{lesson.title}</span>
        {lesson.isPreview && (
          <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full shrink-0">
            {t.preview}
          </span>
        )}
        {lesson.type === "video" && lesson.durationSeconds > 0 && (
          <span className="text-xs text-gray-400 shrink-0">{formatDuration(lesson.durationSeconds)}</span>
        )}
        {canOpen && (
          <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen && canOpen && (
        <div className="px-4 sm:px-5 pb-4">
          {lesson.type === "video" && <VideoEmbed lesson={lesson} />}
          {lesson.type === "text" && lesson.textContent && (
            <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 rounded-xl p-4">
              {lesson.textContent}
            </div>
          )}
          {lesson.type === "pdf" && lesson.fileUrl && (
            <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1D6FD8] hover:underline">
              <FileType2 size={15} /> {lesson.title}
            </a>
          )}
        </div>
      )}

      {!canOpen && (
        <div className="px-4 sm:px-5 pb-3 -mt-1">
          <p className="text-xs text-gray-400">{t.lockedHint}</p>
        </div>
      )}
    </div>
  );
}

export default function CourseDetailPage({ params }) {
  const { id } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const { data: session, status: sessionStatus } = useSession();
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState(null);
  const [enrollment, setEnrollment] = useState(null); // { enrolled, enrollment } | null (لسه بيحمّل) | false (زائر)
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [openLessonId, setOpenLessonId] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  async function loadAll() {
    try {
      const [courseRes, sectionsRes] = await Promise.all([
        fetch(`/api/courses/${id}`),
        fetch(`/api/courses/${id}/sections`),
      ]);
      if (courseRes.status === 404) {
        setNotFound(true);
        return;
      }
      const courseData = await courseRes.json();
      const sectionsData = await sectionsRes.json();
      if (!courseRes.ok) throw new Error(courseData?.error || "error");
      setCourse(courseData);
      setSections(Array.isArray(sectionsData) ? sectionsData : []);
    } catch {
      setError(t.error);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // حالة الاشتراك بتتجاب لوحدها بعد ما نعرف فيه session ولا لأ
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) {
      setEnrollment(false);
      return;
    }
    fetch(`/api/enrollments?course=${id}`)
      .then((r) => (r.ok ? r.json() : { enrolled: false, hasAccess: false }))
      .then((data) => {
        setEnrollment(data);
        // 🔒 Phase 2 — اليوم 22: عنده وصول عن طريق membership لكن لسه مفيش
        // سجل Enrollment صريح — نسجّله بهدوء في الخلفية (من غير ما نستنى
        // ضغطة زرار) عشان تتبع التقدّم يبدأ يشتغل، والزرار يبقى badge
        // "متضمّن في اشتراكك" على طول بدل "اشترك".
        if (data.hasAccess && !data.enrolled && data.accessSource === "membership") {
          fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ course: id }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((res) => {
              if (res?.enrollment) setEnrollment({ enrolled: true, hasAccess: true, accessSource: "membership", enrollment: res.enrollment });
            })
            .catch(() => {});
        }
      })
      .catch(() => setEnrollment({ enrolled: false, hasAccess: false }));
  }, [id, session, sessionStatus]);

  // 🆕 Phase 3 — اليوم 27-28: كورس مدفوع (مش متاح مجانًا وعضويتنا لو موجودة
  // مش بتغطيه) → PayPal checkout بدل POST /api/enrollments مباشرة. لو
  // enrollment.hasAccess=true (عن طريق membership) الزرار أصلاً بيظهر
  // كـ "متضمّن في اشتراكك" مش "اشتري" (شوف isViaMembership تحت)، فمفيش
  // احتمال يدفع لحاجة عنده وصول ليها بالفعل.
  async function handleBuyWithPaypal() {
    setEnrollError("");
    setEnrolling(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "course", id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.approveUrl) {
        if (data.error === "cannot_enroll_own_course") setEnrollError(t.ownCourse);
        else if (data.error === "payment_gateway_not_configured") setEnrollError(t.paymentSoon);
        else setEnrollError(t.paymentGatewayError);
        setEnrolling(false);
        return;
      }
      // بنسيب enrolling=true عشان الزرار يفضل معطّل لحد ما التحويل يحصل
      window.location.href = data.approveUrl;
    } catch {
      setEnrollError(t.paymentGatewayError);
      setEnrolling(false);
    }
  }

  async function handleEnroll() {
    // كورس مدفوع فعليًا (isFree=false) والمستخدم مالوش وصول عن طريق
    // membership أصلاً → يودّي لـ PayPal بدل محاولة enroll مباشر هيرجع
    // 402 أكيد.
    if (!course.isFree && course.price > 0) {
      return handleBuyWithPaypal();
    }

    setEnrollError("");
    setEnrolling(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "payment_required") {
          // fallback نادر: السيرفر شايف إنه محتاج دفع رغم كده (مثلاً السعر
          // اتغيّر بعد ما الصفحة اتحملت) — نجرّب PayPal بدل ما نوقف هنا.
          return handleBuyWithPaypal();
        } else if (data.error === "cannot_enroll_own_course") {
          setEnrollError(t.ownCourse);
        } else {
          setEnrollError(t.error);
        }
        return;
      }
      setEnrollment({ enrolled: true, hasAccess: true, accessSource: data.enrollment?.source === "membership" ? "membership" : "enrollment", enrollment: data.enrollment });
      loadAll(); // يحدّث sections عشان يفتح المحتوى المقفول فورًا
    } catch {
      setEnrollError(t.error);
    } finally {
      setEnrolling(false);
    }
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-700 mb-2">404</h1>
        <p className="text-gray-400 mb-6">{t.error}</p>
        <Link href="/courses" className="text-[#1D6FD8] font-semibold hover:underline">{t.back}</Link>
      </div>
    );
  }

  if (error) {
    return <div className="max-w-2xl mx-auto px-6 py-24 text-center text-red-500">{error}</div>;
  }

  if (!course || !sections) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader className="animate-spin text-[#1D6FD8]" size={32} />
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">{t.loading}</span>
      </div>
    );
  }

  const isOwner = session?.user?.id && course.teacher === session.user.id;
  const isEnrolled = Boolean(enrollment && enrollment.enrolled);
  const isViaMembership = isEnrolled && enrollment?.accessSource === "membership";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f7f7]" style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
      {/* Hero */}
      <section className="relative bg-[#0a0a0a] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-white mb-6">
            <BackArrow size={15} /> {t.back}
          </Link>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              {course.categoryName && (
                <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#1D6FD8] bg-white/10 px-3 py-1 rounded-full mb-4">
                  {course.categoryName}
                </span>
              )}
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-3">{course.title}</h1>
              {course.shortDescription && (
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-5">{course.shortDescription}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-300">
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {t.lessonsCount(course.totalLessonsCount || 0)}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> {formatDuration(course.totalDurationSeconds)}</span>
                <span className="flex items-center gap-1.5"><Users size={14} /> {t.studentsCount(course.studentsCount || 0)}</span>
                {course.level && <span className="flex items-center gap-1.5"><Award size={14} /> {t.levels[course.level] || course.level}</span>}
                {course.teacherName && <span>{t.by} <b className="text-white">{course.teacherName}</b></span>}
              </div>
            </div>

            <div className="bg-white text-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl">
              <div className="relative h-44 bg-gray-100">
                {course.thumbnail ? (
                  <Image src={course.thumbnail} alt={course.title} fill unoptimized className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><BookOpen size={40} /></div>
                )}
              </div>
              <div className="p-5">
                <p className="text-2xl font-black mb-4">
                  {course.isFree ? t.free : `${course.price} ${course.currency || "EGP"}`}
                </p>

                {isOwner ? (
                  <Link href={`/teacher/courses/${course.id}`}
                    className="block w-full text-center bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
                    {t.manage}
                  </Link>
                ) : isEnrolled ? (
                  <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 font-bold py-3 rounded-xl">
                    <CheckCircle2 size={17} /> {isViaMembership ? t.includedInMembership : t.enrolled}
                  </div>
                ) : enrollment === false && sessionStatus !== "loading" ? (
                  <button
                    onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                    className="w-full bg-[#1D6FD8] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    {t.login}
                  </button>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling || enrollment === null}
                    className="w-full bg-[#1D6FD8] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {enrolling
                      ? (!course.isFree && course.price > 0 ? t.redirecting : t.enrolling)
                      : (!course.isFree && course.price > 0 ? t.buyNow : t.enroll)}
                  </button>
                )}
                {enrollError && <p className="text-xs text-red-500 mt-3 text-center">{enrollError}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {course.description && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">{course.description}</p>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">{t.content}</h2>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {sections.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-10">{t.noSections}</p>
                )}
                {sections.map((section) => (
                  <div key={section.id} className="border-b border-gray-100 last:border-0">
                    <div className="px-4 sm:px-5 py-3 bg-gray-50/70">
                      <h3 className="text-sm font-bold text-gray-700">{section.title}</h3>
                    </div>
                    {section.lessons.map((lesson) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        t={t}
                        isOpen={openLessonId === lesson.id}
                        onToggle={(lid) => setOpenLessonId((prev) => (prev === lid ? null : lid))}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {course.outcomes?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3">{t.outcomes}</h3>
                <ul className="space-y-2">
                  {course.outcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={15} className="text-[#1D6FD8] shrink-0 mt-0.5" /> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {course.requirements?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3">{t.requirements}</h3>
                <ul className="space-y-2 list-disc ps-5">
                  {course.requirements.map((r, i) => (
                    <li key={i} className="text-sm text-gray-600">{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitch={(next) => setAuthMode(next)}
        />
      )}
    </div>
  );
}