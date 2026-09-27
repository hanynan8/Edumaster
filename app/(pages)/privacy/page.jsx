// path: app/(pages)/privacy/page.jsx
"use client";

import { useRef, useState, useEffect } from "react";
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
   STATIC CONTENT — مأخوذ من مستند "Edumaster Privacy Policy"
═══════════════════════════════════════ */
const CONTENT = {
  ar: {
    pageTitle: "سياسة الخصوصية",
    lastUpdated: "آخر تحديث: سبتمبر 2026",
    companyInfo: {
      title: "بيانات المنصة",
      fields: [
        { label: "اسم المنصة", value: "Edumaster" },
        { label: "الكيان القانوني", value: "Edumaster Consulting for International Education Services LLC" },
        { label: "نوع الخدمة", value: "خدمات وتكنولوجيا تعليمية" },
        { label: "البريد الإلكتروني", value: "info@edumaster365.com" },
      ],
    },
    sections: [
      {
        id: "introduction",
        title: "١. مقدمة",
        text: "تلتزم Edumaster Consulting for International Education Services LLC (\"Edumaster\"، \"نحن\"، \"لنا\") بحماية خصوصيتك وبياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمعنا واستخدامنا وتخزيننا وحمايتنا لمعلوماتك عند تفاعلك مع منصتنا. تعمل Edumaster كشركة خدمات وتكنولوجيا تعليمية، تُقدّم وتُحوّل رقميًا الرحلة الكاملة بدءًا من التقييم المهني والاستشارات وصولًا إلى القبول الجامعي وإرشادات التأشيرة والتسجيل، وتربط الطلاب والجامعات والوكالات في منظومة واحدة متكاملة.",
      },
      {
        id: "scope",
        title: "٢. نطاق التطبيق",
        intro: "تنطبق سياسة الخصوصية هذه على:",
        items: [
          "زوار الموقع الإلكتروني",
          "مستخدمي التطبيق الجوال",
          "الطلاب وأولياء الأمور",
          "الشركاء التعليميين",
          "مستخدمي الخدمات المدفوعة وغير المدفوعة",
        ],
      },
      {
        id: "info-we-collect",
        title: "٣. المعلومات التي نجمعها",
        intro: "قد نقوم بجمع الفئات التالية من البيانات:",
        subsections: [
          {
            title: "البيانات الشخصية",
            items: [
              "الاسم الكامل",
              "البريد الإلكتروني",
              "رقم الهاتف",
              "الجنسية وبلد الإقامة",
              "تاريخ الميلاد (عند الحاجة)",
              "الخلفية الأكاديمية والاهتمامات",
            ],
          },
          {
            title: "البيانات التعليمية وبيانات الخدمة",
            items: [
              "تفضيلات البرنامج الدراسي",
              "اختيارات الجامعات",
              "المستندات المتعلقة بالتقديم (المُقدَّمة طواعية)",
              "إجابات التقييم المهني",
              "ملاحظات الاستشارة ومتابعة التقدّم",
            ],
          },
          {
            title: "البيانات التقنية وبيانات الاستخدام",
            items: [
              "عنوان IP",
              "نوع الجهاز والمتصفح ونظام التشغيل",
              "سجلات استخدام التطبيق والتفاعل",
              "ملفات تعريف الارتباط (Cookies) وبيانات التحليلات",
            ],
          },
          {
            title: "بيانات الدفع",
            items: [
              "مراجع المعاملات المالية",
              "حالة الدفع",
            ],
            text: "ملاحظة: لا تقوم Edumaster بتخزين بيانات البطاقة الكاملة؛ تتم معالجة المدفوعات عبر بوابات دفع آمنة تابعة لجهات خارجية.",
          },
        ],
      },
      {
        id: "how-we-use",
        title: "٤. كيف نستخدم معلوماتك",
        intro: "نستخدم بياناتك من أجل:",
        items: [
          "تقديم خدمات الاستشارة والقبول الجامعي",
          "توفير تقييمات وتوصيات مدعومة بالذكاء الاصطناعي",
          "التواصل معك بخصوص الخدمات والتحديثات",
          "معالجة المدفوعات والفواتير",
          "تشغيل نظام إدارة الاستشارات (SaaS)",
          "تحسين أداء المنصة وتجربة المستخدم",
          "الوفاء بالالتزامات القانونية والتنظيمية",
        ],
      },
      {
        id: "legal-basis",
        title: "٥. الأساس القانوني للمعالجة",
        intro: "نقوم بمعالجة البيانات الشخصية استنادًا إلى:",
        items: [
          "موافقة المستخدم",
          "الضرورة التعاقدية",
          "المصالح التجارية المشروعة",
          "الالتزامات القانونية",
        ],
      },
      {
        id: "data-sharing",
        title: "٦. مشاركة البيانات",
        intro: "قد تتم مشاركة بياناتك مع:",
        items: [
          "الجامعات الشريكة (بموافقتك فقط)",
          "مقدّمي الخدمة المعتمدين (تكنولوجيا المعلومات، الدفع، التحليلات)",
          "الجهات القانونية أو التنظيمية عند الاقتضاء",
        ],
        contact: "لا نقوم ببيع البيانات الشخصية لأي طرف ثالث.",
      },
      {
        id: "data-storage",
        title: "٧. تخزين البيانات وأمانها",
        items: [
          "يتم تخزين البيانات على خوادم آمنة ومشفّرة",
          "الوصول مقصور على الموظفين المصرّح لهم فقط",
          "يتم تطبيق إجراءات حماية تقنية وتنظيمية وفق المعايير المعتمدة في هذا المجال",
        ],
      },
      {
        id: "data-retention",
        title: "٨. الاحتفاظ بالبيانات",
        text: "يتم الاحتفاظ بالبيانات الشخصية فقط للمدة اللازمة لتقديم الخدمة أو الامتثال القانوني. يمكن للمستخدمين طلب حذف بياناتهم في أي وقت، وفقًا للمتطلبات القانونية.",
      },
      {
        id: "user-rights",
        title: "٩. حقوق المستخدم",
        intro: "يحق لك:",
        items: [
          "الوصول إلى بياناتك",
          "طلب تصحيحها",
          "طلب حذفها",
          "سحب موافقتك",
          "الاعتراض على بعض أنشطة المعالجة",
        ],
        contact: "يمكن تقديم الطلبات عبر: info@edumaster365.com",
      },
      {
        id: "childrens-data",
        title: "١٠. بيانات القُصَّر",
        text: "بالنسبة للمستخدمين دون سن ١٨ عامًا، يُشترط موافقة أحد الوالدين أو ولي الأمر. يمكن لأولياء الأمور طلب الوصول إلى بيانات أطفالهم أو حذفها.",
      },
      {
        id: "cookies",
        title: "١١. سياسة ملفات تعريف الارتباط (Cookies)",
        subsections: [
          {
            title: "ما هي ملفات تعريف الارتباط",
            text: "هي ملفات بيانات صغيرة تُستخدم لتحسين تجربة المستخدم، وتحليل حركة الزيارات، وتطوير أداء المنصة.",
          },
          {
            title: "أنواع ملفات تعريف الارتباط",
            items: [
              "الملفات الأساسية: ضرورية لعمل المنصة",
              "ملفات التحليلات: لفهم سلوك المستخدم",
              "ملفات الأداء: لتحسين السرعة وتجربة الاستخدام",
            ],
          },
          {
            title: "إدارة ملفات تعريف الارتباط",
            text: "يمكن للمستخدمين إدارة أو تعطيل ملفات تعريف الارتباط عبر إعدادات المتصفح أو الجهاز. قد يؤثر تعطيلها على بعض الميزات.",
          },
        ],
      },
      {
        id: "payments",
        title: "١٢. المدفوعات والمعاملات",
        subsections: [
          {
            title: "معالجة الدفع",
            text: "تتم معالجة جميع المدفوعات الإلكترونية عبر المنصة بشكل آمن من خلال مزوّدي خدمات دفع مرخّصين تابعين لجهات خارجية. لا تقوم Edumaster بتخزين أو معالجة أو الاحتفاظ ببيانات البطاقة الكاملة؛ تتم معالجة بيانات الدفع مباشرة من قبل مزودي بوابة الدفع وفقًا لمعايير أمان PCI-DSS. بإتمام عملية الدفع، يقرّ المستخدم بأنه حامل البطاقة المصرّح له أو لديه التفويض الكامل لاستخدام وسيلة الدفع المختارة. الخدمات المقدّمة من Edumaster هي خدمات استشارية ورقمية بطبيعتها، ولا تضمن نتائج مثل القبول الجامعي أو المنح الدراسية أو الموافقة على التأشيرة، وهذه النتائج تقع خارج نطاق التزامات الدفع.",
          },
          {
            title: "العملة والإفصاح الضريبي",
            items: [
              "الجنيه المصري (داخل مصر)",
              "الدولار الأمريكي / اليورو / عملات أخرى مدعومة (عالميًا)",
            ],
            text: "أي ضرائب مطبّقة أو رسوم بوابة الدفع أو رسوم تحويل العملة التي تفرضها البنوك أو مزوّدو خدمات الدفع تقع على مسؤولية المستخدم، ما لم يُذكر خلاف ذلك صراحةً.",
          },
          {
            title: "حماية المستهلك والامتثال لسياسة الاسترداد",
            items: [
              "يحق للمستخدمين الحصول على إفصاح واضح عن نطاق الخدمة قبل الدفع",
              "الخدمات الرقمية والاستشارية التي تبدأ فور الدفع لا تخضع لحق الاسترداد التلقائي بمجرد بدء تقديم الخدمة",
              "يتم تقييم طلبات الاسترداد على أساس كل حالة على حدة، وبشكل صارم وفق الشروط المنصوص عليها في سياسة الاسترداد",
            ],
            text: "وذلك امتثالًا لقانون حماية المستهلك المصري.",
          },
          {
            title: "النزاعات والاعتراضات على المدفوعات ومنع الاحتيال",
            items: [
              "تحتفظ Edumaster بالحق في تعليق الخدمات أثناء التحقيق في حال قيام المستخدم بتقديم اعتراض على الدفع (Chargeback)",
              "قد تتم مشاركة المستندات الداعمة (الاتفاقيات الموقّعة، سجلات الموافقة، سجلات الخدمة) مع بوابة الدفع أو البنك المُصدر",
              "قد تؤدي الاعتراضات الاحتيالية على المدفوعات إلى تعليق الحساب بشكل دائم",
            ],
          },
          {
            title: "مشاركة البيانات مع مزوّدي خدمات الدفع",
            items: [
              "المصادقة على عملية الدفع",
              "منع الاحتيال",
              "الامتثال التنظيمي",
            ],
            text: "قد تتم مشاركة بيانات شخصية محدودة (الاسم، البريد الإلكتروني، مرجع المعاملة) مع بوابة الدفع فقط لهذه الأغراض، وتتم معالجتها وفق سياسات الخصوصية الخاصة بهم.",
          },
          {
            title: "إخلاء مسؤولية الخدمات عبر الحدود",
            text: "تُقدَّم بعض الخدمات من خارج مصر. وبإتمام عملية الدفع، يقرّ المستخدم ويوافق على تلقّي خدمات رقمية واستشارية عابرة للحدود، وهو أمر مسموح به قانونًا بموجب القانون المصري.",
          },
        ],
      },
      {
        id: "policy-updates",
        title: "١٣. تحديثات السياسة",
        text: "تحتفظ Edumaster بالحق في تحديث هذه السياسات في أي وقت. سيتم نشر التحديثات على المنصة، ويُعد استمرار استخدامك للمنصة موافقةً على تلك التحديثات.",
      },
      {
        id: "contact",
        title: "١٤. تواصل معنا",
        text: "لأي أسئلة أو استفسارات أو طلبات تتعلق بهذه السياسة:",
        contact: "info@edumaster365.com",
      },
    ],
  },

  en: {
    pageTitle: "Privacy Policy",
    lastUpdated: "Last updated: September 2026",
    companyInfo: {
      title: "Platform Information",
      fields: [
        { label: "Platform Name", value: "Edumaster" },
        { label: "Legal Entity", value: "Edumaster Consulting for International Education Services LLC" },
        { label: "Service Type", value: "Education Services & Technology" },
        { label: "Email", value: "info@edumaster365.com" },
      ],
    },
    sections: [
      {
        id: "introduction",
        title: "1. Introduction",
        text: "Edumaster Consulting for International Education Services LLC (\"Edumaster\", \"we\", \"our\", or \"us\") is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you interact with our Platform. Edumaster operates as an education services and technology company providing and digitizing the entire journey from career assessment and counseling to admission, visa guidance, and enrollment, connecting students, universities, and agencies in one seamless and integrated ecosystem.",
      },
      {
        id: "scope",
        title: "2. Scope",
        intro: "This Privacy Policy applies to:",
        items: [
          "Website visitors",
          "Mobile App users",
          "Students and parents",
          "Educational partners",
          "Users of paid and unpaid services",
        ],
      },
      {
        id: "info-we-collect",
        title: "3. Information We Collect",
        intro: "We may collect the following categories of data:",
        subsections: [
          {
            title: "Personal Information",
            items: [
              "Full name",
              "Email address",
              "Phone number",
              "Nationality and country of residence",
              "Date of birth (where required)",
              "Academic background and interests",
            ],
          },
          {
            title: "Educational & Service Data",
            items: [
              "Program preferences",
              "University choices",
              "Application-related documents (submitted voluntarily)",
              "Career assessment responses",
              "Counseling notes and progress tracking",
            ],
          },
          {
            title: "Technical & Usage Data",
            items: [
              "IP address",
              "Device type, browser, and OS",
              "App usage and interaction logs",
              "Cookies and analytics data",
            ],
          },
          {
            title: "Payment Information",
            items: [
              "Transaction references",
              "Payment status",
            ],
            text: "Note: Edumaster does not store full card details; payments are processed via secure third-party gateways.",
          },
        ],
      },
      {
        id: "how-we-use",
        title: "4. How We Use Your Information",
        intro: "We use your data to:",
        items: [
          "Deliver counseling and admissions services",
          "Provide AI-powered assessments and recommendations",
          "Communicate with you regarding services and updates",
          "Process payments and invoices",
          "Operate the SaaS counseling management system",
          "Improve platform performance and user experience",
          "Meet legal and regulatory obligations",
        ],
      },
      {
        id: "legal-basis",
        title: "5. Legal Basis for Processing",
        intro: "We process personal data based on:",
        items: [
          "User consent",
          "Contractual necessity",
          "Legitimate business interests",
          "Legal obligations",
        ],
      },
      {
        id: "data-sharing",
        title: "6. Data Sharing",
        intro: "Your data may be shared with:",
        items: [
          "Partner universities (only with your consent)",
          "Authorized service providers (IT, payment, analytics)",
          "Legal or regulatory authorities when required",
        ],
        contact: "We do not sell personal data to third parties.",
      },
      {
        id: "data-storage",
        title: "7. Data Storage & Security",
        items: [
          "Data is stored on secure, encrypted servers",
          "Access is restricted to authorized personnel only",
          "Industry-standard technical and organizational safeguards are applied",
        ],
      },
      {
        id: "data-retention",
        title: "8. Data Retention",
        text: "Personal data is retained only as long as necessary for service delivery or legal compliance. Users may request deletion of their data at any time, subject to legal requirements.",
      },
      {
        id: "user-rights",
        title: "9. User Rights",
        intro: "You have the right to:",
        items: [
          "Access your data",
          "Request correction",
          "Request deletion",
          "Withdraw consent",
          "Object to certain processing activities",
        ],
        contact: "Requests can be submitted to: info@edumaster365.com",
      },
      {
        id: "childrens-data",
        title: "10. Children's Data",
        text: "For users under 18, parental or guardian consent is required. Parents may request access to or deletion of their child's data.",
      },
      {
        id: "cookies",
        title: "11. Cookies Policy",
        subsections: [
          {
            title: "What Are Cookies",
            text: "Cookies are small data files used to enhance user experience, analyze traffic, and improve platform functionality.",
          },
          {
            title: "Types of Cookies",
            items: [
              "Essential Cookies: Required for platform functionality",
              "Analytics Cookies: To understand user behavior",
              "Performance Cookies: To optimize speed and experience",
            ],
          },
          {
            title: "Managing Cookies",
            text: "Users may manage or disable cookies via browser or device settings. Disabling cookies may affect certain features.",
          },
        ],
      },
      {
        id: "payments",
        title: "12. Payments & Transactions",
        subsections: [
          {
            title: "Payment Processing",
            text: "All online payments made through the Platform are processed securely via licensed third-party payment service providers. Edumaster does not store, process, or retain full card details. Payment information is handled directly by the payment gateway providers in compliance with PCI-DSS security standards. By completing the payment, the user confirms that they are the authorized cardholder or have full authorization to use the selected payment method. Services provided by Edumaster are advisory, digital, and consulting-based. Outcomes such as admissions, scholarships, or visa approvals are not guaranteed and are outside the scope of payment obligations.",
          },
          {
            title: "Currency & Tax Disclosure",
            items: [
              "EGP (Inside Egypt)",
              "USD / EUR / other supported currencies (Globally)",
            ],
            text: "Any applicable taxes, gateway fees, or currency conversion charges imposed by banks or payment providers are the responsibility of the user unless explicitly stated otherwise.",
          },
          {
            title: "Consumer Protection & Refund Compliance",
            items: [
              "Users are entitled to clear disclosure of service scope before payment",
              "Digital and consulting services that begin immediately after payment are not subject to automatic refund rights once service delivery has commenced",
              "Refund requests are evaluated on a case-by-case basis, strictly under the conditions stated in the Refund Policy",
            ],
            text: "In compliance with Egyptian Consumer Protection Law.",
          },
          {
            title: "Disputes, Chargebacks & Fraud Prevention",
            items: [
              "If a user initiates a chargeback or payment dispute, Edumaster reserves the right to suspend services during investigation",
              "Supporting documents (signed agreements, consent logs, service records) may be shared with the payment gateway or the issuing bank",
              "Fraudulent chargebacks may result in permanent account suspension",
            ],
          },
          {
            title: "Data Sharing With Payment Providers",
            items: [
              "Payment authentication",
              "Fraud prevention",
              "Regulatory compliance",
            ],
            text: "For payment processing purposes, limited personal data (name, email, transaction reference) may be shared with the payment gateway strictly for these purposes, and is processed under their respective privacy policies.",
          },
          {
            title: "Cross-Border Service Disclaimer",
            text: "Some services are delivered from outside Egypt. By completing payment, the user acknowledges and agrees to receiving cross-border digital and consulting services, which are legally permissible under Egyptian law.",
          },
        ],
      },
      {
        id: "policy-updates",
        title: "13. Policy Updates",
        text: "Edumaster reserves the right to update these policies at any time. Updates will be published on the Platform, and continued use constitutes acceptance.",
      },
      {
        id: "contact",
        title: "14. Contact Us",
        text: "For questions, concerns, or policy requests:",
        contact: "info@edumaster365.com",
      },
    ],
  },

  es: {
    pageTitle: "Política de Privacidad",
    lastUpdated: "Última actualización: septiembre de 2026",
    companyInfo: {
      title: "Información de la Plataforma",
      fields: [
        { label: "Nombre de la plataforma", value: "Edumaster" },
        { label: "Entidad legal", value: "Edumaster Consulting for International Education Services LLC" },
        { label: "Tipo de servicio", value: "Servicios y tecnología educativa" },
        { label: "Correo electrónico", value: "info@edumaster365.com" },
      ],
    },
    sections: [
      {
        id: "introduction",
        title: "1. Introducción",
        text: "Edumaster Consulting for International Education Services LLC (\"Edumaster\", \"nosotros\") se compromete a proteger tu privacidad y tus datos personales. Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos tu información cuando interactúas con nuestra Plataforma. Edumaster opera como una empresa de servicios y tecnología educativa que ofrece y digitaliza todo el recorrido, desde la evaluación profesional y la asesoría hasta la admisión, la orientación de visado y la inscripción, conectando a estudiantes, universidades y agencias en un ecosistema integrado.",
      },
      {
        id: "scope",
        title: "2. Alcance",
        intro: "Esta Política de Privacidad se aplica a:",
        items: [
          "Visitantes del sitio web",
          "Usuarios de la aplicación móvil",
          "Estudiantes y padres/madres",
          "Socios educativos",
          "Usuarios de servicios pagos y gratuitos",
        ],
      },
      {
        id: "info-we-collect",
        title: "3. Información que Recopilamos",
        intro: "Podemos recopilar las siguientes categorías de datos:",
        subsections: [
          {
            title: "Información Personal",
            items: [
              "Nombre completo",
              "Correo electrónico",
              "Número de teléfono",
              "Nacionalidad y país de residencia",
              "Fecha de nacimiento (cuando sea necesario)",
              "Formación académica e intereses",
            ],
          },
          {
            title: "Datos Educativos y del Servicio",
            items: [
              "Preferencias de programa",
              "Elección de universidades",
              "Documentos relacionados con la solicitud (enviados voluntariamente)",
              "Respuestas de evaluación profesional",
              "Notas de asesoría y seguimiento del progreso",
            ],
          },
          {
            title: "Datos Técnicos y de Uso",
            items: [
              "Dirección IP",
              "Tipo de dispositivo, navegador y sistema operativo",
              "Registros de uso e interacción con la aplicación",
              "Cookies y datos de análisis",
            ],
          },
          {
            title: "Información de Pago",
            items: [
              "Referencias de transacciones",
              "Estado del pago",
            ],
            text: "Nota: Edumaster no almacena los datos completos de la tarjeta; los pagos se procesan a través de pasarelas seguras de terceros.",
          },
        ],
      },
      {
        id: "how-we-use",
        title: "4. Cómo Usamos tu Información",
        intro: "Usamos tus datos para:",
        items: [
          "Prestar servicios de asesoría y admisión universitaria",
          "Ofrecer evaluaciones y recomendaciones basadas en IA",
          "Comunicarnos contigo sobre servicios y actualizaciones",
          "Procesar pagos y facturas",
          "Operar el sistema de gestión de asesoría (SaaS)",
          "Mejorar el rendimiento de la plataforma y la experiencia del usuario",
          "Cumplir con obligaciones legales y regulatorias",
        ],
      },
      {
        id: "legal-basis",
        title: "5. Base Legal del Tratamiento",
        intro: "Procesamos los datos personales con base en:",
        items: [
          "El consentimiento del usuario",
          "La necesidad contractual",
          "Intereses comerciales legítimos",
          "Obligaciones legales",
        ],
      },
      {
        id: "data-sharing",
        title: "6. Compartición de Datos",
        intro: "Tus datos pueden compartirse con:",
        items: [
          "Universidades asociadas (solo con tu consentimiento)",
          "Proveedores de servicios autorizados (TI, pagos, análisis)",
          "Autoridades legales o regulatorias cuando sea necesario",
        ],
        contact: "No vendemos datos personales a terceros.",
      },
      {
        id: "data-storage",
        title: "7. Almacenamiento y Seguridad de Datos",
        items: [
          "Los datos se almacenan en servidores seguros y cifrados",
          "El acceso está restringido únicamente al personal autorizado",
          "Se aplican salvaguardas técnicas y organizativas conforme a los estándares del sector",
        ],
      },
      {
        id: "data-retention",
        title: "8. Retención de Datos",
        text: "Los datos personales se conservan solo durante el tiempo necesario para prestar el servicio o cumplir con obligaciones legales. Los usuarios pueden solicitar la eliminación de sus datos en cualquier momento, sujeto a los requisitos legales.",
      },
      {
        id: "user-rights",
        title: "9. Derechos del Usuario",
        intro: "Tienes derecho a:",
        items: [
          "Acceder a tus datos",
          "Solicitar su corrección",
          "Solicitar su eliminación",
          "Retirar tu consentimiento",
          "Oponerte a ciertas actividades de procesamiento",
        ],
        contact: "Las solicitudes pueden enviarse a: info@edumaster365.com",
      },
      {
        id: "childrens-data",
        title: "10. Datos de Menores",
        text: "Para usuarios menores de 18 años, se requiere el consentimiento de los padres o tutores. Los padres pueden solicitar el acceso o la eliminación de los datos de su hijo.",
      },
      {
        id: "cookies",
        title: "11. Política de Cookies",
        subsections: [
          {
            title: "Qué son las Cookies",
            text: "Las cookies son pequeños archivos de datos utilizados para mejorar la experiencia del usuario, analizar el tráfico y mejorar la funcionalidad de la plataforma.",
          },
          {
            title: "Tipos de Cookies",
            items: [
              "Cookies esenciales: necesarias para el funcionamiento de la plataforma",
              "Cookies de análisis: para comprender el comportamiento del usuario",
              "Cookies de rendimiento: para optimizar la velocidad y la experiencia",
            ],
          },
          {
            title: "Gestión de Cookies",
            text: "Los usuarios pueden gestionar o desactivar las cookies desde la configuración del navegador o del dispositivo. Desactivarlas puede afectar ciertas funciones.",
          },
        ],
      },
      {
        id: "payments",
        title: "12. Pagos y Transacciones",
        subsections: [
          {
            title: "Procesamiento de Pagos",
            text: "Todos los pagos en línea realizados a través de la Plataforma se procesan de forma segura mediante proveedores de servicios de pago autorizados de terceros. Edumaster no almacena, procesa ni conserva los datos completos de la tarjeta. La información de pago es gestionada directamente por los proveedores de la pasarela de pago conforme a los estándares de seguridad PCI-DSS. Al completar el pago, el usuario confirma que es el titular autorizado de la tarjeta o que cuenta con plena autorización para usar el método de pago seleccionado. Los servicios prestados por Edumaster son de carácter asesor, digital y consultivo. Resultados como admisiones, becas o aprobaciones de visado no están garantizados y quedan fuera del alcance de las obligaciones de pago.",
          },
          {
            title: "Divisa y Divulgación Fiscal",
            items: [
              "EGP (dentro de Egipto)",
              "USD / EUR / otras divisas admitidas (a nivel global)",
            ],
            text: "Cualquier impuesto aplicable, comisión de la pasarela o cargo por conversión de divisa impuesto por bancos o proveedores de pago es responsabilidad del usuario, salvo que se indique expresamente lo contrario.",
          },
          {
            title: "Protección al Consumidor y Cumplimiento de Reembolsos",
            items: [
              "Los usuarios tienen derecho a una divulgación clara del alcance del servicio antes del pago",
              "Los servicios digitales y de consultoría que comienzan inmediatamente después del pago no están sujetos a derechos de reembolso automático una vez iniciada la prestación del servicio",
              "Las solicitudes de reembolso se evalúan caso por caso, estrictamente conforme a las condiciones establecidas en la Política de Reembolso",
            ],
            text: "En cumplimiento con la Ley de Protección al Consumidor de Egipto.",
          },
          {
            title: "Disputas, Contracargos y Prevención de Fraude",
            items: [
              "Si un usuario inicia un contracargo o disputa de pago, Edumaster se reserva el derecho de suspender los servicios durante la investigación",
              "Los documentos de respaldo (acuerdos firmados, registros de consentimiento, historial del servicio) pueden compartirse con la pasarela de pago o el banco emisor",
              "Los contracargos fraudulentos pueden dar lugar a la suspensión permanente de la cuenta",
            ],
          },
          {
            title: "Compartición de Datos con Proveedores de Pago",
            items: [
              "Autenticación del pago",
              "Prevención de fraude",
              "Cumplimiento normativo",
            ],
            text: "Para fines de procesamiento de pagos, datos personales limitados (nombre, correo electrónico, referencia de la transacción) pueden compartirse con la pasarela de pago estrictamente para estos fines, y se procesan conforme a sus respectivas políticas de privacidad.",
          },
          {
            title: "Aviso sobre Servicios Transfronterizos",
            text: "Algunos servicios se prestan desde fuera de Egipto. Al completar el pago, el usuario reconoce y acepta recibir servicios digitales y de consultoría transfronterizos, lo cual es legalmente permisible conforme a la legislación egipcia.",
          },
        ],
      },
      {
        id: "policy-updates",
        title: "13. Actualizaciones de la Política",
        text: "Edumaster se reserva el derecho de actualizar estas políticas en cualquier momento. Las actualizaciones se publicarán en la Plataforma, y el uso continuado constituye la aceptación de las mismas.",
      },
      {
        id: "contact",
        title: "14. Contáctanos",
        text: "Para preguntas, inquietudes o solicitudes relacionadas con esta política:",
        contact: "info@edumaster365.com",
      },
    ],
  },
};

/* ═══════════════════════════════════════
   ROOT PAGE
═══════════════════════════════════════ */
export default function PrivacyPage() {
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

      {section.subsections && (
        <div className="flex flex-col gap-5 sm:gap-7 mt-4">
          {section.subsections.map((sub, i) => (
            <div key={i}>
              <h4 className="font-black text-[#0a0a0a] text-sm sm:text-base mb-2 sm:mb-3">
                {sub.title}
              </h4>

              {sub.text && (
                <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed mb-2">
                  {sub.text}
                </p>
              )}

              {sub.contact && (
                <p className="font-bold text-[#C9A227] text-sm sm:text-[15px]">
                  {sub.contact}
                </p>
              )}

              {sub.items && (
                <ul className="flex flex-col divide-y divide-gray-100">
                  {sub.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 py-2.5 sm:py-3">
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
          ))}
        </div>
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