"use client";

// app/components/translation/TranslationForm.jsx
//
// نموذج "طلب ترجمة" (Translation Request Form) — مبني على نموذج
// "EDUMASTER TRANSLATION SERVICES" المرفوع من العميل، بنفس الأقسام
// والحقول بالظبط (بيانات العميل، تفاصيل طلب الترجمة، بيانات المستندات،
// التوثيق والتصديق، الموعد النهائي، طريقة التسليم، وإقرار العميل).
// بيتبعت لـ POST /api/data?collection=translationRequests (كتابة عامة من
// غير تسجيل دخول، زي فورم الاستشارة).

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Loader, CheckCircle2 } from "lucide-react";

const STRINGS = {
  ar: {
    formTitle: "نموذج طلب ترجمة",
    formSubtitle:
      "من فضلك أكمل البيانات التالية بدقة عشان فريقنا يقدر يقيّم طلب الترجمة ويديك عرض السعر المناسب.",
    submit: "إرسال الطلب",
    submitting: "جارِ الإرسال...",
    required: "* من فضلك املأ الحقول المطلوبة والموافقة على الإقرارات",
    successTitle: "تم استلام طلب الترجمة بنجاح!",
    successDesc:
      "فريق Edumaster هيراجع مستنداتك ويتواصل معاك بعرض السعر النهائي والمدة المتوقعة للتسليم وطريقة الدفع.",
    error: "حصل خطأ أثناء إرسال الطلب، من فضلك حاول مرة أخرى.",
    sections: {
      client: "1. بيانات العميل",
      request: "2. تفاصيل طلب الترجمة",
      document: "3. بيانات المستندات",
      upload: "4. رفع المستندات",
      certification: "5. التوثيق والتصديق",
      deadline: "6. الموعد النهائي",
      delivery: "7. طريقة التسليم",
      declaration: "إقرار العميل",
      additional: "8. معلومات إضافية",
    },
    fields: {
      fullName: "الاسم بالكامل *",
      email: "البريد الإلكتروني *",
      phone: "رقم الواتساب / الهاتف *",
      countryOfResidence: "بلد الإقامة *",
      preferredContact: "وسيلة التواصل المفضلة *",
      contactOptions: { whatsapp: "واتساب", email: "إيميل", phone: "مكالمة هاتفية" },
      serviceTypeLabel: "نوع الخدمة المطلوبة * (اختار كل ما ينطبق)",
      serviceTypes: {
        general: "ترجمة عامة",
        certified: "ترجمة معتمدة / محلّفة",
        academic: "ترجمة أكاديمية",
        legal: "ترجمة قانونية",
        business: "ترجمة تجارية / أعمال",
        technical: "ترجمة تقنية",
        medical: "ترجمة طبية",
        website: "ترجمة موقع / محتوى رقمي",
        other: "أخرى",
      },
      sourceLanguage: "اللغة المصدر *",
      targetLanguage: "اللغة الهدف *",
      numberOfDocuments: "عدد المستندات *",
      docCounts: { "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "5+": "أكتر من 5" },
      approxPages: "العدد التقريبي للصفحات",
      pageRanges: { "1": "صفحة واحدة", "2-5": "2–5 صفحات", "6-10": "6–10 صفحات", "11-20": "11–20 صفحة", "20+": "أكتر من 20 صفحة" },
      documentTypeLabel: "نوع المستند المطلوب ترجمته * (اختار كل ما ينطبق)",
      documentTypes: {
        passport: "جواز سفر / بطاقة هوية",
        birth: "شهادة ميلاد",
        marriage: "عقد زواج",
        academicCert: "شهادة دراسية",
        transcript: "بيان درجات / ترانسكريبت",
        diploma: "دبلومة",
        university: "مستندات جامعية",
        school: "مستندات مدرسية",
        employment: "مستندات عمل",
        legal: "مستندات قانونية",
        medical: "مستندات طبية",
        company: "مستندات شركة / تجارية",
        contract: "عقد",
        other: "أخرى",
      },
      documentDescription: "وصف مختصر للمستند(ات)",
      uploadNote:
        "📎 من فضلك ارفق نسخة واضحة (PDF أو JPG أو PNG أو أي صيغة مدعومة) عن طريق واتساب أو إيميل بعد إرسال هذا النموذج، أو الصق رابط رفع (Google Drive / WeTransfer) في الحقل تحت.",
      uploadImportant: "مهم: لازم يكون المستند كامل وواضح للقراءة عشان Edumaster يقدر يدّي عرض سعر دقيق.",
      documentLink: "رابط المستند (اختياري)",
      certifiedRequiredLabel: "هل محتاج ترجمة معتمدة / محلّفة؟ *",
      yesNoUnknown: { yes: "نعم", no: "لا", unknown: "مش متأكد" },
      officialPurposeLabel: "الترجمة هتستخدم لأي غرض رسمي؟",
      officialPurposes: {
        university: "التقديم على جامعة",
        visa: "فيزا / هجرة",
        embassy: "سفارة / قنصلية",
        government: "جهة حكومية",
        legalProcedure: "إجراء قانوني",
        employment: "عمل / توظيف",
        personal: "استخدام شخصي",
        other: "أخرى",
      },
      officialUseOther: "وضّح الغرض الآخر (لو موجود)",
      deadlineLabel: "امتى محتاج الترجمة؟ *",
      deadlineOptions: {
        standard: "خدمة عادية",
        urgent48: "مستعجل — خلال 48 ساعة",
        urgent24: "مستعجل — خلال 24 ساعة",
        specific: "موعد محدد",
      },
      specificDeadlineDate: "التاريخ المحدد",
      specificDeadlineTime: "الوقت المحدد",
      deliveryMethodLabel: "إزاي حابب تستلم الترجمة؟ * (اختار كل ما ينطبق)",
      deliveryMethods: {
        emailDigital: "إيميل — نسخة رقمية",
        whatsappDigital: "واتساب — نسخة رقمية",
        printed: "نسخة مطبوعة",
        both: "نسخة رقمية + مطبوعة",
      },
      deliveryOriginalRequired: "محتاج تسليم المستند الأصلي المطبوع؟",
      deliveryCountryCity: "الدولة / المدينة للتسليم",
      paymentMethodLabel: "طريقة الدفع المفضلة",
      paymentMethods: { bank: "تحويل بنكي", online: "دفع إلكتروني", other: "أخرى" },
      declarations: {
        ownership: "أقر أن المستندات المرفوعة تخصني أو أني مفوّض لطلب ترجمتها.",
        accuracy: "أقر أن المعلومات المقدمة في هذا النموذج صحيحة.",
        quoteDependency: "أتفهم أن السعر النهائي يعتمد على المستند(ات) الفعلية وخدمة الترجمة المطلوبة.",
        authorization: "أفوّض Edumaster باستخدام المستندات المرسلة فقط لغرض تقييم وتجهيز وتسليم خدمة الترجمة المطلوبة. *",
      },
      additionalInfo: "في حاجة تانية تحب تقولها عن طلبك؟",
    },
  },
  en: {
    formTitle: "Translation Request Form",
    formSubtitle:
      "Please complete the following form with accurate information so our team can assess your translation request and provide you with the appropriate service and quotation.",
    submit: "Submit request",
    submitting: "Submitting...",
    required: "* Please fill in the required fields and accept the declarations",
    successTitle: "Your translation request was received!",
    successDesc:
      "Our team will review your documents and contact you with the final quotation, estimated delivery time and payment instructions.",
    error: "Something went wrong submitting your request, please try again.",
    sections: {
      client: "1. Client Information",
      request: "2. Translation Request",
      document: "3. Document Information",
      upload: "4. Document Upload",
      certification: "5. Certification & Legalization",
      deadline: "6. Deadline",
      delivery: "7. Delivery",
      declaration: "Client Declaration",
      additional: "8. Additional Information",
    },
    fields: {
      fullName: "Full Name *",
      email: "Email Address *",
      phone: "WhatsApp / Phone Number *",
      countryOfResidence: "Country of Residence *",
      preferredContact: "Preferred Method of Contact *",
      contactOptions: { whatsapp: "WhatsApp", email: "Email", phone: "Phone Call" },
      serviceTypeLabel: "What type of service do you require? * (select all that apply)",
      serviceTypes: {
        general: "General Translation",
        certified: "Certified / Sworn Translation",
        academic: "Academic Translation",
        legal: "Legal Translation",
        business: "Business / Commercial Translation",
        technical: "Technical Translation",
        medical: "Medical Translation",
        website: "Website / Digital Content Translation",
        other: "Other",
      },
      sourceLanguage: "Source Language *",
      targetLanguage: "Target Language *",
      numberOfDocuments: "Number of Documents *",
      docCounts: { "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "5+": "More than 5" },
      approxPages: "Approximate Number of Pages",
      pageRanges: { "1": "1 page", "2-5": "2–5 pages", "6-10": "6–10 pages", "11-20": "11–20 pages", "20+": "More than 20 pages" },
      documentTypeLabel: "What type of document do you need translated? * (select all that apply)",
      documentTypes: {
        passport: "Passport / ID",
        birth: "Birth Certificate",
        marriage: "Marriage Certificate",
        academicCert: "Academic Certificate",
        transcript: "Academic Transcript",
        diploma: "Diploma",
        university: "University Documents",
        school: "School Documents",
        employment: "Employment Documents",
        legal: "Legal Documents",
        medical: "Medical Documents",
        company: "Company / Commercial Documents",
        contract: "Contract",
        other: "Other",
      },
      documentDescription: "Please briefly describe the document(s)",
      uploadNote:
        "📎 Please send a clear PDF, JPG, PNG or other supported file via WhatsApp or email after submitting this form, or paste an upload link (Google Drive / WeTransfer) below.",
      uploadImportant: "Important: The document must be complete and clearly readable so Edumaster can provide an accurate quotation.",
      documentLink: "Document link (optional)",
      certifiedRequiredLabel: "Do you require a certified/sworn translation? *",
      yesNoUnknown: { yes: "Yes", no: "No", unknown: "I don't know" },
      officialPurposeLabel: "Will the translation be used for official purposes?",
      officialPurposes: {
        university: "University admission",
        visa: "Visa / Immigration",
        embassy: "Embassy / Consulate",
        government: "Government authority",
        legalProcedure: "Legal procedure",
        employment: "Employment",
        personal: "Personal use",
        other: "Other",
      },
      officialUseOther: "Please specify the other purpose (if any)",
      deadlineLabel: "When do you need the translation? *",
      deadlineOptions: {
        standard: "Standard service",
        urgent48: "Urgent – within 48 hours",
        urgent24: "Urgent – within 24 hours",
        specific: "Specific deadline",
      },
      specificDeadlineDate: "Date",
      specificDeadlineTime: "Time",
      deliveryMethodLabel: "How would you like to receive the completed translation? * (select all that apply)",
      deliveryMethods: {
        emailDigital: "Email – Digital Copy",
        whatsappDigital: "WhatsApp – Digital Copy",
        printed: "Printed Copy",
        both: "Digital + Printed Copy",
      },
      deliveryOriginalRequired: "Do you require the original printed document to be delivered?",
      deliveryCountryCity: "Delivery Country / City",
      paymentMethodLabel: "Payment method preference",
      paymentMethods: { bank: "Bank Transfer", online: "Online Payment", other: "Other" },
      declarations: {
        ownership: "I confirm that the documents uploaded belong to me or that I am authorized to request their translation.",
        accuracy: "I confirm that the information provided in this form is accurate.",
        quoteDependency: "I understand that the final quotation depends on the actual document(s) submitted and the requested translation service.",
        authorization: "I authorize Edumaster to use the submitted documents solely for the purpose of assessing, preparing and delivering the requested translation service. *",
      },
      additionalInfo: "Is there anything else we should know about your request?",
    },
  },
};
STRINGS.es = STRINGS.en; // fallback مؤقت للإسباني على نفس نصوص الإنجليزي

const initialFormState = {
  fullName: "", email: "", phone: "", countryOfResidence: "", preferredContact: "",
  serviceTypes: [], sourceLanguage: "", targetLanguage: "", numberOfDocuments: "", approxPages: "",
  documentTypes: [], documentDescription: "", documentLink: "",
  certifiedRequired: "", officialPurposes: [], officialUseOther: "",
  deadlineOption: "", specificDeadlineDate: "", specificDeadlineTime: "",
  deliveryMethods: [], deliveryOriginalRequired: "", deliveryCountryCity: "", paymentMethod: "",
  ownershipConsent: false, dataAccuracyConsent: false, quoteDependencyAck: false, privacyConsent: false,
  additionalInfo: "",
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

function CheckboxGroup({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([key, label]) => (
        <button
          type="button"
          key={key}
          onClick={() => onToggle(key)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            selected.includes(key)
              ? "bg-[#003A91] text-white border-[#003A91]"
              : "bg-white text-gray-500 border-gray-200 hover:border-[#003A91]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A91]/20 focus:border-[#003A91]";

export default function TranslationForm({ onSuccess }) {
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

  function toggleInList(key, value) {
    setForm((prev) => {
      const list = prev[key];
      const has = list.includes(value);
      return { ...prev, [key]: has ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError(t.required);
      return;
    }
    if (!form.dataAccuracyConsent || !form.privacyConsent) {
      setError(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/data?collection=translationRequests", {
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

      <Section title={t.sections.client} defaultOpen>
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

      <Section title={t.sections.request} defaultOpen>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{f.serviceTypeLabel}</span>
          <CheckboxGroup options={f.serviceTypes} selected={form.serviceTypes} onToggle={(k) => toggleInList("serviceTypes", k)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.sourceLanguage}><input required className={inputCls} value={form.sourceLanguage} onChange={(e) => set("sourceLanguage", e.target.value)} /></Field>
          <Field label={f.targetLanguage}><input required className={inputCls} value={form.targetLanguage} onChange={(e) => set("targetLanguage", e.target.value)} /></Field>
          <Field label={f.numberOfDocuments}>
            <select className={inputCls} value={form.numberOfDocuments} onChange={(e) => set("numberOfDocuments", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.docCounts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={f.approxPages}>
            <select className={inputCls} value={form.approxPages} onChange={(e) => set("approxPages", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.pageRanges).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.document}>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{f.documentTypeLabel}</span>
          <CheckboxGroup options={f.documentTypes} selected={form.documentTypes} onToggle={(k) => toggleInList("documentTypes", k)} />
        </div>
        <Field label={f.documentDescription}>
          <textarea rows={3} className={inputCls} value={form.documentDescription} onChange={(e) => set("documentDescription", e.target.value)} />
        </Field>
      </Section>

      <Section title={t.sections.upload}>
        <p className="text-xs text-gray-500 leading-relaxed">{f.uploadNote}</p>
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">{f.uploadImportant}</p>
        <Field label={f.documentLink}>
          <input className={inputCls} placeholder="https://" value={form.documentLink} onChange={(e) => set("documentLink", e.target.value)} />
        </Field>
      </Section>

      <Section title={t.sections.certification}>
        <Field label={f.certifiedRequiredLabel}>
          <select className={inputCls} value={form.certifiedRequired} onChange={(e) => set("certifiedRequired", e.target.value)}>
            <option value="">—</option>
            {Object.entries(f.yesNoUnknown).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{f.officialPurposeLabel}</span>
          <CheckboxGroup options={f.officialPurposes} selected={form.officialPurposes} onToggle={(k) => toggleInList("officialPurposes", k)} />
        </div>
        {form.officialPurposes.includes("other") && (
          <Field label={f.officialUseOther}>
            <input className={inputCls} value={form.officialUseOther} onChange={(e) => set("officialUseOther", e.target.value)} />
          </Field>
        )}
      </Section>

      <Section title={t.sections.deadline}>
        <Field label={f.deadlineLabel}>
          <select className={inputCls} value={form.deadlineOption} onChange={(e) => set("deadlineOption", e.target.value)}>
            <option value="">—</option>
            {Object.entries(f.deadlineOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {form.deadlineOption === "specific" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={f.specificDeadlineDate}><input type="date" className={inputCls} value={form.specificDeadlineDate} onChange={(e) => set("specificDeadlineDate", e.target.value)} /></Field>
            <Field label={f.specificDeadlineTime}><input type="time" className={inputCls} value={form.specificDeadlineTime} onChange={(e) => set("specificDeadlineTime", e.target.value)} /></Field>
          </div>
        )}
      </Section>

      <Section title={t.sections.delivery}>
        <div>
          <span className="text-xs font-bold text-gray-500 mb-2 block">{f.deliveryMethodLabel}</span>
          <CheckboxGroup options={f.deliveryMethods} selected={form.deliveryMethods} onToggle={(k) => toggleInList("deliveryMethods", k)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.deliveryOriginalRequired}>
            <select className={inputCls} value={form.deliveryOriginalRequired} onChange={(e) => set("deliveryOriginalRequired", e.target.value)}>
              <option value="">—</option>
              <option value="yes">{f.yesNoUnknown.yes}</option>
              <option value="no">{f.yesNoUnknown.no}</option>
            </select>
          </Field>
          <Field label={f.deliveryCountryCity}><input className={inputCls} value={form.deliveryCountryCity} onChange={(e) => set("deliveryCountryCity", e.target.value)} /></Field>
          <Field label={f.paymentMethodLabel}>
            <select className={inputCls} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
              <option value="">—</option>
              {Object.entries(f.paymentMethods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t.sections.declaration} defaultOpen>
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" className="mt-0.5" checked={form.ownershipConsent} onChange={(e) => set("ownershipConsent", e.target.checked)} />
            {f.declarations.ownership}
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" required className="mt-0.5" checked={form.dataAccuracyConsent} onChange={(e) => set("dataAccuracyConsent", e.target.checked)} />
            {f.declarations.accuracy}
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" className="mt-0.5" checked={form.quoteDependencyAck} onChange={(e) => set("quoteDependencyAck", e.target.checked)} />
            {f.declarations.quoteDependency}
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" required className="mt-0.5" checked={form.privacyConsent} onChange={(e) => set("privacyConsent", e.target.checked)} />
            {f.declarations.authorization}
          </label>
        </div>
      </Section>

      <Section title={t.sections.additional}>
        <Field label={f.additionalInfo}>
          <textarea rows={3} className={inputCls} value={form.additionalInfo} onChange={(e) => set("additionalInfo", e.target.value)} />
        </Field>
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