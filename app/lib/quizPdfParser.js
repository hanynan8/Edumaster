// quizPdfParser.js
//
// بيحوّل النص المستخرج من ملف PDF (بصيغة بنك أسئلة) لمصفوفة أسئلة جاهزة
// للحفظ في قاعدة البيانات (نفس شكل Question schema: type/text/points/options).
//
// بيدعم 3 لغات (زي الموقع بالظبط: عربي / إنجليزي / إسباني) — كل سؤال
// بيتعرف على لغته لوحده من الكلمات المفتاحية المستخدمة فيه (س / Question /
// Pregunta...)، وبيتخزن نص خياري "صح/غلط" بنفس لغة السؤال تلقائيًا. تقدر
// كمان تجبر لغة معيّنة لكل الملف عن طريق باراميتر forcedLang.
//
// أمثلة الصيغة (تفصيل كامل في PDF_QUIZ_FORMAT.md):
//
//   عربي:                          English:                        Español:
//   س1: نص السؤال؟                  Question 1: question text?       Pregunta 1: texto de la pregunta?
//   أ) خيار                         A) option                        A) opción
//   ب) خيار                         B) option                        B) opción
//   الإجابة الصحيحة: ب              Answer: B                        Respuesta correcta: B
//   الدرجة: 2                       Points: 2                        Puntos: 2
//
//   صح/غلط:                        True/False:                      Verdadero/Falso:
//   س1: نص السؤال                   Question 1: statement             Pregunta 1: enunciado
//   الإجابة: صح                     Answer: True                      Respuesta: Verdadero

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(str) {
  return String(str).replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

// بيشيل التشكيل، علامات الترقيم، والمسافات الزيادة، وبيحوّل لحروف صغيرة
// (بيأثرش على العربي) عشان المقارنة تبقى مستقرة بغض النظر عن اللغة
function normalizeForCompare(str) {
  return normalizeDigits(str)
    .replace(/[\u064B-\u0652\u0640]/g, "") // تشكيل + تطويل عربي
    .replace(/[¿¡]/g, "") // علامات استفهام/تعجب الإسبانية المقلوبة
    .replace(/[\)\.\-–:،,]/g, "")
    .trim()
    .toLowerCase();
}

// ------------------------------------------------------------------------
// تعريفات اللغات — كل لغة عندها الكلمات المفتاحية بتاعتها لبداية السؤال،
// سطر الإجابة، سطر الدرجة، ونص "صح/غلط" اللي هيتخزن في الأوبشنز
// ------------------------------------------------------------------------
const LANG_DEFS = {
  ar: {
    questionRe: /^\s*(?:السؤال|سؤال|س)\s*[\d٠-٩]*\s*[:\-–.)]\s*(.*)$/i,
    answerRe: /^\s*(?:الإجابة\s*الصحيحة|الاجابة\s*الصحيحة|الإجابة|الاجابة|الحل)\s*[:\-–]\s*(.+?)\s*$/i,
    pointsRe: /^\s*(?:الدرجة|درجة\s*السؤال|النقاط)\s*[:\-–]\s*([\d٠-٩.]+)/i,
    trueLabel: "صح",
    falseLabel: "غلط",
  },
  en: {
    questionRe: /^\s*(?:question|q)\s*[\d]*\s*[:\-–.)]\s*(.*)$/i,
    answerRe: /^\s*(?:correct\s*answer|answer)\s*[:\-–]\s*(.+?)\s*$/i,
    pointsRe: /^\s*(?:points?|score)\s*[:\-–]\s*([\d.]+)/i,
    trueLabel: "True",
    falseLabel: "False",
  },
  es: {
    questionRe: /^\s*(?:pregunta|p)\s*[\d]*\s*[:\-–.)]\s*(.*)$/i,
    answerRe: /^\s*(?:respuesta\s*correcta|respuesta|soluci[oó]n)\s*[:\-–]\s*(.+?)\s*$/i,
    pointsRe: /^\s*(?:puntos?|puntuaci[oó]n)\s*[:\-–]\s*([\d.]+)/i,
    trueLabel: "Verdadero",
    falseLabel: "Falso",
  },
};
const LANG_ORDER = ["ar", "en", "es"];
const DEFAULT_LANG = "en";

const OPTION_LINE_RE =
  /^\s*[\(\[]?([أإآاءبتثجحخدذرزسشصضطظعغفقكلمنهوىي]|[A-Za-z]|[\d٠-٩]{1,2})[\)\.\-–:]\s*(.+?)\s*$/;

// سطر الإجابة/الدرجة بيتفهم بأي لغة من التلاتة في نفس الملف (مرونة أكتر
// للملفات المخلوطة)، بس نص "صح/غلط" المخزّن بيتحدد حسب لغة *بداية السؤال*.
// الكلمات المفتاحية مكتوبة هنا صراحةً (مش مشتقة من LANG_DEFS) عشان تبقى
// واضحة وسهلة المراجعة/التعديل.
const ANSWER_LINE_RE =
  /^\s*(?:الإجابة\s*الصحيحة|الاجابة\s*الصحيحة|الإجابة|الاجابة|الحل|correct\s*answer|answer|respuesta\s*correcta|respuesta|soluci[oó]n)\s*[:\-–]\s*(.+?)\s*$/i;

const POINTS_LINE_RE =
  /^\s*(?:الدرجة|درجة\s*السؤال|النقاط|points?|score|puntos?|puntuaci[oó]n)\s*[:\-–]\s*([\d٠-٩.]+)/i;

const TYPE_HEADER_RE = /^\s*(?:نوع\s*الأسئلة|نوع\s*الملف|question\s*type|type|tipo\s*de\s*preguntas?)\s*[:\-–]\s*(.+?)\s*$/i;

const TRUE_VALUES = ["صح", "صحيح", "صحيحة", "نعم", "✓", "true", "t", "verdadero", "cierto", "v"];
const FALSE_VALUES = ["خطأ", "خطا", "غلط", "خاطئ", "خاطئة", "لا", "✗", "false", "f", "falso", "incorrecto"];

function detectForcedTypeFromHeader(line) {
  const m = line.match(TYPE_HEADER_RE);
  if (!m) return null;
  const v = normalizeForCompare(m[1]);
  const mcWords = ["متعدد", "اختيار", "multiple", "choice", "opcion", "opción", "multiple"];
  const tfWords = ["صح", "غلط", "true", "false", "verdadero", "falso"];
  if (mcWords.some((w) => v.includes(w))) return "multiple_choice";
  if (tfWords.some((w) => v.includes(w))) return "true_false";
  return null;
}

// بيدور على أول لغة بتاعتها questionRe بتطابق السطر، وبيرجع اللغة + نص
// السؤال المستخرج (من غير الرقم/الكلمة المفتاحية)
function detectQuestionStart(line) {
  for (const langCode of LANG_ORDER) {
    const m = line.match(LANG_DEFS[langCode].questionRe);
    if (m) return { lang: langCode, text: m[1] };
  }
  return null;
}

function isQuestionStartLine(line) {
  return LANG_ORDER.some((l) => LANG_DEFS[l].questionRe.test(line));
}

// بيقسّم النص لكتل أسئلة: أي سطر بداية سؤال (بأي لغة) بيبدأ كتلة جديدة
function splitIntoBlocks(lines) {
  const blocks = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isQuestionStartLine(line)) {
      if (current) blocks.push(current);
      current = { firstLine: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function parseBlock(block, forcedType, forcedLang, index) {
  const qStart = detectQuestionStart(block.firstLine);
  const lang = forcedLang || qStart?.lang || DEFAULT_LANG;
  const textParts = [(qStart ? qStart.text : block.firstLine).trim()].filter(Boolean);

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

    const { trueLabel, falseLabel } = LANG_DEFS[lang];
    return {
      question: {
        type: "true_false",
        text,
        points: points ?? 1,
        lang,
        options: [
          { text: trueLabel, isCorrect: isTrue },
          { text: falseLabel, isCorrect: !isTrue },
        ],
      },
    };
  }

  // multiple_choice
  if (options.length < 2) return { error: { index, reason: "not_enough_options", preview: text.slice(0, 60) } };

  const answerKeys = answerRaw.split(/[،,\/]/).map((s) => normalizeForCompare(s)).filter(Boolean);
  const correctIdx = new Set();
  for (const key of answerKeys) {
    let idx = options.findIndex((o) => normalizeForCompare(o.marker) === key);
    if (idx === -1) idx = options.findIndex((o) => normalizeForCompare(o.text) === key);
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
      lang,
      options: options.map((o, i) => ({ text: o.text, isCorrect: correctIdx.has(i) })),
    },
  };
}

/**
 * @param {string} rawText - النص المستخرج من الـ PDF (pdf-parse أو أي مكتبة تانية)
 * @param {{ forcedType?: 'multiple_choice' | 'true_false', forcedLang?: 'ar'|'en'|'es' }} options
 * @returns {{ questions: Array, errors: Array }}
 */
export function parseQuizPdfText(rawText, options = {}) {
  const lines = String(rawText || "").split(/\r?\n/);

  let forcedType = options.forcedType || null;
  const forcedLang = LANG_ORDER.includes(options.forcedLang) ? options.forcedLang : null;

  const contentLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!forcedType) {
      const detected = detectForcedTypeFromHeader(trimmed);
      if (detected) {
        forcedType = detected;
        continue;
      }
    }
    contentLines.push(line);
  }

  const blocks = splitIntoBlocks(contentLines);
  const questions = [];
  const errors = [];

  blocks.forEach((block, i) => {
    const result = parseBlock(block, forcedType, forcedLang, i + 1);
    if (result.question) questions.push(result.question);
    else if (result.error) errors.push(result.error);
  });

  return { questions, errors };
}
