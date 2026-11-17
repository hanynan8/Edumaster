"use client";

// app/lib/useVoiceRecorder.js
//
// 🎤 تسجيل صوت مباشر بالمايك (MediaRecorder) + رفعه، مشترك بين:
//   - محادثة الواجب (app/components/ThreadChat.jsx)
//   - نموذج تسليم الواجب عند الطالب (app/student/assignments/[assignmentId]/page.jsx)
//
// useVoiceRecorder({ onRecorded(file), onError("denied" | "unsupported"), maxSeconds })
//   → { recording, seconds, start, stop }
// الملف اللي بيرجع File بنوع أوديو أساسي (audio/webm | audio/mp4 | audio/ogg) عشان
// يعدّي فحص الـ MIME في /api/upload/file.

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // نفس حد السيرفر لـ submissionAudio

const EXT_BY_MIME = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "";
}

export function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * بيرفع ملف أوديو لـ Bunny Storage تحت فولدر المستخدم (kind=submissionAudio).
 * @returns {Promise<string>} رابط الملف. بيرمي Error بكود زي "file_too_large" / "upload_not_configured".
 */
export async function uploadVoiceFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", "submissionAudio");
  const res = await fetch("/api/upload/file", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "upload_failed");
  return data.url;
}

export function useVoiceRecorder({ onRecorded, onError, maxSeconds = 5 * 60 } = {}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const onRecordedRef = useRef(onRecorded);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
    onErrorRef.current = onError;
  });

  const releaseMic = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks?.().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onErrorRef.current?.("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = (rec.mimeType || mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
        const blob = new Blob(chunksRef.current, { type });
        releaseMic();
        setRecording(false);
        if (blob.size > 0) {
          onRecordedRef.current?.(new File([blob], `voice-${Date.now()}.${EXT_BY_MIME[type] || "webm"}`, { type }));
        }
      };
      recorderRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      releaseMic();
      onErrorRef.current?.(err?.name === "NotAllowedError" || err?.name === "SecurityError" ? "denied" : "unsupported");
    }
  }, [releaseMic]);

  // أقصى مدة تسجيل → إيقاف تلقائي
  useEffect(() => {
    if (recording && seconds >= maxSeconds) stop();
  }, [recording, seconds, maxSeconds, stop]);

  // لو الكومبوننت اتشال وإحنا بنسجّل → نقفل المايك من غير ما نسلّم ملف
  useEffect(
    () => () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      }
      releaseMic();
    },
    [releaseMic]
  );

  return { recording, seconds, start, stop };
}
