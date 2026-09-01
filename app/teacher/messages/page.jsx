"use client";

// app/teacher/messages/page.jsx
//
// 🆕 صندوق وارد المدرس — كل الخيوط (طالب + كورس) اللي وصلته فيها رسايل
// (GET /api/teacher/messages)، وفتح أي خيط بيحمّل المحادثة (GET/POST
// /api/courses/[id]/messages?studentId=). أدمن بيشوف كل الخيوط على المنصة
// (oversight) بنفس الشاشة. الدخول من رابط إشعار "message_new"
// (?course=xxx&student=xxx) بيفتح الخيط ده مباشرة.

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  MessageCircle, Send, Loader, ArrowRight, ArrowLeft, Inbox,
} from "lucide-react";

const STRINGS = {
  ar: {
    title: "الرسائل",
    subtitle: "رسايل طلابك بخصوص كورساتك — رد عليهم من هنا",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل الرسائل",
    empty: "لسه معملتش استلمت أي رسالة من طلابك",
    noMessages: "لسه مفيش رسايل في المحادثة دي",
    placeholder: "اكتب ردك للطالب...",
    send: "إرسال",
    sending: "بيترسل...",
    selectThread: "اختر محادثة من القائمة",
    you: "انت",
    justNow: "الآن",
    minutesAgo: (n) => `منذ ${n} د`,
    hoursAgo: (n) => `منذ ${n} س`,
    daysAgo: (n) => `منذ ${n} يوم`,
  },
  en: {
    title: "Messages",
    subtitle: "Your students' messages about your courses — reply from here",
    loading: "Loading...",
    error: "Couldn't load messages",
    empty: "You haven't received any messages from students yet",
    noMessages: "No messages in this conversation yet",
    placeholder: "Write your reply to the student...",
    send: "Send",
    sending: "Sending...",
    selectThread: "Pick a conversation from the list",
    you: "You",
    justNow: "Just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
  },
  es: {
    title: "Mensajes",
    subtitle: "Mensajes de tus alumnos sobre tus cursos — responde desde aquí",
    loading: "Cargando...",
    error: "No se pudieron cargar los mensajes",
    empty: "Aún no has recibido mensajes de tus alumnos",
    noMessages: "Aún no hay mensajes en esta conversación",
    placeholder: "Escribe tu respuesta al alumno...",
    send: "Enviar",
    sending: "Enviando...",
    selectThread: "Elige una conversación de la lista",
    you: "Tú",
    justNow: "Justo ahora",
    minutesAgo: (n) => `hace ${n} min`,
    hoursAgo: (n) => `hace ${n} h`,
    daysAgo: (n) => `hace ${n} d`,
  },
};

const POLL_MS = 5000;

function timeAgo(dateStr, t) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t.justNow;
  if (mins < 60) return t.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.hoursAgo(hours);
  return t.daysAgo(Math.floor(hours / 24));
}

function fmtClock(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, avatar, size = 40 }) {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || ""}
        className="rounded-full object-cover ring-1 ring-black/5 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full bg-[#C9A227] text-white font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}

function threadKey(th) {
  return `${th.courseId}:${th.studentId}`;
}

function ThreadList({ threads, activeKey, onSelect, t }) {
  return (
    <div className="divide-y divide-gray-100">
      {threads.map((th) => (
        <button
          key={threadKey(th)}
          onClick={() => onSelect(th)}
          className={`w-full text-left rtl:text-right flex items-center gap-3 px-4 py-3.5 transition-colors ${
            activeKey === threadKey(th) ? "bg-[#EBEFF6]" : "hover:bg-gray-50"
          }`}
        >
          <Avatar name={th.studentName} avatar={th.studentAvatar} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-800 truncate">{th.studentName || "—"}</p>
              {th.lastAt && (
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(th.lastAt, t)}</span>
              )}
            </div>
            <p className="text-xs text-[#003A91]/80 font-medium truncate">{th.courseTitle}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {th.lastMessage
                ? `${!th.lastMessageFromStudent ? `${t.you}: ` : ""}${th.lastMessage}`
                : t.noMessages}
            </p>
          </div>
          {th.unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold shrink-0">
              {th.unreadCount > 9 ? "9+" : th.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ChatPanel({ thread, t, session, onSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent) => {
    if (!thread) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/courses/${thread.courseId}/messages?studentId=${thread.studentId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [thread]);

  useEffect(() => {
    setMessages([]);
    load(false);
    pollRef.current = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.courseId, thread?.studentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/courses/${thread.courseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, studentId: thread.studentId }),
      });
      if (res.ok) {
        const created = await res.json();
        setMessages((prev) => [...prev, created]);
        setText("");
        onSent?.(thread, created);
      }
    } finally {
      setSending(false);
    }
  }

  if (!thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <MessageCircle className="text-gray-300 mb-3" size={44} />
        <p className="text-sm text-gray-400">{t.selectThread}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
        <Avatar name={thread.studentName} avatar={thread.studentAvatar} size={36} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{thread.studentName}</p>
          <p className="text-xs text-gray-400 truncate">{thread.courseTitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="animate-spin text-[#003A91]" size={26} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">{t.noMessages}</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender?.id === session?.user?.id;
            return (
              <div key={m.id} className={`flex flex-col max-w-[75%] ${mine ? "self-end items-end" : "self-start items-start"}`}>
                <div
                  className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    mine
                      ? "bg-[#003A91] text-white rounded-br-sm rtl:rounded-br-2xl rtl:rounded-bl-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm rtl:rounded-bl-2xl rtl:rounded-br-sm"
                  }`}
                >
                  {m.body}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{fmtClock(m.createdAt)}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 px-4 py-3 border-t border-gray-100 shrink-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          rows={1}
          placeholder={t.placeholder}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A91]/30 focus:border-[#003A91] max-h-32"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex items-center gap-2 bg-[#003A91] hover:bg-[#002E74] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          {sending ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
          <span className="hidden sm:inline">{sending ? t.sending : t.send}</span>
        </button>
      </form>
    </div>
  );
}

function MessagesInner() {
  const { data: session } = useSession();
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const searchParams = useSearchParams();
  const router = useRouter();
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [threads, setThreads] = useState(null);
  const [error, setError] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/messages", { cache: "no-store" });
      if (!res.ok) throw new Error("bad_status");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 20000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  // فتح خيط معيّن مباشرة لو جاي من رابط إشعار (?course=xxx&student=xxx)
  useEffect(() => {
    const courseParam = searchParams.get("course");
    const studentParam = searchParams.get("student");
    if (courseParam && studentParam) {
      setActiveKey(`${courseParam}:${studentParam}`);
      setMobileShowChat(true);
    }
  }, [searchParams]);

  function selectThread(th) {
    setActiveKey(threadKey(th));
    setMobileShowChat(true);
    router.replace(`/teacher/messages?course=${th.courseId}&student=${th.studentId}`, { scroll: false });
    setThreads((prev) => prev?.map((x) => (threadKey(x) === threadKey(th) ? { ...x, unreadCount: 0 } : x)));
  }

  function handleSent(thread, created) {
    setThreads((prev) =>
      prev?.map((x) =>
        threadKey(x) === threadKey(thread)
          ? { ...x, lastMessage: created.body, lastMessageFromStudent: false, lastAt: created.createdAt }
          : x
      )
    );
  }

  const activeThread = threads?.find((x) => threadKey(x) === activeKey) || null;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center text-sm text-gray-400">
        {t.error}
      </div>
    );
  }

  if (threads === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex justify-center">
        <Loader className="animate-spin text-[#003A91]" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="text-[#003A91]" size={30} />
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{t.title}</h1>
          <p className="text-sm text-gray-400">{t.subtitle}</p>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <Inbox className="text-gray-300 mx-auto mb-3" size={40} />
          <p className="text-sm text-gray-400">{t.empty}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm shadow-black/[0.02] flex" style={{ height: "min(680px, 78vh)" }}>
          <div className={`w-full sm:w-80 border-gray-100 rtl:border-l-0 rtl:border-r ltr:border-r shrink-0 overflow-y-auto ${mobileShowChat ? "hidden sm:block" : "block"}`}>
            <ThreadList threads={threads} activeKey={activeKey} onSelect={selectThread} t={t} />
          </div>

          <div className={`flex-1 min-w-0 flex-col ${mobileShowChat ? "flex" : "hidden sm:flex"}`}>
            {mobileShowChat && activeThread && (
              <button
                onClick={() => setMobileShowChat(false)}
                className="sm:hidden flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#003A91] border-b border-gray-100"
              >
                <ArrowBack size={14} /> {t.title}
              </button>
            )}
            <ChatPanel thread={activeThread} t={t} session={session} onSent={handleSent} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherMessagesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex justify-center">
        <Loader className="animate-spin text-[#003A91]" size={36} />
      </div>
    }>
      <MessagesInner />
    </Suspense>
  );
}