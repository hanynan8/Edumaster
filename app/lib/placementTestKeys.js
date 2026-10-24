// ═══════════════════════════════════════════════
//  app/lib/placementTestKeys.js
//  🔒 مفاتيح إجابات كل اختبارات تحديد المستوى — للسيرفر بس.
//  ممنوع استيراد الملف ده من أي صفحة/كومبوننت "use client" — وإلا مفاتيح الإجابات
//  هتتنزل في متصفح الطالب.
// ═══════════════════════════════════════════════

import { ANSWER_KEY } from "@/app/lib/spanishPlacementTestKey";
import { ANSWER_KEY_A2 } from "@/app/lib/spanishPlacementTestKeyA2";
import { ANSWER_KEY_B1 } from "@/app/lib/spanishPlacementTestKeyB1";
import { isTestDef, normalizeTestId } from "@/app/lib/placementTests";

const KEYS = { a1: ANSWER_KEY, a2: ANSWER_KEY_A2, b1: ANSWER_KEY_B1 };

// testOrId = "a1" | "a2" | "b1" أو تعريف اختبار مخصص (مفتاحه جوه التعريف نفسه: def.answerKey — السيرفر بس)
export function getAnswerKey(testOrId) {
  if (isTestDef(testOrId)) return testOrId.answerKey || KEYS[normalizeTestId(testOrId)] || {};
  return KEYS[normalizeTestId(testOrId)];
}
