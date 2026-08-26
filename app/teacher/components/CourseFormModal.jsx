"use client";

// app/teacher/components/CourseFormModal.jsx
//
// فورم إنشاء/تعديل كورس. بيستخدم POST /api/courses للإنشاء و
// PUT /api/courses/[id] للتعديل. الغلاف (thumbnail) بيترفع بـ MediaUploader
// (كـ "image") عن طريق /api/upload/file لـ Bunny Storage.
//
// 🩹 FIX: كل نصوص الفورم كانت متبوعة لـ object ترجمة (T) بس الـ JSX كان
// لسه بيستخدم نص عربي ثابت جوه الأكواد مباشرة (مش t.xxx) — يعني تغيير
// اللغة من الناف بار مكانش بيغيّر حاجة في الفورم دي بالذات. اتصلحت هنا:
// كل نص في الـ JSX بقى بياخد من t.* اللي بيتبع useLanguage().
//
// 🆕 كمان الفورم دلوقتي بتاخد محتوى الكورس (العنوان/الوصف/المتطلبات/
// هيتعلم إيه/الشهادة) بالتلات لغات المدعومة (ar/en/es) بدل نسخة واحدة —
// عن طريق تابات لغة جوه الفورم — وبتبعتها في body.i18n لـ API اللي أصلاً
// بيدعم الحفظ ده (شوف app/lib/models/Course.js و app/lib/courseHelpers.js
// sanitizeCourseI18n). النسخة العربية بتتخزن كمان في الحقول الأساسية
// (title/shortDescription/description/requirements/outcomes) كـ "نسخة
// افتراضية" للتوافق مع أي كود قديم لسه بيقرا course.title مباشرة وللبحث
// النصي ($text index). الكورس بيتعرض للطالب حسب لغة الموقع تلقائيًا (شوف
// app/(pages)/courses/page.jsx و app/(pages)/courses/[id]/page.jsx —
// بيختاروا course.i18n[language] مع fallback لـ en وبعدين للحقول الأساسية).

import { useEffect, useState } from "react";
import { X, Loader, Check } from "lucide-react";
import MediaUploader from "./MediaUploader";
import { useLanguage } from "@/contexts/LanguageContext";

const LANGS = ["ar", "en", "es"];

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
    titleRequiredAllLangs: "Please add a course title in all 3 languages (Arabic, English, Spanish)",
    chooseCategory: "Choose a category",
    submittedForReview: "The course was sent to the admin for review. It will appear to students once approved.",
    savedAsDraft:
      "The course was saved as a draft when created. To send it to the admin for review, open the course, add content (sections & lessons), then choose \"Publish\" again.",
    slugTaken: "This title is already used, try a different one",
    genericError: "Something went wrong, try again",
    editCourse: "Edit course",
    newCourse: "New course",
    multilingualHint: "This content is shown to students based on the site's current language. Fill in all three languages so the course displays correctly everywhere.",
    langTabs: { ar: "Arabic", en: "English", es: "Spanish" },
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
    certName: "Certificate name (optional)",
    certDesc: "Certificate description (optional)",
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
    titleRequiredAllLangs: "من فضلك اكتب عنوان الكورس بالتلات لغات (عربي، إنجليزي، إسباني)",
    chooseCategory: "اختر تصنيف",
    submittedForReview: "تم إرسال الكورس للأدمن للمراجعة. هيظهر للطلاب بعد ما يوافق عليه.",
    savedAsDraft:
      "تم حفظ الكورس كمسودة أول ما بتتعمل. عشان تبعته للأدمن للمراجعة، افتح الكورس وضيف المحتوى (الأقسام والدروس)، وبعدين اختار «نشر» تاني.",
    slugTaken: "العنوان مستخدم بالفعل، جرّب عنوان مختلف",
    genericError: "حصل خطأ، حاول تاني",
    editCourse: "تعديل الكورس",
    newCourse: "كورس جديد",
    multilingualHint: "المحتوى ده بيتعرض للطالب حسب لغة الموقع الحالية. املا الثلاث لغات عشان الكورس يظهر صح لأي طالب أيًا كانت لغته.",
    langTabs: { ar: "عربي", en: "إنجليزي", es: "إسباني" },
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
    certName: "اسم الشهادة (اختياري)",
    certDesc: "وصف الشهادة (اختياري)",
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
    titleRequiredAllLangs: "Agrega un título del curso en los 3 idiomas (árabe, inglés, español)",
    chooseCategory: "Elige una categoría",
    submittedForReview: "El curso se envió al administrador para su revisión. Aparecerá para los estudiantes una vez aprobado.",
    savedAsDraft:
      "El curso se guardó como borrador al crearse. Para enviarlo a revisión, abre el curso, agrega contenido (secciones y lecciones) y luego elige \"Publicar\" de nuevo.",
    slugTaken: "Este título ya está en uso, prueba con otro diferente",
    genericError: "Ocurrió un error, inténtalo de nuevo",
    editCourse: "Editar curso",
    newCourse: "Nuevo curso",
    multilingualHint: "Este contenido se muestra a los estudiantes según el idioma actual del sitio. Completa los tres idiomas para que el curso se muestre correctamente en todos lados.",
    langTabs: { ar: "Árabe", en: "Inglés", es: "Español" },
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
    certName: "Nombre del certificado (opcional)",
    certDesc: "Descripción del certificado (opcional)",
    tags: "Etiquetas (separadas por coma)",
    status: "Estado",
    saveChanges: "Guardar cambios",
    createCourse: "Crear curso",
    cancel: "Cancelar",
  },
};

// بيبني محتوى لغة واحدة (تاب واحد) من i18n المخزن، مع fallback للحقول
// الأساسية القديمة (title/shortDescription/description/requirements/outcomes)
// لو مفيش نسخة i18n لسه للغة دي (كورس قديم اتعمل قبل الفيتشر ده مثلاً).
function langContentFrom(i18nLang, fallback) {
  return {
    title: i18nLang?.title ?? fallback?.title ?? "",
    shortDescription: i18nLang?.shortDescription ?? fallback?.shortDescription ?? "",
    description: i18nLang?.description ?? fallback?.description ?? "",
    requirements: (i18nLang?.requirements?.length ? i18nLang.requirements : fallback?.requirements || []).join("\n"),
    outcomes: (i18nLang?.outcomes?.length ? i18nLang.outcomes : fallback?.outcomes || []).join("\n"),
    certName: i18nLang?.certification?.name ?? fallback?.certName ?? "",
    certDesc: i18nLang?.certification?.desc ?? fallback?.certDesc ?? "",
  };
}

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
  const [activeTab, setActiveTab] = useState("ar");

  // 🆕 محتوى منفصل لكل لغة (عنوان/وصف قصير/وصف كامل/متطلبات/هيتعلم إيه/شهادة)
  const [langContent, setLangContent] = useState(() => ({
    ar: langContentFrom(course?.i18n?.ar, {
      title: course?.title,
      shortDescription: course?.shortDescription,
      description: course?.description,
      requirements: course?.requirements,
      outcomes: course?.outcomes,
    }),
    en: langContentFrom(course?.i18n?.en, null),
    es: langContentFrom(course?.i18n?.es, null),
  }));

  const [form, setForm] = useState({
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

  function updateLang(lang, field, value) {
    setLangContent((c) => ({ ...c, [lang]: { ...c[lang], [field]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const missingLang = LANGS.find((lang) => !langContent[lang].title.trim());
    if (missingLang) {
      setActiveTab(missingLang);
      return setError(t.titleRequiredAllLangs);
    }
    if (!form.category) return setError(t.chooseCategory);

    setSaving(true);
    try {
      const i18n = {};
      for (const lang of LANGS) {
        const c = langContent[lang];
        i18n[lang] = {
          title: c.title.trim(),
          shortDescription: c.shortDescription,
          description: c.description,
          requirements: c.requirements.split("\n").map((s) => s.trim()).filter(Boolean),
          outcomes: c.outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
          certification: { name: c.certName || "", desc: c.certDesc || "" },
        };
      }
      // النسخة العربية هي "النسخة الافتراضية" برّه i18n (زي ما هو موضح في
      // تعليق app/lib/models/Course.js) — دايمًا موجودة لأننا بنتأكد إن
      // عنوان كل لغة (بما فيها العربي) مطلوب فوق.
      const base = i18n.ar;

      const payload = {
        title: base.title,
        shortDescription: base.shortDescription,
        description: base.description,
        thumbnail: form.thumbnail || null,
        category: form.category,
        level: form.level,
        language: form.language,
        i18n,
        prices: {
          EGP: Number(form.prices.EGP) || 0,
          USD: Number(form.prices.USD) || 0,
          EUR: Number(form.prices.EUR) || 0,
        },
        isFree: form.isFree,
        status: form.status,
        requirements: base.requirements,
        outcomes: base.outcomes,
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

  const tab = langContent[activeTab];
  const isRTL = language === "ar";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? t.editCourse : t.newCourse}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div className="bg-blue-50 text-blue-700 text-xs px-4 py-2.5 rounded-lg">{t.multilingualHint}</div>

          {/* 🆕 تابات اللغة — كل تاب بيعبّي محتوى الكورس (عنوان/وصف/متطلبات/
              هيتعلم إيه/شهادة) للغة دي بالتحديد، بغض النظر عن لغة الناف بار
              الحالية (لغة الناف بار بتتحكم بس في نصوص الفورم نفسها). */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {LANGS.map((lang) => {
              const filled = Boolean(langContent[lang].title.trim());
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveTab(lang)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === lang ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {filled && <Check size={14} className="text-green-500" />}
                  {t.langTabs[lang]}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.courseTitle}</label>
            <input
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              value={tab.title}
              onChange={(e) => updateLang(activeTab, "title", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.shortDesc}</label>
            <input
              maxLength={300}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              value={tab.shortDescription}
              onChange={(e) => updateLang(activeTab, "shortDescription", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.fullDesc}</label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              value={tab.description}
              onChange={(e) => updateLang(activeTab, "description", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.requirements}</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={tab.requirements}
              onChange={(e) => updateLang(activeTab, "requirements", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.outcomes}</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={tab.outcomes}
              onChange={(e) => updateLang(activeTab, "outcomes", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.certName}</label>
              <input
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={tab.certName}
                onChange={(e) => updateLang(activeTab, "certName", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.certDesc}</label>
              <input
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={tab.certDesc}
                onChange={(e) => updateLang(activeTab, "certDesc", e.target.value)}
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* بيانات مش لغوية (نفس القيمة لكل اللغات): الغلاف/التصنيف/المستوى/
              السعر/الحالة/الـ tags */}
          <MediaUploader
            kind="image"
            label={t.coverImage}
            currentUrl={form.thumbnail}
            onUploaded={(f) => update("thumbnail", f.url)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.category}</label>
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                required
              >
                <option value="">{t.choose}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.level}</label>
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
              <label className="block text-sm font-semibold text-gray-700">{t.priceLabel}</label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.isFree} onChange={(e) => update("isFree", e.target.checked)} />
                {t.free}
              </label>
            </div>
            {/* 🆕 سعر منفصل يدوي لكل عملة (بدل تحويل تلقائي بسعر صرف) — العملة
                اللي المستخدم بيدفع بيها بتتحدد حسب لغة الموقع وقت الشراء
                (شوف app/lib/currency.js). لازم تتحط قيمة لكل العملات التلاتة
                عشان الكورس يبقى قابل للشراء بأي لغة. */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.egp}</label>
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.usd}</label>
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.eur}</label>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.tags}</label>
            <input
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.status}</label>
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
              {isEdit ? t.saveChanges : t.createCourse}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}