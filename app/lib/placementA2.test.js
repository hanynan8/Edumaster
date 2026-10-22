// app/lib/placementA2.test.js
//
// اختبارات اختبار تحديد المستوى A2 (إسباني):
//   - سلامة البيانات: 100 سؤال (25 قراءة + 25 استماع + 50 قواعد/مفردات)، أرقام فريدة،
//     مفتاح إجابات لكل سؤال وضمن عدد الخيارات، وأسئلة الربط حروفها = حروف bank.
//   - التصحيح: الاستماع من غير صوت بيتخفي والدرجة بتتحسب من 100، والمستوى حسب جدول A2.
//   - A1 متأثرش (نفس الدرجات/المفتاح/الافتراضي).
//   - المراجعة (review) بتشتغل بمفتاح A2 والنتايج القديمة من غير test = A1.
//   - زرار الاختبار على الكورسات: كورس A1 → a1، كورس A2 → a2، غيرهم → null.

import { PLACEMENT_PARTS_A2 } from "@/app/lib/spanishPlacementTestA2";
import { ANSWER_KEY_A2 } from "@/app/lib/spanishPlacementTestKeyA2";
import { ANSWER_KEY } from "@/app/lib/spanishPlacementTestKey";
import {
  PLACEMENT_TESTS,
  getVisiblePartsFor,
  normalizeTestId,
  getTestIdForLevelCode,
} from "@/app/lib/placementTests";
import { getAnswerKey } from "@/app/lib/placementTestKeys";
import {
  getLevelByPercent,
  getLevelByCode,
  getPlacementTestForCourse,
  getPlacementTestPath,
  isPlacementTestCourse,
} from "@/app/lib/placementLevels";
import { scoreAnswers, sanitizeAnswers, getVisibleQuestions } from "@/app/lib/placementTest";
import { buildResults, buildReview, reviewFromDoc, legacyResults } from "@/app/lib/placementReview";
import { getAudioScript } from "@/app/lib/placementAudioScripts";

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

const ALL_AUDIO = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, `a${i + 1}.mp3`])); // A2: 12 تسجيل
const allQuestions = PLACEMENT_PARTS_A2.flatMap((p) => p.tasks.flatMap((t) => t.questions.map((q) => ({ q, task: t, part: p }))));

// إجابات كلها صح للأسئلة الظاهرة
const perfect = (testId, audio) =>
  Object.fromEntries(getVisibleQuestions(audio, testId).map((q) => [q.n, getAnswerKey(testId)[q.n].a]));

describe("سلامة بيانات A2", () => {
  it("100 سؤال: 25 قراءة + 25 استماع + 50 قواعد ومفردات", () => {
    const count = (id) => PLACEMENT_PARTS_A2.find((p) => p.id === id).tasks.reduce((n, t) => n + t.questions.length, 0);
    expect(allQuestions).toHaveLength(100);
    expect(count("read")).toBe(25);
    expect(count("listen")).toBe(25);
    expect(count("gram")).toBe(50);
  });

  it("أرقام الأسئلة 1–100 فريدة ومتسلسلة، ولكل سؤال مفتاح إجابة صالح", () => {
    expect(allQuestions.map((x) => x.q.n)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(Object.keys(ANSWER_KEY_A2)).toHaveLength(100);
    for (const { q } of allQuestions) {
      const key = ANSWER_KEY_A2[q.n];
      expect(key).toBeDefined();
      expect(Number.isInteger(key.a)).toBe(true);
      expect(key.a).toBeGreaterThanOrEqual(0);
      expect(key.a).toBeLessThan(q.o.length);
    }
  });

  it("أسئلة الربط: الخيارات حروف A.. بعدد عناصر bank، وحروف bank متسلسلة", () => {
    const withBank = PLACEMENT_PARTS_A2.flatMap((p) => p.tasks).filter((t) => t.bank);
    expect(withBank).toHaveLength(5); // قراءة 2 + استماع 3
    for (const t of withBank) {
      expect(t.bank.map((b) => b.l).join("")).toBe("ABCDEFGHIJK".slice(0, t.bank.length));
      for (const q of t.questions) expect(q.o).toEqual(t.bank.map((b) => b.l));
    }
  });

  it("الاستماع 12 تسجيل زي ملف Word: Tarea 1 (5 منفصلة 1–5) + Tarea 2 (5 منفصلة 6–10) + Carmen (11) + Rosa y Miguel (12)", () => {
    const [t1, t2, t3, t4] = PLACEMENT_PARTS_A2.find((p) => p.id === "listen").tasks;
    expect(t1.questions.map((q) => q.audioSlot)).toEqual([1, 2, 3, 4, 5]);
    expect(t2.questions.map((q) => q.audioSlot)).toEqual([6, 7, 8, 9, 10]);
    expect(t1.audioSlot).toBeUndefined();
    expect(t2.audioSlot).toBeUndefined();
    expect(t3.audioSlot).toBe(11);
    expect(t4.audioSlot).toBe(12);
    expect(PLACEMENT_TESTS.a2.audioSlots.map((a) => a.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(PLACEMENT_TESTS.a1.audioSlots.map((a) => a.slot)).toEqual([1, 2, 3, 4]); // A1 زي ما هو
  });

  it("خانات الصوت: السؤال من غير تسجيله بيتخفي، وA1 ما اتغيرش", () => {
    const listenQs = (audio) =>
      getVisiblePartsFor("a2", audio).find((p) => p.id === "listen")?.tasks.flatMap((t) => t.questions.map((q) => q.n)) ?? [];
    expect(listenQs({})).toEqual([]);
    expect(listenQs({ 1: "u1", 3: "u3", 12: "u12" })).toEqual([26, 28, 44, 45, 46, 47, 48, 49, 50]);
    const all = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, `u${i + 1}`]));
    expect(listenQs(all)).toHaveLength(25);
    // كل سؤال بيشغّل تسجيله هو
    const t1 = getVisiblePartsFor("a2", all).find((p) => p.id === "listen").tasks[0];
    expect(t1.questions.map((q) => q.audioSrc)).toEqual(["u1", "u2", "u3", "u4", "u5"]);
    // A1: مهمة كاملة بصوت واحد زي الأول
    const a1 = getVisiblePartsFor("a1", { 1: "x" }).find((p) => p.id === "listen").tasks;
    expect(a1).toHaveLength(1);
    expect(a1[0].audioSrc).toBe("x");
  });

  it("إجابات مختارة من ملف Word (Anexo 2)", () => {
    // قراءة 1=B, 10=G | استماع (26..50): 26=B, 36=K, 50=G | قواعد 51=B, 100(مفردات 50)=A
    const letter = (n) => "ABCDEFGHIJK"[ANSWER_KEY_A2[n].a];
    expect([1, 2, 9, 10, 11, 25].map(letter)).toEqual(["B", "B", "D", "G", "H", "B"]);
    expect([26, 31, 36, 43, 44, 50].map(letter)).toEqual(["B", "G", "K", "B", "A", "G"]);
    expect([51, 62, 75, 76, 99, 100].map(letter)).toEqual(["B", "C", "B", "A", "C", "A"]);
  });

  it("نصوص الاستماع (للأدمن) موجودة لخانات A2 الـ 12 ومش موجودة لـ A1", () => {
    for (let slot = 1; slot <= 12; slot++) expect(getAudioScript("a2", slot).length).toBeGreaterThan(150);
    expect(getAudioScript("a2", 13)).toBeNull();
    expect(getAudioScript("a1", 1)).toBeNull();
  });
});

describe("registry", () => {
  it("normalizeTestId: a1/a2 وأي حاجة تانية → a1", () => {
    expect(normalizeTestId("a2")).toBe("a2");
    expect(normalizeTestId("A2")).toBe("a2");
    expect(normalizeTestId("a1")).toBe("a1");
    expect(normalizeTestId(undefined)).toBe("a1");
    expect(normalizeTestId("b1")).toBe("a1");
  });

  it("كل اختبار له صوتيات منفصلة (doc + فولدر مختلفين)", () => {
    expect(PLACEMENT_TESTS.a1.audioDocId).toBe("audio"); // زي ما كان — صوتيات A1 المرفوعة تفضل شغالة
    expect(PLACEMENT_TESTS.a2.audioDocId).toBe("audio_a2_v2"); // مستند جديد: A2 بقى 12 خانة
    expect(PLACEMENT_TESTS.a1.audioPathPrefix).not.toBe(PLACEMENT_TESTS.a2.audioPathPrefix);
  });

  it("getTestIdForLevelCode", () => {
    expect(getTestIdForLevelCode("A1.3")).toBe("a1");
    expect(getTestIdForLevelCode("A2.1")).toBe("a2");
    expect(getTestIdForLevelCode("B1.1")).toBeNull();
  });
});

describe("التصحيح والمستوى (A2)", () => {
  it("من غير صوتيات: الاستماع بيتخفي (75 سؤال) والدرجة بتتحسب من 100", () => {
    expect(getVisibleQuestions({}, "a2")).toHaveLength(75);
    const r = scoreAnswers(perfect("a2", {}), {}, "a2");
    expect(r).toMatchObject({ rawScore: 75, rawMax: 75, score: 100, maxScore: 100, totalQuestions: 75, level: "A2.3" });
  });

  it("بكل الصوتيات: 100 سؤال، كله صح → 100 / A2.3", () => {
    const r = scoreAnswers(perfect("a2", ALL_AUDIO), ALL_AUDIO, "a2");
    expect(r).toMatchObject({ rawScore: 100, rawMax: 100, score: 100, level: "A2.3", a11: 0, a12: 0 });
  });

  it("حدود المستويات حسب الباريمو: <40 Pre-A2 · 40–59 A2.1 · 60–79 A2.2 · 80+ A2.3", () => {
    const codes = [0, 39, 40, 59, 60, 79, 80, 100].map((p) => getLevelByPercent(p, "a2").code);
    expect(codes).toEqual(["Pre-A2", "Pre-A2", "A2.1", "A2.1", "A2.2", "A2.2", "A2.3", "A2.3"]);
  });

  it("درجة جزئية: 65 إجابة صح من 100 → A2.2", () => {
    const answers = perfect("a2", ALL_AUDIO);
    // نغلّط 35 سؤال
    const wrong = Object.keys(answers).slice(0, 35);
    for (const n of wrong) answers[n] = (answers[n] + 1) % 3;
    const r = scoreAnswers(answers, ALL_AUDIO, "a2");
    expect(r.rawScore).toBe(65);
    expect(r.level).toBe("A2.2");
  });

  it("إجابة A1 مش بتتحسب في A2 (مفتاح مختلف)", () => {
    const a1Answers = perfect("a1", {});
    const r = scoreAnswers(a1Answers, {}, "a2");
    expect(r.rawScore).toBeLessThan(75);
  });

  it("sanitizeAnswers بيقبل أرقام A2 بس ضمن عدد الخيارات", () => {
    const clean = sanitizeAnswers({ 1: 2, 2: 5, 999: 1, 6: 8 }, {}, "a2");
    // 2: القيمة 5 برا عدد الخيارات (3)، 6: ربط 9 حروف فـ 8 تمام، 999 مجهول
    expect(clean).toEqual({ 1: 2, 6: 8 });
  });

  it("A1 زي ما هو: الافتراضي a1 والمفتاح ومستويات A1 والـ a11/a12", () => {
    const answers = Object.fromEntries(getVisibleQuestions({}, "a1").map((q) => [q.n, ANSWER_KEY[q.n].a]));
    const viaDefault = scoreAnswers(answers, {});
    const viaExplicit = scoreAnswers(answers, {}, "a1");
    expect(viaDefault).toEqual(viaExplicit);
    expect(viaDefault.level).toBe("A1.3");
    expect(viaDefault.a11 + viaDefault.a12).toBe(viaDefault.rawScore);
    expect(getLevelByPercent(45).code).toBe("A1.1"); // من غير testId = A1
  });
});

describe("جدول المستويات", () => {
  it("getLevelByCode بيلاقي مستويات A1 وA2 ولكل مستوى وصف بـ3 لغات", () => {
    for (const code of ["Pre-A1", "A1.1", "A1.2", "A1.3", "Pre-A2", "A2.1", "A2.2", "A2.3"]) {
      const lvl = getLevelByCode(code);
      expect(lvl).toBeTruthy();
      expect(Object.keys(lvl.desc).sort()).toEqual(["ar", "en", "es"]);
    }
    expect(getLevelByCode("nope")).toBeNull();
  });
});

describe("المراجعة (review) لاختبار A2", () => {
  it("buildResults بيستخدم مفتاح A2 والأسئلة الظاهرة بس", () => {
    const res = buildResults({ 1: 1 }, {}, "a2");
    expect(res).toHaveLength(75);
    expect(res[0]).toEqual({ n: 1, a: 1, c: ANSWER_KEY_A2[1].a });
    expect(res.find((r) => r.n === 26)).toBeUndefined(); // الاستماع مخفي
    expect(buildResults({}, ALL_AUDIO, "a2")).toHaveLength(100);
  });

  it("buildReview بيبني من أسئلة A2 (مش A1)", () => {
    const review = buildReview(buildResults({ 1: 1, 2: 0 }, ALL_AUDIO, "a2"), "a2");
    const qs = review.flatMap((p) => p.tasks.flatMap((t) => t.questions));
    expect(qs).toHaveLength(100);
    expect(qs.find((q) => q.n === 1)).toMatchObject({ isCorrect: true, yourIndex: 1 });
    expect(qs.find((q) => q.n === 2)).toMatchObject({ isCorrect: false });
    expect(qs.find((q) => q.n === 1).q).toMatch(/Pablo/);
  });

  it("reviewFromDoc: doc.test=a2 → A2، ومن غير test → A1 (نتايج قديمة)", () => {
    const a2doc = { test: "a2", answers: { 1: 1 }, results: buildResults({ 1: 1 }, {}, "a2") };
    expect(reviewFromDoc(a2doc).flatMap((p) => p.tasks.flatMap((t) => t.questions))[0].q).toMatch(/Pablo/);

    const legacyA1 = { answers: { 1: 1 } }; // مفيش results ولا test
    const q1 = reviewFromDoc(legacyA1).flatMap((p) => p.tasks.flatMap((t) => t.questions))[0];
    expect(q1.q).toBe("Pablo da su..."); // سؤال A1 رقم 1
    expect(legacyResults({ 26: 0 }, "a2").some((r) => r.n === 26)).toBe(true); // استماع A2 ظاهر لو اتجاوب
  });
});

describe("زرار الاختبار على الكورسات", () => {
  const c = (title, extra = {}) => ({ title, ...extra });
  it("كورس A1 → a1 · كورس A2 → a2 · غيرهم → null", () => {
    expect(getPlacementTestForCourse(c("Start A1.1"))).toBe("a1");
    expect(getPlacementTestForCourse(c("Survival A1.3"))).toBe("a1");
    expect(getPlacementTestForCourse(c("Everyday A2.1"))).toBe("a2");
    expect(getPlacementTestForCourse(c("Spanish A2"))).toBe("a2");
    expect(getPlacementTestForCourse(c("Advanced A2.3"))).toBe("a2");
    expect(getPlacementTestForCourse(c("Intermediate B1.1"))).toBeNull();
    expect(getPlacementTestForCourse(c("Spanish for travel"))).toBeNull();
    expect(getPlacementTestForCourse(null)).toBeNull();
  });

  it("بيقرا المستوى من slug/وسوم/ترجمات الكورس كمان", () => {
    expect(getPlacementTestForCourse(c("curso", { slug: "spanish-a2-1" }))).toBe("a2");
    expect(getPlacementTestForCourse(c("curso", { tags: ["A2.2"] }))).toBe("a2");
    expect(getPlacementTestForCourse(c("curso", { i18n: { ar: { title: "كورس A2.1" } } }))).toBe("a2");
  });

  it("isPlacementTestCourse القديم = A1 بس، والمسارات", () => {
    expect(isPlacementTestCourse(c("Start A1.1"))).toBe(true);
    expect(isPlacementTestCourse(c("Everyday A2.1"))).toBe(false);
    expect(getPlacementTestPath("a1")).toBe("/spanish-test");
    expect(getPlacementTestPath("a2")).toBe("/spanish-test/a2");
    expect(getPlacementTestPath(null)).toBe("/spanish-test");
  });
});
