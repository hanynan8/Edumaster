"use client";

// app/teacher/quizzes/[quizId]/results/page.jsx
//
// Phase 4 — اليوم 41: نتائج الطلاب في اختبار معيّن (آخر محاولة + أفضل نتيجة
// لكل طالب).

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, Loader, Users, X, Clock, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import QuizAttemptReview from "@/app/components/QuizAttemptReview";

const STRINGS = {
  ar: {
    loadError: "تعذّر تحميل النتائج",
    reviewCol: "المراجعة والمحادثة",
    attemptBtn: (n) => `محاولة ${n}`,
    awaitingGrading: "بانتظار التصحيح",
    pendingTotal: (n) => `${n} محاولة بانتظار تصحيح الأسئلة المقالية`,
    close: "إغلاق",
    backToQuestions: "الرجوع إلى أسئلة الاختبار",
    resultsTitle: (title) => `نتائج: ${title}`,
    studentsWhoTook: "طالب أدّى الاختبار",
    studentsWhoPassed: "طالب اجتازه",
    empty: "لم يؤدِّ أحد هذا الاختبار بعد",
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
    reviewCol: "Review & discussion",
    attemptBtn: (n) => `Attempt ${n}`,
    awaitingGrading: "Awaiting grading",
    pendingTotal: (n) => `${n} attempt(s) waiting for essay grading`,
    close: "Close",
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
  const [reviewId, setReviewId] = useState(null); // 🆕 محاولة مفتوحة للتصحيح/المحادثة

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
        <Loader className="animate-spin text-[#2456A1]" size={36} />
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

      {data.pendingReviewCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl px-4 py-3 mb-4">
          <Clock size={16} /> {t.pendingTotal(data.pendingReviewCount)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EBEFF6] flex items-center justify-center shrink-0">
            <Users size={20} className="text-[#003A91]" />
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
                <th className="text-start px-4 py-3 font-semibold">{t.reviewCol}</th>
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
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {r.bestScorePercent !== null ? `${r.bestScorePercent}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.latestScorePercent !== null ? `${r.latestScorePercent}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.bestPassed === null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                        <Clock size={12} /> {t.awaitingGrading}
                      </span>
                    ) : r.bestPassed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={12} /> {t.passed}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                        <XCircle size={12} /> {t.failed}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.attempts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setReviewId(a.id)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                            a.status === "pending_review"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                          title={a.status === "pending_review" ? t.awaitingGrading : ""}
                        >
                          {a.status === "pending_review" ? <Clock size={11} /> : <MessageSquare size={11} />}
                          {t.attemptBtn(a.attemptNumber)}
                          {a.messagesCount > 0 ? ` (${a.messagesCount})` : ""}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reviewId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReviewId(null)}>
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="bg-[#f7f7f7] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-gray-800">{data.quizTitle}</h3>
              <button onClick={() => setReviewId(null)} className="text-gray-400 hover:text-gray-700" aria-label={t.close}>
                <X size={22} />
              </button>
            </div>
            <div className="p-6">
              <QuizAttemptReview
                quizId={quizId}
                resultId={reviewId}
                viewer="staff"
                onChanged={() =>
                  fetch(`/api/quizzes/${quizId}/results`)
                    .then((r) => r.json())
                    .then((d) => d?.results && setData(d))
                    .catch(() => {})
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}