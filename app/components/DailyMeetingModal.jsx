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

// 🆕 رسائل رفض دخول دقيقة (مطابقة لـ access.reason في app/lib/access.js) —
// بدل رسالة عامة "مفيش صلاحية" واحدة لكل الحالات. كل سبب له رسالة ومسار حل
// واضح (مثلاً "جدّد اشتراكك" بدل ما الطالب يفضل مش فاهم ليه اتمنع.
const FORBIDDEN_REASONS = {
  enrollment_cancelled: {
    message: "تسجيلك في الكورس ده اتلغى، فمش تقدر تدخل المحاضرة.",
    actionLabel: "تواصل مع الدعم",
    actionHref: "/contact",
  },
  membership_expired: {
    message: "اشتراكك انتهى — جدّد اشتراكك عشان ترجع تقدر تدخل المحاضرات.",
    actionLabel: "تجديد الاشتراك",
    actionHref: "/membership",
  },
  membership_plan_excludes_course: {
    message: "خطة اشتراكك الحالية متغطيش الكورس ده — ترقّى لخطة أشمل.",
    actionLabel: "خطط الاشتراك",
    actionHref: "/membership",
  },
  not_enrolled: {
    message: "لازم تكون مسجّل في الكورس ده الأول عشان تقدر تدخل المحاضرة.",
    actionLabel: null,
    actionHref: null,
  },
};

// "precheck" (فحص كاميرا/مايك) → "loading" (بيجيب توكن) → "connecting"
// (بيعمل join) → "joined" → "reconnecting" → "error"
export default function DailyMeetingModal({ meetingId, title, onClose, isTeacher = false }) {
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

  const destroyCallFrame = useCallback(() => {
    if (callFrameRef.current) {
      callFrameRef.current.destroy();
      callFrameRef.current = null;
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
  }

  useEffect(() => {
    if (status === "precheck") return; // لسه في مرحلة فحص الجهاز، منتصلش لسه.
    if (!meetingId) {
      setStatus("error");
      setError("الاجتماع غير متاح");
      return;
    }

    let cancelled = false;

    async function connect() {
      setStatus("loading");
      setError("");

      // 1) توكن دخول آمن — الفحص الحقيقي (enrollment/ownership) بيحصل هنا
      // على السيرفر، مش في الفرونت إند.
      let tokenData;
      try {
        const res = await fetch(`/api/meetings/${meetingId}/token`);
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
          if (err.message === "forbidden") {
            // 🆕 رسالة دقيقة حسب سبب الرفض الحقيقي (access.reason)، مش
            // "مفيش صلاحية" عامة — شوف FORBIDDEN_REASONS فوق.
            const reason = err.reason && FORBIDDEN_REASONS[err.reason] ? err.reason : "not_enrolled";
            setForbiddenReason(reason);
            setError(FORBIDDEN_REASONS[reason].message);
          } else {
            setError("تعذّر التحقق من صلاحية الدخول، حاول تاني");
          }
        }
        return;
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
              setError(e?.errorMsg || "حصل خطأ أثناء الانضمام للاجتماع");
            }
          })
          .on("nonfatal-error", (e) => {
            console.warn("[daily] nonfatal-error:", e);
          });

        await callFrame.join({ url: tokenData.url, token: tokenData.token });
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err?.message || "تعذّر تحميل الاجتماع");
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      destroyCallFrame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, retryTick, destroyCallFrame]);

  function handleRetry() {
    destroyCallFrame();
    setRetryTick((t) => t + 1);
  }

  function handleClose() {
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
              {title || "الاجتماع المباشر"}
            </h3>
            {status === "joined" && (
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                <Users size={12} /> {participantCount}
              </span>
            )}
            {status === "reconnecting" && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0 animate-pulse">
                <WifiOff size={12} /> بيحاول يعيد الاتصال...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-gray-700 p-1.5"
              title={isFullscreen ? "تصغير" : "ملء الشاشة"}
            >
              {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1.5" title="إغلاق">
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
                  <span className="text-sm">جاري التحقق من الكاميرا والمايك...</span>
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
                      <Video size={13} /> الكاميرا شغالة
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic size={13} /> المايك شغال
                    </span>
                  </div>
                  <button
                    onClick={proceedPastDeviceCheck}
                    className="mt-1 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
                  >
                    الدخول للاجتماع
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
                    {deviceCheck.reason === "no_device"
                      ? "مش لاقيين كاميرا أو مايك على الجهاز ده. تقدر تدخل بالصوت/الصورة مقفولين، أو تجرّب من جهاز فيه كاميرا/مايك."
                      : "المتصفح مش دّيك إذن الكاميرا/المايك — افتح إعدادات الموقع في المتصفح وسمح بالوصول، أو كمّل من غيرهم."}
                  </span>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={runDeviceCheck}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                    >
                      <RefreshCw size={14} /> إعادة المحاولة
                    </button>
                    <button
                      onClick={proceedPastDeviceCheck}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
                    >
                      الدخول من غيرهم
                    </button>
                  </div>
                </>
              )}

              {deviceCheck.status === "unsupported" && (
                <>
                  <span className="text-sm max-w-sm">
                    المتصفح ده مش بيدعم معاينة الكاميرا/المايك قبل الدخول — هتقدر تتحكم فيهم من داخل الاجتماع نفسه.
                  </span>
                  <button
                    onClick={proceedPastDeviceCheck}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
                  >
                    الدخول للاجتماع
                  </button>
                </>
              )}
            </div>
          )}

          {isBusy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10">
              <Loader size={28} className="animate-spin" />
              <span className="text-sm">
                {status === "loading" ? "جاري التحقق من الصلاحية..." : "جاري الانضمام للاجتماع..."}
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
                    {FORBIDDEN_REASONS[forbiddenReason].actionLabel}
                  </Link>
                ) : (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                  >
                    <RefreshCw size={14} /> إعادة المحاولة
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  إغلاق
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
              <Hourglass size={13} className="animate-pulse" /> استنى المدرس يبدأ المحاضرة...
            </div>
          )}

          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}