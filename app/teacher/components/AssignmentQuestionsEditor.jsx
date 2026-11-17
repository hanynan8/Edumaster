"use client";

// app/teacher/components/AssignmentQuestionsEditor.jsx
//
// 🆕 محرّر الأسئلة التفاعلية داخل فورم الواجب — اختيار من متعدد / صح وغلط، بتتصحح
// تلقائي عند الطالب. إضافية جنب باقي إعدادات الواجب (وصف/مرفق/تسليم يدوي).
//   - إضافة يدوي (نفس شكل وقيود QuestionFormModal بتاع الكويزات)
//   - أو استيراد من ملف PDF بصيغة بنك الأسئلة (POST /api/assignments/import-questions-pdf)
// الأسئلة بتفضل في state الفورم وبتتحفظ مع الواجب (حقل questions في POST/PUT).

import { useRef, useState } from "react";
import {
  Plus, Trash2, CheckCircle2, Circle, Pencil, ChevronUp, ChevronDown, FileUp, Loader, AlertTriangle, X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    section: "أسئلة تفاعلية — تصحيح تلقائي (اختياري)",
    hint: "اختيار من متعدد أو صح/غلط. الطالب يجيب من المنصة وتظهر له درجته فورًا. إضافي بجانب الواجب الحالي.",
    addManual: "إضافة سؤال يدويًا",
    importPdf: "استيراد من ملف PDF",
    formatLink: "مثال على الصيغة المطلوبة",
    empty: "لا توجد أسئلة بعد",
    totalPoints: (n) => `مجموع درجات الأسئلة: ${n}`,
    types: { multiple_choice: "اختيار من متعدد", true_false: "صح / خطأ" },
    typeLabel: "نوع السؤال",
    questionText: "نص السؤال *",
    optionsLabel: "الخيارات — اضغط على الدائرة لتحديد الإجابة الصحيحة",
    optionPlaceholder: (i) => `خيار ${i}`,
    addOption: "خيار",
    points: "الدرجة",
    trueLabel: "صح",
    falseLabel: "خطأ",
    saveQuestion: "حفظ السؤال",
    cancel: "إلغاء",
    textRequired: "نص السؤال مطلوب",
    optionsNeedText: "يجب أن يكون لكل الخيارات نص",
    needCorrect: "يجب تحديد إجابة صحيحة",
    moveUp: "تحريك لأعلى",
    moveDown: "تحريك لأسفل",
    edit: "تعديل",
    remove: "حذف",
    pdfType: "نوع الأسئلة في الملف",
    typeAuto: "تحديد تلقائي",
    chooseFile: "اختر ملف PDF",
    importing: "جارٍ القراءة...",
    importDone: (ok, skip) => `تمت إضافة ${ok} سؤال${skip ? ` — وتخطّي ${skip}` : ""}. راجعها ثم احفظ الواجب.`,
    skippedTitle: "الأسئلة التي تم تخطّيها:",
    close: "إغلاق",
    errors: {
      missing_file: "يجب اختيار ملف PDF",
      file_must_be_pdf: "يجب أن يكون الملف بصيغة PDF",
      file_too_large: "حجم الملف كبير جدًا",
      could_not_read_pdf: "تعذّر قراءة الملف — تأكد أنه PDF سليم وليس صورة ممسوحة ضوئيًا",
      empty_pdf_text: "لا يحتوي الملف على نص قابل للقراءة",
      no_questions_found: "لم يتم العثور على أي سؤال بالصيغة المطلوبة — راجع مثال الصيغة",
      no_valid_questions: "جميع الأسئلة المقروءة بها مشاكل — راجع التفاصيل أدناه",
      forbidden: "لا تملك صلاحية هذا الإجراء",
      generic: "حدث خطأ، حاول مرة أخرى",
    },
    reasons: {
      missing_question_text: "نص السؤال فارغ",
      missing_answer: "لا يوجد سطر للإجابة",
      invalid_true_false_answer: "إجابة صح/خطأ غير مفهومة",
      not_enough_options: "عدد الخيارات أقل من 2",
      answer_not_matched_to_option: "الإجابة المكتوبة لا تطابق أي خيار",
      options_required: "الخيارات ناقصة",
      true_false_needs_two_options: "صح/خطأ يجب أن يحتوي على خيارين بالضبط",
      empty_option_text: "يوجد خيار بدون نص",
      no_correct_option: "لم يتم تحديد إجابة صحيحة",
      true_false_needs_one_correct: "صح/خطأ يقبل إجابة صحيحة واحدة فقط",
      multiple_correct_answers: "الاختيار من متعدد يقبل إجابة صحيحة واحدة فقط",
      too_many_options: "الحد الأقصى 6 خيارات",
      too_many_questions: "تجاوزت الحد الأقصى لعدد الأسئلة",
    },
  },
  en: {
    section: "Interactive questions — auto-graded (optional)",
    hint: "Multiple choice or true/false. Students answer on the platform and see their score instantly. Added on top of the current assignment.",
    addManual: "Add question manually",
    importPdf: "Import from PDF file",
    formatLink: "Format example",
    empty: "No questions yet",
    totalPoints: (n) => `Total question points: ${n}`,
    types: { multiple_choice: "Multiple choice", true_false: "True / False" },
    typeLabel: "Question type",
    questionText: "Question text *",
    optionsLabel: "Options — click the circle to mark the correct answer",
    optionPlaceholder: (i) => `Option ${i}`,
    addOption: "Option",
    points: "Points",
    trueLabel: "True",
    falseLabel: "False",
    saveQuestion: "Save question",
    cancel: "Cancel",
    textRequired: "Question text is required",
    optionsNeedText: "All options must have text",
    needCorrect: "You must mark the correct answer",
    moveUp: "Move up",
    moveDown: "Move down",
    edit: "Edit",
    remove: "Delete",
    pdfType: "Question type in file",
    typeAuto: "Auto-detect",
    chooseFile: "Choose PDF file",
    importing: "Reading...",
    importDone: (ok, skip) => `Added ${ok} question(s)${skip ? ` — ${skip} skipped` : ""}. Review them, then save the assignment.`,
    skippedTitle: "Skipped questions:",
    close: "Close",
    errors: {
      missing_file: "Please choose a PDF file",
      file_must_be_pdf: "The file must be a PDF",
      file_too_large: "The file is too large",
      could_not_read_pdf: "Couldn't read the file — make sure it's a valid PDF and not a scanned image",
      empty_pdf_text: "The file has no readable text",
      no_questions_found: "No questions in the expected format were found — check the format example",
      no_valid_questions: "All the questions that were read have problems — see details below",
      forbidden: "You don't have permission for this action",
      generic: "Something went wrong, try again",
    },
    reasons: {
      missing_question_text: "Question text is empty",
      missing_answer: "No answer line",
      invalid_true_false_answer: "Unrecognized true/false answer",
      not_enough_options: "Fewer than 2 options",
      answer_not_matched_to_option: "The written answer matches no option",
      options_required: "Options are missing",
      true_false_needs_two_options: "True/False needs exactly two options",
      empty_option_text: "An option has no text",
      no_correct_option: "No correct answer marked",
      true_false_needs_one_correct: "True/False accepts one correct answer only",
      multiple_correct_answers: "Multiple choice accepts one correct answer only",
      too_many_options: "Maximum 6 options",
      too_many_questions: "Maximum number of questions exceeded",
    },
  },
};

let tmpCounter = 0;
const newKey = () => `tmp-${Date.now()}-${tmpCounter++}`;

function defaultOptions(type, t) {
  if (type === "true_false") {
    return [
      { text: t.trueLabel, isCorrect: true },
      { text: t.falseLabel, isCorrect: false },
    ];
  }
  return [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ];
}

/** تحويل شكل الـ API (id) لشكل الـ state (key ثابت للـ React). */
export function toEditorQuestions(apiQuestions) {
  return (apiQuestions || []).map((q) => ({
    key: q.id || newKey(),
    id: q.id || null,
    type: q.type,
    text: q.text,
    points: q.points,
    options: (q.options || []).map((o) => ({ text: o.text, isCorrect: Boolean(o.isCorrect) })),
  }));
}

/** تحويل الـ state لـ payload الـ API. */
export function toQuestionsPayload(questions) {
  return questions.map((q) => ({
    ...(q.id ? { id: q.id } : {}),
    type: q.type,
    text: q.text.trim(),
    points: Number(q.points) || 1,
    options: q.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
  }));
}

function QuestionEditor({ initial, t, onSave, onCancel }) {
  const [type, setType] = useState(initial?.type || "multiple_choice");
  const [text, setText] = useState(initial?.text || "");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [options, setOptions] = useState(initial?.options?.length ? initial.options : defaultOptions("multiple_choice", t));
  const [error, setError] = useState("");

  function changeType(next) {
    setType(next);
    if (next === "true_false") setOptions(defaultOptions("true_false", t));
    else if (options.length < 2 || options.some((o) => !o.text) || type === "true_false") {
      setOptions(defaultOptions("multiple_choice", t));
    }
  }

  function setCorrect(idx) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
  }

  function save() {
    setError("");
    if (!text.trim()) return setError(t.textRequired);
    if (options.some((o) => !o.text.trim())) return setError(t.optionsNeedText);
    if (options.filter((o) => o.isCorrect).length !== 1) return setError(t.needCorrect);
    onSave({
      key: initial?.key || newKey(),
      id: initial?.id || null,
      type,
      text: text.trim(),
      points: Number(points) > 0 ? Number(points) : 1,
      options: options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
    });
  }

  return (
    <div className="border border-[#003A91]/30 bg-[#F6F8FC] rounded-xl p-4 space-y-3">
      {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">{t.typeLabel}</label>
        <div className="flex gap-2">
          {Object.entries(t.types).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeType(value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                type === value ? "bg-[#003A91] text-white border-[#003A91]" : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">{t.questionText}</label>
        <textarea
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5279B4] bg-white"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-700">{t.optionsLabel}</label>
          {type === "multiple_choice" && options.length < 6 && (
            <button
              type="button"
              onClick={() => setOptions((p) => [...p, { text: "", isCorrect: false }])}
              className="flex items-center gap-1 text-xs font-semibold text-[#003A91] hover:underline"
            >
              <Plus size={12} /> {t.addOption}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {options.map((o, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrect(idx)}
                className={o.isCorrect ? "text-green-600" : "text-gray-300 hover:text-gray-400"}
              >
                {o.isCorrect ? <CheckCircle2 size={19} /> : <Circle size={19} />}
              </button>
              <input
                disabled={type === "true_false"}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#5279B4] bg-white disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={t.optionPlaceholder(idx + 1)}
                value={o.text}
                onChange={(e) => setOptions((p) => p.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))}
              />
              {type === "multiple_choice" && options.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setOptions((p) => {
                      const next = p.filter((_, i) => i !== idx);
                      if (!next.some((x) => x.isCorrect)) next[0].isCorrect = true;
                      return next;
                    })
                  }
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">{t.points}</label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#5279B4] bg-white"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={save} className="bg-[#003A91] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#002E74]">
            {t.saveQuestion}
          </button>
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-white">
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PdfImport({ t, onImported, onClose }) {
  const inputRef = useRef(null);
  const [fileType, setFileType] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", fileType);
      const res = await fetch("/api/assignments/import-questions-pdf", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.errors[data?.error] || t.errors.generic);
        if (Array.isArray(data?.parseErrors) && data.parseErrors.length) setReport({ imported: 0, skipped: data.parseErrors });
        return;
      }
      onImported(data.questions);
      setReport({ imported: data.importedCount, skipped: data.skipped || [] });
    } catch {
      setError(t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-gray-200 bg-white rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{t.importPdf}</p>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label={t.close}>
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-gray-600">{t.pdfType}</label>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
        >
          <option value="auto">{t.typeAuto}</option>
          <option value="multiple_choice">{t.types.multiple_choice}</option>
          <option value="true_false">{t.types.true_false}</option>
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 bg-[#003A91] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#002E74] disabled:opacity-60"
        >
          {busy ? <Loader size={15} className="animate-spin" /> : <FileUp size={15} />}
          {busy ? t.importing : t.chooseFile}
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFile} />
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

      {report && report.imported > 0 && (
        <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={15} /> {t.importDone(report.imported, report.skipped.length)}
        </div>
      )}

      {report && report.skipped.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle size={13} /> {t.skippedTitle}
          </p>
          <ul className="list-disc ms-5 space-y-0.5">
            {report.skipped.map((s, i) => (
              <li key={i}>
                {s.preview ? `“${s.preview}” — ` : ""}
                {t.reasons[s.reason] || s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AssignmentQuestionsEditor({ questions, onChange }) {
  const { language } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  // editing: undefined = مفيش، null = سؤال جديد، object = تعديل سؤال موجود
  const [editing, setEditing] = useState(undefined);
  const [importing, setImporting] = useState(false);

  const total = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  function saveQuestion(q) {
    const exists = questions.some((x) => x.key === q.key);
    onChange(exists ? questions.map((x) => (x.key === q.key ? q : x)) : [...questions, q]);
    setEditing(undefined);
  }

  function move(idx, dir) {
    const next = [...questions];
    const to = idx + dir;
    if (to < 0 || to >= next.length) return;
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  }

  function handleImported(imported) {
    onChange([...questions, ...toEditorQuestions(imported.map((q) => ({ ...q, id: null })))]);
  }

  return (
    <div className="space-y-3 border border-gray-200 rounded-xl p-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">{t.section}</p>
        <p className="text-xs text-gray-400 mt-0.5">{t.hint}</p>
      </div>

      {questions.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">{t.empty}</p>
      ) : (
        <ol className="space-y-2">
          {questions.map((q, idx) =>
            editing && editing.key === q.key ? (
              <li key={q.key}>
                <QuestionEditor initial={q} t={t} onSave={saveQuestion} onCancel={() => setEditing(undefined)} />
              </li>
            ) : (
              <li key={q.key} className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 whitespace-pre-line break-words">{q.text}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t.types[q.type]} · {t.points} {q.points}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {q.options.map((o, i) => (
                      <li key={i} className={`text-xs flex items-center gap-1.5 ${o.isCorrect ? "text-green-700 font-semibold" : "text-gray-500"}`}>
                        {o.isCorrect ? <CheckCircle2 size={12} /> : <Circle size={12} className="text-gray-300" />} {o.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" title={t.moveUp} disabled={idx === 0} onClick={() => move(idx, -1)} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" title={t.moveDown} disabled={idx === questions.length - 1} onClick={() => move(idx, 1)} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                    <ChevronDown size={16} />
                  </button>
                  <button type="button" title={t.edit} onClick={() => setEditing(q)} className="p-1 text-[#003A91] hover:bg-[#EBEFF6] rounded">
                    <Pencil size={15} />
                  </button>
                  <button type="button" title={t.remove} onClick={() => onChange(questions.filter((x) => x.key !== q.key))} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          )}
        </ol>
      )}

      {questions.length > 0 && <p className="text-xs font-semibold text-gray-500">{t.totalPoints(total)}</p>}

      {editing === null && <QuestionEditor t={t} onSave={saveQuestion} onCancel={() => setEditing(undefined)} />}
      {importing && <PdfImport t={t} onImported={handleImported} onClose={() => setImporting(false)} />}

      {editing === undefined && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003A91] border border-[#003A91]/30 px-3.5 py-2 rounded-xl hover:bg-[#EBEFF6]"
          >
            <Plus size={15} /> {t.addManual}
          </button>
          {!importing && (
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003A91] border border-[#003A91]/30 px-3.5 py-2 rounded-xl hover:bg-[#EBEFF6]"
            >
              <FileUp size={15} /> {t.importPdf}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
