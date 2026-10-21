// app/lib/placementReview.js
//
// 🔒 سيرفر بس (بيستورد مفتاح الإجابات — ممنوع من أي كومبوننت "use client").
//
// مراجعة اختبار تحديد المستوى (إسباني): لكل سؤال → إجابة الطالب + الإجابة الصحيحة + هل صح.
//   1) buildResults(answers, audio) — "لقطة" مدمجة بتتخزّن في مستند النتيجة وقت التسليم:
//        [{ n: رقم السؤال، a: index إجابة الطالب أو null، c: index الإجابة الصحيحة }]
//      بنخزّنها عشان التصحيح اللي بيظهر للطالب/الأدمن لاحقًا يفضل مطابق للدرجة اللي اتحسبت
//      وقتها (حتى لو مفتاح الإجابات أو الصوتيات المرفوعة اتغيّروا بعد كده).
//   2) buildReview(results) — بتبني هيكل العرض (أجزاء → مهام → أسئلة بنصوصها وخياراتها).
//   3) buildPlacementResultEmail(...) — إيميل النتيجة + الإجابات والتصحيح (3 لغات).

import { PLACEMENT_PARTS, getVisibleParts } from "@/app/lib/spanishPlacementTest";
import { ANSWER_KEY } from "@/app/lib/spanishPlacementTestKey";
import { getLevelByCode } from "@/app/lib/placementLevels";
import { REVIEW_STRINGS } from "@/app/lib/placementReviewStrings";

const LETTERS = "abcdefghijk";

const toIndex = (v) => (Number.isInteger(v) && v >= 0 ? v : null);

// لقطة النتيجة للأسئلة الظاهرة فعلًا وقت الاختبار (نفس الأسئلة اللي اتحسبت منها الدرجة).
export function buildResults(answers, audio = {}) {
  const out = [];
  for (const part of getVisibleParts(audio)) {
    for (const task of part.tasks) {
      for (const q of task.questions) {
        out.push({ n: q.n, a: toIndex(answers?.[q.n]), c: ANSWER_KEY[q.n]?.a ?? null });
      }
    }
  }
  return out;
}

// للنتايج القديمة (اتسجّلت قبل ما نخزّن اللقطة): بنعيد بناءها من answers المخزّنة.
// مهام الاستماع بتظهر بس لو الطالب جاوب على سؤال منها (يعني كانت ظاهرة وقتها).
export function legacyResults(answers) {
  const out = [];
  for (const part of PLACEMENT_PARTS) {
    for (const task of part.tasks) {
      const visible =
        task.audioSlot === undefined || task.questions.some((q) => answers?.[q.n] !== undefined);
      if (!visible) continue;
      for (const q of task.questions) {
        out.push({ n: q.n, a: toIndex(answers?.[q.n]), c: ANSWER_KEY[q.n]?.a ?? null });
      }
    }
  }
  return out;
}

export function resultsFromDoc(doc) {
  return Array.isArray(doc?.results) && doc.results.length ? doc.results : legacyResults(doc?.answers);
}

// خيارات السؤال للعرض. أسئلة الربط (bank): الخيارات حروف والنص بيتجاب من task.bank وقت العرض.
function optionsFor(task, q) {
  if (task.bank) return q.o.map((label) => ({ label, text: "" }));
  return q.o.map((text, i) => ({ label: LETTERS[i], text }));
}

export function buildReview(results) {
  const byN = new Map((results || []).map((r) => [r.n, r]));
  const parts = [];
  for (const part of PLACEMENT_PARTS) {
    const tasks = [];
    for (const task of part.tasks) {
      const questions = task.questions
        .filter((q) => byN.has(q.n))
        .map((q) => {
          const r = byN.get(q.n);
          return {
            n: q.n,
            ln: q.ln,
            q: q.q,
            ctx: q.ctx || "",
            options: optionsFor(task, q),
            yourIndex: r.a ?? null,
            correctIndex: r.c ?? null,
            isCorrect: r.a != null && r.a === r.c,
          };
        });
      if (!questions.length) continue;
      tasks.push({
        title: task.title,
        intro: task.intro || "",
        passage: task.passage || "",
        bank: task.bank || null,
        questions,
      });
    }
    if (tasks.length) parts.push({ id: part.id, title: part.title, tasks });
  }
  return parts;
}

export function reviewFromDoc(doc) {
  return buildReview(resultsFromDoc(doc));
}

// ───────────── إيميل النتيجة ─────────────

const EMAIL_STRINGS = {
  ar: {
    dir: "rtl",
    subject: (s, m, l) => `نتيجة اختبار تحديد المستوى في الإسبانية: ${s}/${m} (${l})`,
    heading: "نتيجة اختبارك",
    hello: (n) => `مرحبًا ${n}،`,
    intro: "شكرًا لإكمالك اختبار تحديد المستوى في اللغة الإسبانية. هذه درجتك ومستواك، وبعدها إجاباتك على كل سؤال مع التصحيح.",
    score: "درجتك",
    level: "مستواك",
  },
  en: {
    dir: "ltr",
    subject: (s, m, l) => `Your Spanish level test result: ${s}/${m} (${l})`,
    heading: "Your test result",
    hello: (n) => `Hi ${n},`,
    intro: "Thanks for completing the Spanish placement test. Here are your score and level, followed by your answer to every question with the correction.",
    score: "Your score",
    level: "Your level",
  },
  es: {
    dir: "ltr",
    subject: (s, m, l) => `Tu resultado de la prueba de nivel de español: ${s}/${m} (${l})`,
    heading: "Tu resultado",
    hello: (n) => `Hola ${n},`,
    intro: "Gracias por completar la prueba de nivel de español. Aquí tienes tu puntuación y tu nivel, y después tu respuesta a cada pregunta con su corrección.",
    score: "Tu puntuación",
    level: "Tu nivel",
  },
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// نص الإجابة للعرض (حرف + نص). أسئلة الربط: النص من task.bank.
function answerText(task, q, idx, noAnswer) {
  if (idx == null) return noAnswer;
  const opt = q.options[idx];
  if (!opt) return noAnswer;
  const text = task.bank ? task.bank.find((b) => b.l === opt.label)?.t || "" : opt.text;
  return text ? `${opt.label}) ${text}` : `${opt.label}`;
}

const TONES = {
  correct: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", mark: "✓" },
  wrong: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", mark: "✗" },
  none: { bg: "#fffbeb", border: "#fde68a", color: "#b45309", mark: "–" },
};

export function buildPlacementResultEmail({ name, language = "ar", score, maxScore, level, review }) {
  const lang = EMAIL_STRINGS[language] ? language : "en";
  const s = EMAIL_STRINGS[lang];
  const r = REVIEW_STRINGS[lang];
  const lvl = getLevelByCode(level);
  const desc = lvl ? lvl.desc[lang] || lvl.desc.en : "";

  let correct = 0;
  let wrong = 0;
  let none = 0;
  const partsHtml = (review || [])
    .map((part) => {
      const tasksHtml = part.tasks
        .map((task) => {
          const context = [
            task.passage
              ? `<div dir="ltr" style="font-size:12px;color:#334155;background:#f8fafc;border-radius:8px;padding:10px 12px;margin:0 0 8px 0;white-space:pre-line;">${esc(task.passage)}</div>`
              : "",
            task.bank
              ? `<div dir="ltr" style="font-size:12px;color:#334155;background:#f8fafc;border-radius:8px;padding:10px 12px;margin:0 0 8px 0;">${task.bank
                  .map((b) => `<div style="margin:0 0 4px 0;"><strong>${esc(b.l)}.</strong> ${esc(b.t)}</div>`)
                  .join("")}</div>`
              : "",
          ].join("");

          const qsHtml = task.questions
            .map((q) => {
              const state = q.yourIndex == null ? "none" : q.isCorrect ? "correct" : "wrong";
              if (state === "correct") correct += 1;
              else if (state === "wrong") wrong += 1;
              else none += 1;
              const tone = TONES[state];
              const yours = answerText(task, q, q.yourIndex, r.noAnswer);
              const right = answerText(task, q, q.correctIndex, "");
              return `
<div style="background:${tone.bg};border:1px solid ${tone.border};border-radius:8px;padding:10px 12px;margin:0 0 8px 0;">
  <div dir="ltr" style="font-size:13px;font-weight:700;color:#0f172a;text-align:left;">${esc(q.ln)}. ${esc(q.q)}</div>
  ${q.ctx ? `<div dir="ltr" style="font-size:12px;color:#64748b;margin-top:3px;text-align:left;">${esc(q.ctx)}</div>` : ""}
  <div style="font-size:12px;color:#475569;margin-top:6px;">${esc(r.yourAnswer)}: <strong dir="ltr" style="color:${tone.color};">${esc(yours)}</strong> <span style="color:${tone.color};font-weight:800;">${tone.mark}</span></div>
  ${state === "correct" ? "" : `<div style="font-size:12px;color:#475569;margin-top:3px;">${esc(r.correctAnswer)}: <strong dir="ltr" style="color:#15803d;">${esc(right)}</strong></div>`}
</div>`;
            })
            .join("");

          return `
<p dir="ltr" style="font-size:12px;font-weight:800;color:#1E3561;margin:16px 0 6px 0;text-align:left;">${esc(task.title)}</p>
${context}${qsHtml}`;
        })
        .join("");
      return `<p dir="ltr" style="font-size:14px;font-weight:800;color:#1E3561;margin:22px 0 0 0;padding-top:10px;border-top:2px solid #C9A227;text-align:left;">${esc(part.title)}</p>${tasksHtml}`;
    })
    .join("");

  const bodyHtml = `
    <p style="font-size:14px;color:#64748b;margin:0 0 6px 0;">${esc(s.hello(name))}</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 18px 0;">${esc(s.intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;"><tr>
      <td style="background:#eff6ff;border-radius:12px;padding:14px;text-align:center;width:50%;">
        <div style="font-size:12px;color:#64748b;">${esc(s.score)}</div>
        <div dir="ltr" style="font-size:28px;font-weight:900;color:#003A91;">${esc(score)}<span style="font-size:14px;color:#94a3b8;"> / ${esc(maxScore)}</span></div>
      </td>
      <td style="width:8px;">&nbsp;</td>
      <td style="background:#003A91;border-radius:12px;padding:14px;text-align:center;width:50%;">
        <div style="font-size:12px;color:#bfdbfe;">${esc(s.level)}</div>
        <div dir="ltr" style="font-size:28px;font-weight:900;color:#ffffff;">${esc(level)}</div>
      </td>
    </tr></table>
    ${desc ? `<p style="font-size:13px;color:#475569;margin:0 0 14px 0;">${esc(desc)}</p>` : ""}
    <p style="font-size:13px;color:#475569;margin:0 0 4px 0;">
      <strong style="color:#15803d;">${correct}</strong> ${esc(r.correct)} ·
      <strong style="color:#b91c1c;">${wrong}</strong> ${esc(r.wrong)} ·
      <strong style="color:#b45309;">${none}</strong> ${esc(r.unanswered)}
    </p>
    <p style="font-size:15px;font-weight:800;color:#1e293b;margin:20px 0 0 0;">${esc(r.title)}</p>
    ${partsHtml}
  `;

  return {
    subject: s.subject(score, maxScore, level),
    heading: s.heading,
    bodyHtml,
    dir: s.dir,
    lang,
    maxWidth: 640,
  };
}
