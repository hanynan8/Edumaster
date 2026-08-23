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
import {
  Loader,
  AlertCircle,
  X,
  WifiOff,
  Users,
  Maximize,
  Minimize,
  RefreshCw,
} from "lucide-react";

// "loading" (بيجيب توكن) → "connecting" (بيعمل join) → "joined" → "reconnecting" → "error"
export default function DailyMeetingModal({ meetingId, title, onClose }) {
  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const callFrameRef = useRef(null);

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const destroyCallFrame = useCallback(() => {
    if (callFrameRef.current) {
      callFrameRef.current.destroy();
      callFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
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
        if (!res.ok) throw new Error(data?.error || "token_failed");
        tokenData = data;
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(
            err.message === "forbidden"
              ? "مفيش صلاحية للدخول على الاجتماع ده"
              : "تعذّر التحقق من صلاحية الدخول، حاول تاني"
          );
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
          if (list) setParticipantCount(Object.keys(list).length);
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
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  <RefreshCw size={14} /> إعادة المحاولة
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}