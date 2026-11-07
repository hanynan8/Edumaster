// app/lib/meetingPutRoom.test.js
//
// PUT /api/meetings/[id]: تعديل موعد محاضرة Daily بيصحّح معاد نفس الغرفة بنفس اسمها،
// ومايكتبش dailyRoomName/link جديدين أبدًا (الاستبدال القديم كان بيقسّم المدرس عن الطلاب).

const MEETING_ID = "6adcafe51c2ca373fd022f40";
const NAME = `edu-${MEETING_ID}`;
const LINK = `https://edumaster365.daily.co/${NAME}`;

const mockFindById = jest.fn();
const mockFind = jest.fn();
const mockEnsure = jest.fn();

jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue(), getAuthModel: () => ({}) }));
jest.mock("@/app/lib/models", () => ({
  getMeetingModel: () => ({ findById: (...a) => mockFindById(...a), find: (...a) => mockFind(...a) }),
  getCourseModel: () => ({ findById: () => ({ lean: () => Promise.resolve({ title: "A2.2" }) }) }),
}));
jest.mock("@/app/lib/rbac", () => ({
  requireSession: () => Promise.resolve({ session: { user: { id: "admin1", name: "Admin" } } }),
  isMeetingStaff: () => true,
}));
jest.mock("@/app/lib/meetingNotify", () => ({ notifyMeetingChange: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/notificationHelpers", () => ({ createNotificationsForUsers: jest.fn() }));
jest.mock("@/app/lib/emailHelpers", () => ({ sendMeetingInviteEmails: jest.fn() }));
jest.mock("@/app/lib/daily", () => {
  const actual = jest.requireActual("@/app/lib/daily");
  return { ...actual, ensureDailyRoom: (...a) => mockEnsure(...a), deleteDailyRoom: jest.fn() };
});

function makeMeeting() {
  const start = new Date(Date.now() + 3 * 24 * 3600_000);
  const doc = {
    _id: { toString: () => MEETING_ID },
    teacher: "t1",
    course: "c1",
    title: "Nivel A2.2",
    description: "",
    source: "daily",
    dailyRoomName: NAME,
    link: LINK,
    scheduledAt: start,
    durationMinutes: 130,
    invitedEmails: [],
    seriesId: null,
    recurrence: null,
    recordings: [],
    reminderSentAt: null,
    save: jest.fn().mockResolvedValue(),
  };
  return doc;
}

describe("PUT /api/meetings/[id] — غرفة Daily", () => {
  let PUT;
  beforeAll(async () => {
    ({ PUT } = await import("@/app/api/meetings/[id]/route.js"));
  });
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockFind.mockReturnValue({ lean: () => Promise.resolve([]) }); // مفيش تعارض مواعيد
    mockEnsure.mockResolvedValue({ joinUrl: LINK, roomName: NAME, created: false, scheduleSyncError: null });
  });
  afterEach(() => jest.restoreAllMocks());

  const put = (body) =>
    PUT(
      new Request(`http://x/api/meetings/${MEETING_ID}`, { method: "PUT", body: JSON.stringify(body) }),
      { params: Promise.resolve({ id: MEETING_ID }) }
    );

  it("تغيير الموعد → ensureDailyRoom بنفس اسم الغرفة، والاسم/الرابط ما بيتغيّروش", async () => {
    const meeting = makeMeeting();
    mockFindById.mockResolvedValue(meeting);
    const newDate = new Date(meeting.scheduledAt.getTime() + 2 * 24 * 3600_000);

    const res = await put({ scheduledAt: newDate.toISOString() });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.warning).toBeUndefined();
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockEnsure.mock.calls[0][0].name).toBe(NAME);
    expect(meeting.scheduledAt.getTime()).toBe(newDate.getTime());
    expect(meeting.dailyRoomName).toBe(NAME);
    expect(meeting.link).toBe(LINK);
  });

  it("حساب Daily مختلف → تحذير وتفضل بيانات الغرفة زي ما هي", async () => {
    const meeting = makeMeeting();
    mockFindById.mockResolvedValue(meeting);
    mockEnsure.mockResolvedValue({
      joinUrl: `https://edumaster.daily.co/${NAME}`,
      roomName: NAME,
      created: true,
      scheduleSyncError: null,
    });
    const newDate = new Date(meeting.scheduledAt.getTime() + 24 * 3600_000);

    const body = await (await put({ scheduledAt: newDate.toISOString() })).json();

    expect(body.warning).toMatch(/DAILY_API_KEY/);
    expect(meeting.dailyRoomName).toBe(NAME);
    expect(meeting.link).toBe(LINK);
  });

  it("تعديل العنوان بس → مفيش تعامل مع Daily خالص", async () => {
    const meeting = makeMeeting();
    mockFindById.mockResolvedValue(meeting);
    const res = await put({ title: "Nivel A2.2 (new)", scheduledAt: meeting.scheduledAt.toISOString() });
    expect(res.status).toBe(200);
    expect(mockEnsure).not.toHaveBeenCalled();
  });
  describe("🔒 تغيير اللينك أثناء/قبل المحاضرة", () => {
    const NEW_LINK = "https://zoom.us/j/123456789";

    it("محاضرة شغالة دلوقتي → 409 link_locked_during_meeting ومفيش مسح ولا تحويل", async () => {
      const meeting = makeMeeting();
      meeting.scheduledAt = new Date(Date.now() - 10 * 60_000); // بدأت من 10 دقايق
      mockFindById.mockResolvedValue(meeting);

      const res = await put({ link: NEW_LINK });
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.error).toBe("link_locked_during_meeting");
      expect(meeting.save).not.toHaveBeenCalled();
      expect(meeting.source).toBe("daily");
      expect(meeting.dailyRoomName).toBe(NAME);
      expect(meeting.link).toBe(LINK);
    });

    it("بتبدأ بعد 30 دقيقة → برضه ممنوع", async () => {
      const meeting = makeMeeting();
      meeting.scheduledAt = new Date(Date.now() + 30 * 60_000);
      mockFindById.mockResolvedValue(meeting);

      const res = await put({ link: NEW_LINK });
      expect(res.status).toBe(409);
      expect(meeting.save).not.toHaveBeenCalled();
    });

    it("بعد 3 أيام (برا القفل) → مسموح ويتحوّل manual", async () => {
      const meeting = makeMeeting(); // بعد 3 أيام
      mockFindById.mockResolvedValue(meeting);

      const res = await put({ link: NEW_LINK });

      expect(res.status).toBe(200);
      expect(meeting.source).toBe("manual");
      expect(meeting.link).toBe(NEW_LINK);
      expect(meeting.dailyRoomName).toBeNull();
    });

    it("نفس اللينك الحالي مبعوت مع محاضرة شغالة (الواجهة بتبعته) → مش بيتحسب تغيير ومفيش 409", async () => {
      const meeting = makeMeeting();
      meeting.scheduledAt = new Date(Date.now() - 10 * 60_000);
      mockFindById.mockResolvedValue(meeting);

      const res = await put({ link: LINK, title: "عنوان جديد", scheduledAt: meeting.scheduledAt.toISOString() });

      expect(res.status).toBe(200);
      expect(meeting.source).toBe("daily");
      expect(meeting.link).toBe(LINK);
    });
  });
});
