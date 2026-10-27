// app/lib/courseArchiveRoute.test.js
//
// 🆕 PUT /api/courses/[id] — أرشفة الكورس (status = "archived"):
//   - المدرّس: ممنوع يأرشف كورس منشور أو فيه طلاب (403 cannot_archive)، ومسموح
//     لكورس مش منشور ومفيهوش طلاب.
//   - الموديريتور والأدمن: مسموح لهم يأرشفوا كورس منشور حتى لو فيه طلاب، وتغيير
//     الحالة بيتسجّل في الـ audit log.

const mockGetServerSession = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockLogAudit = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/models", () => ({
  getCourseModel: () => ({
    findById: (...a) => mockFindById(...a),
    findByIdAndUpdate: (...a) => mockFindByIdAndUpdate(...a),
    exists: jest.fn().mockResolvedValue(null),
  }),
  getCategoryModel: () => ({ findById: () => ({ lean: () => Promise.resolve({ _id: "cat1" }) }) }),
  getSectionModel: () => ({}),
  getLessonModel: () => ({}),
}));
jest.mock("@/app/lib/courseHelpers", () => ({
  slugify: (s) => s,
  sanitizeCourseI18n: jest.fn().mockReturnValue({}),
  resolveCourseSubcategory: jest.fn().mockResolvedValue({ ok: true }),
  resolveSupervisingTeacher: jest.fn(),
}));
jest.mock("@/app/lib/bunny", () => ({ resolveSecureStoredUrl: (u) => u }));
jest.mock("@/app/lib/notificationHelpers", () => ({
  createNotification: jest.fn().mockResolvedValue(),
  getAdminUserIds: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/app/lib/auditLog", () => ({ logAudit: (...a) => mockLogAudit(...a) }));
jest.mock("@/app/lib/meetingCleanup", () => ({ deleteMeetingsForCourse: jest.fn() }));
jest.mock("@/app/lib/customPlacementTests", () => ({
  getPlacementLinksForCourses: jest.fn().mockResolvedValue({}),
}));
jest.mock("@/app/lib/courseGrants", () => ({
  parseGrantedEmails: jest.fn(),
  resolveGrantRecipients: jest.fn(),
  grantCourseAccess: jest.fn(),
  notifyGrantedStudents: jest.fn(),
  MAX_GRANT_EMAILS: 100,
}));

const COURSE_ID = "507f1f77bcf86cd799439011";
const OWNER_ID = "507f1f77bcf86cd799439022";
const OTHER_ID = "507f1f77bcf86cd799439033";

const asUser = (role, id = OTHER_ID) =>
  mockGetServerSession.mockResolvedValue({ user: { id, role } });

function existingCourse(overrides = {}) {
  return {
    _id: { toString: () => COURSE_ID },
    title: "Course",
    slug: "course",
    teacher: OWNER_ID,
    status: "published",
    studentsCount: 0,
    ...overrides,
  };
}

function mockUpdateReturns(status) {
  const doc = {
    _id: { toString: () => COURSE_ID },
    title: "Course",
    slug: "course",
    teacher: { _id: { toString: () => OWNER_ID }, name: "Teacher" },
    status,
  };
  mockFindByIdAndUpdate.mockResolvedValue({ ...doc, populate: () => Promise.resolve(doc) });
}

describe("PUT /api/courses/[id] — archive", () => {
  let PUT;
  beforeAll(async () => {
    ({ PUT } = await import("@/app/api/courses/[id]/route.js"));
  });

  const call = () =>
    PUT(
      new Request(`http://x/api/courses/${COURSE_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      }),
      { params: Promise.resolve({ id: COURSE_ID }) }
    );

  it("المدرّس صاحب الكورس: ممنوع يأرشف كورس منشور (403 cannot_archive)", async () => {
    asUser("teacher", OWNER_ID);
    mockFindById.mockResolvedValue(existingCourse({ status: "published" }));
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cannot_archive");
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("المدرّس صاحب الكورس: ممنوع يأرشف كورس فيه طلاب حتى لو مش منشور", async () => {
    asUser("teacher", OWNER_ID);
    mockFindById.mockResolvedValue(existingCourse({ status: "pending", studentsCount: 3 }));
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cannot_archive");
  });

  it("المدرّس صاحب الكورس: مسموح يأرشف كورس مش منشور ومفيهوش طلاب", async () => {
    asUser("teacher", OWNER_ID);
    mockFindById.mockResolvedValue(existingCourse({ status: "pending", studentsCount: 0 }));
    mockUpdateReturns("archived");
    const res = await call();
    expect(res.status).toBe(200);
    expect(mockFindByIdAndUpdate.mock.calls[0][1].$set.status).toBe("archived");
  });

  it("الموديريتور: يقدر يأرشف كورس منشور", async () => {
    asUser("moderator");
    mockFindById.mockResolvedValue(existingCourse({ status: "published" }));
    mockUpdateReturns("archived");
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("archived");
    expect(mockFindByIdAndUpdate.mock.calls[0][1].$set.status).toBe("archived");
  });

  it("الموديريتور: يقدر يأرشف كورس منشور فيه طلاب، والتغيير بيتسجّل في الـ audit log", async () => {
    asUser("moderator");
    mockFindById.mockResolvedValue(existingCourse({ status: "published", studentsCount: 12 }));
    mockUpdateReturns("archived");
    const res = await call();
    expect(res.status).toBe(200);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "course.status_changed",
        details: expect.objectContaining({ from: "published", to: "archived" }),
      })
    );
  });

  it("الأدمن: لسه يقدر يأرشف كورس منشور", async () => {
    asUser("admin");
    mockFindById.mockResolvedValue(existingCourse({ status: "published", studentsCount: 5 }));
    mockUpdateReturns("archived");
    expect((await call()).status).toBe(200);
  });

  it("الطالب والمدرّس التاني: مرفوضين (403 forbidden)", async () => {
    mockFindById.mockResolvedValue(existingCourse());
    asUser("student");
    expect((await call()).status).toBe(403);
    asUser("teacher", OTHER_ID);
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});
