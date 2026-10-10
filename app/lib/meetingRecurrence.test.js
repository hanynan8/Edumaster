// app/lib/meetingRecurrence.test.js
//
// اختبار توسيع قواعد التكرار (زي Teams) — خصوصًا الساعة المحلية عبر تغيّر DST
// (مصر: التوقيت الصيفي بيخلص آخر خميس في أكتوبر) وحدود الأعداد.

import {
  expandRecurrence,
  normalizeRecurrence,
  getZonedParts,
  shiftWallClock,
  localDayDiff,
  MAX_OCCURRENCES,
} from "./meetingRecurrence";

const TZ = "Africa/Cairo";
const localHour = (d) => getZonedParts(d, TZ).hour;
const localDate = (d) => {
  const p = getZonedParts(d, TZ);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

describe("expandRecurrence", () => {
  // السبت 24 أكتوبر 2026 الساعة 10:00 بتوقيت القاهرة (UTC+3)
  const start = new Date("2026-10-24T07:00:00Z");

  it("daily: الساعة المحلية ثابتة عبر تغيّر DST", () => {
    const { dates } = expandRecurrence({
      startDate: start,
      recurrence: { frequency: "daily", endType: "count", count: 8 },
      timeZone: TZ,
    });
    expect(dates).toHaveLength(8);
    dates.forEach((d) => expect(localHour(d)).toBe(10));
    // قبل التغيير UTC+3 وبعده UTC+2
    expect(dates[0].toISOString()).toBe("2026-10-24T07:00:00.000Z");
    expect(dates[7].toISOString()).toBe("2026-10-31T08:00:00.000Z");
  });

  it("weekly بأيام معيّنة", () => {
    const { dates } = expandRecurrence({
      startDate: start,
      recurrence: { frequency: "weekly", daysOfWeek: [0, 2, 4], endType: "count", count: 6 },
      timeZone: TZ,
    });
    expect(dates.map(localDate)).toEqual([
      "2026-10-25", "2026-10-27", "2026-10-29", "2026-11-01", "2026-11-03", "2026-11-05",
    ]);
  });

  it("weekly: أول موعد هو أول يوم مطابق بعد/في تاريخ البداية", () => {
    const { dates } = expandRecurrence({
      startDate: new Date("2026-10-26T07:00:00Z"), // الإثنين
      recurrence: { frequency: "weekly", daysOfWeek: [0], endType: "count", count: 3 },
      timeZone: TZ,
    });
    expect(dates.map(localDate)).toEqual(["2026-11-01", "2026-11-08", "2026-11-15"]);
  });

  it("monthly من يوم 31 بيثبّت على آخر يوم في الشهر الأقصر", () => {
    const { dates } = expandRecurrence({
      startDate: new Date("2026-01-31T08:00:00Z"),
      recurrence: { frequency: "monthly", endType: "count", count: 4 },
      timeZone: TZ,
    });
    expect(dates.map(localDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("endType until شامل لتاريخ النهاية", () => {
    const { dates } = expandRecurrence({
      startDate: start,
      recurrence: { frequency: "daily", endType: "until", until: "2026-10-27" },
      timeZone: TZ,
    });
    expect(dates.map(localDate)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]);
  });

  it("بيرفض أكتر من MAX_OCCURRENCES", () => {
    const r = expandRecurrence({
      startDate: start,
      recurrence: { frequency: "daily", endType: "count", count: MAX_OCCURRENCES + 1 },
      timeZone: TZ,
    });
    expect(r.error).toBe("too_many_occurrences");
  });

  it("بيرفض until قبل تاريخ البداية", () => {
    const r = expandRecurrence({
      startDate: start,
      recurrence: { frequency: "daily", endType: "until", until: "2026-10-01" },
      timeZone: TZ,
    });
    expect(r.error).toBe("invalid_recurrence");
  });
});

describe("normalizeRecurrence", () => {
  it("بيرفض frequency غلط و count أقل من 2", () => {
    expect(normalizeRecurrence({ frequency: "yearly", endType: "count", count: 3 }).error).toBe("invalid_recurrence");
    expect(normalizeRecurrence({ frequency: "daily", endType: "count", count: 1 }).error).toBe("invalid_recurrence");
  });
});

describe("shiftWallClock + localDayDiff", () => {
  it("زحزحة بالأيام والساعة المحلية عبر DST", () => {
    const d = new Date("2026-10-28T07:00:00Z"); // 10:00 القاهرة (قبل التغيير)
    const shifted = shiftWallClock(d, { deltaDays: 3, hour: 12, minute: 30 }, TZ); // 31 أكتوبر 12:30
    expect(localDate(shifted)).toBe("2026-10-31");
    expect(getZonedParts(shifted, TZ).hour).toBe(12);
    expect(getZonedParts(shifted, TZ).minute).toBe(30);
    expect(localDayDiff(d, shifted, TZ)).toBe(3);
  });
});
