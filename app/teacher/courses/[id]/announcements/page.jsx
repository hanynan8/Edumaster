"use client";

// app/teacher/courses/[id]/announcements/page.jsx
//
// Phase 6 — اليوم 46-47: "Announcements: المدرس ينشر إعلان على الكورس،
// يظهر لكل الطلاب المسجلين". الـ API (GET/POST /api/courses/[id]/announcements،
// DELETE /api/announcements/[id]) وموديل Announcement.js كانوا جاهزين
// بالكامل — بما فيهم إرسال إشعار "announcement_new" لكل طالب مسجّل فعليًا
// وقت النشر (شوف notificationHelpers.js) — بس مفيش أي واجهة إدارة تستخدمهم
// خالص. الصفحة دي هي واجهة النشر/الحذف، بنفس نمط
// app/teacher/courses/[id]/quizzes/page.jsx بالظبط.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, Trash2, Loader, Megaphone } from "lucide-react";
import CourseTabs from "@/app/teacher/components/CourseTabs";

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CourseAnnouncementsPage({ params }) {
  const { id } = usePromise(params);

  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/courses/${id}/announcements`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setAnnouncements(data.announcements);
    } catch {
      setError("تعذّر تحميل الإعلانات");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePublish(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${id}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setAnnouncements((prev) => [data, ...(prev || [])]);
      setTitle("");
      setBody("");
    } catch {
      setError("حصل خطأ أثناء نشر الإعلان");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(announcementId) {
    if (!confirm("حذف هذا الإعلان؟")) return;
    const res = await fetch(`/api/announcements/${announcementId}`, { method: "DELETE" });
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    } else {
      alert("حصل خطأ أثناء الحذف");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href={`/teacher/courses/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowRight size={15} /> رجوع لمحتوى الكورس
      </Link>

      <CourseTabs courseId={id} active="announcements" />

      <h1 className="text-xl font-bold text-gray-800 mb-1">إعلانات الكورس</h1>
      <p className="text-sm text-gray-400 mb-6">
        أي إعلان تنشره هنا هيوصل فورًا كإشعار داخلي لكل طالب مسجّل فعليًا في الكورس ده.
      </p>

      <form onSubmit={handlePublish} className="bg-white rounded-2xl border border-gray-200 p-5 mb-8 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الإعلان"
          maxLength={200}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="نص الإعلان..."
          maxLength={5000}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 resize-none"
        />
        <div className="flex items-center justify-between gap-4">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={posting || !title.trim() || !body.trim()}
            className="ms-auto flex items-center gap-2 text-sm font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {posting ? <Loader size={15} className="animate-spin" /> : <Megaphone size={15} />}
            نشر الإعلان
          </button>
        </div>
      </form>

      {!announcements ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          لسه مفيش إعلانات لهذا الكورس
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800">{a.title}</h3>
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{a.body}</p>
                <p className="text-[11px] text-gray-400 mt-2">{formatDateTime(a.createdAt)}</p>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-600 p-2 shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}