"use client";

import { useState } from "react";
import { X, Loader } from "lucide-react";
import MediaUploader from "./MediaUploader";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل نصوص المودال (أنواع الدرس، labels، رسائل الخطأ، أزرار) كانت عربي
// ثابت — دلوقتي بتتبع اللغة المختارة من الناف بار.
const TYPE_LABELS = {
  video: { en: "Video", ar: "فيديو", es: "Video" },
  pdf: { en: "PDF file", ar: "ملف PDF", es: "Archivo PDF" },
  text: { en: "Text", ar: "نص", es: "Texto" },
};
const TYPES = ["video", "pdf", "text"];

const T = {
  en: {
    titleRequired: "Title is required",
    uploadVideoFirst: "Upload the video first",
    uploadFileFirst: "Upload the file first",
    writeContent: "Write the lesson content",
    genericError: "Something went wrong, try again",
    editLesson: "Edit lesson",
    newLesson: "New lesson",
    lessonTitle: "Lesson title *",
    lessonType: "Lesson type",
    videoFile: "Video file",
    pdfFile: "PDF file",
    lessonContent: "Lesson content",
    videoDuration: "Video duration (seconds) — set automatically after upload",
    freePreview: "Free preview lesson (visible to people not enrolled in the course)",
    save: "Save",
    cancel: "Cancel",
  },
  ar: {
    titleRequired: "العنوان مطلوب",
    uploadVideoFirst: "ارفع الفيديو الأول",
    uploadFileFirst: "ارفع الملف الأول",
    writeContent: "اكتب محتوى الدرس",
    genericError: "حصل خطأ، حاول تاني",
    editLesson: "تعديل الدرس",
    newLesson: "درس جديد",
    lessonTitle: "عنوان الدرس *",
    lessonType: "نوع الدرس",
    videoFile: "ملف الفيديو",
    pdfFile: "ملف الـ PDF",
    lessonContent: "محتوى الدرس",
    videoDuration: "مدة الفيديو (ثانية) — بتتحدد تلقائي بعد الرفع",
    freePreview: "درس معاينة مجاني (يظهر لغير المسجلين في الكورس)",
    save: "حفظ",
    cancel: "إلغاء",
  },
  es: {
    titleRequired: "El título es obligatorio",
    uploadVideoFirst: "Sube el video primero",
    uploadFileFirst: "Sube el archivo primero",
    writeContent: "Escribe el contenido de la lección",
    genericError: "Ocurrió un error, inténtalo de nuevo",
    editLesson: "Editar lección",
    newLesson: "Nueva lección",
    lessonTitle: "Título de la lección *",
    lessonType: "Tipo de lección",
    videoFile: "Archivo de video",
    pdfFile: "Archivo PDF",
    lessonContent: "Contenido de la lección",
    videoDuration: "Duración del video (segundos) — se calcula automáticamente tras subirlo",
    freePreview: "Lección de vista previa gratuita (visible para quienes no están inscritos en el curso)",
    save: "Guardar",
    cancel: "Cancelar",
  },
};

export default function LessonFormModal({ sectionId, lesson, onClose, onSaved }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const isEdit = Boolean(lesson);
  const [form, setForm] = useState({
    title: lesson?.title || "",
    type: lesson?.type || "video",
    videoUrl: lesson?.videoUrl || "",
    durationSeconds: lesson?.durationSeconds || 0,
    fileUrl: lesson?.fileUrl || "",
    textContent: lesson?.textContent || "",
    isPreview: lesson?.isPreview || false,
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
    if (form.type === "video" && !form.videoUrl) return setError(t.uploadVideoFirst);
    if (form.type === "pdf" && !form.fileUrl) return setError(t.uploadFileFirst);
    if (form.type === "text" && !form.textContent.trim()) return setError(t.writeContent);

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        videoUrl: form.type === "video" ? form.videoUrl : null,
        videoProvider: form.type === "video" ? "bunny" : null,
        durationSeconds: form.durationSeconds,
        fileUrl: form.type === "pdf" ? form.fileUrl : null,
        textContent: form.type === "text" ? form.textContent : null,
        isPreview: form.isPreview,
      };
      const res = await fetch(isEdit ? `/api/lessons/${lesson.id}` : `/api/sections/${sectionId}/lessons`, {
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? t.editLesson : t.newLesson}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.lessonTitle}</label>
            <input
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5c708d]"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.lessonType}</label>
            <div className="flex gap-2">
              {TYPES.map((typeValue) => (
                <button
                  key={typeValue}
                  type="button"
                  onClick={() => update("type", typeValue)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${
                    form.type === typeValue
                      ? "bg-[#0f2d57] text-white border-[#0f2d57]"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {TYPE_LABELS[typeValue][language] || TYPE_LABELS[typeValue].en}
                </button>
              ))}
            </div>
          </div>

          {form.type === "video" && (
            <MediaUploader
              kind="video"
              label={t.videoFile}
              currentUrl={form.videoUrl}
              onUploaded={(f) => {
                update("videoUrl", f.url);
                if (f.durationSeconds) update("durationSeconds", f.durationSeconds);
              }}
            />
          )}

          {form.type === "pdf" && (
            <MediaUploader
              kind="pdf"
              label={t.pdfFile}
              currentUrl={form.fileUrl}
              onUploaded={(f) => update("fileUrl", f.url)}
            />
          )}

          {form.type === "text" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.lessonContent}</label>
              <textarea
                rows={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5c708d]"
                value={form.textContent}
                onChange={(e) => update("textContent", e.target.value)}
              />
            </div>
          )}

          {form.type === "video" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t.videoDuration}
              </label>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5c708d]"
                value={form.durationSeconds}
                onChange={(e) => update("durationSeconds", Number(e.target.value) || 0)}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={form.isPreview} onChange={(e) => update("isPreview", e.target.checked)} />
            {t.freePreview}
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-[#0f2d57] to-[#0f2d57] text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
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