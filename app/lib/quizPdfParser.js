// quizPdfParser.js
//
// بيحوّل النص المستخرج من ملف PDF (بصيغة بنك أسئلة) لمصفوفة أسئلة جاهزة
// للحفظ في قاعدة البيانات (نفس شكل Question schema: type/text/points/options).
//
// الصيغة المتوقعة للملف (بالتفصيل في PDF_QUIZ_FORMAT.md المرفق):
//
//   س1: نص السؤال؟
//   أ) خيار أول
//   ب) خيار تاني
//   ج) خيار تالت
//   د) خيار رابع
//   الإجابة الصحيحة: ب
//   الدرجة: 2
//
//   (سطر فاضي بين كل سؤال والتاني)
//
//   س2: نص سؤال صح/غلط
//   الإجابة: صح
//
// الأسئلة اللي معاها خيارات (2 على الأقل) بتتحسب "اختيار من متعدد"،
// واللي إجابتها صح/غلط من غير خيارات بتتحسب "صح/غلط" تلقائيًا.

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(str) {
  return String(str).replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

// بيشيل التشكيل، الفواصل الزيادة، والمسافات المكررة عشان المقارنة تبقى مستقرة
function normalizeForCompare(str) {
  return normalizeDigits(str)
    .replace(/[\u064B-\u0652\u0640]/g, "") // تشكيل + تطويل
    .replace(/[\)\.\-–:،,]/g, "")
    .trim()
    .toLowerCase();
}

const QUESTION_START_RE = /^\s*(?:السؤال|سؤال|س|question|q)\s*[\d٠-٩]*\s*[:\-–.)]\s*(.*)$/i;

const OPTION_LINE_RE =
  /^\s*[\(\[]?([أإآاءبتثجحخدذرزسشصضطظعغفقكلمنهوىي]|[A-Za-z]|[\d٠-٩]{1,2})[\)\.\-–:]\s*(.+?)\s*$/;

const ANSWER_LINE_RE =
  /^\s*(?:الإجابة\s*الصحيحة|الاجابة\s*الصحيحة|الإجابة|الاجابة|الحل|answer)\s*[:\-–]\s*(.+?)\s*$/i;

const POINTS_LINE_RE = /^\s*(?:الدرجة|درجة\s*السؤال|النقاط|points?)\s*[:\-–]\s*([\d٠-٩.]+)/i;

const TYPE_HEADER_RE = /^\s*(?:نوع\s*الأسئلة|نوع\s*الملف|type)\s*[:\-–]\s*(.+?)\s*$/i;

const TRUE_VALUES = ["صح", "صحيح", "صحيحة", "true", "t", "نعم", "✓"];
const FALSE_VALUES = ["خطأ", "خطا", "غلط", "خاطئ", "خاطئة", "false", "f", "لا", "✗"];

function detectForcedTypeFromHeader(line) {
  const m = line.match(TYPE_HEADER_RE);
  if (!m) return null;
  const v = normalizeForCompare(m[1]);
  if (v.includes("صح") && v.includes("غلط")) return "true_false";
  if (v.includes("متعدد") || v.includes("اختيار") || v.includes("multiple") || v.includes("choice")) return "multiple_choice";
  if (v.includes("صح") || v.includes("غلط") || v.includes("true") || v.includes("false")) return "true_false";
  return null;
}

// بيقسّم النص لكتل أسئلة: أي سطر يطابق QUESTION_START_RE بيبدأ كتلة جديدة
function splitIntoBlocks(lines) {
  const blocks = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue; // نتجاهل الأسطر الفاضية، الفصل بيحصل بمجرد ظهور سؤال جديد
    if (QUESTION_START_RE.test(line)) {
      if (current) blocks.push(current);
      current = { firstLine: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
    // أي سطر قبل أول سؤال (غير هيدر النوع) بيتجاهل تلقائيًا
  }
  if (current) blocks.push(current);
  return blocks;
}

function parseBlock(block, forcedType, index) {
  const qMatch = block.firstLine.match(QUESTION_START_RE);
  const textParts = [(qMatch ? qMatch[1] : block.firstLine).trim()].filter(Boolean);

  const options = []; // { marker, text }
  let answerRaw = null;
  let points = null;

  for (const line of block.lines) {
    const ansMatch = line.match(ANSWER_LINE_RE);
    if (ansMatch) {
      answerRaw = ansMatch[1].trim();
      continue;
    }
    const ptsMatch = line.match(POINTS_LINE_RE);
    if (ptsMatch) {
      points = parseFloat(normalizeDigits(ptsMatch[1]));
      continue;
    }
    const optMatch = line.match(OPTION_LINE_RE);
    if (optMatch) {
      options.push({ marker: optMatch[1], text: optMatch[2].trim() });
      continue;
    }
    // سطر مكمل لنص السؤال (سؤال بيمتد لأكتر من سطر قبل ما تيجي الخيارات/الإجابة)
    if (options.length === 0 && answerRaw === null) {
      textParts.push(line);
    }
  }

  const text = textParts.join(" ").replace(/\s+/g, " ").trim();

  if (!text) return { error: { index, reason: "missing_question_text", preview: block.firstLine } };
  if (answerRaw === null) return { error: { index, reason: "missing_answer", preview: text.slice(0, 60) } };

  const type = forcedType || (options.length >= 2 ? "multiple_choice" : "true_false");

  if (type === "true_false") {
    const norm = normalizeForCompare(answerRaw);
    let isTrue = null;
    if (TRUE_VALUES.some((v) => normalizeForCompare(v) === norm)) isTrue = true;
    else if (FALSE_VALUES.some((v) => normalizeForCompare(v) === norm)) isTrue = false;
    if (isTrue === null) return { error: { index, reason: "invalid_true_false_answer", preview: answerRaw } };
    return {
      question: {
        type: "true_false",
        text,
        points: points ?? 1,
        options: [
          { text: "صح", isCorrect: isTrue },
          { text: "غلط", isCorrect: !isTrue },
        ],
      },
    };
  }

  // multiple_choice
  if (options.length < 2) return { error: { index, reason: "not_enough_options", preview: text.slice(0, 60) } };

  const answerKeys = answerRaw.split(/[،,\/]/).map((s) => normalizeForCompare(s)).filter(Boolean);
  const correctIdx = new Set();
  for (const key of answerKeys) {
    // 1) تطابق مع رمز الخيار (أ/ب/ج/د أو A/B/C/D أو 1/2/3)
    let idx = options.findIndex((o) => normalizeForCompare(o.marker) === key);
    // 2) تطابق مع نص الخيار كامل
    if (idx === -1) idx = options.findIndex((o) => normalizeForCompare(o.text) === key);
    // 3) لو رقم، اعتبره ترتيب الخيار (1-based)
    if (idx === -1 && /^\d+$/.test(key)) {
      const n = parseInt(key, 10);
      if (n >= 1 && n <= options.length) idx = n - 1;
    }
    if (idx !== -1) correctIdx.add(idx);
  }

  if (correctIdx.size === 0) return { error: { index, reason: "answer_not_matched_to_option", preview: answerRaw } };

  return {
    question: {
      type: "multiple_choice",
      text,
      points: points ?? 1,
      options: options.map((o, i) => ({ text: o.text, isCorrect: correctIdx.has(i) })),
    },
  };
}

/**
 * @param {string} rawText - النص المستخرج من الـ PDF (pdf-parse أو أي مكتبة تانية)
 * @param {{ forcedType?: 'multiple_choice' | 'true_false' }} options
 * @returns {{ questions: Array, errors: Array }}
 */
export function parseQuizPdfText(rawText, options = {}) {
  const lines = String(rawText || "").split(/\r?\n/);

  let forcedType = options.forcedType || null;
  const contentLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!forcedType) {
      const detected = detectForcedTypeFromHeader(trimmed);
      if (detected) {
        forcedType = detected;
        continue; // سطر الهيدر ده مش جزء من أي سؤال
      }
    }
    contentLines.push(line);
  }

  const blocks = splitIntoBlocks(contentLines);
  const questions = [];
  const errors = [];

  blocks.forEach((block, i) => {
    const result = parseBlock(block, forcedType, i + 1);
    if (result.question) questions.push(result.question);
    else if (result.error) errors.push(result.error);
  });

  return { questions, errors };
}