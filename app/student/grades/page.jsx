"use client";

// app/student/grades/page.jsx
//
// Phase 4 — اليوم 41: "درجاتي ونتائجي" — كل نتائج الكويزات ودرجات الواجبات
// بتاعة الطالب الحالي، مجمّعة حسب الكورس. البيانات كلها من
// GET /api/student/grades (شوف الراوت للتفاصيل).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Loader, ArrowRight, ArrowLeft, GraduationCap, CheckCircle2, XCircle, Clock, BookOpen,
} from "lucide-react";

const STRINGS = {
  ar: {
    title: "درجاتي ونتائجي",
    subtitle: "نتايجك في كل الكويزات ودرجاتك في الواجبات، لكل كورس مسجّل فيه",
    myCourses: "كورساتي",
    grades: "درجاتي",
    empty: "لسه معملتش enroll في أي كورس",
    browse: "تصفّح الكورسات",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل درجاتك",
    progress: "نسبة الإكمال",
    quizzes: "الكويزات",
    assignments: "الواجبات",
    noQuizzes: "مفيش كويزات منشورة في الكورس ده لسه",
    noAssignments: "مفيش واجبات منشورة في الكورس ده لسه",
    attempts: (used, max) => `${used}/${max} محاولة`,
    passed: "ناجح",
    failed: "راسب",
    notAttempted: "لسه ما حلتهوش",
    solve: "حل الكويز",
    review: "مراجعة",
    submitted: "مُسلَّم",
    late: "متأخر",
    graded: "مُصحَّح",
    notSubmitted: "لسه ما سلمتهوش",
    submit: "سلّم الواجب",
    viewSubmission: "شوف تسليمك",
    dueDate: (d) => `الموعد النهائي: ${d}`,
    noDueDate: "بدون موعد نهائي",
    score: (s, m) => `${s}/${m}`,
  },
  en: {
    title: "My Grades & Results",
    subtitle: "Your quiz results and assignment grades, per enrolled course",
    myCourses: "My Courses",
    grades: "Grades",
    empty: "You haven't enrolled in any course yet",
    browse: "Browse Courses",
    loading: "Loading...",
    error: "Couldn't load your grades",
    progress: "Completion",
    quizzes: "Quizzes",
    assignments: "Assignments",
    noQuizzes: "No published quizzes in this course yet",
    noAssignments: "No published assignments in this course yet",
    attempts: (used, max) => `${used}/${max} attempts`,
    passed: "Passed",
    failed: "Failed",
    notAttempted: "Not attempted yet",
    solve: "Take quiz",
    review: "Review",
    submitted: "Submitted",
    late: "Late",
    graded: "Graded",
    notSubmitted: "Not submitted yet",
    submit: "Submit assignment",
    viewSubmission: "View submission",
    dueDate: (d) => `Due: ${d}`,
    noDueDate: "No due date",
    score: (s, m) => `${s}/${m}`,
  },
};

function ProgressBar({ percent }) {
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${percent >= 100 ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 shrink-0">{percent}%</span>
    </div>
  );
}

export default function StudentGradesPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;
  const locale = language === "ar" ? "ar-EG" : "en-US";

  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/student/grades")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error);
        setCourses(data.courses);
      })
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/student" className="hover:text-gray-700 flex items-center gap-1.5">
            <BackArrow size={14} /> {t.myCourses}
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-semibold">{t.grades}</span>
        </div>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <GraduationCap size={20} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-800">{t.title}</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8">{t.subtitle}</p>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}

        {!courses && !error ? (
          <div className="flex justify-center py-24">
            <Loader className="animate-spin text-blue-500" size={36} />
          </div>
        ) : courses && courses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={32} />
            <p className="text-gray-400 mb-4">{t.empty}</p>
            <Link href="/courses" className="text-blue-600 font-semibold hover:underline">
              {t.browse}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {courses?.map((c) => (
              <div key={c.courseId} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                  <Link href={`/courses/${c.courseId}`} className="font-bold text-gray-800 hover:text-blue-600 transition-colors">
                    {c.courseTitle}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{t.progress}</span>
                    <ProgressBar percent={c.progressPercent} />
                  </div>
                </div>

                {/* الكويزات */}
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">{t.quizzes}</h3>
                  {c.quizzes.length === 0 ? (
                    <p className="text-sm text-gray-300">{t.noQuizzes}</p>
                  ) : (
                    <div className="space-y-2">
                      {c.quizzes.map((q) => (
                        <div key={q.quizId} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-700 truncate">{q.title}</p>
                            <p className="text-xs text-gray-400">{t.attempts(q.attemptsUsed, q.maxAttempts)}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {q.bestScorePercent !== null ? (
                              <span
                                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                  q.passed ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                }`}
                              >
                                {q.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {q.bestScorePercent}% · {q.passed ? t.passed : t.failed}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">{t.notAttempted}</span>
                            )}
                            <Link
                              href={`/student/quizzes/${q.quizId}`}
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              {q.bestScorePercent !== null ? t.review : t.solve}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* الواجبات */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">{t.assignments}</h3>
                  {c.assignments.length === 0 ? (
                    <p className="text-sm text-gray-300">{t.noAssignments}</p>
                  ) : (
                    <div className="space-y-2">
                      {c.assignments.map((a) => (
                        <div key={a.assignmentId} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-700 truncate">{a.title}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={11} />
                              {a.dueDate ? t.dueDate(new Date(a.dueDate).toLocaleDateString(locale)) : t.noDueDate}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {a.status === "graded" ? (
                              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600">
                                <CheckCircle2 size={12} /> {t.score(a.score, a.maxScore)}
                              </span>
                            ) : a.submitted ? (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                                {a.status === "late" ? t.late : t.submitted}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">{t.notSubmitted}</span>
                            )}
                            <Link
                              href={`/student/assignments/${a.assignmentId}`}
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              {a.submitted ? t.viewSubmission : t.submit}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}