"use client";

// app/student/page.jsx
//
// Phase 2 — اليوم 20-21: صفحة "My Courses". بتجيب:
//   - GET /api/enrollments   → كورسات الطالب المسجل فيها (populated بعنوان/
//     thumbnail الكورس) + progressPercent + source (free/membership/purchase/
//     admin_grant)
//   - GET /api/membership    → حالة عضوية الطالب الحالية (لو موجودة)

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BookOpen, Loader, CheckCircle2, Clock, Crown, AlertTriangle, ArrowRight, ArrowLeft, GraduationCap, Award, TrendingUp,
  Camera, Mail, Phone, User, X, Pencil, CreditCard,
} from "lucide-react";

const STRINGS = {
  ar: {
    title: "كورساتي",
    subtitle: "الكورسات اللي انت مسجل فيها",
    empty: "لسه معملتش enroll في أي كورس",
    browse: "تصفّح الكورسات",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل كورساتك",
    lessons: (n) => `${n} درس`,
    progress: (p) => `${p}% مكتمل`,
    completed: "مكتمل",
    sourceLabels: { free: "مجاني", membership: "عن طريق اشتراكك", purchase: "شراء", admin_grant: "منحة من الإدارة" },
    membershipTitle: "اشتراكك الحالي",
    noMembership: "معندكش اشتراك membership فعّال حاليًا",
    viewPlans: "اطّلع على خطط الاشتراك",
    expiresOn: (d) => `ينتهي في ${d}`,
    neverExpires: "من غير تاريخ انتهاء",
    statusLabels: { active: "فعّالة", inactive: "غير مفعّلة", expired: "منتهية", cancelled: "ملغاة" },
    continueLabel: "استكمال",
    myGrades: "درجاتي ونتائجي",
    navCourses: "كورساتي",
    navGrades: "درجاتي",
    navCertificates: "شهاداتي",
    navPayments: "مدفوعاتي",
    // Phase 7 — اليوم 57: ملخص شخصي (تقدمي/شهاداتي/كورساتي)
    summaryProgress: "متوسط تقدّمي",
    summaryActive: "كورسات جارية",
    summaryCompleted: "كورسات مكتملة",
    summaryCertificates: "شهاداتي",
    viewCertificates: "شوف شهاداتي",
    // Phase — الملف الشخصي (تعديل الاسم/الرقم/الصورة)
    editProfile: "تعديل الملف الشخصي",
    viewFullSize: "تكبير الصورة",
    close: "إغلاق",
    profileModalTitle: "الملف الشخصي",
    profileModalSubtitle: "عدّل بياناتك الشخصية",
    fieldEmail: "البريد الإلكتروني الحالي",
    emailLockedNote: "الإيميل مش قابل للتعديل من هنا",
    fieldName: "الاسم المسجّل به",
    fieldNamePlaceholder: "اكتب اسمك بالكامل",
    fieldPhone: "رقم الهاتف",
    fieldPhonePlaceholder: "أضف رقم هاتفك (اختياري)",
    changePhoto: "تغيير الصورة",
    save: "حفظ التعديلات",
    saving: "جارِ الحفظ...",
    cancel: "إلغاء",
    saveSuccess: "تم حفظ بياناتك بنجاح",
    errNameLen: "الاسم لازم يكون بين 2 و60 حرف",
    errPhoneInvalid: "رقم الهاتف مش بصيغة صحيحة",
    errAvatarType: "الصورة لازم تكون JPG أو GIF أو PNG",
    errAvatarSize: "حجم الصورة أكبر من المسموح (1MB)",
    errAvatarBroken: "حصلت مشكلة في تحميل الصورة بعد الرفع، جرّب تاني",
    errGeneric: "حصل خطأ، حاول تاني",
    uploadingPhoto: "جارِ رفع الصورة...",
    avatarHint: "أقصى حجم: 1MB. الصيغ المتاحة: JPG أو GIF أو PNG",
  },
  en: {
    title: "My Courses",
    subtitle: "Courses you're enrolled in",
    empty: "You haven't enrolled in any course yet",
    browse: "Browse Courses",
    loading: "Loading...",
    error: "Couldn't load your courses",
    lessons: (n) => `${n} lessons`,
    progress: (p) => `${p}% complete`,
    completed: "Completed",
    sourceLabels: { free: "Free", membership: "Via your membership", purchase: "Purchased", admin_grant: "Granted by admin" },
    membershipTitle: "Your current membership",
    noMembership: "You don't have an active membership right now",
    viewPlans: "View membership plans",
    expiresOn: (d) => `Expires on ${d}`,
    neverExpires: "No expiry date",
    statusLabels: { active: "Active", inactive: "Inactive", expired: "Expired", cancelled: "Cancelled" },
    continueLabel: "Continue",
    myGrades: "My Grades & Results",
    navCourses: "My Courses",
    navGrades: "My Grades",
    navCertificates: "My Certificates",
    navPayments: "My Payments",
    summaryProgress: "Average Progress",
    summaryActive: "Active Courses",
    summaryCompleted: "Completed Courses",
    summaryCertificates: "My Certificates",
    viewCertificates: "View my certificates",
    editProfile: "Edit Profile",
    viewFullSize: "View full size",
    close: "Close",
    profileModalTitle: "My Profile",
    profileModalSubtitle: "Update your personal information",
    fieldEmail: "Current Email",
    emailLockedNote: "Email can't be changed from here",
    fieldName: "Registered Name",
    fieldNamePlaceholder: "Enter your full name",
    fieldPhone: "Phone Number",
    fieldPhonePlaceholder: "Add your phone number (optional)",
    changePhoto: "Change Photo",
    save: "Save Changes",
    saving: "Saving...",
    cancel: "Cancel",
    saveSuccess: "Your profile was updated successfully",
    errNameLen: "Name must be between 2 and 60 characters",
    errPhoneInvalid: "Phone number format is invalid",
    errAvatarType: "Image must be JPG, GIF, or PNG",
    errAvatarSize: "Image is larger than the 1MB limit",
    errAvatarBroken: "Something went wrong loading the photo after upload, please try again",
    errGeneric: "Something went wrong, please try again",
    uploadingPhoto: "Uploading photo...",
    avatarHint: "Maximum size: 1MB. Supported formats: JPG, GIF, or PNG",
  },
};

function MembershipCard({ membership, t, isRTL }) {
  if (!membership || !membership.plan || membership.status === "inactive") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Crown size={18} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">{t.noMembership}</p>
        </div>
        <Link href="/membership" className="text-sm font-semibold text-[#1D6FD8] hover:underline">
          {t.viewPlans}
        </Link>
      </div>
    );
  }

  const isActive = membership.status === "active";
  const isExpired = membership.status === "expired";

  return (
    <div
      className={`rounded-2xl border p-5 flex items-center justify-between flex-wrap gap-4 ${
        isActive ? "bg-gradient-to-r from-[#0a0a0a] to-[#1D6FD8] text-white border-transparent" : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? "bg-white/15" : "bg-amber-50"}`}>
          {isExpired ? <AlertTriangle size={20} className="text-amber-500" /> : <Crown size={20} className={isActive ? "text-white" : "text-amber-500"} />}
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider font-bold ${isActive ? "text-white/70" : "text-gray-400"}`}>{t.membershipTitle}</p>
          <p className="text-lg font-black">{membership.plan.name}</p>
        </div>
      </div>
      <div className="text-end">
        <span
          className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-1 ${
            isActive ? "bg-white/20 text-white" : isExpired ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {t.statusLabels[membership.status] || membership.status}
        </span>
        <p className={`text-xs ${isActive ? "text-white/80" : "text-gray-400"}`}>
          {membership.expiresAt
            ? t.expiresOn(new Date(membership.expiresAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US"))
            : t.neverExpires}
        </p>
      </div>
    </div>
  );
}

function SummaryStats({ enrollments, certificatesCount, t }) {
  const total = enrollments.length;
  const completed = enrollments.filter((e) => e.status === "completed").length;
  const active = total - completed;
  const avgProgress =
    total > 0 ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercent || 0), 0) / total) : 0;

  const cards = [
    { icon: TrendingUp, label: t.summaryProgress, value: `${avgProgress}%`, accent: "bg-blue-50 text-[#1D6FD8]" },
    { icon: Clock, label: t.summaryActive, value: active, accent: "bg-amber-50 text-amber-600" },
    { icon: CheckCircle2, label: t.summaryCompleted, value: completed, accent: "bg-green-50 text-green-600" },
    { icon: Award, label: t.summaryCertificates, value: certificatesCount, accent: "bg-purple-50 text-purple-600", link: "/student/certificates" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((c, i) => {
        const Content = (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 h-full hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.accent}`}>
              <c.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black text-gray-800 leading-tight">{c.value}</p>
              <p className="text-[11px] text-gray-400 truncate">{c.label}</p>
            </div>
          </div>
        );
        return c.link ? (
          <Link key={i} href={c.link}>
            {Content}
          </Link>
        ) : (
          <div key={i}>{Content}</div>
        );
      })}
    </div>
  );
}

const AVATAR_MAX_BYTES = 1 * 1024 * 1024; // 1MB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

// 🔒 بعض المتصفحات والأدوات (خصوصًا القديمة أو بعض تطبيقات الموبايل)
// بتبعت "image/jpg" بدل الصيغة القياسية "image/jpeg" — لو سبنا الفحص زي ما
// هو، الملف ده هيترفض غلط بـ errAvatarType رغم إنه JPEG سليم فعليًا.
function normalizeImageMime(mime) {
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

function isValidPhoneClient(phone) {
  return /^\+?[0-9\s-]{7,20}$/.test(phone);
}

/* ─── كارت مصغّر يظهر أعلى الصفحة: صورة + اسم + إيميل + زرار تعديل ─── */
function ProfileSummaryCard({ user, t, onEdit }) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap mb-6">
      <div className="flex items-center gap-4 min-w-0">
        {user?.avatar ? (
          <button
            type="button"
            onClick={() => setShowFullscreen(true)}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1D6FD8] focus:ring-offset-2"
            title={t.viewFullSize}
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-2 ring-black/5 cursor-pointer hover:opacity-90 transition-opacity"
            />
          </button>
        ) : (
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#C9A227] text-white font-bold flex items-center justify-center text-4xl shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-lg sm:text-xl font-bold text-gray-800 truncate">{user?.name}</p>
          <p className="text-sm text-gray-400 truncate flex items-center gap-1">
            <Mail size={13} /> {user?.email}
          </p>
        </div>
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1D6FD8] border border-[#1D6FD8]/30 hover:bg-[#1D6FD8]/5 px-3 sm:px-4 py-2 rounded-lg transition-colors"
      >
        <Pencil size={13} /> {t.editProfile}
      </button>

      {showFullscreen && user?.avatar && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 end-4 sm:top-6 sm:end-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title={t.close}
          >
            <X size={20} />
          </button>
          <img
            src={user.avatar}
            alt={user.name}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

/* ─── شريط تنقّل: كورساتي / درجاتي / شهاداتي / مدفوعاتي — كلهم جمب بعض ─── */
function StudentQuickNav({ t }) {
  const items = [
    { href: "/student", label: t.navCourses, icon: BookOpen, active: true },
    { href: "/student/grades", label: t.navGrades, icon: GraduationCap },
    { href: "/student/certificates", label: t.navCertificates, icon: Award },
    { href: "/student/payments", label: t.navPayments, icon: CreditCard },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3 mb-6 overflow-x-auto pb-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2 shrink-0 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors ${
            item.active
              ? "bg-[#1D6FD8] text-white border-[#1D6FD8]"
              : "bg-white text-gray-700 border-gray-200 hover:border-[#1D6FD8] hover:text-[#1D6FD8]"
          }`}
        >
          <item.icon size={16} />
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function ProfileEditModal({ initialUser, t, isRTL, onClose, onSaved }) {
  const { update } = useSession();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(initialUser?.name || "");
  const [phone, setPhone] = useState(initialUser?.phone || "");
  const [avatar, setAvatar] = useState(initialUser?.avatar || null);
  const [avatarPreview, setAvatarPreview] = useState(initialUser?.avatar || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 🆕 خطأ مخصص لرفع الصورة بس، بيتحط تحت الصورة على طول بدل ما يستنى
  // آخر الفورم زي error العادي — عشان لو الرفع فشل، الطالب يشوف السبب فورًا
  // مش يحس إن الصفحة "علّقت" وهي في الحقيقة خلصت (بنجاح أو فشل) من زمان.
  const [avatarError, setAvatarError] = useState("");
  const [success, setSuccess] = useState(false);
  // 🆕 السبب الحقيقي وراء "بتحمل وفي الآخر بتطلع صورة بايظة": الرفع (PUT)
  // لـ Bunny Storage بيرجع نجاح فورًا، لكن رابط الـ CDN (Pull Zone) بياخد
  // كسر ثانية لحد ما يتنشر على edge nodes — فأول <img> بيحاول يحمّل الرابط
  // بسرعة جدًا بعد الرفع ممكن يوصله 404/خطأ مؤقت فيظهر أيقونة "صورة بايظة".
  // الحل: نعيد محاولة تحميل الصورة كذا مرة بفاصل بسيط قبل ما نستسلم.
  const [avatarLoadAttempt, setAvatarLoadAttempt] = useState(0);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const AVATAR_LOAD_RETRIES = 4;
  const AVATAR_LOAD_RETRY_DELAY_MS = 900;

  function handleAvatarImgError() {
    // معاينة محلية (blob:) مش من CDN — لو فشلت فده خطأ فعلي مش propagation delay
    if (avatarPreview?.startsWith("blob:")) return;
    if (avatarLoadAttempt < AVATAR_LOAD_RETRIES) {
      setTimeout(() => setAvatarLoadAttempt((n) => n + 1), AVATAR_LOAD_RETRY_DELAY_MS);
    } else {
      setAvatarBroken(true);
      setAvatarError(t.errAvatarBroken);
    }
  }

  async function handleAvatarPick(e) {
    const rawFile = e.target.files?.[0];
    e.target.value = ""; // يسمح باختيار نفس الملف تاني لو حبّ يعيد المحاولة
    if (!rawFile) return;
    setAvatarError("");
    setError("");
    setAvatarBroken(false);
    setAvatarLoadAttempt(0);

    const normalizedType = normalizeImageMime(rawFile.type);
    if (!AVATAR_ALLOWED_TYPES.includes(normalizedType)) {
      setAvatarError(t.errAvatarType);
      return;
    }

    // 🚫 مفيش ضغط تلقائي — لو الصورة أكبر من الحد المسموح بيترفض الرفع على
    // طول وبنوضح للطالب إنه لازم يختار صورة أصغر (مش نعدّل الملف بالنيابة عنه).
    if (rawFile.size > AVATAR_MAX_BYTES) {
      setAvatarError(t.errAvatarSize);
      return;
    }

    const file = rawFile;

    // معاينة فورية (client-side) قبل ما الرفع يخلص
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("kind", "avatar");
      formData.append("file", file);
      const res = await fetch("/api/upload/file", { method: "POST", body: formData });

      // 🔒 لو الرد مش JSON (مثلاً 413 Payload Too Large من بروكسي/سيرفر
      // قبل ما الطلب يوصل لـ Next.js أصلاً، أو صفحة خطأ HTML من المنصة)،
      // res.json() هيفشل — كنا قبل كده بنبلعه بصمت ونعرض رسالة عامة تحت
      // خالص. دلوقتي بنميّز الحالة دي برسالة أوضح تحت الصورة نفسها.
      let data = null;
      let parseFailed = false;
      try {
        data = await res.json();
      } catch {
        parseFailed = true;
      }

      if (!res.ok || !data?.url) {
        if (parseFailed || res.status === 413) {
          setAvatarError(t.errAvatarSize);
        } else if (res.status === 401) {
          setAvatarError(t.errGeneric); // الجلسة انتهت — الطالب هيحتاج يعمل login تاني
        } else {
          setAvatarError(data?.error ? `${t.errGeneric} (${data.error})` : t.errGeneric);
        }
        setAvatarPreview(avatar);
        return;
      }
      setAvatar(data.url);
      setAvatarPreview(data.url);
    } catch (err) {
      // فشل الشبكة نفسه (مفيش نت، أو الطلب اتقطع)
      setAvatarError(t.errGeneric);
      setAvatarPreview(avatar);
      console.error("[avatar upload] network error:", err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    setError("");
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setError(t.errNameLen);
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidPhoneClient(trimmedPhone)) {
      setError(t.errPhoneInvalid);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, phone: trimmedPhone, avatar: avatar || "" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error === "invalid_name" ? t.errNameLen :
          data?.error === "invalid_phone" ? t.errPhoneInvalid :
          t.errGeneric
        );
        return;
      }
      // 🔄 نحدّث الـ NextAuth session فورًا (شوف authOptions.js — trigger:"update")
      // عشان الاسم/الصورة يتغيروا في الـ navbar من غير ما يحتاج logout/login.
      await update();
      setSuccess(true);
      onSaved?.(data.user);
      setTimeout(onClose, 900);
    } catch {
      setError(t.errGeneric);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md p-6 relative"
        style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="close"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-black text-gray-800 mb-1">{t.profileModalTitle}</h2>
        <p className="text-xs text-gray-400 mb-5">{t.profileModalSubtitle}</p>

        {/* الصورة */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {avatarPreview && !avatarBroken ? (
              <img
                key={avatarLoadAttempt}
                src={
                  avatarPreview.startsWith("blob:")
                    ? avatarPreview
                    : `${avatarPreview}${avatarPreview.includes("?") ? "&" : "?"}retry=${avatarLoadAttempt}`
                }
                alt=""
                onError={handleAvatarImgError}
                onLoad={() => setAvatarBroken(false)}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#C9A227] text-white text-2xl font-bold flex items-center justify-center">
                {name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-[#1D6FD8] text-white flex items-center justify-center shadow-md hover:bg-[#155bb5] transition-colors disabled:opacity-60"
              aria-label={t.changePhoto}
            >
              {uploadingAvatar ? <Loader size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
          {!uploadingAvatar && !avatarError && (
            <p className="text-[11px] text-gray-400 mt-2 text-center max-w-[220px]">{t.avatarHint}</p>
          )}
          {uploadingAvatar && <p className="text-[11px] text-gray-400 mt-2">{t.uploadingPhoto}</p>}
          {avatarError && !uploadingAvatar && (
            <p className="text-[11px] text-red-500 mt-2 text-center max-w-[220px]">{avatarError}</p>
          )}
        </div>

        {/* الإيميل — للعرض بس */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Mail size={12} /> {t.fieldEmail}
          </label>
          <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 flex items-center justify-between">
            <span className="truncate">{initialUser?.email}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{t.emailLockedNote}</p>
        </div>

        {/* الاسم */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <User size={12} /> {t.fieldName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.fieldNamePlaceholder}
            maxLength={60}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FD8]/20 focus:border-[#1D6FD8] transition-colors"
          />
        </div>

        {/* الهاتف */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Phone size={12} /> {t.fieldPhone}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.fieldPhonePlaceholder}
            maxLength={20}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FD8]/20 focus:border-[#1D6FD8] transition-colors"
          />
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-lg mb-4">{error}</div>}
        {success && (
          <div className="bg-green-50 text-green-600 text-xs px-3.5 py-2.5 rounded-lg mb-4 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> {t.saveSuccess}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar}
            className="flex-1 bg-[#1D6FD8] text-white text-sm font-bold py-2.5 rounded-lg hover:bg-[#155bb5] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader size={14} className="animate-spin" />}
            {saving ? t.saving : t.save}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentMyCoursesPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;

  const [enrollments, setEnrollments] = useState(null);
  const [membership, setMembership] = useState(null);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [error, setError] = useState("");
  const [profileUser, setProfileUser] = useState(null); // { name, email, phone, avatar, role }
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/enrollments").then((r) => (r.ok ? r.json() : { enrollments: [] })),
      fetch("/api/membership").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/certificates").then((r) => (r.ok ? r.json() : { certificates: [] })),
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([enrollmentsData, membershipData, certificatesData, profileData]) => {
        setEnrollments(Array.isArray(enrollmentsData?.enrollments) ? enrollmentsData.enrollments : []);
        setMembership(membershipData);
        setCertificatesCount(Array.isArray(certificatesData?.certificates) ? certificatesData.certificates.length : 0);
        if (profileData?.user) setProfileUser(profileData.user);
      })
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f7f7]" style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0a0a0a] to-[#1D6FD8] flex items-center justify-center">
              <BookOpen className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
              <p className="text-sm text-gray-400">{t.subtitle}</p>
            </div>
          </div>
        </div>

        <StudentQuickNav t={t} />

        {profileUser && (
          <ProfileSummaryCard user={profileUser} t={t} onEdit={() => setShowProfileModal(true)} />
        )}

        {showProfileModal && profileUser && (
          <ProfileEditModal
            initialUser={profileUser}
            t={t}
            isRTL={isRTL}
            onClose={() => setShowProfileModal(false)}
            onSaved={(updatedUser) => setProfileUser((prev) => ({ ...prev, ...updatedUser }))}
          />
        )}

        {enrollments !== null && (
          <SummaryStats enrollments={enrollments} certificatesCount={certificatesCount} t={t} />
        )}

        <div className="mb-8">
          <MembershipCard membership={membership} t={t} isRTL={isRTL} />
        </div>

        {enrollments === null && !error && (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-[#1D6FD8]" size={32} />
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {enrollments?.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400 mb-4">{t.empty}</p>
            <Link href="/courses" className="text-[#1D6FD8] font-semibold hover:underline">
              {t.browse}
            </Link>
          </div>
        )}

        {enrollments?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((e) => (
              <Link
                key={e.id}
                href={`/courses/${e.course}`}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-36 bg-gray-100">
                  {e.courseThumbnail ? (
                    <Image src={e.courseThumbnail} alt={e.courseTitle || ""} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <BookOpen size={32} />
                    </div>
                  )}
                  <span className="absolute top-2.5 start-2.5 text-[10px] font-bold bg-white/90 text-gray-700 px-2 py-1 rounded-full">
                    {t.sourceLabels[e.source] || e.source}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-2 group-hover:text-[#1D6FD8] transition-colors">
                    {e.courseTitle || "—"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <Clock size={13} /> {t.lessons(e.courseTotalLessonsCount || 0)}
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-[#1D6FD8] rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, e.progressPercent || 0))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{t.progress(e.progressPercent || 0)}</span>
                    {e.status === "completed" ? (
                      <span className="flex items-center gap-1 text-green-600 font-semibold">
                        <CheckCircle2 size={13} /> {t.completed}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#1D6FD8] font-semibold">
                        {t.continueLabel} <BackArrow size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}