"use client";

// app/teacher/page.jsx — اليوم 10: صفحة "كورساتي"
//
// بتجيب كورسات المدرس الحالي بس (GET /api/courses بيرجع كورسات صاحب
// السيشن تلقائيًا لو role=teacher — شوف app/api/courses/route.js).

import { useEffect, useState } from "react";
import { Plus, Loader, BookOpen, GraduationCap, BarChart3 } from "lucide-react";
import Link from "next/link";
import CourseCard from "./components/CourseCard";
import CourseFormModal from "./components/CourseFormModal";

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [modalCourse, setModalCourse] = useState(undefined); // undefined=closed, null=new, object=edit

  async function loadCourses() {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setCourses(data.courses);
    } catch {
      setError("تعذّر تحميل الكورسات");
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  function handleSaved(saved) {
    setModalCourse(undefined);
    setCourses((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
  }

  async function handleDelete(course) {
    if (!confirm(`متأكد إنك عايز تحذف "${course.title}"؟ الإجراء ده مينفعش يترجع.`)) return;
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "course_has_students") {
          alert(`مينفعش تحذف الكورس ده — فيه ${data.studentsCount} طالب مسجل. أرشفه بدل الحذف.`);
        } else {
          alert("حصل خطأ أثناء الحذف");
        }
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch {
      alert("حصل خطأ أثناء الحذف");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <GraduationCap className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">كورساتي</h1>
            <p className="text-sm text-gray-400">إدارة الكورسات اللي إنت بتدرّسها</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/teacher/performance"
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <BarChart3 size={16} /> الأداء والإحصائيات
          </Link>
          <button
            onClick={() => setModalCourse(null)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90"
          >
            <Plus size={18} /> كورس جديد
          </button>
        </div>
      </div>

      {courses === null && !error && (
        <div className="flex justify-center py-20">
          <Loader className="animate-spin text-blue-500" size={36} />
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {courses?.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400 mb-4">لسه معملتش أي كورس</p>
          <button
            onClick={() => setModalCourse(null)}
            className="text-blue-600 font-semibold hover:underline"
          >
            ابدأ بإنشاء أول كورس
          </button>
        </div>
      )}

      {courses?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onEdit={setModalCourse} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modalCourse !== undefined && (
        <CourseFormModal
          course={modalCourse}
          onClose={() => setModalCourse(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}