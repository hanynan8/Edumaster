"use client";

// app/components/scholarship/ScholarshipForm.jsx
//
// نموذج "طلب تقييم فرص المنح الدراسية" (Scholarship Assessment Request /
// Paid consultation form) — مبني على المستند المرفوع من العميل بنفس الأقسام
// والحقول بالظبط (البيانات الشخصية، المعلومات الأكاديمية، مستوى اللغة،
// أهداف الدراسة، معلومات إضافية + الموافقة على استخدام البيانات).
// بيتبعت لـ POST /api/data?collection=scholarshipRequests (كتابة عامة من
// غير تسجيل دخول، زي فورم الاستشارة وطلب الترجمة والتسجيل في برنامج
// الإنجليزي).
//
// ⚠️ ملحوظة عن "إرفاق شهادة التخرج": مفيش راوت رفع ملفات عام للزوار
// (/api/upload/file بيتطلب تسجيل دخول + role)، فمتبع نفس حل TranslationForm:
// حقل "رابط الشهادة" (Google Drive / WeTransfer) اختياري + تنويه إنه ممكن
// يبعتها على واتساب أو إيميل بعد الإرسال.
//
// اللغات المدعومة بالكامل: العربية (ar) والإنجليزية (en) والإسبانية (es).

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Loader, CheckCircle2 } from "lucide-react";

// مستويات اللغة (CEFR) + "Native" — نفس الاختيارات لمستوى الإسباني والإنجليزي
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const STRINGS = {
  ar: {
    formTitle: "طلب تقييم فرص المنح الدراسية",
    formSubtitle:
      "يرجى استكمال هذه الاستمارة، وسيقوم فريقنا بمراجعة ملفك لتحديد المنح الدراسية والمساعدات المالية وفرص التمويل التي قد تناسب دراستك.",
    submit: "إرسال الطلب",
    submitting: "جارِ الإرسال...",
    required: "* من فضلك املأ الحقول المطلوبة ووافق على استخدام البيانات",
    successTitle: "تم استلام طلبك بنجاح!",
    successDesc:
      "فريق Edumaster هيراجع ملفك الأكاديمي وأهدافك، ويتواصل معاك بخصوص المنح الدراسية والمساعدات وفرص التمويل اللي ممكن تناسبك.",
    error: "حصل خطأ أثناء إرسال الطلب، من فضلك حاول مرة أخرى.",
    sections: {
      personal: "1. البيانات الشخصية",
      academic: "2. المعلومات الأكاديمية",
      languages: "3. مستوى اللغة",
      goals: "4. أهداف الدراسة",
      additional: "5. معلومات إضافية",
    },
    fields: {
      fullName: "الاسم الكامل *",
      nationality: "الجنسية",
      age: "العمر",
      countryOfResidence: "بلد الإقامة",
      phone: "رقم واتساب *",
      email: "البريد الإلكتروني *",
      educationLevel: "المستوى الدراسي الحالي",
      educationLevels: { university: "درجة جامعية", masters: "ماجستير", phd: "دكتوراه" },
      lastDegree: "آخر مؤهل دراسي / الدراسة الحالية",
      fieldOfStudy: "مجال الدراسة",
      gpa: "المعدل الدراسي التقريبي",
      certificateLink: "رابط شهادة التخرج أو شهادة المؤهل (اختياري)",
      certificateNote:
        "📎 ارفع شهادة التخرج أو شهادة المؤهل على Google Drive أو WeTransfer والصق الرابط تحت، أو ابعتها لنا على واتساب / إيميل بعد إرسال الاستمارة.",
      spanishLevel: "مستوى اللغة الإسبانية",
      englishLevel: "مستوى اللغة الإنجليزية",
      native: "اللغة الأم",
      studyField: "ماذا ترغب في دراسة؟",
      studyCountry: "أين ترغب في الدراسة؟",
      studyCountries: { spain: "إسبانيا", romania: "رومانيا", other: "دولة أخرى", unsure: "لم أحدد بعد" },
      studyLevel: "المستوى الدراسي الذي ترغب في الالتحاق به",
      studyLevels: { masters: "ماجستير", phd: "دكتوراه", language: "دورة لغة" },
      startDate: "متى ترغب في بدء الدراسة؟",
      notes: "أخبرنا باختصار عن هدفك الدراسي أو وضعك الحالي",
      consent:
        "أوافق على استخدام Edumaster لهذه البيانات لتقييم طلبي والتواصل معي بشأن فرص المنح الدراسية وفرص الدراسة. *",
    },
  },
  en: {
    formTitle: "Paid Consultation Form",
    formSubtitle:
      "Please complete this form and our team will review your profile to identify the scholarships, financial aid, and funding opportunities that may suit your studies.",
    submit: "Submit request",
    submitting: "Submitting...",
    required: "* Please fill in the required fields and accept the data-use consent",
    successTitle: "Your request was received!",
    successDesc:
      "Our team will review your academic profile and goals, and contact you about the scholarships, financial aid and funding opportunities that may fit you.",
    error: "Something went wrong submitting your request, please try again.",
    sections: {
      personal: "1. Personal Information",
      academic: "2. Academic Information",
      languages: "3. Language Level",
      goals: "4. Study Goals",
      additional: "5. Additional Information",
    },
    fields: {
      fullName: "Full Name *",
      nationality: "Nationality",
      age: "Age",
      countryOfResidence: "Country of Residence",
      phone: "WhatsApp *",
      email: "Email *",
      educationLevel: "Current Education Level",
      educationLevels: { university: "University Degree", masters: "Master’s Degree", phd: "PhD" },
      lastDegree: "Most Recent Degree / Current Studies",
      fieldOfStudy: "Field of Study",
      gpa: "Approximate Academic Average / GPA",
      certificateLink: "Degree or graduation certificate link (optional)",
      certificateNote:
        "📎 Upload your degree or graduation certificate to Google Drive / WeTransfer and paste the link below, or send it to us via WhatsApp / email after submitting this form.",
      spanishLevel: "Spanish Level",
      englishLevel: "English Level",
      native: "Native",
      studyField: "What would you like to study?",
      studyCountry: "Where would you like to study?",
      studyCountries: { spain: "Spain", romania: "Romania", other: "Another country", unsure: "I am not sure yet" },
      studyLevel: "Level You Wish to Study",
      studyLevels: { masters: "Master’s Degree", phd: "PhD", language: "Language Course" },
      startDate: "When would you like to start your studies?",
      notes: "Tell us briefly about your study goals or situation",
      consent:
        "I agree that Edumaster may use this information to assess my application and contact me regarding scholarship and study opportunities. *",
    },
  },
  es: {
    formTitle: "Formulario de consulta de pago",
    formSubtitle:
      "Completa este formulario y nuestro equipo revisará tu perfil para identificar las becas, ayudas económicas y oportunidades de financiación que puedan adaptarse a tus estudios.",
    submit: "Enviar solicitud",
    submitting: "Enviando...",
    required: "* Por favor completa los campos obligatorios y acepta el uso de tus datos",
    successTitle: "¡Tu solicitud fue recibida!",
    successDesc:
      "Nuestro equipo revisará tu perfil académico y tus objetivos, y se pondrá en contacto contigo sobre las becas, ayudas y oportunidades de financiación que puedan encajar contigo.",
    error: "Ocurrió un error al enviar tu solicitud, por favor intenta de nuevo.",
    sections: {
      personal: "1. Datos personales",
      academic: "2. Información académica",
      languages: "3. Nivel de idiomas",
      goals: "4. Objetivo de estudios",
      additional: "5. Información adicional",
    },
    fields: {
      fullName: "Nombre completo *",
      nationality: "Nacionalidad",
      age: "Edad",
      countryOfResidence: "País de residencia",
      phone: "WhatsApp *",
      email: "Email *",
      educationLevel: "Nivel de estudios actual",
      educationLevels: { university: "Grado universitario", masters: "Máster", phd: "Doctorado" },
      lastDegree: "Último título obtenido / estudios actuales",
      fieldOfStudy: "Área de estudios",
      gpa: "Promedio académico aproximado",
      certificateLink: "Enlace del título o certificado de título (opcional)",
      certificateNote:
        "📎 Sube tu título o certificado de título a Google Drive / WeTransfer y pega el enlace abajo, o envíanoslo por WhatsApp / correo electrónico después de enviar este formulario.",
      spanishLevel: "Nivel de español",
      englishLevel: "Nivel de inglés",
      native: "Nativo",
      studyField: "¿Qué quieres estudiar?",
      studyCountry: "¿Dónde quieres estudiar?",
      studyCountries: { spain: "España", romania: "Rumanía", other: "Otro país", unsure: "No lo sé todavía" },
      studyLevel: "Nivel que deseas cursar",
      studyLevels: { masters: "Máster", phd: "Doctorado", language: "Curso de idiomas" },
      startDate: "¿Cuándo quieres comenzar tus estudios?",
      notes: "Cuéntanos brevemente tu objetivo o situación",
      consent:
        "Acepto que Edumaster pueda utilizar estos datos para evaluar mi solicitud y contactarme en relación con oportunidades de becas y estudios. *",
    },
  },
};

const initialFormState = {
  fullName: "", nationality: "", age: "", countryOfResidence: "", phone: "", email: "",
  educationLevel: "", lastDegree: "", fieldOfStudy: "", gpa: "", certificateLink: "",
  spanishLevel: "", englishLevel: "",
  studyField: "", studyCountry: "", studyLevel: "", startDate: "",
  notes: "", privacyConsent: false,
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

export default function ScholarshipForm({ onSuccess }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const f = t.fields;

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // نفس اختيارات مستوى اللغة للإسباني والإنجليزي (A1 → C2 + Native)
  const languageLevelOptions = [
    ...CEFR_LEVELS.map((l) => [l, l]),
    ["native", f.native],
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError(t.required);
      return;
    }
    if (!form.privacyConsent) {
      setError(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/data?collection=scholarshipRequests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
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
      <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col items-center text-center py-4">
        <CheckCircle2 size={40} className="text-green-600 mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t.successTitle}</h3>
        <p className="text-sm text-gray-500 max-w-sm">{t.successDesc}</p>
      </div>
    );
  }

  return (
    <form dir={isRTL ? "rtl" : "ltr"} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t.formTitle}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{t.formSubtitle}</p>
      </div>

      <Section title={t.sections.personal} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.fullName}><input required className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
          <Field label={f.nationality}><input className={inputCls} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
          <Field label={f.age}><input type="number" min="10" max="100" inputMode="numeric" className={inputCls} value={form.age} onChange={(e) => set("age", e.target.value)} /></Field>
          <Field label={f.countryOfResidence}><input className={inputCls} value={form.countryOfResidence} onChange={(e) => set("countryOfResidence", e.target.value)} /></Field>
          <Field label={f.phone}><input type="tel" required className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label={f.email}><input type="email" required className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={t.sections.academic} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.educationLevel}>
            <select className={inputCls} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.educationLevels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.lastDegree}><input className={inputCls} value={form.lastDegree} onChange={(e) => set("lastDegree", e.target.value)} /></Field>
          <Field label={f.fieldOfStudy}><input className={inputCls} value={form.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} /></Field>
          <Field label={f.gpa}><input className={inputCls} value={form.gpa} onChange={(e) => set("gpa", e.target.value)} /></Field>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{f.certificateNote}</p>
        <Field label={f.certificateLink}>
          <input className={inputCls} placeholder="https://" value={form.certificateLink} onChange={(e) => set("certificateLink", e.target.value)} />
        </Field>
      </Section>

      <Section title={t.sections.languages}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.spanishLevel}>
            <select className={inputCls} value={form.spanishLevel} onChange={(e) => set("spanishLevel", e.target.value)}>
              <option value="">—</option>
              {languageLevelOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.englishLevel}>
            <select className={inputCls} value={form.englishLevel} onChange={(e) => set("englishLevel", e.target.value)}>
              <option value="">—</option>
              {languageLevelOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.goals}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.studyField}><input className={inputCls} value={form.studyField} onChange={(e) => set("studyField", e.target.value)} /></Field>
          <Field label={f.startDate}><input className={inputCls} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label={f.studyCountry}>
            <select className={inputCls} value={form.studyCountry} onChange={(e) => set("studyCountry", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.studyCountries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.studyLevel}>
            <select className={inputCls} value={form.studyLevel} onChange={(e) => set("studyLevel", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.studyLevels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.additional} defaultOpen>
        <Field label={f.notes}>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            required
            className="mt-0.5"
            checked={form.privacyConsent}
            onChange={(e) => set("privacyConsent", e.target.checked)}
          />
          {f.consent}
        </label>
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