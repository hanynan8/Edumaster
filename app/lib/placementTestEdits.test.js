import { applyReviewEdits } from "@/app/lib/placementTestEdits";

function makeTest() {
  return {
    id: "t1",
    parts: [
      {
        id: "p1",
        title: "Reading",
        minutes: 20,
        tasks: [
          {
            title: "Task 1",
            questions: [
              { n: 1, ln: 1, q: "Capital of France?", ctx: "Geography", o: ["Paris", "Rome", "Madrid"] },
              { n: 2, ln: 2, q: "2 + 2 = ?", o: ["3", "4"] },
            ],
          },
          {
            title: "Task 2",
            bank: [{ l: "A", t: "text a" }, { l: "B", t: "text b" }, { l: "C", t: "text c" }],
            questions: [{ n: 3, ln: 1, q: "Who said it?", o: ["A", "B", "C"] }],
          },
        ],
      },
    ],
    answerKey: { 1: { a: 0 }, 2: { a: 1 }, 3: { a: 2 } },
  };
}

describe("applyReviewEdits", () => {
  it("بيطبّق تعديل النص والسياق والخيارات والإجابة الصحيحة", () => {
    const t = makeTest();
    const r = applyReviewEdits(t, { 1: { q: "  Capital of Spain? ", ctx: "", options: ["Paris", " Madrid ", "Rome", "Lisbon"], correct: 1 } });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(1);
    const q = t.parts[0].tasks[0].questions[0];
    expect(q.q).toBe("Capital of Spain?");
    expect(q.ctx).toBeUndefined();
    expect(q.o).toEqual(["Paris", "Madrid", "Rome", "Lisbon"]);
    expect(t.answerKey[1]).toEqual({ a: 1 });
    expect(t.answerKey[2]).toEqual({ a: 1 });
  });

  it("مهام الربط: الخيارات بتتجاهل والإجابة بتتغيّر ضمن الـ Bank", () => {
    const t = makeTest();
    const r = applyReviewEdits(t, { 3: { q: "Who wrote it?", options: ["X", "Y"], correct: 0 } });
    expect(r.ok).toBe(true);
    expect(t.parts[0].tasks[1].questions[0].o).toEqual(["A", "B", "C"]);
    expect(t.parts[0].tasks[1].questions[0].q).toBe("Who wrote it?");
    expect(t.answerKey[3]).toEqual({ a: 0 });
  });

  it("تعديل مطابق للأصل مبيتحسبش", () => {
    const t = makeTest();
    const r = applyReviewEdits(t, { 2: { q: "2 + 2 = ?", options: ["3", "4"], correct: 1 } });
    expect(r).toMatchObject({ ok: true, count: 0 });
  });

  it("أي خطأ بيمنع تطبيق كل التعديلات (مفيش تطبيق جزئي)", () => {
    const t = makeTest();
    const r = applyReviewEdits(t, {
      1: { q: "Changed" },
      2: { options: ["only one"], correct: 0 },
      9: { q: "ghost" },
      3: { correct: 7 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(3);
    expect(t.parts[0].tasks[0].questions[0].q).toBe("Capital of France?");
    expect(t.answerKey[1]).toEqual({ a: 0 });
  });

  it("بيرفض نص فاضي وإجابة برا الخيارات وخيار فاضي", () => {
    for (const bad of [{ q: "   " }, { correct: 5 }, { options: ["A", ""], correct: 0 }, { correct: null }]) {
      const t = makeTest();
      expect(applyReviewEdits(t, { 1: bad }).ok).toBe(false);
    }
  });

  it("لو الخيارات قلّت والإجابة القديمة بقت خارج النطاق → خطأ", () => {
    const t = makeTest();
    t.answerKey[1] = { a: 2 };
    expect(applyReviewEdits(t, { 1: { options: ["Paris", "Rome"] } }).ok).toBe(false);
  });

  it("من غير تعديلات → ok", () => {
    expect(applyReviewEdits(makeTest(), undefined)).toMatchObject({ ok: true, count: 0 });
    expect(applyReviewEdits(makeTest(), {})).toMatchObject({ ok: true, count: 0 });
    expect(applyReviewEdits(makeTest(), [])).toMatchObject({ ok: false });
  });
});
