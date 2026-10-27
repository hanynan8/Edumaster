// app/lib/courseDetailRoutes.test.js
// اختبارات "Couldn't load this course" على السيرفر: كورسات ببيانات قديمة/بايظة
// (teacher/category محذوف، درس يتيم، فحص وصول بيفشل) لازم ترجّع 200 مش 500.

const mockGetServerSession = jest.fn();
const mockCourseFindById = jest.fn();
const mockCourseRawFindOne = jest.fn();
const mockSectionFind = jest.fn();
const mockLessonFind = jest.fn();
const mockAccess = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/models", () => ({
  getCourseModel: () => ({
    findById: (...a) => mockCourseFindById(...a),
    collection: { findOne: (...a) => mockCourseRawFindOne(...a) },
    hydrate: (raw) => ({ ...raw, populate: async () => ({ ...raw }) }),
  }),
  getCategoryModel: () => ({}),
  getSectionModel: () => ({ find: (...a) => mockSectionFind(...a) }),
  getLessonModel: () => ({ find: (...a) => mockLessonFind(...a) }),
}));
jest.mock("@/app/lib/meetingCleanup", () => ({ deleteMeetingsForCourse: jest.fn() }));
jest.mock("@/app/lib/courseHelpers", () => ({
  slugify: (s) => s,
  sanitizeCourseI18n: jest.fn(),
  resolveCourseSubcategory: jest.fn(),
  resolveSupervisingTeacher: jest.fn(),
}));
jest.mock("@/app/lib/bunny", () => ({
  resolveSecureStoredUrl: (u) => u,
  resolveSecureLessonMediaUrls: (x) => ({ videoUrl: x.videoUrl, fileUrl: x.fileUrl }),
}));
jest.mock("@/app/lib/notificationHelpers", () => ({ createNotification: jest.fn(), getAdminUserIds: jest.fn() }));
jest.mock("@/app/lib/currency", () => ({ sanitizePrices: (p) => p, emptyPrices: () => ({}) }));
jest.mock("@/app/lib/customPlacementTests", () => ({
  getPlacementLinksForCourses: jest.fn().mockRejectedValue(new Error("placement down")),
}));
jest.mock("@/app/lib/courseGrants", () => ({
  parseGrantedEmails: jest.fn(), resolveGrantRecipients: jest.fn(), grantCourseAccess: jest.fn(),
  notifyGrantedStudents: jest.fn(), MAX_GRANT_EMAILS: 50,
}));
jest.mock("@/app/lib/access", () => ({ getCourseAccessForUser: (...a) => mockAccess(...a) }));

import { GET as getCourse } from "@/app/api/courses/[id]/route";
import { GET as getSections } from "@/app/api/courses/[id]/sections/route";

const ID = "507f1f77bcf86cd799439044";
const oid = (s) => ({ toString: () => s });
const params = (id = ID) => ({ params: Promise.resolve({ id }) });
const baseCourse = (over = {}) => ({
  _id: oid(ID), title: "T", status: "published", teacher: null, category: null, subcategory: null,
  prices: { EGP: 0 }, ...over,
});
const lean = (v) => ({ lean: () => Promise.resolve(v) });
const sorted = (v) => ({ sort: () => lean(v) });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(null);
});

describe("GET /api/courses/[id]", () => {
  test("populate بيفشل → 200 (مش 500)", async () => {
    mockCourseFindById.mockResolvedValue({ ...baseCourse(), populate: async () => { throw new Error("cast failed"); } });
    const res = await getCourse(new Request("http://x"), params());
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(ID);
  });

  test("كورس published من غير مدرّس/تصنيف → 200", async () => {
    mockCourseFindById.mockResolvedValue({ ...baseCourse(), populate: async function () { return this; } });
    const res = await getCourse(new Request("http://x"), params());
    expect(res.status).toBe(200);
  });

  test("كورس draft من غير مدرّس + أدمن → مايقعش (مش 500)", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    mockCourseFindById.mockResolvedValue({ ...baseCourse({ status: "draft" }), populate: async function () { return this; } });
    const res = await getCourse(new Request("http://x"), params());
    expect(res.status).toBe(200);
  });

  test("كورس غير موجود → 404", async () => {
    mockCourseFindById.mockResolvedValue(null);
    mockCourseRawFindOne.mockResolvedValue(null);
    const res = await getCourse(new Request("http://x"), params());
    expect(res.status).toBe(404);
  });

  test("id مش ObjectId (كورس اتحط يدوي) → بيتلاقي عن طريق driver", async () => {
    mockCourseRawFindOne.mockResolvedValue(baseCourse({ _id: oid("legacy-id") }));
    const res = await getCourse(new Request("http://x"), params("legacy-id"));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/courses/[id]/sections", () => {
  beforeEach(() => {
    mockCourseFindById.mockReturnValue(lean(baseCourse()));
    mockSectionFind.mockReturnValue(sorted([{ _id: oid("s1"), title: "S1", order: 1 }]));
  });

  test("درس يتيم من غير section → 200 والدروس السليمة تفضل", async () => {
    mockLessonFind.mockReturnValue(sorted([
      { _id: oid("l1"), section: null, title: "orphan", type: "video" },
      { _id: oid("l2"), section: oid("s1"), title: "ok", type: "video", isPreview: true, videoUrl: "v" },
    ]));
    const res = await getSections(new Request("http://x"), params());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].lessons.map((l) => l.id)).toEqual(["l2"]);
  });

  test("فحص الوصول بيفشل → 200 ومحتوى الدروس المحمية مخفي", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "student1", role: "student" } });
    mockAccess.mockRejectedValue(new Error("membership db error"));
    mockLessonFind.mockReturnValue(sorted([
      { _id: oid("l2"), section: oid("s1"), title: "locked", type: "video", isPreview: false, videoUrl: "secret" },
    ]));
    const res = await getSections(new Request("http://x"), params());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].lessons[0].videoUrl).toBeUndefined();
  });

  test("كورس مفيهوش أقسام → [] مش خطأ", async () => {
    mockSectionFind.mockReturnValue(sorted([]));
    mockLessonFind.mockReturnValue(sorted([]));
    const res = await getSections(new Request("http://x"), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
