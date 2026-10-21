"use client";

// app/components/PlacementReview.jsx
//
// "إجاباتك والتصحيح" — بيعرض كل سؤال في اختبار تحديد المستوى (إسباني) بنصه وخياراته،
// مع إجابة الطالب والإجابة الصحيحة وعلامة صح/غلط. بيُستخدم في:
//   - صفحة النتيجة للطالب (PlacementResult) — مطوي افتراضيًا مع زرار "عرض الإجابات"
//   - لوحة الأدمن (تفاصيل نتيجة طالب) — مفتوح (defaultOpen) وباللغة الإنجليزية
//
// review = من السيرفر (buildReview في app/lib/placementReview.js):
//   [{ id, title, tasks: [{ title, intro, passage, bank, questions: [
//        { n, ln, q, ctx, options: [{label, text}], yourIndex, correctIndex, isCorrect } ] }] }]
// مفيش مفتاح إجابات بيتحمّل هنا — الصح بييجي جاهز في الـ review.

import { useMemo, useState } from "react";
import { REVIEW_STRINGS } from "@/app/lib/placementReviewStrings";

const TONE = {
  correct: "border-green-200 bg-green-50/40",
  wrong: "border-red-200 bg-red-50/40",
  none: "border-amber-200 bg-amber-50/40",
};

const stateOf = (q) => (q.yourIndex == null ? "none" : q.isCorrect ? "correct" : "wrong");

// نص إجابة (حرف + نص). أسئلة الربط: النص من قائمة النصوص (bank) بتاعة المهمة.
function answerLabel(task, q, idx) {
  const opt = q.options[idx];
  if (!opt) return "";
  const text = task.bank ? task.bank.find((b) => b.l === opt.label)?.t || "" : opt.text;
  return text ? `${opt.label}) ${text}` : opt.label;
}

function Badge({ tone, children }) {
  const cls =
    tone === "green"
      ? "bg-green-100 text-green-700"
      : tone === "red"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
  return <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{children}</span>;
}

function QuestionCard({ task, q, t }) {
  const state = stateOf(q);
  return (
    <div className={`rounded-xl border p-4 text-left ${TONE[state]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">
          {q.ln}. {q.q}
        </p>
        <span
          className={`shrink-0 text-base font-black ${
            state === "correct" ? "text-green-600" : state === "wrong" ? "text-red-600" : "text-amber-500"
          }`}
          aria-label={state === "correct" ? t.correct : state === "wrong" ? t.wrong : t.unanswered}
        >
          {state === "correct" ? "✓" : state === "wrong" ? "✗" : "–"}
        </span>
      </div>
      {q.ctx && <p className="text-xs text-gray-600 bg-white/70 border border-gray-100 rounded-lg px-3 py-2 mt-2">{q.ctx}</p>}

      {task.bank ? (
        // أسئلة الربط: بنعرض إجابة الطالب والصحيحة بس (النصوص كلها فوق في قائمة المهمة)
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex flex-wrap items-start gap-2">
            <Badge tone={state === "correct" ? "green" : state === "wrong" ? "red" : "amber"}>{t.yourAnswer}</Badge>
            <span className={state === "wrong" ? "text-red-700" : state === "correct" ? "text-green-700" : "text-amber-700"}>
              {q.yourIndex == null ? t.noAnswer : answerLabel(task, q, q.yourIndex)}
            </span>
          </div>
          {state !== "correct" && (
            <div className="flex flex-wrap items-start gap-2">
              <Badge tone="green">{t.correctAnswer}</Badge>
              <span className="text-green-700 font-semibold">{answerLabel(task, q, q.correctIndex)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {q.options.map((opt, oi) => {
            const isRight = oi === q.correctIndex;
            const isYours = oi === q.yourIndex;
            const cls = isRight
              ? "border-green-400 bg-green-50 text-green-800 font-semibold"
              : isYours
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-gray-100 bg-white/60 text-gray-600";
            return (
              <div key={oi} className={`flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border ${cls}`}>
                <span>
                  <span className="font-bold opacity-70">{opt.label})</span> {opt.text}
                </span>
                <span className="flex items-center gap-1.5">
                  {isYours && <Badge tone={isRight ? "green" : "red"}>{t.yourAnswer}</Badge>}
                  {isRight && !isYours && <Badge tone="green">{t.correctAnswer}</Badge>}
                </span>
              </div>
            );
          })}
          {q.yourIndex == null && <p className="text-xs text-amber-700">{t.noAnswer}</p>}
        </div>
      )}
    </div>
  );
}

export default function PlacementReview({ review, language = "ar", defaultOpen = false, collapsible = true }) {
  const t = REVIEW_STRINGS[language] ?? REVIEW_STRINGS.en;
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const [wrongOnly, setWrongOnly] = useState(false);

  const stats = useMemo(() => {
    const s = { correct: 0, wrong: 0, none: 0 };
    for (const part of review || []) {
      for (const task of part.tasks) for (const q of task.questions) s[stateOf(q)] += 1;
    }
    return s;
  }, [review]);

  // بعد الفلتر: لو "الخاطئة فقط" بنشيل الأسئلة الصحيحة (وأي مهمة/جزء فاضي)
  const visible = useMemo(() => {
    if (!wrongOnly) return review || [];
    return (review || [])
      .map((part) => ({
        ...part,
        tasks: part.tasks
          .map((task) => ({ ...task, questions: task.questions.filter((q) => !q.isCorrect) }))
          .filter((task) => task.questions.length),
      }))
      .filter((part) => part.tasks.length);
  }, [review, wrongOnly]);

  if (!Array.isArray(review) || review.length === 0) return null;

  const dir = language === "ar" ? "rtl" : "ltr";
  const chip = "text-xs font-bold px-2.5 py-1 rounded-full";

  return (
    <div dir={dir} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${chip} bg-green-50 text-green-700`}>
            {stats.correct} {t.correct}
          </span>
          <span className={`${chip} bg-red-50 text-red-700`}>
            {stats.wrong} {t.wrong}
          </span>
          {stats.none > 0 && (
            <span className={`${chip} bg-amber-50 text-amber-700`}>
              {stats.none} {t.unanswered}
            </span>
          )}
        </div>
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 px-4 py-2 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          {open ? t.hide : t.show}
        </button>
      )}

      {open && (
        <div className="mt-5 space-y-6">
          <div className="flex items-center gap-2">
            {[
              { v: false, label: t.all },
              { v: true, label: t.wrongOnly },
            ].map((f) => (
              <button
                key={String(f.v)}
                type="button"
                onClick={() => setWrongOnly(f.v)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                  wrongOnly === f.v
                    ? "border-[#003A91] bg-[#003A91] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visible.length === 0 && <p className="text-sm text-gray-500">{t.nothingToShow}</p>}

          {visible.map((part) => (
            <section key={part.id} className="space-y-4" dir="ltr">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#003A91] border-b-2 border-[#C9A227] pb-1.5 text-left">
                {part.title}
              </h3>
              {part.tasks.map((task, ti) => (
                <div key={ti} className="space-y-3">
                  <p className="text-sm font-bold text-gray-800 text-left">{task.title}</p>
                  {task.passage && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm text-gray-800 whitespace-pre-line text-left">
                      {task.passage}
                    </div>
                  )}
                  {task.bank && (
                    <ul className="space-y-1.5">
                      {task.bank.map((b) => (
                        <li key={b.l} className="flex gap-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-left">
                          <span className="font-black text-[#003A91] shrink-0">{b.l}.</span>
                          <span>{b.t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {task.questions.map((q) => (
                    <QuestionCard key={q.n} task={task} q={q} t={t} />
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
