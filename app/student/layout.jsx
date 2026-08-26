"use client";

// app/student/layout.jsx
//
// Phase 2 — اليوم 20-21: منطقة الطالب (My Courses). زي app/teacher/layout.jsx
// بالظبط في الفكرة: middleware.js أصلاً بيحمي أي مسار يبدأ بـ /student
// (بيredirect أي حد مش مسجل دخول أو role مش مسموح بيه). الفحص هنا طبقة UX
// إضافية بس (شاشة تحميل/تحويل واضحة بدل ما يستنى redirect السيرفر أو
// يشوف flash للمحتوى قبل ما يترحّل)، مش بديل عن الحماية الحقيقية اللي في
// middleware.js.
//
// 🔒 (تحديث) /student بقى مقصور على role="student" بس. أدمن اللي يحاول
// يدخل هنا بيترحّل لـ /admin، ومدرس بيترحّل لـ /teacher — نفس منطق
// middleware.js بالظبط (redirectByRole)، عشان لو حصل أي تأخير بسيط قبل ما
// الـ server redirect يوصل، الكلايينت ميوريش محتوى الطالب أصلاً.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader, BookOpen } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 نصوص شاشة "مفيش صلاحية وصول" كانت عربي ثابت — دلوقتي بتتبع اللغة
// المختارة من الناف بار.
const T = {
  en: {
    noAccess: "Access denied",
    mustLogin: "You need to log in first to see your courses.",
    backHome: "Back to home",
  },
  ar: {
    noAccess: "مفيش صلاحية وصول",
    mustLogin: "لازم تسجّل دخولك الأول عشان تشوف كورساتك.",
    backHome: "الرجوع للرئيسية",
  },
  es: {
    noAccess: "Acceso denegado",
    mustLogin: "Debes iniciar sesión primero para ver tus cursos.",
    backHome: "Volver al inicio",
  },
};

const REDIRECT_BY_ROLE = { admin: "/admin", teacher: "/teacher" };

function Blocked({ t }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <BookOpen className="text-red-400" size={30} />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.noAccess}</h2>
      <p className="text-gray-400 mb-4">{t.mustLogin}</p>
      <Link href="/" className="text-blue-600 font-semibold hover:underline">
        {t.backHome}
      </Link>
    </div>
  );
}

export default function StudentLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const role = session?.user?.role;

  useEffect(() => {
    if (status !== "authenticated") return;
    const target = REDIRECT_BY_ROLE[role];
    if (target) router.replace(target);
  }, [status, role, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  // أدمن/مدرس: بننتظر الـ redirect فوق (useEffect) من غير ما نوري محتوى
  // الطالب ولا شاشة "Blocked" بالغلط.
  if (REDIRECT_BY_ROLE[role]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (status === "unauthenticated" || role !== "student") {
    return <Blocked t={t} />;
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}