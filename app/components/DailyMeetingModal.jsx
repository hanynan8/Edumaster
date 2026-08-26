"use client";

// app/components/DailyMeetingModal.jsx
//
// 🆕 مودال بيشغّل اجتماع Daily.co مضمّن جوه الموقع (embedded iframe) بدل ما
// يفتح تاب خارجي. بيتستخدم من app/meet/page.jsx لما يوزر يدوس "انضم
// للاجتماع" على محاضرة مصدرها Daily.
//
// دورة الحياة كاملة:
//   1) fetchToken  → GET /api/meetings/[id]/token (بيتحقق من صلاحية
//      الدخول الفعلية على السيرفر ويرجّع meeting token قصير العمر — الغرفة
//      نفسها "private" فمعرفة الرابط لوحدها مش كافية، شوف app/lib/daily.js).
//   2) connecting  → تحميل @daily-co/daily-js (dynamic import، عشان الحزمة
//      دي مش محتاجينها إلا وقت فعلي فتح المودال) وعمل join بالتوكن.
//   3) joined      → الاجتماع شغال؛ بنراقب جودة الشبكة وعدد الحاضرين.
//   4) reconnecting → Daily نفسها بتحاول تعيد الاتصال تلقائيًا وقت انقطاع
//      شبكة مؤقت؛ بنعرض شريط تنبيه بس من غير ما نقفل المودال أو نفقد
//      الحالة، عشان اليوزر ميحسّش إن المحاضرة "وقعت" لأول تقطيعة نت.
//   5) error       → فشل حقيقي (رفض توكن، فشل شبكة كامل، ...) مع زرار
//      "إعادة المحاولة" بدل ما يقفل المودال ويفتحه تاني يدويًا.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader,
  AlertCircle,
  X,
  WifiOff,
  Users,
  Maximize,
  Minimize,
  RefreshCw,
  Video,
  Mic,
  VideoOff,
  MicOff,
  Hourglass,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل نصوص المودال كانت عربي ثابت بالكامل مهما كانت اللغة المختارة من
// الناف بار. دلوقتي كل النصوص (رسائل الرفض، حالات الاتصال، أزرار التحكم)
// بتتبع useLanguage() زي باقي المشروع.
const FORBIDDEN_REASONS = {
  enrollment_cancelled: {
    message: {
      en: "Your enrollment in this course was cancelled, so you can't join the meeting.",
      ar: "تسجيلك في الكورس ده اتلغى، فمش تقدر تدخل المحاضرة.",
      es: "Tu inscripción en este curso fue cancelada, por lo que no puedes unirte a la clase.",
    },
    actionLabel: { en: "Contact support", ar: "تواصل مع الدعم", es: "Contactar soporte" },
    actionHref: "/contact",
  },
  membership_expired: {
    message: {
      en: "Your subscription has expired — renew it to join meetings again.",
      ar: "اشتراكك انتهى — جدّد اشتراكك عشان ترجع تقدر تدخل المحاضرات.",
      es: "Tu suscripción venció — renuévala para volver a unirte a las clases.",
    },
    actionLabel: { en: "Renew subscription", ar: "تجديد الاشتراك", es: "Renovar suscripción" },
    actionHref: "/membership",
  },
  membership_plan_excludes_course: {
    message: {
      en: "Your current plan doesn't cover this course — upgrade to a broader plan.",
      ar: "خطة اشتراكك الحالية متغطيش الكورس ده — ترقّى لخطة أشمل.",
      es: "Tu plan actual no incluye este curso — mejora a un plan más amplio.",
    },
    actionLabel: { en: "Subscription plans", ar: "خطط الاشتراك", es: "Planes de suscripción" },
    actionHref: "/membership",
  },
  not_enrolled: {
    message: {
      en: "You need to be enrolled in this course first to join the meeting.",
      ar: "لازم تكون مسجّل في الكورس ده الأول عشان تقدر تدخل المحاضرة.",
      es: "Debes estar inscrito en este curso primero para unirte a la clase.",
    },
    actionLabel: null,
    actionHref: null,
  },
};

const T = {
  en: {
    meetingUnavailable: "Meeting unavailable",
    timeoutError: "The check took too long — check your internet connection and try again",
    accessCheckFailed: "Couldn't verify meeting access, try again",
    joinError: "An error occurred while joining the meeting",
    loadError: "Couldn't load the meeting",
    confirmLeave: "Are you sure you want to leave the meeting?",
    defaultTitle: "Live meeting",
    reconnecting: "Reconnecting...",
    minimize: "Minimize",
    fullscreen: "Fullscreen",
    close: "Close",
    checkingDevices: "Checking camera and microphone...",
    cameraWorking: "Camera working",
    micWorking: "Microphone working",
    joinDefaultsInfo: "You'll join the meeting with camera and mic off by default, and can turn them on from inside the meeting whenever you like.",
    enterMeeting: "Join meeting",
    noDeviceMsg: "No camera or microphone found on this device. You can join with audio/video off, or try a device that has them.",
    permissionDeniedMsg: "The browser hasn't granted camera/mic access — open your browser's site settings and allow access, or continue without them.",
    retry: "Retry",
    enterWithoutDevices: "Join without them",
    unsupportedMsg: "This browser doesn't support previewing the camera/mic before joining — you'll be able to control them from inside the meeting.",
    verifyingAccess: "Checking access...",
    joiningMeeting: "Joining the meeting...",
    waitingTeacher: "Waiting for the teacher to start the lecture...",
  },
  ar: {
    meetingUnavailable: "الاجتماع غير متاح",
    timeoutError: "استغرق التحقق وقت طويل جدًا — تحقق من اتصال الإنترنت وحاول تاني",
    accessCheckFailed: "تعذّر التحقق من صلاحية الدخول، حاول تاني",
    joinError: "حصل خطأ أثناء الانضمام للاجتماع",
    loadError: "تعذّر تحميل الاجتماع",
    confirmLeave: "متأكد إنك عايز تسيب الاجتماع؟",
    defaultTitle: "الاجتماع المباشر",
    reconnecting: "بيحاول يعيد الاتصال...",
    minimize: "تصغير",
    fullscreen: "ملء الشاشة",
    close: "إغلاق",
    checkingDevices: "جاري التحقق من الكاميرا والمايك...",
    cameraWorking: "الكاميرا شغالة",
    micWorking: "المايك شغال",
    joinDefaultsInfo: "هتدخل الاجتماع والكاميرا والمايك مقفولين افتراضيًا، وتقدر تشغّلهم من جوه الاجتماع وقت ما تحب.",
    enterMeeting: "الدخول للاجتماع",
    noDeviceMsg: "مش لاقيين كاميرا أو مايك على الجهاز ده. تقدر تدخل بالصوت/الصورة مقفولين، أو تجرّب من جهاز فيه كاميرا/مايك.",
    permissionDeniedMsg: "المتصفح مش دّيك إذن الكاميرا/المايك — افتح إعدادات الموقع في المتصفح وسمح بالوصول، أو كمّل من غيرهم.",
    retry: "إعادة المحاولة",
    enterWithoutDevices: "الدخول من غيرهم",
    unsupportedMsg: "المتصفح ده مش بيدعم معاينة الكاميرا/المايك قبل الدخول — هتقدر تتحكم فيهم من داخل الاجتماع نفسه.",
    verifyingAccess: "جاري التحقق من الصلاحية...",
    joiningMeeting: "جاري الانضمام للاجتماع...",
    waitingTeacher: "استنى المدرس يبدأ المحاضرة...",
  },
  es: {
    meetingUnavailable: "Clase no disponible",
    timeoutError: "La verificación tardó demasiado — revisa tu conexión a internet e inténtalo de nuevo",
    accessCheckFailed: "No se pudo verificar el acceso, inténtalo de nuevo",
    joinError: "Ocurrió un error al unirse a la clase",
    loadError: "No se pudo cargar la clase",
    confirmLeave: "¿Seguro que quieres salir de la clase?",
    defaultTitle: "Clase en vivo",
    reconnecting: "Reconectando...",
    minimize: "Minimizar",
    fullscreen: "Pantalla completa",
    close: "Cerrar",
    checkingDevices: "Comprobando cámara y micrófono...",
    cameraWorking: "Cámara activa",
    micWorking: "Micrófono activo",
    joinDefaultsInfo: "Entrarás a la clase con la cámara y el micrófono apagados por defecto, y podrás activarlos desde dentro cuando quieras.",
    enterMeeting: "Unirse a la clase",
    noDeviceMsg: "No se encontró cámara ni micrófono en este dispositivo. Puedes unirte sin audio/video, o probar con un dispositivo que los tenga.",
    permissionDeniedMsg: "El navegador no otorgó acceso a la cámara/micrófono — abre la configuración del sitio en el navegador y permite el acceso, o continúa sin ellos.",
    retry: "Reintentar",
    enterWithoutDevices: "Unirse sin ellos",
    unsupportedMsg: "Este navegador no admite la vista previa de cámara/micrófono antes de unirte — podrás controlarlos desde dentro de la clase.",
    verifyingAccess: "Verificando acceso...",
    joiningMeeting: "Uniéndose a la clase...",
    waitingTeacher: "Esperando a que el profesor inicie la clase...",
  },
};

// "precheck" (فحص كاميرا/مايك) → "loading" (بيجيب توكن) → "connecting"
// (بيعمل join) → "joined" → "reconnecting" → "error"
export default function DailyMeetingModal({ meetingId, title, onClose, isTeacher = false }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const callFrameRef = useRef(null);
  const previewStreamRef = useRef(null);

  const [status, setStatus] = useState("precheck");
  const [error, setError] = useState("");
  const [forbiddenReason, setForbiddenReason] = useState(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  // 🆕 هل فيه صاحب غرفة (المدرس) داخل الاجتماع دلوقتي؟ — بيتحدث من
  // refreshParticipantCount تحت عن طريق فحص participant.owner من Daily.
  const [teacherPresent, setTeacherPresent] = useState(isTeacher);
  // 🆕 حالة فحص الجهاز: "checking" | "granted" | "denied" | "skipped"
  const [deviceCheck, setDeviceCheck] = useState({ status: "checking", hasCamera: true, hasMic: true });
  // 🔧 FIX: بديل عن الاعتماد على status==="precheck" جوه الـ useEffect بتاع
  // connect() تحت. status بيتغيّر (precheck→loading) بس هو نفسه مش موجود في
  // dependency array بتاعة الـ effect ده، فـ React مكنش بيعيد تشغيله لما
  // proceedPastDeviceCheck() تنادي setStatus("loading") — يعني connect()
  // مكنتش بتتنادى خالص والحالة كانت بتفضل واقفة على "loading" للأبد (شاشة
  // "جاري التحقق من الصلاحية..." معلّقة). الحل: state مستقلة بتتغيّر مرة
  // واحدة بعد الـ precheck ومضافة في dependency array فعليًا، فالـ effect
  // بيتشغّل تلقائيًا لحظة ما تتغيّر.
  const [readyToConnect, setReadyToConnect] = useState(false);

  const destroyCallFrame = useCallback(() => {
    if (callFrameRef.current) {
      const frame = callFrameRef.current;
      // 🔧 FIX: بنصفّر الـ ref قبل ما ننادي destroy()، عشان لو حصل استدعاء
      // تاني لـ destroyCallFrame() في نفس اللحظة (مثلاً من "left-meeting"
      // ومن الـ cleanup effect مع بعض) منحاولش نـ destroy نفس الـ frame
      // مرتين.
      callFrameRef.current = null;
      try {
        frame.destroy();
      } catch (err) {
        // 🆕 Daily نفسها ممكن تكون سبق ونضّفت/شالت الـ iframe من جوه (مثلاً
        // بعد ما اليوزر غادر من زرار "مغادرة" بتاع Daily نفسه جوه الاجتماع)
        // — نداء destroy() في الحالة دي بيرمي
        // "Cannot read properties of null (reading 'postMessage')" لأنه
        // بيحاول يبعت رسالة لـ iframe مبقاش موجود أصلًا. بنمسك الخطأ ده
        // ونتجاهله بأمان بدل ما يكسر الصفحة، لأن الهدف (تنظيف الاجتماع)
        // أصلاً محقّق.
        console.warn("[daily] destroy() failed (safe to ignore if already left):", err);
      }
    }
  }, []);

  const stopPreviewStream = useCallback(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }
  }, []);

  // 🆕 فحص كاميرا/مايك (Device Check) — بيحصل قبل أي محاولة اتصال فعلية
  // بالاجتماع. من غيره، لو المتصفح رفض إذن الكاميرا/المايك (أو اليوزر رفضه
  // بالغلط)، كان اليوزر بيلاقي نفسه داخل المودال أصلًا من غير صورة/صوت من
  // غير أي تفسير — دلوقتي بنطلب الإذن بنفسنا الأول ونوري نتيجة واضحة
  // (preview لو نجح، أو رسالة + خيارات لو اترفض) قبل ما نكمل للاتصال.
  const runDeviceCheck = useCallback(async () => {
    setDeviceCheck({ status: "checking", hasCamera: true, hasMic: true });
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      // متصفح مش داعم getUserMedia أصلًا (نادر) — منسمحش نمنع الدخول
      // بالكامل، بس بنوضح إن معاينة الجهاز مش متاحة.
      setDeviceCheck({ status: "unsupported", hasCamera: false, hasMic: false });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      previewStreamRef.current = stream;
      setDeviceCheck({ status: "granted", hasCamera: true, hasMic: true });
    } catch (err) {
      // NotAllowedError = المستخدم أو المتصفح رفض الإذن. NotFoundError =
      // مفيش كاميرا/مايك فعليًا على الجهاز. أي سبب تاني بنعامله زي الرفض
      // العام — المهم إننا منكملش اتصال بدون توضيح للسبب.
      setDeviceCheck({
        status: "denied",
        hasCamera: false,
        hasMic: false,
        reason: err?.name === "NotFoundError" ? "no_device" : "permission_denied",
      });
    }
  }, []);

  useEffect(() => {
    if (status === "precheck") runDeviceCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === "precheck"]);

  useEffect(() => stopPreviewStream, [stopPreviewStream]);

  function proceedPastDeviceCheck() {
    stopPreviewStream();
    setStatus("loading");
    setReadyToConnect(true);
  }

  useEffect(() => {
    if (!readyToConnect) return; // لسه في مرحلة فحص الجهاز، منتصلش لسه.
    if (!meetingId) {
      setStatus("error");
      setError(t.meetingUnavailable);
      return;
    }

    let cancelled = false;

    async function connect() {
      setStatus("loading");
      setError("");

      // 1) توكن دخول آمن — الفحص الحقيقي (enrollment/ownership) بيحصل هنا
      // على السيرفر، مش في الفرونت إند.
      // 🆕 PERFORMANCE + RELIABILITY: AbortController بحد أقصى 15 ثانية —
      // من غيره، لو السيرفر بطيء جدًا أو في مشكلة شبكة جزئية (مش قطع كامل
      // يرجّع خطأ فورًا)، الـ fetch كان ممكن يفضل معلّق بلا نهاية وتفضل
      // الشاشة واقفة على "جاري التحقق من الصلاحية..." — بالظبط نفس أعراض
      // باج dependency array اللي اتصلح قبل كده، بس بسبب مختلف (شبكة مش React).
      let tokenData;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/token`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data?.error || "token_failed");
          err.reason = data?.reason;
          throw err;
        }
        tokenData = data;
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          if (err.name === "AbortError") {
            setError(t.timeoutError);
          } else if (err.message === "forbidden") {
            // 🆕 رسالة دقيقة حسب سبب الرفض الحقيقي (access.reason)، مش
            // "مفيش صلاحية" عامة — شوف FORBIDDEN_REASONS فوق.
            const reason = err.reason && FORBIDDEN_REASONS[err.reason] ? err.reason : "not_enrolled";
            setForbiddenReason(reason);
            setError(FORBIDDEN_REASONS[reason].message[language] || FORBIDDEN_REASONS[reason].message.en);
          } else {
            setError(t.accessCheckFailed);
          }
        }
        return;
      } finally {
        clearTimeout(timeoutId);
      }

      if (cancelled) return;
      setStatus("connecting");

      // 2) تحميل الـ SDK وعمل join فعلي بالتوكن.
      try {
        const { default: DailyIframe } = await import("@daily-co/daily-js");
        if (cancelled || !containerRef.current) return;

        const callFrame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
          showFullscreenButton: false, // بنعمل زرار fullscreen خاص بينا فوق يطابق تصميم الموقع
        });
        callFrameRef.current = callFrame;

        function refreshParticipantCount() {
          if (cancelled) return;
          const list = callFrame.participants?.();
          if (!list) return;
          const values = Object.values(list);
          setParticipantCount(values.length);
          // 🆕 "مؤشر المدرس لسه مادخلش" — بنفحص participant.owner (بيتحدد من
          // is_owner في meeting token، شوف app/lib/daily.js createMeetingToken)
          // بدل نعتمد على عدد المشاركين بس (ممكن يكونوا طلاب تانيين بدري).
          setTeacherPresent(values.some((p) => p.owner));
        }

        callFrame
          .on("joined-meeting", () => {
            if (cancelled) return;
            setStatus("joined");
            refreshParticipantCount();
          })
          .on("participant-joined", refreshParticipantCount)
          .on("participant-left", refreshParticipantCount)
          .on("left-meeting", () => {
            // 🔧 FIX: Daily نفسها بتكون نضّفت/شالت الـ iframe الداخلي لما
            // "left-meeting" بيحصل (مثلاً اليوزر دوس زرار "مغادرة" بتاع
            // Daily نفسها جوه الاجتماع). لو سبنا callFrameRef زي ما هو،
            // الـ cleanup effect تحت هيحاول ينادي destroy() على frame
            // مبقاش شغال ويرمي "Cannot read properties of null (reading
            // 'postMessage')". بنصفّر الـ ref هنا عشان destroyCallFrame ما
            // يحاولش يـ destroy حاجة اتشالت أصلًا.
            callFrameRef.current = null;
            if (!cancelled) onClose?.();
          })
          // 🔄 انقطاع شبكة مؤقت — Daily بتحاول تعيد الاتصال تلقائيًا، إحنا
          // بس بنوريه شريط تنبيه بدل ما "نفشل" المودال كامل.
          .on("network-connection", (e) => {
            if (cancelled) return;
            if (e?.event === "interrupted") setStatus("reconnecting");
            else if (e?.event === "connected" && status !== "loading") setStatus("joined");
          })
          .on("error", (e) => {
            if (!cancelled) {
              setStatus("error");
              setError(e?.errorMsg || t.joinError);
            }
          })
          .on("nonfatal-error", (e) => {
            console.warn("[daily] nonfatal-error:", e);
          });

        // 🆕 الكاميرا والمايك بيدخلوا "مقفولين" افتراضيًا لما ينضم للاجتماع
        // (startVideoOff / startAudioOff) — حتى لو الجهاز فيه كاميرا/مايك
        // شغالين فعليًا واتوافق عليهم في فحص precheck فوق. المستخدم يقدر
        // يشغّلهم بنفسه في أي وقت من أدوات التحكم جوه الاجتماع نفسه.
        await callFrame.join({
          url: tokenData.url,
          token: tokenData.token,
          startVideoOff: true,
          startAudioOff: true,
        });
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err?.message || t.loadError);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      destroyCallFrame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, retryTick, destroyCallFrame, readyToConnect]);

  function handleRetry() {
    destroyCallFrame();
    setRetryTick((t) => t + 1);
  }

  // 🆕 لما يدوس على X اللي فوق وهو داخل الاجتماع فعليًا (joined أو حتى بيحاول
  // يعيد الاتصال)، بنتأكد منه الأول قبل ما نقفل ونخرجه فعليًا — عشان منخسرش
  // حد بالغلط بدوسة واحدة على زرار قريب من زرارات تانية. لو لسه في مرحلة
  // فحص الجهاز/التحميل/في خطأ، مفيش حاجة نخسرها فعليًا فبنقفل على طول.
  function handleClose() {
    const isActuallyInMeeting = status === "joined" || status === "reconnecting";
    if (isActuallyInMeeting) {
      const confirmed = window.confirm(t.confirmLeave);
      if (!confirmed) return;
    }
    destroyCallFrame();
    onClose?.();
  }

  function toggleFullscreen() {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  const isBusy = status === "loading" || status === "connecting";

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 truncate">
              {title || t.defaultTitle}
            </h3>
            {status === "joined" && (
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                <Users size={12} /> {participantCount}
              </span>
            )}
            {status === "reconnecting" && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0 animate-pulse">
                <WifiOff size={12} /> {t.reconnecting}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-gray-700 p-1.5"
              title={isFullscreen ? t.minimize : t.fullscreen}
            >
              {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1.5" title={t.close}>
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="relative flex-1 bg-gray-900">
          {status === "precheck" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white px-6 text-center z-10">
              {deviceCheck.status === "checking" && (
                <>
                  <Loader size={28} className="animate-spin" />
                  <span className="text-sm">{t.checkingDevices}</span>
                </>
              )}

              {deviceCheck.status === "granted" && (
                <>
                  <div className="w-full max-w-sm aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
                    <video
                      autoPlay
                      muted
                      playsInline
                      ref={(el) => {
                        if (el && previewStreamRef.current && el.srcObject !== previewStreamRef.current) {
                          el.srcObject = previewStreamRef.current;
                        }
                      }}
                      className="w-full h-full object-cover -scale-x-100"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Video size={13} /> {t.cameraWorking}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic size={13} /> {t.micWorking}
                    </span>
                  </div>
                  {/* 🆕 توضيح إن الدخول هيكون بالكاميرا/المايك مقفولين افتراضيًا
                      (حتى لو الفحص فوق نجح) — المستخدم يقدر يشغّلهم بنفسه
                      من جوه الاجتماع وقت ما يحب. */}
                  <span className="text-[11px] text-gray-300 max-w-sm -mt-2">
                    {t.joinDefaultsInfo}
                  </span>
                  <button
                    onClick={proceedPastDeviceCheck}
                    className="mt-1 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
                  >
                    {t.enterMeeting}
                  </button>
                </>
              )}

              {deviceCheck.status === "denied" && (
                <>
                  <div className="flex items-center gap-3 text-red-400">
                    <VideoOff size={22} />
                    <MicOff size={22} />
                  </div>
                  <span className="text-sm max-w-sm">
                    {deviceCheck.reason === "no_device" ? t.noDeviceMsg : t.permissionDeniedMsg}
                  </span>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={runDeviceCheck}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                    >
                      <RefreshCw size={14} /> {t.retry}
                    </button>
                    <button
                      onClick={proceedPastDeviceCheck}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
                    >
                      {t.enterWithoutDevices}
                    </button>
                  </div>
                </>
              )}

              {deviceCheck.status === "unsupported" && (
                <>
                  <span className="text-sm max-w-sm">
                    {t.unsupportedMsg}
                  </span>
                  <button
                    onClick={proceedPastDeviceCheck}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
                  >
                    {t.enterMeeting}
                  </button>
                </>
              )}
            </div>
          )}

          {isBusy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10">
              <Loader size={28} className="animate-spin" />
              <span className="text-sm">
                {status === "loading" ? t.verifyingAccess : t.joiningMeeting}
              </span>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white px-6 text-center z-10 bg-gray-900">
              <AlertCircle size={28} className="text-red-400" />
              <span className="text-sm">{error}</span>
              <div className="flex gap-2 mt-2">
                {forbiddenReason && FORBIDDEN_REASONS[forbiddenReason]?.actionHref ? (
                  <Link
                    href={FORBIDDEN_REASONS[forbiddenReason].actionHref}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
                  >
                    {FORBIDDEN_REASONS[forbiddenReason].actionLabel[language] || FORBIDDEN_REASONS[forbiddenReason].actionLabel.en}
                  </Link>
                ) : (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                  >
                    <RefreshCw size={14} /> {t.retry}
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  {t.close}
                </button>
              </div>
            </div>
          )}

          {/* 🆕 "المدرس لسه مادخلش" — بيظهر لطالب بس (isTeacher=false)، لما
              الاجتماع joined فعليًا بس مفيش participant.owner=true جوه
              (شوف refreshParticipantCount). كده الطالب اللي بيدخل بدري
              بيفهم إنه مستني، مش إن حاجة غلط. */}
          {status === "joined" && !isTeacher && !teacherPresent && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/70 backdrop-blur text-white text-xs font-semibold px-4 py-2 rounded-full">
              <Hourglass size={13} className="animate-pulse" /> {t.waitingTeacher}
            </div>
          )}

          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}