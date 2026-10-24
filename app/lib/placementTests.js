// ═══════════════════════════════════════════════
//  app/lib/placementTests.js
//  سجل اختبارات تحديد المستوى (إسباني) — آمن للمتصفح والسيرفر (مفيش فيه مفتاح إجابات
//  ولا نصوص استماع).
//
//  حاليًا في 3 اختبارات بنفس الميكانيزم (الدرجة دايمًا نسبة من 100):
//    a1 → Prueba de nivel de español A1  (/spanish-test)     — بيظهر على كورسات A1
//         (قراءة 25 + استماع 25 + قواعد ومفردات 50)
//    a2 → Prueba de nivel de español A2  (/spanish-test/a2)  — بيظهر على كورسات A2
//         (قراءة 25 + استماع 25 + قواعد ومفردات 50)
//    b1 → Prueba de nivel de español B1  (/spanish-test/b1)  — بيظهر على كورسات B1.x
//         (قراءة 30 + قواعد ومفردات 50 دلوقتي — الاستماع (30) جاهز بس مش متفعّل: شوف spanishPlacementTestB1.js)
//  لكل اختبار: أسئلته، مفتاح إجاباته (السيرفر بس: placementTestKeys.js)، وصوتياته المنفصلة
//  (A1: 4 خانات — A2: 12 خانة زي ملف الاختبار، بتترفع من لوحة الأدمن).
//  أي نتيجة قديمة من غير حقل test بتتعامل على إنها a1.
// ═══════════════════════════════════════════════

import {
  PLACEMENT_PARTS,
  PLACEMENT_TEST_TITLE,
  getVisibleTasks,
} from "@/app/lib/spanishPlacementTest";
import { PLACEMENT_PARTS_A2, PLACEMENT_TEST_TITLE_A2 } from "@/app/lib/spanishPlacementTestA2";
import { PLACEMENT_PARTS_B1, PLACEMENT_TEST_TITLE_B1 } from "@/app/lib/spanishPlacementTestB1";

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
    // 🆕 audio_a2_v2: A2 بقى 12 تسجيل (زي ملف الاختبار) بدل 4 خانات — مستند جديد عشان صوتيات
    // الخانات القديمة (1–4) ماتتعرضش في أماكن غلط. لازم تتّرفع تاني من لوحة الأدمن.
    audioDocId: "audio_a2_v2",
    audioPathPrefix: "edumaster/placement-test-a2/audio",
    audioSlots: [
      // Tarea 1 — 5 مقاطع منفصلة (Audio 1…5) ← أسئلة الاستماع 1–5
      { slot: 1, label: "Audio 1 — Cambiar una cita médica", hint: "Tarea 1 · Question 1" },
      { slot: 2, label: "Audio 2 — El autobús", hint: "Tarea 1 · Question 2" },
      { slot: 3, label: "Audio 3 — Una oferta en una tienda", hint: "Tarea 1 · Question 3" },
      { slot: 4, label: "Audio 4 — Una reunión", hint: "Tarea 1 · Question 4" },
      { slot: 5, label: "Audio 5 — Un problema en casa", hint: "Tarea 1 · Question 5" },
      // Tarea 2 — 5 رسائل منفصلة (Mensaje 1…5) ← أسئلة الاستماع 6–10
      { slot: 6, label: "Mensaje 1", hint: "Tarea 2 · Question 6" },
      { slot: 7, label: "Mensaje 2", hint: "Tarea 2 · Question 7" },
      { slot: 8, label: "Mensaje 3", hint: "Tarea 2 · Question 8" },
      { slot: 9, label: "Mensaje 4", hint: "Tarea 2 · Question 9" },
      { slot: 10, label: "Mensaje 5", hint: "Tarea 2 · Question 10" },
      // Tarea 3 و 4 — تسجيل واحد لكل مهمة
      { slot: 11, label: "Audio — Carmen habla de su nueva vida", hint: "Tarea 3 · Questions 11–18" },
      { slot: 12, label: "Audio — Rosa y Miguel preparan una escapada", hint: "Tarea 4 · Questions 19–25" },
    ],
  },
  b1: {
    id: "b1",
    label: "B1",
    title: PLACEMENT_TEST_TITLE_B1,
    parts: PLACEMENT_PARTS_B1,
    path: "/spanish-test/b1",
    audioDocId: "audio_b1",
    audioPathPrefix: "edumaster/placement-test-b1/audio",
    // 🎧 الاستماع لسه مش متفعّل (مفتاح إجاباته ونصوص تسجيلاته مش في ملف الاختبار) → مفيش خانات صوت.
    // لما نفعّله: ضيف 5 خانات هنا (واحدة لكل Tarea — audioSlot في PLACEMENT_LISTENING_B1) وشوف
    // التعليق في آخر app/lib/spanishPlacementTestB1.js.
    audioSlots: [],
  },
};

export const TEST_IDS = Object.keys(PLACEMENT_TESTS);

// 🆕 تعريف اختبار مخصص (جاي من الداتابيز — الأدمن رفعه من ملف Excel): object فيه parts (وباقي حقول
// الاختبار: id/label/title/audioSlots/audioDocId/...). كل الدوال تحت بتقبل id ("a1" | "a2") أو
// تعريف اختبار مخصص مباشرة، فالمنطق المشترك (الأسئلة الظاهرة/التصحيح/المراجعة) واحد للنوعين.
export function isTestDef(value) {
  return Boolean(value) && typeof value === "object" && Array.isArray(value.parts);
}

// أرقام خانات الصوت الصالحة لاختبار معيّن (A1: 1–4 · A2: 1–12 · المخصص: اللي في ملفه)
export function getAudioSlotNumbers(testOrId) {
  return getPlacementTest(testOrId).audioSlots.map((a) => a.slot);
}

// أي قيمة غريبة (أو ناقصة) → الاختبار الافتراضي a1. (للاختبارات المدمجة بس — الاختبارات المخصصة
// بتتحلّ من الداتابيز بـ resolveTestDef في customPlacementTests.js). لو اتدّى تعريف اختبار → id بتاعه.
export function normalizeTestId(value) {
  if (isTestDef(value)) return String(value.id);
  const id = String(value ?? "").toLowerCase();
  return PLACEMENT_TESTS[id] ? id : DEFAULT_TEST_ID;
}

export function getPlacementTest(testOrId) {
  if (isTestDef(testOrId)) return testOrId;
  return PLACEMENT_TESTS[normalizeTestId(testOrId)];
}

export function getTestParts(testOrId) {
  return getPlacementTest(testOrId).parts;
}

// الأجزاء/المهام الظاهرة فعلًا لاختبار معيّن: مهام الاستماع من غير صوت مرفوع بتتخفي.
// audio = { [slot]: url }
export function getVisiblePartsFor(testOrId, audio = {}) {
  return getTestParts(testOrId)
    .map((p) => ({ ...p, tasks: getVisibleTasks(p, audio) }))
    .filter((p) => p.tasks.length);
}

// "A1.2" → "a1" · "A2.1" → "a2" · "B1.3" → "b1" · غير كده → null
export function getTestIdForLevelCode(code) {
  const m = /^(A[12]|B1)\./i.exec(String(code || ""));
  const id = m ? m[1].toLowerCase() : null;
  return id && PLACEMENT_TESTS[id] ? id : null;
}
