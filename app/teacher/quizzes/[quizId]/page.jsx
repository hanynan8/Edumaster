"use client";

// app/teacher/quizzes/[quizId]/page.jsx
//
// Phase 4 — اليوم 33-34: إدارة أسئلة كويز معيّن (إضافة/تعديل/حذف). بيستخدم
// GET /api/quizzes/[id] اللي بيرجّع الأسئلة كاملة (مع isCorrect) للمدرس
// صاحب الكورس بس.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, Loader } from "lucide-react";
import QuestionFormModal from "@/app/teacher/components/QuestionFormModal";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    typeLabels: { multiple_choice: "اختيار من متعدد", true_false: "صح / غلط" },
    loadError: "تعذّر تحميل الكويز",
    confirmDelete: "حذف السؤال ده؟",
    deleteError: "حصل خطأ أثناء الحذف",
    backToQuizzes: "رجوع للكويزات",
    draftNotice: "مسودة — مش ظاهر للطلاب لحد ما تنشره من صفحة الكويزات",
    questions: (n) => `الأسئلة (${n})`,
    newQuestion: "سؤال جديد",
    question: (n) => `سؤال ${n}`,
    points: (p) => `${p} درجة`,
    empty: "لسه مفيش أسئلة — الطلاب مش هيقدروا يحلّوا الكويز غير لما يكون فيه سؤال واحد على الأقل",
  },
  en: {
    typeLabels: { multiple_choice: "Multiple choice", true_false: "True / False" },
    loadError: "Couldn't load the quiz",
    confirmDelete: "Delete this question?",
    deleteError: "Something went wrong while deleting",
    backToQuizzes: "Back to quizzes",
    draftNotice: "Draft — not visible to students until you publish it from the quizzes page",
    questions: (n) => `Questions (${n})`,
    newQuestion: "New question",
    question: (n) => `Question ${n}`,
    points: (p) => `${p} pts`,
    empty: "No questions yet — students won't be able to take the quiz until it has at least one question",
  },
};

export default function QuizQuestionsPage({ params }) {
  const { quizId } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(undefined);

  async function load() {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setQuiz(data);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  function handleSaved(saved) {
    setModal(undefined);
    setQuiz((prev) => {
      const exists = prev.questions.some((q) => q.id === saved.id);
      return {
        ...prev,
        questions: exists ? prev.questions.map((q) => (q.id === saved.id ? saved : q)) : [...prev.questions, saved],
      };
    });
  }

  async function handleDelete(question) {
    if (!confirm(t.confirmDelete)) return;
    const res = await fetch(`/api/quizzes/${quizId}/questions/${question.id}`, { method: "DELETE" });
    if (res.ok) {
      setQuiz((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== question.id) }));
    } else {
      alert(t.deleteError);
    }
  }

  if (error) return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-red-500">{error}</div>;
  if (!quiz) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-[#2456A1]" size={36} />
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href={`/teacher/courses/${quiz.course}/quizzes`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <BackArrow size={15} /> {t.backToQuizzes}
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-1">{quiz.title}</h1>
        {quiz.description && <p className="text-sm text-gray-400">{quiz.description}</p>}
        {!quiz.isPublished && (
          <p className="text-xs text-amber-600 bg-amber-50 inline-block px-2.5 py-1 rounded-full mt-3">
            {t.draftNotice}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">{t.questions(quiz.questions.length)}</h2>
        <button
          onClick={() => setModal(null)}
          className="flex items-center gap-2 text-sm font-semibold bg-[#003A91] text-white px-4 py-2.5 rounded-xl hover:bg-[#002E74]"
        >
          <Plus size={16} /> {t.newQuestion}
        </button>
      </div>

      {quiz.questions.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-400">
                    {t.question(idx + 1)} · {t.typeLabels[q.type]} · {t.points(q.points)}
                  </span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{q.text}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setModal(q)} className="text-gray-400 hover:text-gray-700 p-1.5">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(q)} className="text-red-400 hover:text-red-600 p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((o) => (
                  <div
                    key={o.index}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                      o.isCorrect ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {o.isCorrect && <CheckCircle2 size={14} className="shrink-0" />}
                    <span className="truncate">{o.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <QuestionFormModal quizId={quizId} question={modal} onClose={() => setModal(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}