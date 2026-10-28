import { testToEditable, buildTestFromEditable, listQuestionNs, nextQuestionNumber } from "@/app/lib/placementTestEditor";

// اختبار صغير زي اللي في الداتابيز: Listening (مهمة بصوت واحد) + Reading (اختيار + ربط)
function makeTest() {
  return {
    id: "t1",
    label: "B2",
    title: "Prueba B2",
    subject: "es",
    thresholds: [40, 60, 80],
    parts: [
      {
        id: "part-1",
        title: "Listening",
        minutes: 20,
        tasks: [
          {
            title: "Tarea 1",
            audioSlot: 1,
            questions: [
              { n: 1, ln: 1, q: "Q one", o: ["a", "b", "c"] },
              { n: 2, ln: 2, q: "Q two", o: ["a", "b"] },
            ],
          },
        ],
      },
      {
        id: "part-2",
        title: "Reading",
        minutes: 30,
        tasks: [
          {
            title: "Tarea 2",
            questions: [{ n: 3, ln: 1, q: "Q three", ctx: "ctx", o: ["x", "y", "z"] }],
          },
          {
            title: "Tarea 3",
            bank: [
              { l: "A", t: "text a" },
              { l: "B", t: "text b" },
            ],
            questions: [{ n: 4, ln: 2, q: "Who?", o: ["A", "B"] }],
          },
        ],
      },
    ],
    answerKey: { 1: { a: 2 }, 2: { a: 0 }, 3: { a: 1 }, 4: { a: 1 } },
    audioSlots: [{ slot: 1, label: "Audio 1", hint: "x" }],
    scripts: { 1: "hello script" },
  };
}

const ctx = (t) => ({ allowedNs: listQuestionNs(t), nextN: nextQuestionNumber(t) });

describe("testToEditable", () => {
  it("بيحوّل الاختبار لـ payload فيه الإجابات والصوت ونص التسجيل", () => {
    const e = testToEditable(makeTest());
    expect(e.parts[0].tasks[0].audioSlot).toBe(1);
    expect(e.parts[0].tasks[0].questions[0]).toMatchObject({ n: 1, correct: 2, options: ["a", "b", "c"], audioSlot: null });
    expect(e.parts[1].tasks[1].bank).toEqual([{ t: "text a" }, { t: "text b" }]);
    expect(e.parts[1].tasks[1].questions[0].options).toEqual([]);
    expect(e.audio).toEqual([{ slot: 1, label: "Audio 1", script: "hello script" }]);
  });

  it("round-trip من غير أي تعديل بيرجّع نفس الاختبار", () => {
    const t = makeTest();
    const r = buildTestFromEditable(testToEditable(t), ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.parts.map((p) => p.tasks.map((k) => k.questions.map((q) => q.n)))).toEqual([[[1, 2]], [[3], [4]]]);
    expect(r.test.answerKey).toEqual(t.answerKey);
    expect(r.test.parts[1].tasks[1].bank).toEqual(t.parts[1].tasks[1].bank);
    expect(r.test.audioSlots).toMatchObject([{ slot: 1, label: "Audio 1" }]);
    expect(r.test.scripts).toEqual({ 1: "hello script" });
  });
});

describe("buildTestFromEditable — مرونة الهيكل", () => {
  it("إضافة سؤال جديد بياخد رقم جديد ومبيغيّرش أرقام الأسئلة القديمة", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].questions.unshift({ q: "New first", ctx: "", options: ["p", "q"], correct: 1, audioSlot: null });
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    const qs = r.test.parts[0].tasks[0].questions;
    expect(qs.map((q) => q.n)).toEqual([5, 1, 2]); // الجديد 5 (آخر رقم 4 + 1)
    expect(qs.map((q) => q.ln)).toEqual([1, 2, 3]); // رقم العرض بيتحسب بالترتيب
    expect(r.test.answerKey[5]).toEqual({ a: 1 });
    expect(r.test.answerKey[1]).toEqual({ a: 2 }); // القديم لسه بإجابته
    expect(r.test.nextN).toBe(6);
  });

  it("رقم سؤال اتحذف ما بيتعاد استخدامه (nextN المخزّن)", () => {
    const t = { ...makeTest(), nextN: 10 };
    const e = testToEditable(t);
    e.parts[1].tasks[1].questions = []; // مهمة الربط من غير أسئلة → خطأ
    expect(buildTestFromEditable(e, ctx(t)).ok).toBe(false);
    const e2 = testToEditable(t);
    e2.parts[1].tasks[0].questions.push({ q: "extra", ctx: "", options: ["1", "2"], correct: 0, audioSlot: null });
    const r = buildTestFromEditable(e2, ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.parts[1].tasks[0].questions.at(-1).n).toBe(10);
  });

  it("حذف سؤال/مهمة + إعادة ترتيب الأجزاء", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].questions.splice(0, 1); // حذف Q1
    e.parts.reverse();
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.parts.map((p) => p.title)).toEqual(["Reading", "Listening"]);
    expect(r.test.parts.map((p) => p.id)).toEqual(["part-1", "part-2"]);
    expect(r.test.answerKey[1]).toBeUndefined();
    expect(r.test.parts[1].tasks[0].questions).toMatchObject([{ n: 2, ln: 1 }]);
  });

  it("نقل سؤال لمهمة تانية بيحتفظ برقمه وإجابته", () => {
    const t = makeTest();
    const e = testToEditable(t);
    const [moved] = e.parts[0].tasks[0].questions.splice(1, 1); // Q2
    e.parts[1].tasks[0].questions.push(moved);
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.parts[1].tasks[0].questions.map((q) => [q.n, q.ln])).toEqual([[3, 1], [2, 2]]);
    expect(r.test.answerKey[2]).toEqual({ a: 0 });
  });

  it("تحويل مهمة لربط (matching) وتعديل البنك والإجابة", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[1].tasks[0].bank = [{ t: "one" }, { t: "two" }, { t: "three" }];
    e.parts[1].tasks[0].questions[0].correct = 2;
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    const task = r.test.parts[1].tasks[0];
    expect(task.bank).toEqual([{ l: "A", t: "one" }, { l: "B", t: "two" }, { l: "C", t: "three" }]);
    expect(task.questions[0].o).toEqual(["A", "B", "C"]);
    expect(r.test.answerKey[3]).toEqual({ a: 2 });
  });

  it("renumber: الأسئلة بتتـرقّم من 1 بالترتيب (اختبار جديد من ملف)", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].questions.splice(0, 1);
    const r = buildTestFromEditable(e, { renumber: true });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.test.answerKey)).toEqual(["1", "2", "3"]);
    expect(r.test.nextN).toBe(4);
  });
});

describe("buildTestFromEditable — أماكن الأوديو", () => {
  it("تغيير مكان التسجيل: من المهمة لمهمة تانية + تحديث الـ hint", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].audioSlot = null;
    e.parts[1].tasks[0].audioSlot = 1;
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.parts[0].tasks[0].audioSlot).toBeUndefined();
    expect(r.test.parts[1].tasks[0].audioSlot).toBe(1);
    expect(r.test.audioSlots).toEqual([{ slot: 1, label: "Audio 1", hint: "Reading › Tarea 2 (Q1)" }]);
    expect(r.test.scripts[1]).toBe("hello script");
  });

  it("تسجيل لكل سؤال + خانة جديدة بتاخد اسم افتراضي", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].audioSlot = null;
    e.parts[0].tasks[0].questions[0].audioSlot = 1;
    e.parts[0].tasks[0].questions[1].audioSlot = 7;
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.parts[0].tasks[0].questions.map((q) => q.audioSlot)).toEqual([1, 7]);
    expect(r.test.audioSlots.map((a) => [a.slot, a.label])).toEqual([[1, "Audio 1"], [7, "Audio 7"]]);
  });

  it("تسجيل للمهمة + تسجيل لسؤال في نفس المهمة = خطأ", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].questions[0].audioSlot = 2;
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(false);
    expect(r.errors[0].en).toMatch(/not both/);
  });

  it("تسجيل مفصول عن أي مكان بيفضل في المكتبة (مع تحذير) — مش بيتشال", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].audioSlot = null; // فصل التسجيل 1 عن المهمة
    e.audio.push({ slot: 9, label: "spare", script: "x" });
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.audioSlots.map((a) => [a.slot, a.label])).toEqual([[1, "Audio 1"], [9, "spare"]]);
    expect(r.test.audioSlots[0].hint).toBe("Not used by any task yet");
    expect(r.test.scripts).toEqual({ 1: "hello script", 9: "x" });
    expect(r.warnings.filter((w) => /not played/.test(w.en))).toHaveLength(2);
  });

  it("حذف تسجيل من المكتبة (مش مربوط بمكان) بيشيله فعلًا", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].audioSlot = null;
    e.audio = []; // الأدمن حذف التسجيل
    const r = buildTestFromEditable(e, ctx(t));
    expect(r.ok).toBe(true);
    expect(r.test.audioSlots).toEqual([]);
    expect(r.test.scripts).toEqual({});
  });

  it("رقم خانة صوت غلط = خطأ", () => {
    const t = makeTest();
    const e = testToEditable(t);
    e.parts[0].tasks[0].audioSlot = 99;
    expect(buildTestFromEditable(e, ctx(t)).ok).toBe(false);
  });
});

describe("buildTestFromEditable — التحقق", () => {
  const bad = (mut) => {
    const t = makeTest();
    const e = testToEditable(t);
    mut(e);
    return buildTestFromEditable(e, ctx(t));
  };

  it("أخطاء الإعدادات", () => {
    expect(bad((e) => (e.label = "Z9")).ok).toBe(false);
    expect(bad((e) => (e.title = "  ")).ok).toBe(false);
    expect(bad((e) => (e.subject = "xx")).ok).toBe(false);
    expect(bad((e) => (e.thresholds = [60, 40, 80])).ok).toBe(false);
    expect(bad((e) => (e.thresholds = ["30", "50", "70"])).ok).toBe(true);
  });

  it("إجابة صحيحة مش من الخيارات / خيارات ناقصة / فاضية", () => {
    expect(bad((e) => (e.parts[0].tasks[0].questions[0].correct = 3)).ok).toBe(false);
    expect(bad((e) => (e.parts[0].tasks[0].questions[0].correct = null)).ok).toBe(false);
    expect(bad((e) => (e.parts[0].tasks[0].questions[1].options = ["only"])).ok).toBe(false);
    expect(bad((e) => (e.parts[0].tasks[0].questions[0].options[1] = " ")).ok).toBe(false);
    expect(bad((e) => (e.parts[0].tasks[0].questions[0].options = ["1", "2", "3", "4", "5", "6", "7"])).ok).toBe(false);
  });

  it("بنك الربط: أقل من نصّين / إجابة برا البنك", () => {
    expect(bad((e) => (e.parts[1].tasks[1].bank = [{ t: "only" }])).ok).toBe(false);
    expect(bad((e) => (e.parts[1].tasks[1].questions[0].correct = 2)).ok).toBe(false);
  });

  it("جزء/مهمة من غير أسئلة أو عنوان", () => {
    expect(bad((e) => (e.parts[0].tasks = [])).ok).toBe(false);
    expect(bad((e) => (e.parts[0].title = "")).ok).toBe(false);
    expect(bad((e) => (e.parts[0].tasks[0].title = "")).ok).toBe(false);
    expect(bad((e) => (e.parts = [])).ok).toBe(false);
  });

  it("رقم سؤال مش معروف أو مكرر", () => {
    expect(bad((e) => (e.parts[0].tasks[0].questions[0].n = 99)).ok).toBe(false);
    expect(bad((e) => (e.parts[0].tasks[0].questions[1].n = 1)).ok).toBe(false);
  });

  it("رسالة الخطأ فيها مكان السؤال بالعربي والإنجليزي", () => {
    const r = bad((e) => (e.parts[1].tasks[0].questions[0].q = ""));
    expect(r.errors[0].en).toBe("Part 2 › Task 1 › Q1: question text is empty.");
    expect(r.errors[0].ar).toContain("نص السؤال فاضي");
  });

  it("رقم السؤال في رسالة الخطأ = رقم العرض للطالب (بيكمّل عدّ المهام اللي قبله في نفس الجزء)", () => {
    const r = bad((e) => (e.parts[1].tasks[1].questions[0].q = ""));
    expect(r.errors[0].where).toBe("Part 2 › Task 2 › Q2"); // Tarea 3 سؤالها ln=2 (بعد سؤال Tarea 2)
  });

  it("payload غلط خالص ما بيكسرش", () => {
    expect(buildTestFromEditable(null).ok).toBe(false);
    expect(buildTestFromEditable("x").ok).toBe(false);
    expect(buildTestFromEditable({ label: "B1", title: "t", parts: [null] }).ok).toBe(false);
  });
});
