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

const REDIRECT_BY_ROLE = { admin: "/admin", teacher: "/teacher" };

function Blocked() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <BookOpen className="text-red-400" size={30} />
      </div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">مفيش صلاحية وصول</h2>
      <p className="text-gray-400 mb-4">لازم تسجّل دخولك الأول عشان تشوف كورساتك.</p>
      <Link href="/" className="text-blue-600 font-semibold hover:underline">
        الرجوع للرئيسية
      </Link>
    </div>
  );
}

export default function StudentLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
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
    return <Blocked />;
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}