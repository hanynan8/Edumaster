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
  // 🔒 الـ override بيتحترم بس جوه شباك الفحص (isPresenceCheckCandidate) — وإلا آخر نتيجة
  // "true" كانت ممكن تفضل عالقة للأبد بعد ما الغرفة تتقفل ومحدش يعيد الفحص.
  if (staticPhase === "ended" && presenceOverrides[meeting.id] && isPresenceCheckCandidate(meeting, now)) {
    return "live";
  }
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
// 🕐 غرفة Daily بتفتح للدخول ربع ساعة قبل المعاد (nbf = start - 15 دقيقة، شوف
// app/lib/daily.js createDailyRoom/createMeetingToken). قبل كده زرار "انضم" كان ظاهر
// ومفعّل لأي محاضرة قادمة حتى لو بعد أيام، والضغط عليه كان بيفتح مودال بيطلع بخطأ
// عام من Daily. الواجهة دلوقتي بتقفله لحد ما الغرفة تفتح فعلًا.
export const JOIN_OPEN_BEFORE_MS = 15 * 60 * 1000;

/** وقت فتح الدخول (Date) لمحاضرة معيّنة. */
export function getJoinOpensAt(meeting) {
  return new Date(new Date(meeting.scheduledAt).getTime() - JOIN_OPEN_BEFORE_MS);
}

/**
 * هل نقدر نعرض زرار الدخول فعّال دلوقتي؟ بس لمحاضرات Daily (الغرفة الخاصة ليها
 * nbf)؛ اللينك اليدوي (منصة تانية) مالناش سلطة على مواعيد فتحه فبيفضل متاح دايمًا.
 * بعد النهاية الدخول بيقفل بالـ phase (ended) مش هنا.
 */
export function canJoinNow(meeting, now = Date.now()) {
  if (meeting.source !== "daily") return true;
  return now >= getJoinOpensAt(meeting).getTime();
}
