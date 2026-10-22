// app/lib/placementTestImport.test.js
//
// ملف Excel لاختبار تحديد المستوى المخصص (B1, B2, ...):
//   - القالب الجاهز بيتقري بنجاح، والتصدير ← إعادة القراءة بيرجّع نفس الاختبار بالظبط (round trip).
//   - التحقق من الأخطاء (Settings/Questions/Bank/Audio) برسايل بالعربي والإنجليزي ورقم الصف.
//   - الاختبار المقروء بيشتغل مع نفس منطق A1/A2 (الأسئلة الظاهرة + التصحيح + المستوى).

import ExcelJS from "exceljs";
import { parsePlacementTestWorkbook } from "@/app/lib/placementTestImport";
import { buildSampleTemplate, testToXlsxBuffer, SAMPLE_TEST } from "@/app/lib/placementTestTemplate";
import { getVisiblePartsFor } from "@/app/lib/placementTests";
import { getVisibleQuestions, scoreAnswers, sanitizeAnswers } from "@/app/lib/placementTest";
import { buildResults, buildReview } from "@/app/lib/placementReview";

jest.mock("@/app/lib/models", () => ({ getCourseModel: jest.fn(), getCategoryModel: jest.fn() }));

const Q_HEADERS = [
  "Part", "Part Minutes", "Task", "Task Instructions", "Passage", "Task Audio Slot", "Question Audio Slot",
  "Question", "Context", "Option A", "Option B", "Option C", "Option D", "Option E", "Option F", "Correct Answer",
];

// بيبني ملف xlsx من مصفوفات (rows = مصفوفة صفوف، كل صف = object بعناوين الأعمدة)
async function makeFile({ settings, questions = [], bank = [], audio = [], skip = [] } = {}) {
  const wb = new ExcelJS.Workbook();
  if (!skip.includes("Settings")) {
    const ws = wb.addWorksheet("Settings");
    ws.addRow(["Key", "Value"]);
    const s = { "Test ID": "b1", "Level (CEFR)": "B1", "Test Title": "My B1 test", ...settings };
    for (const [k, v] of Object.entries(s)) if (v !== undefined) ws.addRow([k, v]);
  }
  if (!skip.includes("Questions")) {
    const ws = wb.addWorksheet("Questions");
    ws.addRow(Q_HEADERS);
    for (const q of questions) ws.addRow(Q_HEADERS.map((h) => q[h]));
  }
  const bws = wb.addWorksheet("Bank");
  bws.addRow(["Part", "Task", "Letter", "Text"]);
  for (const b of bank) bws.addRow([b.Part, b.Task, b.Letter, b.Text]);
  const aws = wb.addWorksheet("Audio");
  aws.addRow(["Slot", "Label", "Hint", "Script"]);
  for (const a of audio) aws.addRow([a.Slot, a.Label, a.Hint, a.Script]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const mc = (extra = {}) => ({
  Part: "Reading", Task: "Task 1", Question: "2 + 2 = ?",
  "Option A": "3", "Option B": "4", "Option C": "5", "Correct Answer": "B", ...extra,
});

const messages = (r) => r.errors.map((e) => e.en);

describe("القالب الجاهز + round trip", () => {
  it("القالب بيتقري بنجاح وفيه مثال كامل (اختيار + ربط + صوت)", async () => {
    const r = await parsePlacementTestWorkbook(await buildSampleTemplate());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.stats).toEqual({ parts: 3, tasks: 5, questions: 11, matchingTasks: 1, audioSlots: 3 });
    expect(r.test.id).toBe("sample-b1");
    expect(r.test.levels.map((l) => l.code)).toEqual(["Pre-B1", "B1.1", "B1.2", "B1.3"]);
  });

  it("تصدير اختبار ثم قراءته بيرجّع نفس الهيكل ومفتاح الإجابات والصوتيات والسكريبتات", async () => {
    const r = await parsePlacementTestWorkbook(await testToXlsxBuffer(SAMPLE_TEST));
    expect(r.ok).toBe(true);
    expect(r.test.parts).toEqual(SAMPLE_TEST.parts);
    expect(r.test.answerKey).toEqual(SAMPLE_TEST.answerKey);
    expect(r.test.audioSlots).toEqual(SAMPLE_TEST.audioSlots);
    expect(r.test.scripts).toEqual(SAMPLE_TEST.scripts);
  });
});

describe("قراءة ملف بسيط", () => {
  it("fill-forward: Part و Task الفاضيين بياخدوا اللي فوقهم + ترقيم n عام و ln لكل جزء", async () => {
    const file = await makeFile({
      questions: [
        mc(),
        mc({ Part: undefined, Task: undefined, Question: "Capital of France?", "Option A": "Paris", "Option B": "Rome", "Option C": undefined, "Correct Answer": "A" }),
        mc({ Part: "Grammar", Task: "G1", Question: "He ___ home.", "Option A": "go", "Option B": "goes", "Option C": undefined, "Correct Answer": "goes" }),
      ],
    });
    const r = await parsePlacementTestWorkbook(file);
    expect(r.errors).toEqual([]);
    const [reading, grammar] = r.test.parts;
    expect(reading.tasks).toHaveLength(1);
    expect(reading.tasks[0].questions.map((q) => [q.n, q.ln])).toEqual([[1, 1], [2, 2]]);
    expect(reading.tasks[0].questions[1].o).toEqual(["Paris", "Rome"]);
    expect(grammar.tasks[0].questions[0]).toMatchObject({ n: 3, ln: 1, o: ["go", "goes"] });
    // الإجابة بنص الخيار نفسه اتحوّلت لـ index
    expect(r.test.answerKey).toEqual({ 1: { a: 1 }, 2: { a: 0 }, 3: { a: 1 } });
    expect(reading.minutes).toBe(30); // الافتراضي
  });

  it("الإجابة بحرف عربي أو رقم أو حرف صغير بتتقبل", async () => {
    const file = await makeFile({
      questions: [mc({ "Correct Answer": "ب" }), mc({ "Correct Answer": "c" }), mc({ "Correct Answer": 1 })],
    });
    const r = await parsePlacementTestWorkbook(file);
    expect(r.errors).toEqual([]);
    expect(Object.values(r.test.answerKey).map((k) => k.a)).toEqual([1, 2, 0]);
  });

  it("مهمة الربط: الخيارات حروف من Bank، والإجابة حرف من البنك", async () => {
    const file = await makeFile({
      questions: [
        { Part: "Reading", Task: "Match", "Task Instructions": "Match", Question: "Who likes music?", "Correct Answer": "B" },
        { Question: "Who has a dog?", "Correct Answer": "C" },
      ],
      bank: [
        { Part: "Reading", Task: "Match", Text: "Ad one" },
        { Text: "Ad two" },
        { Text: "Ad three" },
      ],
    });
    const r = await parsePlacementTestWorkbook(file);
    expect(r.errors).toEqual([]);
    const task = r.test.parts[0].tasks[0];
    expect(task.bank).toEqual([{ l: "A", t: "Ad one" }, { l: "B", t: "Ad two" }, { l: "C", t: "Ad three" }]);
    expect(task.questions.map((q) => q.o)).toEqual([["A", "B", "C"], ["A", "B", "C"]]);
    expect(r.stats.matchingTasks).toBe(1);
  });

  it("الصوت: Task Audio Slot لمهمة، Question Audio Slot لكل سؤال، وhint تلقائي بمكان الصوت", async () => {
    const file = await makeFile({
      questions: [
        mc({ Part: "Listening", Task: "T1", "Task Audio Slot": 1 }),
        mc({ Part: "Listening", Task: "T1", Question: "Second?" }),
        mc({ Part: "Listening", Task: "T2", "Question Audio Slot": 2 }),
        mc({ Part: "Listening", Task: "T2", "Question Audio Slot": 3, Question: "Third?" }),
      ],
      audio: [{ Slot: 1, Label: "At the shop", Script: "Hello there" }],
    });
    const r = await parsePlacementTestWorkbook(file);
    expect(r.errors).toEqual([]);
    expect(r.test.audioSlots).toEqual([
      { slot: 1, label: "At the shop", hint: "Listening › T1 (Q1–Q2)" },
      { slot: 2, label: "Audio 2", hint: "Listening › T2 › Q3" },
      { slot: 3, label: "Audio 3", hint: "Listening › T2 › Q4" },
    ]);
    expect(r.test.scripts).toEqual({ 1: "Hello there" });
  });

  it("slot معرّف في Audio ومش مستخدم بيتجاهل مع تحذير", async () => {
    const file = await makeFile({ questions: [mc()], audio: [{ Slot: 9, Label: "Unused" }] });
    const r = await parsePlacementTestWorkbook(file);
    expect(r.ok).toBe(true);
    expect(r.test.audioSlots).toEqual([]);
    expect(r.warnings.some((w) => /Audio slot 9/.test(w.en))).toBe(true);
  });

  it("حدود المستويات المخصصة بتتطبّق على جدول المستويات", async () => {
    const r = await parsePlacementTestWorkbook(await makeFile({ settings: { "Level thresholds": "30,50,70", "Level (CEFR)": "C1" }, questions: [mc()] }));
    expect(r.errors).toEqual([]);
    expect(r.test.levels.map((l) => [l.code, l.min, l.max])).toEqual([
      ["Pre-C1", 0, 29], ["C1.1", 30, 49], ["C1.2", 50, 69], ["C1.3", 70, 100],
    ]);
  });
});

describe("التحقق من الأخطاء", () => {
  it("ملف مش xlsx", async () => {
    const r = await parsePlacementTestWorkbook(Buffer.from("not an excel file"));
    expect(r.ok).toBe(false);
    expect(r.errors[0].sheet).toBe("File");
  });

  it("شيت ناقص", async () => {
    const r = await parsePlacementTestWorkbook(await makeFile({ skip: ["Settings"] }));
    expect(r.ok).toBe(false);
    expect(messages(r)).toContain('Sheet "Settings" is missing.');
  });

  it("إعدادات غلط: ID محجوز / مستوى غلط / عنوان ناقص / حدود غلط", async () => {
    const r = await parsePlacementTestWorkbook(
      await makeFile({ settings: { "Test ID": "A1", "Level (CEFR)": "Z9", "Test Title": "", "Level thresholds": "80,60,40" }, questions: [mc()] })
    );
    expect(r.ok).toBe(false);
    const m = messages(r).join(" | ");
    expect(m).toMatch(/reserved/);
    expect(m).toMatch(/Level \(CEFR\) must be/);
    expect(m).toMatch(/Test Title is required/);
    expect(m).toMatch(/Level thresholds/);
    expect(r.errors.every((e) => e.ar)).toBe(true); // كل خطأ ليه رسالة عربي
  });

  it("إجابة صحيحة خارج الخيارات / فاضية / خيارات فيها فجوة / خيار واحد", async () => {
    const r = await parsePlacementTestWorkbook(
      await makeFile({
        questions: [
          mc({ "Correct Answer": "E" }), // صف 2
          mc({ "Correct Answer": undefined }), // صف 3
          mc({ "Option B": undefined }), // صف 4: فجوة (A و C)
          mc({ "Option B": undefined, "Option C": undefined }), // صف 5: خيار واحد
        ],
      })
    );
    expect(r.ok).toBe(false);
    const rows = r.errors.map((e) => e.row);
    expect(rows).toEqual(expect.arrayContaining([2, 3, 4, 5]));
    expect(r.errors.find((e) => e.row === 4).en).toMatch(/without gaps/);
    expect(r.errors.find((e) => e.row === 5).en).toMatch(/at least 2 options/);
    expect(r.errors.every((e) => e.sheet === "Questions")).toBe(true);
  });

  it("مهمة فيها Task Audio و Question Audio مع بعض", async () => {
    const r = await parsePlacementTestWorkbook(
      await makeFile({ questions: [mc({ "Task Audio Slot": 1 }), mc({ "Question Audio Slot": 2 })] })
    );
    expect(r.ok).toBe(false);
    expect(messages(r).join()).toMatch(/both Task Audio Slot and Question Audio Slot/);
  });

  it("رقم صوت غلط / سؤال من غير نص / أول سؤال من غير Part", async () => {
    const r = await parsePlacementTestWorkbook(
      await makeFile({
        questions: [
          { Question: "Orphan", "Option A": "x", "Option B": "y", "Correct Answer": "A" }, // صف 2: من غير Part
          mc({ "Question Audio Slot": 99 }), // صف 3
          mc({ Question: undefined, "Option A": "x" }), // صف 4: من غير سؤال
        ],
      })
    );
    expect(r.ok).toBe(false);
    const m = messages(r).join(" | ");
    expect(m).toMatch(/Part is empty/);
    expect(m).toMatch(/Question Audio Slot must be/);
    expect(m).toMatch(/Question text is empty/);
  });

  it("بنك الربط: حروف غلط / نص واحد بس", async () => {
    const r = await parsePlacementTestWorkbook(
      await makeFile({
        questions: [{ Part: "R", Task: "M", Question: "q?", "Correct Answer": "A" }],
        bank: [{ Part: "R", Task: "M", Letter: "C", Text: "only one" }],
      })
    );
    expect(r.ok).toBe(false);
    const m = messages(r).join(" | ");
    expect(m).toMatch(/Letters must run A, B, C/);
    expect(m).toMatch(/at least 2 texts/);
  });

  it("بنك مش مربوط بمهمة بيطلع تحذير بس", async () => {
    const r = await parsePlacementTestWorkbook(
      await makeFile({ questions: [mc()], bank: [{ Part: "Zzz", Task: "Nope", Text: "x" }, { Text: "y" }] })
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.sheet === "Bank")).toBe(true);
  });

  it("مفيش أسئلة", async () => {
    const r = await parsePlacementTestWorkbook(await makeFile({ questions: [] }));
    expect(r.ok).toBe(false);
    expect(messages(r)).toContain("No questions found.");
  });
});

describe("الاختبار المقروء بيشتغل بنفس منطق A1/A2", () => {
  let test;
  beforeAll(async () => {
    test = (await parsePlacementTestWorkbook(await testToXlsxBuffer(SAMPLE_TEST))).test;
  });

  it("الأسئلة بتتخفي لحد ما الصوت يترفع (مهمة بصوت واحد + أسئلة بصوت لكل سؤال)", () => {
    expect(getVisibleQuestions({}, test).map((q) => q.n)).toEqual([1, 2, 3, 4, 5, 10, 11]); // قراءة + قواعد بس
    expect(getVisibleQuestions({ 1: "a.mp3" }, test).map((q) => q.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 10, 11]);
    expect(getVisibleQuestions({ 1: "a", 2: "b", 3: "c" }, test)).toHaveLength(11);
    const parts = getVisiblePartsFor(test, { 2: "b.mp3" });
    const listening = parts.find((p) => p.title === "Listening");
    expect(listening.tasks).toHaveLength(1);
    expect(listening.tasks[0].questions[0]).toMatchObject({ n: 8, audioSrc: "b.mp3" }); // مفيش مفتاح إجابات في الأسئلة
    expect(JSON.stringify(parts)).not.toContain("answerKey");
  });

  it("التصحيح: كله صح = 100 / المستوى حسب جدول الاختبار / الدرجة نسبة من الأسئلة الظاهرة", () => {
    const audio = { 1: "a", 2: "b", 3: "c" };
    const all = Object.fromEntries(Object.entries(test.answerKey).map(([n, k]) => [n, k.a]));
    const clean = sanitizeAnswers(all, audio, test);
    expect(Object.keys(clean)).toHaveLength(11);
    expect(scoreAnswers(clean, audio, test)).toMatchObject({ score: 100, rawScore: 11, rawMax: 11, level: "B1.3" });

    // نص الأسئلة صح (6 من 11 = 55%) → B1.1
    const half = Object.fromEntries(Object.entries(all).slice(0, 6));
    expect(scoreAnswers(half, audio, test)).toMatchObject({ score: 55, level: "B1.1" });

    // من غير أي صوت: الأسئلة الظاهرة 7 بس والدرجة نسبة منها
    const noAudioScore = scoreAnswers(sanitizeAnswers(all, {}, test), {}, test);
    expect(noAudioScore).toMatchObject({ rawMax: 7, rawScore: 7, score: 100 });
  });

  it("المراجعة: لقطة النتيجة + هيكل العرض (حتى مهمة الربط ببنكها)", () => {
    const audio = { 1: "a", 2: "b", 3: "c" };
    const answers = { 1: 1, 3: 0 }; // 1 صح، 3 غلط (الصح 1)
    const results = buildResults(answers, audio, test);
    expect(results).toHaveLength(11);
    expect(results.find((r) => r.n === 1)).toEqual({ n: 1, a: 1, c: 1 });
    expect(results.find((r) => r.n === 3)).toEqual({ n: 3, a: 0, c: 1 });
    const review = buildReview(results, test);
    const match = review[0].tasks.find((t) => t.bank);
    expect(match.bank).toHaveLength(4);
    expect(match.questions[0].options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
  });
});
