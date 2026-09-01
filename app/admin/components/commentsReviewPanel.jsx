'use client';

// app/admin/components/commentsReviewPanel.jsx
//
// 🆕 "Comment Review" — لوحة الأدمن الخاصة بمراجعة تعليقات/ردود الطلاب تحت
// الدروس (LessonComments على صفحة الكورس التفصيلية). أي تعليق/رد جديد
// بيتولد بـ status="pending" ومش بيظهر لحد غير صاحبه لحد ما يظهر هنا
// ويوافق عليه الأدمن (يبقى ظاهر للكل) أو يرفضه (يفضل مخفي). نفس فلسفة
// coursesReviewPanel.jsx بالظبط.

import { useEffect, useState } from 'react';
import {
  MessageSquare, Loader, AlertCircle, CheckCircle2, XCircle, User, BookOpen,
  CornerDownRight, X,
} from 'lucide-react';

export default function CommentsReviewPanel() {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  function loadPending() {
    setError('');
    fetch('/api/admin/comments?status=pending&limit=100')
      .then((r) => {
        if (!r.ok) throw new Error('forbidden');
        return r.json();
      })
      .then((data) => setComments(Array.isArray(data?.comments) ? data.comments : []))
      .catch(() => setError('Error fetching pending comments'));
  }

  useEffect(loadPending, []);

  async function handleApprove(commentId) {
    setActionError('');
    setActionSuccess('');
    setBusyId(commentId);
    try {
      const res = await fetch(`/api/admin/comments/${commentId}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.error === 'already_approved' ? 'This comment is already approved.' : 'Failed to approve the comment.');
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setActionSuccess('The comment was approved and is now visible.');
    } catch {
      setActionError('Failed to approve the comment.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(commentId) {
    setActionError('');
    setActionSuccess('');
    setBusyId(commentId);
    try {
      const res = await fetch(`/api/admin/comments/${commentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.error === 'already_rejected' ? 'This comment is already rejected.' : 'Failed to reject the comment.');
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setRejectingId(null);
      setReason('');
      setActionSuccess('The comment was rejected and stays hidden.');
    } catch {
      setActionError('Failed to reject the comment.');
    } finally {
      setBusyId(null);
    }
  }

  if (comments === null && !error) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Loader className="animate-spin mx-auto" size={48} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-2xl font-semibold flex items-center gap-3 text-blue-900">
          <MessageSquare size={28} /> Comment Review
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{comments?.length ?? 0}</span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Questions and replies students post under lessons wait here until you approve (visible to everyone) or reject (stays hidden) them.
        </p>
      </div>

      {error && (
        <div className="m-6 flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {actionError && (
        <div className="mx-6 mt-6 flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="mx-6 mt-6 flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} /> {actionSuccess}
        </div>
      )}

      {comments?.length === 0 && !error && (
        <div className="py-16 text-center">
          <MessageSquare className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400">No comments waiting for review right now.</p>
        </div>
      )}

      {comments?.length > 0 && (
        <div className="p-6 space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-gray-700">
                      <User size={12} /> {c.user?.name || '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} /> {c.course?.title || '—'} · {c.lesson?.title || '—'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {c.parentComment ? 'reply' : 'question'}
                    </span>
                  </div>

                  {c.parentComment && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-400 mb-2 ps-1">
                      <CornerDownRight size={12} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{c.parentComment.body}</span>
                    </div>
                  )}

                  <p className="text-sm text-gray-700 whitespace-pre-line">{c.body}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(c.id)}
                    disabled={busyId === c.id}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-green-50 text-green-600 border border-green-200 rounded-lg px-3 py-2 hover:bg-green-100 disabled:opacity-60"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(rejectingId === c.id ? null : c.id)}
                    disabled={busyId === c.id}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>

              {rejectingId === c.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <input
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional, sent to the student)"
                    maxLength={500}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-400"
                  />
                  <button
                    onClick={() => handleReject(c.id)}
                    disabled={busyId === c.id}
                    className="text-xs font-bold text-white bg-red-600 rounded-lg px-3 py-2 hover:bg-red-700 disabled:opacity-60"
                  >
                    Confirm reject
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setReason(''); }}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}