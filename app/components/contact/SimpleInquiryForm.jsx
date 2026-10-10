"use client";

// app/components/contact/SimpleInquiryForm.jsx
//
// 🆕 الفورم البسيط (الاسم، الإيميل، الهاتف، الرسالة + مرفق اختياري) اتفصل هنا
// كـ component مشترك — بيستخدمه:
//   - صفحة /contact (لما المستخدم يختار "Other / General Inquiry")
//   - صفحة /quick-inquiry (الصفحة المخصصة للفورم ده بس، بتتفتح من صفحة الخدمات)
// بيتبعت لنفس /api/data?collection=form زي الأول بالظبط، ومعاه حقل service.

import { useState, useRef } from "react";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ArrowRight({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}

// 🆕 مرفق اختياري لفورم الكونتاكت البسيط — بيتحمّل لـ Bunny Storage عن طريق
// /api/upload/contact-attachment (راوت عام من غير تسجيل دخول) وقت الإرسال،
// والرابط الجاهز بيتحط في attachmentUrl/attachmentName ضمن body الفورم.
const ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ATTACHMENT_ALLOWED_TYPES = ATTACHMENT_ACCEPT.split(",");
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024; // 5MB — لازم يطابق MAX_BYTES في الراوت

const ATTACHMENT_STRINGS = {
  en: {
    label: "Attach a file",
    hint: "Images, PDF or Word — up to 5MB",
    remove: "Remove",
    tooLarge: "File is too large (max 5MB)",
    invalidType: "Unsupported file type",
    uploadError: "Couldn't upload the file, please try again",
  },
  ar: {
    label: "إرفاق ملف",
    hint: "صور أو PDF أو Word — حتى 5 ميغابايت",
    remove: "إزالة",
    tooLarge: "حجم الملف كبير جدًا (الأقصى 5 ميجا)",
    invalidType: "نوع الملف غير مدعوم",
    uploadError: "تعذّر رفع الملف، حاول مرة أخرى",
  },
  es: {
    label: "Adjuntar archivo",
    hint: "Imágenes, PDF o Word — hasta 5MB",
    remove: "Quitar",
    tooLarge: "El archivo es demasiado grande (máx. 5MB)",
    invalidType: "Tipo de archivo no compatible",
    uploadError: "No se pudo subir el archivo, inténtalo de nuevo",
  },
};

// الفورم البسيط الافتراضي (الاسم، الإيميل، الهاتف، الرسالة) — نفس الشكل
// القديم بالظبط، بيتبعت لـ /api/data?collection=form. بيتعرض لما محدش
// اختار خدمة، أو لما يختار "Other / General Inquiry".
// requireAttachment: لما تكون true المرفق بيبقى إجباري (بتتفعّل في صفحة /quick-inquiry بس).
export default function SimpleInquiryForm({ t, lang, selectedService, requireAttachment = false }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});
  // 🆕 حالة المرفق الاختياري
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);
  const at = ATTACHMENT_STRINGS[lang] ?? ATTACHMENT_STRINGS.en;

  const REQUIRED_LABELS   = { en: "Required",              ar: "مطلوب",                      es: "Obligatorio" };
  const EMAIL_ERROR_LABELS = { en: "Invalid email address", ar: "البريد الإلكتروني غير صحيح", es: "Correo electrónico inválido" };

  // 🆕 فحص فوري (نوع + حجم) قبل ما نضيّع وقت المستخدم بمحاولة رفع هيترفض
  // من السيرفر أصلًا — نفس الحدود بالظبط الموجودة في الراوت.
  function handleFileChange(e) {
    const picked = e.target.files?.[0] || null;
    if (!picked) { setFile(null); setFileError(""); return; }
    if (!ATTACHMENT_ALLOWED_TYPES.includes(picked.type)) {
      setFileError(at.invalidType);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (picked.size > ATTACHMENT_MAX_BYTES) {
      setFileError(at.tooLarge);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileError("");
    setFile(picked);
    setErrors((prev) => (prev.attachment ? { ...prev, attachment: false } : prev));
  }

  function handleRemoveFile() {
    setFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === "email") {
      setErrors((prev) => ({
        ...prev,
        email: e.target.value && !isValidEmail(e.target.value) ? "invalid" : false,
      }));
    } else if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: false }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {
      name:  !form.name,
      email: !form.email ? "empty" : !isValidEmail(form.email) ? "invalid" : false,
      phone: !form.phone,
      // 🆕 الرسالة بقت حقل إجباري (مسافات بس = فاضية)
      message: !form.message.trim(),
      // المرفق إجباري في /quick-inquiry
      attachment: requireAttachment && !file,
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    if (fileError) return;

    setStatus("sending");
    try {
      // 🆕 لو المستخدم اختار مرفق، بنرفعه الأول لـ Bunny Storage (عن طريق
      // راوت عام مخصص من غير تسجيل دخول)، وبعدين بس بنبعت الفورم نفسه
      // مع رابط المرفق الجاهز. لو الرفع فشل، بنوقف هنا ومنبعتش رسالة
      // ناقصة — بنورّي رسالة خطأ واضحة عن المرفق تحديدًا.
      let attachmentUrl = null;
      let attachmentName = null;

      if (file) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const uploadRes = await fetch("/api/upload/contact-attachment", {
          method: "POST",
          body: uploadForm,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData.url) {
          setStatus("error");
          setFileError(at.uploadError);
          return;
        }
        attachmentUrl = uploadData.url;
        attachmentName = uploadData.name || file.name;
      }

      const res = await fetch("/api/data?collection=form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, service: selectedService, attachmentUrl, attachmentName }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch { setStatus("error"); }
  }

  const req          = REQUIRED_LABELS[lang];
  const emailErrMsg  = EMAIL_ERROR_LABELS[lang];
  const opt          = { en: "Optional", ar: "اختياري", es: "Opcional" }[lang];

  if (status === "sent") {
    return (
      <div className="p-8 sm:p-10 rounded-2xl bg-[#003A91]/5 border border-[#003A91]/20 flex flex-col items-center text-center gap-4">
        <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#003A91] flex items-center justify-center">
          <Check size={22} color="white" />
        </span>
        <h3 className="font-semibold text-lg sm:text-xl">{t.form.successTitle}</h3>
        <p className="text-gray-500 text-sm max-w-xs">{t.form.successMsg}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label={t.form.fields.name}  name="name"  type="text"  value={form.name}  onChange={handleChange} badge={req} error={errors.name}  errorMsg={req} />
        <Field label={t.form.fields.email} name="email" type="email" value={form.email} onChange={handleChange} badge={req} error={errors.email}
          errorMsg={errors.email === "invalid" ? emailErrMsg : req} />
      </div>
      <Field label={t.form.fields.phone} name="phone" type="tel" value={form.phone} onChange={handleChange} badge={req} error={errors.phone} errorMsg={req} />

      {/* 🆕 الرسالة حقل إجباري — نفس شكل باقي الحقول الإجبارية (badge + حدود حمرا + رسالة خطأ) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t.form.fields.message}</label>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${errors.message ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-100"}`}>{req}</span>
        </div>
        <textarea name="message" value={form.message} onChange={handleChange} rows={4} placeholder={t.form.fields.messagePlaceholder}
          className={`w-full bg-[#f7f7f7] border rounded-xl px-4 py-3 text-sm font-medium text-[#0a0a0a] placeholder-gray-400 focus:outline-none transition-colors resize-none ${errors.message ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-[#003A91]"}`} />
        {errors.message && <span className="text-red-500 text-xs font-medium">{req}</span>}
      </div>

      {/* 🆕 مرفق (اختياري، وإجباري في /quick-inquiry) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{at.label}</label>
          {requireAttachment ? (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${errors.attachment ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-100"}`}>{req}</span>
          ) : (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{opt}</span>
          )}
        </div>
        <div className={`w-full flex items-center gap-3 bg-[#f7f7f7] border rounded-xl px-4 py-3 transition-colors ${fileError || errors.attachment ? "border-red-400" : "border-gray-200"}`}>
          <label className="shrink-0 flex items-center gap-1.5 cursor-pointer text-[#003A91] font-bold text-xs hover:underline">
            <span>📎</span>
            {at.label}
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <span className="truncate text-sm text-gray-500 flex-1">{file ? file.name : at.hint}</span>
          {file && (
            <button
              type="button"
              onClick={handleRemoveFile}
              className="shrink-0 text-gray-400 hover:text-red-500 text-xs font-bold"
            >
              {at.remove}
            </button>
          )}
        </div>
        {errors.attachment && !file && <span className="text-red-500 text-xs font-medium">{req}</span>}
        {fileError && <span className="text-red-500 text-xs font-medium">{fileError}</span>}
      </div>

      <button onClick={handleSubmit} disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 bg-[#003A91] text-white font-bold px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base hover:bg-[#C9A84C] transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-1">
        {status === "sending" ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t.form.sending}</>
        ) : (
          <>{t.form.submit}<ArrowRight size={16} /></>
        )}
      </button>
      {status === "error" && <p className="text-red-500 text-sm font-medium">{t.form.errorMsg}</p>}
    </div>
  );
}

function Field({ label, name, type, value, onChange, badge, error, errorMsg }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</label>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${error ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-100"}`}>
            {badge}
          </span>
        )}
      </div>
      <input type={type} name={name} value={value} onChange={onChange}
        className={`w-full bg-[#f7f7f7] border rounded-xl px-4 py-3 text-sm font-medium text-[#0a0a0a] focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-[#003A91]"}`} />
      {/* ✅ رسالة الخطأ تحت الحقل */}
      {error && <span className="text-red-500 text-xs font-medium">{errorMsg}</span>}
    </div>
  );
}


function Check({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}