"use client";

// app/onboarding/page.jsx
//
// 🆕 خطوات "أول مرة" اللي بتظهر تلقائي بعد ما مستخدم يعمل حساب جديد
// (LoginRegisterForm.jsx بيعمل router.push("/onboarding") بعد أول نجاح
// تسجيل + دخول). التدفق مستوحى من onboarding بتاع Coursera بالظبط:
//
//   Step 1  → "Hello {name}!" + اختيار الهدف (مفيش رقم خطوة ظاهر هنا،
//             زي الأصل بالظبط).
//   Step 2 of 4 → الدور الحالي (قايمة جاهزة + بحث + "Something else" بيديله
//             Input يكتب فيه اسم الدور بنفسه لو مش موجود).
//   Step 3 of 4 → المهارات المطلوب تطويرها (اختيار متعدد + بحث).
//   Step 4 of 4 → المستوى التعليمي (اختيار واحد) → "Finish".
//
// أي محاولة دخول مباشرة على /onboarding من مستخدم خلّص الخطوات دي قبل كده
// بترجعه على طول لداشبورده (GET /api/onboarding بيرجّع completed=true).
// middleware.js بيمنع أصلًا أي حد مش مسجل دخول من الوصول للصفحة دي.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Cairo } from "next/font/google";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 فونت Cairo لصفحة الـ onboarding بس (بيدعم عربي/إنجليزي مع بعض بخط
// واحد متسق، بدل ما نبدّل الفونت حسب اللغة زي باقي الموقع).
const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

/* ═══════════════════════════════════════════════════════
   i18n
═══════════════════════════════════════════════════════ */
const I18N = {
  ar: {
    dir: "rtl",
    exit: "خروج",
    loading: "جارِ التحميل...",
    saving: "جارِ الحفظ...",
    back: "رجوع",
    next: "التالي",
    finish: "إنهاء",
    stepOf: (n) => `الخطوة ${n} من 4`,
    step1Hello: (name) => `أهلاً بيك يا ${name}!`,
    // 🆕 اتقسمت لسطرين — السؤال الأخير ("إيه هدفك؟") بقى في سطر لوحده تحت
    step1SubtitleMain: "احكيلنا شوية عن نفسك عشان نقدر نديك أفضل الاقتراحات.",
    step1Question: "الأول، إيه هدفك؟",
    step2Title: "تمام! إيه هو دورك الحالي؟",
    step2Search: "دوّر على دور",
    step3Title: "اختار المهارات اللي عايز تطورها",
    step3Subtitle: "دي مقترحة على حسب دورك (أدوارك)",
    step3Search: "دوّر على مهارة",
    step4Title: "تمام! إيه أعلى مؤهل دراسي عندك؟",
    viewMoreRoles: "عرض أدوار أكتر",
    somethingElse: "حاجة تانية",
    somethingElsePlaceholder: "اكتب اسم دورك الحالي",
    idk: "مش عارف",
    errGeneric: "حصل خطأ، حاول تاني",
    goals: [
      { key: "start_career", label: "بدء مسيرتي المهنية" },
      { key: "change_career", label: "تغيير مسيرتي المهنية" },
      { key: "grow_current_role", label: "التطور في دوري الحالي" },
      { key: "explore_topics", label: "استكشاف مواضيع خارج شغلي" },
    ],
    educationLevels: [
      { key: "less_than_high_school", label: "أقل من الثانوية العامة (أو ما يعادلها)" },
      { key: "high_school", label: "الثانوية العامة (أو ما يعادلها)" },
      { key: "some_college", label: "دراسة جامعية بدون تخرج" },
      { key: "associate", label: "دبلوم فوق متوسط (Associate)" },
      { key: "bachelor", label: "بكالوريوس / ليسانس" },
      { key: "master", label: "ماجستير" },
      { key: "professional", label: "دبلوم مهني عالي (دكتور، محاماة...)" },
      { key: "doctorate", label: "دكتوراه (PhD)" },
    ],
  },
  en: {
    dir: "ltr",
    exit: "Exit",
    loading: "Loading...",
    saving: "Saving...",
    back: "Back",
    next: "Next",
    finish: "Finish",
    stepOf: (n) => `Step ${n} of 4`,
    step1Hello: (name) => `Hello ${name}!`,
    // 🆕 split into two lines — the question line stands alone underneath
    step1SubtitleMain: "Tell me a little about yourself so I can make the best recommendations.",
    step1Question: "First, what's your goal?",
    step2Title: "Great! What is your current role?",
    step2Search: "Find a role",
    step3Title: "Select the skills you'd like to develop",
    step3Subtitle: "These are recommended based on your role(s)",
    step3Search: "Find a skill",
    step4Title: "Got it! What's your highest level of education?",
    viewMoreRoles: "View more roles",
    somethingElse: "Something else",
    somethingElsePlaceholder: "Type your current role",
    idk: "I don't know",
    errGeneric: "Something went wrong, try again",
    goals: [
      { key: "start_career", label: "Start my career" },
      { key: "change_career", label: "Change my career" },
      { key: "grow_current_role", label: "Grow in my current role" },
      { key: "explore_topics", label: "Explore topics outside of work" },
    ],
    educationLevels: [
      { key: "less_than_high_school", label: "Less than high school diploma (or equivalent)" },
      { key: "high_school", label: "High school diploma (or equivalent)" },
      { key: "some_college", label: "Some college, but no degree" },
      { key: "associate", label: "Associate Degree (e.g., AA, AS)" },
      { key: "bachelor", label: "Bachelor's degree (e.g., BA, AB, BS)" },
      { key: "master", label: "Master's degree (e.g., MA, MS, MEng, MEd, MSW, MBA)" },
      { key: "professional", label: "Professional school degree (e.g., MD, DDS, DVM, LLB, JD)" },
      { key: "doctorate", label: "Doctorate degree (e.g., PhD, EdD)" },
    ],
  },
};

/* أدوار جاهزة — أول 9 هما اللي ظاهرين على طول (زي شاشة Coursera)، والباقي
   بيظهر بعد "View more roles". كل دور معاه أيقونة + مفتاح لون من STEP2_COLORS. */
const ROLE_OPTIONS = [
  { key: "dei_specialist", ar: "أخصائي تنوع وشمول", en: "Diversity, Equity, and Inclusion Specialist", icon: "users", color: 0 },
  { key: "data_scientist", ar: "عالم بيانات", en: "Data Scientist", icon: "bolt", color: 1 },
  { key: "ml_engineer", ar: "مهندس تعلم آلي", en: "Machine Learning Engineer", icon: "chip", color: 2 },
  { key: "content_creator", ar: "صانع محتوى", en: "Content Creator", icon: "pencil", color: 3 },
  { key: "data_analyst", ar: "محلل بيانات", en: "Data Analyst", icon: "chart", color: 1 },
  { key: "bi_analyst", ar: "محلل ذكاء أعمال", en: "Business Intelligence Analyst", icon: "bars", color: 1 },
  { key: "it_pm", ar: "مدير مشاريع تقنية", en: "IT Project Manager", icon: "clipboard", color: 2 },
  { key: "cio", ar: "مدير تقنية معلومات", en: "Chief Information Officer", icon: "laptop", color: 2 },
  { key: "cyber_security", ar: "أخصائي أمن سيبراني", en: "Cyber Security Specialist / Technician", icon: "lock", color: 2 },
  { key: "software_engineer", ar: "مهندس برمجيات", en: "Software Engineer", icon: "code", color: 2 },
  { key: "product_manager", ar: "مدير منتج", en: "Product Manager", icon: "clipboard", color: 3 },
  { key: "ux_ui_designer", ar: "مصمم UX/UI", en: "UX/UI Designer", icon: "pencil", color: 3 },
  { key: "marketing_manager", ar: "مدير تسويق", en: "Marketing Manager", icon: "bars", color: 0 },
  { key: "sales_manager", ar: "مدير مبيعات", en: "Sales Manager", icon: "chart", color: 0 },
  { key: "hr_manager", ar: "مدير موارد بشرية", en: "HR Manager", icon: "users", color: 0 },
  { key: "financial_analyst", ar: "محلل مالي", en: "Financial Analyst", icon: "chart", color: 1 },
  { key: "operations_manager", ar: "مدير عمليات", en: "Operations Manager", icon: "clipboard", color: 2 },
  { key: "customer_success", ar: "مدير نجاح عملاء", en: "Customer Success Manager", icon: "users", color: 3 },
  { key: "teacher_role", ar: "معلم / مدرب", en: "Teacher / Instructor", icon: "pencil", color: 1 },
  { key: "graphic_designer", ar: "مصمم جرافيك", en: "Graphic Designer", icon: "pencil", color: 3 },
];

/* مهارات جاهزة — نفس فكرة الأدوار (أول 11 ظاهرين، والبحث بيفلتر الكل). */
const SKILL_OPTIONS = [
  { key: "advocacy", ar: "المناصرة", en: "Advocacy" },
  { key: "coaching", ar: "التدريب (Coaching)", en: "Coaching" },
  { key: "presentations", ar: "تقديم العروض", en: "Presentations" },
  { key: "marketing", ar: "التسويق", en: "Marketing" },
  { key: "prioritization", ar: "ترتيب الأولويات", en: "Prioritization" },
  { key: "problem_solving", ar: "حل المشكلات", en: "Problem Solving" },
  { key: "research", ar: "البحث", en: "Research" },
  { key: "data_analysis", ar: "تحليل البيانات", en: "Data Analysis" },
  { key: "training_development", ar: "التدريب والتطوير", en: "Training and Development" },
  { key: "communication", ar: "التواصل", en: "Communication" },
  { key: "leadership", ar: "القيادة", en: "Leadership" },
  { key: "project_management", ar: "إدارة المشاريع", en: "Project Management" },
  { key: "public_speaking", ar: "التحدث أمام الجمهور", en: "Public Speaking" },
  { key: "negotiation", ar: "التفاوض", en: "Negotiation" },
  { key: "time_management", ar: "إدارة الوقت", en: "Time Management" },
  { key: "critical_thinking", ar: "التفكير النقدي", en: "Critical Thinking" },
  { key: "creativity", ar: "الإبداع", en: "Creativity" },
  { key: "teamwork", ar: "العمل الجماعي", en: "Teamwork" },
  { key: "data_visualization", ar: "تصور البيانات", en: "Data Visualization" },
  { key: "programming", ar: "البرمجة", en: "Programming" },
  { key: "digital_marketing", ar: "التسويق الرقمي", en: "Digital Marketing" },
  { key: "customer_service", ar: "خدمة العملاء", en: "Customer Service" },
  { key: "sales", ar: "المبيعات", en: "Sales" },
  { key: "writing", ar: "الكتابة", en: "Writing" },
];

// 🆕 ألوان مربعات الأدوار في Step 2 — نسخة أفتح (lighter) من نفس الألوان
// اللي كانت مستخدمة، ولون واحد سادة (مش تدرج) لكل مربع، مع مربعات أكبر
// (شوف ChoiceRow تحت).
const STEP2_COLORS = [
  "#A78BFA", // violet فاتح
  "#FBBF24", // gold/amber فاتح
  "#64748B", // navy فاتح (slate)
  "#60A5FA", // blue فاتح
];
const STEP2_OTHER_COLOR = "#9CA3AF"; // لون "حاجة تانية" — رمادي فاتح متسق مع الباقي

/* ═══════════════════════════════════════════════════════
   ICONS (SVG بسيطة عشان منضيفش تبعية تانية)
═══════════════════════════════════════════════════════ */
function Icon({ name, size = 26, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
  };
  switch (name) {
    case "rocket":
      return (
        <svg {...common}>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case "shuffle":
      return (
        <svg {...common}>
          <path d="M16 3h5v5" /><path d="M4 20L21 3" />
          <path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" />
        </svg>
      );
    case "trending":
      return (
        <svg {...common}>
          <path d="M22 7l-8.5 8.5-5-5L2 17" />
          <path d="M16 7h6v6" />
        </svg>
      );
    case "binoculars":
      return (
        <svg {...common}>
          <path d="M10 4a2 2 0 1 0-4 0v2a2 2 0 0 0 4 0z" />
          <path d="M18 4a2 2 0 1 0-4 0v2a2 2 0 0 0 4 0z" />
          <path d="M6 6l-1.5 5A4 4 0 0 0 8 16.5V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4" />
          <path d="M18 6l1.5 5A4 4 0 0 1 16 16.5V20a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-4" />
          <path d="M10 12h4" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      );
    case "chip":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common}>
          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-4" />
        </svg>
      );
    case "bars":
      return (
        <svg {...common}>
          <rect x="3" y="12" width="4" height="8" /><rect x="10" y="7" width="4" height="13" /><rect x="17" y="3" width="4" height="17" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
      );
    case "laptop":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="1" />
          <path d="M2 20h20" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case "spinner":
      return (
        <svg {...common} className={`animate-spin ${className}`}>
          <path d="M21 12a9 9 0 1 1-9-9" />
        </svg>
      );
    default:
      return null;
  }
}

const GOAL_ICONS = ["rocket", "shuffle", "trending", "binoculars"];

/* ═══════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();
  const { language, isRTL } = useLanguage();
  const { data: session, status } = useSession();
  const t = I18N[language] ?? I18N.en;

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  const [goal, setGoal] = useState(null);

  const [roleSearch, setRoleSearch] = useState("");
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null); // مفتاح دور جاهز
  const [customRole, setCustomRole] = useState(""); // نص "حاجة تانية"
  const [customRoleActive, setCustomRoleActive] = useState(false);

  const [skillSearch, setSkillSearch] = useState("");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [idkSelected, setIdkSelected] = useState(false);

  const [educationLevel, setEducationLevel] = useState(null);

  const redirectTarget = useMemo(() => {
    const role = session?.user?.role;
    if (role === "admin") return "/admin";
    if (role === "teacher") return "/teacher";
    return "/student";
  }, [session]);

  // ── الحماية على مستوى الكلايينت (طبقة UX فوق حماية middleware.js) +
  // فحص لو المستخدم خلّص onboarding قبل كده أصلًا ──
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setUserName(data.name || session?.user?.name || "");
          if (data.onboarding?.completed) {
            router.replace(redirectTarget);
            return;
          }
        }
      } catch {
        // لو فشل الفحص، سيبنا اليوزر يكمل الخطوات عادي بدل ما نعلّقه
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const displayName = userName || session?.user?.name || "";

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    const list = q
      ? ROLE_OPTIONS.filter((r) => (language === "ar" ? r.ar : r.en).toLowerCase().includes(q))
      : showAllRoles
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.slice(0, 9);
    return list;
  }, [roleSearch, showAllRoles, language]);

  const filteredSkills = useMemo(() => {
    const q = skillSearch.trim().toLowerCase();
    const list = q
      ? SKILL_OPTIONS.filter((s) => (language === "ar" ? s.ar : s.en).toLowerCase().includes(q))
      : showAllSkills
      ? SKILL_OPTIONS
      : SKILL_OPTIONS.slice(0, 11);
    return list;
  }, [skillSearch, showAllSkills, language]);

  const canNext =
    (step === 1 && !!goal) ||
    (step === 2 && (!!selectedRoleKey || (customRoleActive && customRole.trim().length > 0))) ||
    (step === 3 && (selectedSkills.length > 0 || idkSelected)) ||
    (step === 4 && !!educationLevel);

  function toggleSkill(key) {
    setIdkSelected(false);
    setSelectedSkills((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function selectIdk() {
    setSelectedSkills([]);
    setIdkSelected((v) => !v);
  }

  function pickRole(key) {
    setCustomRoleActive(false);
    setCustomRole("");
    setSelectedRoleKey((prev) => (prev === key ? null : key));
  }

  function pickSomethingElse() {
    setSelectedRoleKey(null);
    setCustomRoleActive(true);
  }

  async function handleFinish() {
    setError("");
    const roleLabel =
      customRoleActive && customRole.trim()
        ? customRole.trim()
        : (() => {
            const r = ROLE_OPTIONS.find((x) => x.key === selectedRoleKey);
            return r ? (language === "ar" ? r.ar : r.en) : "";
          })();

    const skillsPayload = idkSelected
      ? ["idk"]
      : selectedSkills.map((key) => {
          const s = SKILL_OPTIONS.find((x) => x.key === key);
          return s ? (language === "ar" ? s.ar : s.en) : key;
        });

    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          currentRole: roleLabel,
          skills: skillsPayload,
          educationLevel,
        }),
      });
      if (!res.ok) {
        setSaving(false);
        setError(t.errGeneric);
        return;
      }
      // 🆕 بعد إنهاء onboarding، المستخدم بيتنقل للصفحة الرئيسية (Home) عادي
      // بدل التوجيه حسب الـ role (admin/teacher/student) اللي كان بيحصل قبل كده.
      router.replace("/");
    } catch {
      setSaving(false);
      setError(t.errGeneric);
    }
  }

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Icon name="spinner" size={34} className="text-[#155DFC]" />
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`${cairo.className} min-h-screen bg-white flex flex-col`}
    >
      {/* ── Header ── */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#155DFC]">
            Edumaster
          </span>
          <button
            onClick={() => router.push("/")}
            className="text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors"
          >
            {t.exit}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {step > 1 && (
          <p className="text-center text-sm font-bold text-gray-400 mb-2">
            {t.stepOf(step)}
          </p>
        )}

        {step === 1 && (
          <StepGoal t={t} goal={goal} setGoal={setGoal} displayName={displayName} />
        )}

        {step === 2 && (
          <StepRole
            t={t}
            language={language}
            roleSearch={roleSearch}
            setRoleSearch={setRoleSearch}
            filteredRoles={filteredRoles}
            selectedRoleKey={selectedRoleKey}
            pickRole={pickRole}
            showAllRoles={showAllRoles}
            setShowAllRoles={setShowAllRoles}
            customRoleActive={customRoleActive}
            pickSomethingElse={pickSomethingElse}
            customRole={customRole}
            setCustomRole={setCustomRole}
          />
        )}

        {step === 3 && (
          <StepSkills
            t={t}
            language={language}
            skillSearch={skillSearch}
            setSkillSearch={setSkillSearch}
            filteredSkills={filteredSkills}
            selectedSkills={selectedSkills}
            toggleSkill={toggleSkill}
            showAllSkills={showAllSkills}
            setShowAllSkills={setShowAllSkills}
            idkSelected={idkSelected}
            selectIdk={selectIdk}
          />
        )}

        {step === 4 && (
          <StepEducation
            t={t}
            educationLevel={educationLevel}
            setEducationLevel={setEducationLevel}
          />
        )}

        {error && (
          <p className="text-center text-sm font-semibold text-red-500 mt-6">{error}</p>
        )}
      </main>

      {/* ── Footer nav ── */}
      <footer className="border-t border-gray-100 py-5">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50"
            >
              <Icon name="arrow" size={15} className={isRTL ? "" : "rotate-180"} />
              {t.back}
            </button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#155DFC] text-white text-sm font-bold hover:bg-[#0d47c4] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-900/20"
            >
              {t.next}
              <Icon name="arrow" size={15} className={isRTL ? "rotate-180" : ""} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canNext || saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#155DFC] text-white text-sm font-bold hover:bg-[#0d47c4] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-900/20"
            >
              {saving ? (
                <>
                  <Icon name="spinner" size={15} />
                  {t.saving}
                </>
              ) : (
                t.finish
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 1 — GOAL
═══════════════════════════════════════════════════════ */
// 🆕 اللون الأزرق بتاع خطوة الهدف تحديدًا — نفس اللون اللي في صور Coursera
// اللي بعتها، مستخدم كلون واحد ثابت (سادة) على الكروت الأربعة كلهم بدل
// التدرج (gradient) اللي كان مستخدم قبل كده.
const GOAL_BLUE = "#155DFC";

function StepGoal({ t, goal, setGoal, displayName }) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0a0a] text-center tracking-tight">
        {t.step1Hello(displayName || "")}
      </h1>
      {/* 🆕 الساب تايتل بقى أتقل شوية (font-semibold بدل font-medium)،
          و"إيه هدفك؟" بقت سطر مستقل تحت باقي الجملة */}
      <p className="text-gray-600 font-semibold text-center max-w-xl mx-auto mt-3 leading-relaxed">
        {t.step1SubtitleMain}
      </p>
      <p className="text-gray-800 font-bold text-center mt-1 mb-9">
        {t.step1Question}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
        {t.goals.map((g, i) => {
          const selected = goal === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setGoal(g.key)}
              className={`group rounded-2xl overflow-hidden border-2 text-start transition-all ${
                selected ? "border-[#155DFC] ring-2 ring-[#155DFC]/20" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div
                className="relative h-28 sm:h-36 flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: GOAL_BLUE }}
              >
                <div className="absolute -bottom-10 -start-6 w-40 h-40 rounded-full bg-white/10" />
                <Icon name={GOAL_ICONS[i]} size={32} className="text-white relative z-10" />
              </div>
              <div className="px-3 py-3 sm:py-4 text-center">
                <span className={`text-sm sm:text-base font-bold ${selected ? "text-[#155DFC]" : "text-[#0a0a0a]"}`}>
                  {g.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 2 — CURRENT ROLE
═══════════════════════════════════════════════════════ */
function StepRole({
  t, language, roleSearch, setRoleSearch, filteredRoles, selectedRoleKey, pickRole,
  showAllRoles, setShowAllRoles, customRoleActive, pickSomethingElse, customRole, setCustomRole,
}) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0a0a] text-center tracking-tight mb-7">
        {t.step2Title}
      </h1>

      <div className="relative max-w-xl mx-auto mb-7">
        <Icon
          name="search"
          size={17}
          className="absolute top-1/2 -translate-y-1/2 text-[#155DFC] start-4"
        />
        <input
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
          placeholder={t.step2Search}
          className="w-full ps-11 pe-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-400 outline-none focus:border-[#155DFC] focus:ring-2 focus:ring-[#155DFC]/10 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {filteredRoles.map((r) => (
          <ChoiceRow
            key={r.key}
            icon={r.icon}
            color={STEP2_COLORS[r.color]}
            label={language === "ar" ? r.ar : r.en}
            selected={selectedRoleKey === r.key}
            onClick={() => pickRole(r.key)}
          />
        ))}

        <ChoiceRow
          icon="plus"
          color={STEP2_OTHER_COLOR}
          label={t.somethingElse}
          selected={customRoleActive}
          onClick={pickSomethingElse}
        />
      </div>

      {!roleSearch && !showAllRoles && filteredRoles.length >= 9 && (
        <button
          onClick={() => setShowAllRoles(true)}
          className="flex items-center gap-1.5 text-sm font-bold text-[#155DFC] hover:underline mt-5"
        >
          <Icon name="plus" size={14} />
          {t.viewMoreRoles}
        </button>
      )}

      {customRoleActive && (
        <input
          autoFocus
          value={customRole}
          onChange={(e) => setCustomRole(e.target.value)}
          placeholder={t.somethingElsePlaceholder}
          maxLength={80}
          className="w-full mt-5 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-400 outline-none focus:border-[#155DFC] focus:ring-2 focus:ring-[#155DFC]/10 transition-all"
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 3 — SKILLS
═══════════════════════════════════════════════════════ */
function StepSkills({
  t, language, skillSearch, setSkillSearch, filteredSkills, selectedSkills, toggleSkill,
  showAllSkills, setShowAllSkills, idkSelected, selectIdk,
}) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0a0a] text-center tracking-tight">
        {t.step3Title}
      </h1>
      <p className="text-gray-400 text-sm font-medium text-center mt-2 mb-7">{t.step3Subtitle}</p>

      <div className="relative max-w-xl mx-auto mb-7">
        <Icon
          name="search"
          size={17}
          className="absolute top-1/2 -translate-y-1/2 text-[#155DFC] start-4"
        />
        <input
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          placeholder={t.step3Search}
          className="w-full ps-11 pe-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-400 outline-none focus:border-[#155DFC] focus:ring-2 focus:ring-[#155DFC]/10 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {filteredSkills.map((s) => (
          <Chip
            key={s.key}
            label={language === "ar" ? s.ar : s.en}
            selected={selectedSkills.includes(s.key)}
            onClick={() => toggleSkill(s.key)}
          />
        ))}
        <Chip label={t.idk} selected={idkSelected} onClick={selectIdk} />
      </div>

      {!skillSearch && !showAllSkills && filteredSkills.length >= 11 && (
        <button
          onClick={() => setShowAllSkills(true)}
          className="flex items-center gap-1.5 text-sm font-bold text-[#155DFC] hover:underline mt-5"
        >
          <Icon name="plus" size={14} />
          {t.viewMoreRoles}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 4 — EDUCATION LEVEL
═══════════════════════════════════════════════════════ */
function StepEducation({ t, educationLevel, setEducationLevel }) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0a0a] text-center tracking-tight mb-8">
        {t.step4Title}
      </h1>

      <div className="max-w-xl mx-auto flex flex-col gap-3">
        {t.educationLevels.map((lvl) => {
          const selected = educationLevel === lvl.key;
          return (
            <button
              key={lvl.key}
              onClick={() => setEducationLevel(lvl.key)}
              className={`flex items-center justify-between px-5 py-4 rounded-xl border-2 text-start text-sm sm:text-base font-semibold transition-all ${
                selected
                  ? "border-[#155DFC] bg-[#155DFC]/5 text-[#0a0a0a]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {lvl.label}
              {selected && <Icon name="check" size={18} className="text-[#155DFC] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED UI PIECES
═══════════════════════════════════════════════════════ */
// 🆕 مربع الأيقونة بقى أكبر (w-14 h-14 بدل w-10 h-10) ولونه سادة فاتح
// (inline style) بدل التدرج الغامق اللي كان مستخدم قبل كده.
function ChoiceRow({ icon, color, label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-start transition-all ${
        selected ? "border-[#155DFC] ring-2 ring-[#155DFC]/15" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span
        className="shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
      >
        <Icon name={icon} size={24} />
      </span>
      <span className="flex-1 text-sm font-bold text-[#0a0a0a]">{label}</span>
      <span
        className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${
          selected ? "bg-[#155DFC] border-[#155DFC] text-white" : "border-gray-300 text-gray-300"
        }`}
      >
        <Icon name={selected ? "check" : "plus"} size={13} />
      </span>
    </button>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl border-2 text-start text-sm font-bold transition-all ${
        selected
          ? "border-[#155DFC] bg-[#155DFC]/5 text-[#0a0a0a]"
          : "border-gray-200 text-[#0a0a0a] hover:border-gray-300"
      }`}
    >
      {label}
      <span
        className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${
          selected ? "bg-[#155DFC] border-[#155DFC] text-white" : "border-gray-300 text-gray-300"
        }`}
      >
        <Icon name={selected ? "check" : "plus"} size={13} />
      </span>
    </button>
  );
}