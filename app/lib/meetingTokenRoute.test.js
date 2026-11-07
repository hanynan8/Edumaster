// app/lib/meetingTokenRoute.test.js
//
// اختبار GET /api/meetings/[id]/token بعد حذف الـ self-heal القديم:
// الراوت مايكتبش أي حاجة في الميتنج أبدًا، والرابط/الاسم دايمًا من الداتابيز،
// وسيرفر بحساب Daily مختلف بيتمنع (409) بدل ما يقسّم المدرس عن الطلاب.

const MEETING_ID = "6adcafe51c2ca373fd022f40";
const LINK = `https://edumaster365.daily.co/edu-${MEETING_ID}`;

const mockFindById = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockEnsure = jest.fn();
const mockToken = jest.fn();

jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/models", () => ({
  getMeetingModel: () => ({
    findById: (...a) => mockFindById(...a),
    findOneAndUpdate: (...a) => mockFindOneAndUpdate(...a),
  }),
  getCourseModel: () => ({ findById: () => ({ lean: () => Promise.resolve({ _id: "c1" }) }) }),
}));
jest.mock("@/app/lib/rbac", () => ({
  requireSession: () => Promise.resolve({ session: { user: { id: "u1", name: "Teacher" } } }),
  isMeetingStaff: () => false,
  isMeetingRoomHost: () => true,
}));
jest.mock("@/app/lib/access", () => ({ getCourseAccessForUser: jest.fn() }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: () => Promise.resolve(null) }));
jest.mock("@/app/lib/meetingInvites", () => ({ checkMeetingAccess: () => Promise.resolve({ allowed: true }) }));
jest.mock("@/app/lib/daily", () => {
  const actual = jest.requireActual("@/app/lib/daily");
  return {
    ...actual,
    ensureDailyRoom: (...a) => mockEnsure(...a),
    createMeetingToken: (...a) => mockToken(...a),
  };
});

function meetingDoc(overrides = {}) {
  return {
    _id: MEETING_ID,
    source: "daily",
    dailyRoomName: `edu-${MEETING_ID}`,
    link: LINK,
    course: "c1",
    scheduledAt: new Date(Date.now() + 5 * 60_000),
    durationMinutes: 60,
    ...overrides,
  };
}
const goneError = () => Object.assign(new Error("room gone"), { dailyStatus: 404, dailyReason: "not-found" });

describe("GET /api/meetings/[id]/token", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/meetings/[id]/token/route.js"));
  });
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockFindById.mockResolvedValue(meetingDoc());
    mockEnsure.mockResolvedValue({ joinUrl: LINK, roomName: `edu-${MEETING_ID}`, created: false, scheduleSyncError: null });
    mockToken.mockResolvedValue("tok-1");
  });
  afterEach(() => jest.restoreAllMocks());

  const call = () =>
    GET(new Request(`http://x/api/meetings/${MEETING_ID}/token`), { params: Promise.resolve({ id: MEETING_ID }) });

  it("الحالة العادية: توكن + الرابط والاسم من الداتابيز، ومفيش كتابة في الميتنج", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "tok-1", url: LINK, roomName: `edu-${MEETING_ID}` });
    expect(mockEnsure.mock.calls[0][0].name).toBe(`edu-${MEETING_ID}`);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("الغرفة اتعملت من جديد → نفس الاسم ونفس الرابط (مفيش تبديل)", async () => {
    mockEnsure.mockResolvedValue({ joinUrl: LINK, roomName: `edu-${MEETING_ID}`, created: true, scheduleSyncError: null });
    const body = await (await call()).json();
    expect(body.url).toBe(LINK);
    expect(body.roomName).toBe(`edu-${MEETING_ID}`);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("المدرس بيدخل الأول والغرفة بتتعمل من جديد (404)، وبعده الطالب → نفس الرابط ونفس الغرفة بالظبط", async () => {
    const name = `edu-${MEETING_ID}`;
    // أول نداء (المدرس): الغرفة كانت ممسوحة فاتعملت. التاني (الطالب): موجودة.
    mockEnsure
      .mockResolvedValueOnce({ joinUrl: LINK, roomName: name, created: true, scheduleSyncError: null })
      .mockResolvedValueOnce({ joinUrl: LINK, roomName: name, created: false, scheduleSyncError: null });

    const teacher = await (await call()).json();
    const student = await (await call()).json();

    expect(teacher.url).toBe(student.url);
    expect(teacher.roomName).toBe(student.roomName);
    expect(teacher.url).toBe(LINK);
    expect(mockEnsure.mock.calls[0][0].name).toBe(name);
    expect(mockEnsure.mock.calls[1][0].name).toBe(name);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("سيرفر بحساب Daily مختلف → 409 ومفيش توكن", async () => {
    mockEnsure.mockResolvedValue({
      joinUrl: `https://edumaster.daily.co/edu-${MEETING_ID}`,
      roomName: `edu-${MEETING_ID}`,
      created: true,
      scheduleSyncError: null,
    });
    const res = await call();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("daily_account_mismatch");
    expect(mockToken).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("فشل التأكد من الغرفة (شبكة/5xx) → 502 بدون إنشاء أي حاجة", async () => {
    mockEnsure.mockRejectedValue(new Error("daily_get_room_error: HTTP 503"));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("internal_error");
    expect(mockToken).not.toHaveBeenCalled();
  });

  it("الغرفة اتمسحت بين التأكد والتوكن → بتتعاد بنفس الاسم وتتحاول مرة تانية", async () => {
    mockToken.mockRejectedValueOnce(goneError()).mockResolvedValueOnce("tok-2");
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBe("tok-2");
    expect(mockEnsure).toHaveBeenCalledTimes(2);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("محاضرة ليست Daily → 400", async () => {
    mockFindById.mockResolvedValue(meetingDoc({ source: "manual", dailyRoomName: null }));
    expect((await call()).status).toBe(400);
  });
});
