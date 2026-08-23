// app/lib/meetingPhase.js
//
// 🆕 منطق حساب "حالة" الاجتماع (live / upcoming / ended) — كان قبل كده
// مدفون جوه app/meet/page.jsx كدوال محلية مش قابلة للاختبار المباشر
// (component file, مش module بيصدّر حاجة). نقلناه هنا لسببين:
//   1) قابلية الاختبار: منطق زي ده (حساب وقت، مقارنات) هو بالظبط النوع اللي
//      لازم يتغطى باختبارات — أي تعديل مستقبلي (زي تغيير هامش الـ presence
//      check) ممكن يكسره من غير ما حد يلاحظ لو مفيش اختبار.
//   2) إعادة استخدام: نفس المنطق ممكن يُستخدم لاحقًا في مكان تاني (API route
//      بيرجّع حالة الاجتماع، تقرير أدمن، ...) من غير تكرار الكود.
//
// مفيش تغيير في السلوك هنا — نفس المنطق بالظبط اللي كان في page.jsx.

/**
 * بيحسب حالة المحاضرة (upcoming / live / ended) بمقارنة الوقت الحالي
 * بمعاد البداية + المدة. مفيش status مخزّن في الداتابيز عن قصد — الحالة
 * دايمًا محسوبة لحظيًا.
 */
export function getPhase(meeting, now = Date.now()) {
  const start = new Date(meeting.scheduledAt).getTime();
  const end = start + (meeting.durationMinutes || 60) * 60 * 1000;
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "ended";
}

// نفس هامش غرفة Daily (شوف app/lib/daily.js: exp = end + ساعتين) — مفيش
// داعي نتحقق من presence فعلي لمحاضرة خلصت من كتير، الغرفة أصلًا مقفولة.
export const PRESENCE_CHECK_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * بيحل مشكلة "حساب حالة خلصت مش دقيق لو المحاضرة اتمدت" — لو presenceOverrides
 * بيقول إن فيه حد لسه داخل الغرفة فعليًا (شوف usePresenceOverrides في
 * page.jsx)، بنعامل الاجتماع كـ"live" برضه حتى لو الوقت المكتوب عدّى.
 */
export function resolvePhase(meeting, presenceOverrides = {}, now = Date.now()) {
  const staticPhase = getPhase(meeting, now);
  if (staticPhase === "ended" && presenceOverrides[meeting.id]) return "live";
  return staticPhase;
}

/**
 * بيحدد لو المحاضرة مؤهلة لفحص presence فعلي (شوف usePresenceOverrides) —
 * لازم تكون من Daily، وخلصت حديثًا (خلال آخر PRESENCE_CHECK_WINDOW_MS).
 */
export function isPresenceCheckCandidate(meeting, now = Date.now()) {
  if (meeting.source !== "daily") return false;
  const start = new Date(meeting.scheduledAt).getTime();
  const end = start + (meeting.durationMinutes || 60) * 60 * 1000;
  return now > end && now - end < PRESENCE_CHECK_WINDOW_MS;
}