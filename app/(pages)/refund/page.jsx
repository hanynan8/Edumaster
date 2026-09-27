// path: app/(pages)/refund/page.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ═══════════════════════════════════════
   STATIC CONTENT — مأخوذ من مستند "Edumaster Refund & Cancellation Policy"
═══════════════════════════════════════ */
const CONTENT = {
  ar: {
    pageTitle: "سياسة الاسترداد والإلغاء",
    lastUpdated: "آخر تحديث: سبتمبر 2026",
    companyInfo: {
      title: "بيانات المنصة",
      fields: [
        { label: "اسم المنصة", value: "Edumaster" },
        { label: "نوع الخدمة", value: "منصة تعليمية إلكترونية" },
        { label: "البريد الإلكتروني", value: "info@edumaster365.com" },
      ],
    },
    sections: [
      {
        id: "general-policy",
        title: "١. السياسة العامة",
        text: "جميع رسوم الخدمة غير قابلة للاسترداد بمجرد بدء تقديم الخدمة.",
      },
      {
        id: "refunds-considered",
        title: "٢. الحالات التي قد يُنظر فيها بالاسترداد",
        intro: "فقط في الحالات التالية:",
        items: [
          "حدوث دفع مكرر",
          "وجود خطأ تقني منع الوصول إلى الخدمة",
          "حدوث خطأ في الفوترة",
        ],
      },
      {
        id: "non-refundable",
        title: "٣. الحالات غير القابلة للاسترداد",
        intro: "لن يتم إصدار أي استرداد في الحالات التالية:",
        items: [
          "إلغاء المستخدم للخدمة بعد بدء تنفيذها",
          "عدم تقديم المستندات المطلوبة",
          "تغيير المستخدم للبلد أو الجامعة أو البرنامج",
          "عدم نجاح نتيجة التقديم",
          "رفض أو تأخير التأشيرة",
        ],
      },
      {
        id: "visa-disclaimer",
        title: "٤. إخلاء مسؤولية بخصوص التأشيرة",
        intro: "تقدّم Edumaster دعمًا لإعداد ملف التأشيرة فقط. نحن لا:",
        items: [
          "نضمن إصدار التأشيرة",
          "نؤمّن مواعيد السفارة",
          "نؤثّر على قرارات السفارة",
        ],
      },
      {
        id: "subscription-cancellation",
        title: "٥. إلغاء الاشتراك",
        text: "يمكن إلغاء الاشتراكات في أي وقت لوقف الفوترة المستقبلية. تظل المدفوعات السابقة غير قابلة للاسترداد.",
      },
    ],
  },

  en: {
    pageTitle: "Refund & Cancellation Policy",
    lastUpdated: "Last updated: September 2026",
    companyInfo: {
      title: "Platform Information",
      fields: [
        { label: "Platform Name", value: "Edumaster" },
        { label: "Service Type", value: "Online Education Platform" },
        { label: "Email", value: "info@edumaster365.com" },
      ],
    },
    sections: [
      {
        id: "general-policy",
        title: "1. General Policy",
        text: "All service fees are non-refundable once service delivery has commenced.",
      },
      {
        id: "refunds-considered",
        title: "2. Refunds May Be Considered",
        intro: "Only if:",
        items: [
          "A duplicate payment was made",
          "A technical error prevented service access",
          "A billing error occurred",
        ],
      },
      {
        id: "non-refundable",
        title: "3. Non-Refundable Cases",
        intro: "No refunds will be issued if:",
        items: [
          "The user cancels after service initiation",
          "Required documents are not provided",
          "The user changes country, university, or program",
          "The application outcome is unsuccessful",
          "Visa is rejected or delayed",
        ],
      },
      {
        id: "visa-disclaimer",
        title: "4. Visa Disclaimer",
        intro: "Edumaster provides visa preparation support only. We do not:",
        items: [
          "Guarantee visa issuance",
          "Secure embassy appointments",
          "Influence embassy decisions",
        ],
      },
      {
        id: "subscription-cancellation",
        title: "5. Subscription Cancellation",
        text: "Subscriptions may be canceled at any time to stop future billing. Past payments remain non-refundable.",
      },
    ],
  },

  es: {
    pageTitle: "Política de Reembolso y Cancelación",
    lastUpdated: "Última actualización: septiembre de 2026",
    companyInfo: {
      title: "Información de la Plataforma",
      fields: [
        { label: "Nombre de la plataforma", value: "Edumaster" },
        { label: "Tipo de servicio", value: "Plataforma educativa en línea" },
        { label: "Correo electrónico", value: "info@edumaster365.com" },
      ],
    },
    sections: [
      {
        id: "general-policy",
        title: "1. Política General",
        text: "Todas las tarifas de servicio no son reembolsables una vez que la prestación del servicio ha comenzado.",
      },
      {
        id: "refunds-considered",
        title: "2. Casos en los que se Puede Considerar un Reembolso",
        intro: "Solo si:",
        items: [
          "Se realizó un pago duplicado",
          "Un error técnico impidió el acceso al servicio",
          "Se produjo un error de facturación",
        ],
      },
      {
        id: "non-refundable",
        title: "3. Casos No Reembolsables",
        intro: "No se emitirá ningún reembolso si:",
        items: [
          "El usuario cancela después de iniciado el servicio",
          "No se proporcionan los documentos requeridos",
          "El usuario cambia de país, universidad o programa",
          "El resultado de la solicitud no es exitoso",
          "El visado es rechazado o se retrasa",
        ],
      },
      {
        id: "visa-disclaimer",
        title: "4. Aviso sobre el Visado",
        intro: "Edumaster ofrece únicamente apoyo en la preparación del visado. No:",
        items: [
          "Garantizamos la emisión del visado",
          "Aseguramos citas en la embajada",
          "Influimos en las decisiones de la embajada",
        ],
      },
      {
        id: "subscription-cancellation",
        title: "5. Cancelación de Suscripción",
        text: "Las suscripciones pueden cancelarse en cualquier momento para detener la facturación futura. Los pagos anteriores permanecen no reembolsables.",
      },
    ],
  },
};

/* ═══════════════════════════════════════
   ROOT PAGE
═══════════════════════════════════════ */
export default function RefundPage() {
  const { language: lang } = useLanguage();
  const t = CONTENT[lang] ?? CONTENT.en;
  const isRTL = lang === "ar";

  return (
    <>
      <style>{STYLES}</style>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden"
      >
        <PageHeader t={t} />
        <CompanyInfo t={t} />
        <Sections t={t} />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   PAGE HEADER
═══════════════════════════════════════ */
function PageHeader({ t }) {
  return (
    <section className="relative overflow-hidden bg-[#1E3561]">
      <div className="w-full px-5 sm:px-10 md:px-16 py-12 sm:py-20 md:py-28">
        <h1 className="font-semibold tracking-tight mb-3 sm:mb-4 leading-[1.1] text-white animate-fadein-up text-2xl sm:text-4xl md:text-5xl">
          {t.pageTitle}
        </h1>
        <p className="text-gray-300 text-sm sm:text-base animate-fadein-up2">
          {t.lastUpdated}
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   COMPANY INFO
═══════════════════════════════════════ */
function CompanyInfo({ t }) {
  const [ref, visible] = useReveal();

  return (
    <section ref={ref} className="py-10 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 md:px-16">
        <h2
          className={`text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight mb-5 sm:mb-8 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {t.companyInfo.title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
          {t.companyInfo.fields.map((field, i) => (
            <div
              key={i}
              className={`bg-white p-4 sm:p-6 flex flex-col gap-1 transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <span className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                {field.label}
              </span>
              <span className="text-[#0a0a0a] font-semibold text-sm sm:text-base break-words">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   SECTIONS
═══════════════════════════════════════ */
function Sections({ t }) {
  return (
    <section className="py-10 sm:py-16 md:py-20 bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 md:px-16 flex flex-col gap-10 sm:gap-16">
        {t.sections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>
    </section>
  );
}

function SectionBlock({ section }) {
  const [ref, visible] = useReveal();

  return (
    <div
      ref={ref}
      className={`bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 md:p-10 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight leading-tight mb-3 sm:mb-5">
        {section.title}
      </h3>

      {section.intro && (
        <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed mb-4">
          {section.intro}
        </p>
      )}

      {section.text && (
        <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed mb-2">
          {section.text}
        </p>
      )}

      {section.contact && (
        <p className="font-bold text-[#C9A227] text-sm sm:text-[15px]">
          {section.contact}
        </p>
      )}

      {section.items && (
        <ul className="flex flex-col divide-y divide-gray-100 mt-2">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 py-3 sm:py-3.5">
              <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mt-0.5">
                <Check size={18} color="#C9A227" />
              </span>
              <span className="text-gray-700 font-medium text-sm sm:text-[15px] leading-snug">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   INLINE SVG ICON
═══════════════════════════════════════ */
function Check({ size = 16, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* ═══════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@300;400;700;800&display=swap');

  @keyframes fadein-up {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }

  * { box-sizing: border-box; }
  img { max-width: 100%; }
`;