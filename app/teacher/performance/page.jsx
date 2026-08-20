"use client";

// app/teacher/performance/page.jsx
//
// Phase 7 — اليوم 55-56: "Teacher Dashboard: أداء كل كورس (عدد الطلاب،
// Completion Rate، متوسط الدرجات)". نظرة مُجمّعة عبر كل كورسات المدرس مع
// بعض (بعكس /teacher/courses/[id]/performance اللي بتدّي تفصيل طالب-طالب
// جوه كورس واحد بس — Phase 4 اليوم 41). البيانات من
// GET /api/teacher/performance.
//
// اليوم 58: زرار "Export to Excel" بينزّل نفس الجدول ده كملف xlsx — نفس
// نمط formsPanel.jsx (ExcelJS في المتصفح).

import { useEffect, useState } from "react";
import Link from "next/link";
import ExcelJS from "exceljs";
import {
  Loader, BarChart3, Users, Award, Download, AlertCircle, ArrowRight, TrendingUp, BookOpen,
} from "lucide-react";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
};

/* ─── شريط تنقّل: كورساتي / الأداء — نفس تنسيق StudentQuickNav بالظبط ─── */
function TeacherQuickNav() {
  const items = [
    { href: "/teacher", label: "كورساتي", icon: BookOpen },
    { href: "/teacher/performance", label: "الأداء والإحصائيات", icon: BarChart3, active: true },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3 mb-6 overflow-x-auto pb-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2 shrink-0 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors ${
            item.active
              ? "bg-[#1D6FD8] text-white border-[#1D6FD8]"
              : "bg-white text-gray-700 border-gray-200 hover:border-[#1D6FD8] hover:text-[#1D6FD8]"
          }`}
        >
          <item.icon size={16} />
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function ScoreBadge({ value }) {
  if (value === null) return <span className="text-xs text-gray-300">—</span>;
  const color = value >= 70 ? "text-green-600 bg-green-50" : value >= 40 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  return <span className={`text-xs font-bold px-2 py-1 rounded-full ${color}`}>{value}%</span>;
}

export default function TeacherPerformancePage() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/performance")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error);
        setCourses(data.courses || []);
      })
      .catch(() => setError("Couldn't load your courses performance"));
  }, []);

  async function exportToExcel() {
    if (!courses || courses.length === 0) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Edumaster Teacher";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Course Performance");
      sheet.columns = [
        { header: "Course", key: "course", width: 34 },
        { header: "Status", key: "status", width: 14 },
        { header: "Students", key: "students", width: 12 },
        { header: "Completed", key: "completed", width: 12 },
        { header: "Completion Rate", key: "completionRate", width: 16 },
        { header: "Avg Quiz Score", key: "avgQuizScore", width: 16 },
        { header: "Avg Assignment Score", key: "avgAssignmentScore", width: 18 },
        { header: "Overall Avg Grade", key: "avgGrade", width: 16 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 12 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });
      headerRow.height = 26;

      courses.forEach((c, idx) => {
        const row = sheet.addRow({
          course: c.courseTitle,
          status: c.status,
          students: c.studentsCount,
          completed: c.completedCount,
          completionRate: `${c.completionRate}%`,
          avgQuizScore: c.avgQuizScore !== null ? `${c.avgQuizScore}%` : "—",
          avgAssignmentScore: c.avgAssignmentScore !== null ? `${c.avgAssignmentScore}%` : "—",
          avgGrade: c.avgGrade !== null ? `${c.avgGrade}%` : "—",
        });
        const isEven = idx % 2 === 0;
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFFFFFFF" : "FFEFF6FF" } };
          cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
        });
      });

      sheet.autoFilter = { from: "A1", to: { row: 1, column: sheet.columns.length } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `course-performance-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/teacher" className="hover:text-gray-700 flex items-center gap-1.5">
            <ArrowRight size={14} className="rotate-180" /> My Courses
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-semibold">Performance</span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0a0a0a] to-[#1D6FD8] flex items-center justify-center">
              <BarChart3 className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Course Performance</h1>
              <p className="text-sm text-gray-400">Students, completion rate, and average grades across all your courses</p>
            </div>
          </div>
          <button
            onClick={exportToExcel}
            disabled={exporting || !courses || courses.length === 0}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
            Export to Excel
          </button>
        </div>

        <TeacherQuickNav />

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2 mb-4">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {!courses && !error && (
          <div className="flex justify-center py-24">
            <Loader className="animate-spin text-[#1D6FD8]" size={36} />
          </div>
        )}

        {courses && courses.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <BarChart3 className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">You don't have any courses yet</p>
          </div>
        )}

        {courses && courses.length > 0 && (
          <>
            {/* مقارنة بصرية سريعة بين الكورسات — Completion Rate */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#1D6FD8]" /> Completion Rate by Course
              </h3>
              <div className="space-y-4">
                {courses.map((c) => (
                  <div key={c.courseId} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-40 shrink-0 truncate">{c.courseTitle}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1D6FD8] rounded-full transition-all"
                        style={{ width: `${c.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-10 text-right shrink-0">{c.completionRate}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 font-semibold text-gray-500">Course</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500">
                        <span className="inline-flex items-center gap-1"><Users size={13} /> Students</span>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500">Completion Rate</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500">Avg Quiz</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500">Avg Assignment</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500">
                        <span className="inline-flex items-center gap-1"><Award size={13} /> Overall Avg</span>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <tr key={c.courseId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">{c.courseTitle}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_STYLES[c.status]}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{c.studentsCount}</td>
                        <td className="py-3 px-4 text-gray-700">{c.completionRate}%</td>
                        <td className="py-3 px-4"><ScoreBadge value={c.avgQuizScore} /></td>
                        <td className="py-3 px-4"><ScoreBadge value={c.avgAssignmentScore} /></td>
                        <td className="py-3 px-4"><ScoreBadge value={c.avgGrade} /></td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/teacher/courses/${c.courseId}/performance`}
                            className="text-xs font-semibold text-[#1D6FD8] hover:underline"
                          >
                            View details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}