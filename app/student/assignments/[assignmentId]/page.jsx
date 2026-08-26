"use client";

// app/student/assignments/[assignmentId]/page.jsx
//
// Phase 4 — اليوم 39-40: "Student: تسليم Assignment (رفع ملف)". بتجيب
// GET /api/assignments/[id] (بيرجّع mySubmission لو موجود) وبترفع الملف
// بـ MediaUploader (kind="submission") قبل ما تعمل POST
// /api/assignments/[id]/submissions.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowLeft, Loader, Calendar, FileText, AlertTriangle, CheckCircle2, Clock, Paperclip,
} from "lucide-react";
import MediaUploader from "@/app/teacher/components/MediaUploader";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS = {
  ar: {
    noDueDate: "بدون موعد نهائي",
    statusSubmitted: "مُسلَّم — في انتظار التصحيح",
    statusLate: "اتسلّم متأخر — في انتظار التصحيح",
    statusGraded: "مُصحَّح",
    accessError: "لازم يكون عندك وصول لهذا الكورس عشان تسلّم الواجب ده",
    loadError: "تعذّر تحميل الواجب",
    needFileOrText: "لازم ترفع ملف أو تكتب إجابة نصية قبل التسليم",
    deadlinePassed: "فات ميعاد التسليم ومش مسموح بتسليم متأخر لهذا الواجب",
    submitError: "حصل خطأ أثناء التسليم، حاول تاني",
    backToCourse: "رجوع للكورس",
    fullScore: "الدرجة الكاملة",
    lateStillAllowed: "الميعاد فات — لسه ممكن تسلّم متأخر",
    lateClosed: "الميعاد فات — التسليم مقفول",
    downloadAttachment: "تحميل مرفق الواجب",
    currentSubmission: "تسليمك الحالي",
    submittedAt: "اتسلم في",
    resubmit: "إعادة التسليم",
    submitAssignment: "تسليم الواجب",
    uploadLabel: "ارفع ملف تسليمك (PDF / Word / صورة / Zip)",
    orWriteText: "أو اكتب إجابة نصية (اختياري)",
    textPlaceholder: "اكتب إجابتك هنا لو مفيش ملف...",
    updateSubmission: "تحديث التسليم",
    noLateSubmission: "الميعاد فات ومش مسموح بتسليم متأخر لهذا الواجب",
  },
  en: {
    noDueDate: "No due date",
    statusSubmitted: "Submitted — awaiting grading",
    statusLate: "Submitted late — awaiting grading",
    statusGraded: "Graded",
    accessError: "You need access to this course to submit this assignment",
    loadError: "Couldn't load the assignment",
    needFileOrText: "You must upload a file or write a text answer before submitting",
    deadlinePassed: "The deadline has passed and late submission isn't allowed for this assignment",
    submitError: "Something went wrong while submitting, try again",
    backToCourse: "Back to course",
    fullScore: "Full score",
    lateStillAllowed: "Deadline passed — late submission still allowed",
    lateClosed: "Deadline passed — submissions closed",
    downloadAttachment: "Download assignment attachment",
    currentSubmission: "Your current submission",
    submittedAt: "Submitted on",
    resubmit: "Resubmit",
    submitAssignment: "Submit assignment",
    uploadLabel: "Upload your submission file (PDF / Word / Image / Zip)",
    orWriteText: "Or write a text answer (optional)",
    textPlaceholder: "Write your answer here if you have no file...",
    updateSubmission: "Update submission",
    noLateSubmission: "The deadline has passed and late submission isn't allowed for this assignment",
  },
};

export default function SubmitAssignmentPage({ params }) {
  const { assignmentId } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const locale = language === "ar" ? "ar-EG" : language === "es" ? "es-ES" : "en-US";

  function formatDate(d) {
    if (!d) return t.noDueDate;
    return new Date(d).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  }

  const STATUS_LABELS = {
    submitted: { label: t.statusSubmitted, cls: "bg-blue-50 text-blue-600" },
    late: { label: t.statusLate, cls: "bg-amber-50 text-amber-600" },
    graded: { label: t.statusGraded, cls: "bg-green-50 text-green-600" },
  };
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "error");
      setAssignment(data);
      setFileUrl(data.mySubmission?.fileUrl || "");
      setTextAnswer(data.mySubmission?.textAnswer || "");
    } catch (err) {
      setError(err.message === "forbidden" ? t.accessError : t.loadError);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const isPastDue = assignment?.dueDate && Date.now() > new Date(assignment.dueDate).getTime();
  const canSubmit = assignment && (!isPastDue || assignment.allowLateSubmission);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    if (!fileUrl && !textAnswer.trim()) {
      setSubmitError(t.needFileOrText);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: fileUrl || null, textAnswer: textAnswer.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "deadline_passed") setSubmitError(t.deadlinePassed);
        else setSubmitError(t.submitError);
        return;
      }
      await load();
    } catch {
      setSubmitError(t.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  if (!assignment) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  const mySubmission = assignment.mySubmission;
  const backHref = `/courses/${assignment.course}`;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        {isRTL ? <ArrowRight size={15} /> : <ArrowLeft size={15} />} {t.backToCourse}
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">{assignment.title}</h1>
        {assignment.description && (
          <p className="text-sm text-gray-600 whitespace-pre-line mb-4">{assignment.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} /> {formatDate(assignment.dueDate)}
          </span>
          <span>{t.fullScore} {assignment.maxScore}</span>
          {isPastDue && (
            <span className={`font-bold ${assignment.allowLateSubmission ? "text-amber-600" : "text-red-500"}`}>
              {assignment.allowLateSubmission ? t.lateStillAllowed : t.lateClosed}
            </span>
          )}
        </div>
        {assignment.attachmentUrl && (
          <a
            href={assignment.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline mt-4"
          >
            <Paperclip size={15} /> {t.downloadAttachment}
          </a>
        )}
      </div>

      {mySubmission && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">{t.currentSubmission}</h2>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_LABELS[mySubmission.status]?.cls}`}>
              {STATUS_LABELS[mySubmission.status]?.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
            <Clock size={12} /> {t.submittedAt} {formatDate(mySubmission.submittedAt)}
          </p>
          {mySubmission.status === "graded" && (
            <div className="bg-green-50 rounded-xl p-4 mb-2">
              <p className="text-lg font-black text-green-700">
                {mySubmission.score} / {assignment.maxScore}
              </p>
              {mySubmission.feedback && <p className="text-sm text-green-800 mt-1">{mySubmission.feedback}</p>}
            </div>
          )}
        </div>
      )}

      {canSubmit ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700">{mySubmission ? t.resubmit : t.submitAssignment}</h2>

          {submitError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{submitError}</div>}

          <MediaUploader kind="submission" label={t.uploadLabel} currentUrl={fileUrl} onUploaded={(r) => setFileUrl(r.url)} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.orWriteText}</label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={t.textPlaceholder}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? <Loader size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {mySubmission ? t.updateSubmission : t.submitAssignment}
          </button>
        </form>
      ) : (
        !mySubmission && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-600 text-sm font-semibold flex items-center justify-center gap-2">
            <FileText size={16} /> {t.noLateSubmission}
          </div>
        )
      )}
    </div>
  );
}