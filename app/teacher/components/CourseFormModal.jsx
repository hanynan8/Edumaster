"use client";

// app/teacher/components/CourseFormModal.jsx
//
// فورم إنشاء/تعديل كورس. بيستخدم POST /api/courses للإنشاء و
// PUT /api/courses/[id] للتعديل. الغلاف (thumbnail) بيترفع بـ MediaUploader
// (كـ "image") عن طريق /api/upload/file لـ Bunny Storage.

import { useEffect, useState } from "react";
import { X, Loader } from "lucide-react";
import MediaUploader from "./MediaUploader";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كل نصوص الفورم كانت عربي ثابت — دلوقتي بتتبع اللغة المختارة من
// الناف بار (en/ar/es).
const T = {
  en: {
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    statuses: {
      draft: "Draft",
      published: "Publish (needs admin approval)",
      pending: "Pending review (waiting for admin)",
      archived: "Archived",
    },
    titleRequired: "Title is required",
    chooseCategory: "Choose a category",
    submittedForReview: "The course was sent to the admin for review. It will appear to students once approved.",
    savedAsDraft:
      "The course was saved as a draft when created. To send it to the admin for review, open the course, add content (sections & lessons), then choose \"Publish\" again.",
    slugTaken: "This title is already used, try a different one",
    genericError: "Something went wrong, try again",
    editCourse: "Edit course",
    newCourse: "New course",
    courseTitle: "Course title *",
    shortDesc: "Short description (shown on the card)",
    fullDesc: "Full description",
    coverImage: "Cover image",
    category: "Category *",
    choose: "Choose...",
    level: "Level",
    priceLabel: "Price (per currency)",
    free: "Free",
    egp: "EGP",
    usd: "USD (Dollar)",
    eur: "EUR (Euro)",
    requirements: "Prerequisites (one per line)",
    outcomes: "What students will learn (one per line)",
    tags: "Tags (comma-separated)",
    status: "Status",
    saveChanges: "Save changes",
    createCourse: "Create course",
    cancel: "Cancel",
  },
  ar: {
    levels: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" },
    statuses: {
      draft: "مسودة",
      published: "نشر (يحتاج موافقة الأدمن)",
      pending: "قيد المراجعة (بانتظار الأدمن)",
      archived: "مؤرشف",
    },
    titleRequired: "العنوان مطلوب",
    chooseCategory: "اختر تصنيف",
    submittedForReview: "تم إرسال الكورس للأدمن للمراجعة. هيظهر للطلاب بعد ما يوافق عليه.",
    savedAsDraft:
      "تم حفظ الكورس كمسودة أول ما بتتعمل. عشان تبعته للأدمن للمراجعة، افتح الكورس وضيف المحتوى (الأقسام والدروس)، وبعدين اختار «نشر» تاني.",
    slugTaken: "العنوان مستخدم بالفعل، جرّب عنوان مختلف",
    genericError: "حصل خطأ، حاول تاني",
    editCourse: "تعديل الكورس",
    newCourse: "كورس جديد",
    courseTitle: "عنوان الكورس *",
    shortDesc: "وصف قصير (يظهر في الكارت)",
    fullDesc: "الوصف الكامل",
    coverImage: "صورة الغلاف",
    category: "التصنيف *",
    choose: "اختر...",
    level: "المستوى",
    priceLabel: "السعر (لكل عملة)",
    free: "مجاني",
    egp: "جنيه (EGP)",
    usd: "دولار (USD)",
    eur: "يورو (EUR)",
    requirements: "المتطلبات المسبقة (سطر لكل عنصر)",
    outcomes: "هيتعلم إيه (سطر لكل عنصر)",
    tags: "Tags (مفصولة بفاصلة)",
    status: "الحالة",
    saveChanges: "حفظ التعديلات",
    createCourse: "إنشاء الكورس",
    cancel: "إلغاء",
  },
  es: {
    levels: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" },
    statuses: {
      draft: "Borrador",
      published: "Publicar (requiere aprobación del admin)",
      pending: "En revisión (esperando al admin)",
      archived: "Archivado",
    },
    titleRequired: "El título es obligatorio",
    chooseCategory: "Elige una categoría",
    submittedForReview: "El curso se envió al administrador para su revisión. Aparecerá para los estudiantes una vez aprobado.",
    savedAsDraft:
      "El curso se guardó como borrador al crearse. Para enviarlo a revisión, abre el curso, agrega contenido (secciones y lecciones) y luego elige \"Publicar\" de nuevo.",
    slugTaken: "Este título ya está en uso, prueba con otro diferente",
    genericError: "Ocurrió un error, inténtalo de nuevo",
    editCourse: "Editar curso",
    newCourse: "Nuevo curso",
    courseTitle: "Título del curso *",
    shortDesc: "Descripción breve (se muestra en la tarjeta)",
    fullDesc: "Descripción completa",
    coverImage: "Imagen de portada",
    category: "Categoría *",
    choose: "Elige...",
    level: "Nivel",
    priceLabel: "Precio (por moneda)",
    free: "Gratis",
    egp: "EGP (Libra egipcia)",
    usd: "USD (Dólar)",
    eur: "EUR (Euro)",
    requirements: "Requisitos previos (uno por línea)",
    outcomes: "Qué aprenderán (uno por línea)",
    tags: "Etiquetas (separadas por coma)",
    status: "Estado",
    saveChanges: "Guardar cambios",
    createCourse: "Crear curso",
    cancel: "Cancelar",
  },
};

export default function CourseFormModal({ course, onClose, onSaved }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const LEVELS = [
    { value: "beginner", label: t.levels.beginner },
    { value: "intermediate", label: t.levels.intermediate },
    { value: "advanced", label: t.levels.advanced },
  ];
  const STATUSES = [
    { value: "draft", label: t.statuses.draft },
    { value: "published", label: t.statuses.published },
    { value: "pending", label: t.statuses.pending },
    { value: "archived", label: t.statuses.archived },
  ];
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
    prices: {
      EGP: course?.prices?.EGP ?? 0,
      USD: course?.prices?.USD ?? 0,
      EUR: course?.prices?.EUR ?? 0,
    },
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

  function updatePrice(currency, value) {
    setForm((f) => ({ ...f, prices: { ...f.prices, [currency]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) return setError(t.titleRequired);
    if (!form.category) return setError(t.chooseCategory);

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
        prices: {
          EGP: Number(form.prices.EGP) || 0,
          USD: Number(form.prices.USD) || 0,
          EUR: Number(form.prices.EUR) || 0,
        },
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

      // 🆕 لو المدرس اختار "نشر" بس الباك إند حوّل الحالة لـ "قيد المراجعة"
      // (شوف تعليق app/api/courses/[id]/route.js PUT)، لازم يعرف إن الكورس
      // مش هيظهر للطلاب دلوقتي — الفورم بيتقفل فورًا (onSaved) فمفيش وقت
      // نعرض رسالة جوه المودال نفسه، فبنستخدم alert زي باقي رسائل الحالة
      // المشابهة في الصفحة (شوف teacher/page.jsx handleDelete).
      if (data?.submittedForReview) {
        alert(t.submittedForReview);
      } else if (!isEdit && form.status === "published") {
        // 🩹 FIX: عند إنشاء كورس جديد (POST)، الباك إند بيحفظه دايمًا
        // status="draft" بغض النظر عن اختيار المدرس (شوف app/api/courses/route.js
        // POST — "كورس جديد دايمًا draft"). قبل الفيكس ده، لو المدرس اختار
        // "نشر" وهو بيعمل الكورس لأول مرة، الاختيار كان بيتجاهل بصمت من
        // غير أي تنبيه — المدرس يفضل فاكر إنه بعت الكورس للمراجعة وهو
        // لسه مسودة. بنوضّح هنا إن لازم يفتح الكورس تاني ويختار "نشر" من
        // جديد بعد ما يخلّص إضافة المحتوى (أقسام/دروس) عشان يترسل فعليًا.
        alert(t.savedAsDraft);
      }

      onSaved(data);
    } catch (err) {
      setError(err.message === "slug_taken" ? t.slugTaken : t.genericError);
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
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? "تعديل الكورس" : "كورس جديد"}</h3>
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">السعر (لكل عملة)</label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.isFree} onChange={(e) => update("isFree", e.target.checked)} />
                مجاني
              </label>
            </div>
            {/* 🆕 سعر منفصل يدوي لكل عملة (بدل تحويل تلقائي بسعر صرف) — العملة
                اللي المستخدم بيدفع بيها بتتحدد حسب لغة الموقع وقت الشراء
                (شوف app/lib/currency.js). لازم تتحط قيمة لكل العملات التلاتة
                عشان الكورس يبقى قابل للشراء بأي لغة. */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">جنيه (EGP)</label>
                <input
                  type="number"
                  min={0}
                  disabled={form.isFree}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  value={form.prices.EGP}
                  onChange={(e) => updatePrice("EGP", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">دولار (USD)</label>
                <input
                  type="number"
                  min={0}
                  disabled={form.isFree}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  value={form.prices.USD}
                  onChange={(e) => updatePrice("USD", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">يورو (EUR)</label>
                <input
                  type="number"
                  min={0}
                  disabled={form.isFree}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  value={form.prices.EUR}
                  onChange={(e) => updatePrice("EUR", e.target.value)}
                />
              </div>
            </div>
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