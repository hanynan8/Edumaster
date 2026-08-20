"use client";

// app/teacher/courses/[id]/assignments/page.jsx
//
// Phase 4 — اليوم 37-38: صفحة إدارة واجبات كورس معيّن.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Pencil, Trash2, Inbox, Loader, Calendar } from "lucide-react";
import AssignmentFormModal from "@/app/teacher/components/AssignmentFormModal";
import CourseTabs from "@/app/teacher/components/CourseTabs";

function formatDate(d) {
  if (!d) return "بدون موعد نهائي";
  return new Date(d).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

export default function CourseAssignmentsPage({ params }) {
  const { id } = usePromise(params);
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(undefined);

  async function load() {
    try {
      const res = await fetch(`/api/assignments?course=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setAssignments(data.assignments);
    } catch {
      setError("تعذّر تحميل الواجبات");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleSaved(saved) {
    setModal(undefined);
    setAssignments((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved];
    });
  }

  async function handleDelete(assignment) {
    if (!confirm(`حذف واجب "${assignment.title}"؟ هيتمسح معاه كل تسليمات الطلاب. متأكد؟`)) return;
    const res = await fetch(`/api/assignments/${assignment.id}`, { method: "DELETE" });
    if (res.ok) {
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    } else {
      alert("حصل خطأ أثناء الحذف");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href={`/teacher/courses/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowRight size={15} /> رجوع لمحتوى الكورس
      </Link>

      <CourseTabs courseId={id} active="assignments" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">الواجبات</h1>
        <button
          onClick={() => setModal(null)}
          className="flex items-center gap-2 text-sm font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700"
        >
          <Plus size={16} /> واجب جديد
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}

      {!assignments ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          لسه مفيش واجبات لهذا الكورس
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800 truncate">{a.title}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      a.isPublished ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {a.isPublished ? "منشور" : "مسودة"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Calendar size={12} /> {formatDate(a.dueDate)} · الدرجة الكاملة {a.maxScore}
                </p>
              </div>
              <Link
                href={`/teacher/assignments/${a.id}/submissions`}
                className="flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 shrink-0"
              >
                <Inbox size={14} /> التسليمات
              </Link>
              <button onClick={() => setModal(a)} className="text-gray-400 hover:text-gray-700 p-2 shrink-0">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(a)} className="text-red-400 hover:text-red-600 p-2 shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <AssignmentFormModal courseId={id} assignment={modal} onClose={() => setModal(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}