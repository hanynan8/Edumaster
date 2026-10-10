"use client";

// app/components/consultation/ConsultationForm.jsx
//
// نموذج "بيانات الطالب وطلب الاستشارة" — مبني على نفس النموذج المرفوع من
// العميل (Edumaster365 — نموذج بيانات الطالب وطلب الاستشارة)، منظّم في
// أقسام قابلة للطي زي النموذج الأصلي بالظبط. بيتبعت لـ
// POST /api/data?collection=consultations (كتابة عامة من غير تسجيل دخول،
// زي فورم التواصل "form")، وبيظهر في لوحة الأدمن (شوف
// app/admin/components/consultationsPanel.jsx).
//
// 🆕 بعد الإرسال بنجاح، بيتحول المستخدم مباشرة لبوابة GetPayIn (بدل خطوة
// التحويل البنكي القديمة اللي كانت بتعرض BankTransferInfo) — نفس بوابة
// الدفع الوحيدة المستخدمة في باقي المشروع (app/lib/getpayin.js). الرسوم
// الأساسية 1300 جنيه مصري، ومتحوّلة تلقائيًا حسب لغة الموقع الحالية بنفس
// منطق app/lib/currency.js (ar→EGP, en→USD, es→EUR) — المبلغ المعروض هنا
// للعميل والمبلغ الفعلي اللي بيتحصّل في GetPayIn (محسوب في السيرفر في
// app/api/payments/getpayin/consultation-checkout) نفس القيمة بالظبط.

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Loader, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { getCurrencyForLanguage, convertPrice, formatPrice } from "@/app/lib/currency";
import { CONSULTATION_REQUIRED_FIELDS, CONSULTATION_SECTION_FIELDS } from "@/app/lib/consultationFields";

const REQUIRED_SET = new Set(CONSULTATION_REQUIRED_FIELDS);
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONSULTATION_FEE = 1300; // جنيه مصري (السعر الأساسي المخزّن)
const CONSULTATION_CURRENCY = "EGP";
const CONSULTATION_DURATION_MIN = 45;

// 🆕 مرفق إجباري — بيتحمّل عبر نفس راوت فورم الكونتاكت العام
// (/api/upload/contact-attachment: صور/PDF/Word حتى 5MB) وقت الإرسال، والرابط
// الجاهز بيتبعت مع الطلب في attachmentUrl/attachmentName.
const ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ATTACHMENT_ALLOWED_TYPES = ATTACHMENT_ACCEPT.split(",");
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024; // لازم يطابق MAX_BYTES في الراوت
const ATTACHMENT_STRINGS = {
  en: {
    label: "Attach files",
    required: "Required",
    pick: "Choose file",
    hint: "Images, PDF or Word — up to 5MB",
    remove: "Remove",
    tooLarge: "File is too large (max 5MB)",
    invalidType: "Unsupported file type",
    uploadError: "Couldn't upload the file, please try again",
  },
  ar: {
    label: "إرفاق ملفات",
    required: "مطلوب",
    pick: "اختر ملف",
    hint: "صور أو PDF أو Word — حتى 5 ميغابايت",
    remove: "إزالة",
    tooLarge: "حجم الملف كبير جدًا (الأقصى 5 ميجا)",
    invalidType: "نوع الملف غير مدعوم",
    uploadError: "تعذّر رفع الملف، حاول مرة أخرى",
  },
};
ATTACHMENT_STRINGS.es = ATTACHMENT_STRINGS.en;

/* ─────────────────────────────────────────
   جلب الخدمات الحالية من /services (نفس كولكشن الموقع)
   عشان المستخدم يختار الاستشارة عن أنهي خدمة بالظبط
───────────────────────────────────────── */
// الخدمات اللي اتشالت من قايمة "Which service is this consultation about?":
//   - Language Courses  (id: "language" / "language Courses")
//   - Certified Translation (id: "translation")
//   - Call Center & Career Training (id: "career")
// بنتحقق بالـ id (المفتاح) وكمان بالعنوان (بالـ 3 لغات) احتياطًا لو الـ id اتغيّر من الأدمن.
const EXCLUDED_SERVICE_KEYS = new Set(["language", "languagecourses", "translation", "certifiedtranslation", "career"]);
const EXCLUDED_SERVICE_TITLE_RE =
  /language courses|certified translation|دورات اللغات|دورات اللغة|الترجمة المعتمدة|ترجمة معتمدة|cursos de idiomas|traducci[oó]n certificada|call center|career training|مراكز الاتصال|مركز الاتصال|formaci[oó]n profesional/i;
function isExcludedConsultationService(key, title) {
  const k = String(key ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return EXCLUDED_SERVICE_KEYS.has(k) || k.includes("callcenter") || EXCLUDED_SERVICE_TITLE_RE.test(String(title ?? ""));
}

function useCurrentServices(language) {
  const [names, setNames] = useState([]);
  useEffect(() => {
    fetch("/api/data?collection=services")
      .then((r) => r.json())
      .then((res) => {
        const doc = Array.isArray(res) ? res[0] : res;
        const t = doc?.i18n?.[language] ?? doc?.i18n?.en;
        const entries = t?.services ? Object.entries(t.services) : [];
        setNames(
          entries
            // 🔄 "Language Courses" و"Certified Translation" و"Call Center & Career Training" مش بيظهروا في قايمة الاستشارة
            .filter(([key, s]) => !isExcludedConsultationService(key, s?.title))
            .map(([, s]) => s?.title)
            .filter(Boolean)
        );
      })
      .catch(() => setNames([]));
  }, [language]);
  return names;
}

const STRINGS = {
  ar: {
    formTitle: "نموذج بيانات الطالب وطلب الاستشارة",
    zoomLabel: "اجتماع Zoom",
    durationLabel: "مدة الاستشارة",
    minutes: "دقيقة",
    feeLabel: "الرسوم",
    egp: "جنيه",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال...",
    required: "* حقل مطلوب",
    fillRequired: "من فضلك أكمل الحقول المطلوبة المميّزة باللون الأحمر",
    successTitle: "تم استلام طلبك بنجاح!",
    successDesc: "سنتواصل معك قريبًا لتأكيد الموعد. أكمل الدفع أدناه لتأكيد الحجز.",
    error: "حدث خطأ أثناء إرسال الطلب، يُرجى المحاولة مرة أخرى.",
    redirectingToPayment: "جارٍ تحويلك لصفحة الدفع الآمنة...",
    payNow: "الدفع عبر GetPayIn",
    paymentError: "تعذّر بدء عملية الدفع، يُرجى المحاولة مرة أخرى.",
    retryPayment: "إعادة المحاولة",
    securePayment: "دفع آمن ببطاقتك أو محفظتك الإلكترونية",
    sections: {
      personal: "المعلومات الشخصية",
      contact: "معلومات التواصل",
      academic: "المؤهل والخلفية الأكاديمية",
      language: "المهارات اللغوية",
      preferences: "تفضيلات الدراسة",
      visa: "معلومات التأشيرة والهجرة",
      financial: "المعلومات المالية",
      services: "الخدمة المطلوب الاستشارة عنها",
      schedule: "ميعاد الاستشارة المفضّل",
      additional: "معلومات إضافية",
    },
    fields: {
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      gender: "الجنس",
      male: "ذكر", female: "أنثى",
      dob: "تاريخ الميلاد",
      nationality: "الجنسية",
      countryOfResidence: "بلد الإقامة",
      city: "المدينة",
      maritalStatus: "الحالة الاجتماعية",
      single: "أعزب", married: "متزوج", otherMarital: "أخرى",
      passportNumber: "رقم جواز السفر",
      passportExpiry: "تاريخ انتهاء جواز السفر",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف (مع رمز الدولة)",
      whatsapp: "رقم واتساب (إن وجد)",
      preferredContact: "وسيلة التواصل المفضلة",
      highestQualification: "أعلى مؤهل دراسي",
      qualifications: { highschool: "ثانوية عامة", diploma: "دبلوم", bachelor: "بكالوريوس", master: "ماجستير", phd: "دكتوراه" },
      major: "التخصص",
      institutionName: "اسم المؤسسة التعليمية",
      institutionCountry: "بلد المؤسسة",
      graduationYear: "سنة التخرج",
      finalGrade: "المعدل / التقدير النهائي",
      studyLanguage: "لغة الدراسة",
      spanishLevel: "مستوى اللغة الإسبانية",
      englishLevel: "مستوى اللغة الإنجليزية",
      englishLevels: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", fluent: "بطلاقة" },
      languageCertificates: "شهادات اللغة (إن وجدت)",
      certificateGradeDate: "الدرجة والتاريخ",
      desiredCountry: "الدولة المرغوبة للدراسة",
      programType: "نوع البرنامج المطلوب",
      programTypes: { language: "دورة لغة إسبانية", foundation: "برنامج تمهيدي", bachelor: "بكالوريوس", master: "ماجستير", phd: "دكتوراه", fp: "تدريب مهني (FP)" },
      desiredField: "التخصص أو المجال المرغوب",
      preferredIntake: "موعد الالتحاق المفضل",
      intakes: { jan: "يناير", apr: "أبريل", sep: "سبتمبر", flexible: "مرن" },
      previousSchengenApplication: "هل سبق لك التقديم على تأشيرة شنغن؟",
      previousVisaRejection: "هل سبق رفض تأشيرتك؟",
      currentValidVisa: "هل تملك تأشيرة سارية حاليًا؟",
      yes: "نعم", no: "لا",
      annualBudget: "الميزانية السنوية المتوقعة للدراسة",
      fundingSource: "مصدر التمويل",
      personal_: "شخصي", family: "الأسرة", sponsor: "كفيل",
      service: "اختر الخدمة",
      chooseService: "-- اختر خدمة --",
      preferredDate: "التاريخ المفضل",
      preferredTimeSlot: "الوقت المفضل",
      howDidYouHear: "كيف تعرفت على Edumaster365؟",
      hearOptions: { facebook: "فيسبوك", instagram: "إنستغرام", google: "جوجل", friend: "صديق", other: "أخرى" },
      notes: "ملاحظات أو طلبات خاصة",
      dataAccuracy: "أقر بأن جميع البيانات المقدمة صحيحة",
      contactConsent: "أوافق على التواصل معي من قبل Edumaster365",
      privacyConsent: "أوافق على سياسة الخصوصية والشروط *",
    },
  },
  en: {
    formTitle: "Student Data & Consultation Request Form",
    zoomLabel: "Zoom meeting",
    durationLabel: "Consultation duration",
    minutes: "minutes",
    feeLabel: "Fee",
    egp: "EGP",
    submit: "Submit request",
    submitting: "Submitting...",
    required: "* Required field",
    fillRequired: "Please complete the required fields highlighted in red",
    successTitle: "Your request was received!",
    successDesc: "We'll contact you soon to confirm the appointment. Complete the payment below to confirm your booking.",
    error: "Something went wrong submitting your request, please try again.",
    redirectingToPayment: "Redirecting you to the secure payment page...",
    payNow: "Pay with GetPayIn",
    paymentError: "Couldn't start the payment, please try again.",
    retryPayment: "Retry",
    securePayment: "Secure payment via card or e-wallet",
    sections: {
      personal: "Personal Information",
      contact: "Contact Information",
      academic: "Academic Background",
      language: "Language Skills",
      preferences: "Study Preferences",
      visa: "Visa & Immigration Information",
      financial: "Financial Information",
      services: "Which service is this consultation about?",
      schedule: "Preferred consultation time",
      additional: "Additional Information",
    },
    fields: {
      firstName: "First name",
      lastName: "Last name",
      gender: "Gender",
      male: "Male", female: "Female",
      dob: "Date of birth",
      nationality: "Nationality",
      countryOfResidence: "Country of residence",
      city: "City",
      maritalStatus: "Marital status",
      single: "Single", married: "Married", otherMarital: "Other",
      passportNumber: "Passport number",
      passportExpiry: "Passport expiry date",
      email: "Email",
      phone: "Phone number (with country code)",
      whatsapp: "WhatsApp number (if any)",
      preferredContact: "Preferred contact method",
      highestQualification: "Highest qualification",
      qualifications: { highschool: "High school", diploma: "Diploma", bachelor: "Bachelor's", master: "Master's", phd: "PhD" },
      major: "Major",
      institutionName: "Institution name",
      institutionCountry: "Institution country",
      graduationYear: "Graduation year",
      finalGrade: "Final grade / GPA",
      studyLanguage: "Language of study",
      spanishLevel: "Spanish level",
      englishLevel: "English level",
      englishLevels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", fluent: "Fluent" },
      languageCertificates: "Language certificates (if any)",
      certificateGradeDate: "Score & date",
      desiredCountry: "Desired study country",
      programType: "Program type",
      programTypes: { language: "Spanish language course", foundation: "Foundation program", bachelor: "Bachelor's", master: "Master's", phd: "PhD", fp: "Vocational training (FP)" },
      desiredField: "Desired field of study",
      preferredIntake: "Preferred intake",
      intakes: { jan: "January", apr: "April", sep: "September", flexible: "Flexible" },
      previousSchengenApplication: "Have you applied for a Schengen visa before?",
      previousVisaRejection: "Has your visa ever been rejected?",
      currentValidVisa: "Do you currently hold a valid visa?",
      yes: "Yes", no: "No",
      annualBudget: "Expected annual study budget",
      fundingSource: "Funding source",
      personal_: "Personal", family: "Family", sponsor: "Sponsor",
      service: "Choose a service",
      chooseService: "-- Choose a service --",
      preferredDate: "Preferred date",
      preferredTimeSlot: "Preferred time",
      howDidYouHear: "How did you hear about Edumaster365?",
      hearOptions: { facebook: "Facebook", instagram: "Instagram", google: "Google", friend: "Friend", other: "Other" },
      notes: "Notes or special requests",
      dataAccuracy: "I confirm all the information provided is accurate",
      contactConsent: "I agree to be contacted by Edumaster365",
      privacyConsent: "I agree to the terms & conditions *",
    },
  },
};
STRINGS.es = STRINGS.en; // fallback مؤقت للإسباني على نفس نصوص الإنجليزي

const initialFormState = {
  firstName: "", lastName: "", gender: "", dob: "", nationality: "",
  countryOfResidence: "", city: "", maritalStatus: "", passportNumber: "", passportExpiry: "",
  email: "", phone: "", whatsapp: "", preferredContact: "",
  highestQualification: "", major: "", institutionName: "", institutionCountry: "",
  graduationYear: "", finalGrade: "", studyLanguage: "",
  spanishLevel: "", englishLevel: "", languageCertificates: [], certificateGradeDate: "",
  desiredCountry: "", programType: "", desiredField: "", preferredIntake: "",
  previousSchengenApplication: "", previousVisaRejection: "", currentValidVisa: "",
  annualBudget: "", fundingSource: "",
  service: "",
  preferredDate: "", preferredTimeSlot: "",
  howDidYouHear: "", notes: "",
  dataAccuracy: false, contactConsent: false, privacyConsent: false,
};

function Section({ title, defaultOpen, hasError, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  // لو ظهر حقل إجباري ناقص جوه القسم ده نفتحه تلقائيًا عشان المستخدم يشوفه.
  // (حالة مشتقة وقت الـ render بدل useEffect — ومابنقفلوش تاني لما الخطأ يتشال)
  const [seenError, setSeenError] = useState(false);
  if (!!hasError !== seenError) {
    setSeenError(!!hasError);
    if (hasError) setOpen(true);
  }
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-start"
      >
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4 sm:p-5 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

// أخطاء الحقول الإجبارية + نص رسالة الخطأ (بتتوصل للـ Field عن طريق context
// عشان منعدّلش كل حقل لوحده).
const FormErrorsContext = createContext({ errors: {}, message: "" });

function Field({ name, label, children }) {
  const { errors, message } = useContext(FormErrorsContext);
  const required = !!name && REQUIRED_SET.has(name);
  const invalid = !!name && !!errors[name];
  return (
    <label
      id={name ? `field-${name}` : undefined}
      className={`flex flex-col gap-1.5 ${invalid ? "[&_input]:border-red-400 [&_select]:border-red-400 [&_textarea]:border-red-400" : ""}`}
    >
      <span className={`text-xs font-bold ${invalid ? "text-red-500" : "text-gray-500"}`}>
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </span>
      {children}
      {invalid && <span className="text-red-500 text-xs font-medium">{message}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A91]/20 focus:border-[#003A91]";

export default function ConsultationForm({ onSuccess, initialService = "", initialCountry = "" }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const f = t.fields;
  const serviceNames = useCurrentServices(language);

  // 🆕 عملة وسعر العرض الفعليين للمستخدم — محسوبين من لغة الموقع الحالية
  // بنفس منطق app/lib/currency.js (ar→EGP, en→USD, es→EUR)، نفس المبلغ
  // اللي هيتحسب في السيرفر وقت فتح عملية الدفع فعليًا (شوف
  // app/api/payments/getpayin/consultation-checkout) — مفيش أي فرق بين
  // اللي المستخدم شايفه هنا واللي هيتحصّل منه فعليًا.
  const displayCurrency = getCurrencyForLanguage(language);
  const displayFee = convertPrice(CONSULTATION_FEE, CONSULTATION_CURRENCY, displayCurrency);

  const [form, setForm] = useState(() => ({ ...initialFormState, service: initialService || "", desiredCountry: initialCountry || "" }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [consultationId, setConsultationId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  // 🆕 حالة المرفق الاختياري
  const [errors, setErrors] = useState({});
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);
  const at = ATTACHMENT_STRINGS[language] ?? ATTACHMENT_STRINGS.en;

  function handleFileChange(e) {
    const picked = e.target.files?.[0] || null;
    if (!picked) { setFile(null); setFileError(""); return; }
    if (!ATTACHMENT_ALLOWED_TYPES.includes(picked.type)) {
      setFileError(at.invalidType); setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (picked.size > ATTACHMENT_MAX_BYTES) {
      setFileError(at.tooLarge); setFile(null);
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

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // أول ما المستخدم يعدّل الحقل نشيل تمييز الخطأ منه
    setErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  }

  const sectionHasError = (name) => (CONSULTATION_SECTION_FIELDS[name] || []).some((k) => errors[k]);

  function toggleCert(cert) {
    setForm((prev) => {
      const has = prev.languageCertificates.includes(cert);
      return {
        ...prev,
        languageCertificates: has
          ? prev.languageCertificates.filter((c) => c !== cert)
          : [...prev.languageCertificates, cert],
      };
    });
  }

  // 🆕 بيفتح عملية دفع GetPayIn لطلب الاستشارة اللي اتسجل بالفعل (بعد نجاح
  // POST /api/data?collection=consultations) وبيحوّل المستخدم لصفحة الدفع
  // المستضافة عندهم — نفس تدفق باقي المشروع (شوف
  // app/(pages)/courses/[id]/page.jsx → handleBuyConfirm). قابلة للمناداة
  // تاني لو فشلت المحاولة الأولى (زرار "إعادة المحاولة").
  async function startPayment(id) {
    setPaymentError("");
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/payments/getpayin/consultation-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: id, language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectUrl) {
        setPaymentError(t.paymentError);
        setPaymentLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setPaymentError(t.paymentError);
      setPaymentLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    // 🆕 كل الحقول إجبارية ما عدا "المعلومات الإضافية" — بنميّز الناقص بالأحمر
    const missing = {};
    for (const key of CONSULTATION_REQUIRED_FIELDS) {
      if (!String(form[key] ?? "").trim()) missing[key] = true;
    }
    if (form.email.trim() && !SIMPLE_EMAIL_REGEX.test(form.email.trim())) missing.email = true;
    if (!form.privacyConsent) missing.privacyConsent = true;
    // 🆕 المرفق إجباري
    if (!file) missing.attachment = true;
    setErrors(missing);
    const firstMissing = Object.keys(missing)[0];
    if (firstMissing) {
      setError(t.fillRequired);
      // نستنى الأقسام المقفولة تتفتح، وبعدين نعمل scroll لأول حقل ناقص
      setTimeout(() => {
        document.getElementById(`field-${firstMissing}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }
    if (fileError) return;
    setSubmitting(true);
    try {
      // 🆕 لو المستخدم اختار مرفق نرفعه الأول؛ لو الرفع فشل منبعتش طلب ناقص.
      let attachmentUrl = null;
      let attachmentName = null;
      if (file) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const uploadRes = await fetch("/api/upload/contact-attachment", { method: "POST", body: uploadForm });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData.url) {
          setFileError(at.uploadError);
          return;
        }
        attachmentUrl = uploadData.url;
        attachmentName = uploadData.name || file.name;
      }

      const res = await fetch("/api/data?collection=consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}),
          consultationDurationMinutes: CONSULTATION_DURATION_MIN,
          consultationFee: CONSULTATION_FEE,
          consultationCurrency: CONSULTATION_CURRENCY,
          status: "pending",
          language,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const created = await res.json();
      setConsultationId(created._id);
      setSuccess(true);
      onSuccess?.();
      // 🆕 بنبدأ عملية الدفع تلقائيًا على طول بعد نجاح تسجيل الطلب — من غير
      // ما نستنى ضغطة زرار زيادة من المستخدم (نفس شكل التحويل البنكي
      // القديم اللي كان بيظهر على طول في شاشة النجاح).
      startPayment(created._id);
    } catch {
      setError(t.error);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex flex-col items-center text-center mb-6">
          <CheckCircle2 size={40} className="text-green-600 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">{t.successTitle}</h3>
          <p className="text-sm text-gray-500 max-w-sm">{t.successDesc}</p>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-4">
          <span className="text-sm text-gray-500">{t.feeLabel}</span>
          <span className="text-lg font-black text-gray-900">
            {formatPrice(displayFee, displayCurrency, language)}
          </span>
        </div>

        {paymentError && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        <button
          type="button"
          disabled={paymentLoading}
          onClick={() => startPayment(consultationId)}
          className="w-full flex items-center justify-center gap-2 bg-[#003A91] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {paymentLoading ? (
            <>
              <Loader size={16} className="animate-spin" /> {t.redirectingToPayment}
            </>
          ) : (
            <>
              <ShieldCheck size={17} /> {paymentError ? t.retryPayment : t.payNow}
            </>
          )}
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-3">{t.securePayment}</p>
      </div>
    );
  }

  return (
    <FormErrorsContext.Provider value={{ errors, message: t.required }}>
    <form dir={isRTL ? "rtl" : "ltr"} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t.formTitle}</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-[#003A91]/5 text-[#003A91] font-bold px-3 py-1.5 rounded-full">
            {t.durationLabel}: {CONSULTATION_DURATION_MIN} {t.minutes}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[#C9A227]/10 text-[#8a6d10] font-bold px-3 py-1.5 rounded-full">
            {t.feeLabel}: {formatPrice(displayFee, displayCurrency, language)}
          </span>
          {/* معلومة فقط (بدون أي وظيفة): الاستشارة بتتم عبر Zoom */}
          <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded-full">
            {t.zoomLabel}
          </span>
        </div>
      </div>

      <Section title={t.sections.personal} hasError={sectionHasError("personal")} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="firstName" label={f.firstName}><input required className={inputCls} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
          <Field name="lastName" label={f.lastName}><input required className={inputCls} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field name="gender" label={f.gender}>
            <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">—</option>
              <option value="male">{f.male}</option>
              <option value="female">{f.female}</option>
            </select>
          </Field>
          <Field name="dob" label={f.dob}><input type="date" className={inputCls} value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field name="nationality" label={f.nationality}><input className={inputCls} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
          <Field name="countryOfResidence" label={f.countryOfResidence}><input className={inputCls} value={form.countryOfResidence} onChange={(e) => set("countryOfResidence", e.target.value)} /></Field>
          <Field name="city" label={f.city}><input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field name="maritalStatus" label={f.maritalStatus}>
            <select className={inputCls} value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
              <option value="">—</option>
              <option value="single">{f.single}</option>
              <option value="married">{f.married}</option>
              <option value="other">{f.otherMarital}</option>
            </select>
          </Field>
          <Field name="passportNumber" label={f.passportNumber}><input className={inputCls} value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} /></Field>
          <Field name="passportExpiry" label={f.passportExpiry}><input type="date" className={inputCls} value={form.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={t.sections.contact} hasError={sectionHasError("contact")} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="email" label={f.email}><input type="email" required className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field name="phone" label={f.phone}><input required className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field name="whatsapp" label={f.whatsapp}><input className={inputCls} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field name="preferredContact" label={f.preferredContact}>
            <select className={inputCls} value={form.preferredContact} onChange={(e) => set("preferredContact", e.target.value)}>
              <option value="">—</option>
              <option value="email">{f.email}</option>
              <option value="phone">{f.phone}</option>
              <option value="whatsapp">{f.whatsapp}</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.services} hasError={sectionHasError("services")} defaultOpen>
        <Field name="service" label={f.service}>
          <select className={inputCls} value={form.service} onChange={(e) => set("service", e.target.value)}>
            <option value="">{f.chooseService}</option>
            {serviceNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title={t.sections.schedule} hasError={sectionHasError("schedule")} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="preferredDate" label={f.preferredDate}><input type="date" className={inputCls} value={form.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} /></Field>
          <Field name="preferredTimeSlot" label={f.preferredTimeSlot}><input className={inputCls} placeholder="e.g. 4:00 PM" value={form.preferredTimeSlot} onChange={(e) => set("preferredTimeSlot", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={t.sections.academic} hasError={sectionHasError("academic")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="highestQualification" label={f.highestQualification}>
            <select className={inputCls} value={form.highestQualification} onChange={(e) => set("highestQualification", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.qualifications).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field name="major" label={f.major}><input className={inputCls} value={form.major} onChange={(e) => set("major", e.target.value)} /></Field>
          <Field name="institutionName" label={f.institutionName}><input className={inputCls} value={form.institutionName} onChange={(e) => set("institutionName", e.target.value)} /></Field>
          <Field name="institutionCountry" label={f.institutionCountry}><input className={inputCls} value={form.institutionCountry} onChange={(e) => set("institutionCountry", e.target.value)} /></Field>
          <Field name="graduationYear" label={f.graduationYear}><input className={inputCls} value={form.graduationYear} onChange={(e) => set("graduationYear", e.target.value)} /></Field>
          <Field name="finalGrade" label={f.finalGrade}><input className={inputCls} value={form.finalGrade} onChange={(e) => set("finalGrade", e.target.value)} /></Field>
          <Field name="studyLanguage" label={f.studyLanguage}><input className={inputCls} value={form.studyLanguage} onChange={(e) => set("studyLanguage", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={t.sections.language} hasError={sectionHasError("language")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="spanishLevel" label={f.spanishLevel}>
            <select className={inputCls} value={form.spanishLevel} onChange={(e) => set("spanishLevel", e.target.value)}>
              <option value="">—</option>
              {["none", "A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => <option key={lv} value={lv}>{lv}</option>)}
            </select>
          </Field>
          <Field name="englishLevel" label={f.englishLevel}>
            <select className={inputCls} value={form.englishLevel} onChange={(e) => set("englishLevel", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.englishLevels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field name="certificateGradeDate" label={f.certificateGradeDate}><input className={inputCls} value={form.certificateGradeDate} onChange={(e) => set("certificateGradeDate", e.target.value)} /></Field>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{f.languageCertificates}</span>
          <div className="flex flex-wrap gap-2">
            {["IELTS", "TOEFL", "DELE", "SIELE"].map((cert) => (
              <button
                type="button"
                key={cert}
                onClick={() => toggleCert(cert)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  form.languageCertificates.includes(cert)
                    ? "bg-[#003A91] text-white border-[#003A91]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#003A91]"
                }`}
              >
                {cert}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t.sections.preferences} hasError={sectionHasError("preferences")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="desiredCountry" label={f.desiredCountry}>
            <select className={inputCls} value={form.desiredCountry} onChange={(e) => set("desiredCountry", e.target.value)}>
              <option value="">—</option>
              <option value="spain">{language === "ar" ? "إسبانيا" : "Spain"}</option>
              <option value="romania">{language === "ar" ? "رومانيا" : "Romania"}</option>
            </select>
          </Field>
          <Field name="programType" label={f.programType}>
            <select className={inputCls} value={form.programType} onChange={(e) => set("programType", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.programTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field name="desiredField" label={f.desiredField}><input className={inputCls} value={form.desiredField} onChange={(e) => set("desiredField", e.target.value)} /></Field>
          <Field name="preferredIntake" label={f.preferredIntake}>
            <select className={inputCls} value={form.preferredIntake} onChange={(e) => set("preferredIntake", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.intakes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.visa} hasError={sectionHasError("visa")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["previousSchengenApplication", "previousVisaRejection", "currentValidVisa"].map((key) => (
            <Field key={key} name={key} label={f[key]}>
              <select className={inputCls} value={form[key]} onChange={(e) => set(key, e.target.value)}>
                <option value="">—</option>
                <option value="yes">{f.yes}</option>
                <option value="no">{f.no}</option>
              </select>
            </Field>
          ))}
        </div>
      </Section>

      <Section title={t.sections.financial} hasError={sectionHasError("financial")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="annualBudget" label={f.annualBudget}><input className={inputCls} value={form.annualBudget} onChange={(e) => set("annualBudget", e.target.value)} /></Field>
          <Field name="fundingSource" label={f.fundingSource}>
            <select className={inputCls} value={form.fundingSource} onChange={(e) => set("fundingSource", e.target.value)}>
              <option value="">—</option>
              <option value="personal">{f.personal_}</option>
              <option value="family">{f.family}</option>
              <option value="sponsor">{f.sponsor}</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.additional} hasError={sectionHasError("additional")}>
        <Field name="howDidYouHear" label={f.howDidYouHear}>
          <select className={inputCls} value={form.howDidYouHear} onChange={(e) => set("howDidYouHear", e.target.value)}>
            <option value="">—</option>
            {Object.entries(f.hearOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field name="notes" label={f.notes}>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        {/* 🆕 شريط إرفاق ملف (إجباري) */}
        <div id="field-attachment" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">{at.label}<span className="text-red-500 ms-0.5">*</span></span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${errors.attachment ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-100"}`}>{at.required}</span>
          </div>
          <div className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${fileError || errors.attachment ? "border-red-400" : "border-gray-200"}`}>
            <label className="shrink-0 flex items-center gap-1.5 cursor-pointer text-[#003A91] font-bold text-xs hover:underline">
              <span>📎</span>
              {at.pick}
              <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={handleFileChange} className="hidden" />
            </label>
            <span className="truncate text-sm text-gray-500 flex-1">{file ? file.name : at.hint}</span>
            {file && (
              <button type="button" onClick={handleRemoveFile} className="shrink-0 text-gray-400 hover:text-red-500 text-xs font-bold">
                {at.remove}
              </button>
            )}
          </div>
          {errors.attachment && !file && <span className="text-red-500 text-xs font-medium">{at.required}</span>}
          {fileError && <span className="text-red-500 text-xs font-medium">{fileError}</span>}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" className="mt-0.5" checked={form.dataAccuracy} onChange={(e) => set("dataAccuracy", e.target.checked)} />
            {f.dataAccuracy}
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" className="mt-0.5" checked={form.contactConsent} onChange={(e) => set("contactConsent", e.target.checked)} />
            {f.contactConsent}
          </label>
          <label id="field-privacyConsent" className={`flex items-start gap-2 text-xs ${errors.privacyConsent ? "text-red-600 font-bold" : "text-gray-600"}`}>
            <input type="checkbox" required className="mt-0.5" checked={form.privacyConsent} onChange={(e) => set("privacyConsent", e.target.checked)} />
            {f.privacyConsent}
          </label>
        </div>
      </Section>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-[#003A91] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {submitting && <Loader size={16} className="animate-spin" />}
        {submitting ? t.submitting : t.submit}
      </button>
    </form>
    </FormErrorsContext.Provider>
  );
}