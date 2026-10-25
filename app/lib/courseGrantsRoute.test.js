// app/lib/courseGrantsRoute.test.js
//
// 🆕 اختبارات الـ routes الخاصة بالتسجيل المجاني من الموديريتور:
//   - POST /api/courses بـ grantedEmails: إيميل غلط/غير مسجّل بيرفض الطلب كله
//     (400) من غير ما يتعمل كورس، والنجاح بيسجّل الطلاب وبيرجّع ملخص، وفشل التسجيل
//     بعد إنشاء الكورس مابيلغيش الكورس (grantFailed).
//   - POST /api/admin/courses/[id]/approve: بيبلّغ الطلاب المسجّلين بمنحة لما
//     الكورس يتنشر.
//   - GET /api/courses/[id]/grants: موديريتور/أدمن بس.

const mockGetServerSession = jest.fn();
const mockCourseCreate = jest.fn();
const mockResolveRecipients = jest.fn();
const mockGrantAccess = jest.fn();
const mockNotifyGranted = jest.fn();
const mockListGranted = jest.fn();
const mockCourseFindById = jest.fn();
const mockCourseExists = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/mongodb", () => ({
  connectToMongo: jest.fn().mockResolvedValue(),
  getAuthModel: () => ({}),
}));
jest.mock("@/app/lib/models", () => ({
  getCourseModel: () => ({
    create: (...a) => mockCourseCreate(...a),
    findOne: () => ({ sort: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }) }),
    exists: (...a) => mockCourseExists(...a),
    findById: (...a) => mockCourseFindById(...a),
  }),
  getCategoryModel: () => ({
    findById: () => ({ lean: () => Promise.resolve({ _id: "cat1", slug: "general" }) }),
  }),
}));
jest.mock("@/app/lib/courseHelpers", () => ({
  generateUniqueCourseSlug: jest.fn().mockResolvedValue("my-course"),
  sanitizeCourseI18n: jest.fn().mockReturnValue({}),
  resolveCourseSubcategory: jest.fn().mockResolvedValue({ ok: true, provided: false }),
  resolveSupervisingTeacher: jest.fn().mockResolvedValue({ ok: true, teacher: { id: "507f1f77bcf86cd799439022", name: "T" } }),
}));
jest.mock("@/app/lib/bunny", () => ({ resolveSecureStoredUrl: (u) => u }));
jest.mock("@/app/lib/notificationHelpers", () => ({
  createNotification: jest.fn().mockResolvedValue(),
  getAdminUserIds: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/app/lib/auditLog", () => ({ logAudit: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/courseGrants", () => {
  const actual = jest.requireActual("@/app/lib/courseGrants");
  return {
    ...actual,
    resolveGrantRecipients: (...a) => mockResolveRecipients(...a),
    grantCourseAccess: (...a) => mockGrantAccess(...a),
    notifyGrantedStudents: (...a) => mockNotifyGranted(...a),
    listGrantedStudents: (...a) => mockListGranted(...a),
  };
});

const CATEGORY_ID = "507f1f77bcf86cd799439011";
const TEACHER_ID = "507f1f77bcf86cd799439022";
const MODERATOR_ID = "507f1f77bcf86cd799439033";
const COURSE_ID = "507f1f77bcf86cd799439044";

const asUser = (role, id = MODERATOR_ID) => mockGetServerSession.mockResolvedValue({ user: { id, role } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/courses مع grantedEmails", () => {
  let POST;
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/courses/route.js"));
  });

  const req = (body) =>
    new Request("http://x/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My course", category: CATEGORY_ID, teacher: TEACHER_ID, ...body }),
    });

  const createdDoc = () => {
    const doc = {
      _id: { toString: () => "course1" },
      title: "My course",
      slug: "my-course",
      status: "pending",
      i18n: {},
      teacher: { _id: { toString: () => TEACHER_ID }, name: "Teacher One" },
      category: { _id: { toString: () => CATEGORY_ID }, name: "Gen" },
    };
    doc.populate = jest.fn().mockResolvedValue(doc);
    return doc;
  };

  it("إيميل بصيغة غلط → 400 invalid_emails ومفيش كورس", async () => {
    asUser("moderator");
    const res = await POST(req({ grantedEmails: ["ok@x.com", "not-an-email"] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_emails", invalid: ["not-an-email"] });
    expect(mockCourseCreate).not.toHaveBeenCalled();
  });

  it("إيميل مش مسجّل في المنصة → 400 unknown_emails ومفيش كورس ولا تسجيل", async () => {
    asUser("moderator");
    mockResolveRecipients.mockResolvedValue({ users: [], unknown: ["ghost@x.com"] });
    const res = await POST(req({ grantedEmails: ["ghost@x.com"] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "unknown_emails", invalid: ["ghost@x.com"] });
    expect(mockCourseCreate).not.toHaveBeenCalled();
    expect(mockGrantAccess).not.toHaveBeenCalled();
  });

  it("النجاح: بيسجّل الطلاب بعد إنشاء الكورس وبيرجّع الملخص", async () => {
    asUser("moderator");
    const users = [{ id: "s1", email: "s1@x.com", name: "S1" }];
    mockResolveRecipients.mockResolvedValue({ users, unknown: [] });
    const doc = createdDoc();
    mockCourseCreate.mockResolvedValue(doc);
    mockGrantAccess.mockResolvedValue({ granted: 1, alreadyEnrolled: 0, skipped: 0, grantedUserIds: ["s1"] });

    const res = await POST(req({ grantedEmails: ["S1@x.com", "s1@x.com"] }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.grant).toEqual({ granted: 1, alreadyEnrolled: 0, skipped: 0 });
    expect(json.grantFailed).toBe(false);

    // الإيميلات اتنضّفت (lowercase + من غير تكرار) قبل البحث
    expect(mockResolveRecipients).toHaveBeenCalledWith(["s1@x.com"]);
    expect(mockGrantAccess).toHaveBeenCalledWith({ course: doc, users, grantedBy: MODERATOR_ID });
  });

  it("فشل التسجيل بعد الإنشاء: الكورس يفضل موجود و grantFailed=true", async () => {
    asUser("moderator");
    mockResolveRecipients.mockResolvedValue({ users: [{ id: "s1", email: "s1@x.com", name: "" }], unknown: [] });
    mockCourseCreate.mockResolvedValue(createdDoc());
    mockGrantAccess.mockRejectedValue(new Error("db down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req({ grantedEmails: ["s1@x.com"] }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ grantFailed: true, grant: null });
    errSpy.mockRestore();
  });

  it("من غير grantedEmails: مفيش بحث ولا تسجيل (السلوك القديم)", async () => {
    asUser("moderator");
    mockResolveRecipients.mockResolvedValue({ users: [], unknown: [] });
    mockCourseCreate.mockResolvedValue(createdDoc());
    const res = await POST(req({}));
    expect(res.status).toBe(201);
    expect(mockGrantAccess).not.toHaveBeenCalled();
    expect((await res.json()).grant).toBeNull();
  });

  it("المدرّس مرفوض 403 حتى لو بعت grantedEmails", async () => {
    asUser("teacher");
    const res = await POST(req({ grantedEmails: ["s1@x.com"] }));
    expect(res.status).toBe(403);
    expect(mockGrantAccess).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/courses/[id]/approve", () => {
  let POST;
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/admin/courses/[id]/approve/route.js"));
  });

  it("بعد النشر بيبلّغ الطلاب اللي اتسجّلوا بمنحة", async () => {
    asUser("admin", "507f1f77bcf86cd799439099");
    const course = {
      _id: { toString: () => COURSE_ID },
      title: "My course",
      status: "pending",
      teacher: { _id: TEACHER_ID, name: "T" },
      createdBy: null,
      save: jest.fn().mockResolvedValue(),
    };
    mockCourseFindById.mockReturnValue({ populate: () => Promise.resolve(course) });

    const res = await POST(new Request("http://x"), { params: Promise.resolve({ id: COURSE_ID }) });
    expect(res.status).toBe(200);
    expect(course.status).toBe("published");
    expect(mockNotifyGranted).toHaveBeenCalledWith({ course });
  });
});

describe("GET /api/courses/[id]/grants", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/courses/[id]/grants/route.js"));
  });
  const call = () => GET(new Request("http://x"), { params: Promise.resolve({ id: COURSE_ID }) });

  it("المدرّس والطالب مرفوضين (403)", async () => {
    asUser("teacher");
    expect((await call()).status).toBe(403);
    asUser("student");
    expect((await call()).status).toBe(403);
  });

  it("الموديريتور بيشوف قايمة الطلاب المسجّلين", async () => {
    asUser("moderator");
    mockCourseExists.mockResolvedValue({ _id: COURSE_ID });
    mockListGranted.mockResolvedValue([{ id: "s1", name: "S1", email: "s1@x.com" }]);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ students: [{ id: "s1", name: "S1", email: "s1@x.com" }] });
  });

  it("كورس مش موجود → 404", async () => {
    asUser("admin");
    mockCourseExists.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });
});
