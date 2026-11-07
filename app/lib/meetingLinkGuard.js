// app/lib/meetingLinkGuard.js
//
// 🔒 منع تغيير رابط محاضرة Daily أثناء وجود الغرفة "حيّة".
//
// ليه؟ تعديل اللينك لمحاضرة Daily في PUT /api/meetings/[id] بيمسح غرفة Daily
// ويحوّل المحاضرة لـ "manual" برابط تاني. لو ده حصل والناس جوه الغرفة أو على وشك
// الدخول، اللي جوه بيتطردوا واللي يدخل بعد كده بيروح لمكان تاني = المدرس في مكان
// والطلاب في مكان (نفس نتيجة مشكلة حصة 6/11).
//
// القفل بيغطي الفترة اللي الغرفة فيها قابلة للاستخدام فعليًا (الغرفة بتفتح قبل المعاد
// بربع ساعة وبتقفل بعد النهاية بساعتين — شوف createDailyRoom في app/lib/daily.js)
// + هامش أمان قبل البداية.

export const LINK_LOCK_BEFORE_MS = 60 * 60 * 1000; // ساعة قبل المعاد
export const LINK_LOCK_AFTER_MS = 2 * 60 * 60 * 1000; // لحد نهاية صلاحية الغرفة (end + ساعتين)

/**
 * هل تغيير رابط المحاضرة دي ممنوع دلوقتي؟
 * بس لمحاضرات Daily (اللينك اليدوي مالوش غرفة عندنا نمسحها).
 */
export function isLinkChangeLocked(meeting, now = Date.now()) {
  if (!meeting || meeting.source !== "daily") return false;
  const start = new Date(meeting.scheduledAt).getTime();
  if (Number.isNaN(start)) return false;
  const end = start + (meeting.durationMinutes || 60) * 60 * 1000;
  return now >= start - LINK_LOCK_BEFORE_MS && now <= end + LINK_LOCK_AFTER_MS;
}
