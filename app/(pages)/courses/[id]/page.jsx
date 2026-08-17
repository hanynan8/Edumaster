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

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import CourseAnnouncements from "@/app/components/CourseAnnouncements";
import LessonComments from "@/app/components/LessonComments";
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
    takeQuiz: "افتح الكويز",
    quizType: "كويز",
    quizzesTitle: "كويزات الكورس",
    assignmentsTitle: "واجبات الكورس",
    openAssignment: "افتح الواجب",
    myGradesLink: "شوف درجاتك ونتائجك",
    completed: "تم إكمال هذا الدرس",
    progressTitle: "نسبة إكمال الكورس",
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
    takeQuiz: "Open quiz",
    quizType: "Quiz",
    quizzesTitle: "Course Quizzes",
    assignmentsTitle: "Course Assignments",
    openAssignment: "Open assignment",
    myGradesLink: "View your grades & results",
    completed: "You completed this lesson",
    progressTitle: "Course completion",
  },
};

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// بيستخدم مكتبة player.js (اللي Bunny Stream بتدعمها رسميًا فوق الـ iframe
// بتاعها، وبرضو بتشتغل مع يوتيوب لأن فيها adapter مبني فيها ليه) عشان
// نعرف نمسك حدث "ended" الحقيقي (وصول الفيديو لآخره) — من غير المكتبة دي
// مفيش وسيلة نوصل لأحداث الفيديو جوه iframe من دومين تاني (Bunny/YouTube).
function VideoEmbed({ lesson, onEnded }) {
  const iframeRef = useRef(null);
  const endedFiredRef = useRef(false);

  // كل درس فيديو جديد يفضل يقدر يبعت "ended" تاني من الأول
  useEffect(() => {
    endedFiredRef.current = false;
  }, [lesson.id]);

  useEffect(() => {
    if (!lesson.videoUrl) return;
    let cancelled = false;

    function attach() {
      if (cancelled || !iframeRef.current || !window.playerjs) return;
      const player = new window.playerjs.Player(iframeRef.current);
      player.on("ready", () => {
        player.on("ended", () => {
          if (!endedFiredRef.current) {
            endedFiredRef.current = true;
            onEnded?.();
          }
        });
      });
    }

    if (window.playerjs) {
      attach();
    } else {
      let script = document.getElementById("playerjs-cdn-script");
      if (!script) {
        script = document.createElement("script");
        script.id = "playerjs-cdn-script";
        script.src = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener("load", attach);
    }

    return () => {
      cancelled = true;
    };
  }, [lesson.videoUrl, lesson.id, onEnded]);

  if (!lesson.videoUrl) return null;

  let src;
  if (lesson.videoProvider === "youtube") {
    // يقبل رابط youtube كامل أو ID مباشرة. enablejsapi=1 مطلوب عشان
    // player.js يقدر يكلّم الـ iframe عن طريق postMessage.
    const match = lesson.videoUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{6,})/);
    const videoId = match ? match[1] : lesson.videoUrl;
    src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
  } else {
    // فيديوهات Bunny Stream: buildStreamPlaybackUrl في app/lib/bunny.js
    // بيرجّع رابط صفحة iframe embed كاملة، مش ملف فيديو مباشر — لازم
    // يتحط جوه <iframe> مش جوه <video src=...>.
    src = lesson.videoUrl;
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        src={src}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function LessonRow({ lesson, t, isOpen, onToggle, hasAccess, isCompleted, onMarkComplete }) {
  const Icon = LESSON_ICONS[lesson.type] || FileText;

  // تسجيل تقدّم الطالب أوتوماتيك:
  // - نص/PDF: بمجرد ما الطالب يفتح الدرس (isOpen بيتحول true).
  // - فيديو: عند وصوله لآخره (VideoEmbed بينده onEnded تحت، مش هنا).
  useEffect(() => {
    if (!hasAccess || isCompleted) return;
    if (isOpen && (lesson.type === "text" || lesson.type === "pdf")) {
      onMarkComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lesson.type, hasAccess, isCompleted]);

  // Phase 4 — اليوم 42: درس النوع "quiz" مالوش videoUrl/textContent/fileUrl
  // خالص — محتواه الفعلي (الأسئلة) في مستند Quiz منفصل ومحمي بفحصه الخاص
  // (شوف /api/quizzes/[id]). هنا بس بنقرر نعرض لينك يودّي لصفحة الحل ولا
  // قفل، حسب وصول الطالب للكورس ده (hasAccess) أو preview.
  if (lesson.type === "quiz") {
    const canOpenQuiz = Boolean(lesson.quiz) && (lesson.isPreview || hasAccess);
    return (
      <div className="border-b border-gray-100 last:border-0">
        {canOpenQuiz ? (
          <Link
            href={`/student/quizzes/${lesson.quiz}`}
            className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-start hover:bg-gray-50 transition-colors"
          >
            <Icon size={17} className="text-[#1D6FD8] shrink-0" />
            <span className="flex-1 text-sm font-medium text-gray-700 truncate">{lesson.title}</span>
            {lesson.isPreview && (
              <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full shrink-0">
                {t.preview}
              </span>
            )}
            <span className="text-xs font-semibold text-[#1D6FD8] shrink-0">{t.takeQuiz}</span>
          </Link>
        ) : (
          <div className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 opacity-70 cursor-not-allowed">
            <Lock size={16} className="text-gray-400 shrink-0" />
            <span className="flex-1 text-sm font-medium text-gray-700 truncate">{lesson.title}</span>
          </div>
        )}
        {!canOpenQuiz && (
          <div className="px-4 sm:px-5 pb-3 -mt-1">
            <p className="text-xs text-gray-400">{t.lockedHint}</p>
          </div>
        )}
      </div>
    );
  }

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
          isCompleted ? (
            <CheckCircle2 size={17} className="text-green-500 shrink-0" />
          ) : (
            <Icon size={17} className="text-[#1D6FD8] shrink-0" />
          )
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
          {lesson.type === "video" && (
            <VideoEmbed
              lesson={lesson}
              onEnded={() => {
                if (hasAccess && !isCompleted) onMarkComplete();
              }}
            />
          )}
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
          {/* تسجيل تقدّم الطالب بقى تلقائي بالكامل (نص/PDF عند الفتح،
              فيديو عند وصوله لآخره) — هنا بنعرض بس تأكيد بصري لو الدرس
              اتسجل مكتمل، مفيش زرار يدوي. */}
          {hasAccess && isCompleted && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 mt-3">
              <CheckCircle2 size={14} /> {t.completed}
            </div>
          )}

          {/* Phase 6 — اليوم 48-49: نقاش الدرس لطالب عنده وصول فعلي بس
              (مش لزائر preview — نفس شرط /api/lessons/[id]/comments). */}
          {hasAccess && <LessonComments lessonId={lesson.id} />}
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

// كل الكورسات دلوقتي حقيقية (Course model) — مفيش تفرقة "admin-" تاني.
// الصفحة بتجيب الكورس من /api/courses/[id] وتعرض النسخة اللغوية المناسبة
// من course.i18n حسب لغة الموقع الحالية.
export default function CourseDetailPage({ params }) {
  const { id } = usePromise(params);
  return <RealCourseDetail id={id} />;
}

function RealCourseDetail({ id }) {
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
  // Phase 4 — اليوم 42: كويزات وواجبات الكورس المنشورة، بتتعرض تحت المحتوى
  // (روابط مباشرة لصفحات الحل/التسليم للطالب المسجّل).
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  // تتبع تقدّم الطالب: أي درس (فيديو/PDF/نص) بيتحدد "مكتمل" لما الطالب
  // يضغط الزرار داخل LessonRow — ده اللي فعليًا بيحسب في نسبة إكمال الكورس
  // (progressPercent)، شوف app/lib/progressHelpers.js.
  const [markingLessonId, setMarkingLessonId] = useState(null);

  async function loadAll() {
    try {
      const [courseRes, sectionsRes, quizzesRes, assignmentsRes] = await Promise.all([
        fetch(`/api/courses/${id}`),
        fetch(`/api/courses/${id}/sections`),
        fetch(`/api/quizzes?course=${id}`),
        fetch(`/api/assignments?course=${id}`),
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
      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData.quizzes || []);
      }
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.assignments || []);
      }
    } catch {
      setError(t.error);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // IDs الدروس المكتملة من enrollment.completedLessons — enrollment هنا
  // ممكن يبقى false (زائر) أو null (لسه بيحمّل) أو { enrolled, enrollment, ... }.
  const completedLessonIds = new Set(enrollment?.enrollment?.completedLessons || []);

  async function handleMarkComplete(lessonId) {
    if (markingLessonId === lessonId) return; // منع ضغطات/نداءات متكررة لنفس الدرس
    setMarkingLessonId(lessonId);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        // نحدّث enrollment محليًا (completedLessons + progressPercent) من
        // غير ما نعمل reload كامل للصفحة — نفس شكل الـ object اللي بيرجع
        // من GET /api/enrollments?course=id.
        setEnrollment((prev) => {
          if (!prev || !prev.enrollment) return prev;
          const prevCompleted = prev.enrollment.completedLessons || [];
          const nextCompleted = prevCompleted.includes(lessonId)
            ? prevCompleted
            : [...prevCompleted, lessonId];
          return {
            ...prev,
            enrollment: {
              ...prev.enrollment,
              completedLessons: nextCompleted,
              progressPercent: data.progressPercent ?? prev.enrollment.progressPercent,
            },
          };
        });
      }
    } catch {
      // فشل الشبكة — نسيب الزرار زي ما هو، الطالب يقدر يحاول تاني
    } finally {
      setMarkingLessonId(null);
    }
  }

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

  // 🆕 النسخة المترجمة المناسبة للغة الموقع الحالية — لو مش متوفرة، بترجع
  // للحقول الأساسية بتاعة الكورس (نسخة لغة الكورس الافتراضية).
  const i18nEntry = course.i18n?.[language] || course.i18n?.en || null;
  const categoryI18nEntry = course.categoryI18n?.[language] || course.categoryI18n?.en || null;
  const loc = {
    title: i18nEntry?.title || course.title,
    shortDescription: i18nEntry?.shortDescription || course.shortDescription,
    description: i18nEntry?.description || course.description,
    categoryName: categoryI18nEntry?.name || course.categoryName,
    requirements: i18nEntry?.requirements?.length ? i18nEntry.requirements : course.requirements,
    outcomes: i18nEntry?.outcomes?.length ? i18nEntry.outcomes : course.outcomes,
    certification: i18nEntry?.certification?.name ? i18nEntry.certification : null,
  };

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
              {loc.categoryName && (
                <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#1D6FD8] bg-white/10 px-3 py-1 rounded-full mb-4">
                  {loc.categoryName}
                </span>
              )}
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-3">{loc.title}</h1>
              {loc.shortDescription && (
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-5">{loc.shortDescription}</p>
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
                        hasAccess={isOwner || isEnrolled}
                        isCompleted={completedLessonIds.has(lesson.id)}
                        onMarkComplete={() => handleMarkComplete(lesson.id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* نسبة إكمال الكورس — بتتحسب سيرفر-سايد في
                recomputeEnrollmentProgress (دروس مكتملة + كويزات منجوحة)،
                هنا بس بنعرض القيمة الجاهزة من enrollment.progressPercent. */}
            {isEnrolled && !isOwner && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-800">{t.progressTitle}</h3>
                  <span className="text-sm font-black text-[#1D6FD8]">
                    {enrollment?.enrollment?.progressPercent ?? 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1D6FD8] rounded-full transition-all"
                    style={{ width: `${enrollment?.enrollment?.progressPercent ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Phase 6 — اليوم 46-47: إعلانات الكورس لصاحب الكورس/أدمن أو
                طالب مسجّل فعليًا — نفس شرط الوصول اللي الـ API بيفرضه. */}
            {(isOwner || isEnrolled) && <CourseAnnouncements courseId={id} />}

            {isEnrolled && (quizzes.length > 0 || assignments.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                {quizzes.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">{t.quizzesTitle}</h3>
                    <ul className="space-y-2">
                      {quizzes.map((q) => (
                        <li key={q.id}>
                          <Link
                            href={`/student/quizzes/${q.id}`}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1D6FD8] transition-colors"
                          >
                            <HelpCircle size={14} className="text-[#1D6FD8] shrink-0" />
                            <span className="truncate flex-1">{q.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {assignments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-3">{t.assignmentsTitle}</h3>
                    <ul className="space-y-2">
                      {assignments.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/student/assignments/${a.id}`}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1D6FD8] transition-colors"
                          >
                            <FileText size={14} className="text-[#1D6FD8] shrink-0" />
                            <span className="truncate flex-1">{a.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  href="/student/grades"
                  className="block text-center text-xs font-semibold text-[#1D6FD8] hover:underline mt-4 pt-4 border-t border-gray-100"
                >
                  {t.myGradesLink}
                </Link>
              </div>
            )}

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