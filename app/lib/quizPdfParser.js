// app/lib/quizPdfParser.js
//
// 🆕 استيراد أسئلة كويز (صح/غلط أو اختيار من متعدد) من ملف PDF بفورمات
// نصيّة بسيطة ومحدّدة — شوف app/api/quizzes/[id]/questions/import-pdf/route.js
// للاستخدام، و app/teacher/components/QuizPdfImportModal.jsx لواجهة الرفع
// وشرح الفورمات للمدرس.
//
// ------------------------------------------------------------------------
// فورمات ملف "صح / غلط" (True/False):
//
//   1. Water boils at 100°C at sea level.
//   Answer: True
//   Points: 1
//
//   2. The Earth is flat.
//   Answer: False
//
// - كل سؤال يبدأ بسطر "رقم. نص السؤال" (رقم متبوع بـ . أو ) أو : أو -).
// - سطر "Answer:" (أو "الإجابة:") لازم يكون True/False أو صح/غلط.
// - سطر "Points:" (أو "الدرجة:") اختياري، لو ملوش هيتحط 1 افتراضيًا.
//
// ------------------------------------------------------------------------
// فورمات ملف "اختيار من متعدد" (Multiple Choice):
//
//   1. What is the capital of France?
//   A) Paris *
//   B) London
//   C) Berlin
//   D) Madrid
//   Points: 2
//
// - كل سؤال يبدأ بسطر "رقم. نص السؤال" زي فوق.
// - الخيارات: سطر "حرف) نص الخيار" (A-F). حط "*" في آخر نص الخيار الصح.
// - بدل الـ "*"، ينفع كمان سطر منفصل "Answer: B" بعد الخيارات.
// - سطر "Points:" اختياري زي فوق.
// ==========================================================================

const TRUE_VALUES = new Set(["true", "t", "yes", "y", "1", "صح", "صحيح"]);
const FALSE_VALUES = new Set(["false", "f", "no", "n", "0", "خطأ", "خطا", "غلط"]);

// سطر فاصل بين صفحات pdf-parse ("-- 1 of 2 --") — بيتشال قبل التحليل.
const PAGE_BREAK_RE = /^--\s*\d+\s*of\s*\d+\s*--$/i;

const QUESTION_START_RE = /^(\d{1,3})[.).:\-]\s*(.+)$/;
const ANSWER_RE = /^(?:answer|ans|الاجابه|الاجابة|الإجابة|إجابة)\s*[:\-]\s*(.+)$/i;
const POINTS_RE = /^(?:points?|الدرجة|الدرجه|النقاط)\s*[:\-]\s*([\d.]+)$/i;
const OPTION_RE = /^([A-Za-z])[.).:\-]\s*(.+)$/;

function splitLines(rawText) {
  return String(rawText || "")
    .split("\n")
    .map((l) => l.replace(/\r/g, "").trim())
    .filter((l) => l && !PAGE_BREAK_RE.test(l));
}

/**
 * بيحوّل نص PDF (مستخرج بـ pdf-parse) لقائمة أسئلة "صح/غلط".
 * @returns {{ questions: Array, errors: string[] }}
 */
function parseTrueFalseText(rawText) {
  const lines = splitLines(rawText);
  const questions = [];
  const errors = [];
  let current = null;

  function flush() {
    if (!current) return;
    if (current.answer === null) {
      errors.push(`Question ${current.number} ("${current.text.slice(0, 40)}..."): missing "Answer: True/False" line`);
    } else {
      questions.push({
        type: "true_false",
        text: current.text,
        points: current.points ?? 1,
        options: [
          { text: "True", isCorrect: current.answer === true },
          { text: "False", isCorrect: current.answer === false },
        ],
      });
    }
    current = null;
  }

  for (const line of lines) {
    const aMatch = line.match(ANSWER_RE);
    const pMatch = !aMatch ? line.match(POINTS_RE) : null;
    const qMatch = !aMatch && !pMatch ? line.match(QUESTION_START_RE) : null;

    if (qMatch) {
      flush();
      current = { number: qMatch[1], text: qMatch[2].trim(), answer: null, points: null };
    } else if (aMatch && current) {
      const v = aMatch[1].trim().toLowerCase();
      if (TRUE_VALUES.has(v)) current.answer = true;
      else if (FALSE_VALUES.has(v)) current.answer = false;
    } else if (pMatch && current) {
      const n = parseFloat(pMatch[1]);
      if (Number.isFinite(n)) current.points = n;
    } else if (current && current.answer === null) {
      // سطر تكملة لنص سؤال طويل على أكتر من سطر
      current.text = `${current.text} ${line}`.trim();
    }
  }
  flush();

  return { questions, errors };
}

/**
 * بيحوّل نص PDF (مستخرج بـ pdf-parse) لقائمة أسئلة "اختيار من متعدد".
 * @returns {{ questions: Array, errors: string[] }}
 */
function parseMultipleChoiceText(rawText) {
  const lines = splitLines(rawText);
  const questions = [];
  const errors = [];
  let current = null;

  function flush() {
    if (!current) return;
    const opts = current.options;
    const correctCount = opts.filter((o) => o.isCorrect).length;
    if (opts.length < 2) {
      errors.push(`Question ${current.number} ("${current.text.slice(0, 40)}..."): needs at least 2 options (A, B, ...)`);
    } else if (correctCount === 0) {
      errors.push(`Question ${current.number} ("${current.text.slice(0, 40)}..."): no correct option marked (use "*" after the option, or an "Answer: <letter>" line)`);
    } else if (correctCount > 1) {
      errors.push(`Question ${current.number} ("${current.text.slice(0, 40)}..."): more than one option marked correct — mark only one`);
    } else {
      questions.push({
        type: "multiple_choice",
        text: current.text,
        points: current.points ?? 1,
        options: opts.slice(0, 6).map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      });
    }
    current = null;
  }

  for (const line of lines) {
    const oMatch = line.match(OPTION_RE);
    const pMatch = !oMatch ? line.match(POINTS_RE) : null;
    const aMatch = !oMatch && !pMatch ? line.match(ANSWER_RE) : null;
    const qMatch = !oMatch && !pMatch && !aMatch ? line.match(QUESTION_START_RE) : null;

    if (qMatch) {
      flush();
      current = { number: qMatch[1], text: qMatch[2].trim(), options: [], points: null };
    } else if (oMatch && current) {
      const letter = oMatch[1].toUpperCase();
      let text = oMatch[2].trim();
      let isCorrect = false;
      if (/\*\s*$/.test(text)) {
        isCorrect = true;
        text = text.replace(/\*\s*$/, "").trim();
      }
      current.options.push({ letter, text, isCorrect });
    } else if (aMatch && current) {
      const letter = aMatch[1].trim().toUpperCase();
      const opt = current.options.find((o) => o.letter === letter);
      if (opt) {
        current.options.forEach((o) => { o.isCorrect = false; });
        opt.isCorrect = true;
      }
    } else if (pMatch && current) {
      const n = parseFloat(pMatch[1]);
      if (Number.isFinite(n)) current.points = n;
    } else if (current && current.options.length === 0) {
      current.text = `${current.text} ${line}`.trim();
    }
  }
  flush();

  return { questions, errors };
}

export { parseTrueFalseText, parseMultipleChoiceText };