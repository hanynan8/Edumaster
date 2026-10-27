// app/lib/quizImportParity.test.js
//
// 🔒 تطابق الاستيراد من PDF مع الإضافة اليدوية.
//
// الهدف: أي سؤال يتضاف عن طريق "استيراد من PDF" لازم يتخزّن ويتعرض ويتصحّح *بنفس
// شكل ومنطق* السؤال اللي بيتضاف يدوي من الفورم (QuestionFormModal →
// POST /api/quizzes/[id]/questions). الاختبار بيبعت نفس السؤال للمسارين، ويقارن:
//   1) الـ document اللي اتبعت لـ Question (الحقول + القيم + الترتيب)
//   2) رد الـ API (serializeQuestion) اللي واجهة المدرّس بتعرضه
//   3) التصحيح: نفس الاختيار الصح بيتحسب صح في الحالتين (منطق attempt)
// وبعدين بيتأكد إن الاستيراد بيرفض الحالات اللي الفورم اليدوي مستحيل ينتجها.
//
// ملحوظة: pdf-parse بيتعمله mock ويتدّيله النص مباشرةً — لأن pdf.js القديم اللي جواه
// بيقرأ ملفات الـ PDF الصناعية (اللي pdf-lib بيطلّعها في الاختبارات) بشكل غير ثابت
// حسب حجم الملف. خطوة استخراج النص نفسها مش متغيّرة؛ اللي بنختبره هنا هو كل اللي بعدها.

const mockSession = { user: { id: "teacher1", role: "teacher" } };
const mockQuiz = { _id: "64b000000000000000000001", course: "64b000000000000000000002" };
const mockCourse = { _id: mockQuiz.course, teacher: "teacher1" };

let mockPdfText = "";
const mockCreate = jest.fn();
const mockInsertMany = jest.fn();
const mockCount = jest.fn();

jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/rbac", () => ({
  requireSession: jest.fn(async () => ({ session: mockSession })),
  isOwnerOrStaff: jest.fn((session, ownerId) => String(session.user.id) === String(ownerId)),
}));
jest.mock("pdf-parse/lib/pdf-parse.js", () => ({
  __esModule: true,
  default: async () => ({ text: mockPdfText }),
}));
jest.mock("@/app/lib/models", () => ({
  getQuizModel: () => ({ findById: jest.fn(async () => mockQuiz) }),
  getCourseModel: () => ({ findById: jest.fn(async () => mockCourse) }),
  getQuestionModel: () => ({
    countDocuments: (...a) => mockCount(...a),
    create: (...a) => mockCreate(...a),
    insertMany: (...a) => mockInsertMany(...a),
  }),
}));


const QUIZ_ID = mockQuiz._id;
const params = { params: Promise.resolve({ id: QUIZ_ID }) };

// Mongoose بيضيف _id وtimestamps — بنحاكيهم عشان serializeQuestion يشتغل
let idSeq = 0;
const asDoc = (d) => ({ _id: { toString: () => `q${++idSeq}` }, ...d });

let manualPOST;
let importPOST;
beforeAll(async () => {
  ({ POST: manualPOST } = await import("@/app/api/quizzes/[id]/questions/route.js"));
  ({ POST: importPOST } = await import("@/app/api/quizzes/[id]/questions/import-pdf/route.js"));
});

beforeEach(() => {
  idSeq = 0;
  mockCount.mockResolvedValue(3); // الكويز فيه 3 أسئلة قبل الإضافة
  mockCreate.mockImplementation(async (d) => asDoc(d));
  mockInsertMany.mockImplementation(async (docs) => docs.map(asDoc));
});

// ---- مسار يدوي: نفس payload الفورم (QuestionFormModal.handleSubmit) بالظبط ----
async function addManually({ type, text, points = 1, options }) {
  const res = await manualPOST(
    new Request("http://x", {
      method: "POST",
      body: JSON.stringify({
        type,
        text: text.trim(),
        points: Number(points) || 1,
        options: options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
        mediaUrl: "",
        mediaType: null,
      }),
    }),
    params
  );
  expect(res.status).toBe(201);
  return { stored: mockCreate.mock.calls.at(-1)[0], response: await res.json() };
}

// ---- مسار الاستيراد: نص الـ PDF بيتدّاله مباشرةً (pdf-parse متعمله mock) ----
async function importPdf(lines, fields = {}) {
  mockPdfText = Array.isArray(lines) ? lines.join("\n") : lines;
  const form = new FormData();
  form.append("file", new File([Buffer.from("%PDF-1.4 fake")], "q.pdf", { type: "application/pdf" }));
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return importPOST(new Request("http://x", { method: "POST", body: form }), params);
}

async function addByImport(lines, fields) {
  const res = await importPdf(lines, fields);
  const body = await res.json();
  expect(res.status).toBe(201);
  expect(body.skippedCount).toBe(0);
  return { stored: mockInsertMany.mock.calls.at(-1)[0], response: body.imported };
}

// نفس منطق التصحيح في attempt/route.js
const gradeChoice = (q, idx) => idx >= 0 && idx < q.options.length && Boolean(q.options[idx].isCorrect);
const withoutId = ({ id, ...rest }) => rest;

describe("تطابق السؤال المستورد مع السؤال اليدوي", () => {
  it("اختيار من متعدد: نفس الـ document ونفس الرد ونفس التصحيح", async () => {
    const q = {
      type: "multiple_choice",
      text: "What is the capital of Egypt?",
      points: 2,
      options: [
        { text: "Alexandria", isCorrect: false },
        { text: "Cairo", isCorrect: true },
        { text: "Luxor", isCorrect: false },
        { text: "Aswan", isCorrect: false },
      ],
    };
    const manual = await addManually(q);
    const imported = await addByImport([
      "Question 1: What is the capital of Egypt?",
      "A) Alexandria",
      "B) Cairo",
      "C) Luxor",
      "D) Aswan",
      "Answer: B",
      "Points: 2",
    ]);

    // 1) اللي اتخزّن: نفس الحقول بنفس القيم (ما عدا quiz id نفسه ورقم الترتيب، دول متطابقين برضه)
    expect(imported.stored).toHaveLength(1);
    expect(imported.stored[0]).toEqual(manual.stored);
    expect(Object.keys(imported.stored[0]).sort()).toEqual(Object.keys(manual.stored).sort());
    // 2) اللي واجهة المدرّس بتستلمه
    expect(withoutId(imported.response[0])).toEqual(withoutId(manual.response));
    // 3) التصحيح
    for (let i = 0; i < 4; i++) {
      expect(gradeChoice(imported.stored[0], i)).toBe(gradeChoice(manual.stored, i));
    }
  });

  it("صح/خطأ (إنجليزي): نفس الـ document بنفس ترتيب الخيارات", async () => {
    const manual = await addManually({
      type: "true_false",
      text: "The earth is flat.",
      options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ],
    });
    const imported = await addByImport(["Question 1: The earth is flat.", "Answer: False"]);
    expect(imported.stored[0]).toEqual(manual.stored);
    expect(withoutId(imported.response[0])).toEqual(withoutId(manual.response));
  });

  it("صح/خطأ (عربي) + رموز الاتجاه اللي Word بيحطها: نص الخيارات 'صح' و 'خطأ' زي الفورم", async () => {
    const imported = await addByImport(
      "\u200Fنوع الأسئلة: صح وغلط\n\u200Fس1: \u202Bالقاهرة هي عاصمة مصر\u202C\nالإجابة: غلط\nالدرجة: 3\n"
    );
    const manual = await addManually({
      type: "true_false",
      text: "القاهرة هي عاصمة مصر",
      points: 3,
      options: [
        { text: "صح", isCorrect: false },
        { text: "خطأ", isCorrect: true },
      ],
    });
    expect(imported.stored[0]).toEqual(manual.stored);
  });

  it("خيار طويل متكسّر على سطرين في الـ PDF بيتخزّن كامل زي الفورم", async () => {
    const full = "The Nile flows from south to north through Egypt";
    const manual = await addManually({
      type: "multiple_choice",
      text: "Pick the correct statement",
      options: [
        { text: full, isCorrect: true },
        { text: "The Nile flows west", isCorrect: false },
      ],
    });
    const imported = await addByImport([
      "Question 1: Pick the correct statement",
      "A) The Nile flows from south",
      "to north through Egypt",
      "B) The Nile flows west",
      "Answer: A",
    ]);
    expect(imported.stored[0]).toEqual(manual.stored);
  });

  it("الدرجة: بدون سطر درجة = 1، وبتتطبّع زي الفورم (0 → 1)", async () => {
    const noPoints = await addByImport(["Q1: Pick", "A) x", "B) y", "Answer: A"]);
    expect(noPoints.stored[0].points).toBe(1);

    const zero = await addByImport(["Q1: Pick", "A) x", "B) y", "Answer: A", "Points: 0"]);
    const manualZero = await addManually({
      type: "multiple_choice",
      text: "Pick",
      points: 0,
      options: [
        { text: "x", isCorrect: true },
        { text: "y", isCorrect: false },
      ],
    });
    expect(zero.stored[0].points).toBe(manualZero.stored.points);
    expect(zero.stored[0].points).toBe(1);

    const half = await addByImport(["Q1: Pick", "A) x", "B) y", "Answer: A", "Points: 1.5"]);
    expect(half.stored[0].points).toBe(1.5);
  });

  it("الترتيب: الأسئلة المستوردة بتكمّل ترقيم الكويز (3,4,5) زي الإضافة اليدوية", async () => {
    const { stored } = await addByImport([
      "Q1: one",
      "A) a",
      "B) b",
      "Answer: A",
      "Q2: two",
      "A) a",
      "B) b",
      "Answer: B",
      "Q3: three",
      "Answer: True",
    ]);
    expect(stored.map((d) => d.order)).toEqual([3, 4, 5]);
    expect(stored.map((d) => d.text)).toEqual(["one", "two", "three"]);
  });
});

describe("الاستيراد بيرفض اللي الفورم اليدوي مستحيل ينتجه", () => {
  it("أكتر من إجابة صح في الاختيار من متعدد = multiple_correct_answers (مش بيتخزّن)", async () => {
    const res = await importPdf(["Q1: x", "A) 1", "B) 2", "C) 3", "Answer: A, B"]);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("no_valid_questions");
    expect(body.parseErrors[0].reason).toBe("multiple_correct_answers");
    expect(mockInsertMany).not.toHaveBeenCalled();
  });

  it("أكتر من 6 خيارات = too_many_options", async () => {
    const lines = ["Q1: x", ..."ABCDEFG".split("").map((c) => `${c}) opt ${c}`), "Answer: A"];
    const res = await importPdf(lines);
    const body = await res.json();
    expect(body.parseErrors[0].reason).toBe("too_many_options");
    expect(mockInsertMany).not.toHaveBeenCalled();
  });

  it("ملف فيه سؤال سليم وسؤال مرفوض: السليم يتحفظ والمرفوض يتبلّغ عنه", async () => {
    const res = await importPdf([
      "Q1: good",
      "A) a",
      "B) b",
      "Answer: A",
      "Q2: ambiguous",
      "A) a",
      "B) b",
      "Answer: A, B",
    ]);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.importedCount).toBe(1);
    expect(body.skippedCount).toBe(1);
    expect(body.skipped[0].reason).toBe("multiple_correct_answers");
  });
});
