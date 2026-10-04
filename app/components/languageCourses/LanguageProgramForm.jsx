"use client";

// app/components/languageCourses/LanguageProgramForm.jsx
//
// نموذج التسجيل في برنامج اللغة الإسبانية / العربية — نفس بنية وفلسفة
// EnglishProgramForm بالظبط (نفس الأقسام والحقول)، لكن بيانات المستويات
// والبرامج التخصصية مبنية على ملفي الـ PDF المرفوعين من العميل:
//   - Spanish Program Enrollment Form (A1 → B2 + 6 برامج تخصصية)
//   - Arabic Program Enrollment Form  (A1 → C1 + 6 برامج تخصصية)
// بيتبعت لـ POST /api/data?collection=spanishProgramRequests (أو
// arabicProgramRequests) — كتابة عامة من غير تسجيل دخول.
// اللغات المدعومة: العربية (ar) والإنجليزية (en) والإسبانية (es).

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Loader, CheckCircle2 } from "lucide-react";

const PROGRAMS = {
  spanish: {
    collection: "spanishProgramRequests",
    levels: ["A1", "A2", "B1", "B2"],
    track: "A1 → B2",
    core: [
      { id: "a1-foundations", cefr: "A1", en: "Spanish Foundations", ar: "أساسيات اللغة الإسبانية", es: "Fundamentos de Español" },
      { id: "a2-everyday", cefr: "A2", en: "Everyday Spanish", ar: "الإسبانية اليومية", es: "Español Cotidiano" },
      { id: "b1-practical", cefr: "B1", en: "Practical Spanish", ar: "الإسبانية العملية", es: "Español Práctico" },
      { id: "b2-professional", cefr: "B2", en: "Professional Spanish", ar: "إسبانية احترافية", es: "Español Profesional" },
    ],
    specialized: [
      { id: "business", range: "B2–C1", en: "Business Spanish", ar: "إسبانية الأعمال", es: "Español de Negocios" },
      { id: "academic", range: "B2–C1", en: "Academic Spanish", ar: "الإسبانية الأكاديمية", es: "Español Académico" },
      { id: "call-centers", range: "A2–B2", en: "Spanish for Call Centers", ar: "إسبانية مراكز الاتصال", es: "Español para Call Centers" },
      { id: "university", range: "B1–C1", en: "Spanish for University Students", ar: "إسبانية الطلاب الجامعيين", es: "Español para Estudiantes Universitarios" },
      { id: "job-interviews", range: "B1–C1", en: "Spanish for Job Interviews", ar: "إسبانية مقابلات العمل", es: "Español para Entrevistas de Trabajo" },
      { id: "hospitality", range: "A2–B2", en: "Spanish for Hospitality & Tourism", ar: "إسبانية الضيافة والسياحة", es: "Español para Hostelería y Turismo" },
    ],
    name: { en: "Spanish", ar: "الإسبانية", es: "español" },
    titleName: { en: "Spanish", ar: "الإسبانية", es: "Español" },
  },
  arabic: {
    collection: "arabicProgramRequests",
    levels: ["A1", "A2", "B1", "B2", "C1"],
    track: "A1 → C1",
    core: [
      { id: "a1-foundations", cefr: "A1", en: "Arabic Foundations", ar: "أساسيات اللغة العربية", es: "Fundamentos de Árabe" },
      { id: "a2-everyday", cefr: "A2", en: "Everyday Arabic", ar: "العربية اليومية", es: "Árabe Cotidiano" },
      { id: "b1-practical", cefr: "B1", en: "Practical Arabic", ar: "العربية العملية", es: "Árabe Práctico" },
      { id: "b2-professional", cefr: "B2", en: "Professional Arabic", ar: "عربية احترافية", es: "Árabe Profesional" },
      { id: "c1-advanced-professional", cefr: "C1", en: "Advanced Professional Arabic", ar: "عربية احترافية متقدمة", es: "Árabe Profesional Avanzado" },
    ],
    specialized: [
      { id: "business", range: "B2–C1", en: "Business Arabic", ar: "عربية الأعمال", es: "Árabe de Negocios" },
      { id: "academic", range: "B2–C1", en: "Academic Arabic", ar: "العربية الأكاديمية", es: "Árabe Académico" },
      { id: "customer-service", range: "B1–B2", en: "Arabic for Customer Service", ar: "عربية خدمة العملاء", es: "Árabe para Atención al Cliente" },
      { id: "university", range: "B1–C1", en: "Arabic for University Students", ar: "عربية الطلاب الجامعيين", es: "Árabe para Estudiantes Universitarios" },
      { id: "job-interviews", range: "B1–C1", en: "Arabic for Job Interviews", ar: "عربية مقابلات العمل", es: "Árabe para Entrevistas de Trabajo" },
      { id: "hospitality", range: "A2–B2", en: "Arabic for Hospitality & Tourism", ar: "عربية الضيافة والسياحة", es: "Árabe para Hostelería y Turismo" },
    ],
    name: { en: "Arabic", ar: "العربية", es: "árabe" },
    titleName: { en: "Arabic", ar: "العربية", es: "Árabe" },
  },
};

// {L} = اسم اللغة (للجمل)، {T} = اسم اللغة للعنوان، {track} = المسار
const STRINGS = {
  ar: {
    formTitle: "نموذج التسجيل في برنامج اللغة {T}",
    formSubtitle: "اختر المستوى أو البرنامج التخصصي الذي يناسبك، وسيتواصل فريقنا معك لتأكيد التسجيل وتفاصيل البدء.",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال...",
    required: "* يُرجى تعبئة الحقول المطلوبة والموافقة على سياسة الخصوصية",
    successTitle: "تم استلام طلب التسجيل بنجاح!",
    successDesc: "سيتواصل معك فريق Edumaster قريبًا لتأكيد مستواك الدراسي وموعد بداية البرنامج.",
    error: "حدث خطأ أثناء إرسال الطلب، يُرجى المحاولة مرة أخرى.",
    sections: { personal: "بيانات التواصل", level: "المستوى الحالي", program: "البرنامج المطلوب", preferences: "تفضيلات الدراسة", additional: "معلومات إضافية" },
    fields: {
      fullName: "الاسم بالكامل *",
      email: "البريد الإلكتروني *",
      phone: "رقم الواتساب / الهاتف *",
      countryOfResidence: "بلد الإقامة",
      preferredContact: "وسيلة التواصل المفضلة",
      contactOptions: { whatsapp: "واتساب", email: "بريد إلكتروني", phone: "مكالمة هاتفية" },
      knowsCurrentLevelLabel: "هل تعرف مستواك الحالي في اللغة {L}؟ *",
      yes: "نعم، أعرف مستواي", no: "لا، أحتاج إلى اختبار تحديد مستوى",
      currentLevel: "مستواك الحالي (CEFR)",
      programHint: "اختر خيارًا واحدًا.",
      coreLevelsLabel: "البرامج الأساسية (المسار الكامل {track})",
      specializedLabel: "أو برنامج تخصصي",
      preferredIntake: "الموعد المفضل للبدء",
      intakes: { immediate: "أقرب موعد متاح", month1: "خلال شهر", flexible: "مرن" },
      studyFormat: "طريقة الدراسة المفضلة",
      formats: { online: "عبر الإنترنت", inPerson: "حضوري", hybrid: "مدمج (عبر الإنترنت + حضوري)" },
      studyGoal: "هدفك من دراسة اللغة {L} (سفر، دراسة، عمل...)",
      notes: "أي ملاحظات أو أسئلة إضافية",
      privacyConsent: "أوافق على أن يتواصل معي فريق Edumaster بخصوص هذا الطلب *",
    },
  },
  en: {
    formTitle: "{T} Program Enrollment Form",
    formSubtitle: "Choose the level or specialized program that fits you, and our team will contact you to confirm enrollment and start details.",
    submit: "Submit request",
    submitting: "Submitting...",
    required: "* Please fill in the required fields and accept the privacy consent",
    successTitle: "Your enrollment request was received!",
    successDesc: "Our team will contact you soon to confirm your level and program start date.",
    error: "Something went wrong submitting your request, please try again.",
    sections: { personal: "Contact Information", level: "Current Level", program: "Desired Program", preferences: "Study Preferences", additional: "Additional Information" },
    fields: {
      fullName: "Full Name *",
      email: "Email Address *",
      phone: "WhatsApp / Phone Number *",
      countryOfResidence: "Country of Residence",
      preferredContact: "Preferred Method of Contact",
      contactOptions: { whatsapp: "WhatsApp", email: "Email", phone: "Phone Call" },
      knowsCurrentLevelLabel: "Do you know your current {L} level? *",
      yes: "Yes, I know my level", no: "No, I need a placement test",
      currentLevel: "Your current level (CEFR)",
      programHint: "Select one option.",
      coreLevelsLabel: "Core Program ({track} track)",
      specializedLabel: "Or a specialized program",
      preferredIntake: "Preferred start date",
      intakes: { immediate: "As soon as possible", month1: "Within a month", flexible: "Flexible" },
      studyFormat: "Preferred study format",
      formats: { online: "Online", inPerson: "In-person", hybrid: "Hybrid (online + in-person)" },
      studyGoal: "Your goal for learning {L} (travel, study, work...)",
      notes: "Any additional notes or questions",
      privacyConsent: "I agree to be contacted by Edumaster regarding this request *",
    },
  },
  es: {
    formTitle: "Formulario de Inscripción al Programa de {T}",
    formSubtitle: "Elige el nivel o el programa especializado que más te convenga, y nuestro equipo se pondrá en contacto contigo para confirmar la inscripción y los detalles de inicio.",
    submit: "Enviar solicitud",
    submitting: "Enviando...",
    required: "* Por favor completa los campos obligatorios y acepta la política de privacidad",
    successTitle: "¡Tu solicitud de inscripción fue recibida!",
    successDesc: "Nuestro equipo se pondrá en contacto contigo pronto para confirmar tu nivel y la fecha de inicio del programa.",
    error: "Ocurrió un error al enviar tu solicitud, por favor intenta de nuevo.",
    sections: { personal: "Información de Contacto", level: "Nivel Actual", program: "Programa Deseado", preferences: "Preferencias de Estudio", additional: "Información Adicional" },
    fields: {
      fullName: "Nombre Completo *",
      email: "Correo Electrónico *",
      phone: "Número de WhatsApp / Teléfono *",
      countryOfResidence: "País de Residencia",
      preferredContact: "Método de Contacto Preferido",
      contactOptions: { whatsapp: "WhatsApp", email: "Correo Electrónico", phone: "Llamada Telefónica" },
      knowsCurrentLevelLabel: "¿Conoces tu nivel actual de {L}? *",
      yes: "Sí, conozco mi nivel", no: "No, necesito una prueba de nivel",
      currentLevel: "Tu nivel actual (MCER)",
      programHint: "Selecciona una opción.",
      coreLevelsLabel: "Programa Principal (ruta {track})",
      specializedLabel: "O un programa especializado",
      preferredIntake: "Fecha de inicio preferida",
      intakes: { immediate: "Lo antes posible", month1: "Dentro de un mes", flexible: "Flexible" },
      studyFormat: "Formato de estudio preferido",
      formats: { online: "En línea", inPerson: "Presencial", hybrid: "Híbrido (en línea + presencial)" },
      studyGoal: "Tu objetivo al aprender {L} (viajar, estudiar, trabajar...)",
      notes: "Notas o preguntas adicionales",
      privacyConsent: "Acepto ser contactado/a por Edumaster respecto a esta solicitud *",
    },
  },
};

const initialFormState = {
  fullName: "", email: "", phone: "", countryOfResidence: "", preferredContact: "",
  knowsCurrentLevel: "", currentLevel: "",
  desiredProgram: "", preferredIntake: "", studyFormat: "", studyGoal: "",
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

function ProgramCard({ label, sub, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-start px-3.5 py-2.5 rounded-xl border transition-colors flex flex-col gap-0.5 ${
        selected ? "bg-[#003A91] text-white border-[#003A91]" : "bg-white text-gray-700 border-gray-200 hover:border-[#003A91]"
      }`}
    >
      <span className="text-xs font-bold">{label}</span>
      {sub && <span className={`text-[10px] ${selected ? "text-white/70" : "text-gray-400"}`}>{sub}</span>}
    </button>
  );
}

function pickLabel(item, language) {
  if (language === "ar") return item.ar;
  if (language === "es") return item.es;
  return item.en;
}

export default function LanguageProgramForm({ program = "spanish", onSuccess }) {
  const { language, isRTL } = useLanguage();
  const cfg = PROGRAMS[program] ?? PROGRAMS.spanish;
  const lang = STRINGS[language] ? language : "en";
  const t = STRINGS[lang];
  const f = t.fields;
  const L = cfg.name[lang];
  const fill = (s) => s.replace("{L}", L).replace("{T}", cfg.titleName[lang]).replace("{track}", cfg.track);

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.knowsCurrentLevel) {
      setError(t.required);
      return;
    }
    if (!form.privacyConsent) {
      setError(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/data?collection=${cfg.collection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "pending", language }),
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
        <h3 className="text-lg font-bold text-gray-900 mb-1">{fill(t.formTitle)}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{t.formSubtitle}</p>
      </div>

      <Section title={t.sections.personal} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.fullName}><input required className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
          <Field label={f.email}><input type="email" required className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label={f.phone}><input required className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label={f.countryOfResidence}><input className={inputCls} value={form.countryOfResidence} onChange={(e) => set("countryOfResidence", e.target.value)} /></Field>
          <Field label={f.preferredContact}>
            <select className={inputCls} value={form.preferredContact} onChange={(e) => set("preferredContact", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.contactOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.level} defaultOpen>
        <Field label={fill(f.knowsCurrentLevelLabel)}>
          <select className={inputCls} value={form.knowsCurrentLevel} onChange={(e) => set("knowsCurrentLevel", e.target.value)}>
            <option value="">—</option>
            <option value="yes">{f.yes}</option>
            <option value="no">{f.no}</option>
          </select>
        </Field>
        {form.knowsCurrentLevel === "yes" && (
          <Field label={f.currentLevel}>
            <select className={inputCls} value={form.currentLevel} onChange={(e) => set("currentLevel", e.target.value)}>
              <option value="">—</option>
              {cfg.levels.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
            </select>
          </Field>
        )}
      </Section>

      <Section title={t.sections.program} defaultOpen>
        <p className="text-[11px] text-gray-400 -mt-2">{f.programHint}</p>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{fill(f.coreLevelsLabel)}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cfg.core.map((lv) => (
              <ProgramCard
                key={lv.id}
                label={pickLabel(lv, lang)}
                sub={lv.cefr}
                selected={form.desiredProgram === lv.id}
                onClick={() => set("desiredProgram", lv.id)}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{f.specializedLabel}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cfg.specialized.map((p) => (
              <ProgramCard
                key={p.id}
                label={pickLabel(p, lang)}
                sub={p.range}
                selected={form.desiredProgram === p.id}
                onClick={() => set("desiredProgram", p.id)}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title={t.sections.preferences}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.preferredIntake}>
            <select className={inputCls} value={form.preferredIntake} onChange={(e) => set("preferredIntake", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.intakes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.studyFormat}>
            <select className={inputCls} value={form.studyFormat} onChange={(e) => set("studyFormat", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.formats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <Field label={fill(f.studyGoal)}>
          <textarea rows={3} className={inputCls} value={form.studyGoal} onChange={(e) => set("studyGoal", e.target.value)} />
        </Field>
      </Section>

      <Section title={t.sections.additional}>
        <Field label={f.notes}>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
          <input type="checkbox" required className="mt-0.5" checked={form.privacyConsent} onChange={(e) => set("privacyConsent", e.target.checked)} />
          {f.privacyConsent}
        </label>
      </Section>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

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