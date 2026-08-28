"use client";

// app/teacher/quizzes/[quizId]/results/page.jsx
//
// Phase 4 — اليوم 41: نتائج الطلاب في كويز معيّن (آخر محاولة + أفضل نتيجة
// لكل طالب).

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, Loader, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    loadError: "تعذّر تحميل النتائج",
    backToQuestions: "رجوع لأسئلة الكويز",
    resultsTitle: (title) => `نتائج: ${title}`,
    studentsWhoTook: "طالب حل الكويز",
    studentsWhoPassed: "طالب نجح فيه",
    empty: "لسه محدش حل الكويز ده",
    student: "الطالب",
    attempts: "المحاولات",
    bestScore: "أفضل نتيجة",
    latestScore: "آخر نتيجة",
    statusCol: "الحالة",
    passed: "ناجح",
    failed: "راسب",
  },
  en: {
    loadError: "Couldn't load results",
    backToQuestions: "Back to quiz questions",
    resultsTitle: (title) => `Results: ${title}`,
    studentsWhoTook: "students took the quiz",
    studentsWhoPassed: "students passed",
    empty: "No one has taken this quiz yet",
    student: "Student",
    attempts: "Attempts",
    bestScore: "Best score",
    latestScore: "Latest score",
    statusCol: "Status",
    passed: "Passed",
    failed: "Failed",
  },
};

export default function QuizResultsPage({ params }) {
  const { quizId } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}/results`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error);
        setData(json);
      })
      .catch(() => setError(t.loadError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  if (error) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-red-500">{error}</div>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-[#314a6f]" size={36} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href={`/teacher/quizzes/${quizId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <BackArrow size={15} /> {t.backToQuestions}
      </Link>

      <h1 className="text-xl font-semibold text-gray-800 mb-1">{t.resultsTitle(data.quizTitle)}</h1>
      <p className="text-sm text-gray-400 mb-6">{data.courseTitle}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#eceef2] flex items-center justify-center shrink-0">
            <Users size={20} className="text-[#0f2d57]" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-800">{data.totalStudents}</p>
            <p className="text-xs text-gray-400">{t.studentsWhoTook}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-800">{data.passedCount}</p>
            <p className="text-xs text-gray-400">{t.studentsWhoPassed}</p>
          </div>
        </div>
      </div>

      {data.results.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          {t.empty}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-start px-4 py-3 font-semibold">{t.student}</th>
                <th className="text-start px-4 py-3 font-semibold">{t.attempts}</th>
                <th className="text-start px-4 py-3 font-semibold">{t.bestScore}</th>
                <th className="text-start px-4 py-3 font-semibold">{t.latestScore}</th>
                <th className="text-start px-4 py-3 font-semibold">{t.statusCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{r.studentName}</p>
                    <p className="text-xs text-gray-400">{r.studentEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.attemptsCount}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{r.bestScorePercent}%</td>
                  <td className="px-4 py-3 text-gray-600">{r.latestScorePercent}%</td>
                  <td className="px-4 py-3">
                    {r.bestPassed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={12} /> {t.passed}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                        <XCircle size={12} /> {t.failed}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}