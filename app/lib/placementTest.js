// app/lib/placementTest.js
//
// 🔒 منطق السيرفر لاختبار تحديد المستوى (إسباني): الوصول لكولكشن النتائج +
// التصحيح + حساب رسوم الاختبار بعملة لغة الموقع. التصحيح هنا بس (مفتاح
// الإجابات app/lib/spanishPlacementTestKey.js مش بيتحمّل في المتصفح أبدًا).

import mongoose from "mongoose";
import { PLACEMENT_STAGES, PLACEMENT_TEST_FEE_USD, getVisibleBlocks } from "@/app/lib/spanishPlacementTest";
import { ANSWER_KEY } from "@/app/lib/spanishPlacementTestKey";
import { getCurrencyForLanguage, convertPrice } from "@/app/lib/currency";

// كولكشن عام بسكيمة مرنة (زي consultations) — مفيش موديل mongoose ثابت.
// لازم connectToMongo() يتنادى قبل الاستخدام.
export function getPlacementTestsCollection() {
  return mongoose.connection.db.collection("placement_tests");
}

// كل الأسئلة المعروضة فعليًا (الأقسام الصوتية من غير audioSrc بتتخفي).
export function getVisibleQuestions() {
  return PLACEMENT_STAGES.flatMap((s) => getVisibleBlocks(s).flatMap((b) => b.questions));
}

// بيصحّح answers = { [رقم السؤال]: index | -1 (No sé) } ويرجع الدرجة والمجموع.
export function scoreAnswers(answers) {
  let score = 0;
  let maxScore = 0;
  let answered = 0;
  const questions = getVisibleQuestions();
  for (const q of questions) {
    const key = ANSWER_KEY[q.n];
    const ans = answers?.[q.n];
    if (Number.isInteger(ans) && ans >= 0) answered += 1;
    if (!key || key.a === null) continue; // مش بيتصحح
    maxScore += key.p;
    if (ans === key.a) score += key.p;
  }
  return { score, maxScore, answered, totalQuestions: questions.length };
}

// بيفلتر answers الجاية من الـ client: أرقام أسئلة معروفة بس وقيم صحيحة ضمن عدد الخيارات.
export function sanitizeAnswers(input) {
  const clean = {};
  if (!input || typeof input !== "object") return clean;
  for (const q of getVisibleQuestions()) {
    const v = input[q.n];
    if (Number.isInteger(v) && v >= -1 && v < q.o.length) clean[q.n] = v;
  }
  return clean;
}

// رسوم الاختبار بالمبلغ الكامل (مش قروش) حسب لغة الموقع.
export function getPlacementTestFee(language) {
  const currency = getCurrencyForLanguage(language);
  const amount = convertPrice(PLACEMENT_TEST_FEE_USD, "USD", currency);
  return { currency, amount };
}
