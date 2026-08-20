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
  ArrowRight, Loader, Calendar, FileText, AlertTriangle, CheckCircle2, Clock, Paperclip,
} from "lucide-react";
import MediaUploader from "@/app/teacher/components/MediaUploader";

function formatDate(d) {
  if (!d) return "بدون موعد نهائي";
  return new Date(d).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_LABELS = {
  submitted: { label: "مُسلَّم — في انتظار التصحيح", cls: "bg-blue-50 text-blue-600" },
  late: { label: "اتسلّم متأخر — في انتظار التصحيح", cls: "bg-amber-50 text-amber-600" },
  graded: { label: "مُصحَّح", cls: "bg-green-50 text-green-600" },
};

export default function SubmitAssignmentPage({ params }) {
  const { assignmentId } = usePromise(params);
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
      setError(err.message === "forbidden" ? "لازم يكون عندك وصول لهذا الكورس عشان تسلّم الواجب ده" : "تعذّر تحميل الواجب");
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
      setSubmitError("لازم ترفع ملف أو تكتب إجابة نصية قبل التسليم");
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
        if (data.error === "deadline_passed") setSubmitError("فات ميعاد التسليم ومش مسموح بتسليم متأخر لهذا الواجب");
        else setSubmitError("حصل خطأ أثناء التسليم، حاول تاني");
        return;
      }
      await load();
    } catch {
      setSubmitError("حصل خطأ أثناء التسليم، حاول تاني");
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowRight size={15} /> رجوع للكورس
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
          <span>الدرجة الكاملة {assignment.maxScore}</span>
          {isPastDue && (
            <span className={`font-bold ${assignment.allowLateSubmission ? "text-amber-600" : "text-red-500"}`}>
              {assignment.allowLateSubmission ? "الميعاد فات — لسه ممكن تسلّم متأخر" : "الميعاد فات — التسليم مقفول"}
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
            <Paperclip size={15} /> تحميل مرفق الواجب
          </a>
        )}
      </div>

      {mySubmission && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">تسليمك الحالي</h2>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_LABELS[mySubmission.status]?.cls}`}>
              {STATUS_LABELS[mySubmission.status]?.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
            <Clock size={12} /> اتسلم في {formatDate(mySubmission.submittedAt)}
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
          <h2 className="text-sm font-semibold text-gray-700">{mySubmission ? "إعادة التسليم" : "تسليم الواجب"}</h2>

          {submitError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{submitError}</div>}

          <MediaUploader kind="submission" label="ارفع ملف تسليمك (PDF / Word / صورة / Zip)" currentUrl={fileUrl} onUploaded={(r) => setFileUrl(r.url)} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">أو اكتب إجابة نصية (اختياري)</label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="اكتب إجابتك هنا لو مفيش ملف..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? <Loader size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {mySubmission ? "تحديث التسليم" : "تسليم الواجب"}
          </button>
        </form>
      ) : (
        !mySubmission && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-600 text-sm font-semibold flex items-center justify-center gap-2">
            <FileText size={16} /> الميعاد فات ومش مسموح بتسليم متأخر لهذا الواجب
          </div>
        )
      )}
    </div>
  );
}