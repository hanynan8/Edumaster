"use client";

// app/components/QuizAttemptReview.jsx
//
// 🆕 مراجعة محاولة كويز واحدة (GET /api/quizzes/[id]/results/[resultId]):
//   - الطالب: بيشوف إجاباته + درجة/تعليق المقالي + المحادثة مع المدرّس/الموديريتر.
//   - المدرّس/الموديريتر/الأدمن (viewer="staff"): نفس الحاجة + حقول درجة وتعليق لكل سؤال مقالي
//     وزرار حفظ التصحيح (PUT) + المحادثة.

import { useEffect, useState } from "react";
import { Loader, CheckCircle2, XCircle, Clock, Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AssignmentMedia from "@/app/components/AssignmentMedia";
import ThreadChat from "@/app/components/ThreadChat";

const STRINGS = {
  ar: {
    loadError: "تعذّر تحميل المحاولة",
    pending: "بانتظار تصحيح الأسئلة المقالية",
    score: (e, t) => `${e} من ${t} درجة`,
    attempt: (n) => `المحاولة ${n}`,
    yourAnswer: "إجابة الطالب",
    noAnswer: "— لم تتم الإجابة —",
    essay: "سؤال مقالي",
    youPicked: "← اختيار الطالب",
    correctOption: "✓ الإجابة الصحيحة",
    points: "الدرجة",
    outOf: (p) => `من ${p}`,
    feedback: "تعليق المصحّح",
    feedbackPlaceholder: "اكتب تعليقك على إجابة الطالب (اختياري)",
    saveGrades: "حفظ التصحيح",
    saved: "تم حفظ التصحيح",
    saveError: "تعذّر حفظ التصحيح، تأكد من الدرجات وحاول مرة أخرى",
    awaiting: "بانتظار التصحيح",
    graded: "تم التصحيح",
    passed: "ناجح",
    failed: "لم يجتز",
  },
  en: {
    loadError: "Couldn't load the attempt",
    pending: "Waiting for essay questions to be graded",
    score: (e, t) => `${e} of ${t} points`,
    attempt: (n) => `Attempt ${n}`,
    yourAnswer: "Student's answer",
    noAnswer: "— no answer —",
    essay: "Essay question",
    youPicked: "← student's pick",
    correctOption: "✓ correct answer",
    points: "Points",
    outOf: (p) => `out of ${p}`,
    feedback: "Grader feedback",
    feedbackPlaceholder: "Write your feedback on the student's answer (optional)",
    saveGrades: "Save grading",
    saved: "Grading saved",
    saveError: "Couldn't save grading, check the points and try again",
    awaiting: "Awaiting grading",
    graded: "Graded",
    passed: "Passed",
    failed: "Not passed",
  },
};

export default function QuizAttemptReview({ quizId, resultId, viewer = "student", onChanged }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const isStaff = viewer === "staff";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [grades, setGrades] = useState({}); // questionId -> { points, feedback }
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: "", text: "" });

  function applyData(d) {
    setData(d);
    const next = {};
    for (const q of d.questions) {
      if (q.type === "essay" && q.answer) {
        next[q.id] = { points: String(q.answer.pointsEarned ?? 0), feedback: q.answer.feedback || "" };
      }
    }
    setGrades(next);
  }

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    (async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}/results/${resultId}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error);
        if (!cancelled) applyData(d);
      } catch {
        if (!cancelled) setError(t.loadError);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, resultId]);

  async function handleSave() {
    setSaving(true);
    setSaveMsg({ type: "", text: "" });
    try {
      const payload = {
        grades: data.questions
          .filter((q) => q.type === "essay" && q.answer?.textAnswer)
          .map((q) => ({
            question: q.id,
            points: Number(grades[q.id]?.points) || 0,
            feedback: grades[q.id]?.feedback || "",
          })),
      };
      const res = await fetch(`/api/quizzes/${quizId}/results/${resultId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      applyData(d);
      setSaveMsg({ type: "ok", text: t.saved });
      onChanged?.(d);
    } catch {
      setSaveMsg({ type: "err", text: t.saveError });
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-red-500 py-4">{error}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="animate-spin text-[#2456A1]" size={24} />
      </div>
    );
  }

  const hasEssayToGrade = isStaff && data.questions.some((q) => q.type === "essay" && q.answer?.textAnswer);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold text-gray-700">
          {data.studentName && isStaff ? `${data.studentName} · ` : ""}
          {t.attempt(data.attemptNumber)}
        </span>
        <span className="text-gray-500">{t.score(data.earnedPoints, data.totalPoints)} ({data.scorePercent}%)</span>
        {data.status === "pending_review" ? (
          <span className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
            <Clock size={12} /> {t.pending}
          </span>
        ) : (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              data.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {data.passed ? t.passed : t.failed}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {data.questions.map((q, idx) => {
          const a = q.answer;
          return (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap">
                  {idx + 1}. {q.text}
                </p>
                {q.type !== "essay" &&
                  (a?.isCorrect ? (
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-400 shrink-0" />
                  ))}
              </div>

              {q.mediaUrl && <AssignmentMedia url={q.mediaUrl} type={q.mediaType} />}

              {q.type === "essay" ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-1">{t.yourAnswer}</p>
                    <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {a?.textAnswer || <span className="text-gray-400">{t.noAnswer}</span>}
                    </div>
                  </div>

                  {isStaff && a?.textAnswer ? (
                    <div className="grid sm:grid-cols-[8rem_1fr] gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          {t.points} ({t.outOf(q.points)})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={q.points}
                          step={0.5}
                          value={grades[q.id]?.points ?? "0"}
                          onChange={(e) =>
                            setGrades((p) => ({ ...p, [q.id]: { ...p[q.id], points: e.target.value } }))
                          }
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5279B4]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t.feedback}</label>
                        <textarea
                          rows={3}
                          value={grades[q.id]?.feedback ?? ""}
                          placeholder={t.feedbackPlaceholder}
                          onChange={(e) =>
                            setGrades((p) => ({ ...p, [q.id]: { ...p[q.id], feedback: e.target.value } }))
                          }
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5279B4] resize-y"
                        />
                      </div>
                    </div>
                  ) : (
                    a?.textAnswer && (
                      <div className="text-sm">
                        <p className="font-semibold text-gray-700">
                          {a.manuallyGraded
                            ? `${t.points}: ${a.pointsEarned} ${t.outOf(q.points)}`
                            : t.awaiting}
                        </p>
                        {a.feedback && (
                          <p className="mt-2 bg-[#EBEFF6] text-[#002E74] rounded-xl px-4 py-3 whitespace-pre-wrap break-words">
                            <span className="font-bold">{t.feedback}: </span>
                            {a.feedback}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((o) => {
                    const wasSelected = a?.selectedOptionIndex === o.index;
                    return (
                      <div
                        key={o.index}
                        className={`text-sm px-3 py-2 rounded-lg ${
                          wasSelected && a?.isCorrect
                            ? "bg-green-50 text-green-700 font-semibold"
                            : wasSelected
                            ? "bg-red-50 text-red-600 font-semibold"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {o.text} {wasSelected && t.youPicked}
                        {isStaff && o.isCorrect && <span className="text-green-600"> {t.correctOption}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasEssayToGrade && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#003A91] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            {t.saveGrades}
          </button>
          {saveMsg.text && (
            <span className={`text-sm ${saveMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}>{saveMsg.text}</span>
          )}
        </div>
      )}

      <ThreadChat endpoint={`/api/quizzes/${quizId}/results/${resultId}/messages`} viewer={viewer} initialMessages={data.messages} />
    </div>
  );
}
