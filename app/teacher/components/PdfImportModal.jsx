"use client";

// app/teacher/components/PdfImportModal.jsx
//
// مودال "استيراد أسئلة من PDF" — بيرفع ملف PDF بصيغة بنك الأسئلة
// (PDF_QUIZ_FORMAT.md) لـ POST /api/quizzes/[id]/questions/import-pdf،
// وبيعرض تقرير بعدد الأسئلة اللي اتضافت وأي أسئلة اتفشلت مع السبب.

import { useState, useRef } from "react";
import { X, Loader, UploadCloud, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    title: "استيراد أسئلة من PDF",
    subtitle: "ارفع ملف PDF متبع لصيغة بنك الأسئلة وهيتم استخراج الأسئلة والإجابات تلقائيًا.",
    typeLabel: "نوع الأسئلة في الملف",
    typeAuto: "تحديد تلقائي",
    typeMc: "اختيار من متعدد",
    typeTf: "صح / غلط",
    langLabel: "لغة الأسئلة (تتحكم في نص \"صح/غلط\" المخزّن)",
    langAuto: "تحديد تلقائي",
    langAr: "عربي",
    langEn: "إنجليزي",
    langEs: "إسباني",
    dropHint: "اسحب ملف PDF هنا أو اضغط للاختيار",
    chosenFile: (name) => `الملف المختار: ${name}`,
    formatLink: "مثال على الصيغة المطلوبة",
    import: "استيراد الأسئلة",
    importing: "جاري الاستيراد...",
    cancel: "إغلاق",
    pickFileFirst: "اختر ملف PDF الأول",
    errors: {
      missing_file: "لازم تختار ملف PDF",
      file_must_be_pdf: "الملف لازم يكون بصيغة PDF",
      file_too_large: "حجم الملف كبير جدًا",
      could_not_read_pdf: "تعذّر قراءة الملف — تأكد إنه PDF سليم ومش صورة ممسوحة (سكان)",
      empty_pdf_text: "الملف مفيهوش نص قابل للقراءة",
      no_questions_found: "معرفتش أدور على أي سؤال بالصيغة المطلوبة — راجع مثال الصيغة",
      no_valid_questions: "الأسئلة اللي اتقرت كلها فيها مشكلة — شوف التفاصيل تحت",
      internal_error: "حصل خطأ من السيرفر، حاول تاني",
      forbidden: "مالكش صلاحية تعدّل الكويز ده",
      generic: "حصل خطأ، حاول تاني",
    },
    resultSummary: (ok, skip) => `تم استيراد ${ok} سؤال بنجاح${skip ? ` — و${skip} سؤال اتخطّى` : ""}`,
    skippedTitle: "الأسئلة اللي اتخطّت:",
    reasons: {
      missing_question_text: "نص السؤال فاضي",
      missing_answer: "مفيش سطر إجابة",
      invalid_true_false_answer: "إجابة صح/غلط غير مفهومة",
      not_enough_options: "عدد الخيارات أقل من 2",
      answer_not_matched_to_option: "الإجابة المكتوبة مش متطابقة مع أي خيار",
      options_required: "الخيارات ناقصة",
      true_false_needs_two_options: "صح/غلط لازم بالظبط خيارين",
      empty_option_text: "فيه خيار بدون نص",
      no_correct_option: "مفيش إجابة صحيحة محددة",
      true_false_needs_one_correct: "صح/غلط لازم إجابة صحيحة واحدة بس",
    },
    doneClose: "تمام، إقفال",
  },
  en: {
    title: "Import questions from PDF",
    subtitle: "Upload a PDF that follows the question-bank format and questions/answers will be extracted automatically.",
    typeLabel: "Question type in file",
    typeAuto: "Auto-detect",
    typeMc: "Multiple choice",
    typeTf: "True / False",
    langLabel: "Question language (controls the stored True/False text)",
    langAuto: "Auto-detect",
    langAr: "Arabic",
    langEn: "English",
    langEs: "Spanish",
    dropHint: "Drag a PDF here or click to choose",
    chosenFile: (name) => `Selected file: ${name}`,
    formatLink: "Format example",
    import: "Import questions",
    importing: "Importing...",
    cancel: "Close",
    pickFileFirst: "Choose a PDF file first",
    errors: {
      missing_file: "You must choose a PDF file",
      file_must_be_pdf: "File must be a PDF",
      file_too_large: "File is too large",
      could_not_read_pdf: "Couldn't read the file — make sure it's a valid PDF and not a scanned image",
      empty_pdf_text: "The file has no readable text",
      no_questions_found: "Couldn't find any question in the expected format — check the format example",
      no_valid_questions: "All parsed questions had issues — see details below",
      internal_error: "Server error, try again",
      forbidden: "You don't have permission to edit this quiz",
      generic: "Something went wrong, try again",
    },
    resultSummary: (ok, skip) => `Imported ${ok} question(s) successfully${skip ? `, ${skip} skipped` : ""}`,
    skippedTitle: "Skipped questions:",
    reasons: {
      missing_question_text: "Empty question text",
      missing_answer: "No answer line found",
      invalid_true_false_answer: "Unrecognized true/false answer",
      not_enough_options: "Fewer than 2 options",
      answer_not_matched_to_option: "Answer doesn't match any option",
      options_required: "Missing options",
      true_false_needs_two_options: "True/False must have exactly two options",
      empty_option_text: "An option has no text",
      no_correct_option: "No correct answer marked",
      true_false_needs_one_correct: "True/False must have exactly one correct answer",
    },
    doneClose: "Done, close",
  },
};

export default function PdfImportModal({ quizId, onClose, onImported }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [type, setType] = useState("auto");
  const [lang, setLang] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { importedCount, skippedCount, skipped }
  const [dragOver, setDragOver] = useState(false);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setError("");
    setResult(null);
  }

  async function handleImport() {
    if (!file) return setError(t.errors.missing_file);
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (type !== "auto") fd.append("type", type);
      if (lang !== "auto") fd.append("lang", lang);

      const res = await fetch(`/api/quizzes/${quizId}/questions/import-pdf`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(t.errors[data?.error] || t.errors.generic);
        // حتى لو فشل بالكامل، ممكن نعرض تفاصيل الأخطاء لو موجودة
        if (data?.parseErrors?.length) setResult({ importedCount: 0, skippedCount: data.parseErrors.length, skipped: data.parseErrors });
        return;
      }

      setResult({ importedCount: data.importedCount, skippedCount: data.skippedCount, skipped: data.skipped || [] });
      if (data.imported?.length) onImported(data.imported);
    } catch {
      setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-800">{t.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500">{t.subtitle}</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!result && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.typeLabel}</label>
                <div className="flex gap-2">
                  {[
                    { value: "auto", label: t.typeAuto },
                    { value: "multiple_choice", label: t.typeMc },
                    { value: "true_false", label: t.typeTf },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        type === opt.value ? "bg-[#003A91] text-white border-[#003A91]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.langLabel}</label>
                <div className="flex gap-2">
                  {[
                    { value: "auto", label: t.langAuto },
                    { value: "ar", label: t.langAr },
                    { value: "en", label: t.langEn },
                    { value: "es", label: t.langEs },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLang(opt.value)}
                      className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        lang === opt.value ? "bg-[#003A91] text-white border-[#003A91]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={`border-2 border-dashed rounded-2xl py-10 px-4 text-center cursor-pointer transition ${
                  dragOver ? "border-[#003A91] bg-blue-50" : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2 text-gray-700">
                    <FileText size={28} className="text-[#003A91]" />
                    <span className="text-sm font-semibold">{t.chosenFile(file.name)}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <UploadCloud size={28} />
                    <span className="text-sm">{t.dropHint}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
                >
                  {loading && <Loader size={18} className="animate-spin" />}
                  {loading ? t.importing : t.import}
                </button>
                <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50">
                  {t.cancel}
                </button>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">
                <CheckCircle2 size={18} className="shrink-0" />
                <span className="font-semibold">{t.resultSummary(result.importedCount, result.skippedCount)}</span>
              </div>

              {result.skipped?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t.skippedTitle}</p>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {result.skipped.map((s, i) => (
                      <div key={i} className="text-xs bg-amber-50 text-amber-700 px-3 py-2 rounded-lg">
                        <span className="font-semibold">{t.reasons[s.reason] || s.reason}</span>
                        {s.preview && <span className="opacity-80"> — {s.preview}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full bg-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90"
              >
                {t.doneClose}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}