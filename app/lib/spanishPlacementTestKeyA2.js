// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTestKeyA2.js
//  🔒 مفتاح إجابات اختبار تحديد المستوى A2 (إسباني) — للسيرفر بس.
//  ممنوع استيراد الملف ده من أي صفحة/كومبوننت "use client" — وإلا مفتاح
//  الإجابات هيتنزل في متصفح الطالب.
//
//  { [رقم السؤال العام 1–100]: { a: index الإجابة الصحيحة (A=0, B=1, …), s: "A2" } }
//  المصدر: "Anexo 2. Clave de respuestas" في ملف الاختبار. كل سؤال بدرجة واحدة (المجموع 100).
//  ملاحظة: ملف A2 مفيهوش تقسيم لكل سؤال على A2.1/A2.2 (التقسيم بيتم بالدرجة الكلية)،
//  فحقل s ثابت "A2".
// ═══════════════════════════════════════════════

// حروف الإجابات بترتيب الأسئلة (قراءة 25 + استماع 25 + قواعد ومفردات 50)
const READING = "BBACB" + "ACBDGH" + "BAEDGH" + "BCBCACAB"; // 5 + 6 + 6 + 8 = 25
const LISTENING = "BCACA" + "GBECF" + "KCAGJEIB" + "ACHDEFG"; // 5 + 5 + 8 + 7 = 25
const GRAMMAR = "BCACA" + "BABCB" + "ACCBA" + "BCACA" + "BABCB"; // 25
const VOCAB = "ACCBA" + "BCACA" + "BABCB" + "ACCBA" + "BCACA"; // 25

const ALL = READING + LISTENING + GRAMMAR + VOCAB;

export const ANSWER_KEY_A2 = Object.fromEntries(
  ALL.split("").map((letter, i) => [i + 1, { a: letter.charCodeAt(0) - 65, s: "A2" }])
);
