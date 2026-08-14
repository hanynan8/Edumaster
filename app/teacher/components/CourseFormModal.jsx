"use client";

// app/teacher/components/CourseFormModal.jsx
//
// فورم إنشاء/تعديل كورس. بيستخدم POST /api/courses للإنشاء و
// PUT /api/courses/[id] للتعديل. الغلاف (thumbnail) بيترفع بـ MediaUploader
// (كـ "image") عن طريق /api/upload/file لـ Bunny Storage.

import { useEffect, useState } from "react";
import { X, Loader } from "lucide-react";
import MediaUploader from "./MediaUploader";

const LEVELS = [
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
];

const STATUSES = [
  { value: "draft", label: "مسودة" },
  { value: "published", label: "منشور" },
  { value: "archived", label: "مؤرشف" },
];

export default function CourseFormModal({ course, onClose, onSaved }) {
  const isEdit = Boolean(course);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: course?.title || "",
    shortDescription: course?.shortDescription || "",
    description: course?.description || "",
    thumbnail: course?.thumbnail || "",
    category: course?.category || "",
    level: course?.level || "beginner",
    language: course?.language || "ar",
    price: course?.price ?? 0,
    isFree: course?.isFree ?? false,
    status: course?.status || "draft",
    requirements: (course?.requirements || []).join("\n"),
    outcomes: (course?.outcomes || []).join("\n"),
    tags: (course?.tags || []).join(", "),
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) return setError("العنوان مطلوب");
    if (!form.category) return setError("اختر تصنيف");

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        shortDescription: form.shortDescription,
        description: form.description,
        thumbnail: form.thumbnail || null,
        category: form.category,
        level: form.level,
        language: form.language,
        price: Number(form.price) || 0,
        isFree: form.isFree,
        status: form.status,
        requirements: form.requirements.split("\n").map((s) => s.trim()).filter(Boolean),
        outcomes: form.outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };

      const res = await fetch(isEdit ? `/api/courses/${course.id}` : "/api/courses", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "save_failed");

      onSaved(data);
    } catch (err) {
      setError(err.message === "slug_taken" ? "العنوان مستخدم بالفعل، جرّب عنوان مختلف" : "حصل خطأ، حاول تاني");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-bold text-gray-800">{isEdit ? "تعديل الكورس" : "كورس جديد"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">عنوان الكورس *</label>
            <input
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">وصف قصير (يظهر في الكارت)</label>
            <input
              maxLength={300}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              value={form.shortDescription}
              onChange={(e) => update("shortDescription", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف الكامل</label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <MediaUploader
            kind="image"
            label="صورة الغلاف"
            currentUrl={form.thumbnail}
            onUploaded={(f) => update("thumbnail", f.url)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">التصنيف *</label>
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                required
              >
                <option value="">اختر...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">المستوى</label>
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.level}
                onChange={(e) => update("level", e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">السعر (جنيه)</label>
              <input
                type="number"
                min={0}
                disabled={form.isFree}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.isFree} onChange={(e) => update("isFree", e.target.checked)} />
              مجاني
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">المتطلبات المسبقة (سطر لكل عنصر)</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.requirements}
              onChange={(e) => update("requirements", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">هيتعلم إيه (سطر لكل عنصر)</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.outcomes}
              onChange={(e) => update("outcomes", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags (مفصولة بفاصلة)</label>
            <input
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الحالة</label>
            <select
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader size={18} className="animate-spin" />}
              {isEdit ? "حفظ التعديلات" : "إنشاء الكورس"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}