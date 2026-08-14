"use client";

// app/student/quizzes/[quizId]/page.jsx
//
// Phase 4 — اليوم 35-36: "Student: حل الـ Quiz + تصحيح تلقائي فوري + تسجيل
// النتيجة". بتجيب GET /api/quizzes/[id] (نسخة الطالب: أسئلة من غير
// isCorrect + attemptsUsed/attemptsRemaining/canAttempt + آخر/أفضل نتيجة)
// وبعد التسليم بتنادي POST /api/quizzes/[id]/attempt اللي بيرجّع التصحيح
// كامل (كل التصحيح سيرفر-سايد، شوف تعليق الـ route).
//
// 🔒 مفيش أي isCorrect متسرّب هنا قبل التسليم — الطالب بيختار وبس، والتصحيح
// بيحصل في السيرفر وقت POST attempt.

import { useEffect, useState, useRef, use as usePromise } from "react";
import Link from "next/link";
import {
  ArrowRight, Loader, Clock, CheckCircle2, XCircle, AlertTriangle, RotateCcw,
} from "lucide-react";

const TYPE_LABELS = { multiple_choice: "اختيار من متعدد", true_false: "صح / غلط" };

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeQuizPage({ params }) {
  const { quizId } = usePromise(params);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState({}); // questionId -> selectedOptionIndex
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timerRef = useRef(null);

  async function load() {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "error");
      setQuiz(data);
    } catch (err) {
      setError(err.message === "forbidden" ? "لازم يكون عندك وصول لهذا الكورس عشان تحل الكويز ده" : "تعذّر تحميل الكويز");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  function handleStart() {
    setStarted(true);
    setAnswers({});
    setSubmitError("");
    if (quiz.timeLimitMinutes) {
      setSecondsLeft(quiz.timeLimitMinutes * 60);
    }
  }

  useEffect(() => {
    if (!started || secondsLeft === null || result) return undefined;
    if (secondsLeft <= 0) {
      handleSubmit();
      return undefined;
    }
    timerRef.current = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, secondsLeft, result]);

  function selectAnswer(questionId, optionIndex) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  async function handleSubmit() {
    if (submitting || result) return;
    setSubmitting(true);
    setSubmitError("");
    clearTimeout(timerRef.current);
    try {
      const payload = {
        answers: Object.entries(answers).map(([question, selectedOptionIndex]) => ({
          question,
          selectedOptionIndex,
        })),
      };
      const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "max_attempts_reached") setSubmitError("خلّصت كل المحاولات المسموحة لهذا الكويز");
        else if (data.error === "duplicate_attempt") setSubmitError("في تسليم شغال بالفعل، حاول تاني");
        else setSubmitError("حصل خطأ أثناء التسليم، حاول تاني");
        return;
      }
      setResult(data);
    } catch {
      setSubmitError("حصل خطأ أثناء التسليم، حاول تاني");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  if (!quiz) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  const backHref = `/courses/${quiz.course}`;

  // ── شاشة النتيجة (بعد التسليم) ──────────────────────────────────────
  if (result) {
    const answerByQuestion = Object.fromEntries(result.answers.map((a) => [a.question, a]));
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowRight size={15} /> رجوع للكورس
        </Link>

        <div
          className={`rounded-2xl p-6 mb-8 text-center ${
            result.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          {result.passed ? (
            <CheckCircle2 className="mx-auto text-green-600 mb-2" size={36} />
          ) : (
            <XCircle className="mx-auto text-red-500 mb-2" size={36} />
          )}
          <p className="text-2xl font-black text-gray-800 mb-1">{result.scorePercent}%</p>
          <p className="text-sm text-gray-600">
            {result.earnedPoints} من {result.totalPoints} درجة · {result.passed ? "ناجح 🎉" : "راسب"}
          </p>
          {result.attemptsRemaining > 0 && (
            <p className="text-xs text-gray-400 mt-2">باقيلك {result.attemptsRemaining} محاولة تانية</p>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-700 mb-4">مراجعة إجاباتك</h2>
        <div className="space-y-3 mb-8">
          {quiz.questions.map((q, idx) => {
            const a = answerByQuestion[q.id];
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-800">
                    {idx + 1}. {q.text}
                  </p>
                  {a?.isCorrect ? (
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-400 shrink-0" />
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((o) => {
                    const wasSelected = a?.selectedOptionIndex === o.index;
                    return (
                      <div
                        key={o.index}
                        className={`text-sm px-3 py-2 rounded-lg ${
                          wasSelected && a.isCorrect
                            ? "bg-green-50 text-green-700 font-semibold"
                            : wasSelected && !a.isCorrect
                            ? "bg-red-50 text-red-600 font-semibold"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {o.text} {wasSelected && "← اخترته"}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {result.attemptsRemaining > 0 && (
          <button
            onClick={() => {
              setResult(null);
              setStarted(false);
              load();
            }}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50"
          >
            <RotateCcw size={16} /> حاول تاني
          </button>
        )}
      </div>
    );
  }

  // ── شاشة "قبل البدء" (معلومات الكويز + نتيجة سابقة لو موجودة) ───────
  if (!started) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowRight size={15} /> رجوع للكورس
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">{quiz.title}</h1>
          {quiz.description && <p className="text-sm text-gray-500 mb-4">{quiz.description}</p>}

          <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-gray-500 mb-6">
            <span>{quiz.questions.length} سؤال</span>
            <span>نسبة النجاح {quiz.passingScorePercent}%</span>
            {quiz.timeLimitMinutes && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {quiz.timeLimitMinutes} دقيقة
              </span>
            )}
          </div>

          {quiz.lastResult && (
            <div
              className={`rounded-xl p-4 mb-5 text-sm ${
                quiz.lastResult.passed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              آخر محاولة: {quiz.lastResult.scorePercent}% ({quiz.lastResult.passed ? "ناجح" : "راسب"}) ·
              استخدمت {quiz.attemptsUsed} من {quiz.maxAttempts} محاولة
            </div>
          )}

          {quiz.questions.length === 0 ? (
            <p className="text-sm text-gray-400">الكويز ده لسه مفيهوش أسئلة</p>
          ) : !quiz.canAttempt ? (
            <p className="text-sm text-red-500 font-semibold">خلّصت كل المحاولات المسموحة لهذا الكويز</p>
          ) : (
            <button
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90"
            >
              {quiz.attemptsUsed > 0 ? "محاولة جديدة" : "ابدأ الكويز"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── شاشة حل الأسئلة ───────────────────────────────────────────────
  const answeredCount = Object.keys(answers).length;
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-28">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#f7f7f7] py-3 z-10">
        <h1 className="text-lg font-bold text-gray-800 truncate">{quiz.title}</h1>
        {secondsLeft !== null && (
          <span
            className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full shrink-0 ${
              secondsLeft <= 30 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            <Clock size={14} /> {formatTime(secondsLeft)}
          </span>
        )}
      </div>

      {submitError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{submitError}</div>}

      <div className="space-y-4">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-400 mb-1">
              سؤال {idx + 1} من {quiz.questions.length} · {TYPE_LABELS[q.type]}
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-3">{q.text}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {q.options.map((o) => (
                <button
                  key={o.index}
                  type="button"
                  onClick={() => selectAnswer(q.id, o.index)}
                  className={`text-start text-sm px-3 py-2.5 rounded-lg border transition-colors ${
                    answers[q.id] === o.index
                      ? "bg-blue-50 border-blue-400 text-blue-700 font-semibold"
                      : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {o.text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400 shrink-0">
            جاوبت {answeredCount} من {quiz.questions.length}
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 sm:flex-none sm:px-10 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader size={16} className="animate-spin" />}
            تسليم الكويز
          </button>
        </div>
      </div>
    </div>
  );
}