// app/lib/meetingRoutes.test.js
//
// اختبارات الـ routes اللي اتعدّلت: webhook التسجيلات (إضافة ذرّية) والـ cron (حجز ذرّي).

const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockFind = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockNotify = jest.fn();
const mockEmails = jest.fn();

jest.mock("@/app/lib/mongodb", () => ({
  connectToMongo: jest.fn().mockResolvedValue(),
  getAuthModel: () => ({ find: () => ({ lean: () => Promise.resolve([]) }) }),
}));
jest.mock("@/app/lib/models", () => ({
  getMeetingModel: () => ({
    findOne: (...a) => mockFindOne(...a),
    updateOne: (...a) => mockUpdateOne(...a),
    find: (...a) => mockFind(...a),
    findOneAndUpdate: (...a) => mockFindOneAndUpdate(...a),
  }),
  getCourseModel: jest.fn(),
}));
jest.mock("@/app/lib/notificationHelpers", () => ({
  createNotificationsForUsers: (...a) => mockNotify(...a),
  getEnrolledUserIds: jest.fn().mockResolvedValue(["s1"]),
  getAllUserIds: jest.fn().mockResolvedValue(["a"]),
}));
jest.mock("@/app/lib/emailHelpers", () => ({
  sendMeetingReminderEmails: (...a) => mockEmails(...a),
}));
jest.mock("@/app/lib/dailyWebhook", () => ({ isValidDailySignature: () => true }));

const lean = (v) => ({ lean: () => Promise.resolve(v) });

describe("POST /api/webhooks/daily", () => {
  let POST;
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/webhooks/daily/route.js"));
  });
  const req = (body) => new Request("http://x/api/webhooks/daily", { method: "POST", body: JSON.stringify(body) });

  it("طلب التحقق {test:'test'} بيرجع 200", async () => {
    expect((await POST(req({ test: "test" }))).status).toBe(200);
  });
  it("بيضيف التسجيل بـ updateOne ذرّي بشرط $ne", async () => {
    mockFindOne.mockReturnValue(lean({ _id: "m1" }));
    mockUpdateOne.mockResolvedValue({});
    const res = await POST(
      req({ type: "recording.ready-to-download", payload: { room_name: "r1", recording_id: "rec1", duration: 90 } })
    );
    expect(res.status).toBe(200);
    const [filter, update] = mockUpdateOne.mock.calls[0];
    expect(filter["recordings.dailyRecordingId"]).toEqual({ $ne: "rec1" });
    expect(update.$push.recordings.dailyRecordingId).toBe("rec1");
  });
  it("محاضرة مش موجودة = تجاهل هادي", async () => {
    mockFindOne.mockReturnValue(lean(null));
    const res = await POST(
      req({ type: "recording.ready-to-download", payload: { room_name: "gone", recording_id: "x" } })
    );
    expect((await res.json()).ignored).toBe(true);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/meeting-reminders", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/cron/meeting-reminders/route.js"));
  });
  const meeting = {
    _id: "m1",
    title: "Grammar",
    course: { _id: "c1", title: "Spanish" },
    scheduledAt: new Date(Date.now() + 10 * 60_000),
    invitedEmails: [],
  };
  const query = (rows) => ({ populate: () => ({ lean: () => Promise.resolve(rows) }) });

  it("لو التشغيلة التانية حجزت المحاضرة قبلنا، مابنبعتش حاجة", async () => {
    mockFind.mockReturnValue(query([meeting]));
    mockFindOneAndUpdate.mockResolvedValue(null);
    const res = await GET(new Request("http://x"));
    expect((await res.json()).processed).toBe(0);
    expect(mockNotify).not.toHaveBeenCalled();
  });
  it("لو حجزناها بنبعت إشعار + إيميل Batch مرة واحدة", async () => {
    mockFind.mockReturnValue(query([meeting]));
    mockFindOneAndUpdate.mockResolvedValue({ _id: "m1" });
    mockNotify.mockResolvedValue([{}]);
    mockEmails.mockResolvedValue(0);
    const res = await GET(new Request("http://x"));
    const body = await res.json();
    expect(body.processed).toBe(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockEmails).toHaveBeenCalledTimes(1);
  });
  it("فشل المعالجة بيفك الحجز", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockFind.mockReturnValue(query([meeting]));
    mockFindOneAndUpdate.mockResolvedValue({ _id: "m1" });
    mockNotify.mockRejectedValue(new Error("db"));
    mockUpdateOne.mockResolvedValue({});
    await GET(new Request("http://x"));
    expect(mockUpdateOne).toHaveBeenCalledWith({ _id: "m1" }, { reminderSentAt: null });
  });
});
