// app/lib/meetingTime.test.js
import { formatMeetingWhen, resolveDisplayTimeZone } from "./meetingTime";

describe("formatMeetingWhen", () => {
  const iso = "2027-01-15T10:00:00Z"; // شتاء: القاهرة = UTC+2

  it("بيعرض الوقت بتوقيت القاهرة مش UTC", () => {
    const out = formatMeetingWhen(iso, { locale: "en-US", timeZone: "Africa/Cairo" });
    expect(out).toContain("12:00");
    expect(out).not.toContain("10:00");
  });
  it("timeZone غير صالح → الافتراضي (مش UTC ومش خطأ)", () => {
    expect(resolveDisplayTimeZone("Not/AZone")).toBe("Africa/Cairo");
    expect(formatMeetingWhen(iso, { locale: "en-US", timeZone: "Not/AZone" })).toContain("12:00");
  });
  it("withZoneName بيضيف اسم المنطقة", () => {
    expect(formatMeetingWhen(iso, { locale: "en-US", timeZone: "Africa/Cairo", withZoneName: true })).toMatch(/GMT\+2/);
  });
  it("تاريخ غير صالح → نص فاضي", () => {
    expect(formatMeetingWhen("nope")).toBe("");
  });
});
