// app/lib/placementTestEdits.js
//
// تعديلات الأدمن على الأسئلة في شاشة "Review" قبل النشر (بعد رفع الملف).
// الملف الأصلي بيتقرا ويتحقق منه الأول، وبعدين التعديلات بتتطبّق فوق الاختبار المقروء — وبتتراجع بالكامل لو فيها أي خطأ
// (يعني مفيش تعديل بيتطبّق نصّه). التعديلات بتتحقق بنفس حدود قارئ الملفات.
//
// شكل التعديلات: { [رقم السؤال]: { q?, ctx?, options?, correct? } }
//   q       : نص السؤال (مطلوب مش فاضي)
//   ctx     : سياق/عنوان السؤال (اختياري، ممكن يكون فاضي)
//   options : الخيارات (مهام الاختيار فقط — مهام الربط خياراتها من شيت Bank بتتجاهل)
//   correct : رقم الخيار الصحيح (index من 0)
// مفيش إضافة/حذف أسئلة هنا — ده بيغيّر الترقيم ومفتاح الإجابات والصوتيات، فبيتم من الملف نفسه.

import { LIMITS, MAX_OPTIONS } from "@/app/lib/placementTestSheetSpec";

const bad = (n, en, ar) => ({ sheet: "Review", row: n, en: `Q${n}: ${en}`, ar: `س${n}: ${ar}` });

export function applyReviewEdits(test, edits) {
  const errors = [];
  if (edits === undefined || edits === null) return { ok: true, errors, count: 0 };
  if (typeof edits !== "object" || Array.isArray(edits)) {
    return { ok: false, errors: [{ sheet: "Review", row: null, en: "Invalid edits payload.", ar: "صيغة التعديلات غير صحيحة." }], count: 0 };
  }

  const byN = new Map();
  for (const part of test.parts || []) {
    for (const task of part.tasks || []) {
      for (const q of task.questions || []) byN.set(q.n, { q, task });
    }
  }

  const staged = [];
  for (const [key, e] of Object.entries(edits)) {
    const n = Number(key);
    const hit = Number.isInteger(n) ? byN.get(n) : null;
    if (!hit) {
      errors.push(bad(key, "this question does not exist in the file.", "السؤال ده مش موجود في الملف."));
      continue;
    }
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      errors.push(bad(n, "invalid edit.", "تعديل غير صحيح."));
      continue;
    }
    const { q, task } = hit;
    const isMatching = Boolean(task.bank);
    const next = { q: q.q, ctx: q.ctx || "", o: q.o, a: test.answerKey?.[n]?.a ?? 0 };
    const before = errors.length;

    if (e.q !== undefined) {
      if (typeof e.q !== "string" || !e.q.trim()) errors.push(bad(n, "question text is empty.", "نص السؤال فاضي."));
      else if (e.q.trim().length > LIMITS.question) errors.push(bad(n, `question is too long (max ${LIMITS.question}).`, `نص السؤال طويل جدًا (أقصى ${LIMITS.question}).`));
      else next.q = e.q.trim();
    }
    if (e.ctx !== undefined) {
      if (typeof e.ctx !== "string") errors.push(bad(n, "invalid context.", "السياق غير صحيح."));
      else if (e.ctx.trim().length > LIMITS.context) errors.push(bad(n, `context is too long (max ${LIMITS.context}).`, `السياق طويل جدًا (أقصى ${LIMITS.context}).`));
      else next.ctx = e.ctx.trim();
    }
    if (e.options !== undefined && !isMatching) {
      const opts = e.options;
      if (!Array.isArray(opts) || opts.some((o) => typeof o !== "string")) errors.push(bad(n, "invalid options.", "الخيارات غير صحيحة."));
      else {
        const trimmed = opts.map((o) => o.trim());
        if (trimmed.length < 2) errors.push(bad(n, "a question needs at least 2 options.", "السؤال محتاج خيارين على الأقل."));
        else if (trimmed.length > MAX_OPTIONS) errors.push(bad(n, `at most ${MAX_OPTIONS} options.`, `أقصى عدد خيارات ${MAX_OPTIONS}.`));
        else if (trimmed.some((o) => !o)) errors.push(bad(n, "options cannot be empty.", "الخيارات مينفعش تبقى فاضية."));
        else if (trimmed.some((o) => o.length > LIMITS.option)) errors.push(bad(n, `an option is too long (max ${LIMITS.option}).`, `أحد الخيارات طويل جدًا (أقصى ${LIMITS.option}).`));
        else next.o = trimmed;
      }
    }
    if (e.correct !== undefined) {
      if (!Number.isInteger(e.correct)) errors.push(bad(n, "correct answer is not set.", "الإجابة الصحيحة مش متحدّدة."));
      else next.a = e.correct;
    }
    // الإجابة لازم تكون ضمن الخيارات النهائية (حتى لو الخيارات اتغيّرت والإجابة لأ)
    if (errors.length === before && (next.a < 0 || next.a >= next.o.length)) {
      errors.push(bad(n, "the correct answer must be one of the options.", "الإجابة الصحيحة لازم تكون واحد من الخيارات."));
    }
    if (errors.length === before) staged.push({ q, n, next });
  }

  if (errors.length) return { ok: false, errors, count: 0 };

  let count = 0;
  for (const { q, n, next } of staged) {
    const changed = q.q !== next.q || (q.ctx || "") !== next.ctx || q.o.join("\u0000") !== next.o.join("\u0000") || (test.answerKey?.[n]?.a ?? 0) !== next.a;
    if (!changed) continue;
    q.q = next.q;
    if (next.ctx) q.ctx = next.ctx;
    else delete q.ctx;
    q.o = next.o;
    test.answerKey[n] = { ...(test.answerKey[n] || {}), a: next.a };
    count += 1;
  }
  return { ok: true, errors, count };
}
