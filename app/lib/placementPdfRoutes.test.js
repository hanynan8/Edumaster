// app/lib/placementPdfRoutes.test.js
//
// رفع الاختبارات بالـ PDF/TXT عن طريق الـ routes:
//   - import: بيعرف نوع الملف من محتواه (PDF / TXT / XLSX)، معاينة + حفظ، وأخطاء برقم السطر، ونوع غير مدعوم = 400.
//   - template: ?format=pdf (الافتراضي) / txt / xlsx.
//   - custom/export: ?format=pdf|txt بيرجّع اختبار موجود بنفس الصيغة وبيتقري تاني بنفس الأسئلة.

const mockGetServerSession = jest.fn();
const mockGetDoc = jest.fn();
const mockSave = jest.fn();

jest.mock("next-auth", () => ({ getServerSession: (...a) => mockGetServerSession(...a) }));
jest.mock("@/app/lib/authOptions", () => ({ authOptions: {} }));
jest.mock("@/app/lib/rateLimit", () => ({ enforceRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/app/lib/mongodb", () => ({ connectToMongo: jest.fn().mockResolvedValue() }));
jest.mock("@/app/lib/auditLog", () => ({ logAudit: jest.fn() }));
jest.mock("@/app/lib/models", () => ({ getCourseModel: jest.fn(), getCategoryModel: jest.fn() }));
jest.mock("@/app/lib/customPlacementTests", () => {
  const actual = jest.requireActual("@/app/lib/customPlacementTests");
  return { ...actual, getCustomTestDoc: (...a) => mockGetDoc(...a), saveCustomTest: (...a) => mockSave(...a) };
});

import { buildSampleTemplatePdf, buildSampleTemplateText } from "@/app/lib/placementTestPdfTemplate";
import { buildSampleTemplate, SAMPLE_TEST } from "@/app/lib/placementTestTemplate";
import { parsePlacementTestPdf } from "@/app/lib/placementTestPdfParser";

const asAdmin = () => mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "admin" } });

function uploadReq(buffer, name, fields = {}) {
  const form = new FormData();
  form.append("file", new File([buffer], name));
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Request("http://x/api/admin/placement-tests/import", { method: "POST", body: form });
}

describe("POST /api/admin/placement-tests/import", () => {
  let POST;
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/admin/placement-tests/import/route.js"));
  });
  beforeEach(() => {
    asAdmin();
    mockGetDoc.mockResolvedValue(null);
    mockSave.mockResolvedValue({ created: true, status: "published" });
  });

  it("PDF: معاينة ناجحة + المفتاح مبيرجعش في الرد", async () => {
    const res = await POST(uploadReq(await buildSampleTemplatePdf(), "t.pdf"));
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.format).toBe("pdf");
    expect(data.summary).toMatchObject({ id: "sample-b1", questions: 11, audioSlots: 3 });
    expect(JSON.stringify(data)).not.toMatch(/answerKey|scripts/);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("PDF: mode=save بيحفظ الاختبار", async () => {
    const res = await POST(uploadReq(await buildSampleTemplatePdf(), "t.pdf", { mode: "save", status: "draft" }));
    const data = await res.json();
    expect(data).toMatchObject({ ok: true, saved: true, format: "pdf" });
    const [test, opts] = mockSave.mock.calls[0];
    expect(test.id).toBe("sample-b1");
    expect(opts).toEqual({ mode: "create", status: "draft" });
  });

  it("TXT بيتقري كمان، وأخطاؤه برقم السطر", async () => {
    const ok = await (await POST(uploadReq(Buffer.from(buildSampleTemplateText()), "t.txt"))).json();
    expect(ok).toMatchObject({ ok: true, format: "txt" });
    const bad = await (await POST(uploadReq(Buffer.from("TEST: x1 | LEVEL: B1 | TITLE: t\nPART: P\nTASK: T\nQ: x?\na) 1\nb) 2\nANSWER: z\n"), "t.txt"))).json();
    expect(bad.ok).toBe(false);
    expect(bad.errors[0].line).toBe(4);
  });

  it("XLSX القديم لسه شغال", async () => {
    const data = await (await POST(uploadReq(await buildSampleTemplate(), "t.xlsx"))).json();
    expect(data).toMatchObject({ ok: true, format: "xlsx" });
  });

  it("نوع غير مدعوم (أو txt من غير امتداد) = 400", async () => {
    const res = await POST(uploadReq(Buffer.from("hello"), "t.docx"));
    expect(res.status).toBe(400);
    expect((await res.json()).errors[0].ar).toMatch(/مش مدعوم/);
  });

  it("PDF تالف = خطأ واضح مش 500", async () => {
    const data = await (await POST(uploadReq(Buffer.from("%PDF-1.4 garbage"), "t.pdf"))).json();
    expect(data.ok).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
  });

  it("غير الأدمن مرفوض", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u2", role: "student" } });
    expect((await POST(uploadReq(Buffer.from("x"), "t.txt"))).status).toBe(403);
  });
});

describe("GET /api/admin/placement-tests/template", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/admin/placement-tests/template/route.js"));
  });
  beforeEach(asAdmin);
  const get = (qs = "") => GET(new Request(`http://x/api/admin/placement-tests/template${qs}`));

  it("الافتراضي PDF، و txt و xlsx بالـ format", async () => {
    const pdf = await get();
    expect(pdf.headers.get("Content-Type")).toBe("application/pdf");
    expect(pdf.headers.get("Content-Disposition")).toMatch(/level-test-template\.pdf/);
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
    const txt = await get("?format=txt");
    expect(txt.headers.get("Content-Type")).toMatch(/text\/plain/);
    expect(await txt.text()).toMatch(/^# HOW TO USE/);
    const xlsx = await get("?format=xlsx");
    expect(xlsx.headers.get("Content-Type")).toMatch(/spreadsheetml/);
  });
});

describe("GET /api/admin/placement-tests/custom/export?format=", () => {
  let GET;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/admin/placement-tests/custom/export/route.js"));
  });
  beforeEach(() => {
    asAdmin();
    mockGetDoc.mockResolvedValue({ testId: "sample-b1", label: "B1", title: SAMPLE_TEST.title, subject: "en", thresholds: SAMPLE_TEST.thresholds, parts: SAMPLE_TEST.parts, answerKey: SAMPLE_TEST.answerKey, audioSlots: SAMPLE_TEST.audioSlots, scripts: SAMPLE_TEST.scripts });
  });
  const get = (qs) => GET(new Request(`http://x/api/admin/placement-tests/custom/export?id=sample-b1${qs}`));

  it("pdf بيتقري تاني بنفس الأسئلة والإجابات والأوديو", async () => {
    const res = await get("&format=pdf");
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const r = await parsePlacementTestPdf(Buffer.from(await res.arrayBuffer()));
    expect(r.errors).toEqual([]);
    expect(r.test.parts).toEqual(SAMPLE_TEST.parts);
    expect(r.test.answerKey).toEqual(SAMPLE_TEST.answerKey);
    expect(r.test.scripts).toEqual(SAMPLE_TEST.scripts);
  });

  it("txt، والافتراضي لسه xlsx", async () => {
    expect((await get("&format=txt")).headers.get("Content-Type")).toMatch(/text\/plain/);
    expect((await get("")).headers.get("Content-Type")).toMatch(/spreadsheetml/);
  });
});
