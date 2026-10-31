// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTestKeyB2.js
//  🔒 مفتاح إجابات اختبار تحديد المستوى B2 (إسباني) — للسيرفر بس.
//  ممنوع استيراد الملف ده من أي صفحة/كومبوننت "use client" — وإلا مفتاح
//  الإجابات هيتنزل في متصفح الطالب.
//
//  { [رقم السؤال العام]: { a: index الإجابة الصحيحة (A=0, B=1, …), s: "B2.1" … "B2.4" } }
//
//  ✅ مصدر المفتاح: جدول "Solutions" الرسمي في ملف الاختبار (3.1 قراءة · 3.2 استماع · 3.3 قواعد ومفردات)،
//  والحقل s هو "Subnivel" لكل سؤال زي ما هو في الجدول (B2.1 → B2.4). التصحيح بيعتمد على a بس والمستوى
//  النهائي بيتحدد بالدرجة الكلية (placementLevels.js) — زي B1.
//  كل سؤال بدرجة واحدة.
//
//  الترقيم العام: قراءة 1–36 · استماع 37–66 · قواعد ومفردات 67–116.
// ═══════════════════════════════════════════════

// حروف الإجابات بترتيب الأسئلة (a/A = 0 · b/B = 1 · c/C = 2 …)
const READING =
  "BCABAB" + //      Tarea 1 (1–6)    نص الأسبوع ذو الأربعة أيام
  "ACBDACDBAC" + //  Tarea 2 (7–16)   ربط الأشخاص A–D (Lidia / Rubén / Inés / Tomás)
  "ABCDEG" + //      Tarea 3 (17–22)  فقرات ناقصة (F وH زيادة)
  "CCABABCBACCBBC"; // Tarea 4 (23–36) النص الناقص (cloze)
// 6 + 10 + 6 + 14 = 36

// 🎧 الاستماع (37–66): 30 حرف — مبني على جدول Solutions في الملف، ونصوص التسجيلات في placementAudioScripts.js
const LISTENING =
  "BCCAAB" + // Tarea 1 (37–42)  6 محادثات قصيرة
  "BACBAC" + // Tarea 2 (43–48)  Elena (a) · Mario (b) · Los dos (c)
  "BACACB" + // Tarea 3 (49–54)  مقابلة Clara Montero
  "CDAFBE" + // Tarea 4 (55–60)  6 أشخاص (A–H) — G وH زيادة
  "CBCABB"; //  Tarea 5 (61–66)  محاضرة الحميات
// 6 + 6 + 6 + 6 + 6 = 30

const GRAMMAR_VOCAB =
  "BCBCABCACACBC" + // Gramática I   (67–79)   13
  "CABCACBCBCCB" + //  Gramática II  (80–91)   12
  "CCBCACBBCAACA" + // Vocabulario I (92–104)  13
  "BCBABCABACBA"; //   Vocabulario II(105–116) 12
// 13 + 12 + 13 + 12 = 50

// Subnivel (B2.1–B2.4) لكل سؤال — من عمود "Subnivel" في Solutions (الرقم 1–4 = B2.1–B2.4)
const READING_SUB =
  "112234" + //         Tarea 1
  "1122324334" + //     Tarea 2
  "123344" + //         Tarea 3
  "11211233244344"; //  Tarea 4
// B2.1 ×9 · B2.2 ×9 · B2.3 ×9 · B2.4 ×9

const LISTENING_SUB =
  "112233" + // Tarea 1
  "112344" + // Tarea 2
  "122334" + // Tarea 3
  "231413" + // Tarea 4
  "223444"; //  Tarea 5
// B2.1 ×7 · B2.2 ×8 · B2.3 ×8 · B2.4 ×7

const GRAMMAR_VOCAB_SUB =
  "1111111222222" + //  Gramática I    (B2.1: 1–7 · B2.2: 8–13)
  "333333444444" + //   Gramática II   (B2.3: 14–19 · B2.4: 20–25)
  "1111112222223" + //  Vocabulario I  (B2.1: 26–31 · B2.2: 32–37 · B2.3: 38)
  "333333444444"; //    Vocabulario II (B2.3: 39–44 · B2.4: 45–50)
// B2.1 ×13 · B2.2 ×12 · B2.3 ×13 · B2.4 ×12

const entries = [];
READING.split("").forEach((letter, i) => entries.push([1 + i, letter, READING_SUB[i]]));
LISTENING.split("").forEach((letter, i) => entries.push([37 + i, letter, LISTENING_SUB[i]]));
GRAMMAR_VOCAB.split("").forEach((letter, i) => entries.push([67 + i, letter, GRAMMAR_VOCAB_SUB[i]]));

export const ANSWER_KEY_B2 = Object.fromEntries(
  entries.map(([n, letter, sub]) => [n, { a: letter.charCodeAt(0) - 65, s: `B2.${sub}` }])
);
