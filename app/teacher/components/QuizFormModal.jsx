"use client";

// app/teacher/components/QuizFormModal.jsx
//
// Phase 4 — اليوم 33-34: إنشاء/تعديل كويز (بيانات الكويز نفسه — الأسئلة
// بتتضاف من صفحة منفصلة app/teacher/quizzes/[quizId]).

import { useState } from "react";
import { X, Loader } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل نصوص المودال كانت عربي ثابت — دلوقتي بتتبع اللغة المختارة من
// الناف بار.
const T = {
  en: {
    titleRequired: "Quiz title is required",
    genericError: "Something went wrong, try again",
    editQuiz: "Edit quiz",
    newQuiz: "New quiz",
    quizTitle: "Quiz title *",
    shortDesc: "Short description (optional)",
    timeMinutes: "Time (minutes)",
    noLimit: "No limit",
    passingScore: "Passing score %",
    maxAttempts: "Max attempts",
    publishQuiz: "Publish quiz (visible to students immediately — keep this off until you finish adding questions)",
    save: "Save",
    cancel: "Cancel",
  },
  ar: {
    titleRequired: "عنوان الكويز مطلوب",
    genericError: "حصل خطأ، حاول تاني",
    editQuiz: "تعديل الكويز",
    newQuiz: "كويز جديد",
    quizTitle: "عنوان الكويز *",
    shortDesc: "وصف مختصر (اختياري)",
    timeMinutes: "الوقت (دقيقة)",
    noLimit: "بدون حد",
    passingScore: "نسبة النجاح %",
    maxAttempts: "أقصى محاولات",
    publishQuiz: "نشر الكويز (يظهر للطلاب فورًا — سيب ده مقفول لحد ما تخلّص إضافة الأسئلة)",
    save: "حفظ",
    cancel: "إلغاء",
  },
  es: {
    titleRequired: "El título del cuestionario es obligatorio",
    genericError: "Ocurrió un error, inténtalo de nuevo",
    editQuiz: "Editar cuestionario",
    newQuiz: "Nuevo cuestionario",
    quizTitle: "Título del cuestionario *",
    shortDesc: "Descripción breve (opcional)",
    timeMinutes: "Tiempo (minutos)",
    noLimit: "Sin límite",
    passingScore: "Puntaje de aprobación %",
    maxAttempts: "Intentos máximos",
    publishQuiz: "Publicar cuestionario (visible para los alumnos de inmediato — déjalo apagado hasta terminar de agregar las preguntas)",
    save: "Guardar",
    cancel: "Cancelar",
  },
};

export default function QuizFormModal({ courseId, quiz, onClose, onSaved }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const isEdit = Boolean(quiz);
  const [form, setForm] = useState({
    title: quiz?.title || "",
    description: quiz?.description || "",
    timeLimitMinutes: quiz?.timeLimitMinutes ?? "",
    passingScorePercent: quiz?.passingScorePercent ?? 60,
    maxAttempts: quiz?.maxAttempts ?? 1,
    isPublished: quiz?.isPublished || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError(t.titleRequired);

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        timeLimitMinutes: form.timeLimitMinutes === "" ? null : Number(form.timeLimitMinutes),
        passingScorePercent: Number(form.passingScorePercent),
        maxAttempts: Number(form.maxAttempts),
        isPublished: form.isPublished,
      };
      if (!isEdit) payload.course = courseId;

      const res = await fetch(isEdit ? `/api/quizzes/${quiz.id}` : `/api/quizzes`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      onSaved(data);
    } catch {
      setError(t.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? t.editQuiz : t.newQuiz}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.quizTitle}</label>
            <input
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5c708d]"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.shortDesc}</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5c708d]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.timeMinutes}</label>
              <input
                type="number"
                min={1}
                placeholder={t.noLimit}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5c708d]"
                value={form.timeLimitMinutes}
                onChange={(e) => update("timeLimitMinutes", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.passingScore}</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5c708d]"
                value={form.passingScorePercent}
                onChange={(e) => update("passingScorePercent", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.maxAttempts}</label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5c708d]"
                value={form.maxAttempts}
                onChange={(e) => update("maxAttempts", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => update("isPublished", e.target.checked)} />
            {t.publishQuiz}
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0f2d57] to-[#0f2d57] text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader size={18} className="animate-spin" />}
              {t.save}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50">
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}