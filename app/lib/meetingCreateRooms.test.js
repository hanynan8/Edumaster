// app/lib/meetingCreateRooms.test.js
//
// إنشاء محاضرة/سلسلة: كل غرفة Daily لازم تتسمّى من _id المحاضرة اللي هتتخزّن بيها بالظبط.

const mockInsertMany = jest.fn();
const mockCreateRoom = jest.fn();

jest.mock("@/app/lib/models", () => ({
  getMeetingModel: () => ({
    find: () => ({ lean: () => Promise.resolve([]) }),
    insertMany: (...a) => mockInsertMany(...a),
  }),
}));
jest.mock("@/app/lib/mongodb", () => ({ getAuthModel: () => ({ find: () => ({ lean: () => Promise.resolve([]) }) }) }));
jest.mock("@/app/lib/notificationHelpers", () => ({ createNotificationsForUsers: jest.fn() }));
jest.mock("@/app/lib/emailHelpers", () => ({ sendMeetingInviteEmails: jest.fn() }));
jest.mock("@/app/lib/daily", () => {
  const actual = jest.requireActual("@/app/lib/daily");
  return {
    ...actual,
    isDailyConfigured: () => true,
    createDailyRoom: (...a) => mockCreateRoom(...a),
    deleteDailyRoom: jest.fn(),
  };
});

import { createMeetingOrSeries } from "./meetingCreate";

describe("createMeetingOrSeries — أسماء الغرف", () => {
  beforeEach(() => {
    mockCreateRoom.mockImplementation(async ({ name }) => ({
      joinUrl: `https://edumaster365.daily.co/${name}`,
      roomName: name,
    }));
    mockInsertMany.mockImplementation(async (docs) => docs);
  });

  it("كل غرفة في السلسلة اسمها edu-<_id المحاضرة> والرابط والاسم متخزّنين مع نفس الـ _id", async () => {
    const start = new Date(Date.now() + 3 * 24 * 3600_000);
    const result = await createMeetingOrSeries({
      teacherId: "6aca30b2f9d1bf39a5face86",
      courseId: "6ad8e9e96ee79a1b23d15c18",
      body: {
        title: "Nivel A2.2",
        scheduledAt: start.toISOString(),
        durationMinutes: 130,
        timeZone: "Africa/Cairo",
        recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1, 3, 5], endType: "count", count: 4 },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.meetings).toHaveLength(4);
    expect(mockCreateRoom).toHaveBeenCalledTimes(4);

    const createdNames = mockCreateRoom.mock.calls.map(([a]) => a.name).sort();
    const storedNames = result.meetings.map((m) => `edu-${m._id}`).sort();
    expect(createdNames).toEqual(storedNames);

    for (const m of result.meetings) {
      expect(m.dailyRoomName).toBe(`edu-${m._id}`);
      expect(m.link).toBe(`https://edumaster365.daily.co/edu-${m._id}`);
      expect(m.source).toBe("daily");
    }
    // كل المحاضرات ليها _id مختلف → أسماء غرف مختلفة (مفيش غرفة مشتركة بين محاضرتين).
    expect(new Set(storedNames).size).toBe(4);
  });
});
