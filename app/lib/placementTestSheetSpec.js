// ═══════════════════════════════════════════════
//  app/lib/placementTestSheetSpec.js
//  🆕 مواصفات ملف Excel اللي الأدمن بيرفع بيه اختبار تحديد مستوى جديد (B1, B2, ...) من غير مبرمج.
//  مشترك بين: قالب الملف / تصدير اختبار موجود (placementTestTemplate.js) وقراءة الملف
//  والتحقق منه (placementTestImport.js). مفيش فيه أي مفتاح إجابات — آمن للمتصفح والسيرفر.
//
//  الشيتات:
//    README    — شرح بالعربي والإنجليزي (بيتجاهله القارئ)
//    Settings  — Key | Value : Test ID, Level (CEFR), Test Title, Subject, Level thresholds
//    Questions — صف لكل سؤال: Part, Task, Question, Option A–F, Correct Answer + (اختياري) Passage / Audio
//    Bank      — بنك نصوص لمهام "الربط" (Matching): Part, Task, Letter, Text
//    Audio     — أماكن التسجيلات الصوتية: Slot, Label, Hint, Script
// ═══════════════════════════════════════════════

export const SHEETS = {
  readme: "README",
  settings: "Settings",
  questions: "Questions",
  bank: "Bank",
  audio: "Audio",
};

// ids الاختبارات المدمجة (a1 / a2 / b1 / b2) — محجوزة: الاختبار المدمج بيتقدّم على أي اختبار مخصص بنفس الـ id.
export const RESERVED_TEST_IDS = ["a1", "a2", "b1", "b2"];
export const TEST_ID_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;
export const MAX_QUESTIONS = 400;
export const MAX_AUDIO_SLOT = 60;
export const MAX_OPTIONS = 6;
export const MAX_BANK = 11; // A..K — زي spanishPlacementTest
export const DEFAULT_PART_MINUTES = 30;
export const DEFAULT_THRESHOLDS = [40, 60, 80];

export const SUBJECT_CODES = ["es", "en", "fr", "de", "it", "ar", "other"];
export const OPTION_LETTERS = "ABCDEFGHIJK";

export const LIMITS = {
  title: 160,
  partTitle: 120,
  taskTitle: 160,
  intro: 1000,
  passage: 8000,
  question: 1000,
  context: 2000,
  option: 400,
  bankText: 1500,
  label: 160,
  script: 8000,
};

// أعمدة شيت Questions — key = المفتاح الداخلي، header = اسم العمود في الملف (القارئ بيتجاهل الحروف الكبيرة/الصغيرة
// والمسافات والرموز، فـ "Correct Answer" و "correct_answer" و "CORRECT ANSWER" نفس الشيء)
export const QUESTION_COLUMNS = [
  { key: "part", header: "Part", width: 16, note: "اسم الجزء (مثلاً Reading / Listening). لو سبته فاضي بياخد نفس الجزء اللي فوقه." },
  { key: "partMinutes", header: "Part Minutes", width: 14, note: "عدد دقائق الجزء (اختياري) — اكتبه في أول صف من الجزء." },
  { key: "task", header: "Task", width: 22, note: "اسم المهمة (Tarea 1 / Task 1 ...). الأسئلة اللي ليها نفس الاسم بتتجمّع في مهمة واحدة. لو سبته فاضي بياخد نفس المهمة اللي فوقه." },
  { key: "taskIntro", header: "Task Instructions", width: 34, note: "تعليمات المهمة اللي بتظهر للطالب (اكتبها في أول صف من المهمة)." },
  { key: "passage", header: "Passage", width: 40, note: "نص مشترك لكل أسئلة المهمة (قطعة قراءة/إعلان) — اكتبه في أول صف من المهمة." },
  { key: "taskAudio", header: "Task Audio Slot", width: 14, note: "رقم تسجيل صوتي واحد لكل المهمة (1–60). الأسئلة بتظهر بس لما الصوت يترفع من لوحة الأدمن." },
  { key: "questionAudio", header: "Question Audio Slot", width: 16, note: "رقم تسجيل صوتي لسؤال واحد بس (لو كل سؤال ليه تسجيل منفصل). متستخدمش الاتنين في نفس المهمة." },
  { key: "question", header: "Question", width: 46, note: "نص السؤال." },
  { key: "context", header: "Context", width: 40, note: "نص يخص السؤال ده فقط (اختياري) — رسالة/إعلان قصير فوق السؤال." },
  { key: "optA", header: "Option A", width: 26, note: "الخيارات (من 2 لـ 6). في مهام الربط (Matching) سيبهم فاضيين." },
  { key: "optB", header: "Option B", width: 26 },
  { key: "optC", header: "Option C", width: 26 },
  { key: "optD", header: "Option D", width: 26 },
  { key: "optE", header: "Option E", width: 26 },
  { key: "optF", header: "Option F", width: 26 },
  { key: "correct", header: "Correct Answer", width: 16, note: "الإجابة الصحيحة: حرف (A–F) أو نص الخيار نفسه. في مهام الربط: حرف النص من شيت Bank." },
];

export const BANK_COLUMNS = [
  { key: "part", header: "Part", width: 16, note: "نفس اسم الجزء في شيت Questions." },
  { key: "task", header: "Task", width: 22, note: "نفس اسم المهمة في شيت Questions — وجود صفوف لها هنا بيحوّلها لمهمة ربط (Matching)." },
  { key: "letter", header: "Letter", width: 10, note: "A, B, C... بالترتيب (اختياري — بيتحط تلقائي)." },
  { key: "text", header: "Text", width: 80, note: "نص الإعلان/الخيار اللي هيظهر للطالب بجانب الحرف." },
];

export const AUDIO_COLUMNS = [
  { key: "slot", header: "Slot", width: 8, note: "رقم التسجيل (1–60) — نفس الرقم في Task Audio Slot / Question Audio Slot." },
  { key: "label", header: "Label", width: 40, note: "اسم التسجيل اللي هيظهر في لوحة الأدمن عند الرفع." },
  { key: "hint", header: "Hint", width: 30, note: "ملاحظة للأدمن (اختياري). لو فاضي بيتكتب تلقائي مكان التسجيل في الاختبار." },
  { key: "script", header: "Script", width: 80, note: "نص التسجيل (اختياري) عشان تسجّله بنفسك — بيظهر للأدمن بس ولا يظهر للطلاب أبدًا." },
];

export const SETTINGS_ROWS = [
  { key: "Test ID", note: "معرّف قصير بالإنجليزي (حروف صغيرة وأرقام وشرطة) — بيظهر في رابط الاختبار. مثال: c1. ممنوع a1 و a2 و b1 و b2 (محجوزين — اختبارات مدمجة).", required: true },
  { key: "Level (CEFR)", note: "المستوى: A1 / A2 / B1 / B2 / C1 / C2 — بيحدد مستويات النتيجة (Pre-B1, B1.1, B1.2, B1.3).", required: true },
  { key: "Test Title", note: "عنوان الاختبار اللي بيظهر للطالب. مثال: Prueba de nivel de español B1.", required: true },
  { key: "Subject", note: "لغة الاختبار: es / en / fr / de / it / ar / other (بتظهر في الإيميل وفي الكورسات الموصى بها). الافتراضي es.", required: false },
  { key: "Level thresholds", note: "حدود المستويات من 100 (اختياري). الافتراضي 40,60,80: أقل من 40 = Pre، 40–59 = .1، 60–79 = .2، 80+ = .3", required: false },
];

// ───── أدوات صغيرة مشتركة ─────

// "Correct Answer" / "correct_answer" / "CORRECT ANSWER" → "correctanswer"
export function normHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "");
}

// قيمة خلية ExcelJS → نص عادي (بيتعامل مع rich text / formula / hyperlink / تاريخ / رقم)
export function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.replace(/\r\n/g, "\n").trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text ?? "").join("").replace(/\r\n/g, "\n").trim();
    if ("result" in value) return cellText(value.result);
    if ("text" in value) return cellText(value.text);
    if ("hyperlink" in value) return cellText(value.hyperlink);
    if ("error" in value) return "";
  }
  return "";
}
