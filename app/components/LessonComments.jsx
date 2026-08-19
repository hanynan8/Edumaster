"use client";

// app/components/LessonComments.jsx
//
// Phase 6 — اليوم 48-49: "Discussions/Comments بسيطة تحت كل Lesson (سؤال
// ورد)". موديل Comment.js والـ API (GET/POST /api/lessons/[id]/comments،
// DELETE /api/comments/[id]) كانوا جاهزين بالكامل من غير أي واجهة تستخدمهم
// خالص — الكومبوننت ده هو الربط الناقص. مستوى واحد بس (سؤال + ردود مباشرة
// عليه)، زي ما الموديل نفسه مصمم بالظبط.
//
// بيتحط جوه الدرس المفتوح في app/(pages)/courses/[id]/page.jsx — بس لطالب
// عنده وصول فعلي للكورس (hasAccess)، مطابقةً لفحص الـ API نفسه (403
// enrollment_required لغير كده — مفيش داعي نعرض الفورم لزائر preview).

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, Send, Trash2, Loader } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 🖼️ صورة صاحب التعليق/الرد جمب اسمه — نفس شكل UserAvatar في navbar.jsx
// (صورة لو موجودة، وإلا حرف أول الاسم كـ fallback) عشان يبقى الشكل متسق
// في كل الموقع.
function CommentAvatar({ user, size = 24 }) {
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || "avatar"}
        className="rounded-full object-cover ring-1 ring-black/5 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full bg-[#C9A227] text-white font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

const STRINGS = {
  ar: {
    title: "أسئلة ونقاش",
    askPlaceholder: "اسأل سؤال عن الدرس ده...",
    replyPlaceholder: "اكتب ردًا...",
    send: "إرسال",
    reply: "رد",
    empty: "لسه مفيش أسئلة على الدرس ده. كن أول من يسأل!",
  },
  en: {
    title: "Discussion",
    askPlaceholder: "Ask a question about this lesson...",
    replyPlaceholder: "Write a reply...",
    send: "Send",
    reply: "Reply",
    empty: "No questions yet. Be the first to ask!",
  },
};

export default function LessonComments({ lessonId }) {
  const { language } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const { data: session } = useSession();

  const [comments, setComments] = useState(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyOpenFor, setReplyOpenFor] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});

  useEffect(() => {
    let ignore = false;
    fetch(`/api/lessons/${lessonId}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((data) => {
        if (!ignore) setComments(data.comments || []);
      })
      .catch(() => {
        if (!ignore) setComments([]);
      });
    return () => {
      ignore = true;
    };
  }, [lessonId]);

  async function submitQuestion(e) {
    e.preventDefault();
    const body = newQuestion.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [...(prev || []), created]);
        setNewQuestion("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function submitReply(parentId) {
    const body = (replyDrafts[parentId] || "").trim();
    if (!body) return;
    const res = await fetch(`/api/lessons/${lessonId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentComment: parentId }),
    });
    if (res.ok) {
      const created = await res.json();
      setComments((prev) =>
        prev.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies || []), created] } : c))
      );
      setReplyDrafts((prev) => ({ ...prev, [parentId]: "" }));
      setReplyOpenFor(null);
    }
  }

  async function handleDelete(commentId, isQuestion, parentId) {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) return;
    setComments((prev) => {
      if (isQuestion) return prev.filter((c) => c.id !== commentId);
      return prev.map((c) =>
        c.id === parentId ? { ...c, replies: (c.replies || []).filter((r) => r.id !== commentId) } : c
      );
    });
  }

  const userId = session?.user?.id;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <MessageCircle size={15} className="text-[#1D6FD8]" /> {t.title}
      </h4>

      <form onSubmit={submitQuestion} className="flex items-center gap-2 mb-4">
        <input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder={t.askPlaceholder}
          maxLength={2000}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1D6FD8]"
        />
        <button
          type="submit"
          disabled={posting || !newQuestion.trim()}
          className="shrink-0 bg-[#1D6FD8] text-white p-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          aria-label={t.send}
        >
          <Send size={15} />
        </button>
      </form>

      {!comments ? (
        <div className="flex justify-center py-6">
          <Loader className="animate-spin text-gray-300" size={20} />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">{t.empty}</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <CommentAvatar user={c.user} size={26} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">{c.user?.name || "—"}</p>
                    <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-line">{c.body}</p>
                  </div>
                </div>
                {userId === c.user?.id && (
                  <button
                    onClick={() => handleDelete(c.id, true, null)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    aria-label="delete"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {(c.replies || []).map((r) => (
                <div
                  key={r.id}
                  className="mt-2 ms-4 ps-3 border-s-2 border-gray-200 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <CommentAvatar user={r.user} size={22} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700">{r.user?.name || "—"}</p>
                      <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-line">{r.body}</p>
                    </div>
                  </div>
                  {userId === r.user?.id && (
                    <button
                      onClick={() => handleDelete(r.id, false, c.id)}
                      className="text-gray-300 hover:text-red-500 shrink-0"
                      aria-label="delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}

              {replyOpenFor === c.id ? (
                <div className="mt-2 ms-4 flex items-center gap-2">
                  <input
                    autoFocus
                    value={replyDrafts[c.id] || ""}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitReply(c.id);
                    }}
                    placeholder={t.replyPlaceholder}
                    maxLength={2000}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#1D6FD8]"
                  />
                  <button onClick={() => submitReply(c.id)} className="text-xs font-semibold text-[#1D6FD8] shrink-0">
                    {t.send}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReplyOpenFor(c.id)}
                  className="mt-2 ms-4 text-[11px] font-semibold text-gray-400 hover:text-[#1D6FD8] transition-colors"
                >
                  {t.reply}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}