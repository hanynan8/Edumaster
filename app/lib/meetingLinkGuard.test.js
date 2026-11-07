// app/lib/meetingLinkGuard.test.js
import { isLinkChangeLocked, LINK_LOCK_BEFORE_MS, LINK_LOCK_AFTER_MS } from "@/app/lib/meetingLinkGuard";

const START = new Date("2026-11-10T15:00:00Z").getTime();
const m = (over = {}) => ({ source: "daily", scheduledAt: new Date(START), durationMinutes: 60, ...over });
const END = START + 60 * 60_000;

describe("isLinkChangeLocked", () => {
  it("قبل المعاد بأكتر من ساعة → مسموح", () => {
    expect(isLinkChangeLocked(m(), START - LINK_LOCK_BEFORE_MS - 1)).toBe(false);
  });
  it("قبل المعاد بساعة بالظبط → ممنوع", () => {
    expect(isLinkChangeLocked(m(), START - LINK_LOCK_BEFORE_MS)).toBe(true);
  });
  it("أثناء المحاضرة → ممنوع", () => {
    expect(isLinkChangeLocked(m(), START + 10 * 60_000)).toBe(true);
  });
  it("بعد النهاية وجوه صلاحية الغرفة (ساعتين) → ممنوع", () => {
    expect(isLinkChangeLocked(m(), END + LINK_LOCK_AFTER_MS)).toBe(true);
  });
  it("بعد انتهاء صلاحية الغرفة → مسموح", () => {
    expect(isLinkChangeLocked(m(), END + LINK_LOCK_AFTER_MS + 1)).toBe(false);
  });
  it("لينك يدوي (manual) → مسموح دايمًا", () => {
    expect(isLinkChangeLocked(m({ source: "manual" }), START + 1)).toBe(false);
  });
  it("المدة الافتراضية 60 دقيقة لو مش متحددة", () => {
    expect(isLinkChangeLocked(m({ durationMinutes: undefined }), END + 1)).toBe(true);
  });
});
