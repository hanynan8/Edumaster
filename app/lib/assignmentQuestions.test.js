// app/lib/assignmentQuestions.test.js
//
// 🆕 أسئلة الواجب التفاعلية: التحقق من المدخلات + التصحيح التلقائي + مقياس الدرجة.

const mongoose = require("mongoose");
const {
  sanitizeAssignmentQuestions,
  serializeAssignmentQuestions,
  gradeAssignmentQuestions,
  scaleToMaxScore,
  MAX_ASSIGNMENT_QUESTIONS,
} = require("./assignmentQuestions");

const mc = (over = {}) => ({
  type: "multiple_choice",
  text: "ما عاصمة مصر؟",
  options: [
    { text: "القاهرة", isCorrect: true },
    { text: "الإسكندرية", isCorrect: false },
  ],
  points: 2,
  ...over,
});
const tf = (over = {}) => ({
  type: "true_false",
  text: "الشمس نجم",
  options: [
    { text: "صح", isCorrect: true },
    { text: "غلط", isCorrect: false },
  ],
  ...over,
});

describe("sanitizeAssignmentQuestions", () => {
  it("مفيش أسئلة → قايمة فاضية (المنطق القديم للواجب)", () => {
    expect(sanitizeAssignmentQuestions(undefined)).toEqual({ ok: true, questions: [] });
    expect(sanitizeAssignmentQuestions([])).toEqual({ ok: true, questions: [] });
  });

  it("سؤال صالح بيتنضّف والدرجة الافتراضية 1", () => {
    const r = sanitizeAssignmentQuestions([tf({ text: "  الشمس نجم  " })]);
    expect(r.ok).toBe(true);
    expect(r.questions[0]).toMatchObject({ type: "true_false", text: "الشمس نجم", points: 1 });
  });

  it("المقالي مش مدعوم في الواجب", () => {
    expect(sanitizeAssignmentQuestions([{ type: "essay", text: "اشرح" }])).toEqual({
      ok: false,
      error: "invalid_type",
      index: 0,
    });
  });

  it("بيرفض: نص فاضي / مفيش إجابة صح / أكتر من إجابة صح في الاختيار من متعدد", () => {
    expect(sanitizeAssignmentQuestions([mc({ text: " " })]).error).toBe("missing_text");
    expect(
      sanitizeAssignmentQuestions([mc({ options: [{ text: "أ", isCorrect: false }, { text: "ب", isCorrect: false }] })]).error
    ).toBe("no_correct_option");
    expect(
      sanitizeAssignmentQuestions([mc({ options: [{ text: "أ", isCorrect: true }, { text: "ب", isCorrect: true }] })]).error
    ).toBe("multiple_correct_answers");
  });

  it("بيرجّع index السؤال اللي فيه المشكلة", () => {
    expect(sanitizeAssignmentQuestions([mc(), mc({ text: "" })])).toMatchObject({ ok: false, index: 1 });
  });

  it("بيحافظ على id السؤال الصالح فقط", () => {
    const id = new mongoose.Types.ObjectId().toString();
    const r = sanitizeAssignmentQuestions([mc({ id }), mc({ id: "not-an-id" })]);
    expect(r.questions[0]._id).toBe(id);
    expect(r.questions[1]._id).toBeUndefined();
  });

  it("حد أقصى لعدد الأسئلة", () => {
    const many = Array.from({ length: MAX_ASSIGNMENT_QUESTIONS + 1 }, () => tf());
    expect(sanitizeAssignmentQuestions(many).error).toBe("too_many_questions");
  });
});

describe("serializeAssignmentQuestions", () => {
  const stored = [{ _id: new mongoose.Types.ObjectId(), ...mc() }];

  it("🔒 للطالب قبل التسليم: من غير isCorrect", () => {
    const [q] = serializeAssignmentQuestions(stored);
    expect(q.options).toEqual([
      { index: 0, text: "القاهرة" },
      { index: 1, text: "الإسكندرية" },
    ]);
    expect(JSON.stringify(q)).not.toContain("isCorrect");
  });

  it("للمدرّس / بعد التسليم: مع isCorrect", () => {
    const [q] = serializeAssignmentQuestions(stored, { revealAnswers: true });
    expect(q.options[0].isCorrect).toBe(true);
    expect(q.options[1].isCorrect).toBe(false);
  });
});

describe("gradeAssignmentQuestions", () => {
  const q1 = { _id: new mongoose.Types.ObjectId(), ...mc({ points: 2 }) };
  const q2 = { _id: new mongoose.Types.ObjectId(), ...tf({ points: 1 }) };

  it("كله صح = 100%", () => {
    const r = gradeAssignmentQuestions(
      [q1, q2],
      [
        { question: q1._id.toString(), selectedOptionIndex: 0 },
        { question: q2._id.toString(), selectedOptionIndex: 0 },
      ]
    );
    expect(r).toMatchObject({ earnedPoints: 3, totalPoints: 3, scorePercent: 100 });
  });

  it("إجابة غلط + سؤال متسيّب فاضي + index خارج النطاق = صفر", () => {
    const r = gradeAssignmentQuestions([q1, q2], [{ question: q1._id.toString(), selectedOptionIndex: 99 }]);
    expect(r.earnedPoints).toBe(0);
    expect(r.answers.map((a) => a.selectedOptionIndex)).toEqual([null, null]);
    expect(r.scorePercent).toBe(0);
  });

  it("درجة جزئية بالنقاط", () => {
    const r = gradeAssignmentQuestions(
      [q1, q2],
      [
        { question: q1._id.toString(), selectedOptionIndex: 0 },
        { question: q2._id.toString(), selectedOptionIndex: 1 },
      ]
    );
    expect(r).toMatchObject({ earnedPoints: 2, totalPoints: 3, scorePercent: 67 });
  });

  it("الطالب مقدرش يفرض isCorrect/points من عنده", () => {
    const r = gradeAssignmentQuestions(
      [q1],
      [{ question: q1._id.toString(), selectedOptionIndex: 1, isCorrect: true, pointsEarned: 999 }]
    );
    expect(r.answers[0]).toMatchObject({ isCorrect: false, pointsEarned: 0 });
  });
});

describe("scaleToMaxScore", () => {
  it("بيحوّل لمقياس الدرجة الكاملة", () => {
    expect(scaleToMaxScore(2, 3, 100)).toBe(66.67);
    expect(scaleToMaxScore(3, 3, 20)).toBe(20);
    expect(scaleToMaxScore(0, 0, 100)).toBe(0);
  });
});
