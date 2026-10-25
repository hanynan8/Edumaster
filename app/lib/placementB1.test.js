// app/lib/placementB1.test.js
//
// اختبارات اختبار تحديد المستوى B1 (إسباني):
//   - سلامة البيانات: 110 سؤال زي ملف الاختبار (30 قراءة + 30 استماع + 50 قواعد/مفردات).
//   - الاستماع: 5 تسجيلات، كل تسجيل على Tarea كاملة (Tarea 4 وTarea 5 منفصلتين)، وأي مهمة
//     من غير صوت بتتخفي والدرجة نسبة من 100 (من غير صوتيات = 80 سؤال ظاهر).
//   - مفتاح الإجابات: لكل سؤال مفتاح ضمن عدد الخيارات (110 مفتاح).
//   - التصحيح: الدرجة نسبة من 100، والمستوى حسب جدول B1.
//   - زرار الاختبار على كورسات B1.1 … B1.4 (الأسماء الحقيقية من الموقع).
//   - A1/A2 ما اتأثروش.

import { PLACEMENT_PARTS_B1, PLACEMENT_LISTENING_B1, LISTENING_ENABLED_B1 } from "@/app/lib/spanishPlacementTestB1";
import { getAudioScript } from "@/app/lib/placementAudioScripts";
import { ANSWER_KEY_B1 } from "@/app/lib/spanishPlacementTestKeyB1";
import { PLACEMENT_TESTS, getVisiblePartsFor, normalizeTestId, getTestIdForLevelCode } from "@/app/lib/placementTests";
import { getAnswerKey } from "@/app/lib/placementTestKeys";
import {
  getLevelByPercent,
  getLevelByCode,
  getPlacementTestForCourse,
  getPlacementTestPath,
  detectLevelCode,
  levelRank,
} from "@/app/lib/placementLevels";
import { scoreAnswers, sanitizeAnswers, getVisibleQuestions } from "@/app/lib/placementTest";
import { buildResults, buildReview } from "@/app/lib/placementReview";
import { RESERVED_TEST_IDS } from "@/app/lib/placementTestSheetSpec";

jest.mock("@/app/lib/bunny", () => ({
  resolveSecureStoredUrl: (u) => u,
  buildStoragePublicUrl: (p) => p,
}));
jest.mock("@/app/lib/models", () => ({ getCourseModel: jest.fn(), getCategoryModel: jest.fn() }));
jest.mock("@/app/lib/currency", () => ({
  getCurrencyForLanguage: () => "USD",
  convertPrice: (a) => a,
  getPriceForCurrency: () => ({ amount: 0 }),
}));

const questionsOf = (parts) => parts.flatMap((p) => p.tasks.flatMap((t) => t.questions.map((q) => ({ q, task: t, part: p }))));
const allQuestions = questionsOf(PLACEMENT_PARTS_B1);
const listeningQuestions = questionsOf([PLACEMENT_LISTENING_B1]);

// إجابات كلها صح للأسئلة الظاهرة
const ALL_AUDIO = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [i + 1, `https://cdn.test/b1-${i + 1}.mp3`]));
const perfect = (audio = {}) =>
  Object.fromEntries(getVisibleQuestions(audio, "b1").map((q) => [q.n, getAnswerKey("b1")[q.n].a]));

describe("سلامة بيانات B1", () => {
  it("110 سؤال زي ملف الاختبار: 30 قراءة + 30 استماع + 50 قواعد ومفردات (بالترتيب)", () => {
    const count = (id) => PLACEMENT_PARTS_B1.find((p) => p.id === id).tasks.reduce((n, t) => n + t.questions.length, 0);
    expect(LISTENING_ENABLED_B1).toBe(true);
    expect(allQuestions).toHaveLength(110);
    expect(PLACEMENT_PARTS_B1.map((p) => p.id)).toEqual(["read", "listen", "gram"]);
    expect(count("read")).toBe(30);
    expect(count("listen")).toBe(30);
    expect(count("gram")).toBe(50);
  });

  it("الترقيم: قراءة 1–30 · استماع 31–60 · قواعد 61–110", () => {
    const ns = allQuestions.map((x) => x.q.n);
    expect(ns).toEqual(Array.from({ length: 110 }, (_, i) => i + 1));
    expect(new Set(ns).size).toBe(110);
    const listen = allQuestions.filter((x) => x.part.id === "listen").map((x) => x.q.ln);
    expect(listen).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    // ln (الرقم جوه الجزء) زي ترقيم الملف: قراءة 1–30 وقواعد 1–50
    const gram = allQuestions.filter((x) => x.part.id === "gram").map((x) => x.q.ln);
    expect(gram).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("لكل سؤال ظاهر مفتاح صالح ضمن عدد خياراته، وكل سؤال له 3 خيارات (أو حروف الربط)", () => {
    for (const { q } of allQuestions) {
      const key = ANSWER_KEY_B1[q.n];
      expect(key).toBeDefined();
      expect(Number.isInteger(key.a)).toBe(true);
      expect(key.a).toBeGreaterThanOrEqual(0);
      expect(key.a).toBeLessThan(q.o.length);
      expect(key.s).toBe("B1");
    }
    expect(Object.keys(ANSWER_KEY_B1)).toHaveLength(110);
    for (const { q } of listeningQuestions) expect(ANSWER_KEY_B1[q.n]).toBeDefined();
  });

  it("أسئلة الربط: الخيارات حروف A.. بعدد عناصر bank وحروف bank متسلسلة", () => {
    const withBank = PLACEMENT_PARTS_B1.flatMap((p) => p.tasks).filter((t) => t.bank);
    expect(withBank).toHaveLength(4); // قراءة: Tarea 1 (8) + Tarea 3 (3) + Tarea 4 (8) · استماع Tarea 4 (8)
    expect(withBank.map((t) => t.bank.length)).toEqual([8, 3, 8, 8]);
    for (const t of withBank) {
      expect(t.bank.map((b) => b.l).join("")).toBe("ABCDEFGHIJK".slice(0, t.bank.length));
      for (const q of t.questions) expect(q.o).toEqual(t.bank.map((b) => b.l));
    }
  });

  it("إجابات مختارة اتحلّت يدويًا من نصوص الأسئلة (قراءة + قواعد + مفردات)", () => {
    const letter = (n) => "ABCDEFGHIJK"[ANSWER_KEY_B1[n].a];
    // ربط Tarea 1: Marta→A, Daniel→B, Laura→E, Pérez→C, Andrés→F, Elena→H
    expect([1, 2, 3, 4, 5, 6].map(letter)).toEqual(["A", "B", "E", "C", "F", "H"]);
    // الجمل الناقصة (19–24): E D C A F B
    expect([19, 20, 21, 22, 23, 24].map(letter)).toEqual(["E", "D", "C", "A", "F", "B"]);
    // الرسالة: presentar / llegaría / estaba / me / habría / Agradeciéndoles
    expect([25, 26, 27, 28, 29, 30].map(letter)).toEqual(["C", "B", "C", "C", "B", "B"]);
    // قواعد: fui, vivía, he leído, iré, Podrías, iré
    expect([61, 62, 63, 64, 65, 66].map(letter)).toEqual(["C", "C", "B", "A", "B", "C"]);
    // مفردات: cita, empleado, tos, pasaporte, funciona
    expect([86, 87, 88, 89, 90].map(letter)).toEqual(["B", "C", "A", "B", "C"]);
    expect(letter(110)).toBe("A"); // hacer un máster
    // استماع (حسب نصوص التسجيلات): Tarea 4 persona→enunciado D A E C F B
    expect([49, 50, 51, 52, 53, 54].map(letter)).toEqual(["D", "A", "E", "C", "F", "B"]);
    // Tarea 5 Ana y Tomás: energía solar / mudarse / horario / flexibles / prima / currículum
    expect([55, 56, 57, 58, 59, 60].map(letter)).toEqual(["B", "C", "C", "B", "B", "C"]);
  });

  it("الإجابة الصحيحة موجودة فعلًا في خيارات الأسئلة العادية (نص الخيار مش فاضي)", () => {
    for (const { q, task } of allQuestions) {
      if (task.bank) continue;
      expect(q.o).toHaveLength(3);
      for (const o of q.o) expect(String(o).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("الاستماع (5 تسجيلات، كل تسجيل على Tarea كاملة)", () => {
  it("5 مهام: 6 أسئلة لكل مهمة بأرقام 31–60", () => {
    expect(PLACEMENT_LISTENING_B1.tasks.map((t) => t.questions.length)).toEqual([6, 6, 6, 6, 6]);
    expect(listeningQuestions.map((x) => x.q.n)).toEqual(Array.from({ length: 30 }, (_, i) => i + 31));
  });

  it("5 خانات صوت: لكل Tarea خانتها (Tarea 4 → 4 · Tarea 5 → 5) ومفيش audioSlot على مستوى السؤال", () => {
    expect(PLACEMENT_LISTENING_B1.tasks.map((t) => t.audioSlot)).toEqual([1, 2, 3, 4, 5]);
    expect(PLACEMENT_LISTENING_B1.tasks.some((t) => t.questions.some((q) => q.audioSlot !== undefined))).toBe(false);
    expect(PLACEMENT_TESTS.b1.audioSlots.map((a) => a.slot)).toEqual([1, 2, 3, 4, 5]);
    expect(PLACEMENT_TESTS.b1.audioDocId).toBe("audio_b1_v4");
  });

  it("من غير صوتيات → الاستماع مخفي كله (80 سؤال: قراءة + قواعد)", () => {
    expect(getVisiblePartsFor("b1", {}).map((p) => p.id)).toEqual(["read", "gram"]);
    expect(getVisibleQuestions({}, "b1")).toHaveLength(80);
  });

  it("الخمس صوتيات مرفوعة → 110 سؤال، ولكل Tarea مشغّلها بصوتها", () => {
    const parts = getVisiblePartsFor("b1", ALL_AUDIO);
    expect(parts.map((p) => p.id)).toEqual(["read", "listen", "gram"]);
    expect(getVisibleQuestions(ALL_AUDIO, "b1")).toHaveLength(110);
    const tasks = parts[1].tasks;
    expect(tasks.map((t) => t.audioSrc)).toEqual([1, 2, 3, 4, 5].map((n) => ALL_AUDIO[n]));
    expect(tasks.some((t) => t.sharedAudio)).toBe(false);
  });

  it("كل صوت بيفتح مهمته كاملة: صوت 1 → 31–36 · صوت 3 → 43–48 · صوت 4 → 49–54 · صوت 5 → 55–60 · الباقي مخفي", () => {
    const only = (slot) => getVisibleQuestions({ [slot]: "x" }, "b1").map((q) => q.n).filter((n) => n > 30 && n < 61);
    expect(only(1)).toEqual([31, 32, 33, 34, 35, 36]);
    expect(only(2)).toEqual([37, 38, 39, 40, 41, 42]);
    expect(only(3)).toEqual([43, 44, 45, 46, 47, 48]);
    expect(only(4)).toEqual([49, 50, 51, 52, 53, 54]);
    expect(only(5)).toEqual([55, 56, 57, 58, 59, 60]);
  });

  it("صوت جزئي: الدرجة نسبة من 100 على الأسئلة الظاهرة بس", () => {
    const audio = { 2: "x" };
    expect(getVisibleQuestions(audio, "b1")).toHaveLength(86);
    expect(scoreAnswers(perfect(audio), audio, "b1")).toMatchObject({ rawScore: 86, rawMax: 86, score: 100 });
  });

  it("كله صح مع كل الصوتيات → 110/110 → 100 / B1.3، وغلط الاستماع كله → 80/110", () => {
    expect(scoreAnswers(perfect(ALL_AUDIO), ALL_AUDIO, "b1")).toMatchObject({ rawScore: 110, rawMax: 110, score: 100, level: "B1.3" });
    const answers = perfect(ALL_AUDIO);
    for (let n = 31; n <= 60; n++) answers[n] = (answers[n] + 1) % 3;
    expect(scoreAnswers(answers, ALL_AUDIO, "b1")).toMatchObject({ rawScore: 80, rawMax: 110, score: 73, level: "B1.2" });
  });

  it("sanitizeAnswers بيقبل أرقام الاستماع لما صوتها يكون مرفوع بس", () => {
    expect(sanitizeAnswers({ 40: 1, 49: 7, 60: 2 }, ALL_AUDIO, "b1")).toEqual({ 40: 1, 49: 7, 60: 2 });
    expect(sanitizeAnswers({ 40: 1, 49: 7 }, {}, "b1")).toEqual({});
  });

  it("🔒 نص تسجيل (guion) لكل خانة من الـ 5 على السيرفر، ومفيش نصوص جوه بيانات الاختبار (المتصفح)", () => {
    for (let slot = 1; slot <= 5; slot++) expect(String(getAudioScript("b1", slot)).length).toBeGreaterThan(500);
    expect(getAudioScript("b1", 6)).toBeNull();
    expect(getAudioScript("b1", 4)).toMatch(/Persona 6/);
    expect(getAudioScript("b1", 4)).not.toMatch(/Ana y Tomás/);
    expect(getAudioScript("b1", 5)).toMatch(/Ana:[\s\S]*Tomás:/);
    expect(JSON.stringify(PLACEMENT_PARTS_B1)).not.toMatch(/Hotel Mirador|Sabor en Casa/);
  });
});

describe("registry", () => {
  it("b1 مدمج: normalizeTestId + مسار + صوتيات منفصلة عن a1/a2", () => {
    expect(normalizeTestId("b1")).toBe("b1");
    expect(normalizeTestId("B1")).toBe("b1");
    expect(PLACEMENT_TESTS.b1).toMatchObject({ id: "b1", label: "B1", path: "/spanish-test/b1", audioDocId: "audio_b1_v4" });
    const docs = [PLACEMENT_TESTS.a1, PLACEMENT_TESTS.a2, PLACEMENT_TESTS.b1].map((t) => t.audioDocId);
    expect(new Set(docs).size).toBe(3);
    const prefixes = [PLACEMENT_TESTS.a1, PLACEMENT_TESTS.a2, PLACEMENT_TESTS.b1].map((t) => t.audioPathPrefix);
    expect(new Set(prefixes).size).toBe(3);
  });

  it("b1 محجوز: مينفعش اختبار مخصص ياخد نفس الـ id", () => {
    expect(RESERVED_TEST_IDS).toEqual(expect.arrayContaining(["a1", "a2", "b1"]));
  });

  it("getTestIdForLevelCode: B1.x → b1", () => {
    for (const code of ["B1.1", "B1.2", "B1.3", "B1.4"]) expect(getTestIdForLevelCode(code)).toBe("b1");
    expect(getTestIdForLevelCode("B2.1")).toBeNull();
  });
});

describe("التصحيح والمستوى (B1)", () => {
  it("كله صح → 80/80 → 100 / B1.3", () => {
    const r = scoreAnswers(perfect(), {}, "b1");
    expect(r).toMatchObject({ rawScore: 80, rawMax: 80, score: 100, maxScore: 100, totalQuestions: 80, level: "B1.3", a11: 0, a12: 0 });
  });

  it("من غير أي إجابة → 0 / Pre-B1", () => {
    const r = scoreAnswers({}, {}, "b1");
    expect(r).toMatchObject({ rawScore: 0, rawMax: 80, score: 0, answered: 0, level: "Pre-B1" });
  });

  it("حدود المستويات: <40 Pre-B1 · 40–59 B1.1 · 60–79 B1.2 · 80+ B1.3", () => {
    const codes = [0, 39, 40, 59, 60, 79, 80, 100].map((p) => getLevelByPercent(p, "b1").code);
    expect(codes).toEqual(["Pre-B1", "Pre-B1", "B1.1", "B1.1", "B1.2", "B1.2", "B1.3", "B1.3"]);
  });

  it("درجة جزئية: 48 صح من 80 = 60% → B1.2، و32 صح = 40% → B1.1", () => {
    const wrongN = (count) => {
      const answers = perfect();
      for (const n of Object.keys(answers).slice(0, count)) answers[n] = (answers[n] + 1) % 3;
      return answers;
    };
    const r48 = scoreAnswers(wrongN(32), {}, "b1");
    expect(r48).toMatchObject({ rawScore: 48, score: 60, level: "B1.2" });
    const r32 = scoreAnswers(wrongN(48), {}, "b1");
    expect(r32).toMatchObject({ rawScore: 32, score: 40, level: "B1.1" });
  });

  it("إجابات A2 مش بتتحسب كويس على مفتاح B1 (مفتاح مختلف)", () => {
    const a2Answers = Object.fromEntries(getVisibleQuestions({}, "a2").map((q) => [q.n, 0]));
    expect(scoreAnswers(a2Answers, {}, "b1").rawScore).toBeLessThan(40);
  });

  it("sanitizeAnswers بيقبل أرقام B1 الظاهرة بس ضمن عدد الخيارات (والاستماع 31–60 مرفوض)", () => {
    const clean = sanitizeAnswers({ 1: 7, 2: 9, 7: 2, 8: 5, 40: 1, 61: 2, 110: 3, 999: 1 }, {}, "b1");
    // 1: ربط 8 حروف → 7 تمام · 2: 9 برا الحدود · 7: 3 خيارات → 2 تمام · 8: 5 برا · 40: استماع مخفي
    // 61: 2 تمام · 110: 3 برا (3 خيارات بس) · 999 مجهول
    expect(clean).toEqual({ 1: 7, 7: 2, 61: 2 });
  });

  it("A1 وA2 ما اتأثروش: الافتراضي a1 ومستويات A1/A2 زي ما هي", () => {
    expect(getLevelByPercent(45).code).toBe("A1.1");
    expect(getLevelByPercent(45, "a2").code).toBe("A2.1");
    expect(getVisibleQuestions({}, "a2")).toHaveLength(75);
  });
});

describe("جدول مستويات B1", () => {
  it("getLevelByCode بيلاقي Pre-B1 وB1.1–B1.3 ولكل مستوى وصف بـ3 لغات", () => {
    for (const code of ["Pre-B1", "B1.1", "B1.2", "B1.3"]) {
      const lvl = getLevelByCode(code);
      expect(lvl).toBeTruthy();
      expect(Object.keys(lvl.desc).sort()).toEqual(["ar", "en", "es"]);
    }
  });

  it("الخطوة التالية: كل مستوى بيوصّي بكورس B1 الصحيح (أسماء الكورسات الحقيقية)", () => {
    const next = (code) => getLevelByCode(code);
    expect(next("Pre-B1")).toMatchObject({ nextCode: "B1.1", nextCourseName: "Independent B1.1", floorCode: "A2.3" });
    expect(next("B1.1")).toMatchObject({ nextCode: "B1.2", nextCourseName: "Fluency B1.2" });
    expect(next("B1.2")).toMatchObject({ nextCode: "B1.3", nextCourseName: "Professional B1.3" });
    expect(next("B1.3")).toMatchObject({ nextCode: "B1.4", nextCourseName: "Study & Work B1.4" });
  });

  it("ترتيب المستويات: B1.4 بين B1.3 وB2.1 (عشان التوصية بالكورسات تشتغل)", () => {
    expect(levelRank("B1.3")).toBeLessThan(levelRank("B1.4"));
    expect(levelRank("B1.4")).toBeLessThan(levelRank("B2.1"));
    expect(levelRank("A2.3")).toBeLessThan(levelRank("B1.1"));
  });

  it("detectLevelCode: B1.4 يتعرف، وأرقام فرعية غير موجودة (A1.4) تفضل زي الأول (.1)", () => {
    expect(detectLevelCode("Study & Work B1.4")).toBe("B1.4");
    expect(detectLevelCode("B1")).toBe("B1.1");
    expect(detectLevelCode("Survival A1.3")).toBe("A1.3");
    expect(detectLevelCode("Course A1.4")).toBe("A1.1");
  });
});

describe("المراجعة (review) لاختبار B1", () => {
  it("buildResults بيستخدم مفتاح B1 والأسئلة الظاهرة بس (80)", () => {
    const res = buildResults({ 1: 0 }, {}, "b1");
    expect(res).toHaveLength(80);
    expect(res[0]).toEqual({ n: 1, a: 0, c: ANSWER_KEY_B1[1].a });
    expect(res.find((r) => r.n === 31)).toBeUndefined(); // الاستماع مش موجود
  });

  it("buildReview بيبني من أسئلة B1 (مش A1/A2)", () => {
    const review = buildReview(buildResults({ 1: 0, 2: 0 }, {}, "b1"), "b1");
    const qs = review.flatMap((p) => p.tasks.flatMap((t) => t.questions));
    expect(qs).toHaveLength(80);
    expect(qs.find((q) => q.n === 1)).toMatchObject({ isCorrect: true, yourIndex: 0 });
    expect(qs.find((q) => q.n === 2)).toMatchObject({ isCorrect: false });
    expect(qs.find((q) => q.n === 1).q).toMatch(/Marta/);
  });
});

describe("زرار الاختبار على كورسات B1", () => {
  const c = (title, extra = {}) => ({ title, ...extra });

  it("كورسات الموقع الحقيقية B1.1 … B1.4 → b1", () => {
    expect(getPlacementTestForCourse(c("Independent B1.1"))).toBe("b1");
    expect(getPlacementTestForCourse(c("Fluency B1.2"))).toBe("b1");
    expect(getPlacementTestForCourse(c("Professional B1.3"))).toBe("b1");
    expect(getPlacementTestForCourse(c("Study & Work B1.4"))).toBe("b1");
    expect(getPlacementTestForCourse(c("Spanish B1"))).toBe("b1");
  });

  it("بيقرا المستوى من slug/وسوم/ترجمات الكورس كمان، وكورسات A1/A2/B2 زي ما هي", () => {
    expect(getPlacementTestForCourse(c("curso", { slug: "study-work-b1-4" }))).toBe("b1");
    expect(getPlacementTestForCourse(c("curso", { tags: ["B1.2"] }))).toBe("b1");
    expect(getPlacementTestForCourse(c("curso", { i18n: { ar: { title: "كورس B1.3" } } }))).toBe("b1");
    expect(getPlacementTestForCourse(c("Start A1.1"))).toBe("a1");
    expect(getPlacementTestForCourse(c("Everyday A2.1"))).toBe("a2");
    expect(getPlacementTestForCourse(c("Upper B2.1"))).toBeNull();
  });

  it("اختبار مخصص مربوط من الأدمن بيتقدّم على الاسم", () => {
    expect(getPlacementTestForCourse(c("Fluency B1.2", { placementTest: { id: "custom-x" } }))).toBe("custom-x");
  });

  it("المسار", () => {
    expect(getPlacementTestPath("b1")).toBe("/spanish-test/b1");
    expect(getPlacementTestPath("a2")).toBe("/spanish-test/a2");
    expect(getPlacementTestPath("a1")).toBe("/spanish-test");
  });
});
