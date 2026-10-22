// ═══════════════════════════════════════════════
//  app/lib/placementTests.js
//  سجل اختبارات تحديد المستوى (إسباني) — آمن للمتصفح والسيرفر (مفيش فيه مفتاح إجابات
//  ولا نصوص استماع).
//
//  حاليًا في اختبارين بنفس الميكانيزم (قراءة 25 + استماع 25 + قواعد ومفردات 50 = 100 نقطة):
//    a1 → Prueba de nivel de español A1  (/spanish-test)     — بيظهر على كورسات A1
//    a2 → Prueba de nivel de español A2  (/spanish-test/a2)  — بيظهر على كورسات A2
//  لكل اختبار: أسئلته، مفتاح إجاباته (السيرفر بس: placementTestKeys.js)، وصوتياته المنفصلة
//  (4 خانات لكل اختبار، بتترفع من لوحة الأدمن).
//  أي نتيجة قديمة من غير حقل test بتتعامل على إنها a1.
// ═══════════════════════════════════════════════

import {
  PLACEMENT_PARTS,
  PLACEMENT_TEST_TITLE,
  getVisibleTasks,
} from "@/app/lib/spanishPlacementTest";
import { PLACEMENT_PARTS_A2, PLACEMENT_TEST_TITLE_A2 } from "@/app/lib/spanishPlacementTestA2";

export const DEFAULT_TEST_ID = "a1";

export const PLACEMENT_TESTS = {
  a1: {
    id: "a1",
    label: "A1",
    title: PLACEMENT_TEST_TITLE,
    parts: PLACEMENT_PARTS,
    path: "/spanish-test",
    // placement_settings → _id (بنسيبه "audio" زي ما كان عشان صوتيات A1 المرفوعة تفضل شغالة)
    audioDocId: "audio",
    audioPathPrefix: "edumaster/placement-test/audio",
    audioSlots: [
      { slot: 1, label: "Audio 1 — Mensajes cortos", hint: "Questions 1–5" },
      { slot: 2, label: "Audio 2 — Mensajes muy breves", hint: "Questions 6–10" },
      { slot: 3, label: "Audio 3 — Carmen: su casa y su día", hint: "Questions 11–18" },
      { slot: 4, label: "Audio 4 — Rosa y Miguel", hint: "Questions 19–25" },
    ],
  },
  a2: {
    id: "a2",
    label: "A2",
    title: PLACEMENT_TEST_TITLE_A2,
    parts: PLACEMENT_PARTS_A2,
    path: "/spanish-test/a2",
    audioDocId: "audio_a2",
    audioPathPrefix: "edumaster/placement-test-a2/audio",
    audioSlots: [
      { slot: 1, label: "Audio 1 — Mensajes breves", hint: "Questions 1–5" },
      { slot: 2, label: "Audio 2 — Mensajes y situaciones", hint: "Questions 6–10" },
      { slot: 3, label: "Audio 3 — Carmen: una experiencia personal", hint: "Questions 11–18" },
      { slot: 4, label: "Audio 4 — Rosa y Miguel: organizar un viaje", hint: "Questions 19–25" },
    ],
  },
};

export const TEST_IDS = Object.keys(PLACEMENT_TESTS);

// أي قيمة غريبة (أو ناقصة) → الاختبار الافتراضي a1
export function normalizeTestId(value) {
  const id = String(value ?? "").toLowerCase();
  return PLACEMENT_TESTS[id] ? id : DEFAULT_TEST_ID;
}

export function getPlacementTest(testId) {
  return PLACEMENT_TESTS[normalizeTestId(testId)];
}

export function getTestParts(testId) {
  return getPlacementTest(testId).parts;
}

// الأجزاء/المهام الظاهرة فعلًا لاختبار معيّن: مهام الاستماع من غير صوت مرفوع بتتخفي.
// audio = { [slot]: url }
export function getVisiblePartsFor(testId, audio = {}) {
  return getTestParts(testId)
    .map((p) => ({ ...p, tasks: getVisibleTasks(p, audio) }))
    .filter((p) => p.tasks.length);
}

// "A1.2" → "a1" · "A2.1" → "a2" · غير كده → null
export function getTestIdForLevelCode(code) {
  const m = /^(A[12])\./i.exec(String(code || ""));
  const id = m ? m[1].toLowerCase() : null;
  return id && PLACEMENT_TESTS[id] ? id : null;
}
