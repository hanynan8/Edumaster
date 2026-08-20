'use client';

// app/admin/components/overviewPanel.jsx
//
// Phase 7 — اليوم 53-54: "Admin Dashboard: إحصائيات عامة (عدد طلاب/مدرسين/
// كورسات/إيرادات) بشكل Charts". الـ backend (GET /api/admin/stats) بيرجّع
// كل الأرقام دي جاهزة، بس مفيش تاب في لوحة الأدمن بيعرضها — اللوحة دي بتسد
// الفجوة، بنفس نمط revenuePanel.jsx بالظبط (بطاقات إجمالي + مخطط أعمدة
// CSS بسيط، مفيش recharts متركب في المشروع).
//
// اليوم 58: زرار "Export to Excel" بينزّل ملخص الإحصائيات كملف xlsx —
// نفس نمط exportToExcel في formsPanel.jsx (ExcelJS في المتصفح، تنزيل
// مباشر بـ Blob، من غير أي route سيرفر إضافي).

import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import {
  Users, GraduationCap, BookOpen, DollarSign, Award, ClipboardList,
  RefreshCcw, Loader, AlertCircle, Download, TrendingUp,
} from 'lucide-react';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMoney(minorUnits) {
  return `${(Number(minorUnits || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP`;
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function TrendChart({ title, data, color }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-6">{title}</h3>
      <div className="flex items-end justify-between gap-3 h-40">
        {data.map((d, i) => {
          const heightPct = Math.max(4, Math.round((d.count / max) * 100));
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
              <span className="text-[11px] font-semibold text-gray-500">{d.count}</span>
              <div
                className={`w-full max-w-[52px] rounded-t-lg transition-all ${color}`}
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-xs font-semibold text-gray-400">{MONTH_LABELS[d.month - 1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CourseStatusBreakdown({ counts }) {
  const rows = [
    { key: 'coursesPublished', label: 'Published', color: 'bg-green-500', text: 'text-green-700' },
    { key: 'coursesDraft', label: 'Draft', color: 'bg-gray-400', text: 'text-gray-600' },
    { key: 'coursesArchived', label: 'Archived', color: 'bg-amber-500', text: 'text-amber-700' },
  ];
  const total = Math.max(1, counts.totalCourses);
  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-5">Courses by Status</h3>
      <div className="w-full h-3 rounded-full overflow-hidden flex mb-5 bg-gray-100">
        {rows.map((r) => (
          <div
            key={r.key}
            className={r.color}
            style={{ width: `${((counts[r.key] || 0) / total) * 100}%` }}
            title={`${r.label}: ${counts[r.key] || 0}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.key} className="text-center">
            <p className={`text-xl font-bold ${r.text}`}>{counts[r.key] || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverviewAdmin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/stats')
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching dashboard statistics');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const exportToExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Edumaster Admin';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Overview');
      sheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 22 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      headerRow.height = 26;

      const rows = [
        ['Total Students', data.counts.students],
        ['Total Teachers', data.counts.teachers],
        ['Total Admins', data.counts.admins],
        ['Total Users', data.counts.totalUsers],
        ['Published Courses', data.counts.coursesPublished],
        ['Draft Courses', data.counts.coursesDraft],
        ['Archived Courses', data.counts.coursesArchived],
        ['Total Courses', data.counts.totalCourses],
        ['Total Enrollments', data.counts.totalEnrollments],
        ['Certificates Issued', data.counts.certificatesIssued],
        ['Total Revenue', formatMoney(data.totalRevenue)],
      ];
      rows.forEach(([metric, value], idx) => {
        const row = sheet.addRow({ metric, value });
        const isEven = idx % 2 === 0;
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFEFF6FF' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        });
      });

      const trendSheet = workbook.addWorksheet('Monthly Trend');
      trendSheet.columns = [
        { header: 'Month', key: 'month', width: 14 },
        { header: 'New Signups', key: 'signups', width: 16 },
        { header: 'New Enrollments', key: 'enrollments', width: 18 },
      ];
      const trendHeader = trendSheet.getRow(1);
      trendHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      trendHeader.height = 26;
      data.signupsTrend.forEach((s, i) => {
        const e = data.enrollmentsTrend[i];
        trendSheet.addRow({
          month: `${MONTH_LABELS[s.month - 1]} ${s.year}`,
          signups: s.count,
          enrollments: e?.count || 0,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-overview-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Loader className="animate-spin mx-auto" size={48} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-100 p-8">
        <div className="px-6 py-4 rounded-xl bg-red-500 text-white flex items-center gap-3">
          <AlertCircle size={20} /> {error || 'Failed to load dashboard statistics'}
        </div>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { counts } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-blue-900">
            <TrendingUp size={28} /> Overview
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={exporting}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              Export to Excel
            </button>
            <button
              onClick={load}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCcw size={16} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={GraduationCap} label="Students" value={counts.students} accent="bg-blue-50 text-blue-600" />
        <StatCard icon={Users} label="Teachers" value={counts.teachers} accent="bg-purple-50 text-purple-600" />
        <StatCard icon={BookOpen} label="Total Courses" value={counts.totalCourses} accent="bg-amber-50 text-amber-600" />
        <StatCard icon={DollarSign} label="Total Revenue" value={formatMoney(data.totalRevenue)} accent="bg-green-50 text-green-600" />
        <StatCard icon={ClipboardList} label="Total Enrollments" value={counts.totalEnrollments} accent="bg-indigo-50 text-indigo-600" />
        <StatCard icon={Award} label="Certificates Issued" value={counts.certificatesIssued} accent="bg-rose-50 text-rose-600" />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart title="New Signups (Last 6 Months)" data={data.signupsTrend} color="bg-gradient-to-t from-blue-600 to-purple-500" />
        <TrendChart title="New Enrollments (Last 6 Months)" data={data.enrollmentsTrend} color="bg-gradient-to-t from-green-600 to-teal-400" />
      </div>

      <CourseStatusBreakdown counts={counts} />
    </div>
  );
}