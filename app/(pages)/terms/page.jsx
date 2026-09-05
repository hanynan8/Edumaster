// path: app/(pages)/terms/page.jsx
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
   STATIC CONTENT — عدّل النصوص دي زي ما يناسبك
═══════════════════════════════════════ */
const CONTENT = {
  ar: {
    pageTitle: "الشروط والأحكام",
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
        id: "acceptance",
        title: "١. قبول الشروط",
        text: "باستخدامك لمنصة Edumaster فإنك توافق على الالتزام بهذه الشروط والأحكام بالكامل. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام المنصة.",
      },
      {
        id: "accounts",
        title: "٢. حسابات المستخدمين",
        items: [
          "يجب تقديم بيانات صحيحة وحديثة عند إنشاء الحساب.",
          "أنت مسؤول عن الحفاظ على سرية بيانات الدخول الخاصة بك.",
          "لا يجوز مشاركة حسابك مع أشخاص آخرين.",
          "نحتفظ بالحق في تعليق أو إغلاق أي حساب يخالف هذه الشروط.",
        ],
      },
      {
        id: "usage",
        title: "٣. استخدام المنصة",
        text: "يُسمح باستخدام المنصة لأغراض التعلّم الشخصي أو التدريس فقط، ويُمنع استخدامها في أي نشاط غير قانوني أو ضار بالمنصة أو بمستخدميها الآخرين.",
      },
      {
        id: "ip",
        title: "٤. الملكية الفكرية",
        text: "جميع المحتويات التعليمية والتصاميم والشعارات المتاحة على المنصة مملوكة لـ Edumaster أو لمقدّمي المحتوى، ولا يجوز نسخها أو إعادة توزيعها دون إذن كتابي مسبق.",
      },
      {
        id: "payments",
        title: "٥. المدفوعات والاسترداد",
        text: "تخضع عمليات الدفع مقابل الكورسات أو الاشتراكات لسياسة الاسترداد المعلنة وقت الشراء، وقد تختلف حسب نوع الخدمة.",
      },
      {
        id: "termination",
        title: "٦. إنهاء الخدمة",
        text: "يحق لإدارة المنصة تعليق أو إنهاء وصول أي مستخدم يخالف هذه الشروط، دون إشعار مسبق في حالات الإساءة الجسيمة.",
      },
      {
        id: "liability",
        title: "٧. حدود المسؤولية",
        text: "تُقدَّم المنصة كما هي دون أي ضمانات، ولا تتحمل Edumaster مسؤولية أي أضرار غير مباشرة ناتجة عن استخدام المنصة.",
      },
      {
        id: "changes",
        title: "٨. تعديل الشروط",
        text: "قد نقوم بتحديث هذه الشروط من وقت لآخر، وسيتم إعلامك بأي تغييرات جوهرية عبر المنصة أو البريد الإلكتروني.",
      },
      {
        id: "contact",
        title: "٩. التواصل معنا",
        text: "لأي استفسار بخصوص هذه الشروط، يمكنك التواصل معنا عبر البريد الإلكتروني الموضح أعلاه.",
        contact: "info@edumaster365.com",
      },
    ],
  },

  en: {
    pageTitle: "Terms & Condition",
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
        id: "acceptance",
        title: "1. Acceptance of Terms",
        text: "By using the Edumaster platform, you agree to be fully bound by these Terms & Condition. If you do not agree with any part of them, please do not use the platform.",
      },
      {
        id: "accounts",
        title: "2. User Accounts",
        items: [
          "You must provide accurate and up-to-date information when creating an account.",
          "You are responsible for keeping your login credentials confidential.",
          "Accounts may not be shared with other people.",
          "We reserve the right to suspend or close any account that violates these terms.",
        ],
      },
      {
        id: "usage",
        title: "3. Use of the Platform",
        text: "The platform may only be used for personal learning or teaching purposes. Any unlawful use, or use that harms the platform or other users, is strictly prohibited.",
      },
      {
        id: "ip",
        title: "4. Intellectual Property",
        text: "All educational content, designs, and logos available on the platform are owned by Edumaster or its content providers, and may not be copied or redistributed without prior written consent.",
      },
      {
        id: "payments",
        title: "5. Payments & Refunds",
        text: "Payments for courses or subscriptions are subject to the refund policy stated at the time of purchase, which may vary depending on the type of service.",
      },
      {
        id: "termination",
        title: "6. Termination",
        text: "We reserve the right to suspend or terminate access for any user who violates these terms, without prior notice in cases of serious misuse.",
      },
      {
        id: "liability",
        title: "7. Limitation of Liability",
        text: "The platform is provided \"as is\" without warranties of any kind. Edumaster is not liable for any indirect damages resulting from the use of the platform.",
      },
      {
        id: "changes",
        title: "8. Changes to These Terms",
        text: "We may update these terms from time to time. You will be notified of any material changes via the platform or by email.",
      },
      {
        id: "contact",
        title: "9. Contact Us",
        text: "For any questions regarding these terms, you can reach us at the email address below.",
        contact: "info@edumaster365.com",
      },
    ],
  },

  es: {
    pageTitle: "Términos y Condiciones",
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
        id: "acceptance",
        title: "1. Aceptación de los Términos",
        text: "Al usar la plataforma Edumaster, aceptas cumplir plenamente estos Términos y Condiciones. Si no estás de acuerdo con alguna parte, no utilices la plataforma.",
      },
      {
        id: "accounts",
        title: "2. Cuentas de Usuario",
        items: [
          "Debes proporcionar información precisa y actualizada al crear tu cuenta.",
          "Eres responsable de mantener la confidencialidad de tus credenciales.",
          "Las cuentas no pueden compartirse con otras personas.",
          "Nos reservamos el derecho de suspender o cerrar cualquier cuenta que infrinja estos términos.",
        ],
      },
      {
        id: "usage",
        title: "3. Uso de la Plataforma",
        text: "La plataforma solo puede usarse con fines de aprendizaje o enseñanza personal. Está estrictamente prohibido cualquier uso ilegal o que perjudique a la plataforma o a otros usuarios.",
      },
      {
        id: "ip",
        title: "4. Propiedad Intelectual",
        text: "Todo el contenido educativo, diseños y logotipos disponibles en la plataforma son propiedad de Edumaster o de sus proveedores de contenido, y no pueden copiarse ni redistribuirse sin consentimiento previo por escrito.",
      },
      {
        id: "payments",
        title: "5. Pagos y Reembolsos",
        text: "Los pagos de cursos o suscripciones están sujetos a la política de reembolso indicada en el momento de la compra, la cual puede variar según el tipo de servicio.",
      },
      {
        id: "termination",
        title: "6. Terminación",
        text: "Nos reservamos el derecho de suspender o cancelar el acceso de cualquier usuario que infrinja estos términos, sin previo aviso en casos de mal uso grave.",
      },
      {
        id: "liability",
        title: "7. Limitación de Responsabilidad",
        text: "La plataforma se ofrece \"tal cual\", sin garantías de ningún tipo. Edumaster no se hace responsable de daños indirectos derivados del uso de la plataforma.",
      },
      {
        id: "changes",
        title: "8. Cambios en estos Términos",
        text: "Podemos actualizar estos términos periódicamente. Se te notificará cualquier cambio importante a través de la plataforma o por correo electrónico.",
      },
      {
        id: "contact",
        title: "9. Contáctanos",
        text: "Para cualquier consulta sobre estos términos, puedes escribirnos al correo electrónico indicado a continuación.",
        contact: "info@edumaster365.com",
      },
    ],
  },
};

/* ═══════════════════════════════════════
   ROOT PAGE
═══════════════════════════════════════ */
export default function TermsPage() {
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