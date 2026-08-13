"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { signIn, signOut, useSession } from "next-auth/react";

/* ─────────────────────────────────────────
  FETCH HOOK
───────────────────────────────────────── */
function useNavbarData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=navbar")
      .then((r) => r.json())
      .then((res) => {
        const doc = Array.isArray(res) ? res[0] : res;
        setData(doc);
      })
      .catch(console.error);
  }, []);
  return data;
}

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
function ChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function Globe({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}
function MenuIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function XIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
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

/* ─────────────────────────────────────────
   LANGUAGE DROPDOWN
───────────────────────────────────────── */
function LangDropdown({ languages }) {
  const { language, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#0a0a0a] border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-150"
      >
        <Globe size={13} />
        <span>{current.code.toUpperCase()}</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={12} />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-40 sm:w-44 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/8 overflow-hidden z-50 animate-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 ${
                lang.code === language
                  ? "bg-[#f7f7f7] text-[#0a0a0a] font-bold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#0a0a0a] font-medium"
              }`}
            >
              <span>{lang.label}</span>
              {lang.code === language && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   USER DROPDOWN
───────────────────────────────────────── */
function UserDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-150"
      >
        <span className="w-7 h-7 rounded-full bg-[#C9A227] text-white text-xs font-bold flex items-center justify-center">
          {initial}
        </span>
        <span className="hidden sm:block text-sm font-semibold text-[#0a0a0a] max-w-[80px] truncate">
          {user?.name}
        </span>
        <span className={`transition-transform duration-200 text-gray-400 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={12} />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/8 overflow-hidden z-50 animate-dropdown">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-[#0a0a0a] truncate">{user?.name}</p>
            {user?.phone && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{user.phone}</p>
            )}
          </div>
          <button
            onClick={() => { signOut({ callbackUrl: "/" }); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#C9A227] hover:bg-amber-50 transition-colors font-medium border-t border-gray-100"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

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
   AUTH MODAL
   mode: "login" | "register" | "forgot"
───────────────────────────────────────── */
function AuthModal({ mode, onClose, onSwitch }) {
  const { language, isRTL } = useLanguage();
  const [form, setForm] = useState({ nameOrEmail: "", name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);

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
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const tx = isLogin ? i18n.login : isForgot ? i18n.forgot : i18n.register;

  useEffect(() => {
    setError("");
    setForgotInfo("");
  }, [language, mode]);

  // ✅ لما تفتح مودال "نسيت الباسورد" من جديد، ابدأ من الخطوة الأولى دايمًا
  useEffect(() => {
    if (isForgot) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ✅ عداد الـ resend التنازلي — ثانية بثانية
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.nameOrEmail || !form.password) { setError(tx.errEmpty); return; }
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      nameOrEmail: form.nameOrEmail,
      password: form.password,
    });
    setLoading(false);
    if (res?.error) setError(tx.errWrong);
    else onClose();
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
      if (signInRes?.error) { setError(tx.errRegistered); onSwitch("login"); }
      else onClose();
    } catch {
      setLoading(false);
      setError(tx.errFail);
    }
  };

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

          {/* ═══════════ FORGOT PASSWORD MODE ═══════════ */}
          {isForgot ? (
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
          ) : (
            /* ═══════════ LOGIN / REGISTER MODE ═══════════ */
            <>
              <div className="mb-6 sm:mb-7">
                <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] tracking-tight">
                  {tx.title}<span className="text-[#C9A227]">.</span>
                </h2>
                <p className="text-sm text-gray-400 mt-1 font-medium">{tx.subtitle}</p>
              </div>

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

              <p className="text-center text-sm text-gray-400 mt-5 sm:mt-6 font-medium">
                {tx.switchText}{" "}
                <button
                  onClick={() => onSwitch(isLogin ? "register" : "login")}
                  className="text-[#C9A227] font-bold hover:underline transition-all"
                >
                  {tx.switchCta}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
  NAVBAR COMPONENT
═══════════════════════════════════════ */
export default function Navbar() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const data = useNavbarData();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);

  if (pathname.startsWith("/admin")) return null;

  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (!data || !data.i18n) return null;

  const t = data.i18n[language] ?? data.i18n["en"];
  const isRTL = language === "ar";

  const openModal = (mode) => {
    setMenuOpen(false);
    setAuthModal(mode);
  };

  const AuthControls = () => {
    if (isLoading) {
      return <div className="w-20 sm:w-24 h-9 rounded-lg bg-gray-100 animate-pulse" />;
    }
    if (isLoggedIn) {
      return <UserDropdown user={session.user} />;
    }
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openModal("login")}
          className="px-3 sm:px-4 py-2 text-sm font-bold text-[#0a0a0a] border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
        >
          Log in
        </button>
        <button
          onClick={() => openModal("register")}
          className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#C9A227] text-white text-sm font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-[#977a1d] active:scale-95 transition-all shadow-sm shadow-amber-900/20"
        >
          Sign up
          <ArrowRight size={13} />
        </button>
      </div>
    );
  };

  const MobileAuthControls = () => {
    if (isLoading) return null;
    if (isLoggedIn) {
      return (
        <>
          <div className="flex items-center gap-3 py-3 px-2 border-b border-gray-100">
            <span className="w-8 h-8 rounded-full bg-[#C9A227] text-white text-sm font-bold flex items-center justify-center">
              {session.user?.name?.charAt(0)?.toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-bold text-[#0a0a0a]">{session.user?.name}</p>
              {session.user?.phone && (
                <p className="text-xs text-gray-400">{session.user.phone}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => { signOut({ callbackUrl: "/" }); setMenuOpen(false); }}
            className="w-full text-left py-3 px-2 text-base font-medium text-[#C9A227] hover:opacity-80 transition-opacity"
          >
            Sign out
          </button>
        </>
      );
    }
    return (
      <div className="flex gap-2 mt-3 pt-2">
        <button
          onClick={() => openModal("login")}
          className="flex-1 text-center py-3 text-sm font-bold border border-gray-200 rounded-lg text-[#0a0a0a] hover:bg-gray-50 transition-colors"
        >
          Log in
        </button>
        <button
          onClick={() => openModal("register")}
          className="flex-1 text-center py-3 text-sm font-bold bg-[#C9A227] text-white rounded-lg hover:bg-[#977a1d] transition-colors"
        >
          Sign up
        </button>
      </div>
    );
  };

  return (
    <>
      <style>{NAV_STYLES}</style>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
        />
      )}
<nav
  dir={isRTL ? "rtl" : "ltr"}
  className="sticky top-0 z-50 bg-white border-b border-gray-100"
  style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
>
        {/* Navbar bar — px-5 on mobile, px-16 on desktop */}
        <div className="mx-auto px-5 sm:px-8 md:px-16 h-[60px] sm:h-[68px] flex items-center justify-between gap-4">

          {/* Logo */}
<Link href="/" className="shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity">
  {data.logoHref && (
    <img
      src={data.logoHref}
      alt={t.brand}
      className="h-12 w-12 sm:h-14 sm:w-14 md:h-14 md:w-14 object-cover rounded-full ring-2 ring-[#C9A227]/30"
    />
  )}
  <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-[#C9A227]">
    {t.brand}
  </span>
</Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
{data.links
  .filter((_, i) => i !== 4 && i !== 5)
  .map((link) => (
    <Link
      key={link.id}
      href={link.href}
      className="relative px-3 py-2 text-lg font-medium text-gray-500 hover:text-[#0a0a0a] transition-colors tracking-wide group"
    >
      {t.links[link.id]}
      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#C9A227] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
    </Link>
  ))}
          </div>

          {/* Desktop right controls */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <LangDropdown languages={data.languages} />
            <AuthControls />
          </div>

          {/* Mobile right controls */}
          <div className="lg:hidden flex items-center gap-2">
            <LangDropdown languages={data.languages} />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        }`}>
          <div className="bg-white border-t border-gray-100 px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-1">
{data.links
  .filter((_, i) => i !== 4 && i !== 5)
  .map((link) => (
    <Link
      key={link.id}
      href={link.href}
      onClick={() => setMenuOpen(false)}
      className="flex items-center justify-between py-3 px-2 text-base font-medium text-gray-700 hover:text-[#C9A227] border-b border-gray-50 last:border-0 transition-colors group"
    >
      {t.links[link.id]}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight size={13} />
      </span>
    </Link>
  ))}
            <MobileAuthControls />
          </div>
        </div>
      </nav>
    </>
  );
}

const NAV_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=Tajawal:wght@400;700;800&display=swap');

  @keyframes dropdown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-dropdown { animation: dropdown 0.18s ease both; }

  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .modal-card { animation: modal-in 0.22s cubic-bezier(0.34,1.4,0.64,1) both; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .animate-spin { animation: spin 0.7s linear infinite; }

  /* xs breakpoint for flag visibility */
  @media (min-width: 480px) {
    .xs\\:inline { display: inline; }
  }
`;