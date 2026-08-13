// app/lib/resetPasswordHelpers.js
//
// منطق مشترك بين /api/verify-reset-code و /api/reset-password عشان القواعد
// تفضل متطابقة في المكانين ومنعزلة في مكان واحد بدل التكرار.

// 🔒 SECURITY: مدة صلاحية الكود نفسه — 15 دقيقة من وقت الإرسال.
export const CODE_TTL_MS = 15 * 60 * 1000;

// 🔒 SECURITY: أقصى عدد محاولات تخمين للكود = 5، خلال نافذة زمنية = 12 ساعة.
// دي منفصلة تمامًا عن صلاحية الكود (15 دقيقة) — حتى لو المستخدم طلب أكواد
// جديدة كتير، عداد المحاولات ده بيفضل شغال وبيتصفر بس لو الـ 12 ساعة عدّت
// من أول محاولة غلط، أو لو الباسورد اتغيّر بنجاح.
export const MAX_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 12 * 60 * 60 * 1000;

export function isCodeExpired(user) {
  return !user.resetCodeExpiry || new Date() > new Date(user.resetCodeExpiry);
}

// لو النافذة الحالية عدّت 12 ساعة (أو مفيش نافذة أصلاً)، يبدأ نافذة جديدة
// من الصفر. لازم تتنادى قبل أي فحص لـ hasExceededAttempts.
export function ensureAttemptWindow(user) {
  const now = Date.now();
  const windowStart = user.resetAttemptsWindowStart
    ? new Date(user.resetAttemptsWindowStart).getTime()
    : null;

  if (!windowStart || now - windowStart > ATTEMPT_WINDOW_MS) {
    user.resetAttemptsWindowStart = new Date(now);
    user.resetAttempts = 0;
  }
}

export function hasExceededAttempts(user) {
  return (user.resetAttempts || 0) >= MAX_ATTEMPTS;
}

// بيرجع عدد المحاولات المتبقية (0 لو خلصت) — بيتنادى بعد ensureAttemptWindow
// عشان يعكس النافذة الحالية، مش نافذة قديمة.
export function remainingAttempts(user) {
  return Math.max(0, MAX_ATTEMPTS - (user.resetAttempts || 0));
}

// بيتنادى بعد نجاح تغيير الباسورد فعليًا — بيصفّر كل حاجة خاصة بالـ reset.
export function clearResetState(user) {
  user.resetCodeHash = null;
  user.resetCodeExpiry = null;
  user.resetAttempts = 0;
  user.resetAttemptsWindowStart = null;
}