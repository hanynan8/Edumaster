// app/lib/placementReview.test.js
//
// اختبارات مراجعة اختبار تحديد المستوى (إجابات الطالب مع التصحيح):
//   - لقطة النتيجة (buildResults) للأسئلة الظاهرة بس + النتايج القديمة (legacyResults).
//   - هيكل المراجعة (buildReview): صح/غلط/بدون إجابة وأسئلة الربط.
//   - إيميل النتيجة: لغة/اتجاه، الإجابات والتصحيح، وهروب HTML.

import {
  buildResults,
  legacyResults,
  resultsFromDoc,
  buildReview,
  reviewFromDoc,
  buildPlacementResultEmail,
} from "@/app/lib/placementReview";
import { ANSWER_KEY } from "@/app/lib/spanishPlacementTestKey";

const ALL_AUDIO = { 1: "a.mp3", 2: "b.mp3", 3: "c.mp3", 4: "d.mp3" };
const flat = (review) => review.flatMap((p) => p.tasks.flatMap((t) => t.questions));

describe("buildResults", () => {
  it("مهام الاستماع من غير صوت مرفوع بتتخفي، ومعاه الاختبار 100 سؤال", () => {
    expect(buildResults({}, {}).length).toBeLessThan(100);
    expect(buildResults({}, ALL_AUDIO)).toHaveLength(100);
  });

  it("بيسجّل إجابة الطالب (أو null) والإجابة الصحيحة من المفتاح", () => {
    const r = buildResults({ 1: 0 }, {});
    expect(r.find((x) => x.n === 1)).toEqual({ n: 1, a: 0, c: ANSWER_KEY[1].a });
    expect(r.find((x) => x.n === 2).a).toBeNull();
  });
});

describe("buildReview", () => {
  it("كل الإجابات صح → كل الأسئلة isCorrect", () => {
    const answers = Object.fromEntries(Object.entries(ANSWER_KEY).map(([n, k]) => [n, k.a]));
    const qs = flat(buildReview(buildResults(answers, ALL_AUDIO)));
    expect(qs).toHaveLength(100);
    expect(qs.every((q) => q.isCorrect)).toBe(true);
  });

  it("بيفرّق بين صح وغلط وبدون إجابة", () => {
    const wrong = (ANSWER_KEY[2].a + 1) % 3;
    const qs = flat(buildReview(buildResults({ 1: ANSWER_KEY[1].a, 2: wrong }, {})));
    expect(qs.find((q) => q.n === 1).isCorrect).toBe(true);
    const q2 = qs.find((q) => q.n === 2);
    expect(q2).toMatchObject({ isCorrect: false, yourIndex: wrong, correctIndex: ANSWER_KEY[2].a });
    expect(qs.find((q) => q.n === 3)).toMatchObject({ yourIndex: null, isCorrect: false });
  });

  it("أسئلة الربط: الخيارات حروف والنصوص في task.bank", () => {
    const review = buildReview(buildResults({ 6: ANSWER_KEY[6].a }, {}));
    const task = review.flatMap((p) => p.tasks).find((t) => t.questions.some((q) => q.n === 6));
    expect(task.bank.length).toBeGreaterThan(0);
    const q6 = task.questions.find((q) => q.n === 6);
    expect(q6.options[0]).toEqual({ label: "A", text: "" });
    expect(q6.isCorrect).toBe(true);
  });

  it("بيشيل الأسئلة اللي مش في اللقطة (مهام استماع مخفية)", () => {
    const qs = flat(buildReview(buildResults({}, {})));
    expect(qs.length).toBeLessThan(100);
  });
});

describe("النتايج القديمة", () => {
  it("legacyResults: مهمة استماع ظاهرة بس لو الطالب جاوب على سؤال منها", () => {
    const withoutListening = legacyResults({ 1: 0 });
    const withListening = legacyResults({ 1: 0, 6: 0, 26: 0 });
    expect(withListening.length).toBeGreaterThanOrEqual(withoutListening.length);
  });

  it("resultsFromDoc بيفضّل اللقطة المخزّنة، وإلا بيبنيها من answers", () => {
    const stored = [{ n: 1, a: 2, c: 1 }];
    expect(resultsFromDoc({ results: stored, answers: { 1: 0 } })).toBe(stored);
    expect(resultsFromDoc({ answers: { 1: 0 } }).find((r) => r.n === 1)).toEqual({ n: 1, a: 0, c: ANSWER_KEY[1].a });
    expect(flat(reviewFromDoc({ results: stored }))).toHaveLength(1);
  });
});

describe("buildPlacementResultEmail", () => {
  const review = [
    {
      id: "p",
      title: "Parte <1>",
      tasks: [
        {
          title: "Tarea 1",
          intro: "",
          passage: "",
          bank: null,
          questions: [
            {
              n: 1, ln: 1, q: "Pablo da su <b>teléfono</b> & más", ctx: "", yourIndex: 0, correctIndex: 1, isCorrect: false,
              options: [{ label: "a", text: "dirección." }, { label: "b", text: "teléfono." }],
            },
            {
              n: 2, ln: 2, q: "Cuesta...", ctx: "", yourIndex: 0, correctIndex: 0, isCorrect: true,
              options: [{ label: "a", text: "12 euros." }, { label: "b", text: "2 euros." }],
            },
            {
              n: 3, ln: 3, q: "Sin respuesta", ctx: "", yourIndex: null, correctIndex: 1, isCorrect: false,
              options: [{ label: "a", text: "x" }, { label: "b", text: "y" }],
            },
          ],
        },
      ],
    },
  ];

  it("عربي: rtl + الدرجة في الموضوع + الإجابات والتصحيح بالعربي", () => {
    const m = buildPlacementResultEmail({ name: "منى", language: "ar", score: 72, maxScore: 100, level: "A1.2", review });
    expect(m.dir).toBe("rtl");
    expect(m.lang).toBe("ar");
    expect(m.subject).toContain("72/100");
    expect(m.bodyHtml).toContain("إجابتك");
    expect(m.bodyHtml).toContain("الإجابة الصحيحة");
    expect(m.bodyHtml).toContain("b) teléfono.");
  });

  it("الإجابة الصحيحة مبتتكررش للسؤال الصح، وبيحسب صحيحة/خاطئة/بدون إجابة", () => {
    const m = buildPlacementResultEmail({ name: "Mona", language: "en", score: 33, maxScore: 100, level: "Pre-A1", review });
    expect(m.dir).toBe("ltr");
    // سؤالين مش صح (غلط + بدون إجابة) → سطرين "Correct answer" بس
    expect(m.bodyHtml.match(/Correct answer:/g)).toHaveLength(2);
    expect(m.bodyHtml).toContain("Not answered");
    expect(m.bodyHtml).toMatch(/<strong[^>]*>1<\/strong> Correct/);
  });

  it("بيهرّب HTML في نصوص الأسئلة والاسم", () => {
    const m = buildPlacementResultEmail({ name: "<img src=x>", language: "es", score: 1, maxScore: 100, level: "Pre-A1", review });
    expect(m.bodyHtml).not.toContain("<img");
    expect(m.bodyHtml).not.toContain("<b>teléfono</b>");
    expect(m.bodyHtml).toContain("&lt;b&gt;teléfono&lt;/b&gt; &amp; más");
  });
});
