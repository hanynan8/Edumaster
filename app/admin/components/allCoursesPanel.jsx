'use client';

// app/admin/components/allCoursesPanel.jsx
//
// 🆕 "All Courses" — لوحة الأدمن اللي بتوريه كل كورسات المدرسين (أي حالة:
// draft/pending/published/archived)، مش المستنية مراجعة بس زي
// coursesReviewPanel.jsx. بتستخدم نفس GET /api/courses و DELETE /api/courses/[id]
// الحقيقيين (موديل Course)، مش /api/data زي محرر
// app/admin/components/(editcomponents)/courses.jsx (ده بيعدّل كولكشن
// تاني خالص — صفحة الكورسات التسويقية الثابتة).

import { useEffect, useState } from 'react';
import {
  BookOpen, Loader, AlertCircle, Search, User, Tag,
  ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-600',
};

export default function AllCoursesPanel() {
  const [courses, setCourses] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');

  function load() {
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    fetch(`/api/courses?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error('forbidden');
        return r.json();
      })
      .then((data) => {
        setCourses(Array.isArray(data?.courses) ? data.courses : []);
        setPagination(data?.pagination || null);
      })
      .catch(() => setError('Error fetching courses'));
  }

  useEffect(load, [page, search]);

  // 🆕 حذف كورس (الأدمن يقدر يحذف أي كورس). بيستخدم نفس DELETE /api/courses/[id]
  // اللي بيستخدمه المدرس لكورساته — الـ API بيسمح للأدمن أو صاحب الكورس بس،
  // وبيرفض (409) أي كورس فيه طلاب مسجلين عشان نحمي الطلاب الدافعين.
  const [deletingId, setDeletingId] = useState(null);

  const DELETE_ERRORS = {
    forbidden: "You don't have permission to delete this course.",
    not_found: 'Course not found (it may already be deleted).',
    unauthorized: 'Your session expired — please log in again.',
    delete_failed: 'Delete failed. Please try again.',
    internal_error: 'Server error while deleting. Please try again.',
  };

  async function handleDelete(course) {
    if (!confirm(`Delete "${course.title}" permanently?\n\nAll its sections and lessons will be deleted too. This cannot be undone.`)) return;
    setDeletingId(course.id);
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === 'course_has_students') {
          alert(`Can't delete: ${data.studentsCount} student(s) are enrolled in this course. Archive it instead.`);
        } else {
          alert(DELETE_ERRORS[data?.error] || `Delete failed (${data?.error || res.status}).`);
        }
        return;
      }
      setCourses((prev) => (prev ? prev.filter((c) => c.id !== course.id) : prev));
      setPagination((prev) => (prev ? { ...prev, total: Math.max(0, (prev.total || 1) - 1) } : prev));
    } catch {
      alert('Network error while deleting. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
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
            <BookOpen size={28} /> All Courses
            {pagination && (
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pagination.total}</span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Every course from every teacher, any status.
          </p>
          <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button type="submit" className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="m-6 flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {courses?.length === 0 && !error && (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">No courses found.</p>
          </div>
        )}

        {courses?.length > 0 && (
          <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="relative h-24 bg-gray-100">
                  {c.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <BookOpen size={28} />
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="p-3.5 flex flex-col gap-2.5 flex-1">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <User size={11} /> {c.teacherName || '—'}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Tag size={11} /> {c.categoryName || '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c.id}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg py-1.5 hover:bg-red-50 disabled:opacity-60 transition-colors"
                  >
                    {deletingId === c.id ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Delete course
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pb-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}