// ═══════════════════════════════════════════════
//  app/lib/placementTestKeys.js
//  🔒 مفاتيح إجابات كل اختبارات تحديد المستوى — للسيرفر بس.
//  ممنوع استيراد الملف ده من أي صفحة/كومبوننت "use client" — وإلا مفاتيح الإجابات
//  هتتنزل في متصفح الطالب.
// ═══════════════════════════════════════════════

import { ANSWER_KEY } from "@/app/lib/spanishPlacementTestKey";
import { ANSWER_KEY_A2 } from "@/app/lib/spanishPlacementTestKeyA2";
import { normalizeTestId } from "@/app/lib/placementTests";

const KEYS = { a1: ANSWER_KEY, a2: ANSWER_KEY_A2 };

export function getAnswerKey(testId) {
  return KEYS[normalizeTestId(testId)];
}
