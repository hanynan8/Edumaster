// app/lib/meetingRecurrence.js
//
// 🆕 حساب مواعيد المحاضرات المتكررة (Recurring meetings) زي Teams.
//
// الفكرة: المدرس بيحدد أول موعد + قاعدة تكرار (يومي / أسبوعي بأيام معيّنة /
// شهري) + نهاية (عدد مرات أو تاريخ). الدالة expandRecurrence بتحوّل القاعدة
// دي لقائمة مواعيد فعلية (Date[]) بتتحوّل بعدين لـ Meeting documents منفصلة
// بنفس seriesId (شوف app/api/meetings/route.js).
//
// 🕐 التوقيت: الحساب بيتم بـ "الساعة المحلية" للـ timeZone اللي المتصفح
// بعته (IANA زي Africa/Cairo) مش بإضافة 24 ساعة ثابتة — عشان المحاضرة تفضل
// على نفس الساعة المحلية حتى لو التوقيت الصيفي (DST) اتغيّر في النص.

export const MAX_OCCURRENCES = 60;
export const MAX_HORIZON_DAYS = 366;
export const FREQUENCIES = ["daily", "weekly", "monthly"];

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeTimeZone(tz) {
  try {
    if (tz && typeof tz === "string") {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    }
  } catch {
    // timeZone غير صالحة — نرجع UTC.
  }
  return "UTC";
}

// بيرجّع مكوّنات الوقت المحلي (في timeZone معيّنة) للحظة UTC معيّنة.
export function getZonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month, // 1-12
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function tzOffsetMs(utcMs, timeZone) {
  const p = getZonedParts(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// بيحوّل "تاريخ + ساعة محلية" في timeZone لـ Date (لحظة UTC).
export function zonedTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wall - tzOffsetMs(wall, timeZone);
  // تصحيح تاني لو الـ offset اتغيّر (DST) بين التخمين الأول والنهائي.
  guess = wall - tzOffsetMs(guess, timeZone);
  return new Date(guess);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month: 1-12
}

/**
 * بيتحقق من قاعدة التكرار ويرجّعها بصيغة موحّدة، أو { error }.
 * @param {object} raw - { frequency, interval?, daysOfWeek?, endType, count?, until? }
 */
export function normalizeRecurrence(raw) {
  if (!raw || typeof raw !== "object") return { error: "invalid_recurrence" };

  const frequency = String(raw.frequency || "");
  if (!FREQUENCIES.includes(frequency)) return { error: "invalid_recurrence" };

  let interval = Number(raw.interval);
  if (!Number.isFinite(interval) || interval < 1) interval = 1;
  interval = Math.min(12, Math.round(interval));

  let daysOfWeek = [];
  if (frequency === "weekly" && Array.isArray(raw.daysOfWeek)) {
    daysOfWeek = [...new Set(raw.daysOfWeek.map(Number))]
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .sort((a, b) => a - b);
  }

  const endType = raw.endType === "until" ? "until" : "count";

  let count = null;
  let until = null;
  if (endType === "count") {
    count = Math.round(Number(raw.count));
    if (!Number.isFinite(count) || count < 2) return { error: "invalid_recurrence" };
    if (count > MAX_OCCURRENCES) return { error: "too_many_occurrences" };
  } else {
    // until = "YYYY-MM-DD" (تاريخ محلي، شامل)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw.until || ""))) return { error: "invalid_recurrence" };
    until = String(raw.until);
  }

  return { value: { frequency, interval, daysOfWeek, endType, count, until } };
}

/**
 * بيحوّل قاعدة التكرار لقائمة مواعيد.
 * - أول موعد = الأول اللي بيطابق القاعدة وتاريخه >= تاريخ startDate (لو
 *   weekly من غير daysOfWeek بنستخدم يوم startDate نفسه).
 * - الساعة المحلية ثابتة في كل المواعيد.
 * @returns {{ dates: Date[] } | { error: string }}
 */
export function expandRecurrence({ startDate, recurrence, timeZone }) {
  const norm = normalizeRecurrence(recurrence);
  if (norm.error) return { error: norm.error };
  const rule = norm.value;
  const tz = normalizeTimeZone(timeZone);

  const start = getZonedParts(startDate, tz);
  const baseDay = Date.UTC(start.year, start.month - 1, start.day); // منتصف الليل (UTC) كتمثيل للتاريخ المحلي
  const startDow = new Date(baseDay).getUTCDay();
  const horizonDay = baseDay + MAX_HORIZON_DAYS * DAY_MS;

  let untilDay = null;
  if (rule.endType === "until") {
    const [y, m, d] = rule.until.split("-").map(Number);
    untilDay = Date.UTC(y, m - 1, d);
    if (untilDay < baseDay) return { error: "invalid_recurrence" };
  }

  // كل عنصر = رقم اليوم (UTC midnight) للتاريخ المحلي المطابق.
  const days = [];
  const push = (dayMs) => {
    if (dayMs < baseDay) return false;
    if (dayMs > horizonDay) return "stop";
    if (untilDay !== null && dayMs > untilDay) return "stop";
    days.push(dayMs);
    if (rule.endType === "count" && days.length >= rule.count) return "stop";
    if (days.length > MAX_OCCURRENCES) return "overflow";
    return true;
  };

  let status = true;
  const SAFETY = 2000;

  if (rule.frequency === "daily") {
    for (let i = 0; i < SAFETY && status !== "stop" && status !== "overflow"; i++) {
      status = push(baseDay + i * rule.interval * DAY_MS);
    }
  } else if (rule.frequency === "weekly") {
    const dows = rule.daysOfWeek.length > 0 ? rule.daysOfWeek : [startDow];
    const weekStart = baseDay - startDow * DAY_MS; // بداية الأسبوع (الأحد) اللي فيه startDate
    outer: for (let w = 0; w < SAFETY; w++) {
      for (const dow of dows) {
        status = push(weekStart + (w * rule.interval * 7 + dow) * DAY_MS);
        if (status === "stop" || status === "overflow") break outer;
      }
    }
  } else {
    // monthly: نفس اليوم من الشهر، ولو الشهر أقصر بنثبّته على آخر يوم.
    for (let i = 0; i < SAFETY && status !== "stop" && status !== "overflow"; i++) {
      const monthIndex = start.month - 1 + i * rule.interval;
      const year = start.year + Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      const day = Math.min(start.day, daysInMonth(year, month));
      status = push(Date.UTC(year, month - 1, day));
    }
  }

  if (status === "overflow") return { error: "too_many_occurrences" };
  if (days.length === 0) return { error: "invalid_recurrence" };

  const dates = days.map((dayMs) => {
    const d = new Date(dayMs);
    return zonedTimeToUtc(
      {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: start.hour,
        minute: start.minute,
      },
      tz
    );
  });

  return { dates };
}

/**
 * 🆕 بيزحزح موعد محاضرة داخل سلسلة بنفس "الفرق بالأيام + الساعة الجديدة"
 * اللي المدرس طبّقه على المحاضرة اللي عدّلها — بالساعة المحلية (مش بإضافة
 * ms ثابتة) عشان DST ميبوّظش ساعة المحاضرة. شوف PUT في app/api/meetings/[id].
 */
export function shiftWallClock(date, { deltaDays, hour, minute }, timeZone) {
  const tz = normalizeTimeZone(timeZone);
  const p = getZonedParts(date, tz);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day) + deltaDays * DAY_MS);
  return zonedTimeToUtc(
    {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour,
      minute,
    },
    tz
  );
}

/** فرق الأيام (بالتقويم المحلي) بين لحظتين في timeZone معيّنة. */
export function localDayDiff(fromDate, toDate, timeZone) {
  const tz = normalizeTimeZone(timeZone);
  const a = getZonedParts(fromDate, tz);
  const b = getZonedParts(toDate, tz);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS);
}

/** وصف نصي قصير للتكرار — بيُستخدم في الإيميلات والإشعارات. */
export function describeRecurrence(rule, locale = "en") {
  if (!rule) return "";
  const ar = locale === "ar";
  const every = rule.interval > 1 ? rule.interval : 1;
  const unit = {
    daily: ar ? (every > 1 ? `كل ${every} أيام` : "يوميًا") : every > 1 ? `every ${every} days` : "daily",
    weekly: ar ? (every > 1 ? `كل ${every} أسابيع` : "أسبوعيًا") : every > 1 ? `every ${every} weeks` : "weekly",
    monthly: ar ? (every > 1 ? `كل ${every} شهور` : "شهريًا") : every > 1 ? `every ${every} months` : "monthly",
  }[rule.frequency];
  return unit || "";
}
