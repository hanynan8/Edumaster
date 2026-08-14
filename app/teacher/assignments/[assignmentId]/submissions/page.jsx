"use client";

// app/teacher/assignments/[assignmentId]/submissions/page.jsx
//
// Phase 4 — اليوم 39-40: "Teacher: تصحيح يدوي + درجة + Feedback" — قائمة كل
// تسليمات الطلاب لواجب معيّن، مع فورم تصحيح مباشر لكل تسليم.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Loader, CheckCircle2, Clock } from "lucide-react";

const STATUS_LABELS = {
  submitted: { label: "مُسلَّم", cls: "bg-blue-50 text-blue-600" },
  late: { label: "متأخر", cls: "bg-amber-50 text-amber-600" },
  graded: { label: "مُصحَّح", cls: "bg-green-50 text-green-600" },
};

function GradeForm({ submission, maxScore, onGraded }) {
  const [score, setScore] = useState(submission.score ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const numScore = Number(score);
    if (!Number.isFinite(numScore) || numScore < 0 || numScore > maxScore) {
      return setError(`الدرجة لازم تكون بين 0 و ${maxScore}`);
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${submission.assignment || ""}`.replace(/\/$/, "") === "" ? "" : "", {});
    } catch {
      // placeholder — replaced below by real call
    }
  }

  return null;
}

export default function AssignmentSubmissionsPage({ params }) {
  const { assignmentId } = usePromise(params);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState({}); // submissionId -> { score, feedback }
  const [savingId, setSavingId] = useState(null);

  async function load() {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      setData(json);
      setDrafts(
        Object.fromEntries(
          json.submissions.map((s) => [s.id, { score: s.score ?? "", feedback: s.feedback ?? "" }])
        )
      );
    } catch {
      setError("تعذّر تحميل التسليمات");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  function updateDraft(id, field, value) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleGrade(submissionId) {
    const draft = drafts[submissionId];
    const score = Number(draft.score);
    if (!Number.isFinite(score) || score < 0 || score > data.maxScore) {
      alert(`الدرجة لازم تكون بين 0 و ${data.maxScore}`);
      return;
    }
    setSavingId(submissionId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback: draft.feedback }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      setData((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId ? { ...s, score: json.score, feedback: json.feedback, status: "graded", gradedAt: json.gradedAt } : s
        ),
      }));
    } catch {
      alert("حصل خطأ أثناء حفظ الدرجة");
    } finally {
      setSavingId(null);
    }
  }

  if (error) return <div className="max-w-4xl mx-auto px-6 py-16 text-center text-red-500">{error}</div>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/teacher" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowRight size={15} /> رجوع لكورساتي
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-1">تسليمات: {data.assignmentTitle}</h1>
      <p className="text-sm text-gray-400 mb-8">{data.courseTitle} · الدرجة الكاملة {data.maxScore}</p>

      {data.submissions.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center text-gray-400">
          لسه محدش سلّم الواجب ده
        </div>
      ) : (
        <div className="space-y-4">
          {data.submissions.map((s) => {
            const draft = drafts[s.id] || { score: "", feedback: "" };
            const status = STATUS_LABELS[s.status] || STATUS_LABELS.submitted;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{s.studentName}</p>
                    <p className="text-xs text-gray-400">{s.studentEmail}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${status.cls}`}>{status.label}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <Clock size={12} /> اتسلم في {new Date(s.submittedAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}
                </div>

                {s.fileUrl && (
                  <a
                    href={s.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline mb-3"
                  >
                    <FileText size={15} /> عرض الملف المُسلَّم
                  </a>
                )}
                {s.textAnswer && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 whitespace-pre-line mb-3">{s.textAnswer}</div>
                )}

                <div className="grid sm:grid-cols-[120px_1fr_auto] gap-3 items-start pt-3 border-t border-gray-100">
                  <input
                    type="number"
                    min={0}
                    max={data.maxScore}
                    placeholder={`0-${data.maxScore}`}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={draft.score}
                    onChange={(e) => updateDraft(s.id, "score", e.target.value)}
                  />
                  <input
                    placeholder="ملاحظات للطالب (اختياري)"
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={draft.feedback}
                    onChange={(e) => updateDraft(s.id, "feedback", e.target.value)}
                  />
                  <button
                    onClick={() => handleGrade(s.id)}
                    disabled={savingId === s.id}
                    className="flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingId === s.id ? <Loader size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {s.status === "graded" ? "تحديث" : "تصحيح"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}