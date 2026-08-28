"use client";

// app/teacher/courses/[id]/performance/page.jsx
//
// Phase 4 — اليوم 41: "صفحة أداء الطلاب للمدرس" — جدول شامل لكل طالب مسجّل
// في الكورس: نسبة إكماله، نتيجته في كل كويز، ودرجته في كل واجب. البيانات
// جاهزة بالكامل من GET /api/courses/[id]/performance.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Loader, Users, CheckCircle2, XCircle, Minus } from "lucide-react";
import CourseTabs from "@/app/teacher/components/CourseTabs";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    grading: "قيد التصحيح",
    loadError: "تعذّر تحميل بيانات الأداء",
    backToContent: "رجوع لمحتوى الكورس",
    studentsPerformance: "أداء الطلاب",
    studentsCount: (n) => `${n} طالب`,
    empty: "لسه محدش اشترك في الكورس ده",
    student: "الطالب",
    completion: "نسبة الإكمال",
  },
  en: {
    grading: "Being graded",
    loadError: "Couldn't load performance data",
    backToContent: "Back to course content",
    studentsPerformance: "Student performance",
    studentsCount: (n) => `${n} student${n === 1 ? "" : "s"}`,
    empty: "No one has enrolled in this course yet",
    student: "Student",
    completion: "Completion",
  },
};

function ProgressBar({ percent }) {
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${percent >= 100 ? "bg-green-500" : "bg-[#314a6f]"}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 shrink-0">{percent}%</span>
    </div>
  );
}

function QuizCell({ result }) {
  if (!result.attempted) return <Minus size={14} className="text-gray-300 mx-auto" />;
  return (
    <div className="flex items-center justify-center gap-1">
      {result.passed ? (
        <CheckCircle2 size={13} className="text-green-500 shrink-0" />
      ) : (
        <XCircle size={13} className="text-red-400 shrink-0" />
      )}
      <span className="font-semibold text-gray-700">{result.bestScorePercent}%</span>
    </div>
  );
}

function AssignmentCell({ grade, maxScore, t }) {
  if (!grade.submitted) return <Minus size={14} className="text-gray-300 mx-auto" />;
  if (grade.status !== "graded") {
    return <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{t.grading}</span>;
  }
  return (
    <span className="font-semibold text-gray-700">
      {grade.score}/{maxScore}
    </span>
  );
}

export default function CoursePerformancePage({ params }) {
  const { id } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/courses/${id}/performance`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error);
        setData(json);
      })
      .catch(() => setError(t.loadError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="max-w-6xl mx-auto px-6 py-16 text-center text-red-500">{error}</div>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-[#314a6f]" size={36} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link href={`/teacher/courses/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <BackArrow size={15} /> {t.backToContent}
      </Link>

      <CourseTabs courseId={id} active="performance" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">{t.studentsPerformance}</h1>
        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          <Users size={15} /> {t.studentsCount(data.students.length)}
        </span>
      </div>

      {data.students.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          {t.empty}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-start px-4 py-3 font-semibold sticky start-0 bg-gray-50">{t.student}</th>
                <th className="text-start px-4 py-3 font-semibold">{t.completion}</th>
                {data.quizzes.map((q) => (
                  <th key={q.id} className="text-center px-4 py-3 font-semibold whitespace-nowrap" title={q.title}>
                    {q.title.length > 14 ? `${q.title.slice(0, 14)}…` : q.title}
                  </th>
                ))}
                {data.assignments.map((a) => (
                  <th key={a.id} className="text-center px-4 py-3 font-semibold whitespace-nowrap" title={a.title}>
                    {a.title.length > 14 ? `${a.title.slice(0, 14)}…` : a.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.students.map((s) => (
                <tr key={s.studentId}>
                  <td className="px-4 py-3 sticky start-0 bg-white">
                    <p className="font-semibold text-gray-800 whitespace-nowrap">{s.studentName}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{s.studentEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar percent={s.progressPercent} />
                  </td>
                  {s.quizResults.map((r) => (
                    <td key={r.quizId} className="px-4 py-3 text-center">
                      <QuizCell result={r} />
                    </td>
                  ))}
                  {s.assignmentGrades.map((g) => {
                    const assignment = data.assignments.find((a) => a.id === g.assignmentId);
                    return (
                      <td key={g.assignmentId} className="px-4 py-3 text-center">
                        <AssignmentCell grade={g} maxScore={assignment?.maxScore || 100} t={t} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}