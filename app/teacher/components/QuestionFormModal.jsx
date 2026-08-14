"use client";

// app/teacher/components/QuestionFormModal.jsx
//
// Phase 4 — اليوم 33-34: إضافة/تعديل سؤال (Multiple Choice / True-False)
// جوه كويز معيّن. بيستخدم POST /api/quizzes/[id]/questions للإنشاء و
// PUT /api/quizzes/[id]/questions/[questionId] للتعديل.

import { useState } from "react";
import { X, Loader, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

const TYPES = [
  { value: "multiple_choice", label: "اختيار من متعدد" },
  { value: "true_false", label: "صح / غلط" },
];

function defaultOptionsForType(type) {
  if (type === "true_false") {
    return [
      { text: "صح", isCorrect: true },
      { text: "غلط", isCorrect: false },
    ];
  }
  return [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ];
}

export default function QuestionFormModal({ quizId, question, onClose, onSaved }) {
  const isEdit = Boolean(question);
  const [type, setType] = useState(question?.type || "multiple_choice");
  const [text, setText] = useState(question?.text || "");
  const [points, setPoints] = useState(question?.points ?? 1);
  const [options, setOptions] = useState(
    question?.options?.length ? question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) : defaultOptionsForType(type)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleTypeChange(nextType) {
    setType(nextType);
    // لو رجّعنا لنوع true_false، نرجّع الخيارات الافتراضية بتاعته
    if (nextType === "true_false") {
      setOptions(defaultOptionsForType("true_false"));
    } else if (options.length < 2 || options.some((o) => !o.text)) {
      setOptions(defaultOptionsForType("multiple_choice"));
    }
  }

  function updateOptionText(idx, value) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, text: value } : o)));
  }

  function setCorrectOption(idx) {
    // multiple_choice: خيار صح واحد بس (اختيار واحد صحيح) — لو حبيت
    // تسمح بأكتر من إجابة صح ممكن تحول الـ setCorrectOption لـ toggle
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  }

  function removeOption(idx) {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // لو مسحنا الخيار الصح، خلّي أول خيار صح تلقائي عشان الفورم يفضل صالح
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!text.trim()) return setError("نص السؤال مطلوب");
    if (options.some((o) => !o.text.trim())) return setError("كل الخيارات لازم يكون ليها نص");
    if (!options.some((o) => o.isCorrect)) return setError("لازم تحدد إجابة صحيحة واحدة على الأقل");
    if (type === "true_false" && options.length !== 2) return setError("صح/غلط لازم يكون بالظبط خيارين");

    setSaving(true);
    try {
      const payload = {
        type,
        text: text.trim(),
        points: Number(points) || 1,
        options: options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
      };
      const res = await fetch(
        isEdit ? `/api/quizzes/${quizId}/questions/${question.id}` : `/api/quizzes/${quizId}/questions`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      onSaved(data);
    } catch {
      setError("حصل خطأ، حاول تاني");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-800">{isEdit ? "تعديل السؤال" : "سؤال جديد"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع السؤال</label>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${
                    type === t.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">نص السؤال *</label>
            <textarea
              autoFocus
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">الخيارات — اضغط على الدائرة لتحديد الإجابة الصحيحة</label>
              {type === "multiple_choice" && options.length < 6 && (
                <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                  <Plus size={13} /> خيار
                </button>
              )}
            </div>
            <div className="space-y-2">
              {options.map((o, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectOption(idx)}
                    className={o.isCorrect ? "text-green-600" : "text-gray-300 hover:text-gray-400"}
                    title="حدد كإجابة صحيحة"
                  >
                    {o.isCorrect ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <input
                    disabled={type === "true_false"}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder={`خيار ${idx + 1}`}
                    value={o.text}
                    onChange={(e) => updateOptionText(idx, e.target.value)}
                  />
                  {type === "multiple_choice" && options.length > 2 && (
                    <button type="button" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الدرجة</label>
            <input
              type="number"
              min={0}
              step={0.5}
              className="w-32 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader size={18} className="animate-spin" />}
              حفظ
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}