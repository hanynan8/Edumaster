// app/lib/meetingNotify.test.js
//
// إشعارات تغيير/إلغاء المحاضرات: المستلمين + الصياغة.

const mockAuthFind = jest.fn();
const mockCreate = jest.fn();
const mockEnrolled = jest.fn();
const mockAll = jest.fn();

jest.mock("@/app/lib/mongodb", () => ({ getAuthModel: () => ({ find: mockAuthFind }) }));
jest.mock("@/app/lib/notificationHelpers", () => ({
  createNotificationsForUsers: (...a) => mockCreate(...a),
  getEnrolledUserIds: (...a) => mockEnrolled(...a),
  getAllUserIds: (...a) => mockAll(...a),
}));

import { getMeetingRecipientIds, notifyMeetingChange } from "./meetingNotify";

const lean = (v) => ({ lean: () => Promise.resolve(v) });
const courseMeeting = {
  title: "Grammar",
  course: "c1",
  scheduledAt: new Date("2026-10-20T10:00:00Z"),
  invitedEmails: ["guest@x.com"],
};

describe("getMeetingRecipientIds", () => {
  it("كورس: المسجّلين + المدعوين من غير تكرار ومن غير المنفّذ", async () => {
    mockEnrolled.mockResolvedValue(["s1", "s2", "actor"]);
    mockAuthFind.mockReturnValue(lean([{ _id: "g1" }, { _id: "s2" }]));
    const ids = await getMeetingRecipientIds(courseMeeting, { excludeUserId: "actor" });
    expect(ids.sort()).toEqual(["g1", "s1", "s2"]);
  });
  it("جلسة عامة: كل المستخدمين", async () => {
    mockAll.mockResolvedValue(["a", "b"]);
    const ids = await getMeetingRecipientIds({ ...courseMeeting, course: null }, {});
    expect(ids).toEqual(["a", "b"]);
    expect(mockEnrolled).not.toHaveBeenCalled();
  });
});

describe("notifyMeetingChange", () => {
  it("بيبعت إشعار إلغاء لسلسلة بعدد المحاضرات", async () => {
    mockEnrolled.mockResolvedValue(["s1"]);
    mockAuthFind.mockReturnValue(lean([]));
    mockCreate.mockResolvedValue([{}]);
    await notifyMeetingChange({ meeting: courseMeeting, kind: "cancelled", actorId: "t1", count: 5 });
    const [ids, payload] = mockCreate.mock.calls[0];
    expect(ids).toEqual(["s1"]);
    expect(payload.type).toBe("meeting_scheduled");
    expect(payload.title).toContain("5");
    expect(payload.course).toBe("c1");
  });
  it("مفيش مستلمين = مفيش إنشاء إشعارات", async () => {
    mockEnrolled.mockResolvedValue([]);
    mockAuthFind.mockReturnValue(lean([]));
    expect(await notifyMeetingChange({ meeting: { ...courseMeeting, invitedEmails: [] }, kind: "rescheduled", actorId: "t1" })).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it("فشل داخلي مايرميش خطأ", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockEnrolled.mockRejectedValue(new Error("db down"));
    await expect(notifyMeetingChange({ meeting: courseMeeting, kind: "cancelled", actorId: "t1" })).resolves.toBe(0);
  });
});
