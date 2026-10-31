// app/lib/placementB2.test.js
//
// اختبارات اختبار تحديد المستوى B2 (إسباني):
//   - سلامة البيانات: 116 سؤال زي ملف الاختبار (36 قراءة + 30 استماع + 50 قواعد/مفردات).
//   - الاستماع: 5 تسجيلات، كل تسجيل على Tarea كاملة (Tarea 4 وTarea 5 منفصلتين)، وأي مهمة
//     من غير صوت بتتخفي والدرجة نسبة من 100 (من غير صوتيات = 86 سؤال ظاهر).
//   - مفتاح الإجابات: لكل سؤال مفتاح ضمن عدد الخيارات (116 مفتاح) + السب-ليفل (B2.1–B2.4) زي جدول Solutions.
//   - التصحيح: الدرجة نسبة من 100، والمستوى حسب جدول B2.
//   - زرار الاختبار على كورسات B2.1 … B2.4 (الأسماء الحقيقية من الموقع).
//   - A1/A2/B1 ما اتأثروش.

import { PLACEMENT_PARTS_B2, PLACEMENT_LISTENING_B2, LISTENING_ENABLED_B2 } from "@/app/lib/spanishPlacementTestB2";
import { getAudioScript } from "@/app/lib/placementAudioScripts";
import { ANSWER_KEY_B2 } from "@/app/lib/spanishPlacementTestKeyB2";
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
const allQuestions = questionsOf(PLACEMENT_PARTS_B2);
const listeningQuestions = questionsOf([PLACEMENT_LISTENING_B2]);

// إجابات كلها صح للأسئلة الظاهرة
const ALL_AUDIO = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [i + 1, `https://cdn.test/b2-${i + 1}.mp3`]));
const perfect = (audio = {}) =>
  Object.fromEntries(getVisibleQuestions(audio, "b2").map((q) => [q.n, getAnswerKey("b2")[q.n].a]));
const letter = (n) => "ABCDEFGHIJK"[ANSWER_KEY_B2[n].a];

describe("سلامة بيانات B2", () => {
  it("116 سؤال زي ملف الاختبار: 36 قراءة + 30 استماع + 50 قواعد ومفردات (بالترتيب)", () => {
    const count = (id) => PLACEMENT_PARTS_B2.find((p) => p.id === id).tasks.reduce((n, t) => n + t.questions.length, 0);
    expect(LISTENING_ENABLED_B2).toBe(true);
    expect(allQuestions).toHaveLength(116);
    expect(PLACEMENT_PARTS_B2.map((p) => p.id)).toEqual(["read", "listen", "gram"]);
    expect(count("read")).toBe(36);
    expect(count("listen")).toBe(30);
    expect(count("gram")).toBe(50);
  });

  it("عدد أسئلة كل Tarea زي الملف (قراءة 6/10/6/14 · استماع 6×5 · قواعد 13/12/13/12)", () => {
    const sizes = (id) => PLACEMENT_PARTS_B2.find((p) => p.id === id).tasks.map((t) => t.questions.length);
    expect(sizes("read")).toEqual([6, 10, 6, 14]);
    expect(sizes("listen")).toEqual([6, 6, 6, 6, 6]);
    expect(sizes("gram")).toEqual([13, 12, 13, 12]);
  });

  it("الترقيم: قراءة 1–36 · استماع 37–66 · قواعد 67–116", () => {
    const ns = allQuestions.map((x) => x.q.n);
    expect(ns).toEqual(Array.from({ length: 116 }, (_, i) => i + 1));
    expect(new Set(ns).size).toBe(116);
    // ln (الرقم جوه الجزء) زي ترقيم الملف: قراءة 1–36 · استماع 1–30 · قواعد 1–50
    const lnOf = (id) => allQuestions.filter((x) => x.part.id === id).map((x) => x.q.ln);
    expect(lnOf("read")).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    expect(lnOf("listen")).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(lnOf("gram")).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("لكل سؤال مفتاح صالح ضمن عدد خياراته (116 مفتاح) وسب-ليفل B2.1–B2.4", () => {
    for (const { q } of allQuestions) {
      const key = ANSWER_KEY_B2[q.n];
      expect(key).toBeDefined();
      expect(Number.isInteger(key.a)).toBe(true);
      expect(key.a).toBeGreaterThanOrEqual(0);
      expect(key.a).toBeLessThan(q.o.length);
      expect(key.s).toMatch(/^B2\.[1-4]$/);
    }
    expect(Object.keys(ANSWER_KEY_B2)).toHaveLength(116);
    for (const { q } of listeningQuestions) expect(ANSWER_KEY_B2[q.n]).toBeDefined();
  });

  it("توزيع السب-ليفل مطابق لإجماليات جدول Solutions في الملف", () => {
    const tally = (from, to) => {
      const t = { "B2.1": 0, "B2.2": 0, "B2.3": 0, "B2.4": 0 };
      for (let n = from; n <= to; n++) t[ANSWER_KEY_B2[n].s] += 1;
      return t;
    };
    expect(tally(1, 36)).toEqual({ "B2.1": 9, "B2.2": 9, "B2.3": 9, "B2.4": 9 }); // قراءة
    expect(tally(37, 66)).toEqual({ "B2.1": 7, "B2.2": 8, "B2.3": 8, "B2.4": 7 }); // استماع
    expect(tally(67, 116)).toEqual({ "B2.1": 13, "B2.2": 12, "B2.3": 13, "B2.4": 12 }); // قواعد ومفردات
    expect(tally(1, 116)).toEqual({ "B2.1": 29, "B2.2": 29, "B2.3": 30, "B2.4": 28 }); // الإجمالي (116)
    expect(tally(1, 66)).toEqual({ "B2.1": 16, "B2.2": 17, "B2.3": 17, "B2.4": 16 }); // من غير الجزء 3
  });

  it("أسئلة الربط: الخيارات حروف A.. بعدد عناصر bank وحروف bank متسلسلة", () => {
    const withBank = PLACEMENT_PARTS_B2.flatMap((p) => p.tasks).filter((t) => t.bank);
    expect(withBank).toHaveLength(3); // قراءة: Tarea 2 (4 نصوص) + Tarea 3 (8 فقرات) · استماع Tarea 4 (8 عبارات)
    expect(withBank.map((t) => t.bank.length)).toEqual([4, 8, 8]);
    for (const t of withBank) {
      expect(t.bank.map((b) => b.l).join("")).toBe("ABCDEFGHIJK".slice(0, t.bank.length));
      for (const q of t.questions) expect(q.o).toEqual(t.bank.map((b) => b.l));
    }
  });

  it("إجابات من جدول Solutions في الملف (قراءة + استماع + قواعد + مفردات)", () => {
    // Tarea 1: b c a b a b
    expect([1, 2, 3, 4, 5, 6].map(letter)).toEqual(["B", "C", "A", "B", "A", "B"]);
    // Tarea 2 (ربط A–D): Lidia, Inés, Rubén, Tomás, Lidia, Inés, Tomás, Rubén, Lidia, Inés
    expect([7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(letter)).toEqual(["A", "C", "B", "D", "A", "C", "D", "B", "A", "C"]);
    // Tarea 3 (فقرات ناقصة): A B C D E G — F وH زيادة
    expect([17, 18, 19, 20, 21, 22].map(letter)).toEqual(["A", "B", "C", "D", "E", "G"]);
    expect(PLACEMENT_PARTS_B2[0].tasks[2].bank.map((b) => b.l)).toEqual(expect.arrayContaining(["F", "H"]));
    // Tarea 4 (cloze 23–36): se recuperaría / perdiendo / continuara / convertir / pero / Una vez que / hubiera sido /
    //                        lo que / subido / luchan / que / estén / expulse / sea
    expect(Array.from({ length: 14 }, (_, i) => letter(23 + i))).toEqual("CCABABCBACCBBC".split(""));
    // استماع: Tarea 2 (Elena a · Mario b · Los dos c)
    expect([43, 44, 45, 46, 47, 48].map(letter)).toEqual(["B", "A", "C", "B", "A", "C"]);
    // استماع Tarea 4: Persona 1→C · 2→D · 3→A · 4→F · 5→B · 6→E (G وH زيادة)
    expect([55, 56, 57, 58, 59, 60].map(letter)).toEqual(["C", "D", "A", "F", "B", "E"]);
    // قواعد: había empezado, encontré, dile, respeten, para, es, me he reído, tuviera
    expect([67, 68, 69, 70, 71, 72, 73, 74].map(letter)).toEqual(["B", "C", "B", "C", "A", "B", "C", "A"]);
    // مفردات: alquiler (26) · gestionar (38) · producción (39) · aval (50)
    expect([letter(92), letter(104), letter(105), letter(116)]).toEqual(["C", "A", "B", "A"]);
  });

  it("الإجابة الصحيحة موجودة فعلًا في خيارات الأسئلة العادية (نص الخيار مش فاضي)", () => {
    for (const { q, task } of allQuestions) {
      if (task.bank) continue;
      expect(q.o).toHaveLength(3);
      for (const o of q.o) expect(String(o).trim().length).toBeGreaterThan(0);
    }
  });

  it("نصوص الأسئلة من الملف نفسه (عينات)", () => {
    expect(allQuestions[0].q.q).toMatch(/experimento/);
    expect(PLACEMENT_PARTS_B2[0].tasks[0].passage).toMatch(/Raquel Domínguez/);
    expect(PLACEMENT_PARTS_B2[0].tasks[3].passage).toMatch(/\(36\)/);
    expect(allQuestions.find((x) => x.q.n === 116).q.q).toMatch(/aval|el ___ de varias instituciones/);
  });
});

describe("الاستماع (5 تسجيلات، كل تسجيل على Tarea كاملة)", () => {
  it("5 مهام: 6 أسئلة لكل مهمة بأرقام 37–66", () => {
    expect(PLACEMENT_LISTENING_B2.tasks.map((t) => t.questions.length)).toEqual([6, 6, 6, 6, 6]);
    expect(listeningQuestions.map((x) => x.q.n)).toEqual(Array.from({ length: 30 }, (_, i) => i + 37));
  });

  it("Tarea 2: الخيارات Elena / Mario / Los dos", () => {
    for (const q of PLACEMENT_LISTENING_B2.tasks[1].questions) expect(q.o).toEqual(["Elena", "Mario", "Los dos"]);
  });

  it("5 خانات صوت: لكل Tarea خانتها (Tarea 4 → 4 · Tarea 5 → 5) ومفيش audioSlot على مستوى السؤال", () => {
    expect(PLACEMENT_LISTENING_B2.tasks.map((t) => t.audioSlot)).toEqual([1, 2, 3, 4, 5]);
    expect(PLACEMENT_LISTENING_B2.tasks.some((t) => t.questions.some((q) => q.audioSlot !== undefined))).toBe(false);
    expect(PLACEMENT_TESTS.b2.audioSlots.map((a) => a.slot)).toEqual([1, 2, 3, 4, 5]);
    expect(PLACEMENT_TESTS.b2.audioDocId).toBe("audio_b2_v1");
  });

  it("من غير صوتيات → الاستماع مخفي كله (86 سؤال: قراءة + قواعد)", () => {
    expect(getVisiblePartsFor("b2", {}).map((p) => p.id)).toEqual(["read", "gram"]);
    expect(getVisibleQuestions({}, "b2")).toHaveLength(86);
  });

  it("الخمس صوتيات مرفوعة → 116 سؤال، ولكل Tarea مشغّلها بصوتها", () => {
    const parts = getVisiblePartsFor("b2", ALL_AUDIO);
    expect(parts.map((p) => p.id)).toEqual(["read", "listen", "gram"]);
    expect(getVisibleQuestions(ALL_AUDIO, "b2")).toHaveLength(116);
    const tasks = parts[1].tasks;
    expect(tasks.map((t) => t.audioSrc)).toEqual([1, 2, 3, 4, 5].map((n) => ALL_AUDIO[n]));
    expect(tasks.some((t) => t.sharedAudio)).toBe(false);
  });

  it("كل صوت بيفتح مهمته كاملة: صوت 1 → 37–42 · 2 → 43–48 · 3 → 49–54 · 4 → 55–60 · 5 → 61–66 · الباقي مخفي", () => {
    const only = (slot) => getVisibleQuestions({ [slot]: "x" }, "b2").map((q) => q.n).filter((n) => n > 36 && n < 67);
    expect(only(1)).toEqual([37, 38, 39, 40, 41, 42]);
    expect(only(2)).toEqual([43, 44, 45, 46, 47, 48]);
    expect(only(3)).toEqual([49, 50, 51, 52, 53, 54]);
    expect(only(4)).toEqual([55, 56, 57, 58, 59, 60]);
    expect(only(5)).toEqual([61, 62, 63, 64, 65, 66]);
  });

  it("صوت جزئي: الدرجة نسبة من 100 على الأسئلة الظاهرة بس", () => {
    const audio = { 2: "x" };
    expect(getVisibleQuestions(audio, "b2")).toHaveLength(92);
    expect(scoreAnswers(perfect(audio), audio, "b2")).toMatchObject({ rawScore: 92, rawMax: 92, score: 100 });
  });

  it("كله صح مع كل الصوتيات → 116/116 → 100 / B2.3، وغلط الاستماع كله → 86/116", () => {
    expect(scoreAnswers(perfect(ALL_AUDIO), ALL_AUDIO, "b2")).toMatchObject({ rawScore: 116, rawMax: 116, score: 100, level: "B2.3" });
    const answers = perfect(ALL_AUDIO);
    for (let n = 37; n <= 66; n++) answers[n] = (answers[n] + 1) % 3;
    expect(scoreAnswers(answers, ALL_AUDIO, "b2")).toMatchObject({ rawScore: 86, rawMax: 116, score: 74, level: "B2.2" });
  });

  it("sanitizeAnswers بيقبل أرقام الاستماع لما صوتها يكون مرفوع بس", () => {
    expect(sanitizeAnswers({ 40: 1, 55: 7, 66: 2 }, ALL_AUDIO, "b2")).toEqual({ 40: 1, 55: 7, 66: 2 });
    expect(sanitizeAnswers({ 40: 1, 55: 7 }, {}, "b2")).toEqual({});
  });

  it("🔒 نص تسجيل (guion) لكل خانة من الـ 5 على السيرفر، ومفيش نصوص جوه بيانات الاختبار (المتصفح)", () => {
    for (let slot = 1; slot <= 5; slot++) expect(String(getAudioScript("b2", slot)).length).toBeGreaterThan(500);
    expect(getAudioScript("b2", 6)).toBeNull();
    expect(getAudioScript("b2", 1)).toMatch(/Conversación 6/);
    expect(getAudioScript("b2", 2)).toMatch(/Elena:[\s\S]*Mario:/);
    expect(getAudioScript("b2", 3)).toMatch(/Clara Montero/);
    expect(getAudioScript("b2", 4)).toMatch(/Persona 6/);
    expect(getAudioScript("b2", 4)).not.toMatch(/Clara Montero/);
    expect(getAudioScript("b2", 5)).toMatch(/dietas de moda/);
    expect(JSON.stringify(PLACEMENT_PARTS_B2)).not.toMatch(/Moda Verde|Croacia|Hay que hacer algo/);
  });
});

describe("registry", () => {
  it("b2 مدمج: normalizeTestId + مسار + صوتيات منفصلة عن a1/a2/b1", () => {
    expect(normalizeTestId("b2")).toBe("b2");
    expect(normalizeTestId("B2")).toBe("b2");
    expect(PLACEMENT_TESTS.b2).toMatchObject({ id: "b2", label: "B2", path: "/spanish-test/b2", audioDocId: "audio_b2_v1" });
    const all = [PLACEMENT_TESTS.a1, PLACEMENT_TESTS.a2, PLACEMENT_TESTS.b1, PLACEMENT_TESTS.b2];
    expect(new Set(all.map((t) => t.audioDocId)).size).toBe(4);
    expect(new Set(all.map((t) => t.audioPathPrefix)).size).toBe(4);
  });

  it("b2 محجوز: مينفعش اختبار مخصص ياخد نفس الـ id", () => {
    expect(RESERVED_TEST_IDS).toEqual(expect.arrayContaining(["a1", "a2", "b1", "b2"]));
  });

  it("getTestIdForLevelCode: B2.x → b2", () => {
    for (const code of ["B2.1", "B2.2", "B2.3", "B2.4"]) expect(getTestIdForLevelCode(code)).toBe("b2");
    expect(getTestIdForLevelCode("B1.4")).toBe("b1");
    expect(getTestIdForLevelCode("C1.1")).toBeNull();
  });

  it("مفتاح الإجابات بيتجاب من placementTestKeys للـ b2", () => {
    expect(getAnswerKey("b2")).toBe(ANSWER_KEY_B2);
    expect(getAnswerKey("b1")).not.toBe(ANSWER_KEY_B2);
  });
});

describe("التصحيح والمستوى (B2)", () => {
  it("كله صح → 86/86 → 100 / B2.3", () => {
    const r = scoreAnswers(perfect(), {}, "b2");
    expect(r).toMatchObject({ rawScore: 86, rawMax: 86, score: 100, maxScore: 100, totalQuestions: 86, level: "B2.3", a11: 0, a12: 0 });
  });

  it("من غير أي إجابة → 0 / Pre-B2", () => {
    const r = scoreAnswers({}, {}, "b2");
    expect(r).toMatchObject({ rawScore: 0, rawMax: 86, score: 0, answered: 0, level: "Pre-B2" });
  });

  it("حدود المستويات: <40 Pre-B2 · 40–59 B2.1 · 60–79 B2.2 · 80+ B2.3", () => {
    const codes = [0, 39, 40, 59, 60, 79, 80, 100].map((p) => getLevelByPercent(p, "b2").code);
    expect(codes).toEqual(["Pre-B2", "Pre-B2", "B2.1", "B2.1", "B2.2", "B2.2", "B2.3", "B2.3"]);
  });

  it("درجة جزئية على 86 سؤال: 52 صح = 60% → B2.2 · 51 صح = 59% → B2.1 · 35 صح = 41% → B2.1 · 33 صح = 38% → Pre-B2", () => {
    const wrongN = (count) => {
      const answers = perfect();
      for (const n of Object.keys(answers).slice(0, count)) answers[n] = (answers[n] + 1) % 3;
      return answers;
    };
    expect(scoreAnswers(wrongN(34), {}, "b2")).toMatchObject({ rawScore: 52, score: 60, level: "B2.2" });
    expect(scoreAnswers(wrongN(35), {}, "b2")).toMatchObject({ rawScore: 51, score: 59, level: "B2.1" });
    expect(scoreAnswers(wrongN(51), {}, "b2")).toMatchObject({ rawScore: 35, score: 41, level: "B2.1" });
    expect(scoreAnswers(wrongN(53), {}, "b2")).toMatchObject({ rawScore: 33, score: 38, level: "Pre-B2" });
  });

  it("إجابات مفتاح B1 مش بتجيب درجة عالية على B2 (مفتاح مختلف)", () => {
    const b1Answers = Object.fromEntries(getVisibleQuestions({}, "b1").map((q) => [q.n, getAnswerKey("b1")[q.n].a]));
    expect(scoreAnswers(b1Answers, {}, "b2").rawScore).toBeLessThan(43);
  });

  it("sanitizeAnswers بيقبل أرقام B2 الظاهرة بس ضمن عدد الخيارات (والاستماع 37–66 مرفوض)", () => {
    const clean = sanitizeAnswers({ 1: 2, 2: 3, 7: 3, 8: 4, 17: 7, 18: 8, 40: 1, 67: 2, 116: 3, 999: 1 }, {}, "b2");
    // 1: 3 خيارات → 2 تمام · 2: 3 برا · 7: ربط 4 حروف → 3 تمام · 8: 4 برا · 17: ربط 8 حروف → 7 تمام · 18: 8 برا ·
    // 40: استماع مخفي · 67: 2 تمام · 116: 3 برا (3 خيارات بس) · 999 مجهول
    expect(clean).toEqual({ 1: 2, 7: 3, 17: 7, 67: 2 });
  });

  it("A1 وA2 وB1 ما اتأثروش", () => {
    expect(getLevelByPercent(45).code).toBe("A1.1");
    expect(getLevelByPercent(45, "a2").code).toBe("A2.1");
    expect(getLevelByPercent(45, "b1").code).toBe("B1.1");
    expect(getVisibleQuestions({}, "a2")).toHaveLength(75);
    expect(getVisibleQuestions({}, "b1")).toHaveLength(80);
  });
});

describe("جدول مستويات B2", () => {
  it("getLevelByCode بيلاقي Pre-B2 وB2.1–B2.3 ولكل مستوى وصف بـ3 لغات", () => {
    for (const code of ["Pre-B2", "B2.1", "B2.2", "B2.3"]) {
      const lvl = getLevelByCode(code);
      expect(lvl).toBeTruthy();
      expect(Object.keys(lvl.desc).sort()).toEqual(["ar", "en", "es"]);
    }
  });

  it("الخطوة التالية: كل مستوى بيوصّي بكورس B2 الصحيح (أسماء الكورسات الحقيقية)", () => {
    const next = (code) => getLevelByCode(code);
    expect(next("Pre-B2")).toMatchObject({ nextCode: "B2.1", nextCourseName: "Advanced B2.1", floorCode: "B1.4" });
    expect(next("B2.1")).toMatchObject({ nextCode: "B2.2", nextCourseName: "Advanced Plus B2.2" });
    expect(next("B2.2")).toMatchObject({ nextCode: "B2.3", nextCourseName: "Advanced Pro B2.3" });
    expect(next("B2.3")).toMatchObject({ nextCode: "B2.4", nextCourseName: "Advanced Mastery B2.4" });
  });

  it("ترتيب المستويات: B2.4 بين B2.3 وC1.1 (عشان التوصية بالكورسات تشتغل)", () => {
    expect(levelRank("B2.3")).toBeLessThan(levelRank("B2.4"));
    expect(levelRank("B2.4")).toBeLessThan(levelRank("C1.1"));
    expect(levelRank("B1.4")).toBeLessThan(levelRank("B2.1"));
    // B2.4 لازم يكون له رتبة (مش -1) عشان nextRank في getRecommendedCourses يتعلّم صح
    expect(levelRank("B2.4")).toBeGreaterThan(-1);
  });

  it("detectLevelCode: B2.4 يتعرف، وB2 لوحدها = B2.1، وB1.4 زي ما هو", () => {
    expect(detectLevelCode("Advanced Mastery B2.4")).toBe("B2.4");
    expect(detectLevelCode("B2")).toBe("B2.1");
    expect(detectLevelCode("Study & Work B1.4")).toBe("B1.4");
    expect(detectLevelCode("Course A1.4")).toBe("A1.1");
  });
});

describe("المراجعة (review) لاختبار B2", () => {
  it("buildResults بيستخدم مفتاح B2 والأسئلة الظاهرة بس (86)", () => {
    const res = buildResults({ 1: 0 }, {}, "b2");
    expect(res).toHaveLength(86);
    expect(res[0]).toEqual({ n: 1, a: 0, c: ANSWER_KEY_B2[1].a });
    expect(res.find((r) => r.n === 37)).toBeUndefined(); // الاستماع مش موجود
  });

  it("buildReview بيبني من أسئلة B2 (مش A1/A2/B1)", () => {
    const review = buildReview(buildResults({ 1: 1, 2: 0 }, {}, "b2"), "b2");
    const qs = review.flatMap((p) => p.tasks.flatMap((t) => t.questions));
    expect(qs).toHaveLength(86);
    expect(qs.find((q) => q.n === 1)).toMatchObject({ isCorrect: true, yourIndex: 1 });
    expect(qs.find((q) => q.n === 2)).toMatchObject({ isCorrect: false });
    expect(qs.find((q) => q.n === 1).q).toMatch(/experimento/);
  });
});

describe("زرار الاختبار على كورسات B2", () => {
  const c = (title, extra = {}) => ({ title, ...extra });

  it("كورسات الموقع الحقيقية B2.1 … B2.4 → b2", () => {
    expect(getPlacementTestForCourse(c("Advanced B2.1"))).toBe("b2");
    expect(getPlacementTestForCourse(c("Advanced Plus B2.2"))).toBe("b2");
    expect(getPlacementTestForCourse(c("Advanced Pro B2.3"))).toBe("b2");
    expect(getPlacementTestForCourse(c("Advanced Mastery B2.4"))).toBe("b2");
    expect(getPlacementTestForCourse(c("Spanish B2"))).toBe("b2");
  });

  it("بيقرا المستوى من slug/وسوم/ترجمات الكورس كمان، وكورسات A1/A2/B1 زي ما هي", () => {
    expect(getPlacementTestForCourse(c("curso", { slug: "advanced-mastery-b2-4" }))).toBe("b2");
    expect(getPlacementTestForCourse(c("curso", { tags: ["B2.2"] }))).toBe("b2");
    expect(getPlacementTestForCourse(c("curso", { i18n: { ar: { title: "كورس B2.3" } } }))).toBe("b2");
    expect(getPlacementTestForCourse(c("Start A1.1"))).toBe("a1");
    expect(getPlacementTestForCourse(c("Everyday A2.1"))).toBe("a2");
    expect(getPlacementTestForCourse(c("Study & Work B1.4"))).toBe("b1");
    expect(getPlacementTestForCourse(c("Upper C1.1"))).toBeNull();
  });

  it("اختبار مخصص مربوط من الأدمن بيتقدّم على الاسم", () => {
    expect(getPlacementTestForCourse(c("Advanced B2.1", { placementTest: { id: "custom-x" } }))).toBe("custom-x");
  });

  it("المسار", () => {
    expect(getPlacementTestPath("b2")).toBe("/spanish-test/b2");
    expect(getPlacementTestPath("b1")).toBe("/spanish-test/b1");
    expect(getPlacementTestPath("a2")).toBe("/spanish-test/a2");
    expect(getPlacementTestPath("a1")).toBe("/spanish-test");
    expect(getPlacementTestPath("c1")).toBe("/level-test/c1");
  });
});
