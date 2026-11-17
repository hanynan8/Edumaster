"use client";

// app/components/ThreadChat.jsx
//
// 🆕 محادثة بين الطالب والمدرّس/الموديريتر على محاولة كويز أو تسليم واجب.
// الـ endpoint نفسه (GET يرجّع { messages } / POST { text, audioUrl? } يرجّع { messages }):
//   /api/quizzes/[id]/results/[resultId]/messages
//   /api/assignments/[id]/submissions/[submissionId]/messages
// viewer: "student" | "staff" — بس عشان نحدد رسايل مين على اليمين/اللون.
//
// 🎤 allowVoice (للواجبات بس حاليًا): الرسالة ممكن تبقى رد صوتي — تسجيل مباشر
// بالمايك أو رفع ملف أوديو. الملف بيترفع لـ /api/upload/file (kind=submissionAudio
// → Bunny Storage تحت فولدر المرسل) وبعدين بنبعت رابطه في الرسالة.

import { useEffect, useRef, useState } from "react";
import { Loader, Send, MessageSquare, Mic, Square, Trash2, UploadCloud } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVoiceRecorder, uploadVoiceFile, formatClock, MAX_AUDIO_BYTES } from "@/app/lib/useVoiceRecorder";

const MAX_LEN = 20000;

const STRINGS = {
  ar: {
    title: "المحادثة",
    empty: "لا توجد رسائل بعد. اكتب أول رسالة.",
    placeholder: "اكتب رسالتك هنا (يمكنك كتابة نص طويل)...",
    placeholderVoice: "أضف تعليقًا نصيًا على التسجيل (اختياري)...",
    send: "إرسال",
    loadError: "تعذّر تحميل الرسائل",
    sendError: "تعذّر إرسال الرسالة، حاول مرة أخرى",
    roles: { student: "الطالب", teacher: "المدرّس", moderator: "الموديريتر", admin: "الأدمن" },
    you: "أنت",
    record: "تسجيل صوتي",
    uploadAudio: "رفع ملف صوتي",
    stop: "إيقاف التسجيل",
    recording: "جارٍ التسجيل...",
    removeVoice: "حذف التسجيل",
    micDenied: "لم يتم السماح باستخدام الميكروفون. فعّل الصلاحية من إعدادات المتصفح أو ارفع ملفًا صوتيًا.",
    micUnsupported: "متصفحك لا يدعم التسجيل المباشر. ارفع ملفًا صوتيًا بدلًا من ذلك.",
    notAudio: "الملف المختار ليس ملفًا صوتيًا",
    tooLarge: "حجم الملف الصوتي كبير جدًا (الحد الأقصى 50 ميجا)",
    notConfigured: "الرفع غير مفعّل حاليًا",
    voiceMessage: "رسالة صوتية",
  },
  en: {
    title: "Discussion",
    empty: "No messages yet. Write the first one.",
    placeholder: "Write your message here (long text is fine)...",
    placeholderVoice: "Add an optional text note with your recording...",
    send: "Send",
    loadError: "Couldn't load messages",
    sendError: "Couldn't send the message, try again",
    roles: { student: "Student", teacher: "Teacher", moderator: "Moderator", admin: "Admin" },
    you: "You",
    record: "Record voice",
    uploadAudio: "Upload audio file",
    stop: "Stop recording",
    recording: "Recording...",
    removeVoice: "Remove recording",
    micDenied: "Microphone access was denied. Allow it in your browser settings or upload an audio file instead.",
    micUnsupported: "Your browser doesn't support live recording. Upload an audio file instead.",
    notAudio: "The selected file isn't an audio file",
    tooLarge: "The audio file is too large (50MB max)",
    notConfigured: "Uploads aren't enabled right now",
    voiceMessage: "Voice message",
  },
};

export default function ThreadChat({ endpoint, viewer = "student", initialMessages = null, allowVoice = false }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const [messages, setMessages] = useState(initialMessages || []);
  const [loading, setLoading] = useState(!initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  // 🎤 الرد الصوتي
  const [voice, setVoiceState] = useState(null); // { file, url } — url = معاينة محلية قبل الإرسال
  const voiceRef = useRef(null);
  const voiceFile = voice?.file ?? null;
  const voicePreviewUrl = voice?.url ?? "";
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialMessages) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error);
        if (!cancelled) setMessages(data.messages || []);
      } catch {
        if (!cancelled) setError(t.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages.length]);

  // بيحفظ التسجيل/الملف المختار + رابط معاينته، ويفرّج الرابط القديم
  function setVoiceFile(file) {
    if (voiceRef.current) URL.revokeObjectURL(voiceRef.current.url);
    const next = file ? { file, url: URL.createObjectURL(file) } : null;
    voiceRef.current = next;
    setVoiceState(next);
  }

  // لو الكومبوننت اتشال → نفرّج رابط المعاينة (المايك بيقفله الـ hook)
  useEffect(
    () => () => {
      if (voiceRef.current) URL.revokeObjectURL(voiceRef.current.url);
    },
    []
  );

  // 🎤 التسجيل المباشر (منطقه في app/lib/useVoiceRecorder.js)
  const {
    recording,
    seconds,
    start: startMic,
    stop: stopRecording,
  } = useVoiceRecorder({
    onRecorded: (file) => setVoiceFile(file),
    onError: (code) => setError(code === "denied" ? t.micDenied : t.micUnsupported),
  });

  function startRecording() {
    setError("");
    setVoiceFile(null);
    startMic();
  }

  function handlePickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // يسمح باختيار نفس الملف تاني
    if (!file) return;
    setError("");
    if (!String(file.type || "").startsWith("audio/")) {
      setError(t.notAudio);
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError(t.tooLarge);
      return;
    }
    setVoiceFile(file);
  }

  async function handleSend(e) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !voiceFile) || sending || recording) return;
    setSending(true);
    setError("");
    try {
      const payload = {};
      if (body) payload.text = body;
      if (voiceFile) payload.audioUrl = await uploadVoiceFile(voiceFile);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setMessages(data.messages || []);
      setText("");
      setVoiceFile(null);
    } catch (err) {
      if (err?.message === "file_too_large") setError(t.tooLarge);
      else if (err?.message === "upload_not_configured") setError(t.notConfigured);
      else setError(t.sendError);
    } finally {
      setSending(false);
    }
  }

  const isMine = (m) => (viewer === "student" ? m.senderRole === "student" : m.senderRole !== "student");
  const canSend = !sending && !recording && (text.trim().length > 0 || Boolean(voiceFile));

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">
        <MessageSquare size={16} /> {t.title}
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader className="animate-spin text-[#2456A1]" size={20} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">{t.empty}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${isMine(m) ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  isMine(m) ? "bg-[#EBEFF6] text-[#002E74]" : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-[11px] font-bold opacity-70 mb-1">
                  {isMine(m) ? t.you : m.senderName || t.roles[m.senderRole] || ""} · {t.roles[m.senderRole] || ""}
                  {" · "}
                  {new Date(m.createdAt).toLocaleString(language === "ar" ? "ar-EG" : undefined)}
                </p>
                {m.audioUrl && (
                  <audio
                    controls
                    preload="none"
                    src={m.audioUrl}
                    aria-label={t.voiceMessage}
                    className="w-full min-w-[220px] max-w-full mb-1"
                  />
                )}
                {/* whitespace-pre-wrap عشان النص الطويل/الفقرات يتعرضوا زي ما اتكتبوا؛ React بيعمل escape */}
                {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-3 space-y-2">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {allowVoice && (
          <div className="space-y-2">
            {recording ? (
              <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-red-600">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  {t.recording} {formatClock(seconds)}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90"
                >
                  <Square size={12} /> {t.stop}
                </button>
              </div>
            ) : voiceFile ? (
              <div className="flex items-center gap-2 bg-[#EBEFF6] rounded-xl px-3 py-2">
                {voicePreviewUrl && (
                  <audio controls src={voicePreviewUrl} aria-label={t.voiceMessage} className="flex-1 min-w-0 h-9" />
                )}
                <button
                  type="button"
                  onClick={() => setVoiceFile(null)}
                  disabled={sending}
                  aria-label={t.removeVoice}
                  title={t.removeVoice}
                  className="p-2 text-red-500 hover:bg-white rounded-lg disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={sending}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:border-[#5279B4] hover:text-[#003A91] text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50"
                >
                  <Mic size={14} /> {t.record}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:border-[#5279B4] hover:text-[#003A91] text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50"
                >
                  <UploadCloud size={14} /> {t.uploadAudio}
                </button>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handlePickFile} />
              </div>
            )}
          </div>
        )}

        <textarea
          rows={allowVoice && (voiceFile || recording) ? 2 : 3}
          maxLength={MAX_LEN}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={allowVoice && voiceFile ? t.placeholderVoice : t.placeholder}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5279B4] resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {text.length}/{MAX_LEN}
          </span>
          <button
            type="submit"
            disabled={!canSend}
            className="flex items-center gap-2 bg-[#003A91] text-white text-sm font-bold px-5 py-2 rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
            {t.send}
          </button>
        </div>
      </form>
    </div>
  );
}
