// app/lib/meetingConflict.test.js
//
// اختبار فحص تعارض مواعيد المدرس + رفض المواعيد في الماضي (meetingCreate.js).

const mockFind = jest.fn();

jest.mock("@/app/lib/models", () => ({ getMeetingModel: () => ({ find: mockFind }) }));
jest.mock("@/app/lib/mongodb", () => ({ getAuthModel: () => ({}) }));
jest.mock("@/app/lib/daily", () => ({
  isDailyConfigured: () => false,
  createDailyRoom: jest.fn(),
  deleteDailyRoom: jest.fn(),
}));
jest.mock("@/app/lib/notificationHelpers", () => ({ createNotificationsForUsers: jest.fn() }));
jest.mock("@/app/lib/emailHelpers", () => ({ sendMeetingInviteEmails: jest.fn() }));

import { findTeacherConflict, isInPast, PAST_GRACE_MS } from "./meetingCreate";

const MIN = 60 * 1000;
const base = new Date("2026-10-12T10:00:00Z");
const existing = (offsetMin, duration = 60, title = "Existing") => ({
  title,
  scheduledAt: new Date(base.getTime() + offsetMin * MIN),
  durationMinutes: duration,
});

function leanReturn(value) {
  return { lean: () => Promise.resolve(value) };
}

describe("findTeacherConflict", () => {
  it("بيرجّع null لو مفيش محاضرات تانية", async () => {
    mockFind.mockReturnValue(leanReturn([]));
    expect(await findTeacherConflict({ teacherId: "t1", slots: [{ start: base, durationMinutes: 60 }] })).toBeNull();
  });

  it("بيكشف التداخل الجزئي", async () => {
    mockFind.mockReturnValue(leanReturn([existing(30, 60, "Algebra")]));
    const c = await findTeacherConflict({ teacherId: "t1", slots: [{ start: base, durationMinutes: 60 }] });
    expect(c?.title).toBe("Algebra");
  });

  it("المحاضرة اللي بتبدأ بالظبط لما اللي قبلها تخلص مش تعارض", async () => {
    mockFind.mockReturnValue(leanReturn([existing(-60, 60)])); // تخلص 10:00
    expect(await findTeacherConflict({ teacherId: "t1", slots: [{ start: base, durationMinutes: 60 }] })).toBeNull();
  });

  it("محاضرة طويلة بتبدأ قبل الشباك وبتغطي الفترة الجديدة = تعارض", async () => {
    mockFind.mockReturnValue(leanReturn([existing(-120, 240)]));
    expect(await findTeacherConflict({ teacherId: "t1", slots: [{ start: base, durationMinutes: 30 }] })).not.toBeNull();
  });

  it("بيستبعد المحاضرات المعدّلة نفسها في الاستعلام", async () => {
    mockFind.mockReturnValue(leanReturn([]));
    await findTeacherConflict({ teacherId: "t1", slots: [{ start: base, durationMinutes: 60 }], excludeIds: ["a", "b"] });
    expect(mockFind.mock.calls[0][0]._id).toEqual({ $nin: ["a", "b"] });
  });

  it("بيرجّع null من غير استعلام لو مفيش slots", async () => {
    expect(await findTeacherConflict({ teacherId: "t1", slots: [] })).toBeNull();
    expect(mockFind).not.toHaveBeenCalled();
  });
});

describe("isInPast", () => {
  const now = base.getTime();
  it("هامش 5 دقايق مسموح", () => expect(isInPast(new Date(now - PAST_GRACE_MS + 1000), now)).toBe(false));
  it("أكتر من الهامش = ماضي", () => expect(isInPast(new Date(now - PAST_GRACE_MS - 1000), now)).toBe(true));
  it("المستقبل مش ماضي", () => expect(isInPast(new Date(now + 60 * MIN), now)).toBe(false));
});
