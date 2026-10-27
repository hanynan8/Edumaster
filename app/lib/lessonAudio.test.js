// app/lib/lessonAudio.test.js
//
// 🆕 دروس الأوديو (lesson.type === "audio"):
//   - sanitizeLessonAudioUrl: بيقبل بس ملفات Bunny Storage بتاعتنا تحت /edumaster/،
//     وبيشيل توكن التوقيع قبل التخزين.
//   - POST /api/sections/[id]/lessons و PUT /api/lessons/[id]: نفس القواعد.

const mockGetServerSession = jest.fn();
const mockSectionFindById = jest.fn();
const mockCourseFindById = jest.fn();
const mockLessonCreate = jest.fn();
const mockLessonCount = jest.fn();
const mockLessonFindById = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/models", () => ({
  getSectionModel: () => ({ findById: (...a) => ({ lean: () => mockSectionFindById(...a) }) }),
  getCourseModel: () => ({ findById: (...a) => mockCourseFindById(...a) }),
  getLessonModel: () => ({
    create: (...a) => mockLessonCreate(...a),
    countDocuments: (...a) => mockLessonCount(...a),
    findById: (...a) => mockLessonFindById(...a),
  }),
}));
jest.mock("@/app/lib/courseHelpers", () => ({ recomputeCourseTotals: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/access", () => ({ getCourseAccessForUser: jest.fn() }));

const HOST = "cdn.example-pull.net";
const SECTION_ID = "507f1f77bcf86cd799439011";
const COURSE_ID = "507f1f77bcf86cd799439022";
const TEACHER_ID = "507f1f77bcf86cd799439033";
const LESSON_ID = "507f1f77bcf86cd799439044";
const AUDIO_URL = `https://${HOST}/edumaster/teachers/${TEACHER_ID}/audio/1700000000-lecture.mp3`;

beforeAll(() => {
  process.env.BUNNY_STORAGE_PULL_ZONE_HOSTNAME = HOST;
});

const asUser = (role, id = TEACHER_ID) => mockGetServerSession.mockResolvedValue({ user: { id, role } });

describe("sanitizeLessonAudioUrl", () => {
  let sanitizeLessonAudioUrl;
  beforeAll(async () => {
    ({ sanitizeLessonAudioUrl } = await import("@/app/lib/lessonAudio"));
  });

  it("بيقبل ملف Bunny Storage بتاعنا", () => {
    expect(sanitizeLessonAudioUrl(AUDIO_URL)).toEqual({ ok: true, url: AUDIO_URL });
  });

  it("بيشيل توكن التوقيع (?token=&expires=) قبل التخزين", () => {
    const signed = `${AUDIO_URL}?token=abc123&expires=1900000000`;
    expect(sanitizeLessonAudioUrl(signed)).toEqual({ ok: true, url: AUDIO_URL });
  });

  it("بيرفض الفاضي (missing_audio_url)", () => {
    expect(sanitizeLessonAudioUrl("")).toEqual({ ok: false, error: "missing_audio_url" });
    expect(sanitizeLessonAudioUrl(null)).toEqual({ ok: false, error: "missing_audio_url" });
  });

  it("بيرفض أي دومين تاني، ومسار برّه /edumaster/، و path traversal", () => {
    const bad = [
      "https://evil.example.com/edumaster/x.mp3",
      `https://${HOST}/other-folder/x.mp3`,
      `https://${HOST}/edumaster/../secret/x.mp3`,
      "javascript:alert(1)",
    ];
    for (const url of bad) {
      expect(sanitizeLessonAudioUrl(url)).toEqual({ ok: false, error: "invalid_audio_url" });
    }
  });
});

describe("POST /api/sections/[id]/lessons — audio", () => {
  let POST;
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/sections/[id]/lessons/route.js"));
  });

  beforeEach(() => {
    mockSectionFindById.mockResolvedValue({ _id: SECTION_ID, course: COURSE_ID });
    mockCourseFindById.mockResolvedValue({ _id: COURSE_ID, teacher: TEACHER_ID, status: "draft" });
    mockLessonCount.mockResolvedValue(0);
    mockLessonCreate.mockImplementation(async (doc) => ({
      _id: { toString: () => LESSON_ID },
      section: { toString: () => SECTION_ID },
      course: { toString: () => COURSE_ID },
      ...doc,
    }));
  });

  const call = (body) =>
    POST(
      new Request(`http://x/api/sections/${SECTION_ID}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: SECTION_ID }) }
    );

  it("بينشئ درس صوتي ويخزّن الرابط في fileUrl (من غير videoUrl/textContent)", async () => {
    asUser("teacher");
    const res = await call({ title: "Lecture 1", type: "audio", fileUrl: `${AUDIO_URL}?token=t&expires=1`, durationSeconds: 125 });
    expect(res.status).toBe(201);
    const saved = mockLessonCreate.mock.calls[0][0];
    expect(saved).toMatchObject({
      type: "audio",
      fileUrl: AUDIO_URL,
      videoUrl: null,
      videoProvider: null,
      textContent: null,
      durationSeconds: 125,
    });
    expect((await res.json()).type).toBe("audio");
  });

  it("الموديريتور كمان يقدر ينشئ درس صوتي", async () => {
    asUser("moderator", "507f1f77bcf86cd799439099");
    expect((await call({ title: "L", type: "audio", fileUrl: AUDIO_URL })).status).toBe(201);
  });

  it("بيرفض درس صوتي من غير ملف (400 missing_audio_url)", async () => {
    asUser("teacher");
    const res = await call({ title: "L", type: "audio" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_audio_url");
    expect(mockLessonCreate).not.toHaveBeenCalled();
  });

  it("بيرفض رابط مش بتاعنا (400 invalid_audio_url)", async () => {
    asUser("teacher");
    const res = await call({ title: "L", type: "audio", fileUrl: "https://evil.example.com/a.mp3" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_audio_url");
    expect(mockLessonCreate).not.toHaveBeenCalled();
  });

  it("الـ PDF لسه شغال زي ما هو", async () => {
    asUser("teacher");
    const res = await call({ title: "Notes", type: "pdf", fileUrl: "https://x/y.pdf" });
    expect(res.status).toBe(201);
    expect(mockLessonCreate.mock.calls[0][0].fileUrl).toBe("https://x/y.pdf");
  });
});

describe("PUT /api/lessons/[id] — audio", () => {
  let PUT;
  beforeAll(async () => {
    ({ PUT } = await import("@/app/api/lessons/[id]/route.js"));
  });

  function lessonDoc(overrides = {}) {
    const doc = {
      _id: { toString: () => LESSON_ID },
      section: { toString: () => SECTION_ID },
      course: COURSE_ID,
      title: "Lecture",
      type: "audio",
      fileUrl: AUDIO_URL,
      videoUrl: null,
      videoProvider: null,
      textContent: null,
      durationSeconds: 60,
      isPreview: false,
      order: 0,
      save: jest.fn().mockResolvedValue(),
      ...overrides,
    };
    return doc;
  }

  beforeEach(() => {
    mockCourseFindById.mockResolvedValue({ _id: COURSE_ID, teacher: TEACHER_ID, status: "draft" });
  });

  const call = (body) =>
    PUT(
      new Request(`http://x/api/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: LESSON_ID }) }
    );

  it("تعديل العنوان بس (من غير ما الرابط يتغيّر) بيعدّي عادي", async () => {
    asUser("teacher");
    const lesson = lessonDoc();
    mockLessonFindById.mockResolvedValue(lesson);
    const res = await call({ title: "New title" });
    expect(res.status).toBe(200);
    expect(lesson.title).toBe("New title");
    expect(lesson.fileUrl).toBe(AUDIO_URL);
  });

  it("استبدال الملف الصوتي بيتخزّن من غير توكن التوقيع", async () => {
    asUser("teacher");
    const lesson = lessonDoc();
    mockLessonFindById.mockResolvedValue(lesson);
    const newUrl = `https://${HOST}/edumaster/teachers/${TEACHER_ID}/audio/2-new.mp3`;
    const res = await call({ type: "audio", fileUrl: `${newUrl}?token=zzz&expires=9` });
    expect(res.status).toBe(200);
    expect(lesson.fileUrl).toBe(newUrl);
    expect(lesson.save).toHaveBeenCalled();
  });

  it("تحويل درس PDF لدرس صوتي من غير ملف صوتي → 400 ومفيش حفظ", async () => {
    asUser("teacher");
    const lesson = lessonDoc({ type: "pdf", fileUrl: null });
    mockLessonFindById.mockResolvedValue(lesson);
    const res = await call({ type: "audio" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_audio_url");
    expect(lesson.save).not.toHaveBeenCalled();
  });

  it("رابط مش بتاعنا → 400 invalid_audio_url ومفيش حفظ", async () => {
    asUser("teacher");
    const lesson = lessonDoc();
    mockLessonFindById.mockResolvedValue(lesson);
    const res = await call({ fileUrl: "https://evil.example.com/a.mp3" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_audio_url");
    expect(lesson.save).not.toHaveBeenCalled();
  });

  it("type=audio مقبول كنوع صالح، و type غريب لسه مرفوض", async () => {
    asUser("teacher");
    mockLessonFindById.mockResolvedValue(lessonDoc({ type: "text", fileUrl: null }));
    expect((await call({ type: "podcast" })).status).toBe(400);
  });
});
