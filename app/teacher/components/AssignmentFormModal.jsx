"use client";

// app/teacher/components/AssignmentFormModal.jsx
//
// Phase 4 — اليوم 37-38: إنشاء/تعديل واجب (وصف + مرفق اختياري + Deadline).
// المرفق بيترفع بـ MediaUploader (kind="pdf") زي مرفقات الدروس بالظبط.

import { useEffect, useState } from "react";
import { X, Loader } from "lucide-react";
import MediaUploader from "./MediaUploader";
import AssignmentMedia from "@/app/components/AssignmentMedia";
import AssignmentQuestionsEditor, { toEditorQuestions, toQuestionsPayload } from "./AssignmentQuestionsEditor";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    titleRequired: "عنوان الواجب مطلوب",
    genericError: "حدث خطأ، حاول مرة أخرى",
    editAssignment: "تعديل الواجب",
    newAssignment: "واجب جديد",
    assignmentTitle: "عنوان الواجب *",
    descriptionLabel: "الوصف / التعليمات",
    attachmentLabel: "مرفق (اختياري) — ملف بدء، تعليمات إضافية...",
    mediaSection: "فيديو أو أوديو للواجب (اختياري)",
    videoLabel: "رفع فيديو",
    audioLabel: "رفع أوديو",
    removeMedia: "إزالة",
    mediaError: "تعذّر حفظ الفيديو/الأوديو، حاول رفعه مرة أخرى",
    dueDateLabel: "الموعد النهائي (اختياري)",
    maxScoreLabel: "الدرجة الكاملة",
    allowLate: "السماح بالتسليم المتأخر بعد الموعد النهائي",
    allowManual: "السماح للطالب أيضًا بتسليم ملف/نص/فيديو/أوديو (إلغاؤه = أسئلة فقط، والدرجة تُحسب تلقائيًا وتظهر للطالب فورًا)",
    loadingQuestions: "جارٍ تحميل أسئلة الواجب...",
    questionsLoadError: "تعذّر تحميل أسئلة الواجب الحالية — أعد فتح النافذة قبل الحفظ حتى لا تضيع الأسئلة",
    questionProblem: (n, reason) => `السؤال رقم ${n}: ${reason}`,
    questionReasons: {
      missing_text: "نص السؤال فارغ",
      invalid_type: "نوع السؤال غير مدعوم",
      options_required: "الخيارات ناقصة",
      empty_option_text: "يوجد خيار بدون نص",
      no_correct_option: "لم يتم تحديد إجابة صحيحة",
      multiple_correct_answers: "الاختيار من متعدد يقبل إجابة صحيحة واحدة فقط",
      true_false_needs_two_options: "صح/خطأ يجب أن يحتوي على خيارين",
      true_false_needs_one_correct: "صح/خطأ يقبل إجابة صحيحة واحدة فقط",
      too_many_options: "الحد الأقصى 6 خيارات",
    },
    tooManyQuestions: "تجاوزت الحد الأقصى لعدد الأسئلة",
    publish: "نشر الواجب (يظهر للطلاب فورًا)",
    save: "حفظ",
    cancel: "إلغاء",
  },
  en: {
    titleRequired: "Assignment title is required",
    genericError: "Something went wrong, try again",
    editAssignment: "Edit assignment",
    newAssignment: "New assignment",
    assignmentTitle: "Assignment title *",
    descriptionLabel: "Description / Instructions",
    attachmentLabel: "Attachment (optional) — starter file, extra instructions...",
    mediaSection: "Video or audio for the assignment (optional)",
    videoLabel: "Upload video",
    audioLabel: "Upload audio",
    removeMedia: "Remove",
    mediaError: "Couldn't save the video/audio, try uploading it again",
    dueDateLabel: "Due date (optional)",
    maxScoreLabel: "Full score",
    allowLate: "Allow late submission after the due date",
    allowManual: "Also let students submit a file/text/video/audio (turn off = questions only; the grade is calculated automatically and shown to the student instantly)",
    loadingQuestions: "Loading assignment questions...",
    questionsLoadError: "Couldn't load the current questions — reopen this window before saving so they aren't lost",
    questionProblem: (n, reason) => `Question ${n}: ${reason}`,
    questionReasons: {
      missing_text: "Question text is empty",
      invalid_type: "Unsupported question type",
      options_required: "Options are missing",
      empty_option_text: "An option has no text",
      no_correct_option: "No correct answer marked",
      multiple_correct_answers: "Multiple choice accepts one correct answer only",
      true_false_needs_two_options: "True/False needs exactly two options",
      true_false_needs_one_correct: "True/False accepts one correct answer only",
      too_many_options: "Maximum 6 options",
    },
    tooManyQuestions: "Maximum number of questions exceeded",
    publish: "Publish assignment (visible to students immediately)",
    save: "Save",
    cancel: "Cancel",
  },
};

function toDateTimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AssignmentFormModal({ courseId, assignment, onClose, onSaved }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const isEdit = Boolean(assignment);
  const [form, setForm] = useState({
    title: assignment?.title || "",
    description: assignment?.description || "",
    attachmentUrl: assignment?.attachmentUrl || "",
    mediaUrl: assignment?.mediaUrl || "",
    mediaType: assignment?.mediaType || "",
    dueDate: toDateTimeLocalValue(assignment?.dueDate),
    maxScore: assignment?.maxScore ?? 100,
    allowLateSubmission: assignment?.allowLateSubmission ?? true,
    isPublished: assignment?.isPublished || false,
    allowManualSubmission: assignment?.allowManualSubmission ?? true,
  });
  // 🆕 أسئلة تفاعلية (تصحيح تلقائي). قايمة الواجبات بتبعت العدد بس، فعند التعديل بنجيب الأسئلة كاملة.
  const needsQuestionsFetch = isEdit && (assignment?.questionsCount || 0) > 0;
  const [questions, setQuestions] = useState([]);
  const [questionsReady, setQuestionsReady] = useState(!needsQuestionsFetch);
  const [questionsLoadFailed, setQuestionsLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!needsQuestionsFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/assignments/${assignment.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error);
        if (!cancelled) {
          setQuestions(toEditorQuestions(data.questions));
          setQuestionsReady(true);
        }
      } catch {
        if (!cancelled) setQuestionsLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError(t.titleRequired);
    if (!questionsReady) return setError(questionsLoadFailed ? t.questionsLoadError : t.loadingQuestions);

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        attachmentUrl: form.attachmentUrl || null,
        mediaUrl: form.mediaUrl || null,
        mediaType: form.mediaUrl ? form.mediaType : null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        maxScore: Number(form.maxScore) || 100,
        allowLateSubmission: form.allowLateSubmission,
        isPublished: form.isPublished,
        questions: toQuestionsPayload(questions),
        allowManualSubmission: questions.length === 0 ? true : form.allowManualSubmission,
      };
      if (!isEdit) payload.course = courseId;

      const res = await fetch(isEdit ? `/api/assignments/${assignment.id}` : `/api/assignments`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const e = new Error(data?.error);
        e.index = data?.index;
        throw e;
      }
      onSaved(data);
    } catch (err) {
      const code = String(err?.message || "");
      if (code.startsWith("invalid_media")) setError(t.mediaError);
      else if (code === "too_many_questions") setError(t.tooManyQuestions);
      else if (Number.isInteger(err?.index) && t.questionReasons[code]) {
        setError(t.questionProblem(err.index + 1, t.questionReasons[code]));
      } else setError(t.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? t.editAssignment : t.newAssignment}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.assignmentTitle}</label>
            <input
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5279B4]"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.descriptionLabel}</label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#5279B4]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <MediaUploader
            kind="pdf"
            label={t.attachmentLabel}
            currentUrl={form.attachmentUrl}
            onUploaded={(f) => update("attachmentUrl", f.url)}
          />

          {/* 🆕 فيديو (Bunny Stream) أو أوديو (Bunny Storage) — واحد بس؛ رفع واحد جديد بيستبدل القديم */}
          <div className="space-y-3 border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700">{t.mediaSection}</p>
            <div className="grid grid-cols-2 gap-3">
              <MediaUploader
                key={`video-${form.mediaType === "video" ? "set" : "empty"}`}
                kind="video"
                label={t.videoLabel}
                currentUrl={form.mediaType === "video" ? form.mediaUrl : ""}
                onUploaded={(f) => setForm((p) => ({ ...p, mediaUrl: f.url, mediaType: "video" }))}
              />
              <MediaUploader
                key={`audio-${form.mediaType === "audio" ? "set" : "empty"}`}
                kind="audio"
                label={t.audioLabel}
                currentUrl={form.mediaType === "audio" ? form.mediaUrl : ""}
                onUploaded={(f) => setForm((p) => ({ ...p, mediaUrl: f.url, mediaType: "audio" }))}
              />
            </div>
            {form.mediaUrl && (
              <div className="space-y-2">
                <AssignmentMedia url={form.mediaUrl} type={form.mediaType} />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, mediaUrl: "", mediaType: "" }))}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  {t.removeMedia}
                </button>
              </div>
            )}
          </div>

          {/* 🆕 أسئلة تفاعلية بتصحيح تلقائي — إضافية جنب باقي إعدادات الواجب */}
          {!questionsReady && !questionsLoadFailed && (
            <p className="flex items-center gap-2 text-xs text-gray-400">
              <Loader size={14} className="animate-spin" /> {t.loadingQuestions}
            </p>
          )}
          {questionsLoadFailed && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{t.questionsLoadError}</div>
          )}
          {questionsReady && <AssignmentQuestionsEditor questions={questions} onChange={setQuestions} />}
          {questionsReady && questions.length > 0 && (
            <label className="flex items-start gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.allowManualSubmission}
                onChange={(e) => update("allowManualSubmission", e.target.checked)}
              />
              <span>{t.allowManual}</span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.dueDateLabel}</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5279B4]"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t.maxScoreLabel}</label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5279B4]"
                value={form.maxScore}
                onChange={(e) => update("maxScore", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.allowLateSubmission}
              onChange={(e) => update("allowLateSubmission", e.target.checked)}
            />
            {t.allowLate}
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => update("isPublished", e.target.checked)} />
            {t.publish}
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !questionsReady}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003A91] to-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
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