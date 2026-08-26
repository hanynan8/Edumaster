"use client";

import { useState } from "react";
import { X, Loader } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل نصوص المودال (عنوان، labels، placeholder، رسائل الخطأ، أزرار)
// كانت عربي ثابت — دلوقتي بتتبع اللغة المختارة من الناف بار.
const T = {
  en: {
    titleRequired: "Title is required",
    genericError: "Something went wrong, try again",
    editSection: "Edit section",
    newSection: "New section",
    sectionTitle: "Section title *",
    titlePlaceholder: "Example: Chapter 1 - Introduction",
    description: "Description (optional)",
    save: "Save",
    cancel: "Cancel",
  },
  ar: {
    titleRequired: "العنوان مطلوب",
    genericError: "حصل خطأ، حاول تاني",
    editSection: "تعديل القسم",
    newSection: "قسم جديد",
    sectionTitle: "عنوان القسم *",
    titlePlaceholder: "مثال: الفصل 1 - مقدمة",
    description: "وصف (اختياري)",
    save: "حفظ",
    cancel: "إلغاء",
  },
  es: {
    titleRequired: "El título es obligatorio",
    genericError: "Ocurrió un error, inténtalo de nuevo",
    editSection: "Editar sección",
    newSection: "Nueva sección",
    sectionTitle: "Título de la sección *",
    titlePlaceholder: "Ejemplo: Capítulo 1 - Introducción",
    description: "Descripción (opcional)",
    save: "Guardar",
    cancel: "Cancelar",
  },
};

export default function SectionFormModal({ courseId, section, onClose, onSaved }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const isEdit = Boolean(section);
  const [title, setTitle] = useState(section?.title || "");
  const [description, setDescription] = useState(section?.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return setError(t.titleRequired);
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        isEdit ? `/api/sections/${section.id}` : `/api/courses/${courseId}/sections`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), description }),
        }
      );
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? t.editSection : t.newSection}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.sectionTitle}</label>
            <input
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.description}</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
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