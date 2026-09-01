"use client";

// app/student/messages/page.jsx
//
// 🆕 "رسائلي" — صندوق وارد الطالب لمراسلة مدرّسي كورساته. قايمة كورساته
// (GET /api/student/messages) على اليسار/فوق، وفتح أي كورس بيحمّل المحادثة
// بينه وبين مدرسه (GET/POST /api/courses/[id]/messages). الدخول من رابط
// إشعار "message_new" (?course=xxx) بيفتح الخيط ده مباشرة.

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  MessageCircle, Send, Loader, ArrowRight, ArrowLeft, GraduationCap, BookOpen,
} from "lucide-react";

const STRINGS = {
  ar: {
    title: "رسائلي",
    subtitle: "راسل مدرّسين كورساتك واستلم ردودهم من هنا",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل رسائلك",
    empty: "لسه معملتش enroll في أي كورس عشان تراسل مدرّسه",
    browse: "تصفّح الكورسات",
    noMessages: "مفيش رسايل لسه — ابدأ المحادثة",
    placeholder: "اكتب رسالتك لمدرّس الكورس...",
    send: "إرسال",
    sending: "بيترسل...",
    selectThread: "اختر كورس من القائمة عشان تفتح المحادثة",
    you: "انت",
    justNow: "الآن",
    minutesAgo: (n) => `منذ ${n} د`,
    hoursAgo: (n) => `منذ ${n} س`,
    daysAgo: (n) => `منذ ${n} يوم`,
    noTeacher: "الكورس ده لسه من غير مدرّس معيّن",
  },
  en: {
    title: "My Messages",
    subtitle: "Message your course teachers and see their replies here",
    loading: "Loading...",
    error: "Couldn't load your messages",
    empty: "You haven't enrolled in any course yet to message its teacher",
    browse: "Browse Courses",
    noMessages: "No messages yet — start the conversation",
    placeholder: "Write a message to your course teacher...",
    send: "Send",
    sending: "Sending...",
    selectThread: "Pick a course from the list to open the conversation",
    you: "You",
    justNow: "Just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
    noTeacher: "This course has no assigned teacher yet",
  },
  es: {
    title: "Mis mensajes",
    subtitle: "Escribe a los profesores de tus cursos y ve sus respuestas aquí",
    loading: "Cargando...",
    error: "No se pudieron cargar tus mensajes",
    empty: "Aún no te has inscrito en ningún curso para escribir a su profesor",
    browse: "Explorar cursos",
    noMessages: "Aún no hay mensajes — inicia la conversación",
    placeholder: "Escribe un mensaje para el profesor del curso...",
    send: "Enviar",
    sending: "Enviando...",
    selectThread: "Elige un curso de la lista para abrir la conversación",
    you: "Tú",
    justNow: "Justo ahora",
    minutesAgo: (n) => `hace ${n} min`,
    hoursAgo: (n) => `hace ${n} h`,
    daysAgo: (n) => `hace ${n} d`,
    noTeacher: "Este curso todavía no tiene profesor asignado",
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
      className="rounded-full bg-[#003A91] text-white font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}

function ThreadList({ threads, activeCourseId, onSelect, t, isRTL }) {
  return (
    <div className="divide-y divide-gray-100">
      {threads.map((th) => (
        <button
          key={th.courseId}
          onClick={() => onSelect(th)}
          className={`w-full text-left rtl:text-right flex items-center gap-3 px-4 py-3.5 transition-colors ${
            activeCourseId === th.courseId ? "bg-[#EBEFF6]" : "hover:bg-gray-50"
          }`}
        >
          <Avatar name={th.teacherName} avatar={th.teacherAvatar} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-800 truncate">{th.teacherName || "—"}</p>
              {th.lastAt && (
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(th.lastAt, t)}</span>
              )}
            </div>
            <p className="text-xs text-[#003A91]/80 font-medium truncate">{th.courseTitle}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {th.lastMessage
                ? `${th.lastMessageFromStudent ? `${t.you}: ` : ""}${th.lastMessage}`
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

function ChatPanel({ thread, t, isRTL, session, onSent }) {
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
      const res = await fetch(`/api/courses/${thread.courseId}/messages`, { cache: "no-store" });
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
  }, [thread?.courseId]);

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
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const created = await res.json();
        setMessages((prev) => [...prev, created]);
        setText("");
        onSent?.(thread.courseId, created);
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
        <Avatar name={thread.teacherName} avatar={thread.teacherAvatar} size={36} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{thread.teacherName || t.noTeacher}</p>
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
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/student/messages", { cache: "no-store" });
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

  // فتح كورس معيّن مباشرة لو جاي من رابط إشعار (?course=xxx)
  useEffect(() => {
    const courseParam = searchParams.get("course");
    if (courseParam) {
      setActiveCourseId(courseParam);
      setMobileShowChat(true);
    }
  }, [searchParams]);

  function selectThread(th) {
    setActiveCourseId(th.courseId);
    setMobileShowChat(true);
    router.replace(`/student/messages?course=${th.courseId}`, { scroll: false });
    // فتح الخيط بيعلّم رسايل المدرس كمقروءة في الباك إند — نحدّث العداد محليًا فورًا
    setThreads((prev) => prev?.map((x) => (x.courseId === th.courseId ? { ...x, unreadCount: 0 } : x)));
  }

  function handleSent(courseId, created) {
    setThreads((prev) =>
      prev?.map((x) =>
        x.courseId === courseId
          ? { ...x, lastMessage: created.body, lastMessageFromStudent: true, lastAt: created.createdAt }
          : x
      )
    );
  }

  const activeThread = threads?.find((x) => x.courseId === activeCourseId) || null;

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
          <GraduationCap className="text-gray-300 mx-auto mb-3" size={40} />
          <p className="text-sm text-gray-400 mb-4">{t.empty}</p>
          <a href="/#courses" className="inline-flex items-center gap-2 bg-[#003A91] hover:bg-[#002E74] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
            <BookOpen size={16} /> {t.browse}
          </a>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm shadow-black/[0.02] flex" style={{ height: "min(680px, 78vh)" }}>
          {/* قائمة الخيوط */}
          <div className={`w-full sm:w-80 border-gray-100 rtl:border-l-0 rtl:border-r ltr:border-r shrink-0 overflow-y-auto ${mobileShowChat ? "hidden sm:block" : "block"}`}>
            <ThreadList threads={threads} activeCourseId={activeCourseId} onSelect={selectThread} t={t} isRTL={isRTL} />
          </div>

          {/* لوحة المحادثة */}
          <div className={`flex-1 min-w-0 flex-col ${mobileShowChat ? "flex" : "hidden sm:flex"}`}>
            {mobileShowChat && activeThread && (
              <button
                onClick={() => setMobileShowChat(false)}
                className="sm:hidden flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#003A91] border-b border-gray-100"
              >
                <ArrowBack size={14} /> {t.title}
              </button>
            )}
            <ChatPanel thread={activeThread} t={t} isRTL={isRTL} session={session} onSent={handleSent} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentMessagesPage() {
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