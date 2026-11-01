// app/lib/meetingRestricted.test.js
//
// 🔒 لايف كورس "للطلاب المختارين بس" (Meeting.restrictToInvited):
//   - الموديريتور بيختار كورس + طلاب → اللايف يظهر ويتفتح للمختارين بس، وطالب مشترك في الكورس
//     مش مختار مايشوفوش ولا يقدر يدخله.
//   - من غير طلاب مختارين → زي الأول: لكل طلاب الكورس.
//   - الجلسات العامة (من غير كورس) مش بتتقيّد.
//   - المحاضرات القديمة (من غير الحقل) سلوكها ما اتغيّرش.

const mockGetServerSession = jest.fn();
const mockMeetingFind = jest.fn();
const mockCourseFindById = jest.fn();
const mockEnrollmentFind = jest.fn();
const mockAccess = jest.fn();
const mockAuthFind = jest.fn();
const mockEnrolledIds = jest.fn();
const mockAllIds = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/mongodb", () => ({
  connectToMongo: jest.fn().mockResolvedValue(),
  getAuthModel: () => ({ find: (...a) => mockAuthFind(...a) }),
}));
jest.mock("@/app/lib/models", () => ({
  getMeetingModel: () => ({ find: (...a) => mockMeetingFind(...a) }),
  getCourseModel: () => ({ findById: (...a) => mockCourseFindById(...a) }),
  getEnrollmentModel: () => ({ find: (...a) => mockEnrollmentFind(...a) }),
}));
jest.mock("@/app/lib/access", () => ({ getCourseAccessForUser: (...a) => mockAccess(...a) }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/bunny", () => ({ resolveSecureStoredUrl: (u) => u }));
jest.mock("@/app/lib/notificationHelpers", () => ({
  createNotificationsForUsers: jest.fn().mockResolvedValue([]),
  getEnrolledUserIds: (...a) => mockEnrolledIds(...a),
  getAllUserIds: (...a) => mockAllIds(...a),
}));
jest.mock("@/app/lib/emailHelpers", () => ({
  sendMeetingScheduledEmails: jest.fn(),
  sendMeetingInviteEmails: jest.fn(),
}));
jest.mock("@/app/lib/meetingCreate", () => ({
  createMeetingOrSeries: jest.fn(),
  sendInvitations: jest.fn(),
}));

import {
  isMeetingRestricted,
  shouldRestrictToInvited,
  checkMeetingAccess,
} from "./meetingInvites";
import { getMeetingRecipientIds } from "./meetingNotify";
import { GET as getMyMeetings } from "@/app/api/meetings/route";
import { GET as getCourseMeetings } from "@/app/api/courses/[id]/meetings/route";
import { GET as getInvitees } from "@/app/api/meetings/invitees/route";

const COURSE_ID = "507f1f77bcf86cd799439011";
const asUser = (user) => mockGetServerSession.mockResolvedValue({ user });
const student = { id: "s1", role: "student", email: "Student@X.com" };
const moderator = { id: "m1", role: "moderator", email: "mod@x.com" };

// find(query).populate().populate().sort().lean()  /  find(query).sort().lean()
const meetingChain = (rows = []) => {
  const c = { populate: () => c, sort: () => c, lean: () => Promise.resolve(rows) };
  return c;
};
const lean = (v) => ({ lean: () => Promise.resolve(v) });

beforeEach(() => {
  jest.clearAllMocks();
  mockMeetingFind.mockReturnValue(meetingChain());
  mockCourseFindById.mockReturnValue(lean({ _id: COURSE_ID, teacher: "t1" }));
  mockEnrollmentFind.mockReturnValue(lean([{ course: COURSE_ID }]));
  mockAccess.mockResolvedValue({ hasAccess: true });
});

describe("isMeetingRestricted / shouldRestrictToInvited", () => {
  it("كورس + restrictToInvited=true → مقيّد", () => {
    expect(isMeetingRestricted({ course: "c1", restrictToInvited: true })).toBe(true);
  });
  it("محاضرة قديمة (من غير الحقل) أو false → مش مقيّدة", () => {
    expect(isMeetingRestricted({ course: "c1" })).toBe(false);
    expect(isMeetingRestricted({ course: "c1", restrictToInvited: false })).toBe(false);
  });
  it("جلسة عامة مش بتتقيّد أبدًا حتى لو الحقل true", () => {
    expect(isMeetingRestricted({ course: null, restrictToInvited: true })).toBe(false);
  });
  it("كورس + طلاب مختارين → يتقيّد؛ من غير طلاب أو من غير كورس → لأ", () => {
    expect(shouldRestrictToInvited({ course: "c1", invitedEmails: ["a@x.com"] })).toBe(true);
    expect(shouldRestrictToInvited({ course: "c1", invitedEmails: [] })).toBe(false);
    expect(shouldRestrictToInvited({ course: null, invitedEmails: ["a@x.com"] })).toBe(false);
  });
});

describe("checkMeetingAccess — لايف للطلاب المختارين بس", () => {
  const restricted = { course: "c1", restrictToInvited: true, invitedEmails: ["picked@x.com"] };
  const base = {
    isManager: false,
    findCourse: jest.fn().mockResolvedValue({ _id: "c1" }),
    getCourseAccess: jest.fn().mockResolvedValue({ hasAccess: true }),
  };

  it("طالب مشترك في الكورس بس مش مختار → 403 not_invited (ومن غير حتى فحص الكورس)", async () => {
    const r = await checkMeetingAccess({ ...base, meeting: restricted, session: { user: { id: "s1", email: "other@x.com" } } });
    expect(r).toMatchObject({ allowed: false, status: 403, error: "forbidden", reason: "not_invited" });
    expect(base.getCourseAccess).not.toHaveBeenCalled();
  });
  it("الطالب المختار (الإيميل بحروف مختلفة) → مسموح", async () => {
    const r = await checkMeetingAccess({ ...base, meeting: restricted, session: { user: { id: "s2", email: "Picked@X.com" } } });
    expect(r).toEqual({ allowed: true });
  });
  it("الإدارة تدخل دايمًا", async () => {
    const r = await checkMeetingAccess({ ...base, isManager: true, meeting: restricted, session: { user: { id: "m1", email: "m@x.com" } } });
    expect(r).toEqual({ allowed: true });
  });
  it("لايف كورس عادي (مش مقيّد): طالب الكورس يدخل بفحص الكورس", async () => {
    const open = { course: "c1", restrictToInvited: false, invitedEmails: [] };
    const r = await checkMeetingAccess({ ...base, meeting: open, session: { user: { id: "s1", email: "o@x.com" } } });
    expect(r).toEqual({ allowed: true });
    expect(base.getCourseAccess).toHaveBeenCalled();
  });
});

describe("getMeetingRecipientIds", () => {
  it("لايف مقيّد: المختارين بس — مسجّلو الكورس مش بيتبلّغوا", async () => {
    mockAuthFind.mockReturnValue(lean([{ _id: "p1" }]));
    const ids = await getMeetingRecipientIds({ course: "c1", restrictToInvited: true, invitedEmails: ["p@x.com"] }, {});
    expect(ids).toEqual(["p1"]);
    expect(mockEnrolledIds).not.toHaveBeenCalled();
  });
  it("لايف عادي: مسجّلو الكورس زي الأول", async () => {
    mockEnrolledIds.mockResolvedValue(["s1", "s2"]);
    mockAuthFind.mockReturnValue(lean([]));
    const ids = await getMeetingRecipientIds({ course: "c1", invitedEmails: [] }, {});
    expect(ids.sort()).toEqual(["s1", "s2"]);
  });
});

describe("GET /api/meetings (محاضراتي)", () => {
  it("الطالب: لايف الكورس بيظهر بشرط مش مقيّد، أو لو إيميله ضمن المدعوين", async () => {
    asUser(student);
    await getMyMeetings();
    const query = mockMeetingFind.mock.calls[0][0];
    expect(query.$or).toEqual([
      { course: { $in: [COURSE_ID] }, restrictToInvited: { $ne: true } },
      { course: null },
      { invitedEmails: "student@x.com" },
    ]);
  });
  it("الموديريتور بيشوف كل الاجتماعات (من غير فلتر)", async () => {
    asUser(moderator);
    await getMyMeetings();
    expect(mockMeetingFind.mock.calls[0][0]).toEqual({});
  });
});

describe("GET /api/courses/[id]/meetings", () => {
  const call = () => getCourseMeetings(new Request("http://x"), { params: Promise.resolve({ id: COURSE_ID }) });

  it("الطالب المشترك: لايف مقيّد مايظهرلهوش إلا لو مدعو", async () => {
    asUser(student);
    await call();
    expect(mockMeetingFind.mock.calls[0][0]).toEqual({
      course: COURSE_ID,
      $or: [{ restrictToInvited: { $ne: true } }, { invitedEmails: "student@x.com" }],
    });
  });
  it("الموديريتور بيشوف كل لايفات الكورس", async () => {
    asUser(moderator);
    await call();
    expect(mockMeetingFind.mock.calls[0][0]).toEqual({ course: COURSE_ID });
  });
});

describe("GET /api/meetings/invitees?courseId= (منتقي الطلاب)", () => {
  const authChain = (rows = []) => {
    const c = { sort: () => c, skip: () => c, limit: () => c, lean: () => Promise.resolve(rows) };
    return c;
  };
  const call = (qs) => getInvitees(new Request(`http://x/api/meetings/invitees?${qs}`));

  it("بيحصر القايمة في طلاب الكورس (enrollment غير ملغي) بس", async () => {
    asUser(moderator);
    mockEnrollmentFind.mockReturnValue(lean([{ user: "s1" }, { user: "s2" }, { user: "s1" }]));
    mockAuthFind.mockReturnValue(authChain([{ _id: "s1", name: "A", email: "a@x.com", role: "student" }]));
    const res = await call(`courseId=${COURSE_ID}`);
    expect(res.status).toBe(200);
    expect(mockEnrollmentFind.mock.calls[0][0]).toEqual({ course: COURSE_ID, status: { $ne: "cancelled" } });
    expect(mockAuthFind.mock.calls[0][0]._id).toEqual({ $ne: "m1", $in: ["s1", "s2"] });
  });
  it("كورس من غير طلاب → قايمة فاضية", async () => {
    asUser(moderator);
    mockEnrollmentFind.mockReturnValue(lean([]));
    const res = await call(`courseId=${COURSE_ID}`);
    expect(await res.json()).toEqual({ users: [], hasMore: false });
    expect(mockAuthFind).not.toHaveBeenCalled();
  });
  it("courseId غير صالح → 400", async () => {
    asUser(moderator);
    const res = await call("courseId=nope");
    expect(res.status).toBe(400);
  });
  it("الطالب مايقدرش يستخدم المنتقي → 403", async () => {
    asUser(student);
    const res = await call(`courseId=${COURSE_ID}`);
    expect(res.status).toBe(403);
  });
});
