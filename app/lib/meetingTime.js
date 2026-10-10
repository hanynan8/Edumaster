// app/lib/meetingTime.js
//
// 🔧 تنسيق موعد المحاضرة على السيرفر (إشعارات + إيميلات).
//
// المشكلة: كل الأماكن دي كانت بتستخدم toLocaleString() من غير timeZone، يعني بتطلع
// بتوقيت السيرفر (UTC غالبًا على الاستضافات). محاضرة الساعة 1:00 م بتوقيت القاهرة كانت
// بتظهر في الإشعار/الإيميل "10:00 ص" — والطالب كان بيجيله ميعاد غلط.
//
// الحل: نفس الدالة بتحدد timeZone صريح:
//   1) timeZone المحاضرة نفسها (recurrence.timeZone للسلاسل المتكررة) لو موجود وصالح.
//   2) وإلا MEETING_DISPLAY_TIMEZONE من env، وإلا Africa/Cairo (منصة عربية/مصرية).
// ولما withZoneName=true بنضيف اسم المنطقة الزمنية (مثلاً GMT+3) عشان الميعاد يبقى
// واضح حتى لو الطالب في بلد تانية.

export const DEFAULT_MEETING_TIMEZONE = process.env.MEETING_DISPLAY_TIMEZONE || "Africa/Cairo";

function isValidTimeZone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function resolveDisplayTimeZone(timeZone) {
  if (isValidTimeZone(timeZone)) return timeZone;
  return isValidTimeZone(DEFAULT_MEETING_TIMEZONE) ? DEFAULT_MEETING_TIMEZONE : "UTC";
}

/**
 * @param {Date|string|number} date
 * @param {object} [opts]
 * @param {string} [opts.locale="en-US"]
 * @param {string} [opts.timeZone] - IANA timezone (يتجاهل لو غير صالح)
 * @param {"full"|"long"|"medium"|"short"} [opts.dateStyle="medium"]
 * @param {boolean} [opts.withZoneName=false] - إضافة اسم المنطقة الزمنية (GMT+3 ...)
 */
export function formatMeetingWhen(
  date,
  { locale = "en-US", timeZone, dateStyle = "medium", withZoneName = false } = {}
) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const tz = resolveDisplayTimeZone(timeZone);

  try {
    if (withZoneName) {
      // dateStyle/timeStyle مابيتجمعوش مع timeZoneName في Intl، فبنستخدم الحقول صراحةً.
      const dateParts =
        dateStyle === "full"
          ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
          : { year: "numeric", month: "short", day: "numeric" };
      return d.toLocaleString(locale, {
        ...dateParts,
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: tz,
      });
    }
    return d.toLocaleString(locale, { dateStyle, timeStyle: "short", timeZone: tz });
  } catch {
    return d.toISOString();
  }
}
