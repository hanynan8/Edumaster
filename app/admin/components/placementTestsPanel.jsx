'use client';

// app/admin/components/placementTestsPanel.jsx
//
// لوحة أدمن: نتائج اختبار تحديد المستوى (إسباني) — اسم ورقم وإيميل صاحب
// الاختبار + الدرجة + حالة الدفع (paid/unpaid) + المبلغ المدفوع. مصدر
// البيانات GET /api/admin/placement-tests. الأدمن بيشوف الدرجة دايمًا حتى
// لو الطالب لسه ماستلمهاش (لأنه لسه ما دفعش). فيه فلتر حالة الدفع،
// تصدير Excel، وحذف نتيجة.

import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { Loader, AlertCircle, GraduationCap, Trash2, Download } from 'lucide-react';

const PAY_STYLES = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-amber-100 text-amber-700',
  free: 'bg-blue-100 text-blue-700',
};

function formatDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatPaid(row) {
  if (row.paymentStatus !== 'paid' || row.paidAmount == null) return '—';
  return `${(row.paidAmount / 100).toFixed(2)} ${row.paidCurrency || ''}`.trim();
}

function PlacementTestsAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/placement-tests')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => { setRows(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Error fetching placement test results'); setLoading(false); });
  }, []);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.paymentStatus === filter);

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete the test result of ${row.name}?`)) return;
    setDeletingId(row._id);
    try {
      const res = await fetch(`/api/admin/placement-tests?id=${row._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch {
      setError('Something went wrong while deleting, please try again');
    } finally {
      setDeletingId(null);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Edumaster Admin';
      const sheet = workbook.addWorksheet('Spanish Tests', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Name', key: 'name', width: 28 },
        { header: 'Student Number', key: 'studentNumber', width: 18 },
        { header: 'Email', key: 'email', width: 32 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Out of', key: 'maxScore', width: 10 },
        { header: 'Answered', key: 'answered', width: 12 },
        { header: 'Payment', key: 'payment', width: 12 },
        { header: 'Paid Amount', key: 'paid', width: 16 },
        { header: 'Site Language', key: 'language', width: 14 },
        { header: 'Submitted', key: 'date', width: 22 },
      ];
      const header = sheet.getRow(1);
      header.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      visible.forEach((r, i) => sheet.addRow({
        index: i + 1,
        name: r.name,
        studentNumber: r.studentNumber,
        email: r.email,
        score: r.score,
        maxScore: r.maxScore,
        answered: `${r.answeredCount}/${r.totalQuestions}`,
        payment: r.paymentStatus,
        paid: formatPaid(r),
        language: r.language,
        date: formatDate(r.createdAt),
      }));
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spanish-test-results-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader className="animate-spin text-indigo-600" size={26} /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-indigo-600" size={22} />
          <h2 className="text-lg font-semibold text-gray-800">Spanish Level Test Results</h2>
          <span className="text-xs text-gray-400">({visible.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="free">Free</option>
          </select>
          <button
            onClick={exportToExcel}
            disabled={exporting || visible.length === 0}
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No results yet.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Student #</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Answered</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r._id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.studentNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{r.email}</td>
                  <td className="px-4 py-3 font-bold text-indigo-700">{r.score} / {r.maxScore}</td>
                  <td className="px-4 py-3 text-gray-500">{r.answeredCount}/{r.totalQuestions}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${PAY_STYLES[r.paymentStatus] || PAY_STYLES.unpaid}`}>
                      {r.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatPaid(r)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r._id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === r._id ? <Loader className="animate-spin" size={15} /> : <Trash2 size={15} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PlacementTestsAdmin;