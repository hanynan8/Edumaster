"use client";

// app/teacher/courses/[id]/quizzes/page.jsx
//
// Phase 4 — اليوم 33-34: صفحة إدارة كويزات كورس معيّن. نفس بالظبط نمط
// app/teacher/courses/[id]/assignments/page.jsx (تبويب مشابه في CourseTabs).
// من هنا المدرس بيعمل كويز جديد (بيانات عامة بس) وبعدين يدخل صفحة الكويز
// نفسه (app/teacher/quizzes/[quizId]) عشان يضيف الأسئلة.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Plus, Pencil, Trash2, ListChecks, BarChart3, Loader, Clock } from "lucide-react";
import QuizFormModal from "@/app/teacher/components/QuizFormModal";
import CourseTabs from "@/app/teacher/components/CourseTabs";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    loadError: "تعذّر تحميل الكويزات",
    confirmDelete: (title) => `حذف كويز "${title}"؟ هيتمسح معاه كل الأسئلة ونتائج الطلاب. متأكد؟`,
    deleteError: "حصل خطأ أثناء الحذف",
    backToContent: "رجوع لمحتوى الكورس",
    pageTitle: "الكويزات",
    newQuiz: "كويز جديد",
    empty: "لسه مفيش كويزات لهذا الكورس",
    published: "منشور",
    draft: "مسودة",
    questionsCount: (n) => `${n} سؤال`,
    passingScore: (p) => `نسبة النجاح ${p}%`,
    maxAttempts: (n) => `أقصى محاولات ${n}`,
    minutes: (m) => `${m} دقيقة`,
    questions: "الأسئلة",
    results: "النتائج",
  },
  en: {
    loadError: "Couldn't load quizzes",
    confirmDelete: (title) => `Delete quiz "${title}"? All questions and student results will be deleted with it. Are you sure?`,
    deleteError: "Something went wrong while deleting",
    backToContent: "Back to course content",
    pageTitle: "Quizzes",
    newQuiz: "New quiz",
    empty: "No quizzes for this course yet",
    published: "Published",
    draft: "Draft",
    questionsCount: (n) => `${n} question${n === 1 ? "" : "s"}`,
    passingScore: (p) => `Passing score ${p}%`,
    maxAttempts: (n) => `Max attempts ${n}`,
    minutes: (m) => `${m} min`,
    questions: "Questions",
    results: "Results",
  },
};

export default function CourseQuizzesPage({ params }) {
  const { id } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(undefined);

  async function load() {
    try {
      const res = await fetch(`/api/quizzes?course=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setQuizzes(data.quizzes);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleSaved(saved) {
    setModal(undefined);
    setQuizzes((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((q) => q.id === saved.id);
      return exists ? prev.map((q) => (q.id === saved.id ? { ...q, ...saved } : q)) : [saved, ...prev];
    });
  }

  async function handleDelete(quiz) {
    if (!confirm(t.confirmDelete(quiz.title))) return;
    const res = await fetch(`/api/quizzes/${quiz.id}`, { method: "DELETE" });
    if (res.ok) {
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
    } else {
      alert(t.deleteError);
    }
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href={`/teacher/courses/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <BackArrow size={15} /> {t.backToContent}
      </Link>

      <CourseTabs courseId={id} active="quizzes" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">{t.pageTitle}</h1>
        <button
          onClick={() => setModal(null)}
          className="flex items-center gap-2 text-sm font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700"
        >
          <Plus size={16} /> {t.newQuiz}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}

      {!quizzes ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800 truncate">{q.title}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      q.isPublished ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {q.isPublished ? t.published : t.draft}
                  </span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                  <span>{t.questionsCount(q.questionsCount)}</span>
                  <span>· {t.passingScore(q.passingScorePercent)}</span>
                  <span>· {t.maxAttempts(q.maxAttempts)}</span>
                  {q.timeLimitMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {t.minutes(q.timeLimitMinutes)}
                    </span>
                  )}
                </p>
              </div>
              <Link
                href={`/teacher/quizzes/${q.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 shrink-0"
              >
                <ListChecks size={14} /> {t.questions}
              </Link>
              <Link
                href={`/teacher/quizzes/${q.id}/results`}
                className="flex items-center gap-1.5 text-xs font-semibold bg-purple-50 text-purple-600 px-3 py-2 rounded-lg hover:bg-purple-100 shrink-0"
              >
                <BarChart3 size={14} /> {t.results}
              </Link>
              <button onClick={() => setModal(q)} className="text-gray-400 hover:text-gray-700 p-2 shrink-0">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(q)} className="text-red-400 hover:text-red-600 p-2 shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <QuizFormModal courseId={id} quiz={modal} onClose={() => setModal(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}