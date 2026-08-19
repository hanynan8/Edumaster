"use client";

// app/components/ProfileSettingsCard.jsx
//
// 🆕 نفس بالظبط منطق "الملف الشخصي" اللي كان مقصور على /student (تعديل
// الاسم/الرقم/صورة البروفايل عن طريق GET/PATCH /api/profile + رفع الصورة
// على POST /api/upload/file بـ kind="avatar") — اتشال من جوه app/student/page.jsx
// وبقى مكوّن مستقل قابل لإعادة الاستخدام في أي داشبورد (admin/teacher)،
// عشان مفيش تكرار للكود ولو حصل تعديل/باج فيكس يتصلح مكان واحد بس.
//
// الاستخدام: <ProfileSettingsCard locale="ar" /> أو locale="en" — بيحدد
// النصوص المعروضة بس، مش بيغيّر اتجاه الصفحة (الكارت شغّال RTL/LTR حسب
// السياق اللي بيتحط فيه، من غير ما يفرض حاجة).
//
// 🔒 نفس الحماية بالظبط اللي في صفحة الطالب: /api/profile بيرجّع ويحدّث
// بيانات صاحب الـ session الحالي بس (role مش مهم — أي مستخدم مسجل دخول:
// student/teacher/admin)، فالمكوّن ده آمن يتحط في أي داشبورد.

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, Mail, Phone, User, X, Pencil, CheckCircle2, Loader } from "lucide-react";

const STRINGS = {
  ar: {
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
    loading: "جارِ التحميل...",
  },
  en: {
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
    loading: "Loading...",
  },
};

const AVATAR_MAX_BYTES = 1 * 1024 * 1024; // 1MB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

function normalizeImageMime(mime) {
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

function isValidPhoneClient(phone) {
  return /^\+?[0-9\s-]{7,20}$/.test(phone);
}

/* ─── كارت مصغّر: صورة + اسم + إيميل + زرار تعديل — بتكبر الصورة fullscreen لو ضغط عليها ─── */
function ProfileSummaryCard({ user, t, isRTL, onEdit }) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap mb-6">
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
  const [avatarError, setAvatarError] = useState("");
  const [success, setSuccess] = useState(false);
  const [avatarLoadAttempt, setAvatarLoadAttempt] = useState(0);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const AVATAR_LOAD_RETRIES = 4;
  const AVATAR_LOAD_RETRY_DELAY_MS = 900;

  function handleAvatarImgError() {
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
    e.target.value = "";
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

    if (rawFile.size > AVATAR_MAX_BYTES) {
      setAvatarError(t.errAvatarSize);
      return;
    }

    const file = rawFile;
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("kind", "avatar");
      formData.append("file", file);
      const res = await fetch("/api/upload/file", { method: "POST", body: formData });

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
          setAvatarError(t.errGeneric);
        } else {
          setAvatarError(data?.error ? `${t.errGeneric} (${data.error})` : t.errGeneric);
        }
        setAvatarPreview(avatar);
        return;
      }
      setAvatar(data.url);
      setAvatarPreview(data.url);
    } catch (err) {
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
      // 🔄 نحدّث الـ NextAuth session فورًا عشان الاسم/الصورة يتغيروا في
      // الـ navbar من غير ما يحتاج logout/login.
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

        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Mail size={12} /> {t.fieldEmail}
          </label>
          <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 flex items-center justify-between">
            <span className="truncate">{initialUser?.email}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{t.emailLockedNote}</p>
        </div>

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

        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Phone size={12} /> {t.fieldPhone}
          </label>
          <input
            type="text"
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

/**
 * @param {object} props
 * @param {"ar"|"en"} [props.locale="en"] - لغة النصوص المعروضة بس
 * @param {boolean} [props.isRTL] - افتراضيًا بيتحدد تلقائيًا من locale لو مش متبعت
 */
export default function ProfileSettingsCard({ locale = "en", isRTL }) {
  const t = STRINGS[locale] || STRINGS.en;
  const rtl = isRTL ?? locale === "ar";

  const [profileUser, setProfileUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setProfileUser(data.user);
      })
      .catch(() => {});
  }, []);

  if (!profileUser) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center mb-6">
        <Loader className="animate-spin text-[#1D6FD8]" size={28} />
      </div>
    );
  }

  return (
    <>
      <ProfileSummaryCard user={profileUser} t={t} isRTL={rtl} onEdit={() => setShowModal(true)} />
      {showModal && (
        <ProfileEditModal
          initialUser={profileUser}
          t={t}
          isRTL={rtl}
          onClose={() => setShowModal(false)}
          onSaved={(updatedUser) => setProfileUser((prev) => ({ ...prev, ...updatedUser }))}
        />
      )}
    </>
  );
}