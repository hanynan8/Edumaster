"use client";

// app/teacher/page.jsx — اليوم 10: صفحة "كورساتي"
//
// بتجيب كورسات المدرس الحالي بس (GET /api/courses بيرجع كورسات صاحب
// السيشن تلقائيًا لو role=teacher — شوف app/api/courses/route.js).
//
// 🆕 كارت "الملف الشخصي" (صورة + اسم + إيميل + زرار تعديل) — نفس التصميم
// والمنطق اللي في app/student/page.jsx بالظبط (نفس الـ GET/PATCH
// /api/profile + رفع الصورة عن طريق POST /api/upload/file بـ kind="avatar")،
// اتنقل هنا حرفيًا عشان صفحة المدرّس تبقى مطابقة لصفحة الطالب بالكامل.

import { useEffect, useState, useRef } from "react";
import { Plus, Loader, BookOpen, GraduationCap, BarChart3, Camera, Mail, Phone, User, X, Pencil, CheckCircle2, Video } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CourseCard from "./components/CourseCard";
import CourseFormModal from "./components/CourseFormModal";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل نصوص الصفحة كانت عربي ثابت — دلوقتي بتتبع اللغة المختارة من
// الناف بار (en/ar/es).
const T = {
  en: {
    zoomImage: "Zoom image",
    close: "Close",
    editProfile: "Edit profile",
    avatarLoadError: "There was a problem loading the image after upload, try again",
    imageTypeError: "Image must be JPG, GIF or PNG",
    imageSizeError: "Image size exceeds the limit (1MB)",
    genericError: "Something went wrong, try again",
    genericErrorWithCode: (code) => `Something went wrong, try again (${code})`,
    nameLengthError: "Name must be between 2 and 60 characters",
    phoneFormatError: "Phone number format is invalid",
    profileTitle: "Profile",
    profileSubtitle: "Edit your personal details",
    changeImage: "Change image",
    maxSizeHint: "Max size: 1MB. Formats: JPG, GIF or PNG",
    uploadingImage: "Uploading image...",
    currentEmail: "Current email",
    emailNotEditable: "Email cannot be edited from here",
    registeredName: "Registered name",
    namePlaceholder: "Enter your full name",
    phoneLabel: "Phone number",
    phonePlaceholder: "Add your phone number (optional)",
    savedSuccess: "Your details were saved successfully",
    saving: "Saving...",
    saveChanges: "Save changes",
    cancel: "Cancel",
    loadCoursesError: "Failed to load courses",
    courseHasStudents: (n) => `You can't delete this course — it has ${n} enrolled student(s). Archive it instead.`,
    forbiddenDelete: "You don't have permission to delete this course (you're not the owner).",
    notFound: "This course doesn't exist anymore (it may have already been deleted).",
    unauthorized: "You need to log in again to delete.",
    deleteFailed: "Delete failed on the server — try again, or contact support if it keeps happening.",
    internalError: "A server error occurred while deleting. Try again shortly.",
    confirmDelete: (title) => `Are you sure you want to delete "${title}"? This action cannot be undone.`,
    deleteErrorWithCode: (code) => `Something went wrong while deleting${code ? ` (${code})` : ""}`,
    deleteErrorNetwork: "Something went wrong while deleting — check your internet connection and try again.",
    myCourses: "My courses",
    manageCourses: "Manage the courses you teach",
    performance: "Performance & stats",
    liveLectures: "Live lectures",
    newCourse: "New course",
    noCoursesYet: "You haven't created any course yet",
    createFirstCourse: "Create your first course",
  },
  ar: {
    zoomImage: "تكبير الصورة",
    close: "إغلاق",
    editProfile: "تعديل الملف الشخصي",
    avatarLoadError: "حصلت مشكلة في تحميل الصورة بعد الرفع، جرّب تاني",
    imageTypeError: "الصورة لازم تكون JPG أو GIF أو PNG",
    imageSizeError: "حجم الصورة أكبر من المسموح (1MB)",
    genericError: "حصل خطأ، حاول تاني",
    genericErrorWithCode: (code) => `حصل خطأ، حاول تاني (${code})`,
    nameLengthError: "الاسم لازم يكون بين 2 و60 حرف",
    phoneFormatError: "رقم الهاتف مش بصيغة صحيحة",
    profileTitle: "الملف الشخصي",
    profileSubtitle: "عدّل بياناتك الشخصية",
    changeImage: "تغيير الصورة",
    maxSizeHint: "أقصى حجم: 1MB. الصيغ المتاحة: JPG أو GIF أو PNG",
    uploadingImage: "جارِ رفع الصورة...",
    currentEmail: "البريد الإلكتروني الحالي",
    emailNotEditable: "الإيميل مش قابل للتعديل من هنا",
    registeredName: "الاسم المسجّل به",
    namePlaceholder: "اكتب اسمك بالكامل",
    phoneLabel: "رقم الهاتف",
    phonePlaceholder: "أضف رقم هاتفك (اختياري)",
    savedSuccess: "تم حفظ بياناتك بنجاح",
    saving: "جارِ الحفظ...",
    saveChanges: "حفظ التعديلات",
    cancel: "إلغاء",
    loadCoursesError: "تعذّر تحميل الكورسات",
    courseHasStudents: (n) => `مينفعش تحذف الكورس ده — فيه ${n} طالب مسجل. أرشفه بدل الحذف.`,
    forbiddenDelete: "مش معاك صلاحية تحذف الكورس ده (مش صاحبه).",
    notFound: "الكورس ده مش موجود أصلاً (يمكن اتحذف قبل كده).",
    unauthorized: "لازم تسجّل دخول تاني عشان تقدر تحذف.",
    deleteFailed: "الحذف فشل من السيرفر — جرّب تاني، ولو استمرت المشكلة كلّم الدعم الفني.",
    internalError: "حصل خطأ في السيرفر أثناء الحذف. جرّب تاني بعد شوية.",
    confirmDelete: (title) => `متأكد إنك عايز تحذف "${title}"؟ الإجراء ده مينفعش يترجع.`,
    deleteErrorWithCode: (code) => `حصل خطأ أثناء الحذف${code ? ` (${code})` : ""}`,
    deleteErrorNetwork: "حصل خطأ أثناء الحذف — تأكد من اتصالك بالإنترنت وحاول تاني.",
    myCourses: "كورساتي",
    manageCourses: "إدارة الكورسات اللي إنت بتدرّسها",
    performance: "الأداء والإحصائيات",
    liveLectures: "المحاضرات اللايف",
    newCourse: "كورس جديد",
    noCoursesYet: "لسه معملتش أي كورس",
    createFirstCourse: "ابدأ بإنشاء أول كورس",
  },
  es: {
    zoomImage: "Ampliar imagen",
    close: "Cerrar",
    editProfile: "Editar perfil",
    avatarLoadError: "Hubo un problema al cargar la imagen tras subirla, inténtalo de nuevo",
    imageTypeError: "La imagen debe ser JPG, GIF o PNG",
    imageSizeError: "El tamaño de la imagen supera el límite (1MB)",
    genericError: "Ocurrió un error, inténtalo de nuevo",
    genericErrorWithCode: (code) => `Ocurrió un error, inténtalo de nuevo (${code})`,
    nameLengthError: "El nombre debe tener entre 2 y 60 caracteres",
    phoneFormatError: "El formato del número de teléfono no es válido",
    profileTitle: "Perfil",
    profileSubtitle: "Edita tus datos personales",
    changeImage: "Cambiar imagen",
    maxSizeHint: "Tamaño máx.: 1MB. Formatos: JPG, GIF o PNG",
    uploadingImage: "Subiendo imagen...",
    currentEmail: "Correo electrónico actual",
    emailNotEditable: "El correo no se puede editar desde aquí",
    registeredName: "Nombre registrado",
    namePlaceholder: "Escribe tu nombre completo",
    phoneLabel: "Número de teléfono",
    phonePlaceholder: "Agrega tu número de teléfono (opcional)",
    savedSuccess: "Tus datos se guardaron con éxito",
    saving: "Guardando...",
    saveChanges: "Guardar cambios",
    cancel: "Cancelar",
    loadCoursesError: "No se pudieron cargar los cursos",
    courseHasStudents: (n) => `No puedes eliminar este curso — tiene ${n} estudiante(s) inscrito(s). Archívalo en su lugar.`,
    forbiddenDelete: "No tienes permiso para eliminar este curso (no eres el propietario).",
    notFound: "Este curso ya no existe (puede que ya haya sido eliminado).",
    unauthorized: "Debes iniciar sesión de nuevo para poder eliminar.",
    deleteFailed: "La eliminación falló en el servidor — inténtalo de nuevo, o contacta soporte si persiste.",
    internalError: "Ocurrió un error del servidor al eliminar. Inténtalo en un momento.",
    confirmDelete: (title) => `¿Seguro que quieres eliminar "${title}"? Esta acción no se puede deshacer.`,
    deleteErrorWithCode: (code) => `Ocurrió un error al eliminar${code ? ` (${code})` : ""}`,
    deleteErrorNetwork: "Ocurrió un error al eliminar — revisa tu conexión a internet e inténtalo de nuevo.",
    myCourses: "Mis cursos",
    manageCourses: "Administra los cursos que impartes",
    performance: "Rendimiento y estadísticas",
    liveLectures: "Clases en vivo",
    newCourse: "Nuevo curso",
    noCoursesYet: "Aún no has creado ningún curso",
    createFirstCourse: "Crea tu primer curso",
  },
};

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
function ProfileSummaryCard({ user, onEdit, t }) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap mb-6">
      <div className="flex items-center gap-4 min-w-0">
        {user?.avatar ? (
          <button
            type="button"
            onClick={() => setShowFullscreen(true)}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1D6FD8] focus:ring-offset-2"
            title={t.zoomImage}
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

function ProfileEditModal({ initialUser, onClose, onSaved, t }) {
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
  // آخر الفورم زي error العادي — عشان لو الرفع فشل، المدرّس يشوف السبب فورًا
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
      setAvatarError(t.avatarLoadError);
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
      setAvatarError(t.imageTypeError);
      return;
    }

    // 🚫 مفيش ضغط تلقائي — لو الصورة أكبر من الحد المسموح بيترفض الرفع على
    // طول وبنوضح للمدرّس إنه لازم يختار صورة أصغر (مش نعدّل الملف بالنيابة عنه).
    if (rawFile.size > AVATAR_MAX_BYTES) {
      setAvatarError(t.imageSizeError);
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
          setAvatarError(t.imageSizeError);
        } else if (res.status === 401) {
          setAvatarError(t.genericError); // الجلسة انتهت — المدرّس هيحتاج يعمل login تاني
        } else {
          setAvatarError(data?.error ? t.genericErrorWithCode(data.error) : t.genericError);
        }
        setAvatarPreview(avatar);
        return;
      }
      setAvatar(data.url);
      setAvatarPreview(data.url);
    } catch (err) {
      // فشل الشبكة نفسه (مفيش نت، أو الطلب اتقطع)
      setAvatarError(t.genericError);
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
      setError(t.nameLengthError);
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidPhoneClient(trimmedPhone)) {
      setError(t.phoneFormatError);
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
          data?.error === "invalid_name" ? t.nameLengthError :
          data?.error === "invalid_phone" ? t.phoneFormatError :
          t.genericError
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
      setError(t.genericError);
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
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="close"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-gray-800 mb-1">{t.profileTitle}</h2>
        <p className="text-xs text-gray-400 mb-5">{t.profileSubtitle}</p>

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
              aria-label={t.changeImage}
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
            <p className="text-[11px] text-gray-400 mt-2 text-center max-w-[220px]">
              {t.maxSizeHint}
            </p>
          )}
          {uploadingAvatar && <p className="text-[11px] text-gray-400 mt-2">{t.uploadingImage}</p>}
          {avatarError && !uploadingAvatar && (
            <p className="text-[11px] text-red-500 mt-2 text-center max-w-[220px]">{avatarError}</p>
          )}
        </div>

        {/* الإيميل — للعرض بس */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Mail size={12} /> {t.currentEmail}
          </label>
          <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 flex items-center justify-between">
            <span className="truncate">{initialUser?.email}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{t.emailNotEditable}</p>
        </div>

        {/* الاسم */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <User size={12} /> {t.registeredName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            maxLength={60}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FD8]/20 focus:border-[#1D6FD8] transition-colors"
          />
        </div>

        {/* الهاتف */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Phone size={12} /> {t.phoneLabel}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.phonePlaceholder}
            maxLength={20}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FD8]/20 focus:border-[#1D6FD8] transition-colors"
          />
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-lg mb-4">{error}</div>}
        {success && (
          <div className="bg-green-50 text-green-600 text-xs px-3.5 py-2.5 rounded-lg mb-4 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> {t.savedSuccess}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar}
            className="flex-1 bg-[#1D6FD8] text-white text-sm font-bold py-2.5 rounded-lg hover:bg-[#155bb5] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader size={14} className="animate-spin" />}
            {saving ? t.saving : t.saveChanges}
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

export default function TeacherCoursesPage() {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [modalCourse, setModalCourse] = useState(undefined); // undefined=closed, null=new, object=edit
  const [profileUser, setProfileUser] = useState(null); // { name, email, phone, avatar, role }
  const [showProfileModal, setShowProfileModal] = useState(false);

  async function loadCourses() {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setCourses(data.courses);
    } catch {
      setError(t.loadCoursesError);
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.user) setProfileUser(data.user);
    } catch {
      // مفيش داعي نوقف الصفحة بسبب فشل تحميل البروفايل بس
    }
  }

  useEffect(() => {
    loadCourses();
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function handleSaved(saved) {
    setModalCourse(undefined);
    setCourses((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
  }

  // 🩹 FIX: قبل كده أي خطأ غير "course_has_students" (403 forbidden، 404
  // not_found، 500 داخلي، إلخ) كان بيظهر كرسالة واحدة عامة "حصل خطأ أثناء
  // الحذف" — يعني مفيش طريقة تعرف الخطأ الحقيقي إيه من الواجهة. دلوقتي كل
  // كود خطأ ليه رسالة واضحة، ولو كود جديد ظهر بنعرضه زي ما هو بدل رسالة
  // مبهمة (أسهل في تشخيص أي مشكلة جديدة تحصل).
  const DELETE_ERROR_MESSAGES = {
    course_has_students: (data) => t.courseHasStudents(data.studentsCount),
    forbidden: () => t.forbiddenDelete,
    not_found: () => t.notFound,
    unauthorized: () => t.unauthorized,
    delete_failed: () => t.deleteFailed,
    internal_error: () => t.internalError,
  };

  async function handleDelete(course) {
    if (!confirm(t.confirmDelete(course.title))) return;
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const buildMessage = DELETE_ERROR_MESSAGES[data?.error];
        alert(buildMessage ? buildMessage(data) : t.deleteErrorWithCode(data?.error));
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch {
      alert(t.deleteErrorNetwork);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <GraduationCap className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{t.myCourses}</h1>
            <p className="text-sm text-gray-400">{t.manageCourses}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/teacher/performance"
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <BarChart3 size={16} /> {t.performance}
          </Link>
          <Link
            href="/meet"
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Video size={16} /> {t.liveLectures}
          </Link>
          <button
            onClick={() => setModalCourse(null)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90"
          >
            <Plus size={18} /> {t.newCourse}
          </button>
        </div>
      </div>

      {profileUser && (
        <ProfileSummaryCard user={profileUser} onEdit={() => setShowProfileModal(true)} t={t} />
      )}

      {showProfileModal && profileUser && (
        <ProfileEditModal
          initialUser={profileUser}
          onClose={() => setShowProfileModal(false)}
          onSaved={(updatedUser) => setProfileUser((prev) => ({ ...prev, ...updatedUser }))}
          t={t}
        />
      )}

      {courses === null && !error && (
        <div className="flex justify-center py-20">
          <Loader className="animate-spin text-blue-500" size={36} />
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {courses?.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400 mb-4">{t.noCoursesYet}</p>
          <button
            onClick={() => setModalCourse(null)}
            className="text-blue-600 font-semibold hover:underline"
          >
            {t.createFirstCourse}
          </button>
        </div>
      )}

      {courses?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onEdit={setModalCourse} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modalCourse !== undefined && (
        <CourseFormModal
          course={modalCourse}
          onClose={() => setModalCourse(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}