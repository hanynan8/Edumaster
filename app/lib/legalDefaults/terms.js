// app/lib/legalDefaults/terms.js
// المحتوى الافتراضي لصفحة terms (ar/en/es) — بيتعرض لو الأدمن لسه ماحفظش نسخة
// من لوحة الأدمن، وبيتحمّل في المحرّر أول مرة عشان يتعدّل.
const TERMS_DEFAULTS = {
  "ar": {
    "pageTitle": "الشروط والأحكام",
    "lastUpdated": "آخر تحديث: سبتمبر 2026",
    "companyInfo": {
      "title": "بيانات المنصة",
      "fields": [
        {
          "label": "اسم المنصة",
          "value": "Edumaster"
        },
        {
          "label": "نوع الخدمة",
          "value": "منصة تعليمية إلكترونية"
        },
        {
          "label": "البريد الإلكتروني",
          "value": "info@edumaster365.com"
        }
      ]
    },
    "sections": [
      {
        "id": "acceptance",
        "title": "١. الموافقة على الشروط",
        "text": "من خلال الوصول إلى المنصة أو استخدامها، فإنك توافق على هذه الشروط والأحكام وجميع السياسات ذات الصلة."
      },
      {
        "id": "services",
        "title": "٢. وصف الخدمات",
        "intro": "تقدم Edumaster:",
        "items": [
          "الاستشارات الأكاديمية والمهنية",
          "دعم القبول الجامعي",
          "أدوات التقييم المهني المعتمدة على الذكاء الاصطناعي",
          "نظام إدارة الاستشارات (SaaS)",
          "خدمات استشارية للدراسة في الخارج"
        ],
        "contact": "لا تضمن Edumaster القبول الجامعي أو المنح الدراسية أو التأشيرات أو الموافقة عليها."
      },
      {
        "id": "responsibilities",
        "title": "٣. مسؤوليات المستخدم",
        "intro": "يوافق المستخدمون على:",
        "items": [
          "تقديم معلومات دقيقة وصحيحة",
          "تقديم مستندات أصلية وموثوقة",
          "استخدام المنصة بشكل قانوني",
          "احترام حقوق الملكية الفكرية"
        ]
      },
      {
        "id": "payments",
        "title": "٤. المدفوعات والرسوم",
        "items": [
          "يتم الإفصاح عن الرسوم بوضوح قبل الدفع",
          "تتم معالجة المدفوعات عبر بوابات دفع آمنة",
          "يبدأ الوصول إلى الخدمات المدفوعة فور إتمام الدفع بنجاح"
        ]
      },
      {
        "id": "ip",
        "title": "٥. الملكية الفكرية",
        "text": "جميع المحتويات والبرمجيات والخوارزميات والعلامات التجارية وميزات المنصة هي ملكية حصرية لشركة Edumaster Consulting. أي استخدام غير مصرّح به محظور تمامًا."
      },
      {
        "id": "liability",
        "title": "٦. حدود المسؤولية",
        "intro": "لا تتحمل Edumaster المسؤولية عن:",
        "items": [
          "القرارات الصادرة عن الجامعات أو السفارات",
          "رفض طلبات التأشيرة",
          "التأخيرات الناتجة عن أطراف ثالثة",
          "النتائج المبنية على المعلومات المقدَّمة من المستخدم"
        ],
        "contact": "تُقدَّم الخدمات \"كما هي\" و\"حسب توفرها\"."
      },
      {
        "id": "termination",
        "title": "٧. إنهاء الخدمة",
        "text": "تحتفظ Edumaster بالحق في تعليق أو إنهاء الوصول إلى المنصة في حال إساءة الاستخدام أو الاحتيال أو مخالفة هذه الشروط."
      },
      {
        "id": "governing-law",
        "title": "٨. القانون الحاكم",
        "text": "تخضع هذه الشروط لقوانين جمهورية مصر العربية، ما لم تقتضِ اللوائح الدولية المعمول بها خلاف ذلك."
      }
    ]
  },
  "en": {
    "pageTitle": "Terms & Conditions",
    "lastUpdated": "Last updated: September 2026",
    "companyInfo": {
      "title": "Platform Information",
      "fields": [
        {
          "label": "Platform Name",
          "value": "Edumaster"
        },
        {
          "label": "Service Type",
          "value": "Online Education Platform"
        },
        {
          "label": "Email",
          "value": "info@edumaster365.com"
        }
      ]
    },
    "sections": [
      {
        "id": "acceptance",
        "title": "1. Acceptance",
        "text": "By accessing or using the Platform, you agree to these Terms & Conditions and all related policies."
      },
      {
        "id": "services",
        "title": "2. Services Description",
        "intro": "Edumaster provides:",
        "items": [
          "Academic and career counseling",
          "University admissions support",
          "AI-based career assessment tools",
          "SaaS counseling management system",
          "Study abroad advisory services"
        ],
        "contact": "Edumaster does not guarantee admission, scholarships, visas, or visa approvals."
      },
      {
        "id": "responsibilities",
        "title": "3. User Responsibilities",
        "intro": "Users agree to:",
        "items": [
          "Provide accurate and truthful information",
          "Submit authentic documents",
          "Use the Platform lawfully",
          "Respect intellectual property rights"
        ]
      },
      {
        "id": "payments",
        "title": "4. Payments & Fees",
        "items": [
          "Fees are clearly communicated before payment",
          "Payments are processed via secure gateways",
          "Access to paid services begins upon successful payment"
        ]
      },
      {
        "id": "ip",
        "title": "5. Intellectual Property",
        "text": "All content, software, algorithms, branding, and platform features are the exclusive property of Edumaster Consulting. Unauthorized use is strictly prohibited."
      },
      {
        "id": "liability",
        "title": "6. Limitation of Liability",
        "intro": "Edumaster is not liable for:",
        "items": [
          "Decisions made by universities or embassies",
          "Visa rejections",
          "Delays caused by third parties",
          "Outcomes based on user-provided information"
        ],
        "contact": "Services are provided \"as is\" and \"as available.\""
      },
      {
        "id": "termination",
        "title": "7. Termination",
        "text": "Edumaster reserves the right to suspend or terminate access in case of misuse, fraud, or violation of these terms."
      },
      {
        "id": "governing-law",
        "title": "8. Governing Law",
        "text": "These Terms are governed by the laws of the Arab Republic of Egypt, unless otherwise required by applicable international regulations."
      }
    ]
  },
  "es": {
    "pageTitle": "Términos y Condiciones",
    "lastUpdated": "Última actualización: septiembre de 2026",
    "companyInfo": {
      "title": "Información de la Plataforma",
      "fields": [
        {
          "label": "Nombre de la plataforma",
          "value": "Edumaster"
        },
        {
          "label": "Tipo de servicio",
          "value": "Plataforma educativa en línea"
        },
        {
          "label": "Correo electrónico",
          "value": "info@edumaster365.com"
        }
      ]
    },
    "sections": [
      {
        "id": "acceptance",
        "title": "1. Aceptación",
        "text": "Al acceder o utilizar la Plataforma, aceptas estos Términos y Condiciones y todas las políticas relacionadas."
      },
      {
        "id": "services",
        "title": "2. Descripción de los Servicios",
        "intro": "Edumaster ofrece:",
        "items": [
          "Asesoría académica y profesional",
          "Apoyo en la admisión universitaria",
          "Herramientas de evaluación profesional basadas en IA",
          "Sistema de gestión de asesoría (SaaS)",
          "Servicios de asesoría para estudiar en el extranjero"
        ],
        "contact": "Edumaster no garantiza la admisión, becas, visados ni su aprobación."
      },
      {
        "id": "responsibilities",
        "title": "3. Responsabilidades del Usuario",
        "intro": "Los usuarios se comprometen a:",
        "items": [
          "Proporcionar información precisa y veraz",
          "Presentar documentos auténticos",
          "Usar la Plataforma de forma lícita",
          "Respetar los derechos de propiedad intelectual"
        ]
      },
      {
        "id": "payments",
        "title": "4. Pagos y Tarifas",
        "items": [
          "Las tarifas se comunican claramente antes del pago",
          "Los pagos se procesan a través de pasarelas seguras",
          "El acceso a los servicios pagos comienza tras un pago exitoso"
        ]
      },
      {
        "id": "ip",
        "title": "5. Propiedad Intelectual",
        "text": "Todo el contenido, software, algoritmos, marca y funciones de la plataforma son propiedad exclusiva de Edumaster Consulting. El uso no autorizado está estrictamente prohibido."
      },
      {
        "id": "liability",
        "title": "6. Limitación de Responsabilidad",
        "intro": "Edumaster no se hace responsable de:",
        "items": [
          "Decisiones tomadas por universidades o embajadas",
          "Rechazos de visado",
          "Retrasos causados por terceros",
          "Resultados basados en información proporcionada por el usuario"
        ],
        "contact": "Los servicios se prestan \"tal cual\" y \"según disponibilidad\"."
      },
      {
        "id": "termination",
        "title": "7. Terminación",
        "text": "Edumaster se reserva el derecho de suspender o cancelar el acceso en caso de mal uso, fraude o incumplimiento de estos términos."
      },
      {
        "id": "governing-law",
        "title": "8. Ley Aplicable",
        "text": "Estos Términos se rigen por las leyes de la República Árabe de Egipto, salvo que la normativa internacional aplicable exija lo contrario."
      }
    ]
  }
};

export default TERMS_DEFAULTS;
