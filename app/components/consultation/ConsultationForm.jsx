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
// بعد الإرسال بنجاح، بيتحول المستخدم لخطوة الدفع (تحويل بنكي — نفس مكوّن
// BankTransferInfo المستخدم في باقي المشروع) بمبلغ 1300 جنيه.

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Loader, CheckCircle2 } from "lucide-react";
import BankTransferInfo from "@/app/components/payments/BankTransferInfo";

const CONSULTATION_FEE = 1300; // جنيه
const CONSULTATION_CURRENCY = "EGP";
const CONSULTATION_DURATION_MIN = 45;

/* ─────────────────────────────────────────
   جلب الخدمات الحالية من /services (نفس كولكشن الموقع)
   عشان المستخدم يختار الاستشارة عن أنهي خدمة بالظبط
───────────────────────────────────────── */
function useCurrentServices(language) {
  const [names, setNames] = useState([]);
  useEffect(() => {
    fetch("/api/data?collection=services")
      .then((r) => r.json())
      .then((res) => {
        const doc = Array.isArray(res) ? res[0] : res;
        const t = doc?.i18n?.[language] ?? doc?.i18n?.en;
        const list = t?.services ? Object.values(t.services) : [];
        setNames(list.map((s) => s?.title).filter(Boolean));
      })
      .catch(() => setNames([]));
  }, [language]);
  return names;
}

const STRINGS = {
  ar: {
    formTitle: "نموذج بيانات الطالب وطلب الاستشارة",
    durationLabel: "مدة الاستشارة",
    minutes: "دقيقة",
    feeLabel: "الرسوم",
    egp: "جنيه",
    submit: "إرسال الطلب",
    submitting: "جارِ الإرسال...",
    required: "* حقل مطلوب",
    successTitle: "تم استلام طلبك بنجاح!",
    successDesc: "هنتواصل معاك قريبًا لتأكيد الموعد. كمّل خطوة الدفع تحت عشان نأكّد الحجز.",
    error: "حصل خطأ أثناء إرسال الطلب، حاول تاني.",
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
      service: "اختار الخدمة",
      chooseService: "-- اختار خدمة --",
      preferredDate: "التاريخ المفضل",
      preferredTimeSlot: "الوقت المفضل",
      howDidYouHear: "كيف تعرفت على Edumaster365؟",
      hearOptions: { facebook: "فيسبوك", instagram: "إنستغرام", google: "جوجل", friend: "صديق", other: "أخرى" },
      notes: "ملاحظات أو طلبات خاصة",
      dataAccuracy: "أقر بأن جميع البيانات المقدمة صحيحة",
      contactConsent: "أوافق على التواصل معي من قبل Edumaster365",
      privacyConsent: "أوافق على سياسة الخصوصية ومعالجة البيانات *",
    },
  },
  en: {
    formTitle: "Student Data & Consultation Request Form",
    durationLabel: "Consultation duration",
    minutes: "minutes",
    feeLabel: "Fee",
    egp: "EGP",
    submit: "Submit request",
    submitting: "Submitting...",
    required: "* Required field",
    successTitle: "Your request was received!",
    successDesc: "We'll contact you soon to confirm the appointment. Complete the payment step below to confirm your booking.",
    error: "Something went wrong submitting your request, please try again.",
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
      privacyConsent: "I agree to the privacy policy & data processing *",
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

function Section({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
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

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A91]/20 focus:border-[#003A91]";

export default function ConsultationForm({ onSuccess }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const f = t.fields;
  const serviceNames = useCurrentServices(language);

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError(t.required);
      return;
    }
    if (!form.privacyConsent) {
      setError(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/data?collection=consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          consultationDurationMinutes: CONSULTATION_DURATION_MIN,
          consultationFee: CONSULTATION_FEE,
          consultationCurrency: CONSULTATION_CURRENCY,
          status: "pending",
          language,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setSuccess(true);
      onSuccess?.();
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
        <BankTransferInfo amount={CONSULTATION_FEE} currency={CONSULTATION_CURRENCY} />
      </div>
    );
  }

  return (
    <form dir={isRTL ? "rtl" : "ltr"} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t.formTitle}</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-[#003A91]/5 text-[#003A91] font-bold px-3 py-1.5 rounded-full">
            {t.durationLabel}: {CONSULTATION_DURATION_MIN} {t.minutes}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[#C9A227]/10 text-[#8a6d10] font-bold px-3 py-1.5 rounded-full">
            {t.feeLabel}: {CONSULTATION_FEE} {t.egp}
          </span>
        </div>
      </div>

      <Section title={t.sections.personal} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.firstName}><input required className={inputCls} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
          <Field label={f.lastName}><input required className={inputCls} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field label={f.gender}>
            <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">—</option>
              <option value="male">{f.male}</option>
              <option value="female">{f.female}</option>
            </select>
          </Field>
          <Field label={f.dob}><input type="date" className={inputCls} value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field label={f.nationality}><input className={inputCls} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
          <Field label={f.countryOfResidence}><input className={inputCls} value={form.countryOfResidence} onChange={(e) => set("countryOfResidence", e.target.value)} /></Field>
          <Field label={f.city}><input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label={f.maritalStatus}>
            <select className={inputCls} value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
              <option value="">—</option>
              <option value="single">{f.single}</option>
              <option value="married">{f.married}</option>
              <option value="other">{f.otherMarital}</option>
            </select>
          </Field>
          <Field label={f.passportNumber}><input className={inputCls} value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} /></Field>
          <Field label={f.passportExpiry}><input type="date" className={inputCls} value={form.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={t.sections.contact} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.email}><input type="email" required className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label={f.phone}><input required className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label={f.whatsapp}><input className={inputCls} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label={f.preferredContact}>
            <select className={inputCls} value={form.preferredContact} onChange={(e) => set("preferredContact", e.target.value)}>
              <option value="">—</option>
              <option value="email">{f.email}</option>
              <option value="phone">{f.phone}</option>
              <option value="whatsapp">{f.whatsapp}</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.services} defaultOpen>
        <Field label={f.service}>
          <select className={inputCls} value={form.service} onChange={(e) => set("service", e.target.value)}>
            <option value="">{f.chooseService}</option>
            {serviceNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title={t.sections.schedule} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.preferredDate}><input type="date" className={inputCls} value={form.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} /></Field>
          <Field label={f.preferredTimeSlot}><input className={inputCls} placeholder="e.g. 4:00 PM" value={form.preferredTimeSlot} onChange={(e) => set("preferredTimeSlot", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={t.sections.academic}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.highestQualification}>
            <select className={inputCls} value={form.highestQualification} onChange={(e) => set("highestQualification", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.qualifications).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.major}><input className={inputCls} value={form.major} onChange={(e) => set("major", e.target.value)} /></Field>
          <Field label={f.institutionName}><input className={inputCls} value={form.institutionName} onChange={(e) => set("institutionName", e.target.value)} /></Field>
          <Field label={f.institutionCountry}><input className={inputCls} value={form.institutionCountry} onChange={(e) => set("institutionCountry", e.target.value)} /></Field>
          <Field label={f.graduationYear}><input className={inputCls} value={form.graduationYear} onChange={(e) => set("graduationYear", e.target.value)} /></Field>
          <Field label={f.finalGrade}><input className={inputCls} value={form.finalGrade} onChange={(e) => set("finalGrade", e.target.value)} /></Field>
          <Field label={f.studyLanguage}><input className={inputCls} value={form.studyLanguage} onChange={(e) => set("studyLanguage", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={t.sections.language}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.spanishLevel}>
            <select className={inputCls} value={form.spanishLevel} onChange={(e) => set("spanishLevel", e.target.value)}>
              <option value="">—</option>
              {["none", "A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => <option key={lv} value={lv}>{lv}</option>)}
            </select>
          </Field>
          <Field label={f.englishLevel}>
            <select className={inputCls} value={form.englishLevel} onChange={(e) => set("englishLevel", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.englishLevels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.certificateGradeDate}><input className={inputCls} value={form.certificateGradeDate} onChange={(e) => set("certificateGradeDate", e.target.value)} /></Field>
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

      <Section title={t.sections.preferences}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.desiredCountry}>
            <select className={inputCls} value={form.desiredCountry} onChange={(e) => set("desiredCountry", e.target.value)}>
              <option value="">—</option>
              <option value="spain">{language === "ar" ? "إسبانيا" : "Spain"}</option>
              <option value="romania">{language === "ar" ? "رومانيا" : "Romania"}</option>
            </select>
          </Field>
          <Field label={f.programType}>
            <select className={inputCls} value={form.programType} onChange={(e) => set("programType", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.programTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.desiredField}><input className={inputCls} value={form.desiredField} onChange={(e) => set("desiredField", e.target.value)} /></Field>
          <Field label={f.preferredIntake}>
            <select className={inputCls} value={form.preferredIntake} onChange={(e) => set("preferredIntake", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.intakes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.visa}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["previousSchengenApplication", "previousVisaRejection", "currentValidVisa"].map((key) => (
            <Field key={key} label={f[key]}>
              <select className={inputCls} value={form[key]} onChange={(e) => set(key, e.target.value)}>
                <option value="">—</option>
                <option value="yes">{f.yes}</option>
                <option value="no">{f.no}</option>
              </select>
            </Field>
          ))}
        </div>
      </Section>

      <Section title={t.sections.financial}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.annualBudget}><input className={inputCls} value={form.annualBudget} onChange={(e) => set("annualBudget", e.target.value)} /></Field>
          <Field label={f.fundingSource}>
            <select className={inputCls} value={form.fundingSource} onChange={(e) => set("fundingSource", e.target.value)}>
              <option value="">—</option>
              <option value="personal">{f.personal_}</option>
              <option value="family">{f.family}</option>
              <option value="sponsor">{f.sponsor}</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.additional}>
        <Field label={f.howDidYouHear}>
          <select className={inputCls} value={form.howDidYouHear} onChange={(e) => set("howDidYouHear", e.target.value)}>
            <option value="">—</option>
            {Object.entries(f.hearOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label={f.notes}>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" className="mt-0.5" checked={form.dataAccuracy} onChange={(e) => set("dataAccuracy", e.target.checked)} />
            {f.dataAccuracy}
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" className="mt-0.5" checked={form.contactConsent} onChange={(e) => set("contactConsent", e.target.checked)} />
            {f.contactConsent}
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
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
  );
}