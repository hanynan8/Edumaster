"use client";

// app/meet/page.jsx
//
// 🆕 صفحة "المحاضرات المباشرة" — بتعرض روابط اجتماعات Daily (متولّدة تلقائيًا
// أو يدوية، شوف تعليق app/lib/models/Meeting.js) لكل الأدوار الثلاثة بنفس
// الصفحة:
//   - مدرس: بيشوف اجتماعات دوراته، يقدر يضيف/يعدّل/يحذف.
//   - طالب: بيشوف اجتماعات الدورات المسجّل فيها بس، بزرار "دخول" للينك.
//   - أدمن: بيشوف كل الاجتماعات (رقابة عامة)، وعنده صلاحية حذف/تعديل أي
//     اجتماع زي أي owner (isOwnerOrAdmin في الـ API).
//
// الحماية: middleware.js بيحمي المسار ده لأي مستخدم مسجل دخول (أي role)،
// والفحص هنا طبقة UX إضافية بس (شاشة تحميل/رفض واضحة) زي باقي الصفحات.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DailyMeetingModal from "@/app/components/DailyMeetingModal";
import { resolvePhase, isPresenceCheckCandidate, canJoinNow, getJoinOpensAt } from "@/app/lib/meetingPhase";
import { expandRecurrence, MAX_OCCURRENCES } from "@/app/lib/meetingRecurrence";
import {
  Video,
  Plus,
  Loader,
  AlertCircle,
  Calendar,
  Clock,
  ExternalLink,
  PlayCircle,
  Pencil,
  Trash2,
  X,
  BookOpen,
  User,
  ArrowRight,
  Radio,
  Film,
  Repeat,
  Mail,
  Search,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل نصوص الصفحة كانت عربي ثابت — دلوقتي بتتبع اللغة المختارة من
// الناف بار (en/ar/es)، بما فيها locale الخاص بـ formatDateTime.
const LOCALE_MAP = { en: "en-US", ar: "ar-EG", es: "es-ES" };

const T = {
  en: {
    noAccess: "No access",
    mustLogin: "You need to log in first to see live lectures.",
    backHome: "Back to home",
    minutes: "min",
    course: "Course",
    savedError: "Something went wrong, try again",
    loadError: "Failed to load lectures, try again",
    deleteError: "Something went wrong while deleting, try again",
    confirmDelete: (title) => `Are you sure you want to delete the lecture "${title}"?`,
    editLecture: "Edit lecture",
    newLecture: "New live lecture",
    courseLabel: "Course *",
    chooseCourse: "Choose a course...",
    generalSession: "General session (outside courses) — visible to everyone on the platform",
    generalBadge: "General session",
    needCourseFirst: "You need at least one course first.",
    titleLabel: "Lecture title *",
    titlePlaceholder: "e.g. Chapter 3 review",
    descLabel: "Short description (optional)",
    linkLabel: "Meeting link (optional)",
    linkPlaceholder: "https://your-team.daily.co/room-name",
    linkHelper: "Leave empty to auto-generate a video meeting link via Daily, or paste your own link.",
    scheduledLabel: "Date & time *",
    durationLabel: "Duration (minutes)",
    saveChanges: "Save changes",
    addLecture: "Add lecture",
    cancel: "Cancel",
    titleRequired: "Lecture title is required",
    scheduledRequired: "Lecture date & time is required",
    chooseCourseRequired: "Choose a course",
    phaseLive: "Live now",
    phaseUpcoming: "Upcoming",
    phaseEnded: "Ended",
    errInvalidLink: "Meeting link is not valid — it must start with http:// or https://",
    errMissingTitle: "Lecture title is required",
    errInvalidScheduledAt: "Lecture date & time is not valid",
    errForbidden: "You don't have permission to edit/add to this course",
    errDailyFailed: "Failed to auto-create the meeting via Daily — send a manual link instead.",
    watchRecording: "Watch recording",
    noRecordingToday: "No recording available for today's lecture",
    lectureEnded: "The lecture has ended",
    joinMeeting: "Join meeting",
    joinOpensAt: (when) => `Opens at ${when}`,
    enterMeeting: "Enter meeting",
    editTitle: "Edit",
    deleteTitle: "Delete",
    recordingNotAvailable: "Recording not available right now, try again shortly",
    back: "Back",
    pageTitle: "Live lectures",
    pageSubtitle: "Course video meetings (Daily)",
    newLectureBtn: "New lecture",
    noLecturesStudent: "No live lectures scheduled for your courses right now.",
    noLecturesYet: "No lectures added yet.",
    liveNow: "Live now",
    upcoming: "Upcoming",
    ended: "Ended",
    noLiveNow: "No lecture is live right now.",
    noUpcoming: "No upcoming lectures scheduled.",
    invitedLabel: "Invite people (optional)",
    invitedHelper: "Only people registered on the platform. Everyone you select gets an email invitation and an in-site notification, and can join from Live Lectures. No limit on the number of invitees.",
    pickerAdd: "Add people",
    pickerClose: "Done",
    pickerSearch: "Search by name or email...",
    pickerNoResults: "No users found",
    pickerSelectAll: "Select all shown",
    pickerClear: "Clear all",
    pickerLoadMore: "Load more",
    pickerSelected: (n) => `${n} selected`,
    errUnknownEmails: (list) => `Not registered on the platform: ${list}`,
    repeatLabel: "Repeat",
    repeatNone: "Does not repeat",
    repeatDaily: "Daily",
    repeatWeekly: "Weekly",
    repeatMonthly: "Monthly",
    everyLabel: "Every",
    unitDay: "day(s)",
    unitWeek: "week(s)",
    unitMonth: "month(s)",
    onDaysLabel: "On",
    endsLabel: "Ends",
    endAfterCount: "After a number of lectures",
    endOnDate: "On a date",
    countLabel: "Number of lectures",
    untilLabel: "Last date",
    untilRequired: "Choose the date the repetition ends",
    repeatPreview: (n, first, last) => `${n} lectures: ${first} → ${last}`,
    recurringBadge: "Recurring",
    invitedCount: (n) => `${n} invited`,
    applyToLabel: "Apply changes to",
    scopeSingle: "This lecture only",
    scopeFollowing: "This and following lectures",
    deleteSeriesTitle: "Delete a recurring lecture",
    deleteSeriesHelp: (title) => `"${title}" is part of a recurring series. What do you want to delete?`,
    deleteSingleBtn: "This lecture only",
    deleteFollowingBtn: "This and following lectures",
    errInvalidEmails: (list) => `Invalid email address: ${list}`,
    errInvalidRecurrence: "The repeat settings are not valid",
    errTooManyOccurrences: `Too many lectures — the maximum is ${MAX_OCCURRENCES}, within one year`,
    errScheduledInPast: "The lecture time is in the past — choose a future date and time",
    errScheduleConflict: (title, when) => `This overlaps with your lecture "${title}" (${when}). Choose a different time.`,
  },
  ar: {
    noAccess: "لا تملك صلاحية الوصول",
    mustLogin: "يجب تسجيل الدخول أولًا لعرض المحاضرات المباشرة.",
    backHome: "العودة إلى الرئيسية",
    minutes: "دقيقة",
    course: "دورة",
    savedError: "حدث خطأ، حاول مرة أخرى",
    loadError: "حدث خطأ أثناء تحميل المحاضرات، حاول مرة أخرى",
    deleteError: "حدث خطأ أثناء الحذف، حاول مرة أخرى",
    confirmDelete: (title) => `هل أنت متأكد من حذف محاضرة "${title}"؟`,
    editLecture: "تعديل المحاضرة",
    newLecture: "محاضرة مباشرة جديدة",
    courseLabel: "الدورة *",
    chooseCourse: "اختر دورة...",
    generalSession: "جلسة عامة (خارج الدورات) — تظهر لكل المسجّلين على المنصة",
    generalBadge: "جلسة عامة",
    needCourseFirst: "يجب أن تملك دورة واحدة على الأقل أولًا.",
    titleLabel: "عنوان المحاضرة *",
    titlePlaceholder: "مثلاً: مراجعة الفصل الثالث",
    descLabel: "وصف مختصر (اختياري)",
    linkLabel: "رابط الاجتماع (اختياري)",
    linkPlaceholder: "https://your-team.daily.co/room-name",
    linkHelper: "اتركه فارغًا ليتم إنشاء رابط اجتماع فيديو تلقائيًا عبر Daily، أو الصق رابط اجتماع جاهزًا بنفسك.",
    scheduledLabel: "الموعد *",
    durationLabel: "المدة (دقيقة)",
    saveChanges: "حفظ التعديلات",
    addLecture: "إضافة المحاضرة",
    cancel: "إلغاء",
    titleRequired: "عنوان المحاضرة مطلوب",
    scheduledRequired: "موعد المحاضرة مطلوب",
    chooseCourseRequired: "اختر الدورة",
    phaseLive: "جارية الآن",
    phaseUpcoming: "لم تبدأ بعد",
    phaseEnded: "انتهت",
    errInvalidLink: "رابط الاجتماع غير صالح — يجب أن يبدأ بـ http:// أو https://",
    errMissingTitle: "عنوان المحاضرة مطلوب",
    errInvalidScheduledAt: "موعد المحاضرة غير صالح",
    errForbidden: "لا تملك صلاحية التعديل أو الإضافة على هذه الدورة",
    errDailyFailed: "فشل إنشاء الاجتماع تلقائيًا عبر Daily — أرسل رابطًا يدويًا كبديل.",
    watchRecording: "شاهد التسجيل",
    noRecordingToday: "لا يوجد تسجيل متاح لمحاضرة اليوم",
    lectureEnded: "انتهت المحاضرة",
    joinMeeting: "انضم للاجتماع",
    joinOpensAt: (when) => `يفتح الدخول ${when}`,
    enterMeeting: "الدخول إلى الاجتماع",
    editTitle: "تعديل",
    deleteTitle: "حذف",
    recordingNotAvailable: "التسجيل غير متاح حاليًا، حاول مرة أخرى بعد قليل",
    back: "الرجوع",
    pageTitle: "المحاضرات المباشرة",
    pageSubtitle: "اجتماعات فيديو الدورات (Daily)",
    newLectureBtn: "محاضرة جديدة",
    noLecturesStudent: "لا توجد محاضرات مباشرة مجدولة لدوراتك حاليًا.",
    noLecturesYet: "لا توجد محاضرات مضافة بعد.",
    liveNow: "جارية الآن",
    upcoming: "قادمة",
    ended: "انتهت",
    noLiveNow: "لا توجد محاضرة جارية الآن.",
    noUpcoming: "لا توجد محاضرات قادمة مجدولة.",
    invitedLabel: "دعوة أشخاص (اختياري)",
    invitedHelper: "مستخدمو الموقع المسجّلون فقط. كل من تختاره يصله إيميل دعوة وإشعار داخل الموقع بدعوته للميتنج، ويقدر ينضم من صفحة المحاضرات المباشرة. لا يوجد حد أقصى لعدد المدعوين.",
    pickerAdd: "إضافة أشخاص",
    pickerClose: "تم",
    pickerSearch: "ابحث بالاسم أو الإيميل...",
    pickerNoResults: "لا يوجد مستخدمون",
    pickerSelectAll: "تحديد كل المعروض",
    pickerClear: "مسح الكل",
    pickerLoadMore: "عرض المزيد",
    pickerSelected: (n) => `${n} مختار`,
    errUnknownEmails: (list) => `غير مسجّلين في الموقع: ${list}`,
    repeatLabel: "التكرار",
    repeatNone: "لا يتكرر",
    repeatDaily: "يوميًا",
    repeatWeekly: "أسبوعيًا",
    repeatMonthly: "شهريًا",
    everyLabel: "كل",
    unitDay: "يوم",
    unitWeek: "أسبوع",
    unitMonth: "شهر",
    onDaysLabel: "في أيام",
    endsLabel: "ينتهي",
    endAfterCount: "بعد عدد من المحاضرات",
    endOnDate: "في تاريخ محدد",
    countLabel: "عدد المحاضرات",
    untilLabel: "آخر تاريخ",
    untilRequired: "اختر تاريخ انتهاء التكرار",
    repeatPreview: (n, first, last) => `${n} محاضرات: ${first} ← ${last}`,
    recurringBadge: "متكررة",
    invitedCount: (n) => `${n} مدعو`,
    applyToLabel: "تطبيق التعديلات على",
    scopeSingle: "هذه المحاضرة فقط",
    scopeFollowing: "هذه المحاضرة والمحاضرات التالية",
    deleteSeriesTitle: "حذف محاضرة متكررة",
    deleteSeriesHelp: (title) => `"${title}" جزء من سلسلة محاضرات متكررة. ماذا تريد أن تحذف؟`,
    deleteSingleBtn: "هذه المحاضرة فقط",
    deleteFollowingBtn: "هذه المحاضرة والمحاضرات التالية",
    errInvalidEmails: (list) => `عنوان بريد إلكتروني غير صالح: ${list}`,
    errInvalidRecurrence: "إعدادات التكرار غير صالحة",
    errTooManyOccurrences: `عدد المحاضرات كبير جدًا — الحد الأقصى ${MAX_OCCURRENCES} خلال سنة واحدة`,
    errScheduledInPast: "موعد المحاضرة في الماضي — اختر تاريخًا ووقتًا قادمًا",
    errScheduleConflict: (title, when) => `يتعارض مع محاضرتك "${title}" (${when}). اختر وقتًا آخر.`,
  },
  es: {
    noAccess: "Sin acceso",
    mustLogin: "Debes iniciar sesión primero para ver las clases en vivo.",
    backHome: "Volver al inicio",
    minutes: "min",
    course: "Curso",
    savedError: "Ocurrió un error, inténtalo de nuevo",
    loadError: "Error al cargar las clases, inténtalo de nuevo",
    deleteError: "Ocurrió un error al eliminar, inténtalo de nuevo",
    confirmDelete: (title) => `¿Seguro que quieres eliminar la clase "${title}"?`,
    editLecture: "Editar clase",
    newLecture: "Nueva clase en vivo",
    courseLabel: "Curso *",
    chooseCourse: "Elige un curso...",
    generalSession: "Sesión general (fuera de los cursos) — visible para todos en la plataforma",
    generalBadge: "Sesión general",
    needCourseFirst: "Necesitas al menos un curso primero.",
    titleLabel: "Título de la clase *",
    titlePlaceholder: "ej.: Repaso del capítulo 3",
    descLabel: "Descripción breve (opcional)",
    linkLabel: "Enlace de la reunión (opcional)",
    linkPlaceholder: "https://your-team.daily.co/room-name",
    linkHelper: "Déjalo vacío para generar un enlace de video automáticamente con Daily, o pega tu propio enlace.",
    scheduledLabel: "Fecha y hora *",
    durationLabel: "Duración (minutos)",
    saveChanges: "Guardar cambios",
    addLecture: "Agregar clase",
    cancel: "Cancelar",
    titleRequired: "El título de la clase es obligatorio",
    scheduledRequired: "La fecha y hora de la clase es obligatoria",
    chooseCourseRequired: "Elige el curso",
    phaseLive: "En vivo ahora",
    phaseUpcoming: "Próxima",
    phaseEnded: "Finalizada",
    errInvalidLink: "El enlace no es válido — debe empezar con http:// o https://",
    errMissingTitle: "El título de la clase es obligatorio",
    errInvalidScheduledAt: "La fecha y hora no es válida",
    errForbidden: "No tienes permiso para editar/agregar en este curso",
    errDailyFailed: "Falló la creación automática de la reunión vía Daily — envía un enlace manual.",
    watchRecording: "Ver grabación",
    noRecordingToday: "No hay grabación disponible para la clase de hoy",
    lectureEnded: "La clase ha finalizado",
    joinMeeting: "Unirse a la reunión",
    joinOpensAt: (when) => `Se abre ${when}`,
    enterMeeting: "Entrar a la reunión",
    editTitle: "Editar",
    deleteTitle: "Eliminar",
    recordingNotAvailable: "La grabación no está disponible ahora, inténtalo en un momento",
    back: "Volver",
    pageTitle: "Clases en vivo",
    pageSubtitle: "Videollamadas de los cursos (Daily)",
    newLectureBtn: "Nueva clase",
    noLecturesStudent: "No hay clases en vivo programadas para tus cursos ahora.",
    noLecturesYet: "Aún no se han agregado clases.",
    liveNow: "En vivo ahora",
    upcoming: "Próximas",
    ended: "Finalizadas",
    noLiveNow: "No hay ninguna clase en vivo ahora mismo.",
    noUpcoming: "No hay próximas clases programadas.",
    invitedLabel: "Invitar personas (opcional)",
    invitedHelper: "Solo personas registradas en la plataforma. Todos los que selecciones reciben una invitación por correo y una notificación en el sitio, y pueden unirse desde Clases en vivo. Sin límite de invitados.",
    pickerAdd: "Agregar personas",
    pickerClose: "Listo",
    pickerSearch: "Buscar por nombre o correo...",
    pickerNoResults: "No se encontraron usuarios",
    pickerSelectAll: "Seleccionar todos los mostrados",
    pickerClear: "Borrar todo",
    pickerLoadMore: "Cargar más",
    pickerSelected: (n) => `${n} seleccionados`,
    errUnknownEmails: (list) => `No registrados en la plataforma: ${list}`,
    repeatLabel: "Repetir",
    repeatNone: "No se repite",
    repeatDaily: "Diariamente",
    repeatWeekly: "Semanalmente",
    repeatMonthly: "Mensualmente",
    everyLabel: "Cada",
    unitDay: "día(s)",
    unitWeek: "semana(s)",
    unitMonth: "mes(es)",
    onDaysLabel: "Los días",
    endsLabel: "Termina",
    endAfterCount: "Después de un número de clases",
    endOnDate: "En una fecha",
    countLabel: "Número de clases",
    untilLabel: "Última fecha",
    untilRequired: "Elige la fecha en que termina la repetición",
    repeatPreview: (n, first, last) => `${n} clases: ${first} → ${last}`,
    recurringBadge: "Recurrente",
    invitedCount: (n) => `${n} invitados`,
    applyToLabel: "Aplicar cambios a",
    scopeSingle: "Solo esta clase",
    scopeFollowing: "Esta y las siguientes clases",
    deleteSeriesTitle: "Eliminar una clase recurrente",
    deleteSeriesHelp: (title) => `"${title}" forma parte de una serie recurrente. ¿Qué quieres eliminar?`,
    deleteSingleBtn: "Solo esta clase",
    deleteFollowingBtn: "Esta y las siguientes clases",
    errInvalidEmails: (list) => `Correo electrónico no válido: ${list}`,
    errInvalidRecurrence: "La configuración de repetición no es válida",
    errTooManyOccurrences: `Demasiadas clases — el máximo es ${MAX_OCCURRENCES}, dentro de un año`,
    errScheduledInPast: "La hora de la clase ya pasó — elige una fecha y hora futuras",
    errScheduleConflict: (title, when) => `Se solapa con tu clase "${title}" (${when}). Elige otra hora.`,
  },
};

function Blocked({ t }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Video className="text-red-400" size={30} />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{t.noAccess}</h2>
      <p className="text-gray-400 mb-4">{t.mustLogin}</p>
      <Link href="/" className="text-[#003A91] font-semibold hover:underline">
        {t.backHome}
      </Link>
    </div>
  );
}

function formatDateTime(dateStr, language) {
  try {
    return new Date(dateStr).toLocaleString(LOCALE_MAP[language] || "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateStr;
  }
}

// "yyyy-MM-ddTHH:mm" — الصيغة اللي محتاجها <input type="datetime-local">
function toLocalInputValue(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 🆕 مفيش status مخزّن في الداتابيز عن قصد (شوف تعليق Meeting.js) — الحالة
// محسوبة لحظيًا من scheduledAt + durationMinutes مقابل الوقت الحالي.
// بيرجع "ended" افتراضيًا لو الوقت عدّى — بيتصحّح بعدين بـ presenceOverrides
// (شوف usePresenceOverrides تحت) لو المدرس مدّ المحاضرة فعليًا.
// 🔧 (نُقلت لـ app/lib/meetingPhase.js — قابلة للاختبار ولإعادة الاستخدام،
// شوف getPhase/resolvePhase المستوردة فوق.)

/**
 * 🆕 بيحل مشكلة "حساب حالة خلصت مش دقيق لو المحاضرة اتمدت" — للمحاضرات
 * اللي حسابها الوقتي طلع "ended" حديثًا (خلال آخر ساعتين) ومصدرها Daily،
 * بنسأل السيرفر (GET /api/meetings/[id]/presence) هل فيه حد داخل الغرفة
 * فعليًا دلوقتي. لو آه، بنعاملها كـ"live" برضه رغم إن الوقت المكتوب عدّى.
 */
function usePresenceOverrides(meetings, tick = 0) {
  const [overrides, setOverrides] = useState({}); // { [meetingId]: boolean }
  // 🔁 إعادة الفحص كل ~60 ثانية (كل tickين) — قبل كده كان بيتفحص مرة واحدة بس مع تحميل
  // القائمة، فمحاضرة بتخلص والصفحة مفتوحة ماكانتش بتتفحص للتمديد، وواحدة اتمدت
  // ماكانتش بتتقفل لما الناس تخرج.
  const recheck = Math.floor(tick / 2);

  useEffect(() => {
    if (!meetings || meetings.length === 0) return;
    const candidates = meetings.filter((m) => isPresenceCheckCandidate(m));
    if (candidates.length === 0) return;

    let cancelled = false;
    Promise.all(
      candidates.map((m) =>
        fetch(`/api/meetings/${m.id}/presence`)
          .then((r) => (r.ok ? r.json() : { active: false }))
          .then((data) => [m.id, Boolean(data?.active)])
          .catch(() => [m.id, false])
      )
    ).then((results) => {
      if (cancelled) return;
      setOverrides((prev) => {
        const next = { ...prev };
        for (const [id, active] of results) next[id] = active;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // بنعيد الفحص كل ما قائمة الاجتماعات تتغيّر (تحميل جديد) أو كل ~60 ثانية (recheck).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings, recheck]);

  return overrides;
}

// 🔧 (resolvePhase نُقلت لـ app/lib/meetingPhase.js — مستوردة فوق.)

function getPhaseMeta(t) {
  return {
    live: { label: t.phaseLive, className: "bg-red-100 text-red-700" },
    upcoming: { label: t.phaseUpcoming, className: "bg-[#D7E0EE] text-[#002E74]" },
    ended: { label: t.phaseEnded, className: "bg-gray-100 text-gray-500" },
  };
}

function getSaveErrorMessages(t) {
  return {
    invalid_link: t.errInvalidLink,
    missing_title: t.errMissingTitle,
    invalid_scheduled_at: t.errInvalidScheduledAt,
    forbidden: t.errForbidden,
    daily_meeting_failed: t.errDailyFailed,
    invalid_recurrence: t.errInvalidRecurrence,
    too_many_occurrences: t.errTooManyOccurrences,
    scheduled_in_past: t.errScheduledInPast,
  };
}

const GENERAL_COURSE_VALUE = "general";

// 🆕 منتقي المدعوين — بيعرض مستخدمي الموقع المسجّلين بس (GET /api/meetings/invitees)
// وبيسمح باختيار أي عدد منهم (مفيش حد أقصى). كل مدعو بيوصله إيميل دعوة عن طريق
// Resend + إشعار داخل الموقع بعد الحفظ. القائمة بتتحمّل على دفعات (بحث + "عرض المزيد")،
// و"تحديد كل المعروض" بيضيف الدفعة الظاهرة قدامك.
function InviteePicker({ selected, onChange, t }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const load = useCallback(async (q, skip) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/invitees?q=${encodeURIComponent(q)}&skip=${skip}&limit=30`);
      const data = await res.json().catch(() => ({}));
      if (id !== requestId.current) return; // رد قديم — اتجاهله
      const users = Array.isArray(data?.users) ? data.users : [];
      setResults((prev) => (skip === 0 ? users : [...prev, ...users]));
      setHasMore(Boolean(data?.hasMore));
    } catch {
      if (id === requestId.current && skip === 0) {
        setResults([]);
        setHasMore(false);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // بحث مع debounce بسيط، وبيشتغل بس والمنتقي مفتوح.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => load(query.trim(), 0), 300);
    return () => clearTimeout(timer);
  }, [query, open, load]);

  function toggle(email) {
    onChange(selectedSet.has(email) ? selected.filter((e) => e !== email) : [...selected, email]);
  }

  function selectAllShown() {
    const merged = new Set(selected);
    results.forEach((u) => merged.add(u.email));
    onChange([...merged]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-600">{t.pickerSelected(selected.length)}</span>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="text-xs text-red-500 hover:underline">
              {t.pickerClear}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-[#003A91] border border-[#003A91] rounded-lg px-3 py-1 hover:bg-[#EBEFF6]"
          >
            {open ? t.pickerClose : t.pickerAdd}
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border border-gray-200 rounded-xl p-2">
          {selected.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 bg-[#EBEFF6] text-[#003A91] text-[11px] font-semibold rounded-full pl-2.5 pr-1.5 py-1 dir-ltr"
            >
              {email}
              <button type="button" onClick={() => toggle(email)} className="hover:text-red-600" aria-label="remove">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.pickerSearch}
            />
            <button
              type="button"
              onClick={selectAllShown}
              disabled={results.length === 0}
              className="text-xs font-semibold text-[#003A91] hover:underline disabled:opacity-40 shrink-0"
            >
              {t.pickerSelectAll}
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {results.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={selectedSet.has(u.email)} onChange={() => toggle(u.email)} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-700 truncate">{u.name || u.email}</span>
                  <span className="block text-xs text-gray-400 truncate dir-ltr text-left">{u.email}</span>
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{u.role}</span>
              </label>
            ))}
            {loading && (
              <div className="flex justify-center py-3">
                <Loader size={16} className="animate-spin text-gray-400" />
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">{t.pickerNoResults}</p>
            )}
            {!loading && hasMore && (
              <button
                type="button"
                onClick={() => load(query.trim(), results.length)}
                className="w-full text-xs font-semibold text-[#003A91] py-2.5 hover:bg-gray-50"
              >
                {t.pickerLoadMore}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// 🔁 قاعدة التكرار اللي بتتبعت للسيرفر (وبتتحسب بيها المعاينة) — شوف
// app/lib/meetingRecurrence.js. weekly من غير أيام مختارة = يوم أول محاضرة.
function buildRecurrence(form, startDow) {
  if (form.repeat === "none") return null;
  const days = form.daysOfWeek.length > 0 ? form.daysOfWeek : [startDow];
  return {
    frequency: form.repeat,
    interval: Number(form.interval) || 1,
    daysOfWeek: form.repeat === "weekly" ? days : [],
    endType: form.endType,
    count: Number(form.count),
    until: form.until,
  };
}

function MeetingFormModal({ meeting, courses, onClose, onSaved, t, language }) {
  const SAVE_ERROR_MESSAGES = getSaveErrorMessages(t);
  const isEdit = Boolean(meeting);
  const isSeriesEdit = isEdit && Boolean(meeting.seriesId);
  const timeZone = useMemo(() => getBrowserTimeZone(), []);
  const [form, setForm] = useState({
    course: meeting?.course || courses[0]?.id || "",
    title: meeting?.title || "",
    description: meeting?.description || "",
    link: meeting?.link || "",
    scheduledAt: meeting ? toLocalInputValue(meeting.scheduledAt) : "",
    durationMinutes: meeting?.durationMinutes ?? 60,
    // 🆕 المدعوين — إيميلات مستخدمين مسجّلين (بيتختاروا من InviteePicker، بدون حد أقصى).
    invitedEmails: meeting?.invitedEmails || [],
    // 🆕 التكرار (عند الإنشاء بس)
    repeat: "none", // none | daily | weekly | monthly
    interval: 1,
    daysOfWeek: [],
    endType: "count", // count | until
    count: 10,
    until: "",
    // 🆕 نطاق التعديل لمحاضرة ضمن سلسلة
    scope: "single", // single | following
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const startDate = form.scheduledAt ? new Date(form.scheduledAt) : null;
  const startValid = Boolean(startDate) && !Number.isNaN(startDate.getTime());
  const startDow = startValid ? startDate.getDay() : 0;
  const effectiveDays = form.daysOfWeek.length > 0 ? form.daysOfWeek : [startDow];

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(LOCALE_MAP[language] || "en-US", { weekday: "short", timeZone: "UTC" });
    // 2023-01-01 كان يوم أحد → 0 = الأحد زي Date.getDay().
    return WEEKDAY_INDEXES.map((d) => fmt.format(new Date(Date.UTC(2023, 0, 1 + d))));
  }, [language]);

  function toggleDay(day) {
    const next = effectiveDays.includes(day) ? effectiveDays.filter((d) => d !== day) : [...effectiveDays, day];
    if (next.length === 0) return; // لازم يوم واحد على الأقل
    update("daysOfWeek", next.sort((a, b) => a - b));
  }

  const recurrence = !isEdit ? buildRecurrence(form, startDow) : null;
  const recurrenceKey = JSON.stringify(recurrence);
  // معاينة فورية للمواعيد الناتجة (نفس دالة السيرفر بالظبط → مفيش اختلاف).
  const preview = useMemo(() => {
    if (!recurrence || !startValid) return null;
    if (form.endType === "until" && !form.until) return null;
    return expandRecurrence({ startDate, recurrence, timeZone });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurrenceKey, form.scheduledAt, timeZone]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) return setError(t.titleRequired);
    // 🆕 اللينك بقى اختياري هنا — لو Daily مفعّل على السيرفر، الرابط
    // هيتولد تلقائيًا. لو مش مفعّل والباك إند رفض الطلب، هيوصلنا خطأ
    // invalid_link واضح (شوف SAVE_ERROR_MESSAGES).
    if (!form.scheduledAt) return setError(t.scheduledRequired);
    if (!isEdit && !form.course) return setError(t.chooseCourseRequired);
    if (recurrence && form.endType === "until" && !form.until) return setError(t.untilRequired);
    if (preview?.error) return setError(SAVE_ERROR_MESSAGES[preview.error] || t.savedError);

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        link: form.link.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60,
        invitedEmails: form.invitedEmails,
        timeZone,
      };

      if (isEdit) {
        // 🔒 اللينك بيتبعت بس لو المدرس غيّره فعلًا — وإلا تعديل "هذه والتالية"
        // كان ممكن يطبّق لينك الغرفة دي على باقي السلسلة (شوف PUT في
        // app/api/meetings/[id]/route.js).
        if (payload.link === meeting.link) delete payload.link;
        payload.scope = isSeriesEdit ? form.scope : "single";
      } else if (recurrence) {
        payload.recurrence = recurrence;
      }

      // 🆕 "general" = جلسة عامة برا الكورسات (بتظهر لكل المسجّلين على المنصة)
      const url = isEdit
        ? `/api/meetings/${meeting.id}`
        : form.course === GENERAL_COURSE_VALUE
        ? "/api/meetings"
        : `/api/courses/${form.course}/meetings`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.error || "save_failed");
        err.invalid = data?.invalid;
        err.conflict = data?.conflict;
        throw err;
      }

      if (data?.warning) alert(data.warning);
      onSaved();
    } catch (err) {
      if (
        (err.message === "invalid_emails" || err.message === "unknown_emails") &&
        Array.isArray(err.invalid) &&
        err.invalid.length > 0
      ) {
        const list = err.invalid.slice(0, 5).join(", ") + (err.invalid.length > 5 ? ` +${err.invalid.length - 5}` : "");
        setError(err.message === "unknown_emails" ? t.errUnknownEmails(list) : t.errInvalidEmails(list));
      } else if (err.message === "schedule_conflict" && err.conflict?.title) {
        setError(t.errScheduleConflict(err.conflict.title, formatDateTime(err.conflict.scheduledAt, language)));
      } else {
        setError(SAVE_ERROR_MESSAGES[err.message] || t.savedError);
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5279B4]";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEdit ? t.editLecture : t.newLecture}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.courseLabel}</label>
              <select
                className={inputCls}
                value={form.course}
                onChange={(e) => update("course", e.target.value)}
                required
              >
                <option value="">{t.chooseCourse}</option>
                <option value={GENERAL_COURSE_VALUE}>{t.generalSession}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {form.course === GENERAL_COURSE_VALUE && (
                <p className="text-xs text-[#5279B4] mt-1.5">{t.generalSession}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.titleLabel}</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder={t.titlePlaceholder}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.descLabel}</label>
            <textarea
              rows={2}
              className={inputCls}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.linkLabel}</label>
            <input
              type="url"
              className={`${inputCls} dir-ltr text-left`}
              value={form.link}
              onChange={(e) => update("link", e.target.value)}
              placeholder={t.linkPlaceholder}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {t.linkHelper}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Mail size={14} /> {t.invitedLabel}
            </label>
            <InviteePicker selected={form.invitedEmails} onChange={(v) => update("invitedEmails", v)} t={t} />
            <p className="text-xs text-gray-400 mt-1.5">{t.invitedHelper}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.scheduledLabel}</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.scheduledAt}
                onChange={(e) => update("scheduledAt", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.durationLabel}</label>
              <input
                type="number"
                min={5}
                max={480}
                className={inputCls}
                value={form.durationMinutes}
                onChange={(e) => update("durationMinutes", e.target.value)}
              />
            </div>
          </div>

          {/* 🔁 التكرار — عند الإنشاء بس (تعديل قاعدة سلسلة موجودة = احذفها وأنشئ جديدة) */}
          {!isEdit && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                  <Repeat size={14} /> {t.repeatLabel}
                </label>
                <select className={inputCls} value={form.repeat} onChange={(e) => update("repeat", e.target.value)}>
                  <option value="none">{t.repeatNone}</option>
                  <option value="daily">{t.repeatDaily}</option>
                  <option value="weekly">{t.repeatWeekly}</option>
                  <option value="monthly">{t.repeatMonthly}</option>
                </select>
              </div>

              {form.repeat !== "none" && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">{t.everyLabel}</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="w-20 border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#5279B4]"
                      value={form.interval}
                      onChange={(e) => update("interval", e.target.value)}
                    />
                    <span className="text-sm text-gray-600">
                      {form.repeat === "daily" ? t.unitDay : form.repeat === "weekly" ? t.unitWeek : t.unitMonth}
                    </span>
                  </div>

                  {form.repeat === "weekly" && (
                    <div>
                      <span className="block text-sm font-semibold text-gray-700 mb-1.5">{t.onDaysLabel}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_INDEXES.map((d) => {
                          const on = effectiveDays.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDay(d)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                on
                                  ? "bg-[#003A91] text-white border-[#003A91]"
                                  : "bg-white text-gray-600 border-gray-300 hover:border-[#5279B4]"
                              }`}
                            >
                              {weekdayLabels[d]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.endsLabel}</label>
                      <select
                        className={inputCls}
                        value={form.endType}
                        onChange={(e) => update("endType", e.target.value)}
                      >
                        <option value="count">{t.endAfterCount}</option>
                        <option value="until">{t.endOnDate}</option>
                      </select>
                    </div>
                    <div>
                      {form.endType === "count" ? (
                        <>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.countLabel}</label>
                          <input
                            type="number"
                            min={2}
                            max={MAX_OCCURRENCES}
                            className={inputCls}
                            value={form.count}
                            onChange={(e) => update("count", e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.untilLabel}</label>
                          <input
                            type="date"
                            className={inputCls}
                            value={form.until}
                            onChange={(e) => update("until", e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {preview?.dates && preview.dates.length > 0 && (
                    <p className="text-xs text-[#003A91] bg-[#EBEFF6] rounded-lg px-3 py-2">
                      {t.repeatPreview(
                        preview.dates.length,
                        formatDateTime(preview.dates[0], language),
                        formatDateTime(preview.dates[preview.dates.length - 1], language)
                      )}
                    </p>
                  )}
                  {preview?.error && (
                    <p className="text-xs text-red-600">{SAVE_ERROR_MESSAGES[preview.error] || t.savedError}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 🔁 نطاق التعديل لمحاضرة ضمن سلسلة متكررة */}
          {isSeriesEdit && (
            <div className="rounded-xl border border-gray-200 p-4">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                <Repeat size={14} /> {t.applyToLabel}
              </span>
              {[
                ["single", t.scopeSingle],
                ["following", t.scopeFollowing],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
                  <input
                    type="radio"
                    name="meeting-scope"
                    value={value}
                    checked={form.scope === value}
                    onChange={() => update("scope", value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader size={18} className="animate-spin" />}
              {isEdit ? t.saveChanges : t.addLecture}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 🆕 نافذة اختيار نطاق الحذف لمحاضرة ضمن سلسلة متكررة (زي Teams).
function DeleteScopeModal({ meeting, busy, onChoose, onClose, t }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{t.deleteSeriesTitle}</h3>
        <p className="text-sm text-gray-500 mb-5">{t.deleteSeriesHelp(meeting.title)}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("single")}
            className="py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:border-red-400 hover:text-red-600 disabled:opacity-60"
          >
            {t.deleteSingleBtn}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onChoose("following")}
            className="py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {t.deleteFollowingBtn}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="py-2.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-50"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MeetingCard({ meeting, canManage, showTeacher, onEdit, onDelete, onJoinEmbedded, busy, phase, isTeacherView, t, language }) {
  const meta = getPhaseMeta(t)[phase];
  const isDaily = meeting.source === "daily";
  const hasRecordings = Array.isArray(meeting.recordings) && meeting.recordings.length > 0;
  const [openingRecordingId, setOpeningRecordingId] = useState(null);
  const [recordingError, setRecordingError] = useState("");

  async function handleWatchRecording(recordingId) {
    setRecordingError("");
    setOpeningRecordingId(recordingId);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/recordings/${recordingId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setRecordingError(t.recordingNotAvailable);
    } finally {
      setOpeningRecordingId(null);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#003A91] bg-[#EBEFF6] px-2.5 py-1 rounded-full">
          <BookOpen size={12} /> {meeting.isGeneral ? t.generalBadge : meeting.courseTitle || t.course}
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${meta.className}`}>
          {phase === "live" && <Radio size={11} className="animate-pulse" />}
          {meta.label}
        </span>
      </div>

      <h3 className="font-bold text-gray-800 mb-1">{meeting.title}</h3>
      {meeting.description && <p className="text-sm text-gray-500 mb-3">{meeting.description}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <Calendar size={13} /> {formatDateTime(meeting.scheduledAt, language)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={13} /> {meeting.durationMinutes} {t.minutes}
        </span>
        {showTeacher && meeting.teacherName && (
          <span className="flex items-center gap-1">
            <User size={13} /> {meeting.teacherName}
          </span>
        )}
        {meeting.seriesId && (
          <span className="flex items-center gap-1 text-[#003A91]">
            <Repeat size={13} /> {t.recurringBadge}
            {meeting.seriesIndex ? ` #${meeting.seriesIndex}` : ""}
          </span>
        )}
        {canManage && meeting.invitedCount > 0 && (
          <span className="flex items-center gap-1">
            <Mail size={13} /> {t.invitedCount(meeting.invitedCount)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {phase === "ended" ? (
          hasRecordings ? (
            <div className="flex-1 flex flex-col gap-1.5">
              {meeting.recordings.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  disabled={openingRecordingId === rec.id}
                  onClick={() => handleWatchRecording(rec.id)}
                  className="flex items-center justify-center gap-2 bg-gray-800 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-900 disabled:opacity-60"
                >
                  {openingRecordingId === rec.id ? (
                    <Loader size={15} className="animate-spin" />
                  ) : (
                    <Film size={15} />
                  )}
                  {t.watchRecording}
                </button>
              ))}
              {recordingError && <p className="text-[11px] text-red-500 text-center">{recordingError}</p>}
            </div>
          ) : (
            <div className="flex-1 text-center text-xs text-gray-400 py-2.5">
              {isDaily ? t.noRecordingToday : t.lectureEnded}
            </div>
          )
        ) : isDaily ? (
          // 🆕 اجتماع Daily — بيتشغّل مضمّن جوه الموقع (شوف DailyMeetingModal)
          // بدل ما يفتح تاب خارجي.
          // 🕐 الغرفة بتفتح قبل المعاد بربع ساعة (شوف canJoinNow) — قبلها نوري الوقت بدل
          // زرار بيطلع بخطأ.
          canJoinNow(meeting) || phase === "live" ? (
            <button
              type="button"
              onClick={() => onJoinEmbedded(meeting)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90"
            >
              <PlayCircle size={15} /> {t.joinMeeting}
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-500 text-sm font-semibold py-2.5 rounded-xl cursor-not-allowed">
              <Clock size={15} /> {t.joinOpensAt(formatDateTime(getJoinOpensAt(meeting), language))}
            </div>
          )
        ) : (
          // 🆕 لينك يدوي (منصة تانية غير Daily) — مفيش SDK نضمّنه بيه، فبيفتح
          // في تاب جديد عادي.
          <a
            href={meeting.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90"
          >
            <ExternalLink size={15} /> {t.enterMeeting}
          </a>
        )}
        {canManage && (
          <>
            <button
              onClick={() => onEdit(meeting)}
              title={t.editTitle}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-[#5279B4] hover:text-[#003A91]"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(meeting)}
              disabled={busy}
              title={t.deleteTitle}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600 disabled:opacity-60"
            >
              {busy ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MeetingSection({ title, meetings, canManage, showTeacher, onEdit, onDelete, onJoinEmbedded, busyId, emptyText, getMeetingPhase, isTeacherView, t, language }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
        {title} <span className="text-gray-300">({meetings.length})</span>
      </h2>
      {meetings.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-8 text-center text-sm text-gray-400">
          {emptyText}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              canManage={canManage(m)}
              showTeacher={showTeacher}
              onEdit={onEdit}
              onDelete={onDelete}
              onJoinEmbedded={onJoinEmbedded}
              busy={busyId === m.id}
              phase={getMeetingPhase(m)}
              isTeacherView={isTeacherView}
              t={t}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MeetPage() {
  const { data: session, status } = useSession();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const [meetings, setMeetings] = useState(null);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  // undefined = مقفول | null = فورم إضافة | object = فورم تعديل
  const [modalMeeting, setModalMeeting] = useState(undefined);
  const [busyId, setBusyId] = useState(null);
  // 🆕 محاضرة ضمن سلسلة المدرس عايز يحذفها (بيفتح DeleteScopeModal) — null = مقفول.
  const [deleteTarget, setDeleteTarget] = useState(null);
  // 🆕 الاجتماع اللي المستخدم داخل عليه دلوقتي (مضمّن جوه الموقع) — null = مفيش.
  const [joinedMeeting, setJoinedMeeting] = useState(null);
  // 🆕 tick بسيط كل 30 ثانية عشان شارة "جارية الآن/لم تبدأ بعد/خلصت" تتحدث
  // لوحدها وهي الصفحة مفتوحة (getPhase بيحسب من Date.now() وقت الـ render،
  // فمن غيره الشارة كانت بتفضل واقفة على أول حالة لحد ما اليوزر يعمل أي
  // حاجة تسبب re-render).
  const [tick, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const loadMeetings = useCallback(() => {
    setError("");
    // 🆕 نفس مبدأ timeout بتاع DailyMeetingModal — بيمنع الصفحة من الوقوف
    // على "جاري التحميل" للأبد لو السيرفر بطيء جدًا أو الشبكة معلّقة جزئيًا.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    fetch("/api/meetings", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setMeetings(Array.isArray(data?.meetings) ? data.meetings : []))
      .catch(() => setError(t.loadError))
      .finally(() => clearTimeout(timeoutId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadMeetings();
  }, [status, loadMeetings]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "teacher" && role !== "admin") return;
    // 🆕 محتاجينها بس لملء dropdown "اختر دورة" في فورم الإضافة — GET
    // /api/courses أصلاً بيرجّع دورات المدرس نفسه (كل الحالات) أو كل
    // الدورات لو أدمن (شوف app/api/courses/route.js GET).
    fetch("/api/courses?limit=100")
      .then((r) => r.json())
      .then((data) => setCourses(Array.isArray(data?.courses) ? data.courses : []))
      .catch(() => setCourses([]));
  }, [status, role]);

  // 🆕 محاضرة ضمن سلسلة متكررة → نافذة اختيار النطاق (هذه فقط / هذه والتالية)،
  // وإلا تأكيد عادي زي الأول.
  function handleDelete(meeting) {
    if (meeting.seriesId) {
      setDeleteTarget(meeting);
      return;
    }
    if (!confirm(t.confirmDelete(meeting.title))) return;
    performDelete(meeting, "single");
  }

  async function performDelete(meeting, scope) {
    setBusyId(meeting.id);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}${scope === "following" ? "?scope=following" : ""}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      const removed = new Set(Array.isArray(data?.ids) && data.ids.length > 0 ? data.ids : [meeting.id]);
      setMeetings((prev) => prev.filter((m) => !removed.has(m.id)));
    } catch {
      alert(t.deleteError);
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  function handleSaved() {
    setModalMeeting(undefined);
    loadMeetings();
  }

  // 🔧 FIX (Rules of Hooks): لازم ننادي usePresenceOverrides في كل render
  // بنفس الترتيب، حتى لو الصفحة لسه "loading" أو المستخدم مش مسجّل دخول.
  // قبل كده كان النداء ده تحت الـ early returns (status === "loading" /
  // "unauthenticated")، فأول render (لما status="loading") الهوك ده مكنش
  // بينادى خالص، وبعدين لما status يبقى "authenticated" فجأة بينادى —
  // فعدد الـ Hooks بيتغيّر بين الرندرين وده اللي بيكسر React ("Rendered
  // more hooks than during the previous render"). الحل: ننقل النداء لفوق
  // قبل أي return، عشان يتنادي دايمًا بغض النظر عن status.
  const presenceOverrides = usePresenceOverrides(meetings, tick);
  const getMeetingPhase = (m) => resolvePhase(m, presenceOverrides);

  // 🆕 PERFORMANCE: نفس مبدأ الفيكس فوق — useMemo لازم يتنادي دايمًا قبل أي
  // early return (Rules of Hooks)، ومكسبها هنا حقيقي: forceTick بيعمل
  // re-render كل 30 ثانية عشان الشارات تتحدث، وكان ده بيسبب إعادة فلترة +
  // ترتيب قائمة الاجتماعات بالكامل (grouped) في كل مرة حتى لو الاجتماعات
  // نفسها متغيّرتش خالص. useMemo بيحسبها بس لما meetings أو presenceOverrides
  // يتغيّروا فعليًا، مش على كل tick.
  const grouped = useMemo(() => {
    const g = { live: [], upcoming: [], ended: [] };
    (meetings || []).forEach((m) => g[resolvePhase(m, presenceOverrides)].push(m));
    g.ended.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    return g;
    // 🔧 FIX: الـ tick لازم يكون dependency — الحالة بتتحسب من Date.now()، ومن غيره كانت
    // المحاضرة بتفضل في قسم "قادمة" بعد ما تبدأ، وفي "جارية" بعد ما تخلص، لحد ريلود.
    // التكلفة صغيرة (فلترة + ترتيب كل 30 ثانية بس).
  }, [meetings, presenceOverrides, tick]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span aria-hidden="true" className="block" style={{ height: 40 }} />
      </div>
    );
  }

  if (status === "unauthenticated") return <Blocked t={t} />;

  const dashboardHref = role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";
  const canCreate = role === "teacher" || role === "admin";
  // أدمن يقدر يدير أي اجتماع (isOwnerOrAdmin في الـ API)، مدرس بس اجتماعاته هو.
  const canManage = (meeting) => role === "admin" || (role === "teacher" && meeting.teacher === userId);


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href={dashboardHref}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-[#5279B4] hover:text-[#003A91] bg-white"
              title={t.back}
            >
              <ArrowRight size={18} />
            </Link>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003A91] to-[#003A91] flex items-center justify-center">
              <Video className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">{t.pageTitle}</h1>
              <p className="text-sm text-gray-400">{t.pageSubtitle}</p>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setModalMeeting(null)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90"
            >
              <Plus size={18} /> {t.newLectureBtn}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {meetings === null && !error ? (
          <div className="flex justify-center py-20">
            <span aria-hidden="true" className="block" style={{ height: 36 }} />
          </div>
        ) : meetings?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <Video className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">
              {role === "student" ? t.noLecturesStudent : t.noLecturesYet}
            </p>
          </div>
        ) : (
          <>
            <MeetingSection
              title={t.liveNow}
              meetings={grouped.live}
              canManage={canManage}
              showTeacher={role === "admin"}
              onEdit={setModalMeeting}
              onDelete={handleDelete}
              onJoinEmbedded={setJoinedMeeting}
              busyId={busyId}
              emptyText={t.noLiveNow}
              getMeetingPhase={getMeetingPhase}
              isTeacherView={role === "teacher" || role === "admin"}
              t={t}
              language={language}
            />
            <MeetingSection
              title={t.upcoming}
              meetings={grouped.upcoming}
              canManage={canManage}
              showTeacher={role === "admin"}
              onEdit={setModalMeeting}
              onDelete={handleDelete}
              onJoinEmbedded={setJoinedMeeting}
              busyId={busyId}
              emptyText={t.noUpcoming}
              getMeetingPhase={getMeetingPhase}
              isTeacherView={role === "teacher" || role === "admin"}
              t={t}
              language={language}
            />
            {grouped.ended.length > 0 && (
              <MeetingSection
                title={t.ended}
                meetings={grouped.ended}
                canManage={canManage}
                showTeacher={role === "admin"}
                onEdit={setModalMeeting}
                onDelete={handleDelete}
                onJoinEmbedded={setJoinedMeeting}
                busyId={busyId}
                emptyText=""
                getMeetingPhase={getMeetingPhase}
                isTeacherView={role === "teacher" || role === "admin"}
                t={t}
                language={language}
              />
            )}
          </>
        )}
      </div>

      {modalMeeting !== undefined && (
        <MeetingFormModal
          meeting={modalMeeting}
          courses={courses}
          onClose={() => setModalMeeting(undefined)}
          onSaved={handleSaved}
          t={t}
          language={language}
        />
      )}

      {deleteTarget && (
        <DeleteScopeModal
          meeting={deleteTarget}
          busy={busyId === deleteTarget.id}
          onChoose={(scope) => performDelete(deleteTarget, scope)}
          onClose={() => setDeleteTarget(null)}
          t={t}
        />
      )}

      {joinedMeeting && (
        <DailyMeetingModal
          meetingId={joinedMeeting.id}
          title={joinedMeeting.title}
          onClose={() => setJoinedMeeting(null)}
          isTeacher={role === "teacher" || role === "admin"}
        />
      )}
    </div>
  );
}