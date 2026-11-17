// app/lib/fileKind.test.js
//
// 🆕 FileViewer: أنهي ملفات تتعرض داخل المنصة وأنهي تتحمّل بس.

const { detectFileKind, officeViewerUrl } = require("./fileKind");

describe("detectFileKind", () => {
  it("PDF (حتى لو الرابط موقّع بـ ?token=)", () => {
    expect(detectFileKind("https://z.b-cdn.net/edumaster/files/a.pdf")).toBe("pdf");
    expect(detectFileKind("https://z.b-cdn.net/edumaster/files/A.PDF?token=abc&expires=1")).toBe("pdf");
  });

  it("صور", () => {
    for (const ext of ["png", "jpg", "jpeg", "gif", "webp"]) {
      expect(detectFileKind(`https://z.b-cdn.net/i/x.${ext}`)).toBe("image");
    }
  });

  it("ملفات Office", () => {
    for (const ext of ["doc", "docx", "ppt", "pptx", "xls", "xlsx"]) {
      expect(detectFileKind(`https://z.b-cdn.net/f/x.${ext}`)).toBe("office");
    }
  });

  it("zip / SVG / من غير امتداد / فاضي = تحميل بس", () => {
    expect(detectFileKind("https://z.b-cdn.net/f/x.zip")).toBe("other");
    expect(detectFileKind("https://z.b-cdn.net/f/x.svg")).toBe("other");
    expect(detectFileKind("https://z.b-cdn.net/f/noext")).toBe("other");
    expect(detectFileKind("")).toBe("other");
    expect(detectFileKind(null)).toBe("other");
  });

  it("اسم ملف فيه نقاط ومسافات/عربي بيتفك ترميزه", () => {
    expect(detectFileKind("https://z.b-cdn.net/f/%D9%88%D8%A7%D8%AC%D8%A8.v2.pdf")).toBe("pdf");
  });
});

describe("officeViewerUrl", () => {
  it("بيعمل encode للرابط كله (بما فيه الـ token)", () => {
    const u = "https://z.b-cdn.net/f/a.docx?token=x&expires=1";
    expect(officeViewerUrl(u)).toBe(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(u)}`);
  });
});
