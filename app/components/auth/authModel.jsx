"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import LoginRegisterForm from "./LoginRegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";

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
      errTooManyAttempts: "تجاوزت عدد المحاولات المسموح (5 محاولات)، حاول تاني بعد 24 ساعة",
      errAttemptTooSoon: "لازم تستنى {m} دقيقة قبل ما تحاول تاني",
      errRateLimited: "طلبات كتير، حاول تاني بعد شوية",
      errPasswordMismatch: "كلمتا المرور غير متطابقتين",
      errFail: "حصل خطأ، حاول تاني",
      attemptsRemaining: "متبقي لك {n} من 5 محاولات",
      attemptsBlockedTitle: "تم إيقاف المحاولات مؤقتًا",
      attemptsBlockedBody: "تجاوزت الحد الأقصى للمحاولات (5 محاولات). من فضلك حاول تاني بعد 24 ساعة.",
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
      errTooManyAttempts: "Too many attempts (max 5), please try again in 24 hours",
      errAttemptTooSoon: "Please wait {m} minute(s) before trying again",
      errRateLimited: "Too many requests, please try again shortly",
      errPasswordMismatch: "Passwords do not match",
      errFail: "Something went wrong, try again",
      attemptsRemaining: "{n} of 5 attempts remaining",
      attemptsBlockedTitle: "Attempts temporarily blocked",
      attemptsBlockedBody: "You've reached the maximum number of attempts (5). Please try again in 24 hours.",
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
      errTooManyAttempts: "Demasiados intentos (máx 5), inténtalo de nuevo en 24 horas",
      errAttemptTooSoon: "Espera {m} minuto(s) antes de volver a intentarlo",
      errRateLimited: "Demasiadas solicitudes, inténtalo de nuevo en un momento",
      errPasswordMismatch: "Las contraseñas no coinciden",
      errFail: "Algo salió mal, inténtalo de nuevo",
      attemptsRemaining: "Te quedan {n} de 5 intentos",
      attemptsBlockedTitle: "Intentos bloqueados temporalmente",
      attemptsBlockedBody: "Has alcanzado el número máximo de intentos (5). Inténtalo de nuevo en 24 horas.",
    },
  },
};

function XIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   AUTH MODAL — الحاوية المشتركة (overlay + بطاقة المودال)
   mode: "login" | "register" | "forgot"

   authModel.jsx الأصلي اتقسم لـ 2 كومبوننت:
   - LoginRegisterForm.jsx  → تسجيل الدخول / إنشاء حساب / MFA
   - ForgotPasswordForm.jsx → نسيت كلمة المرور (3 خطوات)
   وده الملف بيقرر أي واحد يتعرض حسب الـ mode.
═══════════════════════════════════════════════════════ */
export default function AuthModal({ mode, onClose, onSwitch }) {
  const { language, isRTL } = useLanguage();
  const overlayRef = useRef(null);
  const i18n = AUTH_I18N[language] ?? AUTH_I18N["en"];

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(10,10,10,0.55)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="modal-card relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        dir={i18n.dir}
        style={{ fontFamily: i18n.font }}
      >
        <div className="h-1 w-full bg-[#C9A227]" />

        <button
          onClick={onClose}
          className="absolute top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10"
          style={{ right: isRTL ? "auto" : "1rem", left: isRTL ? "1rem" : "auto" }}
        >
          <XIcon size={16} />
        </button>

        {/* Modal padding: smaller on mobile */}
        <div className="px-5 sm:px-8 pt-7 sm:pt-8 pb-8 sm:pb-10">
          {mode === "forgot" ? (
            <ForgotPasswordForm onSwitch={onSwitch} />
          ) : (
            <LoginRegisterForm mode={mode} onClose={onClose} onSwitch={onSwitch} />
          )}
        </div>
      </div>
    </div>
  );
}