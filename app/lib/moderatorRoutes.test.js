// app/lib/moderatorRoutes.test.js
//
// 🆕 اختبارات الـ routes الخاصة بدور "موديريتور":
//   - GET /api/moderator/teachers: موديريتور/أدمن بس، وبيرجّع المدرّسين بحقول
//     محدودة (id/name/email).
//   - POST /api/courses: الموديريتور لازم يختار مدرّس مشرف صالح، والكورس بيتسجل
//     باسم المدرّس ده (createdBy = الموديريتور) وبيتبعت pending للأدمن. أي دور
//     تاني بيتجاهل body.teacher تمامًا.

const mockGetServerSession = jest.fn();
const mockAuthFind = jest.fn();
const mockCourseCreate = jest.fn();
const mockResolveSupervisor = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/mongodb", () => ({
  connectToMongo: jest.fn().mockResolvedValue(),
  getAuthModel: () => ({ find: (...a) => mockAuthFind(...a) }),
}));
jest.mock("@/app/lib/models", () => ({
  getCourseModel: () => ({
    create: (...a) => mockCourseCreate(...a),
    findOne: () => ({ sort: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }) }),
    exists: jest.fn().mockResolvedValue(null),
  }),
  getCategoryModel: () => ({
    findById: () => ({ lean: () => Promise.resolve({ _id: "cat1", slug: "general" }) }),
  }),
}));
jest.mock("@/app/lib/courseHelpers", () => ({
  generateUniqueCourseSlug: jest.fn().mockResolvedValue("my-course"),
  sanitizeCourseI18n: jest.fn().mockReturnValue({}),
  resolveCourseSubcategory: jest.fn().mockResolvedValue({ ok: true, provided: false }),
  resolveSupervisingTeacher: (...a) => mockResolveSupervisor(...a),
}));
jest.mock("@/app/lib/bunny", () => ({ resolveSecureStoredUrl: (u) => u }));
jest.mock("@/app/lib/notificationHelpers", () => ({
  createNotification: jest.fn().mockResolvedValue(),
  getAdminUserIds: jest.fn().mockResolvedValue([]),
}));

const CATEGORY_ID = "507f1f77bcf86cd799439011";
const TEACHER_ID = "507f1f77bcf86cd799439022";
const MODERATOR_ID = "507f1f77bcf86cd799439033";

const asUser = (role, id = MODERATOR_ID) => mockGetServerSession.mockResolvedValue({ user: { id, role } });

describe("GET /api/moderator/teachers", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/moderator/teachers/route.js"));
  });
  const req = (qs = "") => new Request(`http://x/api/moderator/teachers${qs}`);

  it("بيرفض المدرّس والطالب (403) وغير المسجّل (401)", async () => {
    asUser("teacher");
    expect((await GET(req())).status).toBe(403);
    asUser("student");
    expect((await GET(req())).status).toBe(403);
    mockGetServerSession.mockResolvedValue(null);
    expect((await GET(req())).status).toBe(401);
    expect(mockAuthFind).not.toHaveBeenCalled();
  });

  it("الموديريتور بيشوف المدرّسين النشطين بحقول محدودة بس", async () => {
    asUser("moderator");
    mockAuthFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: () =>
            Promise.resolve([
              { _id: { toString: () => TEACHER_ID }, name: "Teacher One", email: "t1@x.com", phone: "0100", password: "hash" },
            ]),
        }),
      }),
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ teachers: [{ id: TEACHER_ID, name: "Teacher One", email: "t1@x.com" }] });

    const [filter, projection] = mockAuthFind.mock.calls[0];
    expect(filter.role).toBe("teacher");
    expect(filter.status).toEqual({ $ne: "suspended" });
    expect(projection).toBe("name email"); // مفيش password/phone في الـ query أصلًا
  });

  it("الأدمن كمان مسموح له", async () => {
    asUser("admin");
    mockAuthFind.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) });
    expect((await GET(req("?q=ali"))).status).toBe(200);
    const [filter] = mockAuthFind.mock.calls.at(-1);
    expect(filter.$or).toHaveLength(2); // بحث بالاسم أو الإيميل
  });
});

describe("POST /api/courses (إنشاء كورس)", () => {
  let POST;
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/courses/route.js"));
  });

  const req = (body) =>
    new Request("http://x/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My course", category: CATEGORY_ID, ...body }),
    });

  const createdDoc = (overrides = {}) => {
    const doc = {
      _id: { toString: () => "course1" },
      title: "My course",
      slug: "my-course",
      status: "pending",
      i18n: {},
      teacher: { _id: { toString: () => TEACHER_ID }, name: "Teacher One" },
      category: { _id: { toString: () => CATEGORY_ID }, name: "Gen" },
      ...overrides,
    };
    doc.populate = jest.fn().mockResolvedValue(doc);
    return doc;
  };

  it("الموديريتور من غير teacher → 400 invalid_teacher ومفيش كورس بيتعمل", async () => {
    asUser("moderator");
    mockResolveSupervisor.mockResolvedValue({ ok: false, error: "invalid_teacher" });
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_teacher");
    expect(mockCourseCreate).not.toHaveBeenCalled();
  });

  it("الموديريتور باختيار مستخدم مش مدرّس → 400 ومفيش إنشاء", async () => {
    asUser("moderator");
    mockResolveSupervisor.mockResolvedValue({ ok: false, error: "user_is_not_teacher" });
    const res = await POST(req({ teacher: TEACHER_ID }));
    expect(res.status).toBe(400);
    expect(mockCourseCreate).not.toHaveBeenCalled();
  });

  it("الموديريتور باختيار مدرّس غير موجود → 404", async () => {
    asUser("moderator");
    mockResolveSupervisor.mockResolvedValue({ ok: false, error: "teacher_not_found" });
    expect((await POST(req({ teacher: TEACHER_ID }))).status).toBe(404);
  });

  it("الموديريتور بمدرّس صالح → الكورس باسم المدرّس + createdBy + pending", async () => {
    asUser("moderator");
    mockResolveSupervisor.mockResolvedValue({ ok: true, teacher: { id: TEACHER_ID, name: "Teacher One" } });
    mockCourseCreate.mockResolvedValue(createdDoc());

    const res = await POST(req({ teacher: TEACHER_ID, status: "published" }));
    expect(res.status).toBe(201);
    expect(mockResolveSupervisor).toHaveBeenCalledWith(TEACHER_ID);

    const data = mockCourseCreate.mock.calls[0][0];
    expect(String(data.teacher)).toBe(TEACHER_ID);
    expect(String(data.createdBy)).toBe(MODERATOR_ID);
    // مفيش نشر مباشر أبدًا — حتى لو الموديريتور بعت "published"
    expect(data.status).toBe("pending");
    expect((await res.json()).submittedForReview).toBe(true);
  });

  it("المدرّس العادي بيتجاهل body.teacher: الكورس باسمه هو و createdBy فاضي", async () => {
    asUser("teacher", TEACHER_ID);
    mockCourseCreate.mockResolvedValue(createdDoc());

    const res = await POST(req({ teacher: "507f1f77bcf86cd7994390ff" }));
    expect(res.status).toBe(201);
    expect(mockResolveSupervisor).not.toHaveBeenCalled();

    const data = mockCourseCreate.mock.calls[0][0];
    expect(String(data.teacher)).toBe(TEACHER_ID);
    expect(data.createdBy).toBeNull();
  });

  it("الطالب مرفوض (403)", async () => {
    asUser("student", "s1");
    expect((await POST(req({}))).status).toBe(403);
    expect(mockCourseCreate).not.toHaveBeenCalled();
  });
});
