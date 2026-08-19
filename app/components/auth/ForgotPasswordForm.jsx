"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─────────────────────────────────────────
   AUTH i18n STRINGS
───────────────────────────────────────── */
const AUTH_I18N = {
  ar: {
    font: "'Tajawal', sans-serif",
    dir: "rtl",
    login: {
      title: "أهلاً بعودتك",
      subtitle: "سجّل دخولك للمتابعة",
      identifier: "الاسم أو الإيميل",
      identifierPlaceholder: "ادخل اسمك أو إيميلك",
      password: "كلمة المرور",
      submit: "تسجيل الدخول",
      switchText: "مش عندك حساب؟",
      switchCta: "سجّل دلوقتي",
      forgotLink: "نسيت كلمة المرور؟",
      errEmpty: "من فضلك ادخل جميع البيانات",
      errWrong: "الاسم أو الباسورد غلط",
      errRateLimited: "محاولات كتير، تم قفل الدخول مؤقتًا. حاول تاني بعد شوية",
      mfaSubtitle: "الحساب ده محمي بخطوة تحقق إضافية. ادخل الكود من تطبيق المصادقة بتاعك",
      mfaCodeLabel: "كود التحقق",
      mfaSubmit: "تأكيد وتسجيل الدخول",
      errMfaInvalid: "الكود غلط، حاول تاني",
      // ✅ رسائل rate limiting الجديدة — بتعرض عدد فعلي (محاولات/دقايق) بدل نص عام
      attemptsRemainingLogin: "متبقي لك {n} محاولات قبل ما الحساب يتقفل مؤقتًا",
      accountLockedBody: "الحساب اتقفل مؤقتًا بسبب محاولات دخول كتير غلط. حاول تاني بعد {m} دقيقة",
      rateLimitedBody: "طلبات كتير من نفس الشبكة. حاول تاني بعد {m} دقيقة",
    },
    register: {
      title: "إنشاء حساب",
      subtitle: "ادخل بياناتك لإنشاء حساب جديد",
      name: "الاسم الكامل",
      namePlaceholder: "الاسم الكامل",
      email: "الإيميل",
      password: "كلمة المرور",
      submit: "إنشاء الحساب",
      switchText: "عندك حساب بالفعل؟",
      switchCta: "سجّل دخولك",
      errEmpty: "من فضلك ادخل جميع البيانات",
      errFail: "حصل خطأ، حاول تاني",
      errRegistered: "تم التسجيل، حاول تسجيل الدخول",
      errNameTaken: "الاسم ده موجود بالفعل، جرب اسم تاني",
      errEmailTaken: "الإيميل ده مسجل بالفعل، جرب تسجيل الدخول",
      errWeakPassword: "كلمة المرور لازم تكون 8 أحرف على الأقل",
      errRateLimitedRetry: "محاولات تسجيل كتير من نفس الشبكة. حاول تاني بعد {m} دقيقة",
    },
    forgot: {
      title: "استعادة كلمة المرور",
      subtitleStep1: "ادخل إيميلك وهنبعتلك كود التحقق",
      subtitleStep2: "ادخل الكود المكوّن من 6 أرقام اللي وصلك بالإيميل",
      subtitleStep3: "ادخل كلمة المرور الجديدة مرتين للتأكيد",
      email: "الإيميل",
      emailPlaceholder: "example@email.com",
      sendCode: "إرسال الكود",
      code: "كود التحقق",
      codePlaceholder: "------",
      verifyCode: "تأكيد الكود",
      newPassword: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور",
      confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
      resetSubmit: "تحديث كلمة المرور",
      backToLogin: "الرجوع لتسجيل الدخول",
      changeEmail: "تغيير الإيميل",
      resend: "إعادة إرسال الكود",
      resendIn: "إعادة الإرسال بعد {s} ثانية",
      genericSent: "لو الإيميل ده مسجل عندنا، وصله كود التحقق",
      codeVerified: "تم التأكد من الكود، اختر كلمة مرور جديدة",
      successReset: "تم تحديث كلمة المرور بنجاح، سجّل دخولك دلوقتي",
      errEmpty: "من فضلك ادخل جميع البيانات",
      errInvalidEmail: "الإيميل مش صحيح",
      errWeakPassword: "كلمة المرور لازم تكون 8 أحرف على الأقل",
      errInvalidCode: "الكود غلط أو انتهت صلاحيته",
      errTooManyAttempts: "تجاوزت عدد المحاولات المسموح (5 كل 12 ساعة)، حاول تاني بعدين",
      errRateLimited: "طلبات كتير، حاول تاني بعد شوية",
      errPasswordMismatch: "كلمتا المرور غير متطابقتين",
      errFail: "حصل خطأ، حاول تاني",
      attemptsRemaining: "متبقي لك {n} من 5 محاولات",
      attemptsBlockedTitle: "تم إيقاف المحاولات مؤقتًا",
      attemptsBlockedBody: "تجاوزت الحد الأقصى للمحاولات (5 كل 12 ساعة). من فضلك حاول تاني بعد فترة.",
    },
  },
  en: {
    font: "'DM Sans', sans-serif",
    dir: "ltr",
    login: {
      title: "Welcome back",
      subtitle: "Sign in to continue",
      identifier: "Name or Email",
      identifierPlaceholder: "Enter your name or email",
      password: "Password",
      submit: "Sign in",
      switchText: "Don't have an account?",
      switchCta: "Sign up",
      forgotLink: "Forgot password?",
      errEmpty: "Please fill in all fields",
      errWrong: "Incorrect name or password",
      errNameTaken: "This name is already taken",
      errEmailTaken: "This email is already registered",
      errRateLimited: "Too many attempts, login temporarily locked. Try again shortly",
      mfaSubtitle: "This account is protected by an extra verification step. Enter the code from your authenticator app",
      mfaCodeLabel: "Verification code",
      mfaSubmit: "Confirm and sign in",
      errMfaInvalid: "Invalid code, please try again",
      attemptsRemainingLogin: "{n} attempts remaining before the account is temporarily locked",
      accountLockedBody: "Account temporarily locked due to too many failed attempts. Try again in {m} minute(s)",
      rateLimitedBody: "Too many requests from this network. Try again in {m} minute(s)",
    },
    register: {
      title: "Create account",
      subtitle: "Enter your details to get started",
      name: "Full Name",
      namePlaceholder: "Your full name",
      email: "Email",
      password: "Password",
      submit: "Create account",
      switchText: "Already have an account?",
      switchCta: "Sign in",
      errEmpty: "Please fill in all fields",
      errFail: "Something went wrong, try again",
      errRegistered: "Registered! Please sign in",
      errNameTaken: "This name is already taken",
      errEmailTaken: "This email is already registered",
      errWeakPassword: "Password must be at least 8 characters",
      errRateLimitedRetry: "Too many sign-ups from this network. Try again in {m} minute(s)",
    },
    forgot: {
      title: "Reset password",
      subtitleStep1: "Enter your email and we'll send you a verification code",
      subtitleStep2: "Enter the 6-digit code sent to your email",
      subtitleStep3: "Enter your new password twice to confirm",
      email: "Email",
      emailPlaceholder: "example@email.com",
      sendCode: "Send code",
      code: "Verification code",
      codePlaceholder: "------",
      verifyCode: "Verify code",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      confirmPasswordPlaceholder: "Re-enter your new password",
      resetSubmit: "Update password",
      backToLogin: "Back to sign in",
      changeEmail: "Change email",
      resend: "Resend code",
      resendIn: "Resend in {s}s",
      genericSent: "If this email is registered, a verification code has been sent",
      codeVerified: "Code verified — choose a new password",
      successReset: "Password updated successfully — please sign in",
      errEmpty: "Please fill in all fields",
      errInvalidEmail: "Please enter a valid email",
      errWeakPassword: "Password must be at least 8 characters",
      errInvalidCode: "Invalid or expired code",
      errTooManyAttempts: "Too many attempts (max 5 per 12 hours), please try again later",
      errRateLimited: "Too many requests, please try again shortly",
      errPasswordMismatch: "Passwords do not match",
      errFail: "Something went wrong, try again",
      attemptsRemaining: "{n} of 5 attempts remaining",
      attemptsBlockedTitle: "Attempts temporarily blocked",
      attemptsBlockedBody: "You've reached the maximum number of attempts (5 per 12 hours). Please try again later.",
    },
  },
  es: {
    font: "'DM Sans', sans-serif",
    dir: "ltr",
    errNameTaken: "Este nombre ya está en uso",
    errEmailTaken: "Este correo ya está registrado",
    login: {
      title: "Bienvenido de nuevo",
      subtitle: "Inicia sesión para continuar",
      identifier: "Nombre o correo",
      identifierPlaceholder: "Tu nombre o correo electrónico",
      password: "Contraseña",
      submit: "Iniciar sesión",
      switchText: "¿No tienes cuenta?",
      switchCta: "Regístrate",
      forgotLink: "¿Olvidaste tu contraseña?",
      errEmpty: "Por favor completa todos los campos",
      errWrong: "Nombre o contraseña incorrectos",
      errRateLimited: "Demasiados intentos, inicio de sesión bloqueado temporalmente. Inténtalo más tarde",
      mfaSubtitle: "Esta cuenta está protegida por un paso de verificación adicional. Ingresa el código de tu app de autenticación",
      mfaCodeLabel: "Código de verificación",
      mfaSubmit: "Confirmar e iniciar sesión",
      errMfaInvalid: "Código incorrecto, inténtalo de nuevo",
      attemptsRemainingLogin: "Te quedan {n} intentos antes de que la cuenta se bloquee temporalmente",
      accountLockedBody: "Cuenta bloqueada temporalmente por demasiados intentos fallidos. Inténtalo de nuevo en {m} minuto(s)",
      rateLimitedBody: "Demasiadas solicitudes desde esta red. Inténtalo de nuevo en {m} minuto(s)",
    },
    register: {
      title: "Crear cuenta",
      subtitle: "Ingresa tus datos para comenzar",
      name: "Nombre completo",
      namePlaceholder: "Tu nombre completo",
      email: "Correo electrónico",
      password: "Contraseña",
      submit: "Crear cuenta",
      switchText: "¿Ya tienes cuenta?",
      switchCta: "Inicia sesión",
      errEmpty: "Por favor completa todos los campos",
      errFail: "Algo salió mal, inténtalo de nuevo",
      errRegistered: "Registrado. Por favor inicia sesión",
      errNameTaken: "Este nombre ya está en uso",
      errEmailTaken: "Este correo ya está registrado",
      errWeakPassword: "La contraseña debe tener al menos 8 caracteres",
      errRateLimitedRetry: "Demasiados registros desde esta red. Inténtalo de nuevo en {m} minuto(s)",
    },
    forgot: {
      title: "Restablecer contraseña",
      subtitleStep1: "Ingresa tu correo y te enviaremos un código de verificación",
      subtitleStep2: "Ingresa el código de 6 dígitos enviado a tu correo",
      subtitleStep3: "Ingresa tu nueva contraseña dos veces para confirmar",
      email: "Correo electrónico",
      emailPlaceholder: "example@email.com",
      sendCode: "Enviar código",
      code: "Código de verificación",
      codePlaceholder: "------",
      verifyCode: "Verificar código",
      newPassword: "Nueva contraseña",
      confirmPassword: "Confirmar contraseña",
      confirmPasswordPlaceholder: "Vuelve a ingresar tu contraseña",
      resetSubmit: "Actualizar contraseña",
      backToLogin: "Volver a iniciar sesión",
      changeEmail: "Cambiar correo",
      resend: "Reenviar código",
      resendIn: "Reenviar en {s}s",
      genericSent: "Si este correo está registrado, se envió un código de verificación",
      codeVerified: "Código verificado — elige una nueva contraseña",
      successReset: "Contraseña actualizada — inicia sesión ahora",
      errEmpty: "Por favor completa todos los campos",
      errInvalidEmail: "Ingresa un correo válido",
      errWeakPassword: "La contraseña debe tener al menos 8 caracteres",
      errInvalidCode: "Código inválido o expirado",
      errTooManyAttempts: "Demasiados intentos (máx 5 cada 12 horas), inténtalo más tarde",
      errRateLimited: "Demasiadas solicitudes, inténtalo de nuevo en un momento",
      errPasswordMismatch: "Las contraseñas no coinciden",
      errFail: "Algo salió mal, inténtalo de nuevo",
      attemptsRemaining: "Te quedan {n} de 5 intentos",
      attemptsBlockedTitle: "Intentos bloqueados temporalmente",
      attemptsBlockedBody: "Has alcanzado el número máximo de intentos (5 cada 12 horas). Inténtalo más tarde.",
    },
  },
};
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;


/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */
function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function ArrowLeft({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function EyeIcon({ size = 16, open = true }) {
  return open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   FORGOT PASSWORD FORM  (كومبوننت 2 من تقسيم authModel.jsx)
   3 خطوات: 1) إيميل  2) كود التحقق  3) باسورد جديد ×2
═══════════════════════════════════════════════════════ */
export default function ForgotPasswordForm({ onSwitch }) {
  const { language, isRTL } = useLanguage();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ حالة "نسيت الباسورد" — 3 خطوات: 1) إيميل  2) كود  3) باسورد جديد ×2
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const [forgotInfo, setForgotInfo] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // ✅ عداد "إعادة الإرسال" — بيبدأ 60 ثانية بعد كل إرسال (أول مرة أو resend)
  const [resendCooldown, setResendCooldown] = useState(0);

  // ✅ متبقي كام محاولة من الـ 5 (null لحد ما نستقبل أول رد من السيرفر)،
  // وحالة "اتقفل تمامًا" لو المستخدم خلّص كل محاولاته خلال آخر 12 ساعة —
  // في الحالة دي مفيش أي زرار (إرسال/إعادة إرسال/تحقق) بيشتغل خالص.
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [attemptsBlocked, setAttemptsBlocked] = useState(false);

  const i18n = AUTH_I18N[language] ?? AUTH_I18N["en"];
  const tx = i18n.forgot;

  // ✅ لما اللغة تتغير، أو أول ما المودال ده يتفتح، ابدأ من الخطوة الأولى دايمًا
  useEffect(() => {
    setForgotStep(1);
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotSuccess(false);
    setForgotInfo("");
    setError("");
    setResendCooldown(0);
    setRemainingAttempts(null);
    setAttemptsBlocked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ✅ عداد الـ resend التنازلي — ثانية بثانية
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ✅ خطوة 1: إرسال الإيميل → استلام كود، وبدء عداد الـ 60 ثانية
  const handleForgotSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setForgotInfo("");

    if (!forgotEmail) { setError(tx.errEmpty); return; }
    if (!SIMPLE_EMAIL_REGEX.test(forgotEmail)) { setError(tx.errInvalidEmail); return; }

    // ✅ إيميل جديد = صفحة جديدة تمامًا بالنسبة لعداد المحاولات المعروض
    setRemainingAttempts(null);
    setAttemptsBlocked(false);

    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      // 🔒 SECURITY: لو الحساب ده خلّص محاولاته الـ 5 خلال آخر 12 ساعة،
      // السيرفر بيرفض يبعت كود جديد خالص — نوقف المستخدم هنا ونوضحله السبب.
      if (res.status === 429 && data.error === "too_many_attempts") {
        setAttemptsBlocked(true);
        setError(tx.errTooManyAttempts);
        return;
      }
      if (res.status === 429) {
        setError(tx.errRateLimited);
        return;
      }
      if (!res.ok && res.status !== 400) {
        setError(tx.errFail);
        return;
      }

      // 🔒 SECURITY: مهما كان الرد (الإيميل موجود أو لأ)، بننتقل لخطوة إدخال
      // الكود ونعرض نفس الرسالة العامة — عشان مانورّيش مين مسجل عندنا.
      setForgotStep(2);
      setForgotInfo(tx.genericSent);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setLoading(false);
      setError(tx.errFail);
    }
  };

  // ✅ خطوة 2: التحقق من الكود بس (من غير تغيير الباسورد)
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");

    if (!forgotCode) { setError(tx.errEmpty); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: forgotCode.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (typeof data.remainingAttempts === "number") {
        setRemainingAttempts(data.remainingAttempts);
      }

      if (!res.ok) {
        if (data.error === "too_many_attempts") {
          setAttemptsBlocked(true);
          setError(tx.errTooManyAttempts);
          return;
        }
        // 🔒 SECURITY: لسه ما اتخصمش من الـ 5 محاولات — المستخدم لازم بس
        // يستنى الفاصل الزمني (5 دقايق) قبل ما يحاول تاني.
        if (data.error === "attempt_too_soon") {
          const minutes = Math.max(1, Math.ceil((data.retryAfterSeconds || 0) / 60));
          setError(tx.errAttemptTooSoon.replace("{m}", minutes));
          return;
        }
        if (data.error === "invalid_or_expired_code") { setError(tx.errInvalidCode); return; }
        setError(tx.errFail);
        return;
      }

      // ✅ الكود صح — ننتقل لخطوة إدخال الباسورد الجديد
      setForgotStep(3);
      setForgotInfo(tx.codeVerified);
    } catch {
      setLoading(false);
      setError(tx.errFail);
    }
  };

  // ✅ خطوة 3: الباسورد الجديد (مرتين للتأكيد) → تحديث فعلي
  const handleForgotResetSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!forgotNewPassword || !forgotConfirmPassword) { setError(tx.errEmpty); return; }
    if (forgotNewPassword.length < 8) { setError(tx.errWeakPassword); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setError(tx.errPasswordMismatch); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: forgotCode.trim(),
          newPassword: forgotNewPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (typeof data.remainingAttempts === "number") {
        setRemainingAttempts(data.remainingAttempts);
      }

      if (!res.ok) {
        if (data.error === "too_many_attempts") {
          setAttemptsBlocked(true);
          setError(tx.errTooManyAttempts);
          return;
        }
        if (data.error === "attempt_too_soon") {
          const minutes = Math.max(1, Math.ceil((data.retryAfterSeconds || 0) / 60));
          setError(tx.errAttemptTooSoon.replace("{m}", minutes));
          return;
        }
        if (data.error === "invalid_or_expired_code") { setError(tx.errInvalidCode); return; }
        if (data.error === "weak_password") { setError(tx.errWeakPassword); return; }
        setError(tx.errFail);
        return;
      }

      // ✅ اتحدث الباسورد فعليًا
      setForgotSuccess(true);
      setForgotInfo(tx.successReset);
      setForgotCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch {
      setLoading(false);
      setError(tx.errFail);
    }
  };

  // ✅ إعادة إرسال الكود من غير ما نرجّع المستخدم لخطوة 1 (نفس الإيميل)،
  // متاحة بس لو العداد وصل للصفر
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading || attemptsBlocked) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.status === 429 && data.error === "too_many_attempts") {
        setAttemptsBlocked(true);
        setError(tx.errTooManyAttempts);
        return;
      }
      if (res.status === 429) { setError(tx.errRateLimited); return; }

      setForgotInfo(tx.genericSent);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setLoading(false);
      setError(tx.errFail);
    }
  };

  const eyePositionClass = isRTL ? "left-3" : "right-3";
  const passwordPaddingClass = isRTL ? "pl-11" : "pr-11";

  const forgotSubtitle =
    forgotStep === 1 ? tx.subtitleStep1 : forgotStep === 2 ? tx.subtitleStep2 : tx.subtitleStep3;

  const resendLabel =
    resendCooldown > 0 ? tx.resendIn.replace("{s}", resendCooldown) : tx.resend;

  return (
    <>
      <div className="mb-6 sm:mb-7">
        {forgotStep > 1 && !forgotSuccess && (
          <button
            type="button"
            onClick={() => {
              setForgotStep(1);
              setForgotCode("");
              setForgotNewPassword("");
              setForgotConfirmPassword("");
              setError("");
              setForgotInfo("");
              setRemainingAttempts(null);
              setAttemptsBlocked(false);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            {isRTL ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
            {tx.changeEmail}
          </button>
        )}
        <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] tracking-tight">
          {tx.title}<span className="text-[#C9A227]">.</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-medium">{forgotSubtitle}</p>
      </div>

      {forgotSuccess ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-100">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-xs font-semibold text-green-700">{forgotInfo}</span>
          </div>
          <button
            onClick={() => onSwitch("login")}
            className="w-full py-3.5 bg-[#C9A227] text-white text-sm font-bold rounded-xl hover:bg-[#977a1d] active:scale-[0.98] transition-all shadow-md shadow-amber-900/20 flex items-center justify-center gap-2"
          >
            {tx.backToLogin}
            <ArrowRight size={14} />
          </button>
        </div>
      ) : forgotStep === 1 ? (
        /* ─── خطوة 1: الإيميل ─── */
        <form onSubmit={handleForgotSendCode} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {tx.email}
            </label>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => { setForgotEmail(e.target.value); setError(""); }}
              placeholder={tx.emailPlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth={2.5} strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-xs font-semibold text-[#C9A227]">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || attemptsBlocked}
            className="w-full mt-1 py-3.5 bg-[#C9A227] text-white text-sm font-bold rounded-xl hover:bg-[#977a1d] active:scale-[0.98] transition-all shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25} />
                <path d="M21 12a9 9 0 00-9-9" />
              </svg>
            ) : (
              <>
                {tx.sendCode}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      ) : forgotStep === 2 ? (
        /* ─── خطوة 2: الكود فقط ─── */
        attemptsBlocked ? (
          /* 🔒 خلّص كل محاولاته — مفيش أي زرار شغال هنا خالص */
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-red-50 border border-red-100">
              <svg width={16} height={16} className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth={2.5} strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-sm font-bold text-[#C9A227]">{tx.attemptsBlockedTitle}</p>
                <p className="text-xs text-[#C9A227]/80 mt-1 font-medium leading-relaxed">{tx.attemptsBlockedBody}</p>
              </div>
            </div>
          </div>
        ) : (
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
          {forgotInfo && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-green-50 border border-green-100">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-xs font-semibold text-green-700">{forgotInfo}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {tx.code}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={forgotCode}
              onChange={(e) => { setForgotCode(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder={tx.codePlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold tracking-[0.4em] text-center text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all"
              dir="ltr"
            />
            {/* ✅ عدد المحاولات المتبقية — بيظهر بس بعد أول محاولة تحقق فعلية */}
            {remainingAttempts !== null && (
              <p className={`text-xs mt-1.5 font-semibold ${remainingAttempts <= 2 ? "text-[#C9A227]" : "text-gray-400"}`}>
                {tx.attemptsRemaining.replace("{n}", remainingAttempts)}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth={2.5} strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-xs font-semibold text-[#C9A227]">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || forgotCode.length !== 6}
            className="w-full mt-1 py-3.5 bg-[#C9A227] text-white text-sm font-bold rounded-xl hover:bg-[#977a1d] active:scale-[0.98] transition-all shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25} />
                <path d="M21 12a9 9 0 00-9-9" />
              </svg>
            ) : (
              <>
                {tx.verifyCode}
                <ArrowRight size={14} />
              </>
            )}
          </button>

          {/* ✅ زرار الـ resend — متعطل ومعروض عليه العداد التنازلي لحد ما يوصل صفر */}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading || resendCooldown > 0}
            className="text-center text-xs font-bold text-[#C9A227] hover:underline transition-all disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
          >
            {resendLabel}
          </button>
        </form>
        )
      ) : (
        /* ─── خطوة 3: الباسورد الجديد ×2 ─── */
        <form onSubmit={handleForgotResetSubmit} className="flex flex-col gap-4">
          {forgotInfo && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-green-50 border border-green-100">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-xs font-semibold text-green-700">{forgotInfo}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {tx.newPassword}
            </label>
            <div className="relative">
              <input
                type={showForgotPass ? "text" : "password"}
                value={forgotNewPassword}
                onChange={(e) => { setForgotNewPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className={`w-full px-4 py-3 ${passwordPaddingClass} rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all`}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowForgotPass((v) => !v)}
                className={`absolute ${eyePositionClass} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors`}
              >
                <EyeIcon size={16} open={showForgotPass} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">
              {tx.errWeakPassword}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {tx.confirmPassword}
            </label>
            <div className="relative">
              <input
                type={showForgotConfirmPass ? "text" : "password"}
                value={forgotConfirmPassword}
                onChange={(e) => { setForgotConfirmPassword(e.target.value); setError(""); }}
                placeholder={tx.confirmPasswordPlaceholder}
                className={`w-full px-4 py-3 ${passwordPaddingClass} rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all`}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowForgotConfirmPass((v) => !v)}
                className={`absolute ${eyePositionClass} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors`}
              >
                <EyeIcon size={16} open={showForgotConfirmPass} />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth={2.5} strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-xs font-semibold text-[#C9A227]">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-3.5 bg-[#C9A227] text-white text-sm font-bold rounded-xl hover:bg-[#977a1d] active:scale-[0.98] transition-all shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25} />
                <path d="M21 12a9 9 0 00-9-9" />
              </svg>
            ) : (
              <>
                {tx.resetSubmit}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      )}

      {!forgotSuccess && (
        <p className="text-center text-sm text-gray-400 mt-5 sm:mt-6 font-medium">
          <button
            onClick={() => onSwitch("login")}
            className="text-[#C9A227] font-bold hover:underline transition-all"
          >
            {tx.backToLogin}
          </button>
        </p>
      )}
    </>
  );
}