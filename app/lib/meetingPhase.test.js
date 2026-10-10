// app/lib/meetingPhase.test.js
//
// اختبار منطق حالة المحاضرة (upcoming / live / ended) + قاعدة الـ presence override.

import {
  getPhase,
  resolvePhase,
  isPresenceCheckCandidate,
  canJoinNow,
  getJoinOpensAt,
  PRESENCE_CHECK_WINDOW_MS,
  JOIN_OPEN_BEFORE_MS,
} from "./meetingPhase";

const MIN = 60 * 1000;
const start = new Date("2026-10-12T10:00:00Z");
const meeting = { id: "m1", scheduledAt: start.toISOString(), durationMinutes: 60, source: "daily" };
const at = (offsetMin) => start.getTime() + offsetMin * MIN;

describe("getPhase", () => {
  it("upcoming قبل البداية", () => expect(getPhase(meeting, at(-1))).toBe("upcoming"));
  it("live عند البداية بالظبط وحتى النهاية شاملة", () => {
    expect(getPhase(meeting, at(0))).toBe("live");
    expect(getPhase(meeting, at(60))).toBe("live");
  });
  it("ended بعد النهاية", () => expect(getPhase(meeting, at(61))).toBe("ended"));
  it("مدة افتراضية 60 دقيقة لو durationMinutes مش موجودة", () => {
    const m = { ...meeting, durationMinutes: undefined };
    expect(getPhase(m, at(59))).toBe("live");
    expect(getPhase(m, at(61))).toBe("ended");
  });
});

describe("resolvePhase", () => {
  it("لو انتهت وفيه حد لسه جوه الغرفة (في شباك الفحص) تفضل live", () => {
    expect(resolvePhase(meeting, { m1: true }, at(75))).toBe("live");
  });
  it("لو انتهت ومفيش حد جوه تبقى ended", () => {
    expect(resolvePhase(meeting, { m1: false }, at(75))).toBe("ended");
    expect(resolvePhase(meeting, {}, at(75))).toBe("ended");
  });
  it("override قديم (برا شباك الفحص) مايخليش المحاضرة live للأبد", () => {
    const afterWindow = at(60) + PRESENCE_CHECK_WINDOW_MS + MIN;
    expect(resolvePhase(meeting, { m1: true }, afterWindow)).toBe("ended");
  });
  it("override مايأثرش على upcoming", () => {
    expect(resolvePhase(meeting, { m1: true }, at(-5))).toBe("upcoming");
  });
  it("override مايأثرش على محاضرة manual (مفيش فحص presence ليها)", () => {
    const manual = { ...meeting, source: "manual" };
    expect(resolvePhase(manual, { m1: true }, at(75))).toBe("ended");
  });
});

describe("isPresenceCheckCandidate", () => {
  it("بس لمحاضرات Daily اللي خلصت خلال آخر ساعتين", () => {
    expect(isPresenceCheckCandidate(meeting, at(30))).toBe(false); // لسه جارية
    expect(isPresenceCheckCandidate(meeting, at(61))).toBe(true);
    expect(isPresenceCheckCandidate(meeting, at(60) + PRESENCE_CHECK_WINDOW_MS + 1)).toBe(false);
    expect(isPresenceCheckCandidate({ ...meeting, source: "manual" }, at(61))).toBe(false);
  });
});

describe("canJoinNow", () => {
  it("Daily: مقفول قبل فتح الغرفة بربع ساعة ومفتوح بعدها", () => {
    expect(canJoinNow(meeting, at(-16))).toBe(false);
    expect(canJoinNow(meeting, at(-15))).toBe(true);
    expect(canJoinNow(meeting, at(-1))).toBe(true);
    expect(canJoinNow(meeting, at(10))).toBe(true);
  });
  it("لينك يدوي: متاح دايمًا", () => {
    expect(canJoinNow({ ...meeting, source: "manual" }, at(-600))).toBe(true);
  });
  it("getJoinOpensAt = البداية - ربع ساعة", () => {
    expect(getJoinOpensAt(meeting).getTime()).toBe(start.getTime() - JOIN_OPEN_BEFORE_MS);
  });
});
