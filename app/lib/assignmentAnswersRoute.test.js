// app/lib/assignmentAnswersRoute.test.js
//
// 🆕 POST /api/assignments/[id]/answers — تصحيح فوري لأسئلة الواجب:
// الحماية (منشور/وصول/ميعاد/محاولة واحدة) + نمطين الدرجة (أسئلة بس = تلقائي،
// أو مع تسليم يدوي = الدرجة النهائية للمدرّس) + إن الإجابة الصح متتبعتش من نفسها.

const mockSession = jest.fn();
const mockAssignmentFindById = jest.fn();
const mockCourseFindById = jest.fn();
const mockSubmissionUpdate = jest.fn();
const mockAccess = jest.fn();
const mockNotify = jest.fn();

jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/models", () => ({
  getAssignmentModel: () => ({ findById: (...a) => mockAssignmentFindById(...a) }),
  getCourseModel: () => ({ findById: (...a) => mockCourseFindById(...a) }),
  getSubmissionModel: () => ({ findOneAndUpdate: (...a) => mockSubmissionUpdate(...a) }),
}));
jest.mock("@/app/lib/rbac", () => ({ requireSession: (...a) => mockSession(...a) }));
jest.mock("@/app/lib/access", () => ({ getCourseAccessForUser: (...a) => mockAccess(...a) }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/notificationHelpers", () => ({ createNotification: (...a) => mockNotify(...a) }));

import mongoose from "mongoose";
import { POST } from "@/app/api/assignments/[id]/answers/route";

const ASSIGNMENT_ID = "507f1f77bcf86cd799439011";
const q1 = new mongoose.Types.ObjectId();
const q2 = new mongoose.Types.ObjectId();

const lean = (v) => ({ lean: () => Promise.resolve(v) });
const makeAssignment = (over = {}) => ({
  _id: new mongoose.Types.ObjectId(ASSIGNMENT_ID),
  course: new mongoose.Types.ObjectId(),
  title: "واجب 1",
  isPublished: true,
  maxScore: 20,
  dueDate: null,
  allowLateSubmission: true,
  allowManualSubmission: false,
  questions: [
    {
      _id: q1, type: "multiple_choice", text: "س1", points: 2,
      options: [{ text: "أ", isCorrect: true }, { text: "ب", isCorrect: false }],
    },
    {
      _id: q2, type: "true_false", text: "س2", points: 2,
      options: [{ text: "صح", isCorrect: true }, { text: "غلط", isCorrect: false }],
    },
  ],
  ...over,
});

const call = (body) =>
  POST(
    new Request("http://x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
    { params: Promise.resolve({ id: ASSIGNMENT_ID }) }
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue({ session: { user: { id: "student1", role: "student" } } });
  mockAccess.mockResolvedValue({ hasAccess: true });
  mockCourseFindById.mockReturnValue(lean({ _id: "c1" }));
  mockAssignmentFindById.mockReturnValue(lean(makeAssignment()));
  mockSubmissionUpdate.mockImplementation(async (_f, update) => ({
    ...update.$set,
    status: update.$set?.status || "submitted",
    score: update.$set?.score ?? null,
  }));
});

describe("POST /api/assignments/[id]/answers", () => {
  test("أسئلة بس: بيصحّح تلقائي، الدرجة بمقياس maxScore، والتسليم graded + إشعار", async () => {
    const res = await call({
      answers: [
        { question: q1.toString(), selectedOptionIndex: 0 }, // صح
        { question: q2.toString(), selectedOptionIndex: 1 }, // غلط
      ],
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.autoGraded).toBe(true);
    expect(data.quiz).toMatchObject({ earnedPoints: 2, totalPoints: 4, scorePercent: 50 });
    expect(data.score).toBe(10); // 50% من 20
    expect(data.status).toBe("graded");
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: "assignment_graded" }));
    // بعد التسليم: الإجابات الصح بتتكشف للمراجعة
    expect(data.questions[0].options[0].isCorrect).toBe(true);
  });

  test("🔒 الفلتر بيطابق بس لو لسه ما حلّش (quiz: null) — عشان محاولة واحدة", async () => {
    await call({ answers: [] });
    expect(mockSubmissionUpdate.mock.calls[0][0]).toEqual({
      assignment: expect.anything(),
      student: "student1",
      quiz: null,
    });
    expect(mockSubmissionUpdate.mock.calls[0][2]).toMatchObject({ upsert: true });
  });

  test("🔒 ضغطة تانية (unique index 11000) → 409 already_answered", async () => {
    mockSubmissionUpdate.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    const res = await call({ answers: [] });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("already_answered");
  });

  test("مع تسليم يدوي مسموح: درجة الأسئلة بتظهر لكن الدرجة النهائية مش بتتحدد ومفيش إشعار", async () => {
    mockAssignmentFindById.mockReturnValue(lean(makeAssignment({ allowManualSubmission: true })));
    const res = await call({ answers: [{ question: q1.toString(), selectedOptionIndex: 0 }] });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.autoGraded).toBe(false);
    expect(data.score).toBeNull();
    const update = mockSubmissionUpdate.mock.calls[0][1];
    // مش بنلمس status/score/ملفات الطالب الموجودة — بس quiz (والباقي عند الإنشاء)
    expect(Object.keys(update.$set)).toEqual(["quiz"]);
    expect(update.$setOnInsert).toMatchObject({ status: "submitted" });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test("🔒 الطالب مقدرش يفرض الدرجة: isCorrect/pointsEarned من الـ body بتتتجاهل", async () => {
    const res = await call({
      answers: [{ question: q1.toString(), selectedOptionIndex: 1, isCorrect: true, pointsEarned: 99 }],
    });
    const data = await res.json();
    expect(data.quiz.earnedPoints).toBe(0);
    expect(data.score).toBe(0);
  });

  test("واجب مش منشور → 404", async () => {
    mockAssignmentFindById.mockReturnValue(lean(makeAssignment({ isPublished: false })));
    expect((await call({ answers: [] })).status).toBe(404);
  });

  test("واجب من غير أسئلة → 400 no_questions", async () => {
    mockAssignmentFindById.mockReturnValue(lean(makeAssignment({ questions: [] })));
    const res = await call({ answers: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("no_questions");
  });

  test("من غير وصول للكورس → 403", async () => {
    mockAccess.mockResolvedValue({ hasAccess: false });
    expect((await call({ answers: [] })).status).toBe(403);
    expect(mockSubmissionUpdate).not.toHaveBeenCalled();
  });

  test("الميعاد فات والتسليم المتأخر مقفول → 400 deadline_passed", async () => {
    mockAssignmentFindById.mockReturnValue(
      lean(makeAssignment({ dueDate: new Date(Date.now() - 60_000), allowLateSubmission: false }))
    );
    const res = await call({ answers: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("deadline_passed");
  });

  test("الميعاد فات والتسليم المتأخر مسموح → بيتقبل", async () => {
    mockAssignmentFindById.mockReturnValue(
      lean(makeAssignment({ dueDate: new Date(Date.now() - 60_000), allowLateSubmission: true }))
    );
    expect((await call({ answers: [] })).status).toBe(201);
  });

  test("من غير تسجيل دخول → بيرجّع رد الـ auth", async () => {
    mockSession.mockResolvedValue({ response: new Response("{}", { status: 401 }) });
    expect((await call({ answers: [] })).status).toBe(401);
  });
});
