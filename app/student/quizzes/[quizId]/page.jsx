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
  ArrowRight, ArrowLeft, Loader, Clock, CheckCircle2, XCircle, AlertTriangle, RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    typeLabels: { multiple_choice: "اختيار من متعدد", true_false: "صح / غلط" },
    accessError: "لازم يكون عندك وصول لهذا الكورس عشان تحل الكويز ده",
    loadError: "تعذّر تحميل الكويز",
    maxAttempts: "خلّصت كل المحاولات المسموحة لهذا الكويز",
    duplicateAttempt: "في تسليم شغال بالفعل، حاول تاني",
    submitError: "حصل خطأ أثناء التسليم، حاول تاني",
    backToCourse: "رجوع للكورس",
    outOfPoints: (p) => `من ${p} درجة`,
    passed: "ناجح 🎉",
    failed: "راسب",
    attemptsRemaining: (n) => `باقيلك ${n} محاولة تانية`,
    reviewAnswers: "مراجعة إجاباتك",
    youPicked: "← اخترته",
    tryAgain: "حاول تاني",
    questionsCount: (n) => `${n} سؤال`,
    passingScore: (p) => `نسبة النجاح ${p}%`,
    minutes: (m) => `${m} دقيقة`,
    lastAttempt: (pct, status, used, max) =>
      `آخر محاولة: ${pct}% (${status}) · استخدمت ${used} من ${max} محاولة`,
    noQuestions: "الكويز ده لسه مفيهوش أسئلة",
    newAttempt: "محاولة جديدة",
    startQuiz: "ابدأ الكويز",
    questionOf: (i, n) => `سؤال ${i} من ${n}`,
    answered: (a, n) => `جاوبت ${a} من ${n}`,
    submitQuiz: "تسليم الكويز",
  },
  en: {
    typeLabels: { multiple_choice: "Multiple choice", true_false: "True / False" },
    accessError: "You need access to this course to take this quiz",
    loadError: "Couldn't load the quiz",
    maxAttempts: "You've used all allowed attempts for this quiz",
    duplicateAttempt: "A submission is already in progress, try again",
    submitError: "Something went wrong while submitting, try again",
    backToCourse: "Back to course",
    outOfPoints: (p) => `out of ${p} points`,
    passed: "Passed 🎉",
    failed: "Failed",
    attemptsRemaining: (n) => `${n} attempt(s) remaining`,
    reviewAnswers: "Review your answers",
    youPicked: "← your pick",
    tryAgain: "Try again",
    questionsCount: (n) => `${n} question${n === 1 ? "" : "s"}`,
    passingScore: (p) => `Passing score ${p}%`,
    minutes: (m) => `${m} min`,
    lastAttempt: (pct, status, used, max) =>
      `Last attempt: ${pct}% (${status}) · used ${used} of ${max} attempts`,
    noQuestions: "This quiz has no questions yet",
    newAttempt: "New attempt",
    startQuiz: "Start quiz",
    questionOf: (i, n) => `Question ${i} of ${n}`,
    answered: (a, n) => `Answered ${a} of ${n}`,
    submitQuiz: "Submit quiz",
  },
};

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeQuizPage({ params }) {
  const { quizId } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const TYPE_LABELS = t.typeLabels;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
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
      setError(err.message === "forbidden" ? t.accessError : t.loadError);
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
        if (data.error === "max_attempts_reached") setSubmitError(t.maxAttempts);
        else if (data.error === "duplicate_attempt") setSubmitError(t.duplicateAttempt);
        else setSubmitError(t.submitError);
        return;
      }
      setResult(data);
    } catch {
      setSubmitError(t.submitError);
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
      <div dir={isRTL ? "rtl" : "ltr"} className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <BackArrow size={15} /> {t.backToCourse}
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
            {result.earnedPoints} {t.outOfPoints(result.totalPoints)} · {result.passed ? t.passed : t.failed}
          </p>
          {result.attemptsRemaining > 0 && (
            <p className="text-xs text-gray-400 mt-2">{t.attemptsRemaining(result.attemptsRemaining)}</p>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mb-4">{t.reviewAnswers}</h2>
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
                        {o.text} {wasSelected && t.youPicked}
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
            <RotateCcw size={16} /> {t.tryAgain}
          </button>
        )}
      </div>
    );
  }

  // ── شاشة "قبل البدء" (معلومات الكويز + نتيجة سابقة لو موجودة) ───────
  if (!started) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <BackArrow size={15} /> {t.backToCourse}
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">{quiz.title}</h1>
          {quiz.description && <p className="text-sm text-gray-500 mb-4">{quiz.description}</p>}

          <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-gray-500 mb-6">
            <span>{t.questionsCount(quiz.questions.length)}</span>
            <span>{t.passingScore(quiz.passingScorePercent)}</span>
            {quiz.timeLimitMinutes && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {t.minutes(quiz.timeLimitMinutes)}
              </span>
            )}
          </div>

          {quiz.lastResult && (
            <div
              className={`rounded-xl p-4 mb-5 text-sm ${
                quiz.lastResult.passed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {t.lastAttempt(
                quiz.lastResult.scorePercent,
                quiz.lastResult.passed ? t.passed : t.failed,
                quiz.attemptsUsed,
                quiz.maxAttempts
              )}
            </div>
          )}

          {quiz.questions.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noQuestions}</p>
          ) : !quiz.canAttempt ? (
            <p className="text-sm text-red-500 font-semibold">{t.maxAttempts}</p>
          ) : (
            <button
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90"
            >
              {quiz.attemptsUsed > 0 ? t.newAttempt : t.startQuiz}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── شاشة حل الأسئلة ───────────────────────────────────────────────
  const answeredCount = Object.keys(answers).length;
  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-28">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#f7f7f7] py-3 z-10">
        <h1 className="text-lg font-semibold text-gray-800 truncate">{quiz.title}</h1>
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
              {t.questionOf(idx + 1, quiz.questions.length)} · {TYPE_LABELS[q.type]}
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
            {t.answered(answeredCount, quiz.questions.length)}
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 sm:flex-none sm:px-10 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader size={16} className="animate-spin" />}
            {t.submitQuiz}
          </button>
        </div>
      </div>
    </div>
  );
}