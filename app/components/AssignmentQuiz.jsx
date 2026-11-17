"use client";

// app/components/AssignmentQuiz.jsx
//
// 🆕 أسئلة الواجب التفاعلية عند الطالب (اختيار من متعدد / صح وغلط):
//   - قبل الحل: أسئلة بدون الإجابة الصح (السيرفر مبيبعتهاش) + زرار "تصحيح".
//   - بعد الحل: الدرجة فورًا + مراجعة كل سؤال (إجابتك / الإجابة الصحيحة).
// التصحيح كله سيرفر-سايد (POST /api/assignments/[id]/answers) — الطالب بيبعت
// اختياراته بس. محاولة واحدة لكل واجب.

import { useState } from "react";
import { CheckCircle2, XCircle, Loader, ListChecks, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    title: "أسئلة الواجب",
    subtitle: "أجب عن الأسئلة ثم اضغط «تصحيح» لتظهر لك درجتك فورًا. لديك محاولة واحدة.",
    answered: (a, n) => `تمت الإجابة على ${a} من ${n}`,
    submit: "تصحيح وعرض الدرجة",
    confirmUnanswered: (n) => `لم تجب عن ${n} سؤال (سيُحسب خطأ). هل تريد التصحيح؟`,
    closed: "انتهى موعد التسليم — لم يعد بإمكانك حل الأسئلة",
    resultTitle: "نتيجتك في الأسئلة",
    finalGrade: "درجتك النهائية في الواجب",
    pendingFinal: "الدرجة النهائية للواجب يحددها المدرّس بعد مراجعة تسليمك.",
    yourAnswer: "إجابتك",
    correctAnswer: "الإجابة الصحيحة",
    notAnswered: "لم تجب عن هذا السؤال",
    points: (e, t) => `${e} / ${t}`,
    deadlinePassed: "انتهى موعد التسليم ولا يُسمح بالتسليم المتأخر لهذا الواجب",
    alreadyAnswered: "لقد أجبت عن هذه الأسئلة من قبل",
    error: "حدث خطأ أثناء التصحيح، حاول مرة أخرى",
  },
  en: {
    title: "Assignment questions",
    subtitle: "Answer the questions then press “Check answers” to see your score instantly. You have one attempt.",
    answered: (a, n) => `Answered ${a} of ${n}`,
    submit: "Check answers & see score",
    confirmUnanswered: (n) => `You left ${n} question(s) unanswered (they'll count as wrong). Check anyway?`,
    closed: "The deadline has passed — you can no longer answer the questions",
    resultTitle: "Your questions result",
    finalGrade: "Your final assignment grade",
    pendingFinal: "The final assignment grade is set by the teacher after reviewing your submission.",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    notAnswered: "You didn't answer this question",
    points: (e, t) => `${e} / ${t}`,
    deadlinePassed: "The deadline has passed and late submission isn't allowed for this assignment",
    alreadyAnswered: "You've already answered these questions",
    error: "Something went wrong while checking, try again",
  },
};

export default function AssignmentQuiz({
  assignmentId,
  questions,
  quizResult,
  maxScore,
  autoFinal,
  finalScore,
  canAnswer,
  onSubmitted,
}) {
  const { language } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const [selected, setSelected] = useState({}); // questionId -> option index
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const answeredCount = Object.keys(selected).length;
  const reviewByQuestion = new Map((quizResult?.answers || []).map((a) => [a.question, a]));

  async function handleSubmit() {
    setError("");
    const unanswered = questions.length - answeredCount;
    if (unanswered > 0 && !confirm(t.confirmUnanswered(unanswered))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({ question: q.id, selectedOptionIndex: selected[q.id] ?? null })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "deadline_passed") setError(t.deadlinePassed);
        else if (data.error === "already_answered") {
          setError(t.alreadyAnswered);
          onSubmitted?.();
        } else setError(t.error);
        return;
      }
      onSubmitted?.(data);
    } catch {
      setError(t.error);
    } finally {
      setSubmitting(false);
    }
  }

  // ───────────── بعد الحل: النتيجة + المراجعة ─────────────
  if (quizResult) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <ListChecks size={16} /> {t.resultTitle}
        </h2>

        <div className="bg-[#EBEFF6] rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="text-2xl font-black text-[#003A91]">
            {t.points(quizResult.earnedPoints, quizResult.totalPoints)}
            <span className="text-sm font-bold text-[#003A91]/70 ms-2">({quizResult.scorePercent}%)</span>
          </p>
          {autoFinal && finalScore !== null && finalScore !== undefined && (
            <p className="text-sm font-semibold text-green-700">
              {t.finalGrade}: <span className="text-lg font-black">{finalScore} / {maxScore}</span>
            </p>
          )}
        </div>
        {!autoFinal && <p className="text-xs text-gray-500">{t.pendingFinal}</p>}

        <ol className="space-y-4">
          {questions.map((q, qi) => {
            const review = reviewByQuestion.get(q.id);
            const chosen = review?.selectedOptionIndex ?? null;
            return (
              <li key={q.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  {review?.isCorrect ? (
                    <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm font-semibold text-gray-800 whitespace-pre-line break-words flex-1">
                    {qi + 1}. {q.text}
                  </p>
                  <span className="text-xs font-bold text-gray-400 shrink-0">
                    {t.points(review?.pointsEarned ?? 0, q.points)}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {q.options.map((o) => {
                    const isChosen = chosen === o.index;
                    const cls = o.isCorrect
                      ? "border-green-300 bg-green-50 text-green-800"
                      : isChosen
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-600";
                    return (
                      <li key={o.index} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm ${cls}`}>
                        <span className="break-words">{o.text}</span>
                        <span className="flex items-center gap-1.5 text-[11px] font-bold shrink-0">
                          {isChosen && <span>{t.yourAnswer}</span>}
                          {o.isCorrect && <span>{isChosen ? "✓" : t.correctAnswer}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {chosen === null && <p className="text-xs text-amber-600 mt-2">{t.notAnswered}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  // ───────────── مقفول (الميعاد فات ومفيش تسليم متأخر) ─────────────
  if (!canAnswer) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6 text-center text-red-600 text-sm font-semibold flex items-center justify-center gap-2">
        <Lock size={16} /> {t.closed}
      </div>
    );
  }

  // ───────────── الحل ─────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <ListChecks size={16} /> {t.title}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t.subtitle}</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

      <ol className="space-y-5">
        {questions.map((q, qi) => (
          <li key={q.id}>
            <p className="text-sm font-semibold text-gray-800 whitespace-pre-line break-words mb-2">
              {qi + 1}. {q.text}
              <span className="text-xs font-normal text-gray-400 ms-2">({q.points})</span>
            </p>
            <div role="radiogroup" aria-label={q.text} className="space-y-1.5">
              {q.options.map((o) => {
                const checked = selected[q.id] === o.index;
                return (
                  <label
                    key={o.index}
                    className={`flex items-center gap-3 border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                      checked ? "border-[#003A91] bg-[#EBEFF6] text-[#002E74] font-semibold" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={checked}
                      onChange={() => setSelected((p) => ({ ...p, [q.id]: o.index }))}
                      className="accent-[#003A91]"
                    />
                    <span className="break-words">{o.text}</span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span className="text-xs text-gray-400">{t.answered(answeredCount, questions.length)}</span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          {t.submit}
        </button>
      </div>
    </div>
  );
}
