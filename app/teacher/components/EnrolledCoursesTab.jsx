"use client";

// app/teacher/components/EnrolledCoursesTab.jsx
//
// 🆕 تاب "الدورات المسجّل فيها" في داشبورد المدرّس.
//
// الموديريتور ممكن يسجّل مدرّس كطالب مجانًا في كورس (خانة "Enroll students or
// teachers for free" → Enrollment بمصدر moderator_grant). المدرّس مابيدخلش
// /student (الـ middleware بيرحّله لـ /teacher)، وداشبورده بيعرض كورساته اللي
// بيدرّسها بس — فكان التسجيل موجود في الداتابيز ومفيش أي مكان يظهر فيه.
//
// التاب ده بيجيب GET /api/enrollments (نفس اللي صفحة الطالب بتستخدمه) وبيعرض نفس
// كروت "دوراتي" بتاعة الطالب: صورة + عدد الدروس + التقدّم + استكمال. الـ API
// بيرجّع الكورسات المنشورة بس (الكورس لسه pending مابيظهرش لأن صفحته 404).

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const T = {
  en: {
    empty: "You haven't been enrolled in any course yet",
    emptyHint: "Courses an admin enrolls you in will show up here once they're published.",
    error: "Failed to load your enrolled courses",
    lessons: (n) => `${n} lessons`,
    progress: (p) => `${p}% complete`,
    completed: "Completed",
    continueLabel: "Continue",
    sourceLabels: {
      free: "Free",
      membership: "Via your membership",
      purchase: "Purchased",
      admin_grant: "Granted by admin",
      moderator_grant: "Granted by admin",
      supervisor_grant: "Supervising teacher (free)",
    },
  },
  ar: {
    empty: "لم يتم تسجيلك في أي دورة بعد",
    emptyHint: "الدورات التي تسجّلك فيها الإدارة ستظهر هنا بمجرد نشرها.",
    error: "تعذّر تحميل الدورات المسجّل فيها",
    lessons: (n) => `${n} درس`,
    progress: (p) => `${p}% مكتمل`,
    completed: "مكتمل",
    continueLabel: "استكمال",
    sourceLabels: {
      free: "مجاني",
      membership: "عن طريق اشتراكك",
      purchase: "شراء",
      admin_grant: "منحة من الإدارة",
      moderator_grant: "منحة من الإدارة",
      supervisor_grant: "مدرّس مشرف (مجاني)",
    },
  },
  es: {
    empty: "Aún no te han inscrito en ningún curso",
    emptyHint: "Los cursos en los que te inscriba la administración aparecerán aquí cuando se publiquen.",
    error: "No se pudieron cargar tus cursos inscritos",
    lessons: (n) => `${n} lecciones`,
    progress: (p) => `${p}% completado`,
    completed: "Completado",
    continueLabel: "Continuar",
    sourceLabels: {
      free: "Gratis",
      membership: "Con tu membresía",
      purchase: "Comprado",
      admin_grant: "Otorgado por la administración",
      moderator_grant: "Otorgado por la administración",
      supervisor_grant: "Profesor supervisor (gratis)",
    },
  },
};

export default function EnrolledCoursesTab({ onLoaded }) {
  const { language, isRTL } = useLanguage();
  const t = T[language] || T.en;
  const [enrollments, setEnrollments] = useState(null);
  const [error, setError] = useState("");
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/enrollments");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "load_failed");
        if (cancelled) return;
        const list = Array.isArray(data?.enrollments) ? data.enrollments : [];
        setEnrollments(list);
        setError("");
        onLoaded?.(list.length);
      } catch {
        if (!cancelled) {
          setEnrollments([]);
          setError(t.error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  if (enrollments === null) {
    return (
      <div className="flex justify-center py-20">
        <span aria-hidden="true" className="block" style={{ height: 36 }} />
      </div>
    );
  }

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

      {!error && enrollments.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center px-4">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500 mb-1">{t.empty}</p>
          <p className="text-sm text-gray-400">{t.emptyHint}</p>
        </div>
      )}

      {enrollments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 group-hover:text-[#003A91] transition-colors">
                  {e.courseTitle || "—"}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                  <Clock size={13} /> {t.lessons(e.courseTotalLessonsCount || 0)}
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-[#003A91] rounded-full transition-all"
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
                    <span className="flex items-center gap-1 text-[#003A91] font-semibold">
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
  );
}