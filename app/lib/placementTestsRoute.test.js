// app/lib/placementTestsRoute.test.js
//
// اختبارات POST /api/placement-tests (اختبار تحديد المستوى الإسباني):
//   - لازم تسجيل دخول: غير المسجّل بياخد 401 ومفيش حاجة بتتسجّل.
//   - بيانات الطالب (الاسم/الإيميل/الرقم) بتتاخد من الـ session على السيرفر
//     وبتتسجّل مع النتيجة (عشان تظهر للأدمن) — وأي name/email في الـ body بيتتجاهل.
//   - حساب من غير إيميل/اسم صالح بيتقابل بـ 400.

const mockGetServerSession = jest.fn();
const mockInsertOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockSendEmail = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/emailHelpers", () => ({
  sendPlacementResultEmail: (...a) => mockSendEmail(...a),
}));
jest.mock("@/app/lib/placementTest", () => ({
  getAudioMap: jest.fn().mockResolvedValue({}),
  getPlacementTestsCollection: () => ({
    insertOne: (...a) => mockInsertOne(...a),
    updateOne: (...a) => mockUpdateOne(...a),
  }),
  getRecommendedCourses: jest.fn().mockResolvedValue([]),
  sanitizeAnswers: jest.fn((a) => a || {}),
  scoreAnswers: jest.fn(() => ({
    score: 72,
    maxScore: 100,
    answered: 40,
    totalQuestions: 50,
    level: "A1.2",
    a11: 10,
    a12: 8,
    rawScore: 36,
    rawMax: 50,
  })),
}));

const USER = {
  id: "507f1f77bcf86cd799439011",
  name: "Mona Student",
  email: "mona@example.com",
  phone: "+201001234567",
  role: "student",
};

const post = (body) =>
  new Request("http://x/api/placement-tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/placement-tests", () => {
  let POST;
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/placement-tests/route.js"));
  });

  beforeEach(() => {
    mockInsertOne.mockResolvedValue({ insertedId: { toString: () => "test123" } });
    mockUpdateOne.mockResolvedValue({});
    mockSendEmail.mockResolvedValue(true);
  });

  const flat = (review) => review.flatMap((p) => p.tasks.flatMap((t) => t.questions));

  it("غير مسجّل دخول → 401 ومفيش نتيجة بتتسجّل", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(post({ language: "ar", answers: { 1: 0 } }));
    expect(res.status).toBe(401);
    expect(mockInsertOne).not.toHaveBeenCalled();
  });

  it("بيسجّل اسم/إيميل/رقم الطالب من الـ session ويتجاهل أي بيانات في الـ body", async () => {
    mockGetServerSession.mockResolvedValue({ user: USER });
    const res = await POST(
      post({
        name: "Someone Else",
        email: "fake@evil.com",
        phone: "000",
        language: "es",
        answers: { 1: 2 },
      })
    );
    expect(res.status).toBe(201);

    const doc = mockInsertOne.mock.calls[0][0];
    expect(doc).toMatchObject({
      userId: USER.id,
      name: USER.name,
      email: USER.email,
      phone: USER.phone,
      language: "es",
      score: 72,
      level: "A1.2",
    });

    const data = await res.json();
    expect(data).toMatchObject({ id: "test123", free: true, name: USER.name, score: 72 });
  });

  it("🆕 test=a2 → بيتصحح ويتسجّل كاختبار A2 (والافتراضي a1 لو مفيش/غلط)", async () => {
    const placement = await import("@/app/lib/placementTest");
    mockGetServerSession.mockResolvedValue({ user: USER });

    const res = await POST(post({ language: "es", answers: { 1: 1 }, test: "a2" }));
    expect(res.status).toBe(201);
    expect(placement.getAudioMap).toHaveBeenLastCalledWith("a2");
    expect(placement.scoreAnswers).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), "a2");
    expect(mockInsertOne.mock.calls[0][0]).toMatchObject({ test: "a2" });
    expect((await res.json()).test).toBe("a2");

    mockInsertOne.mockClear();
    await POST(post({ language: "es", answers: { 1: 1 }, test: "zzz" }));
    expect(placement.scoreAnswers).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), "a1");
    expect(mockInsertOne.mock.calls[0][0]).toMatchObject({ test: "a1" });

    mockInsertOne.mockClear();
    await POST(post({ language: "es", answers: { 1: 1 } })); // من غير test = A1
    expect(mockInsertOne.mock.calls[0][0]).toMatchObject({ test: "a1" });
  });

  it("حساب من غير إيميل صالح → 400 invalid_profile", async () => {
    mockGetServerSession.mockResolvedValue({ user: { ...USER, email: "" } });
    const res = await POST(post({ language: "ar", answers: {} }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_profile");
    expect(mockInsertOne).not.toHaveBeenCalled();
  });

  it("حساب قديم من غير رقم تليفون → بيتسجّل عادي والرقم فاضي", async () => {
    mockGetServerSession.mockResolvedValue({ user: { ...USER, phone: undefined } });
    const res = await POST(post({ language: "ar", answers: {} }));
    expect(res.status).toBe(201);
    expect(mockInsertOne.mock.calls[0][0].phone).toBe("");
  });

  it("بيخزّن لقطة تصحيح لكل سؤال وبيرجّع الإجابات مع التصحيح للطالب", async () => {
    mockGetServerSession.mockResolvedValue({ user: USER });
    // سؤال 1: الصح index 1 (إجابة صح) — سؤال 2: الصح index 0 (الطالب جاوب 2 = غلط)
    const res = await POST(post({ language: "ar", answers: { 1: 1, 2: 2 } }));
    expect(res.status).toBe(201);

    const { results } = mockInsertOne.mock.calls[0][0];
    expect(results.find((r) => r.n === 1)).toEqual({ n: 1, a: 1, c: 1 });
    expect(results.find((r) => r.n === 2)).toEqual({ n: 2, a: 2, c: 0 });
    expect(results.find((r) => r.n === 3).a).toBeNull(); // سؤال متجاوبش عليه

    const { review } = await res.json();
    const qs = flat(review);
    expect(qs.find((q) => q.n === 1)).toMatchObject({ yourIndex: 1, correctIndex: 1, isCorrect: true });
    expect(qs.find((q) => q.n === 2)).toMatchObject({ yourIndex: 2, correctIndex: 0, isCorrect: false });
    expect(qs.find((q) => q.n === 3)).toMatchObject({ yourIndex: null, isCorrect: false });
  });

  it("بيبعت النتيجة والإجابات على إيميل الحساب (من الـ session) ويبلّغ الـ client", async () => {
    mockGetServerSession.mockResolvedValue({ user: USER });
    const res = await POST(post({ email: "fake@evil.com", language: "en", answers: { 1: 1 } }));
    const data = await res.json();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const arg = mockSendEmail.mock.calls[0][0];
    expect(arg).toMatchObject({
      toEmail: USER.email,
      name: USER.name,
      language: "en",
      score: 72,
      maxScore: 100,
      level: "A1.2",
    });
    expect(arg.review.length).toBeGreaterThan(0);
    expect(data.emailSentTo).toBe(USER.email);
    expect(mockUpdateOne).toHaveBeenCalledWith({ _id: expect.anything() }, { $set: { emailSent: true } });
  });

  it("فشل إرسال الإيميل مبيوقّفش النتيجة", async () => {
    mockGetServerSession.mockResolvedValue({ user: USER });
    mockSendEmail.mockRejectedValue(new Error("resend down"));
    const res = await POST(post({ language: "ar", answers: { 1: 1 } }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.emailSentTo).toBeNull();
    expect(data.review.length).toBeGreaterThan(0);
    expect(mockUpdateOne).toHaveBeenCalledWith({ _id: expect.anything() }, { $set: { emailSent: false } });
  });
});
