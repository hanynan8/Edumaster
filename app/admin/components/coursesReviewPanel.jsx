'use client';

// app/admin/components/coursesReviewPanel.jsx
//
// 🆕 "Course Review" — لوحة الأدمن الخاصة بمراجعة الكورسات اللي المدرسين
// بعتوها للنشر. لما مدرس يدوس "نشر" على كورس، الكورس مبيتنشرش على الموقع
// على طول (status="published")؛ بيتحول لـ status="pending" ويظهر هنا بس،
// بكل محتواه (الوصف، المتطلبات، هيتعلم إيه، وكل الأقسام/الدروس بالتفصيل)
// لحد ما الأدمن يوافق عليه (بينشر فعليًا) أو يرفضه (بيتحذف بالكامل — مفيش
// حالة "مرفوض" وسيطة، شوف app/api/admin/courses/[id]/reject/route.js).
//
// GET /api/courses?status=pending&limit=50 بيرجع القائمة (نفس endpoint
// العادي بتاع الكورسات، بس بفلتر status متاح للأدمن بس — شوف
// app/api/courses/route.js). تفاصيل كورس واحد + شجرة الأقسام/الدروس بتيجي
// من GET /api/courses/[id] و GET /api/courses/[id]/sections الموجودين
// بالفعل (الأدمن أصلاً عنده وصول كامل لأي كورس مهما كانت حالته).

import { useEffect, useState } from 'react';
import {
  ClipboardCheck, Loader, AlertCircle, CheckCircle2, XCircle, X, BookOpen,
  Clock, User, Tag, Layers, Video, FileType2, FileText as FileTextIcon,
  DollarSign,
} from 'lucide-react';

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const LESSON_ICONS = { video: Video, pdf: FileType2, text: FileTextIcon, quiz: FileTextIcon };

function CourseDetailModal({ courseId, onClose, onApprove, onReject, busy }) {
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [courseRes, sectionsRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/sections`),
        ]);
        const courseData = await courseRes.json();
        const sectionsData = await sectionsRes.json();
        if (!courseRes.ok) throw new Error(courseData?.error || 'load_failed');
        if (cancelled) return;
        setCourse(courseData);
        setSections(Array.isArray(sectionsData) ? sectionsData : []);
      } catch {
        if (!cancelled) setError('Could not load course content.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [courseId]);

  const totalLessons = sections?.reduce((acc, s) => acc + s.lessons.length, 0) ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-blue-600" /> Course review
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex justify-center py-16">
              <Loader className="animate-spin text-blue-500" size={32} />
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!loading && !error && course && (
            <>
              <div className="flex gap-4 mb-5">
                {course.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail} alt={course.title} className="w-32 h-24 rounded-xl object-cover border border-gray-100 shrink-0" />
                ) : (
                  <div className="w-32 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 shrink-0">
                    <BookOpen size={28} />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-800">{course.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{course.shortDescription || '—'}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><User size={12} /> {course.teacherName || '—'}</span>
                    <span className="flex items-center gap-1"><Tag size={12} /> {course.categoryName || '—'}</span>
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} /> {course.isFree ? 'Free' : `${course.price} ${course.currency}`}
                    </span>
                    <span className="flex items-center gap-1"><Layers size={12} /> {course.level}</span>
                  </div>
                </div>
              </div>

              {course.description && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1.5">Full description</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{course.description}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                {course.requirements?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1.5">Requirements</h4>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                      {course.requirements.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {course.outcomes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1.5">What students will learn</h4>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                      {course.outcomes.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {course.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {course.tags.map((t, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              )}

              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">
                  Content — {sections?.length || 0} sections, {totalLessons} lessons
                </h4>
              </div>

              {(!sections || sections.length === 0) && (
                <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg mb-4 flex items-center gap-1.5">
                  <AlertCircle size={13} /> This course has no sections/lessons yet.
                </div>
              )}

              <div className="space-y-3 mb-6">
                {sections?.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 font-semibold text-sm text-gray-700 flex items-center justify-between">
                      <span>{section.title}</span>
                      <span className="text-xs text-gray-400 font-normal">{section.lessons.length} lessons</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {section.lessons.map((lesson) => {
                        const Icon = LESSON_ICONS[lesson.type] || FileTextIcon;
                        return (
                          <div key={lesson.id} className="flex items-center gap-2.5 px-4 py-2 text-sm">
                            <Icon size={14} className="text-gray-400 shrink-0" />
                            <span className="flex-1 text-gray-700 truncate">{lesson.title}</span>
                            {lesson.isPreview && (
                              <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">preview</span>
                            )}
                            {lesson.type === 'video' && lesson.durationSeconds > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={11} /> {formatDuration(lesson.durationSeconds)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {rejecting ? (
                <div className="border border-red-200 bg-red-50/50 rounded-xl p-4">
                  <label className="text-sm font-semibold text-red-700 mb-1.5 block">
                    Rejection reason (optional — sent to the teacher, the course will be permanently deleted)
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300"
                    placeholder="e.g. content quality, missing lessons, inappropriate title..."
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onReject(course.id, reason)}
                      disabled={busy}
                      className="flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60"
                    >
                      {busy && <Loader size={14} className="animate-spin" />} Confirm rejection & delete
                    </button>
                    <button
                      onClick={() => setRejecting(false)}
                      disabled={busy}
                      className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 pt-2 border-t">
                  <button
                    onClick={() => onApprove(course.id)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60"
                  >
                    {busy ? <Loader size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Approve & publish
                  </button>
                  <button
                    onClick={() => setRejecting(true)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle size={16} /> Reject & delete
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoursesReviewPanel() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  function loadPending() {
    setError('');
    fetch('/api/courses?status=pending&limit=50')
      .then((r) => {
        if (!r.ok) throw new Error('forbidden');
        return r.json();
      })
      .then((data) => setCourses(Array.isArray(data?.courses) ? data.courses : []))
      .catch(() => setError('Error fetching pending courses'));
  }

  useEffect(loadPending, []);

  async function handleApprove(courseId) {
    setActionError('');
    setActionSuccess('');
    setBusyId(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.error === 'already_published' ? 'This course is already published.' : 'Failed to approve the course.');
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setReviewingId(null);
      setActionSuccess(`"${data.title}" was approved and published.`);
    } catch {
      setActionError('Failed to approve the course.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(courseId, reason) {
    setActionError('');
    setActionSuccess('');
    setBusyId(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const messages = {
          already_published: 'This course is already published.',
          course_has_students: 'Cannot delete — this course already has enrolled students.',
        };
        setActionError(messages[data?.error] || 'Failed to reject the course.');
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setReviewingId(null);
      setActionSuccess('The course was rejected and deleted.');
    } catch {
      setActionError('Failed to reject the course.');
    } finally {
      setBusyId(null);
    }
  }

  if (courses === null && !error) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Loader className="animate-spin mx-auto" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-blue-900">
            <ClipboardCheck size={28} /> Course Review
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{courses?.length ?? 0}</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Courses submitted by teachers wait here — with their full content — until you approve (publish) or reject (permanently delete) them.
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

        {courses?.length === 0 && !error && (
          <div className="py-16 text-center">
            <ClipboardCheck className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">No courses waiting for review right now.</p>
          </div>
        )}

        {courses?.length > 0 && (
          <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-28 bg-gray-100">
                  {c.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <BookOpen size={32} />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    pending review
                  </span>
                </div>
                <div className="p-3.5">
                  <h3 className="font-semibold text-gray-800 text-sm line-clamp-1 mb-1">{c.title}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <User size={11} /> {c.teacherName || '—'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReviewingId(c.id)}
                      className="flex-1 text-xs font-semibold bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleApprove(c.id)}
                      disabled={busyId === c.id}
                      title="Approve & publish"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewingId && (
        <CourseDetailModal
          courseId={reviewingId}
          busy={busyId === reviewingId}
          onClose={() => setReviewingId(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
