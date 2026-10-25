// app/lib/notificationTemplates.js
//
// 🆕 قوالب نصوص الإشعارات بالـ 3 لغات (ar / en / es).
//
// المشكلة القديمة: كل إشعار كان بيتخزّن في الداتابيز كنص عربي جاهز (title/message)
// وقت الإنشاء، فالكل كان بيشوفه بالعربي حتى لو لغة الموقع عنده إنجليزي أو إسباني
// (السيرفر مايعرفش لغة المستخدم أصلاً — اللغة بتتحدد من المتصفح).
//
// الحل: الإشعار بقى بيتخزّن بـ `key` + `params` (بيانات خام: اسم الكورس، الدرجة،
// الميعاد...) والترجمة بتتم وقت العرض في GET /api/notifications حسب لغة المستخدم
// الحالية (?lang=). كده لو المستخدم غيّر لغة الموقع، الإشعارات القديمة نفسها
// بتتغير معاه. نص عربي بيتخزّن برضه كـ fallback (للإشعارات اللي مالهاش key).

import { formatMeetingWhen } from "@/app/lib/meetingTime";

export const NOTIFICATION_LANGS = ["ar", "en", "es"];
export const DEFAULT_NOTIFICATION_LANG = "ar"; // نفس نص الـ fallback المخزَّن

const LOCALES = { ar: "ar-EG", en: "en-US", es: "es-ES" };

export function resolveNotificationLang(raw) {
  const v = String(raw ?? "").toLowerCase().slice(0, 2);
  return NOTIFICATION_LANGS.includes(v) ? v : null;
}

function when(p, lang) {
  return formatMeetingWhen(p.scheduledAt, {
    locale: LOCALES[lang],
    timeZone: p.timeZone,
    withZoneName: true,
  });
}

// وصف التكرار (يومي/أسبوعي/شهري) بالـ 3 لغات — describeRecurrence الأصلية بتدعم ar/en بس
function recurrenceLabel(rule, lang) {
  if (!rule?.frequency) return "";
  const n = rule.interval > 1 ? rule.interval : 1;
  const labels = {
    daily: {
      ar: n > 1 ? `كل ${n} أيام` : "يوميًا",
      en: n > 1 ? `every ${n} days` : "daily",
      es: n > 1 ? `cada ${n} días` : "diariamente",
    },
    weekly: {
      ar: n > 1 ? `كل ${n} أسابيع` : "أسبوعيًا",
      en: n > 1 ? `every ${n} weeks` : "weekly",
      es: n > 1 ? `cada ${n} semanas` : "semanalmente",
    },
    monthly: {
      ar: n > 1 ? `كل ${n} شهور` : "شهريًا",
      en: n > 1 ? `every ${n} months` : "monthly",
      es: n > 1 ? `cada ${n} meses` : "mensualmente",
    },
  };
  return labels[rule.frequency]?.[lang] || "";
}

// كل قالب: { ar, en, es } والواحد منهم (params) => ({ title, message })
const TEMPLATES = {
  // ── الطالب سجّل في كورس (للمدرس)
  enrollment_new: {
    ar: (p) => ({
      title: "طالب جديد سجّل في كورسك",
      message: `${p.studentName || "طالب"} سجّل في "${p.courseTitle}"`,
    }),
    en: (p) => ({
      title: "A new student enrolled in your course",
      message: `${p.studentName || "A student"} enrolled in "${p.courseTitle}"`,
    }),
    es: (p) => ({
      title: "Un nuevo estudiante se inscribió en tu curso",
      message: `${p.studentName || "Un estudiante"} se inscribió en "${p.courseTitle}"`,
    }),
  },

  // ── نتيجة كويز (للطالب)
  quiz_result: {
    ar: (p) => ({
      title: p.quizTitle,
      message: `${p.scorePercent}% — ${p.passed ? "ناجح" : "لم تجتز بعد"}`,
    }),
    en: (p) => ({
      title: p.quizTitle,
      message: `${p.scorePercent}% — ${p.passed ? "Passed" : "Not passed yet"}`,
    }),
    es: (p) => ({
      title: p.quizTitle,
      message: `${p.scorePercent}% — ${p.passed ? "Aprobado" : "Aún no aprobado"}`,
    }),
  },

  // ── تصحيح واجب (للطالب) — العنوان والدرجة مش محتاجين ترجمة
  assignment_graded: {
    ar: (p) => ({ title: p.assignmentTitle, message: `${p.score}/${p.maxScore}` }),
    en: (p) => ({ title: p.assignmentTitle, message: `${p.score}/${p.maxScore}` }),
    es: (p) => ({ title: p.assignmentTitle, message: `${p.score}/${p.maxScore}` }),
  },

  // ── 🆕 رسالة جديدة في محادثة كويز/واجب (بين الطالب والمدرّس/الموديريتر)
  thread_message: {
    ar: (p) => ({ title: `${p.senderName || "رسالة جديدة"} — ${p.itemTitle}`, message: p.body }),
    en: (p) => ({ title: `${p.senderName || "New message"} — ${p.itemTitle}`, message: p.body }),
    es: (p) => ({ title: `${p.senderName || "Nuevo mensaje"} — ${p.itemTitle}`, message: p.body }),
  },

  // ── 🆕 تم تصحيح الأسئلة المقالية في كويز (للطالب)
  essay_graded: {
    ar: (p) => ({ title: p.quizTitle, message: `تم تصحيح إجاباتك المقالية — ${p.scorePercent}%` }),
    en: (p) => ({ title: p.quizTitle, message: `Your essay answers were graded — ${p.scorePercent}%` }),
    es: (p) => ({ title: p.quizTitle, message: `Tus respuestas de ensayo fueron calificadas — ${p.scorePercent}%` }),
  },

  // ── شهادة جديدة (للطالب)
  certificate_issued: {
    ar: (p) => ({ title: p.courseTitle, message: "شهادتك جاهزة" }),
    en: (p) => ({ title: p.courseTitle, message: "Your certificate is ready" }),
    es: (p) => ({ title: p.courseTitle, message: "Tu certificado está listo" }),
  },

  // ── إعلان جديد على كورس (لكل طالب مسجل)
  announcement_new: {
    ar: (p) => ({ title: `إعلان جديد في دورة ${p.courseTitle}`, message: p.announcementTitle }),
    en: (p) => ({ title: `New announcement in ${p.courseTitle}`, message: p.announcementTitle }),
    es: (p) => ({ title: `Nuevo anuncio en el curso ${p.courseTitle}`, message: p.announcementTitle }),
  },

  // ── رد على سؤال (لصاحب السؤال)
  comment_reply: {
    ar: (p) => ({ title: "رد جديد على سؤالك", message: p.body }),
    en: (p) => ({ title: "New reply to your question", message: p.body }),
    es: (p) => ({ title: "Nueva respuesta a tu pregunta", message: p.body }),
  },

  // ── سؤال جديد تحت درس (للمدرس)
  comment_question: {
    ar: (p) => ({ title: `سؤال جديد على درس "${p.lessonTitle}"`, message: p.body }),
    en: (p) => ({ title: `New question on lesson "${p.lessonTitle}"`, message: p.body }),
    es: (p) => ({ title: `Nueva pregunta en la lección "${p.lessonTitle}"`, message: p.body }),
  },

  // ── دفع ناجح (للطالب)
  payment_succeeded: {
    ar: (p) => ({ title: "تمت عملية الدفع بنجاح", message: paymentItem(p, "ar") }),
    en: (p) => ({ title: "Payment successful", message: paymentItem(p, "en") }),
    es: (p) => ({ title: "Pago realizado con éxito", message: paymentItem(p, "es") }),
  },

  // ── مدرس بعت كورس للمراجعة (للأدمنز)
  course_pending_review: {
    ar: (p) => ({
      title: "دورة جديدة بانتظار المراجعة",
      message: `المدرس "${p.teacherName || ""}" طلب نشر الدورة "${p.courseTitle}" — وهي بحاجة إلى مراجعتك.`,
    }),
    en: (p) => ({
      title: "New course awaiting review",
      message: `Teacher "${p.teacherName || ""}" requested to publish the course "${p.courseTitle}" — it needs your review.`,
    }),
    es: (p) => ({
      title: "Nuevo curso pendiente de revisión",
      message: `El profesor "${p.teacherName || ""}" solicitó publicar el curso "${p.courseTitle}" y necesita tu revisión.`,
    }),
  },

  // ── الأدمن وافق على الكورس (للمدرس)
  course_approved: {
    ar: (p) => ({
      title: "تمت الموافقة على دورتك",
      message: `وافقت الإدارة على نشر دورة "${p.courseTitle}" — وأصبحت ظاهرة للطلاب الآن.`,
    }),
    en: (p) => ({
      title: "Your course was approved",
      message: `The admins approved publishing "${p.courseTitle}" — it is now visible to students.`,
    }),
    es: (p) => ({
      title: "Tu curso fue aprobado",
      message: `La administración aprobó la publicación del curso "${p.courseTitle}" y ya es visible para los estudiantes.`,
    }),
  },

  // ── الموديريتور سجّل الطالب في الكورس مجانًا (للطالب) — بيتبعت لما الكورس يتنشر
  course_access_granted: {
    ar: (p) => ({
      title: "تم فتح كورس جديد لك",
      message: `تم تسجيلك في كورس "${p.courseTitle}" وأصبح متاحًا لك الآن — لا تحتاج إلى الاشتراك.`,
    }),
    en: (p) => ({
      title: "A new course is open for you",
      message: `You have been enrolled in "${p.courseTitle}" and it is available to you now — no purchase needed.`,
    }),
    es: (p) => ({
      title: "Se abrió un nuevo curso para ti",
      message: `Has sido inscrito en el curso "${p.courseTitle}" y ya está disponible para ti, sin necesidad de comprarlo.`,
    }),
  },

  // ── الأدمن رفض الكورس (للمدرس)
  course_rejected: {
    ar: (p) => ({
      title: "تم رفض دورتك",
      message: p.reason
        ? `رفضت الإدارة دورة "${p.courseTitle}" وتم حذفها. السبب: ${p.reason}`
        : `رفضت الإدارة دورة "${p.courseTitle}" وتم حذفها.`,
    }),
    en: (p) => ({
      title: "Your course was rejected",
      message: p.reason
        ? `The admins rejected the course "${p.courseTitle}" and it was deleted. Reason: ${p.reason}`
        : `The admins rejected the course "${p.courseTitle}" and it was deleted.`,
    }),
    es: (p) => ({
      title: "Tu curso fue rechazado",
      message: p.reason
        ? `La administración rechazó el curso "${p.courseTitle}" y fue eliminado. Motivo: ${p.reason}`
        : `La administración rechazó el curso "${p.courseTitle}" y fue eliminado.`,
    }),
  },

  // ── دعوة لمحاضرة مباشرة (بالإيميل — meetingCreate)
  meeting_invited: {
    ar: (p) => ({
      title: `تمت دعوتك لمحاضرة مباشرة: ${p.title}`,
      message: `${when(p, "ar")}${p.occurrences > 1 ? ` — سلسلة من ${p.occurrences} محاضرات` : ""}`,
    }),
    en: (p) => ({
      title: `You're invited to a live lecture: ${p.title}`,
      message: `${when(p, "en")}${p.occurrences > 1 ? ` — a series of ${p.occurrences} lectures` : ""}`,
    }),
    es: (p) => ({
      title: `Has sido invitado a una clase en vivo: ${p.title}`,
      message: `${when(p, "es")}${p.occurrences > 1 ? ` — una serie de ${p.occurrences} clases` : ""}`,
    }),
  },

  // ── جلسة مباشرة عامة للجميع (برا الكورسات)
  meeting_public_new: {
    ar: (p) => ({
      title: p.count > 1 ? "سلسلة محاضرات مباشرة جديدة للجميع" : "محاضرة مباشرة جديدة للجميع",
      message: `${p.title} — ${when(p, "ar")}${p.count > 1 ? ` (${p.count} محاضرات)` : ""}`,
    }),
    en: (p) => ({
      title: p.count > 1 ? "New live lecture series for everyone" : "New live lecture for everyone",
      message: `${p.title} — ${when(p, "en")}${p.count > 1 ? ` (${p.count} lectures)` : ""}`,
    }),
    es: (p) => ({
      title: p.count > 1 ? "Nueva serie de clases en vivo para todos" : "Nueva clase en vivo para todos",
      message: `${p.title} — ${when(p, "es")}${p.count > 1 ? ` (${p.count} clases)` : ""}`,
    }),
  },

  // ── محاضرة مباشرة جديدة في كورس (لكل طالب مسجل)
  meeting_course_new: {
    ar: (p) => ({
      title: p.isSeries
        ? `سلسلة محاضرات مباشرة جديدة في دورة ${p.courseTitle}`
        : `محاضرة مباشرة جديدة في دورة ${p.courseTitle}`,
      message: `${p.title} — ${when(p, "ar")}${
        p.isSeries ? ` (${p.count} محاضرات، ${recurrenceLabel(p.recurrence, "ar")})` : ""
      }`,
    }),
    en: (p) => ({
      title: p.isSeries
        ? `New live lecture series in ${p.courseTitle}`
        : `New live lecture in ${p.courseTitle}`,
      message: `${p.title} — ${when(p, "en")}${
        p.isSeries ? ` (${p.count} lectures, ${recurrenceLabel(p.recurrence, "en")})` : ""
      }`,
    }),
    es: (p) => ({
      title: p.isSeries
        ? `Nueva serie de clases en vivo en el curso ${p.courseTitle}`
        : `Nueva clase en vivo en el curso ${p.courseTitle}`,
      message: `${p.title} — ${when(p, "es")}${
        p.isSeries ? ` (${p.count} clases, ${recurrenceLabel(p.recurrence, "es")})` : ""
      }`,
    }),
  },

  // ── تذكير قبل بداية جلسة عامة
  meeting_reminder_public: {
    ar: (p) => ({
      title: `محاضرة "${p.title}" ستبدأ بعد ${p.minutesLeft} دقيقة`,
      message: "جلسة مباشرة للجميع — استعد للدخول",
    }),
    en: (p) => ({
      title: `Lecture "${p.title}" starts in ${p.minutesLeft} minutes`,
      message: "Live session for everyone — get ready to join",
    }),
    es: (p) => ({
      title: `La clase "${p.title}" comienza en ${p.minutesLeft} minutos`,
      message: "Sesión en vivo para todos: prepárate para entrar",
    }),
  },

  // ── تذكير قبل بداية محاضرة كورس
  meeting_reminder_course: {
    ar: (p) => ({
      title: `محاضرة "${p.title}" ستبدأ بعد ${p.minutesLeft} دقيقة`,
      message: `${p.courseTitle} — استعد للدخول`,
    }),
    en: (p) => ({
      title: `Lecture "${p.title}" starts in ${p.minutesLeft} minutes`,
      message: `${p.courseTitle} — get ready to join`,
    }),
    es: (p) => ({
      title: `La clase "${p.title}" comienza en ${p.minutesLeft} minutos`,
      message: `${p.courseTitle} — prepárate para entrar`,
    }),
  },

  // ── تغيير موعد / إلغاء محاضرة
  meeting_changed: {
    ar: (p) => ({
      title:
        p.kind === "cancelled"
          ? p.count > 1
            ? `تم إلغاء ${p.count} محاضرات: ${p.title}`
            : `تم إلغاء المحاضرة: ${p.title}`
          : p.count > 1
          ? `تم تغيير موعد سلسلة المحاضرات: ${p.title}`
          : `تم تغيير موعد المحاضرة: ${p.title}`,
      message: p.kind === "cancelled" ? `كانت في ${when(p, "ar")}` : `الموعد الجديد: ${when(p, "ar")}`,
    }),
    en: (p) => ({
      title:
        p.kind === "cancelled"
          ? p.count > 1
            ? `${p.count} lectures cancelled: ${p.title}`
            : `Lecture cancelled: ${p.title}`
          : p.count > 1
          ? `Lecture series rescheduled: ${p.title}`
          : `Lecture rescheduled: ${p.title}`,
      message: p.kind === "cancelled" ? `It was scheduled for ${when(p, "en")}` : `New time: ${when(p, "en")}`,
    }),
    es: (p) => ({
      title:
        p.kind === "cancelled"
          ? p.count > 1
            ? `Se cancelaron ${p.count} clases: ${p.title}`
            : `Clase cancelada: ${p.title}`
          : p.count > 1
          ? `Serie de clases reprogramada: ${p.title}`
          : `Clase reprogramada: ${p.title}`,
      message: p.kind === "cancelled" ? `Estaba programada para ${when(p, "es")}` : `Nueva fecha: ${when(p, "es")}`,
    }),
  },

  // ── تعليق/رد جديد مستني موافقة الأدمن
  comment_pending_review: {
    ar: (p) => ({
      title: p.isReply ? "رد جديد بانتظار موافقتك" : "سؤال جديد بانتظار موافقتك",
      message: p.body,
    }),
    en: (p) => ({
      title: p.isReply ? "New reply awaiting your approval" : "New question awaiting your approval",
      message: p.body,
    }),
    es: (p) => ({
      title: p.isReply ? "Nueva respuesta pendiente de tu aprobación" : "Nueva pregunta pendiente de tu aprobación",
      message: p.body,
    }),
  },

  // ── الأدمن وافق على تعليق المستخدم
  comment_approved: {
    ar: () => ({ title: "تمت الموافقة على تعليقك", message: "أصبح تعليقك ظاهرًا أسفل الدرس الآن." }),
    en: () => ({ title: "Your comment was approved", message: "Your comment is now visible under the lesson." }),
    es: () => ({ title: "Tu comentario fue aprobado", message: "Tu comentario ya es visible debajo de la lección." }),
  },

  // ── الأدمن رفض تعليق المستخدم
  comment_rejected: {
    ar: (p) => ({
      title: "تم رفض تعليقك",
      message: p.reason ? `رفضت الإدارة تعليقك. السبب: ${p.reason}` : "رفضت الإدارة تعليقك ولن يظهر أسفل الدرس.",
    }),
    en: (p) => ({
      title: "Your comment was rejected",
      message: p.reason
        ? `The admins rejected your comment. Reason: ${p.reason}`
        : "The admins rejected your comment and it won't appear under the lesson.",
    }),
    es: (p) => ({
      title: "Tu comentario fue rechazado",
      message: p.reason
        ? `La administración rechazó tu comentario. Motivo: ${p.reason}`
        : "La administración rechazó tu comentario y no aparecerá debajo de la lección.",
    }),
  },

  // ── رسالة مباشرة جديدة بين طالب ومدرس
  message_new: {
    ar: (p) => ({
      title: p.fromStudent ? `رسالة جديدة من ${p.senderName || "طالب"}` : `رد جديد من مدرس "${p.courseTitle}"`,
      message: p.text,
    }),
    en: (p) => ({
      title: p.fromStudent
        ? `New message from ${p.senderName || "a student"}`
        : `New reply from the teacher of "${p.courseTitle}"`,
      message: p.text,
    }),
    es: (p) => ({
      title: p.fromStudent
        ? `Nuevo mensaje de ${p.senderName || "un estudiante"}`
        : `Nueva respuesta del profesor de "${p.courseTitle}"`,
      message: p.text,
    }),
  },
};

// اسم العنصر المدفوع في إشعار الدفع
function paymentItem(p, lang) {
  const L = (ar, en, es) => ({ ar, en, es }[lang]);
  switch (p.itemKind) {
    case "course":
      return p.itemName || L("الدورة", "your course", "tu curso");
    case "membership":
      return p.itemName || L("عضويتك", "your membership", "tu membresía");
    case "consultation":
      return L("حجز استشارة", "Consultation booking", "Reserva de consulta");
    case "placement_test":
      return L("نتيجة اختبار تحديد مستوى الإسبانية", "Spanish level test result", "Resultado de la prueba de nivel de español");
    default:
      return L("مشترياتك", "your purchase", "tu compra");
  }
}

/**
 * بيرجّع { title, message } للإشعار بلغة معيّنة، أو null لو الـ key غير معروف
 * (إشعار قديم/مخصّص → الكود بيستخدم النص المخزَّن).
 */
export function renderNotificationText(key, params, lang) {
  const tpl = TEMPLATES[key];
  const l = resolveNotificationLang(lang) || DEFAULT_NOTIFICATION_LANG;
  if (!tpl?.[l]) return null;
  try {
    const out = tpl[l](params || {});
    return {
      title: String(out.title ?? ""),
      message: String(out.message ?? ""),
    };
  } catch {
    return null;
  }
}

export function isKnownNotificationKey(key) {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, key);
}
