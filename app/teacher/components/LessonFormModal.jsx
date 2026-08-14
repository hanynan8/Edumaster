"use client";

import { useState } from "react";
import { X, Loader } from "lucide-react";
import MediaUploader from "./MediaUploader";

const TYPES = [
  { value: "video", label: "فيديو" },
  { value: "pdf", label: "ملف PDF" },
  { value: "text", label: "نص" },
];

export default function LessonFormModal({ sectionId, lesson, onClose, onSaved }) {
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
    if (!form.title.trim()) return setError("العنوان مطلوب");
    if (form.type === "video" && !form.videoUrl) return setError("ارفع الفيديو الأول");
    if (form.type === "pdf" && !form.fileUrl) return setError("ارفع الملف الأول");
    if (form.type === "text" && !form.textContent.trim()) return setError("اكتب محتوى الدرس");

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        videoUrl: form.type === "video" ? form.videoUrl : null,
        videoProvider: form.type === "video" ? "cloudinary" : null,
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
          <h3 className="text-lg font-bold text-gray-800">{isEdit ? "تعديل الدرس" : "درس جديد"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">عنوان الدرس *</label>
            <input
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع الدرس</label>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("type", t.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${
                    form.type === t.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.type === "video" && (
            <MediaUploader
              kind="video"
              label="ملف الفيديو"
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
              label="ملف الـ PDF"
              currentUrl={form.fileUrl}
              onUploaded={(f) => update("fileUrl", f.url)}
            />
          )}

          {form.type === "text" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">محتوى الدرس</label>
              <textarea
                rows={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.textContent}
                onChange={(e) => update("textContent", e.target.value)}
              />
            </div>
          )}

          {form.type === "video" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                مدة الفيديو (ثانية) — بتتحدد تلقائي بعد الرفع
              </label>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.durationSeconds}
                onChange={(e) => update("durationSeconds", Number(e.target.value) || 0)}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={form.isPreview} onChange={(e) => update("isPreview", e.target.checked)} />
            درس معاينة مجاني (يظهر لغير المسجلين في الكورس)
          </label>

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