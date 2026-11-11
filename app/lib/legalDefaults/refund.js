// app/lib/legalDefaults/refund.js
// المحتوى الافتراضي لصفحة refund (ar/en/es) — بيتعرض لو الأدمن لسه ماحفظش نسخة
// من لوحة الأدمن، وبيتحمّل في المحرّر أول مرة عشان يتعدّل.
const REFUND_DEFAULTS = {
  "ar": {
    "pageTitle": "سياسة الاسترداد والإلغاء",
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
        "id": "general-policy",
        "title": "١. السياسة العامة",
        "text": "جميع رسوم الخدمة غير قابلة للاسترداد بمجرد بدء تقديم الخدمة."
      },
      {
        "id": "refunds-considered",
        "title": "٢. الحالات التي قد يُنظر فيها بالاسترداد",
        "intro": "فقط في الحالات التالية:",
        "items": [
          "حدوث دفع مكرر",
          "وجود خطأ تقني منع الوصول إلى الخدمة",
          "حدوث خطأ في الفوترة"
        ]
      },
      {
        "id": "non-refundable",
        "title": "٣. الحالات غير القابلة للاسترداد",
        "intro": "لن يتم إصدار أي استرداد في الحالات التالية:",
        "items": [
          "إلغاء المستخدم للخدمة بعد بدء تنفيذها",
          "عدم تقديم المستندات المطلوبة",
          "تغيير المستخدم للبلد أو الجامعة أو البرنامج",
          "عدم نجاح نتيجة التقديم",
          "رفض أو تأخير التأشيرة"
        ]
      },
      {
        "id": "visa-disclaimer",
        "title": "٤. إخلاء مسؤولية بخصوص التأشيرة",
        "intro": "تقدّم Edumaster دعمًا لإعداد ملف التأشيرة فقط. نحن لا:",
        "items": [
          "نضمن إصدار التأشيرة",
          "نؤمّن مواعيد السفارة",
          "نؤثّر على قرارات السفارة"
        ]
      },
      {
        "id": "subscription-cancellation",
        "title": "٥. إلغاء الاشتراك",
        "text": "يمكن إلغاء الاشتراكات في أي وقت لوقف الفوترة المستقبلية. تظل المدفوعات السابقة غير قابلة للاسترداد."
      }
    ]
  },
  "en": {
    "pageTitle": "Refund & Cancellation Policy",
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
        "id": "general-policy",
        "title": "1. General Policy",
        "text": "All service fees are non-refundable once service delivery has commenced."
      },
      {
        "id": "refunds-considered",
        "title": "2. Refunds May Be Considered",
        "intro": "Only if:",
        "items": [
          "A duplicate payment was made",
          "A technical error prevented service access",
          "A billing error occurred"
        ]
      },
      {
        "id": "non-refundable",
        "title": "3. Non-Refundable Cases",
        "intro": "No refunds will be issued if:",
        "items": [
          "The user cancels after service initiation",
          "Required documents are not provided",
          "The user changes country, university, or program",
          "The application outcome is unsuccessful",
          "Visa is rejected or delayed"
        ]
      },
      {
        "id": "visa-disclaimer",
        "title": "4. Visa Disclaimer",
        "intro": "Edumaster provides visa preparation support only. We do not:",
        "items": [
          "Guarantee visa issuance",
          "Secure embassy appointments",
          "Influence embassy decisions"
        ]
      },
      {
        "id": "subscription-cancellation",
        "title": "5. Subscription Cancellation",
        "text": "Subscriptions may be canceled at any time to stop future billing. Past payments remain non-refundable."
      }
    ]
  },
  "es": {
    "pageTitle": "Política de Reembolso y Cancelación",
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
        "id": "general-policy",
        "title": "1. Política General",
        "text": "Todas las tarifas de servicio no son reembolsables una vez que la prestación del servicio ha comenzado."
      },
      {
        "id": "refunds-considered",
        "title": "2. Casos en los que se Puede Considerar un Reembolso",
        "intro": "Solo si:",
        "items": [
          "Se realizó un pago duplicado",
          "Un error técnico impidió el acceso al servicio",
          "Se produjo un error de facturación"
        ]
      },
      {
        "id": "non-refundable",
        "title": "3. Casos No Reembolsables",
        "intro": "No se emitirá ningún reembolso si:",
        "items": [
          "El usuario cancela después de iniciado el servicio",
          "No se proporcionan los documentos requeridos",
          "El usuario cambia de país, universidad o programa",
          "El resultado de la solicitud no es exitoso",
          "El visado es rechazado o se retrasa"
        ]
      },
      {
        "id": "visa-disclaimer",
        "title": "4. Aviso sobre el Visado",
        "intro": "Edumaster ofrece únicamente apoyo en la preparación del visado. No:",
        "items": [
          "Garantizamos la emisión del visado",
          "Aseguramos citas en la embajada",
          "Influimos en las decisiones de la embajada"
        ]
      },
      {
        "id": "subscription-cancellation",
        "title": "5. Cancelación de Suscripción",
        "text": "Las suscripciones pueden cancelarse en cualquier momento para detener la facturación futura. Los pagos anteriores permanecen no reembolsables."
      }
    ]
  }
};

export default REFUND_DEFAULTS;
