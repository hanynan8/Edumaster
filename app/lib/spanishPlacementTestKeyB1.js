// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTestKeyB1.js
//  🔒 مفتاح إجابات اختبار تحديد المستوى B1 (إسباني) — للسيرفر بس.
//  ممنوع استيراد الملف ده من أي صفحة/كومبوننت "use client" — وإلا مفتاح
//  الإجابات هيتنزل في متصفح الطالب.
//
//  { [رقم السؤال العام]: { a: index الإجابة الصحيحة (A=0, B=1, …), s: "B1" } }
//
//  ⚠️ مصدر المفتاح: ملف الاختبار كراسة المرشح بس ومفيهوش "clave de respuestas"، فإجابات
//  القراءة (1–30) والقواعد والمفردات (61–110) اتحلّت يدويًا من نصوص الأسئلة (واتراجعت سؤال بسؤال)،
//  وإجابات الاستماع (31–60) مطابقة لنصوص التسجيلات المكتوبة — لازم تتراجع من مصدرك الرسمي. أسئلة فيها أكتر من احتمال مقبول لغويًا:
//    n=70 (lo/le — leísmo)  ·  n=73 (salían/salieron)
//  (راجع النوتس في الرد.)
//  كل سؤال بدرجة واحدة. حقل s ثابت "B1" (التقسيم لـ B1.1/B1.2/B1.3 بيتم بالدرجة الكلية).
// ═══════════════════════════════════════════════

// حروف الإجابات بترتيب الأسئلة
const READING =
  "ABECFH" + // Tarea 1 (1–6)   ربط شخص ↔ نص
  "CACBAB" + // Tarea 2 (7–12)  نص الدراجات
  "ABCBCA" + // Tarea 3 (13–18) Sara / Pablo / Aisha
  "EDCAFB" + // Tarea 4 (19–24) جمل ناقصة
  "CBCCBB"; //  Tarea 5 (25–30) الرسالة
// 6 + 6 + 6 + 6 + 6 = 30

const GRAMMAR_VOCAB =
  "CCBABCACCAABB" + // Gramática I   (61–73)  13
  "BACBCACCABBB" + //  Gramática II  (74–85)  12
  "BCABCABBCABC" + //  Vocabulario I (86–97)  12
  "CABBCABAACCBA"; //  Vocabulario II(98–110) 13
// 13 + 12 + 12 + 13 = 50

// 🎧 الاستماع (31–60): 30 حرف بترتيب الأسئلة — مبني على نصوص التسجيلات في placementAudioScripts.js
// (ملف B1 مفيهوش clave للاستماع). لو عندك المفتاح الرسمي بدّله هنا مع النصوص.
const LISTENING =
  "CACBAB" + // Tarea 1 (31–36)  6 رسائل
  "CBACBC" + // Tarea 2 (37–42)  Lucas
  "CABCBB" + // Tarea 3 (43–48)  6 أخبار
  "DAECFB" + // Tarea 4 (49–54)  6 أشخاص (A–H)
  "BCCBBC"; //  Tarea 5 (55–60)  Ana y Tomás
// 6 + 6 + 6 + 6 + 6 = 30

const entries = [];
READING.split("").forEach((letter, i) => entries.push([1 + i, letter]));
LISTENING.split("").forEach((letter, i) => entries.push([31 + i, letter]));
GRAMMAR_VOCAB.split("").forEach((letter, i) => entries.push([61 + i, letter]));

export const ANSWER_KEY_B1 = Object.fromEntries(
  entries.map(([n, letter]) => [n, { a: letter.charCodeAt(0) - 65, s: "B1" }])
);
