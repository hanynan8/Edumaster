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
import { ArrowRight, ArrowLeft, Trash2, Loader, Megaphone } from "lucide-react";
import CourseTabs from "@/app/teacher/components/CourseTabs";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    loadError: "تعذّر تحميل الإعلانات",
    publishError: "حصل خطأ أثناء نشر الإعلان",
    confirmDelete: "حذف هذا الإعلان؟",
    deleteError: "حصل خطأ أثناء الحذف",
    backToContent: "رجوع لمحتوى الكورس",
    pageTitle: "إعلانات الكورس",
    pageSubtitle: "أي إعلان تنشره هنا هيوصل فورًا كإشعار داخلي لكل طالب مسجّل فعليًا في الكورس ده.",
    titlePlaceholder: "عنوان الإعلان",
    bodyPlaceholder: "نص الإعلان...",
    publish: "نشر الإعلان",
    empty: "لسه مفيش إعلانات لهذا الكورس",
  },
  en: {
    loadError: "Couldn't load announcements",
    publishError: "Something went wrong while publishing the announcement",
    confirmDelete: "Delete this announcement?",
    deleteError: "Something went wrong while deleting",
    backToContent: "Back to course content",
    pageTitle: "Course announcements",
    pageSubtitle: "Any announcement you publish here reaches every enrolled student instantly as an in-app notification.",
    titlePlaceholder: "Announcement title",
    bodyPlaceholder: "Announcement text...",
    publish: "Publish announcement",
    empty: "No announcements for this course yet",
  },
};

export default function CourseAnnouncementsPage({ params }) {
  const { id } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const locale = language === "ar" ? "ar-EG" : language === "es" ? "es-ES" : "en-US";

  function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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
      setError(t.loadError);
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
      setError(t.publishError);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(announcementId) {
    if (!confirm(t.confirmDelete)) return;
    const res = await fetch(`/api/announcements/${announcementId}`, { method: "DELETE" });
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    } else {
      alert(t.deleteError);
    }
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href={`/teacher/courses/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <BackArrow size={15} /> {t.backToContent}
      </Link>

      <CourseTabs courseId={id} active="announcements" />

      <h1 className="text-xl font-semibold text-gray-800 mb-1">{t.pageTitle}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {t.pageSubtitle}
      </p>

      <form onSubmit={handlePublish} className="bg-white rounded-2xl border border-gray-200 p-5 mb-8 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
          maxLength={200}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#314a6f]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.bodyPlaceholder}
          maxLength={5000}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#314a6f] resize-none"
        />
        <div className="flex items-center justify-between gap-4">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={posting || !title.trim() || !body.trim()}
            className="ms-auto flex items-center gap-2 text-sm font-semibold bg-[#0f2d57] text-white px-4 py-2.5 rounded-xl hover:bg-[#0c2547] disabled:opacity-50 transition-colors"
          >
            {posting ? <Loader size={15} className="animate-spin" /> : <Megaphone size={15} />}
            {t.publish}
          </button>
        </div>
      </form>

      {!announcements ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-[#314a6f]" size={32} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-800">{a.title}</h3>
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