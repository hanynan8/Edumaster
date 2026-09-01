"use client";

// app/components/englishProgram/EnglishProgramForm.jsx
//
// نموذج "التسجيل في برنامج اللغة الإنجليزية" — مبني على مستند "EDUMASTER
// ENGLISH PROGRAM" المرفوع من العميل: 6 مستويات أساسية (A1 → C2) + برامج
// تخصصية (Business, Academic, Call Centers...). بيتبعت لـ
// POST /api/data?collection=englishProgramRequests (كتابة عامة من غير
// تسجيل دخول، زي فورم الاستشارة وطلب الترجمة).

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Loader, CheckCircle2 } from "lucide-react";

// نفس بنية المستوايات المقترحة في المستند المرفوع
const CORE_LEVELS = [
  { id: "a1-foundations", cefr: "A1", en: "English Foundations", ar: "أساسيات اللغة الإنجليزية" },
  { id: "a2-everyday", cefr: "A2", en: "Everyday English", ar: "الإنجليزية اليومية" },
  { id: "b1-practical", cefr: "B1", en: "Practical English", ar: "الإنجليزية العملية" },
  { id: "b2-professional", cefr: "B2", en: "Professional English", ar: "إنجليزية احترافية" },
  { id: "c1-advanced-professional", cefr: "C1", en: "Advanced Professional English", ar: "إنجليزية احترافية متقدمة" },
  { id: "c2-mastery", cefr: "C2", en: "English Mastery", ar: "إتقان اللغة الإنجليزية" },
];

const SPECIALIZED_PROGRAMS = [
  { id: "business", range: "B2–C1", en: "Business English", ar: "إنجليزية الأعمال" },
  { id: "academic", range: "B2–C1", en: "Academic English", ar: "الإنجليزية الأكاديمية" },
  { id: "call-centers", range: "A2–B2", en: "English for Call Centers", ar: "إنجليزية مراكز الاتصال" },
  { id: "customer-service", range: "B1–B2", en: "English for Customer Service", ar: "إنجليزية خدمة العملاء" },
  { id: "healthcare", range: "B2–C1", en: "English for Healthcare Professionals", ar: "إنجليزية الكوادر الطبية" },
  { id: "university", range: "B1–C1", en: "English for University Students", ar: "إنجليزية الطلاب الجامعيين" },
  { id: "job-interviews", range: "B1–C1", en: "English for Job Interviews", ar: "إنجليزية مقابلات العمل" },
  { id: "hospitality", range: "A2–B2", en: "English for Hospitality & Tourism", ar: "إنجليزية الضيافة والسياحة" },
];

const STRINGS = {
  ar: {
    formTitle: "نموذج التسجيل في برنامج اللغة الإنجليزية",
    formSubtitle: "اختار المستوى أو البرنامج التخصصي اللي يناسبك، وفريقنا هيتواصل معاك لتأكيد التسجيل وتفاصيل البدء.",
    submit: "إرسال الطلب",
    submitting: "جارِ الإرسال...",
    required: "* من فضلك املأ الحقول المطلوبة والموافقة على سياسة الخصوصية",
    successTitle: "تم استلام طلب التسجيل بنجاح!",
    successDesc: "فريق Edumaster هيتواصل معاك قريبًا لتأكيد مستواك الدراسي وميعاد بداية البرنامج.",
    error: "حصل خطأ أثناء إرسال الطلب، من فضلك حاول مرة أخرى.",
    sections: {
      personal: "بيانات التواصل",
      level: "المستوى الحالي",
      program: "البرنامج المطلوب",
      preferences: "تفضيلات الدراسة",
      additional: "معلومات إضافية",
    },
    fields: {
      fullName: "الاسم بالكامل *",
      email: "البريد الإلكتروني *",
      phone: "رقم الواتساب / الهاتف *",
      countryOfResidence: "بلد الإقامة",
      preferredContact: "وسيلة التواصل المفضلة",
      contactOptions: { whatsapp: "واتساب", email: "إيميل", phone: "مكالمة هاتفية" },
      knowsCurrentLevelLabel: "هل تعرف مستواك الحالي في اللغة الإنجليزية؟ *",
      yes: "أيوه، أعرف مستواي", no: "لأ، محتاج اختبار تحديد مستوى",
      currentLevel: "مستواك الحالي (CEFR)",
      coreLevelsLabel: "البرامج الأساسية (المسار الكامل A1 → C2)",
      specializedLabel: "أو برنامج تخصصي",
      preferredIntake: "الموعد المفضل للبدء",
      intakes: { immediate: "أقرب موعد متاح", month1: "خلال شهر", flexible: "مرن" },
      studyFormat: "طريقة الدراسة المفضلة",
      formats: { online: "أونلاين", inPerson: "حضوري", hybrid: "مدمج (أونلاين + حضوري)" },
      studyGoal: "هدفك من دراسة الإنجليزية (سفر، دراسة، عمل...)",
      notes: "أي ملاحظات أو أسئلة إضافية",
      privacyConsent: "أوافق على التواصل معايا من قبل Edumaster بخصوص هذا الطلب *",
    },
  },
  en: {
    formTitle: "English Program Enrollment Form",
    formSubtitle: "Choose the level or specialized program that fits you, and our team will contact you to confirm enrollment and start details.",
    submit: "Submit request",
    submitting: "Submitting...",
    required: "* Please fill in the required fields and accept the privacy consent",
    successTitle: "Your enrollment request was received!",
    successDesc: "Our team will contact you soon to confirm your level and program start date.",
    error: "Something went wrong submitting your request, please try again.",
    sections: {
      personal: "Contact Information",
      level: "Current Level",
      program: "Desired Program",
      preferences: "Study Preferences",
      additional: "Additional Information",
    },
    fields: {
      fullName: "Full Name *",
      email: "Email Address *",
      phone: "WhatsApp / Phone Number *",
      countryOfResidence: "Country of Residence",
      preferredContact: "Preferred Method of Contact",
      contactOptions: { whatsapp: "WhatsApp", email: "Email", phone: "Phone Call" },
      knowsCurrentLevelLabel: "Do you know your current English level? *",
      yes: "Yes, I know my level", no: "No, I need a placement test",
      currentLevel: "Your current level (CEFR)",
      coreLevelsLabel: "Core Program (full A1 → C2 track)",
      specializedLabel: "Or a specialized program",
      preferredIntake: "Preferred start date",
      intakes: { immediate: "As soon as possible", month1: "Within a month", flexible: "Flexible" },
      studyFormat: "Preferred study format",
      formats: { online: "Online", inPerson: "In-person", hybrid: "Hybrid (online + in-person)" },
      studyGoal: "Your goal for learning English (travel, study, work...)",
      notes: "Any additional notes or questions",
      privacyConsent: "I agree to be contacted by Edumaster regarding this request *",
    },
  },
};
STRINGS.es = STRINGS.en; // fallback مؤقت للإسباني على نفس نصوص الإنجليزي

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

export default function EnglishProgramForm({ onSuccess }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const f = t.fields;
  const isAr = language === "ar";

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
      const res = await fetch("/api/data?collection=englishProgramRequests", {
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
        <Field label={f.knowsCurrentLevelLabel}>
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
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => <option key={lv} value={lv}>{lv}</option>)}
            </select>
          </Field>
        )}
      </Section>

      <Section title={t.sections.program} defaultOpen>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{f.coreLevelsLabel}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CORE_LEVELS.map((lv) => (
              <ProgramCard
                key={lv.id}
                label={isAr ? lv.ar : lv.en}
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
            {SPECIALIZED_PROGRAMS.map((p) => (
              <ProgramCard
                key={p.id}
                label={isAr ? p.ar : p.en}
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
        <Field label={f.studyGoal}><input className={inputCls} value={form.studyGoal} onChange={(e) => set("studyGoal", e.target.value)} /></Field>
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