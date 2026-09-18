"use client";

// app/components/callCenter/CallCenterForm.jsx
//
// استمارة التسجيل في دورة "CALL CENTER OPERATIONS – LEVEL 1" (Edumaster365) —
// مبنية على الاستمارة المرسلة من العميل بنفس الأسئلة وبنفس الترتيب بالظبط (8 أسئلة
// + الموافقة على سياسة الخصوصية). بتتبعت لـ
// POST /api/data?collection=callCenterRequests (كتابة عامة من غير تسجيل دخول،
// زي فورم الاستشارة وطلب الترجمة والتسجيل في برنامج الإنجليزي والمنح).
//
// اللغات المدعومة بالكامل: العربية (ar) والإنجليزية (en) والإسبانية (es) —
// الأسئلة والاختيارات ونصوص النجاح/الخطأ كلها متوفرة بالثلاث لغات.
//
// القيم المخزّنة في الداتابيز هي ids ثابتة (مثلًا "senior_agent") مش النصوص
// المترجمة، عشان لوحة الأدمن تعرضها بشكل موحد بغض النظر عن لغة المتقدّم.

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader, CheckCircle2 } from "lucide-react";

const COURSE_ID = "call-center-operations-level-1";

// ترتيب الاختيارات زي الاستمارة الأصلية بالظبط
const OPTION_IDS = {
  hasExperience: ["yes", "no"],
  lastPosition: ["agent", "senior_agent", "team_leader", "supervisor", "other", "none"],
  englishLevel: ["basic", "intermediate", "advanced", "native"],
  objective: ["start_career", "improve_performance", "prepare_leadership", "develop_operations", "other"],
};

const STRINGS = {
  ar: {
    title: "CALL CENTER OPERATIONS – LEVEL 1",
    subtitle: "استمارة التسجيل | Edumaster365",
    submit: "إرسال الطلب",
    submitting: "جارِ الإرسال...",
    required: "* من فضلك املأ الحقول المطلوبة ووافق على سياسة الخصوصية",
    successTitle: "تم استلام طلبك بنجاح!",
    successDesc: "سيتواصل معك فريق Edumaster365 قريبًا لتأكيد تسجيلك في دورة Call Center Operations – Level 1.",
    error: "حدث خطأ أثناء إرسال الطلب، من فضلك حاول مرة أخرى.",
    questions: {
      fullName: "الاسم الكامل",
      age: "العمر",
      phone: "رقم الواتساب",
      email: "البريد الإلكتروني",
      hasExperience: "هل لديك خبرة سابقة في مجال الـ Call Center؟",
      lastPosition: "إذا كانت لديك خبرة، ما هو آخر منصب شغلته؟",
      englishLevel: "ما هو مستوى اللغة الإنجليزية لديك؟",
      objective: "ما هو هدفك الرئيسي من الالتحاق بهذه الدورة؟",
    },
    options: {
      hasExperience: { yes: "نعم", no: "لا" },
      lastPosition: {
        agent: "موظف خدمة عملاء (Agent)",
        senior_agent: "موظف خدمة عملاء أول (Senior Agent)",
        team_leader: "قائد فريق (Team Leader)",
        supervisor: "مشرف (Supervisor)",
        other: "أخرى",
        none: "بدون خبرة",
      },
      englishLevel: { basic: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", native: "لغة أم" },
      objective: {
        start_career: "بدء مسيرتي المهنية في مجال الـ Call Center",
        improve_performance: "تحسين أدائي الوظيفي",
        prepare_leadership: "الاستعداد للعمل كقائد فريق / مشرف",
        develop_operations: "تطوير مسيرتي المهنية في مجال Operations",
        other: "أخرى",
      },
    },
    consent: {
      prefix: "أوافق على ",
      link: "سياسة الخصوصية",
      suffix: " وأفوض Edumaster365 باستخدام بياناتي لمعالجة التسجيل والتواصل معي.",
    },
  },
  en: {
    title: "CALL CENTER OPERATIONS – LEVEL 1",
    subtitle: "Registration Form | Edumaster365",
    submit: "SUBMIT APPLICATION",
    submitting: "Submitting...",
    required: "* Please fill in the required fields and accept the Privacy Policy",
    successTitle: "Application received!",
    successDesc: "The Edumaster365 team will contact you soon to confirm your registration for Call Center Operations – Level 1.",
    error: "Something went wrong submitting your application, please try again.",
    questions: {
      fullName: "Full Name",
      age: "Age",
      phone: "WhatsApp",
      email: "Email",
      hasExperience: "Do you have Call Center experience?",
      lastPosition: "If you have experience, what was your last position?",
      englishLevel: "What is your English level?",
      objective: "What is your main objective for taking this course?",
    },
    options: {
      hasExperience: { yes: "Yes", no: "No" },
      lastPosition: {
        agent: "Agent",
        senior_agent: "Senior Agent",
        team_leader: "Team Leader",
        supervisor: "Supervisor",
        other: "Other",
        none: "No experience",
      },
      englishLevel: { basic: "Basic", intermediate: "Intermediate", advanced: "Advanced", native: "Native" },
      objective: {
        start_career: "Start a career in the Call Center industry",
        improve_performance: "Improve my performance",
        prepare_leadership: "Prepare for a Team Leader / Supervisor position",
        develop_operations: "Develop my career in Call Center Operations",
        other: "Other",
      },
    },
    consent: {
      prefix: "I accept the ",
      link: "Privacy Policy",
      suffix: " and authorize Edumaster365 to use my information to process my registration and contact me.",
    },
  },
  es: {
    title: "CALL CENTER OPERATIONS – LEVEL 1",
    subtitle: "Formulario de inscripción | Edumaster365",
    submit: "ENVIAR SOLICITUD",
    submitting: "Enviando...",
    required: "* Por favor completa los campos obligatorios y acepta la política de privacidad",
    successTitle: "¡Solicitud recibida!",
    successDesc: "El equipo de Edumaster365 se pondrá en contacto contigo pronto para confirmar tu inscripción en Call Center Operations – Level 1.",
    error: "Ocurrió un error al enviar tu solicitud, por favor intenta de nuevo.",
    questions: {
      fullName: "Nombre completo",
      age: "Edad",
      phone: "WhatsApp",
      email: "Correo electrónico",
      hasExperience: "¿Tienes experiencia en Call Center?",
      lastPosition: "Si tienes experiencia, ¿cuál es tu último puesto?",
      englishLevel: "¿Cuál es tu nivel de inglés?",
      objective: "¿Cuál es tu principal objetivo con este curso?",
    },
    options: {
      hasExperience: { yes: "Sí", no: "No" },
      lastPosition: {
        agent: "Agente",
        senior_agent: "Agente Senior",
        team_leader: "Team Leader",
        supervisor: "Supervisor",
        other: "Otro",
        none: "Sin experiencia",
      },
      englishLevel: { basic: "Básico", intermediate: "Intermedio", advanced: "Avanzado", native: "Nativo" },
      objective: {
        start_career: "Entrar en el sector Call Center",
        improve_performance: "Mejorar mi rendimiento",
        prepare_leadership: "Prepararme para Team Leader / Supervisor",
        develop_operations: "Desarrollar mi carrera en Operations",
        other: "Otro",
      },
    },
    consent: {
      prefix: "Acepto la ",
      link: "política de privacidad",
      suffix: " y autorizo a Edumaster365 a utilizar mis datos para gestionar mi inscripción y contactar conmigo.",
    },
  },
};

const initialFormState = {
  fullName: "",
  age: "",
  phone: "",
  email: "",
  hasExperience: "",
  lastPosition: "",
  englishLevel: "",
  objective: "",
  privacyConsent: false,
};

const inputCls =
  "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A91]/20 focus:border-[#003A91]";

function QuestionLabel({ id, number, text, required }) {
  return (
    <span id={id} className="text-sm font-bold text-gray-800">
      <span className="text-[#003A91] me-1.5">{number}.</span>
      {text}
      {required && (
        <span className="text-red-500 ms-1" aria-hidden="true">
          *
        </span>
      )}
    </span>
  );
}

// سؤال إجابته نص قصير (الاسم، العمر، الواتساب، الإيميل)
function TextQuestion({ number, text, required, className = "", ...inputProps }) {
  const labelId = `cc-q${number}-label`;
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <QuestionLabel id={labelId} number={number} text={text} required={required} />
      <input required={required} aria-labelledby={labelId} className={inputCls} {...inputProps} />
    </label>
  );
}

// سؤال اختيار واحد (radio group) — بنفس أسلوب الاستمارة الأصلية
function ChoiceQuestion({ number, text, required, name, options, value, onChange, disabledValues = [], columns = "sm:grid-cols-2" }) {
  const labelId = `cc-q${number}-label`;
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-2.5">
      <QuestionLabel id={labelId} number={number} text={text} required={required} />
      <div className={`grid grid-cols-1 ${columns} gap-2`}>
        {options.map(({ id, label }) => {
          const selected = value === id;
          const disabled = disabledValues.includes(id);
          return (
            <label
              key={id}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus-within:ring-2 focus-within:ring-[#003A91]/30 ${
                disabled
                  ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-500"
                  : selected
                  ? "cursor-pointer border-[#003A91] bg-[#003A91]/5 text-[#003A91] font-semibold"
                  : "cursor-pointer border-gray-200 text-gray-700 hover:border-[#003A91]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={id}
                checked={selected}
                disabled={disabled}
                required={required}
                onChange={() => onChange(id)}
                className="w-4 h-4 shrink-0 accent-[#003A91]"
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function CallCenterForm({ onSuccess }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // السؤال 5 والسؤال 6 مرتبطين ببعض: لو مفيش خبرة، آخر منصب = "بدون خبرة"
  // تلقائي، ولو فيه خبرة يبقى "بدون خبرة" مش اختيار منطقي.
  function chooseExperience(value) {
    setForm((prev) => ({
      ...prev,
      hasExperience: value,
      lastPosition: value === "no" ? "none" : prev.lastPosition === "none" ? "" : prev.lastPosition,
    }));
  }

  function chooseLastPosition(value) {
    setForm((prev) => ({
      ...prev,
      lastPosition: value,
      hasExperience: value === "none" ? "no" : prev.hasExperience || "yes",
    }));
  }

  const lastPositionDisabled =
    form.hasExperience === "no"
      ? OPTION_IDS.lastPosition.filter((id) => id !== "none")
      : form.hasExperience === "yes"
      ? ["none"]
      : [];

  const optionList = (group) =>
    OPTION_IDS[group].map((id) => ({ id, label: t.options[group][id] }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const fullName = form.fullName.trim();
    const age = form.age.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!fullName || !age || !phone || !email || !form.hasExperience || !form.englishLevel || !form.objective) {
      setError(t.required);
      return;
    }
    if (!form.privacyConsent) {
      setError(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/data?collection=callCenterRequests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fullName,
          age,
          phone,
          email,
          course: COURSE_ID,
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
    <form dir={isRTL ? "rtl" : "ltr"} onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* pe-10 عشان زرار الإغلاق بتاع المودال ميغطيش العنوان */}
      <div className="pe-10">
        <h3 className="text-lg font-bold text-gray-900 mb-1" dir="ltr" style={{ textAlign: isRTL ? "right" : "left" }}>
          {t.title}
        </h3>
        <p className="text-sm text-gray-500">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <TextQuestion
          number={1}
          text={t.questions.fullName}
          required
          className="sm:col-span-2"
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
        <TextQuestion
          number={2}
          text={t.questions.age}
          required
          type="number"
          min="10"
          max="100"
          inputMode="numeric"
          value={form.age}
          onChange={(e) => set("age", e.target.value)}
        />
        <TextQuestion
          number={3}
          text={t.questions.phone}
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        <TextQuestion
          number={4}
          text={t.questions.email}
          required
          className="sm:col-span-2"
          type="email"
          autoComplete="email"
          dir="ltr"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>

      <ChoiceQuestion
        number={5}
        text={t.questions.hasExperience}
        required
        name="hasExperience"
        options={optionList("hasExperience")}
        value={form.hasExperience}
        onChange={chooseExperience}
      />

      <ChoiceQuestion
        number={6}
        text={t.questions.lastPosition}
        name="lastPosition"
        options={optionList("lastPosition")}
        value={form.lastPosition}
        onChange={chooseLastPosition}
        disabledValues={lastPositionDisabled}
      />

      <ChoiceQuestion
        number={7}
        text={t.questions.englishLevel}
        required
        name="englishLevel"
        options={optionList("englishLevel")}
        value={form.englishLevel}
        onChange={(v) => set("englishLevel", v)}
      />

      <ChoiceQuestion
        number={8}
        text={t.questions.objective}
        required
        name="objective"
        columns="sm:grid-cols-1"
        options={optionList("objective")}
        value={form.objective}
        onChange={(v) => set("objective", v)}
      />

      <label className="flex items-start gap-2.5 text-sm text-gray-600 pt-4 border-t border-gray-100">
        <input
          type="checkbox"
          required
          className="mt-0.5 w-4 h-4 shrink-0 accent-[#003A91]"
          checked={form.privacyConsent}
          onChange={(e) => set("privacyConsent", e.target.checked)}
        />
        <span>
          {t.consent.prefix}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#003A91] font-semibold underline">
            {t.consent.link}
          </a>
          {t.consent.suffix}
        </span>
      </label>

      {error && (
        <div role="alert" className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
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