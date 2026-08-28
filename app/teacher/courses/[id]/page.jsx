"use client";

// app/teacher/courses/[id]/page.jsx — اليوم 10
//
// صفحة إدارة محتوى كورس معيّن: بيانات الكورس + شجرة الأقسام والدروس.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Pencil, Loader } from "lucide-react";
import CourseFormModal from "@/app/teacher/components/CourseFormModal";
import SectionFormModal from "@/app/teacher/components/SectionFormModal";
import LessonFormModal from "@/app/teacher/components/LessonFormModal";
import CourseTree from "@/app/teacher/components/CourseTree";
import CourseTabs from "@/app/teacher/components/CourseTabs";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    loadError: "تعذّر تحميل بيانات الكورس",
    confirmDeleteSection: (title, count) => `حذف "${title}" هيمسح كل دروسه (${count}). متأكد؟`,
    deleteError: "حصل خطأ أثناء الحذف",
    confirmDeleteLesson: (title) => `حذف الدرس "${title}"؟`,
    backToCourses: "رجوع لكورساتي",
    editCourseData: "تعديل بيانات الكورس",
    courseContent: "محتوى الكورس",
  },
  en: {
    loadError: "Couldn't load course data",
    confirmDeleteSection: (title, count) => `Delete "${title}"? This will remove all its lessons (${count}). Are you sure?`,
    deleteError: "Something went wrong while deleting",
    confirmDeleteLesson: (title) => `Delete lesson "${title}"?`,
    backToCourses: "Back to my courses",
    editCourseData: "Edit course details",
    courseContent: "Course content",
  },
};

export default function CourseEditorPage({ params }) {
  const { id } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState(null);
  const [error, setError] = useState("");

  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [sectionModal, setSectionModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [lessonModal, setLessonModal] = useState(undefined); // { sectionId, lesson? }

  async function loadAll() {
    try {
      const [courseRes, sectionsRes] = await Promise.all([
        fetch(`/api/courses/${id}`),
        fetch(`/api/courses/${id}/sections`),
      ]);
      const courseData = await courseRes.json();
      const sectionsData = await sectionsRes.json();
      if (!courseRes.ok) throw new Error(courseData?.error);
      setCourse(courseData);
      setSections(sectionsData);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleSectionSaved(saved) {
    setSectionModal(undefined);
    setSections((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((s) => s.id === saved.id);
      return exists ? prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)) : [...prev, saved];
    });
  }

  async function handleDeleteSection(section) {
    if (!confirm(t.confirmDeleteSection(section.title, section.lessons.length))) return;
    const res = await fetch(`/api/sections/${section.id}`, { method: "DELETE" });
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== section.id));
    } else {
      alert(t.deleteError);
    }
  }

  function handleLessonSaved(sectionId, saved) {
    setLessonModal(undefined);
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const exists = s.lessons.some((l) => l.id === saved.id);
        return {
          ...s,
          lessons: exists ? s.lessons.map((l) => (l.id === saved.id ? saved : l)) : [...s.lessons, saved],
        };
      })
    );
  }

  async function handleDeleteLesson(sectionId, lesson) {
    if (!confirm(t.confirmDeleteLesson(lesson.title))) return;
    const res = await fetch(`/api/lessons/${lesson.id}`, { method: "DELETE" });
    if (res.ok) {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, lessons: s.lessons.filter((l) => l.id !== lesson.id) } : s))
      );
    } else {
      alert(t.deleteError);
    }
  }

  if (error) {
    return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-red-500">{error}</div>;
  }

  if (!course || !sections) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-[#314a6f]" size={36} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/teacher" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <BackArrow size={15} /> {t.backToCourses}
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 mb-1">{course.title}</h1>
          <p className="text-sm text-gray-400">{course.shortDescription}</p>
        </div>
        <button
          onClick={() => setEditCourseOpen(true)}
          className="shrink-0 flex items-center gap-2 text-sm font-semibold border border-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50"
        >
          <Pencil size={14} /> {t.editCourseData}
        </button>
      </div>

      <CourseTabs courseId={id} active="content" />

      <h2 className="text-lg font-semibold text-gray-700 mb-4">{t.courseContent}</h2>
      <CourseTree
        sections={sections}
        onAddSection={() => setSectionModal(null)}
        onEditSection={(s) => setSectionModal(s)}
        onDeleteSection={handleDeleteSection}
        onAddLesson={(sectionId) => setLessonModal({ sectionId })}
        onEditLesson={(sectionId, lesson) => setLessonModal({ sectionId, lesson })}
        onDeleteLesson={handleDeleteLesson}
      />

      {editCourseOpen && (
        <CourseFormModal
          course={course}
          onClose={() => setEditCourseOpen(false)}
          onSaved={(updated) => {
            setCourse(updated);
            setEditCourseOpen(false);
          }}
        />
      )}

      {sectionModal !== undefined && (
        <SectionFormModal
          courseId={id}
          section={sectionModal}
          onClose={() => setSectionModal(undefined)}
          onSaved={handleSectionSaved}
        />
      )}

      {lessonModal !== undefined && (
        <LessonFormModal
          sectionId={lessonModal.sectionId}
          lesson={lessonModal.lesson}
          onClose={() => setLessonModal(undefined)}
          onSaved={(saved) => handleLessonSaved(lessonModal.sectionId, saved)}
        />
      )}
    </div>
  );
}