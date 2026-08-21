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
function ProfileSummaryCard({ user, onEdit }) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap mb-6">
      <div className="flex items-center gap-4 min-w-0">
        {user?.avatar ? (
          <button
            type="button"
            onClick={() => setShowFullscreen(true)}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1D6FD8] focus:ring-offset-2"
            title="تكبير الصورة"
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
        <Pencil size={13} /> تعديل الملف الشخصي
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
            title="إغلاق"
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

function ProfileEditModal({ initialUser, onClose, onSaved }) {
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
      setAvatarError("حصلت مشكلة في تحميل الصورة بعد الرفع، جرّب تاني");
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
      setAvatarError("الصورة لازم تكون JPG أو GIF أو PNG");
      return;
    }

    // 🚫 مفيش ضغط تلقائي — لو الصورة أكبر من الحد المسموح بيترفض الرفع على
    // طول وبنوضح للمدرّس إنه لازم يختار صورة أصغر (مش نعدّل الملف بالنيابة عنه).
    if (rawFile.size > AVATAR_MAX_BYTES) {
      setAvatarError("حجم الصورة أكبر من المسموح (1MB)");
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
          setAvatarError("حجم الصورة أكبر من المسموح (1MB)");
        } else if (res.status === 401) {
          setAvatarError("حصل خطأ، حاول تاني"); // الجلسة انتهت — المدرّس هيحتاج يعمل login تاني
        } else {
          setAvatarError(data?.error ? `حصل خطأ، حاول تاني (${data.error})` : "حصل خطأ، حاول تاني");
        }
        setAvatarPreview(avatar);
        return;
      }
      setAvatar(data.url);
      setAvatarPreview(data.url);
    } catch (err) {
      // فشل الشبكة نفسه (مفيش نت، أو الطلب اتقطع)
      setAvatarError("حصل خطأ، حاول تاني");
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
      setError("الاسم لازم يكون بين 2 و60 حرف");
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidPhoneClient(trimmedPhone)) {
      setError("رقم الهاتف مش بصيغة صحيحة");
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
          data?.error === "invalid_name" ? "الاسم لازم يكون بين 2 و60 حرف" :
          data?.error === "invalid_phone" ? "رقم الهاتف مش بصيغة صحيحة" :
          "حصل خطأ، حاول تاني"
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
      setError("حصل خطأ، حاول تاني");
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

        <h2 className="text-lg font-semibold text-gray-800 mb-1">الملف الشخصي</h2>
        <p className="text-xs text-gray-400 mb-5">عدّل بياناتك الشخصية</p>

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
              aria-label="تغيير الصورة"
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
              أقصى حجم: 1MB. الصيغ المتاحة: JPG أو GIF أو PNG
            </p>
          )}
          {uploadingAvatar && <p className="text-[11px] text-gray-400 mt-2">جارِ رفع الصورة...</p>}
          {avatarError && !uploadingAvatar && (
            <p className="text-[11px] text-red-500 mt-2 text-center max-w-[220px]">{avatarError}</p>
          )}
        </div>

        {/* الإيميل — للعرض بس */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Mail size={12} /> البريد الإلكتروني الحالي
          </label>
          <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 flex items-center justify-between">
            <span className="truncate">{initialUser?.email}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">الإيميل مش قابل للتعديل من هنا</p>
        </div>

        {/* الاسم */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <User size={12} /> الاسم المسجّل به
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اكتب اسمك بالكامل"
            maxLength={60}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FD8]/20 focus:border-[#1D6FD8] transition-colors"
          />
        </div>

        {/* الهاتف */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Phone size={12} /> رقم الهاتف
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="أضف رقم هاتفك (اختياري)"
            maxLength={20}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FD8]/20 focus:border-[#1D6FD8] transition-colors"
          />
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-lg mb-4">{error}</div>}
        {success && (
          <div className="bg-green-50 text-green-600 text-xs px-3.5 py-2.5 rounded-lg mb-4 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> تم حفظ بياناتك بنجاح
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar}
            className="flex-1 bg-[#1D6FD8] text-white text-sm font-bold py-2.5 rounded-lg hover:bg-[#155bb5] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader size={14} className="animate-spin" />}
            {saving ? "جارِ الحفظ..." : "حفظ التعديلات"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherCoursesPage() {
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
      setError("تعذّر تحميل الكورسات");
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
  }, []);

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
    course_has_students: (data) => `مينفعش تحذف الكورس ده — فيه ${data.studentsCount} طالب مسجل. أرشفه بدل الحذف.`,
    forbidden: () => "مش معاك صلاحية تحذف الكورس ده (مش صاحبه).",
    not_found: () => "الكورس ده مش موجود أصلاً (يمكن اتحذف قبل كده).",
    unauthorized: () => "لازم تسجّل دخول تاني عشان تقدر تحذف.",
    delete_failed: () => "الحذف فشل من السيرفر — جرّب تاني، ولو استمرت المشكلة كلّم الدعم الفني.",
    internal_error: () => "حصل خطأ في السيرفر أثناء الحذف. جرّب تاني بعد شوية.",
  };

  async function handleDelete(course) {
    if (!confirm(`متأكد إنك عايز تحذف "${course.title}"؟ الإجراء ده مينفعش يترجع.`)) return;
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const buildMessage = DELETE_ERROR_MESSAGES[data?.error];
        alert(buildMessage ? buildMessage(data) : `حصل خطأ أثناء الحذف${data?.error ? ` (${data.error})` : ""}`);
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch {
      alert("حصل خطأ أثناء الحذف — تأكد من اتصالك بالإنترنت وحاول تاني.");
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
            <h1 className="text-2xl font-semibold text-gray-800">كورساتي</h1>
            <p className="text-sm text-gray-400">إدارة الكورسات اللي إنت بتدرّسها</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/teacher/performance"
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <BarChart3 size={16} /> الأداء والإحصائيات
          </Link>
          <Link
            href="/meet"
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Video size={16} /> المحاضرات اللايف
          </Link>
          <button
            onClick={() => setModalCourse(null)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90"
          >
            <Plus size={18} /> كورس جديد
          </button>
        </div>
      </div>

      {profileUser && (
        <ProfileSummaryCard user={profileUser} onEdit={() => setShowProfileModal(true)} />
      )}

      {showProfileModal && profileUser && (
        <ProfileEditModal
          initialUser={profileUser}
          onClose={() => setShowProfileModal(false)}
          onSaved={(updatedUser) => setProfileUser((prev) => ({ ...prev, ...updatedUser }))}
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
          <p className="text-gray-400 mb-4">لسه معملتش أي كورس</p>
          <button
            onClick={() => setModalCourse(null)}
            className="text-blue-600 font-semibold hover:underline"
          >
            ابدأ بإنشاء أول كورس
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