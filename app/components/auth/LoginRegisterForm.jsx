"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { signIn } from "next-auth/react";

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
      accountSuspendedBody: "الحساب ده متوقف حاليًا. تواصل مع الدعم لمزيد من التفاصيل",
      mfaBack: "رجوع",
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
      accountSuspendedBody: "This account is currently suspended. Contact support for details",
      mfaBack: "Back",
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
      accountSuspendedBody: "Esta cuenta está suspendida actualmente. Contacta con soporte para más detalles",
      mfaBack: "Volver",
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
// 🔒 SECURITY: أيقونة درع بسيطة تُستخدم في خطوة كود الـ MFA.
function ShieldIcon({ size = 16, color = "#2563eb" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   LOGIN / REGISTER FORM  (كومبوننت 1 من تقسيم authModel.jsx)
   بيتعامل مع: تسجيل الدخول، إنشاء حساب، وخطوة الـ MFA
   mode: "login" | "register"
═══════════════════════════════════════════════════════ */
export default function LoginRegisterForm({ mode, onClose, onSwitch }) {
  const router = useRouter();
  const { language, isRTL } = useLanguage();
  const [form, setForm] = useState({ nameOrEmail: "", name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔒 SECURITY: لما يبقى فيه MFA مفعّل على حساب أدمن، أول محاولة (باسورد
  // صح لسه من غير كود) بترجع "mfa_required" — بنعرض خطوة كود إضافية بدل ما
  // نعتبرها خطأ تسجيل دخول.
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  // ✅ عدد محاولات تسجيل الدخول المتبقية قبل قفل الحساب مؤقتًا — بيتحدث من
  // رد السيرفر (authOptions.js بيرجّعه جوه رسالة الخطأ نفسها، شوف
  // attemptLogin تحت). null لحد ما يوصلنا أول رد فيه العدد ده.
  const [loginRemainingAttempts, setLoginRemainingAttempts] = useState(null);
  // ✅ رسالة توضيحية بديلة (وقت القفل بالدقايق، أو ثواني الـ rate limit)
  // بتتبني ديناميكيًا من رقم بيجيلنا من السيرفر، مش نص ثابت.
  const [registerRetrySeconds, setRegisterRetrySeconds] = useState(null);

  const i18n = AUTH_I18N[language] ?? AUTH_I18N["en"];
  const isLogin = mode === "login";
  const tx = isLogin ? i18n.login : i18n.register;

  useEffect(() => {
    setError("");
    setMfaStep(false);
    setMfaCode("");
    setLoginRemainingAttempts(null);
    setRegisterRetrySeconds(null);
  }, [language, mode]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError("");
  };

  const attemptLogin = async (extra = {}) => {
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      nameOrEmail: form.nameOrEmail,
      password: form.password,
      ...extra,
    });
    setLoading(false);

    // ✅ authOptions.js بيبعت الخطأ على شكل "code:value" (مثال:
    // "invalid_credentials:3" أو "account_locked:840") عشان الـ UI يقدر
    // يعرض العدد/الوقت الفعلي بدل رسالة عامة بس. mfa_required مالوش قيمة
    // إضافية فبيفضل من غير ":".
    const [errCode, errParam] = String(res?.error || "").split(":");

    if (errCode === "mfa_required") {
      setMfaStep(true);
      setError("");
      setLoginRemainingAttempts(null);
      return;
    }

    if (errCode === "mfa_invalid") {
      const remaining = Number(errParam);
      setLoginRemainingAttempts(Number.isFinite(remaining) ? remaining : null);
      setError(tx.errMfaInvalid);
      return;
    }

    if (errCode === "invalid_credentials") {
      const remaining = Number(errParam);
      setLoginRemainingAttempts(Number.isFinite(remaining) ? remaining : null);
      setError(tx.errWrong);
      return;
    }

    if (errCode === "account_suspended") {
      setLoginRemainingAttempts(null);
      setError(tx.accountSuspendedBody);
      return;
    }

    if (errCode === "account_locked") {
      const seconds = Number(errParam) || 0;
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      setLoginRemainingAttempts(0);
      setError(tx.accountLockedBody.replace("{m}", minutes));
      return;
    }

    if (errCode === "rate_limited") {
      const seconds = Number(errParam) || 0;
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      setLoginRemainingAttempts(null);
      setError(tx.rateLimitedBody.replace("{m}", minutes));
      return;
    }

    if (res?.error) {
      setError(tx.errWrong);
      return;
    }

    onClose();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.nameOrEmail || !form.password) { setError(tx.errEmpty); return; }
    await attemptLogin();
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode) { setError(tx.errEmpty); return; }
    await attemptLogin({ mfaCode });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError(tx.errEmpty); return; }
    if (form.password.length < 8) { setError(tx.errWeakPassword); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        if (res.status === 429) {
          // ✅ /api/register بيرجّع retryAfterSeconds فعليًا — بنحوّله لدقايق
          // ونعرضه بدل رسالة عامة، بنفس أسلوب رسائل rate limit التانية.
          const seconds = Number(data.retryAfterSeconds) || 0;
          const minutes = Math.max(1, Math.ceil(seconds / 60));
          setRegisterRetrySeconds(seconds);
          setError(tx.errRateLimitedRetry.replace("{m}", minutes));
          return;
        }
        if (data.error === "name_taken")     { setError(tx.errNameTaken);     return; }
        if (data.error === "email_taken")    { setError(tx.errEmailTaken);    return; }
        if (data.error === "weak_password")  { setError(tx.errWeakPassword);  return; }
        setError(tx.errFail);
        return;
      }

      const signInRes = await signIn("credentials", {
        redirect: false,
        nameOrEmail: form.email,
        password: form.password,
      });
      setLoading(false);
      if (signInRes?.error) {
        setError(tx.errRegistered);
        onSwitch("login");
        return;
      }
      // 🆕 حساب جديد فعلًا وباين إنه دخل بنجاح → بدل ما نقفل المودال بس
      // ونسيبه على نفس الصفحة، بنقفله ونوديه لصفحة onboarding (خطوات
      // "أول مرة": الهدف، الدور الحالي، المهارات، المستوى التعليمي)، زي
      // تدفق Coursera بالظبط. لو رجع لاحقًا وكان خلّص onboarding قبل كده،
      // صفحة /onboarding نفسها هتحوّله على طول من غير ما تعرضله الخطوات.
      onClose();
      router.push("/onboarding");
    } catch {
      setLoading(false);
      setError(tx.errFail);
    }
  };

  const eyePositionClass = isRTL ? "left-3" : "right-3";
  const passwordPaddingClass = isRTL ? "pl-11" : "pr-11";

  return (
    <>
      <div className="mb-6 sm:mb-7">
        <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] tracking-tight">
          {tx.title}<span className="text-[#C9A227]">.</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-medium">{tx.subtitle}</p>
      </div>

      {isLogin && mfaStep ? (
        /* ─── خطوة MFA: كود من تطبيق الـ authenticator بتاع الأدمن ─── */
        <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
            <ShieldIcon />
            <span className="text-xs font-semibold text-blue-700">{tx.mfaSubtitle}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {tx.mfaCodeLabel}
            </label>
            <input
              type="text"
              inputMode="text"
              autoFocus
              value={mfaCode}
              onChange={(e) => { setMfaCode(e.target.value.trim()); setError(""); }}
              placeholder="123456"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold tracking-[0.3em] text-center text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all"
              dir="ltr"
            />
            {/* ✅ عدد محاولات كود الـ MFA المتبقية قبل قفل الحساب مؤقتًا */}
            {loginRemainingAttempts !== null && loginRemainingAttempts > 0 && (
              <p className={`text-xs mt-1.5 font-semibold text-center ${loginRemainingAttempts <= 2 ? "text-[#C9A227]" : "text-gray-400"}`}>
                {tx.attemptsRemainingLogin.replace("{n}", loginRemainingAttempts)}
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
            disabled={loading || !mfaCode}
            className="w-full mt-1 py-3.5 bg-[#C9A227] text-white text-sm font-bold rounded-xl hover:bg-[#977a1d] active:scale-[0.98] transition-all shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25} />
                <path d="M21 12a9 9 0 00-9-9" />
              </svg>
            ) : (
              <>{tx.mfaSubmit}</>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setMfaStep(false); setMfaCode(""); setError(""); }}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-all text-center"
          >
            {tx.mfaBack}
          </button>
        </form>
      ) : (
        <form onSubmit={isLogin ? handleLogin : handleRegister} className="flex flex-col gap-4">

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {i18n.register.name}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                placeholder={i18n.register.namePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {isLogin ? i18n.login.identifier : i18n.register.email}
            </label>
            <input
              type={isLogin ? "text" : "email"}
              value={isLogin ? form.nameOrEmail : form.email}
              onChange={handleChange(isLogin ? "nameOrEmail" : "email")}
              placeholder={isLogin ? i18n.login.identifierPlaceholder : "example@email.com"}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all"
              dir={isLogin && isRTL ? "rtl" : "ltr"}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                {tx.password}
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => onSwitch("forgot")}
                  className="text-xs font-bold text-[#C9A227] hover:underline transition-all"
                >
                  {i18n.login.forgotLink}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={handleChange("password")}
                placeholder="••••••••"
                className={`w-full px-4 py-3 ${passwordPaddingClass} rounded-xl border border-gray-200 text-sm font-medium text-[#0a0a0a] placeholder-gray-300 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/10 transition-all`}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className={`absolute ${eyePositionClass} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors`}
              >
                <EyeIcon size={16} open={showPass} />
              </button>
            </div>
            {!isLogin && (
              <p className="text-xs text-gray-400 mt-1.5 font-medium">
                {i18n.register.errWeakPassword}
              </p>
            )}
            {/* ✅ عدد محاولات تسجيل الدخول المتبقية قبل قفل الحساب مؤقتًا —
                بيظهر بس بعد أول محاولة فاشلة فعلية (السيرفر هو اللي بيحدد الرقم) */}
            {isLogin && loginRemainingAttempts !== null && loginRemainingAttempts > 0 && (
              <p className={`text-xs mt-1.5 font-semibold ${loginRemainingAttempts <= 2 ? "text-[#C9A227]" : "text-gray-400"}`}>
                {tx.attemptsRemainingLogin.replace("{n}", loginRemainingAttempts)}
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
                {tx.submit}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      )}

      {!(isLogin && mfaStep) && (
        <p className="text-center text-sm text-gray-400 mt-5 sm:mt-6 font-medium">
          {tx.switchText}{" "}
          <button
            onClick={() => onSwitch(isLogin ? "register" : "login")}
            className="text-[#C9A227] font-bold hover:underline transition-all"
          >
            {tx.switchCta}
          </button>
        </p>
      )}
    </>
  );
}