// app/lib/resetPasswordHelpers.js
//
// منطق مشترك بين /api/verify-reset-code و /api/reset-password عشان القواعد
// تفضل متطابقة في المكانين ومنعزلة في مكان واحد بدل التكرار.

// 🔒 SECURITY: مدة صلاحية الكود نفسه — 15 دقيقة من وقت الإرسال.
export const CODE_TTL_MS = 15 * 60 * 1000;

// 🔒 SECURITY: أقصى عدد محاولات تخمين للكود = 5.
// - لازم فاصل 5 دقايق بين كل محاولة والتانية (MIN_ATTEMPT_INTERVAL_MS).
// - لما الـ 5 محاولات تخلص، الحساب بيتقفل 24 ساعة (LOCKOUT_DURATION_MS)
//   من وقت آخر محاولة، وبعدين بيرجع ياخد 5 محاولات جديدة تلقائيًا.
// دي منفصلة تمامًا عن صلاحية الكود نفسه (15 دقيقة) — حتى لو المستخدم طلب
// أكواد جديدة كتير، عداد المحاولات ده بيفضل شغال لحد ما القفل يخلص أو
// الباسورد يتغيّر بنجاح.
export const MAX_ATTEMPTS = 5;
export const MIN_ATTEMPT_INTERVAL_MS = 5 * 60 * 1000; // 5 دقايق
export const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ساعة

export function isCodeExpired(user) {
  return !user.resetCodeExpiry || new Date() > new Date(user.resetCodeExpiry);
}

// لو الـ 5 محاولات خلصت وعدّت 24 ساعة من وقت آخر محاولة، يرجع يبدأ دورة
// جديدة من الصفر (5 محاولات تانية). لازم تتنادى قبل أي فحص لـ
// hasExceededAttempts أو msUntilNextAttempt.
export function ensureAttemptWindow(user) {
  const now = Date.now();
  const attempts = user.resetAttempts || 0;
  const lastAttempt = user.resetLastAttemptAt
    ? new Date(user.resetLastAttemptAt).getTime()
    : null;

  if (attempts >= MAX_ATTEMPTS && lastAttempt && now - lastAttempt > LOCKOUT_DURATION_MS) {
    user.resetAttempts = 0;
    user.resetLastAttemptAt = null;
  }
}

export function hasExceededAttempts(user) {
  return (user.resetAttempts || 0) >= MAX_ATTEMPTS;
}

// المللي ثانية الباقية لحد ما يقدر يحاول تاني (فاصل الـ 5 دقايق بين
// المحاولات). 0 يعني مسموح يحاول دلوقتي.
export function msUntilNextAttempt(user) {
  if (!user.resetLastAttemptAt) return 0;
  const elapsed = Date.now() - new Date(user.resetLastAttemptAt).getTime();
  return Math.max(0, MIN_ATTEMPT_INTERVAL_MS - elapsed);
}

// المللي ثانية الباقية لحد ما قفل الـ 24 ساعة يخلص (بيتستخدم بس لما
// hasExceededAttempts بترجع true، عشان نوريله يستنى قد إيه).
export function msUntilLockoutEnds(user) {
  if (!user.resetLastAttemptAt) return 0;
  const elapsed = Date.now() - new Date(user.resetLastAttemptAt).getTime();
  return Math.max(0, LOCKOUT_DURATION_MS - elapsed);
}

// بيرجع عدد المحاولات المتبقية (0 لو خلصت) — بيتنادى بعد ensureAttemptWindow
// عشان يعكس الدورة الحالية، مش دورة قديمة.
export function remainingAttempts(user) {
  return Math.max(0, MAX_ATTEMPTS - (user.resetAttempts || 0));
}

// بيتنادى بعد نجاح تغيير الباسورد فعليًا — بيصفّر كل حاجة خاصة بالـ reset.
//
// 🔒 SECURITY (Phase 8 — اليوم 59، مراجعة أمان شاملة): كانت الدالة دي بتغيّر
// الباسورد بس من غير ما تلغي أي جلسة (JWT) تانية مفتوحة بنفس الحساب —
// يعني لو حد سرق التوكن بتاع اليوزر قبل عملية الـ reset، تغيير الباسورد
// مكانش بيطرده. المشروع أصلاً عنده آلية tokenVersion مخصصة بالظبط للحالة
// دي (مستخدمة في admin/users/[id] عند تعليق مستخدم، وadmin/mfa عند
// تفعيل/تعطيل MFA) — بس مكانتش مستخدمة هنا. ناقصها هنا كان يعني إن أخطر
// إجراء ممكن يعمله المستخدم (تغيير الباسورد) هو الوحيد اللي مابيلغيش
// الجلسات القديمة. بنزوّد tokenVersion ونسجّل passwordChangedAt (الحقل
// موجود في الـ schema أصلاً وكان مالوش أي استخدام) عشان أي JWT قديم يبقى
// باطل فورًا (الفحص كل ~60 ثانية في authOptions.js jwt callback).
export function clearResetState(user) {
  user.resetCodeHash = null;
  user.resetCodeExpiry = null;
  user.resetAttempts = 0;
  user.resetLastAttemptAt = null;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.passwordChangedAt = new Date();
}