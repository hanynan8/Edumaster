// app/lib/noClassMarker.test.js
//
// 🆕 ClassMarker اتشال من المنصة بالكامل (حقل الكورس، فورم المدرس/الأدمن، الـ API، كروت الكورسات،
// وصفحة التفاصيل). الاختبار ده بيمنع رجوعه بالغلط: مفيش أي ذكر ليه في كود التطبيق.

import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "app");
const SKIP = new Set(["node_modules", ".next"]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|mjs|ts|tsx|json)$/.test(name)) out.push(full);
  }
  return out;
}

describe("ClassMarker اتشال من المنصة", () => {
  it("مفيش أي ملف في app/ بيذكر ClassMarker أو classMarkerQuizId", () => {
    const self = path.basename(__filename);
    const hits = walk(ROOT)
      .filter((f) => path.basename(f) !== self)
      .filter((f) => /classmarker/i.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(process.cwd(), f));
    expect(hits).toEqual([]);
  });

  it("هيلبر classMarker.js مش موجود", () => {
    expect(fs.existsSync(path.join(ROOT, "lib", "classMarker.js"))).toBe(false);
  });
});
