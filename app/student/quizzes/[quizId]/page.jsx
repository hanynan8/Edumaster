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
  ArrowRight, ArrowLeft, Loader, Clock, CheckCircle2, XCircle, AlertTriangle, RotateCcw, MessageSquare,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AssignmentMedia from "@/app/components/AssignmentMedia";
import QuizAttemptReview from "@/app/components/QuizAttemptReview";

const STRINGS = {
  ar: {
    typeLabels: { multiple_choice: "اختيار من متعدد", true_false: "صح / خطأ", essay: "مقالي" },
    essayPlaceholder: "اكتب إجابتك هنا (يمكنك كتابة نص طويل)...",
    pendingReview: "تم تسليم إجاباتك. الأسئلة المقالية بانتظار تصحيح المدرّس، وستظهر درجتك النهائية بعد المراجعة.",
    provisional: "النتيجة المؤقتة (الأسئلة الاختيارية فقط)",
    viewAttempt: "عرض المحاولة والمحادثة مع المدرّس",
    hideAttempt: "إخفاء",
    attemptLabel: (n, pct, pending) => `المحاولة ${n} — ${pct}%${pending ? " (بانتظار التصحيح)" : ""}`,
    accessError: "يجب أن تملك صلاحية الوصول إلى هذه الدورة لحلّ هذا الاختبار",
    loadError: "تعذّر تحميل الاختبار",
    maxAttempts: "استنفدت جميع المحاولات المسموحة لهذا الاختبار",
    duplicateAttempt: "يوجد تسليم جارٍ بالفعل، حاول مرة أخرى",
    submitError: "حدث خطأ أثناء التسليم، حاول مرة أخرى",
    backToCourse: "الرجوع إلى الدورة",
    outOfPoints: (p) => `من ${p} درجة`,
    passed: "ناجح ",
    failed: "راسب",
    attemptsRemaining: (n) => `تبقّى لك ${n} محاولة أخرى`,
    reviewAnswers: "مراجعة إجاباتك",
    youPicked: "← اخترته",
    tryAgain: "حاول مرة أخرى",
    questionsCount: (n) => `${n} سؤال`,
    passingScore: (p) => `نسبة النجاح ${p}%`,
    minutes: (m) => `${m} دقيقة`,
    lastAttempt: (pct, status, used, max) =>
      `آخر محاولة: ${pct}% (${status}) · استخدمت ${used} من ${max} محاولات`,
    noQuestions: "لا توجد أسئلة في هذا الاختبار بعد",
    newAttempt: "محاولة جديدة",
    startQuiz: "ابدأ الاختبار",
    questionOf: (i, n) => `سؤال ${i} من ${n}`,
    answered: (a, n) => `أجبت عن ${a} من ${n}`,
    submitQuiz: "تسليم الاختبار",
    next: "التالي",
    back: "السابق",
    answerFirst: "لازم تجاوب على السؤال ده الأول عشان تكمّل",
  },
  en: {
    typeLabels: { multiple_choice: "Multiple choice", true_false: "True / False", essay: "Essay" },
    essayPlaceholder: "Write your answer here (long text is fine)...",
    pendingReview: "Your answers were submitted. Essay questions are waiting for the teacher to grade them; your final score will appear after review.",
    provisional: "Provisional score (auto-graded questions only)",
    viewAttempt: "View attempt & discussion with teacher",
    hideAttempt: "Hide",
    attemptLabel: (n, pct, pending) => `Attempt ${n} — ${pct}%${pending ? " (awaiting grading)" : ""}`,
    accessError: "You need access to this course to take this quiz",
    loadError: "Couldn't load the quiz",
    maxAttempts: "You've used all allowed attempts for this quiz",
    duplicateAttempt: "A submission is already in progress, try again",
    submitError: "Something went wrong while submitting, try again",
    backToCourse: "Back to course",
    outOfPoints: (p) => `out of ${p} points`,
    passed: "Passed",
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
    next: "Next",
    back: "Previous",
    answerFirst: "Please answer this question to continue",
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
  const [currentIdx, setCurrentIdx] = useState(0); // 🆕 سؤال واحد في الصفحة
  const [showMissing, setShowMissing] = useState(false); // 🆕 تحديد أحمر لو ضغط التالي من غير إجابة
  const [openAttemptId, setOpenAttemptId] = useState(null); // 🆕 محاولة سابقة مفتوحة (مراجعة + محادثة)
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
    setCurrentIdx(0);
    setShowMissing(false);
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
        answers: Object.entries(answers).map(([question, value]) =>
          // 🆕 المقالي: القيمة نص → textAnswer، الباقي: رقم الخيار المختار
          typeof value === "string" ? { question, textAnswer: value } : { question, selectedOptionIndex: value }
        ),
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
        <Loader className="animate-spin text-[#2456A1]" size={36} />
      </div>
    );
  }

  const backHref = `/courses/${quiz.course}`;

  // ── شاشة النتيجة (بعد التسليم) ──────────────────────────────────────
  if (result) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <BackArrow size={15} /> {t.backToCourse}
        </Link>

        <div
          className={`rounded-2xl p-6 mb-8 text-center ${
            result.status === "pending_review"
              ? "bg-amber-50 border border-amber-200"
              : result.passed
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {result.status === "pending_review" ? (
            <Clock className="mx-auto text-amber-500 mb-2" size={36} />
          ) : result.passed ? (
            <CheckCircle2 className="mx-auto text-green-600 mb-2" size={36} />
          ) : (
            <XCircle className="mx-auto text-red-500 mb-2" size={36} />
          )}
          <p className="text-2xl font-black text-gray-800 mb-1">{result.scorePercent}%</p>
          <p className="text-sm text-gray-600">
            {result.earnedPoints} {t.outOfPoints(result.totalPoints)}
            {result.status === "pending_review" ? ` · ${t.provisional}` : ` · ${result.passed ? t.passed : t.failed}`}
          </p>
          {result.status === "pending_review" && <p className="text-sm text-amber-700 mt-3">{t.pendingReview}</p>}
          {result.attemptsRemaining > 0 && (
            <p className="text-xs text-gray-400 mt-2">{t.attemptsRemaining(result.attemptsRemaining)}</p>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mb-4">{t.reviewAnswers}</h2>
        <div className="mb-8">
          <QuizAttemptReview quizId={quizId} resultId={result.id} viewer="student" />
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

  // ── شاشة "قبل البدء" (معلومات الاختبار + نتيجة سابقة لو موجودة) ───────
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

          {quiz.attempts?.length > 0 && (
            <div className="text-start space-y-2 mb-5">
              {quiz.attempts.map((a) => (
                <div key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpenAttemptId(openAttemptId === a.id ? null : a.id)}
                    className="w-full flex items-center justify-between gap-2 text-sm border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50"
                  >
                    <span className="font-semibold text-gray-700">
                      {t.attemptLabel(a.attemptNumber, a.scorePercent, a.status === "pending_review")}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#003A91] font-semibold">
                      <MessageSquare size={13} /> {openAttemptId === a.id ? t.hideAttempt : t.viewAttempt}
                      {a.messagesCount > 0 ? ` (${a.messagesCount})` : ""}
                    </span>
                  </button>
                  {openAttemptId === a.id && (
                    <div className="mt-3">
                      <QuizAttemptReview quizId={quizId} resultId={a.id} viewer="student" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {quiz.questions.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noQuestions}</p>
          ) : !quiz.canAttempt ? (
            <p className="text-sm text-red-500 font-semibold">{t.maxAttempts}</p>
          ) : (
            <button
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90"
            >
              {quiz.attemptsUsed > 0 ? t.newAttempt : t.startQuiz}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── شاشة حل الأسئلة (سؤال واحد في الصفحة — لازم يتحل عشان يروح للي بعده) ──
  const totalQ = quiz.questions.length;
  const q = quiz.questions[currentIdx];
  const isLastQ = currentIdx === totalQ - 1;
  const isAnswered = (question) => {
    const v = answers[question.id];
    return typeof v === "string" ? v.trim().length > 0 : v !== undefined;
  };
  const currentAnswered = isAnswered(q);
  const answeredCount = quiz.questions.filter(isAnswered).length;
  const progressPct = Math.round((answeredCount / totalQ) * 100);

  function goNext() {
    if (!currentAnswered) {
      setShowMissing(true);
      return;
    }
    setShowMissing(false);
    setCurrentIdx((i) => Math.min(i + 1, totalQ - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function trySubmit() {
    if (!currentAnswered) {
      setShowMissing(true);
      return;
    }
    handleSubmit();
  }
  function goBack() {
    setShowMissing(false);
    setCurrentIdx((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-28">
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-[#f7f7f7] py-3 z-10">
        <h1 className="text-lg font-semibold text-gray-800 truncate">{quiz.title}</h1>
        {secondsLeft !== null && (
          <span
            className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full shrink-0 ${
              secondsLeft <= 30 ? "bg-red-50 text-red-600" : "bg-[#EBEFF6] text-[#003A91]"
            }`}
          >
            <Clock size={14} /> {formatTime(secondsLeft)}
          </span>
        )}
      </div>

      <div className="h-1.5 bg-gray-200 rounded-full mb-6 overflow-hidden" dir="ltr">
        <div className="h-full bg-[#003A91] transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {submitError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{submitError}</div>}

      <div
        key={q.id}
        className={`bg-white rounded-2xl border p-4 ${
          showMissing && !currentAnswered ? "border-red-400 ring-2 ring-red-200" : "border-gray-200"
        }`}
      >
        <p className="text-xs font-bold text-gray-400 mb-1">
          {t.questionOf(currentIdx + 1, totalQ)} · {TYPE_LABELS[q.type]}
        </p>
        <p className="text-sm font-semibold text-gray-800 mb-3 whitespace-pre-wrap">{q.text}</p>
        {q.mediaUrl && (
          <div className="mb-3">
            <AssignmentMedia url={q.mediaUrl} type={q.mediaType} />
          </div>
        )}
        {q.type === "essay" ? (
          <textarea
            rows={8}
            maxLength={20000}
            value={typeof answers[q.id] === "string" ? answers[q.id] : ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder={t.essayPlaceholder}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#5279B4] resize-y"
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((o) => (
              <button
                key={o.index}
                type="button"
                onClick={() => selectAnswer(q.id, o.index)}
                className={`text-start text-sm px-3 py-2.5 rounded-lg border transition-colors ${
                  answers[q.id] === o.index
                    ? "bg-[#EBEFF6] border-[#5279B4] text-[#002E74] font-semibold"
                    : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                {o.text}
              </button>
            ))}
          </div>
        )}
        {showMissing && !currentAnswered && (
          <p className="text-sm font-semibold text-red-500 mt-3">{t.answerFirst}</p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 shrink-0">{t.answered(answeredCount, totalQ)}</p>
          <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
            {currentIdx > 0 && (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                {t.back}
              </button>
            )}
            {!isLastQ ? (
              <button
                type="button"
                onClick={goNext}
                className="flex-1 sm:flex-none sm:px-10 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90"
              >
                {t.next}
              </button>
            ) : (
              <button
                type="button"
                onClick={trySubmit}
                disabled={submitting}
                className="flex-1 sm:flex-none sm:px-10 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
              >
                {submitting && <Loader size={16} className="animate-spin" />}
                {t.submitQuiz}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
