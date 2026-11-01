// app/lib/inviteesRoute.test.js
//
// 🆕 اختبارات فلتر الأدوار في GET /api/meetings/invitees (بيستخدمه منتقي التسجيل
// المجاني للموديريتور: ?role=student,teacher):
//   - طلاب + مدرّسين عاديين بس، ومحدّش يقدر يفلتر على موديريتور/أدمن.
//   - role=student لوحده لسه بيرجّع الطلاب (والحسابات القديمة من غير role) بس.
//   - الصلاحيات: موديريتور/أدمن بس (الطالب 403).

const mockGetServerSession = jest.fn();
const mockFind = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/mongodb", () => ({
  connectToMongo: jest.fn().mockResolvedValue(),
  getAuthModel: () => ({ find: (...a) => mockFind(...a) }),
}));

const asUser = (role) => mockGetServerSession.mockResolvedValue({ user: { id: "m1", role } });

// Auth.find(...).sort().skip().limit().lean()
const chain = (rows) => {
  const c = {
    sort: () => c,
    skip: () => c,
    limit: () => c,
    lean: () => Promise.resolve(rows),
  };
  return c;
};

const STUDENT_CLAUSES = [{ role: "student" }, { role: { $exists: false } }, { role: null }];

let GET;
beforeAll(async () => {
  ({ GET } = await import("@/app/api/meetings/invitees/route.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockReturnValue(chain([]));
});

const call = (qs = "") => GET(new Request(`http://x/api/meetings/invitees${qs}`));
const roleFilterOf = () => mockFind.mock.calls[0][0].$and;

describe("GET /api/meetings/invitees — فلتر الأدوار", () => {
  it("role=student,teacher → طلاب + مدرّسين عاديين", async () => {
    asUser("moderator");
    const res = await call("?role=student,teacher");
    expect(res.status).toBe(200);
    expect(roleFilterOf()).toEqual([{ $or: [...STUDENT_CLAUSES, { role: "teacher" }] }]);
  });

  it("role=student لوحده → الطلاب (والحسابات من غير role) بس", async () => {
    asUser("moderator");
    await call("?role=student");
    expect(roleFilterOf()).toEqual([{ $or: STUDENT_CLAUSES }]);
  });

  it("role=teacher لوحده → المدرّسين بس", async () => {
    asUser("admin");
    await call("?role=teacher");
    expect(roleFilterOf()).toEqual([{ $or: [{ role: "teacher" }] }]);
  });

  it("أدوار الإدارة بتتجاهل: مفيش طريقة نفلتر على موديريتور/أدمن", async () => {
    asUser("moderator");
    await call("?role=moderator,admin");
    expect(mockFind.mock.calls[0][0].$and).toBeUndefined();

    mockFind.mockClear();
    mockFind.mockReturnValue(chain([]));
    await call("?role=student,admin");
    expect(JSON.stringify(roleFilterOf())).not.toMatch(/admin|moderator/);
  });

  it("بيرجّع role كل مستخدم (المدرّس يتعلّم في المنتقي)", async () => {
    asUser("moderator");
    mockFind.mockReturnValue(
      chain([
        { _id: "s1", name: "S", email: "S@x.com", role: "student" },
        { _id: "t1", name: "T", email: "T@x.com", role: "teacher" },
        { _id: "o1", name: "Old", email: "O@x.com" }, // حساب قديم من غير role
      ])
    );
    const res = await call("?role=student,teacher");
    const { users } = await res.json();
    expect(users.map((u) => [u.email, u.role])).toEqual([
      ["s@x.com", "student"],
      ["t@x.com", "teacher"],
      ["o@x.com", "student"],
    ]);
  });
});

describe("GET /api/meetings/invitees — الصلاحيات", () => {
  it("الطالب 403 ومفيش query", async () => {
    asUser("student");
    const res = await call("?role=student,teacher");
    expect(res.status).toBe(403);
    expect(mockFind).not.toHaveBeenCalled();
  });
});
