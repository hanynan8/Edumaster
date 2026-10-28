// ═══════════════════════════════════════════════
//  app/lib/placementTestEditor.js
//  🆕 محرّر الاختبار الكامل (قبل النشر في شاشة Review، وبعد النشر من كارت الاختبار).
//
//  الأدمن بيقدر يعدّل كل حاجة: عنوان/مستوى/حدود الاختبار، الأجزاء والمهام (إضافة/حذف/ترتيب/نقل)،
//  تعليمات ونصوص المهام، بنك الربط، الأسئلة والخيارات والإجابة الصحيحة، وأماكن الأوديو
//  (تسجيل واحد للمهمة كلها، أو تسجيل لكل سؤال، أو من غير صوت) + تسميات ونصوص التسجيلات.
//
//  ملف "pure": مفيش فيه mongo ولا exceljs ولا مفاتيح إجابات الاختبارات المدمجة،
//  فآمن يتستورد في المتصفح (للتحقق اللحظي) وفي السيرفر (التحقق الحقيقي قبل الحفظ).
//
//  شكل الـ payload (editable):
//   {
//     label, title, subject, thresholds: [a,b,c],
//     parts: [{ title, minutes, tasks: [{
//        title, intro, passage,
//        audioSlot: number|null,            // تسجيل واحد للمهمة كلها
//        bank: null | [{ t }],              // مهمة ربط (Matching): نصوص البنك (الحروف A,B,C بالترتيب تلقائي)
//        questions: [{ n?, q, ctx, options: [..], correct: index, audioSlot: number|null }]
//     }]}],
//     audio: [{ slot, label, script }]      // تعريفات خانات الصوت
//   }
//   - n = رقم السؤال الثابت (مفتاح الإجابات ونتايج الطلاب القديمة). السؤال الجديد من غير n.
//     الأسئلة الموجودة بتحتفظ بـ n حتى لو اتنقلت أو اتحذف اللي قبلها، فنتايج الطلاب القديمة مابتتلخبطش.
//     رقم العرض للطالب (ln) بيتحسب تلقائي حسب الترتيب.
// ═══════════════════════════════════════════════

import { CEFR_BASES } from "@/app/lib/placementLevels";
import {
  LIMITS,
  MAX_AUDIO_SLOT,
  MAX_BANK,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  OPTION_LETTERS,
  SUBJECT_CODES,
  DEFAULT_PART_MINUTES,
  DEFAULT_THRESHOLDS,
} from "@/app/lib/placementTestSheetSpec";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));

// ───────── اختبار (من الداتابيز أو من الملف المقروء) → payload قابل للتعديل ─────────
export function testToEditable(test) {
  const key = test?.answerKey || {};
  const scripts = test?.scripts || {};
  return {
    label: test?.label || "",
    title: test?.title || "",
    subject: test?.subject || "es",
    thresholds: Array.isArray(test?.thresholds) && test.thresholds.length === 3 ? [...test.thresholds] : [...DEFAULT_THRESHOLDS],
    parts: (test?.parts || []).map((p) => ({
      title: p.title || "",
      minutes: p.minutes ?? DEFAULT_PART_MINUTES,
      tasks: (p.tasks || []).map((t) => ({
        title: t.title || "",
        intro: t.intro || "",
        passage: t.passage || "",
        audioSlot: t.audioSlot ?? null,
        bank: t.bank ? t.bank.map((b) => ({ t: b.t })) : null,
        questions: (t.questions || []).map((q) => ({
          n: q.n,
          q: q.q || "",
          ctx: q.ctx || "",
          options: t.bank ? [] : [...(q.o || [])],
          correct: Number.isInteger(key[q.n]?.a) ? key[q.n].a : null,
          audioSlot: q.audioSlot ?? null,
        })),
      })),
    })),
    audio: (test?.audioSlots || []).map((a) => ({
      slot: a.slot,
      label: a.label || "",
      script: scripts[a.slot] || "",
    })),
  };
}

// كل أرقام الأسئلة الموجودة في الاختبار (للتحقق إن الـ payload مش بيدّعي أرقام مش بتاعته)
export function listQuestionNs(test) {
  const out = [];
  for (const p of test?.parts || []) for (const t of p.tasks || []) for (const q of t.questions || []) out.push(q.n);
  return out;
}

// الرقم اللي بنبدأ منه للأسئلة الجديدة: أكبر رقم اتستخدم + 1 (وبنحترم nextN المخزّن عشان رقم سؤال اتحذف ما يترجعش لسؤال تاني)
export function nextQuestionNumber(test) {
  const max = Math.max(0, ...listQuestionNs(test).filter(Number.isInteger), ...Object.keys(test?.answerKey || {}).map(Number).filter(Number.isInteger));
  return Math.max(Number.isInteger(test?.nextN) ? test.nextN : 0, max + 1);
}

function parseThresholds(raw) {
  const arr = Array.isArray(raw) ? raw : String(raw ?? "").split(/[\s,;/|-]+/).filter(Boolean);
  const nums = arr.map((x) => (typeof x === "number" ? x : /^\d+$/.test(String(x).trim()) ? Number(x) : NaN));
  if (nums.length !== 3) return null;
  if (!nums.every((n) => Number.isInteger(n) && n >= 1 && n <= 99)) return null;
  if (!(nums[0] < nums[1] && nums[1] < nums[2])) return null;
  return nums;
}

// رقم خانة صوت: null لو مفيش، NaN لو غلط، أو رقم صحيح 1–60
function parseSlot(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : /^\d+$/.test(String(v).trim()) ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= MAX_AUDIO_SLOT ? n : NaN;
}

// ───────── payload → اختبار جاهز للحفظ (بيتحقق من كل حاجة) ─────────
// options:
//   renumber  : true → الأسئلة بتتـرقّم من 1 بالترتيب (اختبار جديد/مرفوع من ملف — مفيش نتايج قديمة تتحمى)
//               false (الافتراضي) → الأسئلة الموجودة بتحتفظ بـ n، والجديدة بتاخد أرقام جديدة من nextN
//   allowedNs : أرقام الأسئلة المسموح بيها (اللي في الاختبار الحالي) — أي n تاني = خطأ
//   nextN     : أول رقم للأسئلة الجديدة
// الرد: { ok, errors, warnings, test, stats } — errors/warnings: { sheet:"Editor", row:null, where, en, ar }
export function buildTestFromEditable(input, { renumber = false, allowedNs = null, nextN = null } = {}) {
  const errors = [];
  const warnings = [];
  const add = (list, where, en, ar) => list.push({ sheet: "Editor", row: null, where, en: where ? `${where}: ${en}` : en, ar: where ? `${where}: ${ar}` : ar });
  const err = (where, en, ar) => add(errors, where, en, ar);
  const warn = (where, en, ar) => add(warnings, where, en, ar);
  const fail = () => ({ ok: false, errors, warnings, test: null, stats: null });

  if (!isObj(input)) {
    err("", "Invalid test data.", "بيانات الاختبار غير صحيحة.");
    return fail();
  }

  // ───── الإعدادات ─────
  const label = str(input.label).toUpperCase().trim();
  if (!CEFR_BASES.includes(label)) err("Settings", `Level (CEFR) must be one of ${CEFR_BASES.join(", ")}.`, `المستوى لازم يكون واحد من: ${CEFR_BASES.join(", ")}.`);
  const title = str(input.title).trim();
  if (!title) err("Settings", "Test title is required.", "عنوان الاختبار مطلوب.");
  else if (title.length > LIMITS.title) err("Settings", `Test title is too long (max ${LIMITS.title}).`, `عنوان الاختبار طويل جدًا (أقصى ${LIMITS.title}).`);
  const subject = str(input.subject || "es").toLowerCase().trim();
  if (!SUBJECT_CODES.includes(subject)) err("Settings", `Subject must be one of ${SUBJECT_CODES.join(", ")}.`, `Subject لازم يكون واحد من: ${SUBJECT_CODES.join(", ")}.`);
  const thresholds = input.thresholds === undefined || input.thresholds === null ? DEFAULT_THRESHOLDS : parseThresholds(input.thresholds);
  if (!thresholds) err("Settings", "Level thresholds must be 3 increasing numbers between 1 and 99 (e.g. 40, 60, 80).", "حدود المستويات لازم تكون 3 أرقام تصاعدية بين 1 و99 (مثال: 40, 60, 80).");

  if (!Array.isArray(input.parts) || !input.parts.length) {
    err("", "The test needs at least one part.", "الاختبار محتاج جزء واحد على الأقل.");
    return fail();
  }

  // ───── تعريفات الصوت ─────
  const audioDefs = new Map(); // slot → { label, script }
  for (const [i, a] of (Array.isArray(input.audio) ? input.audio : []).entries()) {
    const where = `Audio recording ${i + 1}`;
    if (!isObj(a)) {
      err(where, "invalid recording.", "تسجيل غير صحيح.");
      continue;
    }
    const slot = parseSlot(a.slot);
    if (slot === null || Number.isNaN(slot)) {
      err(where, `slot must be a number 1–${MAX_AUDIO_SLOT}.`, `رقم الخانة لازم يكون من 1 لـ ${MAX_AUDIO_SLOT}.`);
      continue;
    }
    if (audioDefs.has(slot)) {
      err(where, `slot ${slot} is listed twice.`, `الخانة ${slot} مكررة.`);
      continue;
    }
    const lbl = str(a.label).trim();
    const script = str(a.script).trim();
    if (lbl.length > LIMITS.label) err(where, `label is too long (max ${LIMITS.label}).`, `الاسم طويل جدًا (أقصى ${LIMITS.label}).`);
    if (script.length > LIMITS.script) err(where, `script is too long (max ${LIMITS.script}).`, `نص التسجيل طويل جدًا (أقصى ${LIMITS.script}).`);
    audioDefs.set(slot, { label: lbl, script });
  }

  // ───── الأجزاء → المهام → الأسئلة ─────
  const allowed = allowedNs ? new Set(allowedNs) : null;
  const seenN = new Set();
  const draft = []; // [{ part, tasks: [{ task, bank, questions: [{ src, q }] }] }]
  let total = 0;

  input.parts.forEach((p, pi) => {
    const pw = `Part ${pi + 1}`;
    if (!isObj(p)) return err(pw, "invalid part.", "جزء غير صحيح.");
    const pTitle = str(p.title).trim();
    if (!pTitle) err(pw, "part title is required.", "اسم الجزء مطلوب.");
    else if (pTitle.length > LIMITS.partTitle) err(pw, `part title is too long (max ${LIMITS.partTitle}).`, `اسم الجزء طويل جدًا (أقصى ${LIMITS.partTitle}).`);
    let minutes = DEFAULT_PART_MINUTES;
    if (p.minutes !== undefined && p.minutes !== null && p.minutes !== "") {
      const m = typeof p.minutes === "number" ? p.minutes : /^\d+$/.test(String(p.minutes).trim()) ? Number(p.minutes) : NaN;
      if (!Number.isInteger(m) || m < 1 || m > 300) err(pw, "minutes must be a whole number between 1 and 300.", "الدقائق لازم تكون رقم صحيح بين 1 و300.");
      else minutes = m;
    }
    if (!Array.isArray(p.tasks) || !p.tasks.length) {
      err(pw, "the part needs at least one task.", "الجزء محتاج مهمة واحدة على الأقل.");
      return;
    }

    const tasksDraft = [];
    let partLn = 0; // عدد أسئلة المهام اللي قبل كده في نفس الجزء — عشان مكان الخطأ يستخدم نفس رقم السؤال اللي الطالب بيشوفه (ln)
    p.tasks.forEach((t, ti) => {
      const tw = `${pw} › Task ${ti + 1}`;
      const ln0 = partLn;
      if (isObj(t) && Array.isArray(t.questions)) partLn += t.questions.length;
      if (!isObj(t)) return err(tw, "invalid task.", "مهمة غير صحيحة.");
      const tTitle = str(t.title).trim();
      if (!tTitle) err(tw, "task title is required.", "اسم المهمة مطلوب.");
      else if (tTitle.length > LIMITS.taskTitle) err(tw, `task title is too long (max ${LIMITS.taskTitle}).`, `اسم المهمة طويل جدًا (أقصى ${LIMITS.taskTitle}).`);
      const intro = str(t.intro).trim();
      if (intro.length > LIMITS.intro) err(tw, `instructions are too long (max ${LIMITS.intro}).`, `التعليمات طويلة جدًا (أقصى ${LIMITS.intro}).`);
      const passage = str(t.passage).trim();
      if (passage.length > LIMITS.passage) err(tw, `passage is too long (max ${LIMITS.passage}).`, `النص المشترك طويل جدًا (أقصى ${LIMITS.passage}).`);

      const taskSlot = parseSlot(t.audioSlot);
      if (Number.isNaN(taskSlot)) err(tw, `audio slot must be a number 1–${MAX_AUDIO_SLOT}.`, `رقم خانة الصوت لازم يكون من 1 لـ ${MAX_AUDIO_SLOT}.`);

      // بنك الربط
      let bank = null;
      if (t.bank !== null && t.bank !== undefined) {
        if (!Array.isArray(t.bank)) err(tw, "invalid matching bank.", "بنك الربط غير صحيح.");
        else {
          const texts = t.bank.map((b) => str(isObj(b) ? b.t : b).trim());
          if (texts.length < 2) err(tw, "a matching task needs at least 2 bank texts.", "مهمة الربط محتاجة نصّين على الأقل في البنك.");
          else if (texts.length > MAX_BANK) err(tw, `a matching bank can have at most ${MAX_BANK} texts.`, `بنك الربط أقصى عدد نصوص فيه ${MAX_BANK}.`);
          else if (texts.some((x) => !x)) err(tw, "bank texts cannot be empty.", "نصوص البنك مينفعش تبقى فاضية.");
          else if (texts.some((x) => x.length > LIMITS.bankText)) err(tw, `a bank text is too long (max ${LIMITS.bankText}).`, `أحد نصوص البنك طويل جدًا (أقصى ${LIMITS.bankText}).`);
          else bank = texts.map((x, i) => ({ l: OPTION_LETTERS[i], t: x }));
        }
      }
      const isMatching = Array.isArray(t.bank);

      if (!Array.isArray(t.questions) || !t.questions.length) {
        err(tw, "the task needs at least one question.", "المهمة محتاجة سؤال واحد على الأقل.");
        return;
      }

      const questionsDraft = [];
      let anyQuestionAudio = false;
      t.questions.forEach((q, qi) => {
        const qw = `${tw} › Q${ln0 + qi + 1}`;
        if (!isObj(q)) return err(qw, "invalid question.", "سؤال غير صحيح.");
        total += 1;
        const qText = str(q.q).trim();
        if (!qText) err(qw, "question text is empty.", "نص السؤال فاضي.");
        else if (qText.length > LIMITS.question) err(qw, `question is too long (max ${LIMITS.question}).`, `السؤال طويل جدًا (أقصى ${LIMITS.question}).`);
        const ctx = str(q.ctx).trim();
        if (ctx.length > LIMITS.context) err(qw, `context is too long (max ${LIMITS.context}).`, `السياق طويل جدًا (أقصى ${LIMITS.context}).`);

        // رقم السؤال الثابت
        let n = null;
        if (!renumber && q.n !== undefined && q.n !== null && q.n !== "") {
          if (!Number.isInteger(q.n) || q.n < 1 || (allowed && !allowed.has(q.n))) err(qw, "unknown question id (reload the editor).", "رقم السؤال غير معروف (أعد فتح المحرر).");
          else if (seenN.has(q.n)) err(qw, "this question appears twice.", "السؤال ده متكرر.");
          else {
            n = q.n;
            seenN.add(n);
          }
        }

        // الخيارات + الإجابة
        let options;
        if (isMatching) {
          options = bank ? bank.map((b) => b.l) : [];
        } else {
          if (!Array.isArray(q.options) || q.options.some((o) => typeof o !== "string")) {
            err(qw, "invalid options.", "الخيارات غير صحيحة.");
            options = [];
          } else {
            options = q.options.map((o) => o.trim());
            if (options.length < 2) err(qw, "a question needs at least 2 options.", "السؤال محتاج خيارين على الأقل.");
            else if (options.length > MAX_OPTIONS) err(qw, `at most ${MAX_OPTIONS} options.`, `أقصى عدد خيارات ${MAX_OPTIONS}.`);
            else if (options.some((o) => !o)) err(qw, "options cannot be empty.", "الخيارات مينفعش تبقى فاضية.");
            else if (options.some((o) => o.length > LIMITS.option)) err(qw, `an option is too long (max ${LIMITS.option}).`, `أحد الخيارات طويل جدًا (أقصى ${LIMITS.option}).`);
            else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) warn(qw, "two options have the same text.", "فيه خيارين بنفس النص.");
          }
        }
        let correct = q.correct;
        if (typeof correct === "string" && /^\d+$/.test(correct)) correct = Number(correct);
        if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) err(qw, "pick the correct answer.", "اختار الإجابة الصحيحة.");

        const qSlot = parseSlot(q.audioSlot);
        if (Number.isNaN(qSlot)) err(qw, `audio slot must be a number 1–${MAX_AUDIO_SLOT}.`, `رقم خانة الصوت لازم يكون من 1 لـ ${MAX_AUDIO_SLOT}.`);
        if (qSlot !== null && !Number.isNaN(qSlot)) anyQuestionAudio = true;

        questionsDraft.push({ n, q: qText, ctx, options, correct, audioSlot: qSlot });
      });

      if (taskSlot !== null && !Number.isNaN(taskSlot) && anyQuestionAudio)
        err(tw, "use either one recording for the whole task or a recording per question — not both.", "استخدم تسجيل واحد للمهمة كلها أو تسجيل لكل سؤال — مش الاتنين مع بعض.");

      tasksDraft.push({ title: tTitle, intro, passage, taskSlot, bank, isMatching, questions: questionsDraft });
    });
    draft.push({ title: pTitle, minutes, tasks: tasksDraft });
  });

  if (total > MAX_QUESTIONS) err("", `Too many questions (max ${MAX_QUESTIONS}).`, `عدد الأسئلة أكبر من المسموح (أقصى ${MAX_QUESTIONS}).`);
  if (total < 1 && !errors.length) err("", "The test needs at least one question.", "الاختبار محتاج سؤال واحد على الأقل.");
  if (errors.length) return fail();

  // ───── ترقيم + بناء الهيكل النهائي ─────
  let counter = 1;
  let nextFree;
  if (renumber) nextFree = 0;
  else {
    const maxUsed = Math.max(0, ...seenN);
    nextFree = Math.max(Number.isInteger(nextN) ? nextN : 1, maxUsed + 1);
  }
  const answerKey = {};
  const usage = new Map(); // slot → [نص مكان الاستخدام]
  const noteUsage = (slot, text) => {
    if (!usage.has(slot)) usage.set(slot, []);
    usage.get(slot).push(text);
  };
  let matchingTasks = 0;
  let taskCount = 0;
  let maxN = 0;

  const parts = draft.map((p, pi) => {
    let ln = 0;
    const tasks = p.tasks.map((t) => {
      taskCount += 1;
      if (t.isMatching) matchingTasks += 1;
      const firstLn = ln + 1;
      const questions = t.questions.map((q) => {
        ln += 1;
        let n = q.n;
        if (renumber) n = counter++;
        else if (n === null) n = nextFree++;
        maxN = Math.max(maxN, n);
        answerKey[n] = { a: q.correct };
        const out = { n, ln, q: q.q };
        if (q.ctx) out.ctx = q.ctx;
        out.o = q.options;
        if (q.audioSlot !== null) {
          out.audioSlot = q.audioSlot;
          noteUsage(q.audioSlot, `${p.title} › ${t.title} › Q${ln}`);
        }
        return out;
      });
      const task = { title: t.title };
      if (t.intro) task.intro = t.intro;
      if (t.passage) task.passage = t.passage;
      if (t.taskSlot !== null) {
        task.audioSlot = t.taskSlot;
        noteUsage(t.taskSlot, `${p.title} › ${t.title} (${firstLn === ln ? `Q${ln}` : `Q${firstLn}–Q${ln}`})`);
      }
      if (t.bank) task.bank = t.bank;
      task.questions = questions;
      return task;
    });
    return { id: `part-${pi + 1}`, title: p.title, minutes: p.minutes, tasks };
  });

  // ───── خانات الصوت (مكتبة التسجيلات) ─────
  // كل تسجيل معرّف في الـ payload بيفضل موجود (وملفه المرفوع كمان) حتى لو مفيش مهمة/سؤال بيشغّله دلوقتي —
  // عشان الأدمن يقدر يفصله عن مكان ويوصّله بمكان تاني من غير ما يعيد الرفع. بيتشال بس لما الأدمن يحذفه صراحةً.
  // التسجيل اللي مفيش مكان بيشغّله مبيأثرش على الطالب (المهام/الأسئلة هي اللي بتتحكم في الظهور).
  const audioSlots = [];
  const scripts = {};
  const slotNumbers = [...new Set([...usage.keys(), ...audioDefs.keys()])].sort((a, b) => a - b);
  for (const slot of slotNumbers) {
    const d = audioDefs.get(slot);
    audioSlots.push({ slot, label: d?.label || `Audio ${slot}`, hint: usage.has(slot) ? usage.get(slot).join(" · ") : "Not used by any task yet" });
    if (d?.script) scripts[slot] = d.script;
    if (!usage.has(slot)) warn("Audio", `recording ${slot} is not played by any task/question yet.`, `التسجيل رقم ${slot} مش مربوط بأي مهمة/سؤال لسه.`);
  }

  if (total < 5) warn("", "The test has fewer than 5 questions.", "الاختبار فيه أقل من 5 أسئلة.");

  return {
    ok: true,
    errors,
    warnings,
    test: {
      label,
      title,
      subject,
      thresholds,
      parts,
      answerKey,
      audioSlots,
      scripts,
      nextN: renumber ? maxN + 1 : Math.max(nextFree, maxN + 1),
    },
    stats: { parts: parts.length, tasks: taskCount, questions: total, matchingTasks, audioSlots: audioSlots.length },
  };
}
