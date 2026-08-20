"use client";

// app/teacher/quizzes/[quizId]/results/page.jsx
//
// Phase 4 — اليوم 41: نتائج الطلاب في كويز معيّن (آخر محاولة + أفضل نتيجة
// لكل طالب).

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle, Loader, Users } from "lucide-react";

export default function QuizResultsPage({ params }) {
  const { quizId } = usePromise(params);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}/results`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error);
        setData(json);
      })
      .catch(() => setError("تعذّر تحميل النتائج"));
  }, [quizId]);

  if (error) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-red-500">{error}</div>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href={`/teacher/quizzes/${quizId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowRight size={15} /> رجوع لأسئلة الكويز
      </Link>

      <h1 className="text-xl font-semibold text-gray-800 mb-1">نتائج: {data.quizTitle}</h1>
      <p className="text-sm text-gray-400 mb-6">{data.courseTitle}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-800">{data.totalStudents}</p>
            <p className="text-xs text-gray-400">طالب حل الكويز</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-800">{data.passedCount}</p>
            <p className="text-xs text-gray-400">طالب نجح فيه</p>
          </div>
        </div>
      </div>

      {data.results.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          لسه محدش حل الكويز ده
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-start px-4 py-3 font-semibold">الطالب</th>
                <th className="text-start px-4 py-3 font-semibold">المحاولات</th>
                <th className="text-start px-4 py-3 font-semibold">أفضل نتيجة</th>
                <th className="text-start px-4 py-3 font-semibold">آخر نتيجة</th>
                <th className="text-start px-4 py-3 font-semibold">الحالة</th>
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
                        <CheckCircle2 size={12} /> ناجح
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                        <XCircle size={12} /> راسب
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