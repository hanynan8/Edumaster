"use client";

// app/components/ThreadChat.jsx
//
// 🆕 محادثة نصية بين الطالب والمدرّس/الموديريتر على محاولة كويز أو تسليم واجب.
// الـ endpoint نفسه (GET يرجّع { messages } / POST { text } يرجّع { messages }):
//   /api/quizzes/[id]/results/[resultId]/messages
//   /api/assignments/[id]/submissions/[submissionId]/messages
// viewer: "student" | "staff" — بس عشان نحدد رسايل مين على اليمين/اللون.

import { useEffect, useRef, useState } from "react";
import { Loader, Send, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const MAX_LEN = 20000;

const STRINGS = {
  ar: {
    title: "المحادثة",
    empty: "لا توجد رسائل بعد. اكتب أول رسالة.",
    placeholder: "اكتب رسالتك هنا (يمكنك كتابة نص طويل)...",
    send: "إرسال",
    loadError: "تعذّر تحميل الرسائل",
    sendError: "تعذّر إرسال الرسالة، حاول مرة أخرى",
    roles: { student: "الطالب", teacher: "المدرّس", moderator: "الموديريتر", admin: "الأدمن" },
    you: "أنت",
  },
  en: {
    title: "Discussion",
    empty: "No messages yet. Write the first one.",
    placeholder: "Write your message here (long text is fine)...",
    send: "Send",
    loadError: "Couldn't load messages",
    sendError: "Couldn't send the message, try again",
    roles: { student: "Student", teacher: "Teacher", moderator: "Moderator", admin: "Admin" },
    you: "You",
  },
};

export default function ThreadChat({ endpoint, viewer = "student", initialMessages = null }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const [messages, setMessages] = useState(initialMessages || []);
  const [loading, setLoading] = useState(!initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

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

  async function handleSend(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setMessages(data.messages || []);
      setText("");
    } catch {
      setError(t.sendError);
    } finally {
      setSending(false);
    }
  }

  const isMine = (m) => (viewer === "student" ? m.senderRole === "student" : m.senderRole !== "student");

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
                {/* whitespace-pre-wrap عشان النص الطويل/الفقرات يتعرضوا زي ما اتكتبوا؛ React بيعمل escape */}
                <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-3 space-y-2">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <textarea
          rows={3}
          maxLength={MAX_LEN}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5279B4] resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {text.length}/{MAX_LEN}
          </span>
          <button
            type="submit"
            disabled={sending || !text.trim()}
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
