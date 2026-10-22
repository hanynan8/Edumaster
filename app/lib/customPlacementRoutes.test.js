// app/lib/customPlacementRoutes.test.js
//
// routes الاختبارات المخصصة (B1, B2, ...):
//   - أدمن: القايمة / تعديل الحالة وربط الكورسات / الحذف (أرشفة) / تصدير Excel / قايمة الكورسات / صوتيات الاختبار المخصص.
//   - عام: GET /api/placement-tests/custom/[testId] — من غير مفتاح الإجابات ولا نصوص التسجيلات، ومنشور بس.

const mockGetServerSession = jest.fn();
const mockListCustomTests = jest.fn();
const mockUpdateMeta = jest.fn();
const mockDelete = jest.fn();
const mockGetDoc = jest.fn();
const mockResolve = jest.fn();
const mockCourseFind = jest.fn();
const mockSetAudioTrack = jest.fn();
const mockGetAudioTracks = jest.fn();
const mockGetAudioMap = jest.fn();
const mockLogAudit = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/auditLog", () => ({ logAudit: (...a) => mockLogAudit(...a) }));
jest.mock("@/app/lib/models", () => ({ getCourseModel: () => ({ find: (...a) => mockCourseFind(...a) }) }));
jest.mock("@/app/lib/bunny", () => ({
  uploadToStorage: jest.fn().mockResolvedValue(),
  isBunnyStorageConfigured: () => true,
  buildStoragePublicUrl: (p) => `https://cdn.test/${p}`,
  resolveSecureStoredUrl: (u) => u,
}));
jest.mock("@/app/lib/placementTest", () => ({
  getAudioTracks: (...a) => mockGetAudioTracks(...a),
  setAudioTrack: (...a) => mockSetAudioTrack(...a),
  getAudioMap: (...a) => mockGetAudioMap(...a),
}));
jest.mock("@/app/lib/customPlacementTests", () => {
  const actual = jest.requireActual("@/app/lib/customPlacementTests");
  return {
    ...actual,
    listCustomTests: (...a) => mockListCustomTests(...a),
    updateCustomTestMeta: (...a) => mockUpdateMeta(...a),
    deleteCustomTest: (...a) => mockDelete(...a),
    getCustomTestDoc: (...a) => mockGetDoc(...a),
    resolveTest: (...a) => mockResolve(...a),
  };
});

const { SAMPLE_TEST } = require("@/app/lib/placementTestTemplate");
const { docToDef } = jest.requireActual("@/app/lib/customPlacementTests");

const asRole = (role) => mockGetServerSession.mockResolvedValue(role ? { user: { id: "u1", role, email: "a@b.c" } } : null);
const json = (body, method = "POST") =>
  new Request("http://x/api", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// مستند اختبار زي اللي في الداتابيز (من اختبار القالب)
const DOC = {
  testId: "sample-b1",
  label: SAMPLE_TEST.label,
  title: SAMPLE_TEST.title,
  subject: SAMPLE_TEST.subject,
  thresholds: SAMPLE_TEST.thresholds,
  parts: SAMPLE_TEST.parts,
  answerKey: SAMPLE_TEST.answerKey,
  scripts: SAMPLE_TEST.scripts,
  audioSlots: SAMPLE_TEST.audioSlots,
  status: "published",
  courseIds: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListCustomTests.mockResolvedValue([{ id: "sample-b1", status: "published", courseIds: ["c1"] }]);
});

describe("/api/admin/placement-tests/custom", () => {
  let GET, PATCH, DELETE;
  beforeAll(async () => {
    ({ GET, PATCH, DELETE } = await import("@/app/api/admin/placement-tests/custom/route.js"));
  });

  it("غير الأدمن مرفوض (401/403)", async () => {
    asRole(null);
    expect((await GET()).status).toBe(401);
    asRole("student");
    expect((await GET()).status).toBe(403);
    expect((await PATCH(json({ id: "x", status: "draft" }, "PATCH"))).status).toBe(403);
    expect(mockUpdateMeta).not.toHaveBeenCalled();
  });

  it("GET بيرجّع القايمة", async () => {
    asRole("admin");
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).tests).toHaveLength(1);
  });

  it("PATCH بيعدّل الحالة والكورسات وبيسجّل في الـ audit", async () => {
    asRole("admin");
    mockUpdateMeta.mockResolvedValue({ ok: true });
    const res = await PATCH(json({ id: "Sample-B1", status: "draft", courseIds: ["507f1f77bcf86cd799439011"] }, "PATCH"));
    expect(res.status).toBe(200);
    expect(mockUpdateMeta).toHaveBeenCalledWith("sample-b1", { status: "draft", courseIds: ["507f1f77bcf86cd799439011"] });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "placement_test.updated", targetId: "sample-b1" }));
  });

  it("PATCH: أخطاء الـ lib بتتحوّل لأكواد HTTP مناسبة", async () => {
    asRole("admin");
    mockUpdateMeta.mockResolvedValueOnce({ error: "not_found" });
    expect((await PATCH(json({ id: "nope", status: "draft" }, "PATCH"))).status).toBe(404);
    mockUpdateMeta.mockResolvedValueOnce({ error: "invalid_status" });
    expect((await PATCH(json({ id: "x", status: "zzz" }, "PATCH"))).status).toBe(400);
    expect((await PATCH(json({ id: "x" }, "PATCH"))).status).toBe(400); // مفيش حاجة تتعدّل
    expect((await PATCH(json({ status: "draft" }, "PATCH"))).status).toBe(400); // من غير id
  });

  it("DELETE: بيرجّع archived لو اتأرشف (فيه نتايج طلاب)", async () => {
    asRole("admin");
    mockDelete.mockResolvedValueOnce({ ok: true, archived: true });
    const res = await DELETE(new Request("http://x/api?id=sample-b1", { method: "DELETE" }));
    expect((await res.json()).archived).toBe(true);
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "placement_test.archived" }));
    mockDelete.mockResolvedValueOnce({ error: "not_found" });
    expect((await DELETE(new Request("http://x/api?id=zz", { method: "DELETE" }))).status).toBe(404);
  });
});

describe("GET /api/admin/placement-tests/custom/export", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/admin/placement-tests/custom/export/route.js"));
  });

  it("أدمن بس + 404 لو الاختبار مش موجود", async () => {
    asRole("student");
    expect((await GET(new Request("http://x/api?id=sample-b1"))).status).toBe(403);
    asRole("admin");
    mockGetDoc.mockResolvedValue(null);
    expect((await GET(new Request("http://x/api?id=nope"))).status).toBe(404);
  });

  it("بيرجّع ملف xlsx صالح (zip) بالاسم الصح، وبيتقرا تاني بنفس الأسئلة والمفتاح", async () => {
    asRole("admin");
    mockGetDoc.mockResolvedValue(DOC);
    const res = await GET(new Request("http://x/api?id=sample-b1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("level-test-sample-b1.xlsx");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString()).toBe("PK");

    const { parsePlacementTestWorkbook } = await import("@/app/lib/placementTestImport");
    const parsed = await parsePlacementTestWorkbook(buf);
    expect(parsed.ok).toBe(true);
    expect(parsed.test.id).toBe("sample-b1");
    expect(parsed.test.answerKey).toEqual(SAMPLE_TEST.answerKey);
    expect(parsed.stats.questions).toBe(Object.keys(SAMPLE_TEST.answerKey).length);
  });
});

describe("GET /api/admin/placement-tests/courses", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/admin/placement-tests/courses/route.js"));
  });

  it("بيرجّع الكورسات ومعاها الاختبار المربوط حاليًا", async () => {
    asRole("admin");
    mockCourseFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: () =>
            Promise.resolve([
              { _id: { toString: () => "c1" }, title: "Course 1", slug: "c1", language: "en", status: "published" },
              { _id: { toString: () => "c2" }, title: "Course 2", slug: "c2", language: "es", status: "draft" },
            ]),
        }),
      }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const { courses } = await res.json();
    expect(courses.find((c) => c.id === "c1").linkedTestId).toBe("sample-b1");
    expect(courses.find((c) => c.id === "c2").linkedTestId).toBeNull();
    asRole("student");
    expect((await GET()).status).toBe(403);
  });
});

describe("GET /api/placement-tests/custom/[testId] (عام)", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/placement-tests/custom/[testId]/route.js"));
  });
  const call = (id) => GET(new Request("http://x/api"), { params: Promise.resolve({ testId: id }) });

  it("🔒 بيرجّع الأسئلة من غير مفتاح الإجابات ولا نصوص التسجيلات", async () => {
    const def = docToDef(DOC);
    mockResolve.mockResolvedValue({ id: "sample-b1", ref: def, custom: true, def });
    mockGetAudioMap.mockResolvedValue({ 1: "https://cdn.test/a1.mp3" });
    const res = await call("sample-b1");
    expect(res.status).toBe(200);
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body.audio).toEqual({ 1: "https://cdn.test/a1.mp3" });
    expect(body.test.parts.length).toBeGreaterThan(0);
    expect(body.test.levels.map((l) => l.code)).toEqual(["Pre-B1", "B1.1", "B1.2", "B1.3"]);
    expect(body.test).not.toHaveProperty("answerKey");
    expect(body.test).not.toHaveProperty("scripts");
    expect(text).not.toContain("Shop assistant"); // نص التسجيل
    expect(body.test.audioSlots[0]).toEqual({ slot: 1, label: expect.any(String) }); // من غير hint/script
  });

  it("مش موجود / مخفي / a1 المدمج → 404", async () => {
    mockResolve.mockResolvedValueOnce(null);
    expect((await call("hidden")).status).toBe(404);
    mockResolve.mockResolvedValueOnce({ id: "a1", ref: "a1", custom: false });
    expect((await call("a1")).status).toBe(404);
  });
});

describe("/api/admin/placement-tests/audio — اختبار مخصص", () => {
  let GET, DELETE;
  beforeAll(async () => {
    ({ GET, DELETE } = await import("@/app/api/admin/placement-tests/audio/route.js"));
  });

  it("GET: خانات الاختبار المخصص من تعريفه + نصوص التسجيلات للأدمن", async () => {
    asRole("admin");
    const def = docToDef(DOC);
    mockResolve.mockResolvedValue({ id: "sample-b1", ref: def, custom: true, def });
    mockGetAudioTracks.mockResolvedValue({ 2: { path: "p/2.mp3", name: "m.mp3", size: 5, uploadedAt: "2026-01-01" } });
    const res = await GET(new Request("http://x/api?test=sample-b1"));
    const body = await res.json();
    expect(Object.keys(body.tracks)).toEqual(["1", "2", "3"]);
    expect(body.tracks[2].url).toBe("https://cdn.test/p/2.mp3");
    expect(body.tracks[1]).toBeNull();
    expect(body.scripts[1]).toContain("Shop assistant");
  });

  it("اختبار مخصص مش موجود → 404، وخانة خارج تعريفه → 400", async () => {
    asRole("admin");
    mockResolve.mockResolvedValueOnce(null);
    expect((await GET(new Request("http://x/api?test=nope"))).status).toBe(404);

    const def = docToDef(DOC);
    mockResolve.mockResolvedValue({ id: "sample-b1", ref: def, custom: true, def });
    const bad = await DELETE(new Request("http://x/api?test=sample-b1&slot=9", { method: "DELETE" }));
    expect(bad.status).toBe(400);
    expect(mockSetAudioTrack).not.toHaveBeenCalled();
    mockGetAudioTracks.mockResolvedValue({});
    const ok = await DELETE(new Request("http://x/api?test=sample-b1&slot=2", { method: "DELETE" }));
    expect(ok.status).toBe(200);
    expect(mockSetAudioTrack).toHaveBeenCalledWith(2, null, def);
  });
});
