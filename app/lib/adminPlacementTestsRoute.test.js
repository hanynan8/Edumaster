// app/lib/adminPlacementTestsRoute.test.js
//
// GET /api/admin/placement-tests:
//   - أدمن بس (الطالب 403).
//   - القايمة من غير الإجابات التفصيلية (answers/results) وبـ phone (مع fallback لـ studentNumber القديم).
//   - ?id=... بيرجّع نتيجة واحدة بالتفصيل: بيانات الطالب + إجاباته مع التصحيح.

const mockGetServerSession = jest.fn();
const mockFind = jest.fn();
const mockFindOne = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/placementTest", () => ({
  getPlacementTestsCollection: () => ({
    find: (...a) => mockFind(...a),
    findOne: (...a) => mockFindOne(...a),
  }),
}));

const ID = "507f1f77bcf86cd799439011";
const asRole = (role) => mockGetServerSession.mockResolvedValue({ user: { id: "u1", role } });
const get = (qs = "") => new Request(`http://x/api/admin/placement-tests${qs}`);

const baseDoc = {
  _id: { toString: () => ID },
  name: "Mona",
  email: "mona@example.com",
  phone: "+201001234567",
  score: 50,
  maxScore: 100,
  level: "A1.1",
  answeredCount: 2,
  totalQuestions: 75,
  paymentStatus: "free",
  emailSent: true,
  createdAt: new Date("2026-10-22T00:00:00Z"),
};

describe("GET /api/admin/placement-tests", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/admin/placement-tests/route.js"));
  });

  it("غير الأدمن مرفوض", async () => {
    asRole("student");
    expect((await GET(get())).status).toBe(403);
    mockGetServerSession.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
  });

  it("القايمة: من غير answers/results، والرقم من phone أو studentNumber القديم", async () => {
    asRole("admin");
    mockFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          toArray: () =>
            Promise.resolve([baseDoc, { ...baseDoc, phone: undefined, studentNumber: "OLD-7" }]),
        }),
      }),
    });
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(mockFind).toHaveBeenCalledWith({}, { projection: { answers: 0, results: 0 } });
    const rows = await res.json();
    expect(rows[0]).toMatchObject({ name: "Mona", email: "mona@example.com", phone: "+201001234567" });
    expect(rows[1].phone).toBe("OLD-7");
    expect(rows[0].review).toBeUndefined();
  });

  it("?id: بيرجّع الإجابات مع التصحيح", async () => {
    asRole("admin");
    mockFindOne.mockResolvedValue({
      ...baseDoc,
      results: [
        { n: 1, a: 1, c: 1 },
        { n: 2, a: 2, c: 0 },
      ],
    });
    const res = await GET(get(`?id=${ID}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ name: "Mona", phone: "+201001234567", score: 50, emailSent: true });
    const qs = data.review.flatMap((p) => p.tasks.flatMap((t) => t.questions));
    expect(qs).toHaveLength(2);
    expect(qs[0]).toMatchObject({ n: 1, isCorrect: true });
    expect(qs[1]).toMatchObject({ n: 2, isCorrect: false, yourIndex: 2, correctIndex: 0 });
  });

  it("?id غلط → 400، ومش موجود → 404", async () => {
    asRole("admin");
    expect((await GET(get("?id=nope"))).status).toBe(400);
    mockFindOne.mockResolvedValue(null);
    expect((await GET(get(`?id=${ID}`))).status).toBe(404);
  });
});
