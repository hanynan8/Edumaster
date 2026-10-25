// app/lib/courseGrants.test.js
//
// 🆕 اختبارات التسجيل المجاني من الموديريتور (app/lib/courseGrants.js):
//   - parseGrantedEmails: تنضيف/تكرار/إيميلات غلط.
//   - resolveGrantRecipients: الإيميلات المسجّلة vs غير المسجّلة.
//   - grantCourseAccess: بيسجّل الجداد بس (bulk upsert)، بيستبعد المدرّس/المنشئ،
//     بيفعّل الـ cancelled تاني، وبيزوّد studentsCount بعدد الجداد بس.
//   - notifyGrantedStudents: إشعار لكل اللي اتسجّلوا بمنحة.

const mockBulkWrite = jest.fn();
const mockEnrollFind = jest.fn();
const mockUpdateMany = jest.fn();
const mockCourseUpdate = jest.fn();
const mockAuthFind = jest.fn();
const mockNotifyMany = jest.fn();

jest.mock("@/app/lib/models", () => ({
  getEnrollmentModel: () => ({
    bulkWrite: (...a) => mockBulkWrite(...a),
    find: (...a) => mockEnrollFind(...a),
    updateMany: (...a) => mockUpdateMany(...a),
  }),
  getCourseModel: () => ({ findByIdAndUpdate: (...a) => mockCourseUpdate(...a) }),
}));
jest.mock("@/app/lib/mongodb", () => ({
  getAuthModel: () => ({ find: (...a) => mockAuthFind(...a) }),
}));
jest.mock("@/app/lib/notificationHelpers", () => ({
  createNotificationsForUsers: (...a) => mockNotifyMany(...a),
}));

import {
  parseGrantedEmails,
  resolveGrantRecipients,
  grantCourseAccess,
  notifyGrantedStudents,
  GRANT_SOURCE,
} from "@/app/lib/courseGrants";

const leanOf = (rows) => ({ lean: () => Promise.resolve(rows) });
const course = { _id: "c1", title: "Spanish A1", teacher: "t1", createdBy: "m1" };
const u = (id) => ({ id, email: `${id}@x.com`, name: id });

beforeEach(() => {
  jest.clearAllMocks();
  mockEnrollFind.mockReturnValue(leanOf([])); // مفيش cancelled افتراضيًا
});

describe("parseGrantedEmails", () => {
  it("بينضّف ويشيل التكرار ويفصل الغلط", () => {
    const { emails, invalid } = parseGrantedEmails(" A@x.com, b@x.com\na@X.com; nope ");
    expect(emails).toEqual(["a@x.com", "b@x.com"]);
    expect(invalid).toEqual(["nope"]);
  });
  it("بيقبل array وفاضي", () => {
    expect(parseGrantedEmails(["a@x.com"]).emails).toEqual(["a@x.com"]);
    expect(parseGrantedEmails(undefined)).toEqual({ emails: [], invalid: [] });
  });
});

describe("resolveGrantRecipients", () => {
  it("بيفصل المسجّلين عن غير المسجّلين", async () => {
    mockAuthFind.mockReturnValue(leanOf([{ _id: "u1", email: "A@x.com", name: "A" }]));
    const res = await resolveGrantRecipients(["a@x.com", "ghost@x.com"]);
    expect(res.users).toEqual([{ id: "u1", email: "a@x.com", name: "A" }]);
    expect(res.unknown).toEqual(["ghost@x.com"]);
  });
  it("بيدوّر في حسابات الطلاب بس (مدرّس/موديريتور/أدمن بيترفضوا)", async () => {
    mockAuthFind.mockReturnValue(leanOf([]));
    const res = await resolveGrantRecipients(["teacher@x.com"]);
    expect(res.unknown).toEqual(["teacher@x.com"]);
    const [filter] = mockAuthFind.mock.calls[0];
    expect(filter.$or).toEqual([{ role: "student" }, { role: { $exists: false } }, { role: null }]);
  });
  it("قايمة فاضية = من غير أي query", async () => {
    expect(await resolveGrantRecipients([])).toEqual({ users: [], unknown: [] });
    expect(mockAuthFind).not.toHaveBeenCalled();
  });
});

describe("grantCourseAccess", () => {
  it("بيسجّل الجداد بمصدر moderator_grant ويزوّد studentsCount بعددهم بس", async () => {
    mockBulkWrite.mockResolvedValue({ upsertedIds: { 0: "e1", 2: "e3" } }); // 0 و 2 جداد، 1 كان مسجّل
    const res = await grantCourseAccess({ course, users: [u("s1"), u("s2"), u("s3")], grantedBy: "m1" });

    expect(res.granted).toBe(2);
    expect(res.alreadyEnrolled).toBe(1);
    expect(res.grantedUserIds).toEqual(["s1", "s3"]);
    expect(mockCourseUpdate).toHaveBeenCalledWith("c1", { $inc: { studentsCount: 2 } });

    const ops = mockBulkWrite.mock.calls[0][0];
    expect(ops).toHaveLength(3);
    expect(ops[0].updateOne.upsert).toBe(true);
    expect(ops[0].updateOne.update.$setOnInsert).toMatchObject({ source: GRANT_SOURCE, status: "active", grantedBy: "m1" });
  });

  it("بيستبعد مدرّس الكورس ومنشئه", async () => {
    mockBulkWrite.mockResolvedValue({ upsertedIds: { 0: "e1" } });
    const res = await grantCourseAccess({ course, users: [u("t1"), u("m1"), u("s1")], grantedBy: "m1" });
    expect(res.skipped).toBe(2);
    expect(mockBulkWrite.mock.calls[0][0]).toHaveLength(1);
    expect(res.grantedUserIds).toEqual(["s1"]);
  });

  it("من غير طلاب مؤهّلين مابيعملش أي كتابة", async () => {
    const res = await grantCourseAccess({ course, users: [u("t1")], grantedBy: "m1" });
    expect(res.granted).toBe(0);
    expect(mockBulkWrite).not.toHaveBeenCalled();
    expect(mockCourseUpdate).not.toHaveBeenCalled();
  });

  it("بيفعّل التسجيل الملغي تاني وبيحسبه جديد", async () => {
    mockBulkWrite.mockResolvedValue({ upsertedIds: {} });
    mockEnrollFind.mockReturnValue(leanOf([{ _id: "e9", user: "s1" }]));
    const res = await grantCourseAccess({ course, users: [u("s1")], grantedBy: "m1" });

    expect(mockUpdateMany).toHaveBeenCalledWith(
      { _id: { $in: ["e9"] } },
      { $set: { status: "active", source: GRANT_SOURCE, grantedBy: "m1" } }
    );
    expect(res.granted).toBe(1);
    expect(mockCourseUpdate).toHaveBeenCalledWith("c1", { $inc: { studentsCount: 1 } });
  });

  it("الكل مسجّل بالفعل: studentsCount مايتغيّرش", async () => {
    mockBulkWrite.mockResolvedValue({ upsertedIds: {} });
    const res = await grantCourseAccess({ course, users: [u("s1")], grantedBy: "m1" });
    expect(res).toMatchObject({ granted: 0, alreadyEnrolled: 1 });
    expect(mockCourseUpdate).not.toHaveBeenCalled();
  });
});

describe("notifyGrantedStudents", () => {
  it("بيبعت لكل اللي اتسجّلوا بمنحة لما userIds مش متحددة", async () => {
    mockEnrollFind.mockReturnValue(leanOf([{ user: "s1" }, { user: "s2" }]));
    const n = await notifyGrantedStudents({ course });
    expect(n).toBe(2);
    expect(mockEnrollFind.mock.calls[0][0]).toMatchObject({ course: "c1", source: GRANT_SOURCE });
    expect(mockNotifyMany).toHaveBeenCalledWith(
      ["s1", "s2"],
      expect.objectContaining({ type: "course_access_granted", key: "course_access_granted", link: "/courses/c1" })
    );
  });

  it("مفيش منح = مفيش إشعارات", async () => {
    mockEnrollFind.mockReturnValue(leanOf([]));
    expect(await notifyGrantedStudents({ course })).toBe(0);
    expect(mockNotifyMany).not.toHaveBeenCalled();
  });
});
