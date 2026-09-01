'use client';

// app/admin/components/englishProgramRequestsPanel.jsx
//
// لوحة أدمن لطلبات التسجيل في برنامج اللغة الإنجليزية (English Program
// Enrollment Form) — بتعرض كل الطلبات الجايه من
// POST /api/data?collection=englishProgramRequests (شوف
// app/components/englishProgram/EnglishProgramForm.jsx)، بنفس فلسفة
// translationRequestsPanel.jsx / consultationsPanel.jsx بالظبط: جدول +
// نافذة تفاصيل + حذف + تصدير Excel + تغيير حالة الطلب عن طريق
// PUT /api/data?collection=englishProgramRequests&id=.

import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import {
  Loader, AlertCircle, GraduationCap, Trash2, Mail, Phone, FileText,
} from 'lucide-react';

const STATUS_OPTIONS = ['pending', 'contacted', 'placement_test', 'enrolled', 'declined', 'cancelled'];
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  placement_test: 'bg-indigo-100 text-indigo-700',
  enrolled: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
};

// نفس بنية المستويات/البرامج المستخدمة في EnglishProgramForm.jsx — مستخدمة
// هنا بس لعرض اسم مقروء (label) بدل الـ id الخام (زي "b2-professional").
const PROGRAM_LABELS = {
  'a1-foundations': 'English Foundations (A1)',
  'a2-everyday': 'Everyday English (A2)',
  'b1-practical': 'Practical English (B1)',
  'b2-professional': 'Professional English (B2)',
  'c1-advanced-professional': 'Advanced Professional English (C1)',
  'c2-mastery': 'English Mastery (C2)',
  business: 'Business English (B2–C1)',
  academic: 'Academic English (B2–C1)',
  'call-centers': 'English for Call Centers (A2–B2)',
  'customer-service': 'English for Customer Service (B1–B2)',
  healthcare: 'English for Healthcare Professionals (B2–C1)',
  university: 'English for University Students (B1–C1)',
  'job-interviews': 'English for Job Interviews (B1–C1)',
  hospitality: 'English for Hospitality & Tourism (A2–B2)',
};

function programLabel(id) {
  if (!id) return '—';
  return PROGRAM_LABELS[id] || labelize(id);
}

function labelize(s) {
  return String(s || '').replace(/_/g, ' ').replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function buildGmailComposeUrl({ to, name }) {
  const subject = `Your English program enrollment — Edumaster`;
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const body = `${greeting}\n\nThank you for your interest in the Edumaster English Program.\n`;
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to || ''}?${params.toString()}`;
}

function getDateFromObjectId(id) {
  if (!id || typeof id !== 'string' || id.length < 8) return null;
  const hex = id.substring(0, 8);
  if (!/^[0-9a-fA-F]{8}$/.test(hex)) return null;
  const timestamp = parseInt(hex, 16) * 1000;
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value, fallbackId) {
  let d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) {
    d = fallbackId ? getDateFromObjectId(fallbackId) : null;
  }
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getEffectiveTimestamp(doc) {
  if (doc?.createdAt) {
    const d = new Date(doc.createdAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const fromId = getDateFromObjectId(doc?._id);
  return fromId ? fromId.getTime() : 0;
}

function EnglishProgramRequestsAdmin() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetch('/api/data?collection=englishProgramRequests')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const sorted = [...list].sort((a, b) => getEffectiveTimestamp(b) - getEffectiveTimestamp(a));
        setSubmissions(sorted);
        setLoading(false);
      })
      .catch(() => { setError('Error fetching English program requests'); setLoading(false); });
  }, []);

  const requestDelete = (sub) => { if (sub?._id) setConfirmTarget(sub); };

  const handleDelete = async (id) => {
    if (!id) return;
    setConfirmTarget(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/data?collection=englishProgramRequests&id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
      setSelected((prev) => (prev && prev._id === id ? null : prev));
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Something went wrong while deleting the request, please try again');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/data?collection=englishProgramRequests&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, status: updated.status ?? status } : s)));
      setSelected((prev) => (prev && prev._id === id ? { ...prev, status: updated.status ?? status } : prev));
    } catch (err) {
      console.error('Status update failed:', err);
      setError('Something went wrong while updating the status, please try again');
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleSubmissions = statusFilter === 'all'
    ? submissions
    : submissions.filter((s) => (s.status || 'pending') === statusFilter);

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Edumaster Admin';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('English Program Requests', { views: [{ state: 'frozen', ySplit: 1 }] });

      const columnDefs = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Name', key: 'name', width: 26 },
        { header: 'Email', key: 'email', width: 32 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Country', key: 'countryOfResidence', width: 20 },
        { header: 'Knows Level', key: 'knowsCurrentLevel', width: 14 },
        { header: 'Current Level', key: 'currentLevel', width: 14 },
        { header: 'Desired Program', key: 'desiredProgram', width: 34 },
        { header: 'Preferred Intake', key: 'preferredIntake', width: 16 },
        { header: 'Study Format', key: 'studyFormat', width: 14 },
        { header: 'Study Goal', key: 'studyGoal', width: 26 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Notes', key: 'notes', width: 50 },
        { header: 'Submitted', key: 'date', width: 20 },
        { header: 'ID', key: 'id', width: 26 },
      ];
      sheet.columns = columnDefs;

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003A91' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      headerRow.height = 26;

      submissions.forEach((sub, idx) => {
        const row = sheet.addRow({
          index: idx + 1,
          name: sub.fullName || '—',
          email: sub.email || '—',
          phone: sub.phone || '—',
          countryOfResidence: sub.countryOfResidence || '—',
          knowsCurrentLevel: labelize(sub.knowsCurrentLevel) || '—',
          currentLevel: sub.currentLevel || '—',
          desiredProgram: programLabel(sub.desiredProgram),
          preferredIntake: labelize(sub.preferredIntake) || '—',
          studyFormat: labelize(sub.studyFormat) || '—',
          studyGoal: sub.studyGoal || '—',
          status: sub.status || 'pending',
          notes: sub.notes || '—',
          date: formatDate(sub.createdAt, sub._id),
          id: sub._id || '',
        });
        const isEven = idx % 2 === 0;
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFEFF3FB' } };
          cell.alignment = { vertical: 'top', wrapText: true };
        });
      });

      sheet.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columns.length } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `english-program-requests-${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
      <Loader className="animate-spin mx-auto text-[#003A91]" size={48} />
      <p className="mt-4 text-gray-400 font-medium">Loading English program requests...</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
      <div className="p-4 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-[#003A91]">
            <GraduationCap size={28} /> English Program Requests
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{submissions.length}</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Requests submitted from the English Program Enrollment Form on the Services page and home pages.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm font-medium border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:border-[#003A91]"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{labelize(s)}</option>
            ))}
          </select>
          <button
            onClick={exportToExcel}
            disabled={submissions.length === 0 || exporting}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-colors shadow"
          >
            {exporting ? <Loader size={18} className="animate-spin" /> : <FileText size={18} />}
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 px-4 py-4 rounded-xl bg-red-500 text-white flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-7 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete this request?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete the enrollment request from{' '}
              <span className="font-semibold text-gray-700">{confirmTarget.fullName || 'this client'}</span>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmTarget(null)} className="flex-1 font-semibold px-4 py-2.5 rounded-xl transition-colors bg-gray-100 hover:bg-gray-200 text-gray-700">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmTarget._id)} className="flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors shadow bg-red-600 hover:bg-red-700 text-white">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">English Program Request Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLES[selected.status || 'pending']}`}>
                {labelize(selected.status || 'pending')}
              </span>
              <span className="text-[11px] font-medium text-gray-400">{formatDate(selected.createdAt, selected._id)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-6">
              <DetailField label="Full Name" value={selected.fullName} />
              <DetailField label="Email" value={selected.email} isEmail />
              <DetailField label="Phone / WhatsApp" value={selected.phone} />
              <DetailField label="Country of Residence" value={selected.countryOfResidence} />
              <DetailField label="Preferred Contact" value={labelize(selected.preferredContact)} />
              <DetailField label="Knows Current Level?" value={labelize(selected.knowsCurrentLevel)} />
              <DetailField label="Current Level (CEFR)" value={selected.currentLevel} />
              <DetailField label="Desired Program" value={programLabel(selected.desiredProgram)} />
              <DetailField label="Preferred Intake" value={labelize(selected.preferredIntake)} />
              <DetailField label="Study Format" value={labelize(selected.studyFormat)} />
              <DetailField label="Study Goal" value={selected.studyGoal} />
            </div>

            {selected.notes && (
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Additional Notes</span>
                <p className="mt-1 text-gray-800 text-sm whitespace-pre-wrap break-words bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100">
                  {selected.notes}
                </p>
              </div>
            )}

            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">Update status</span>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selected._id, s)}
                    disabled={updatingId === selected._id}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                      (selected.status || 'pending') === s
                        ? `${STATUS_STYLES[s]} border-transparent`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {labelize(s)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">ID</span>
              <p className="mt-1 text-gray-500 font-mono text-xs">{selected._id}</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => requestDelete(selected)}
                disabled={deletingId === selected._id}
                className="flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors shadow bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white"
              >
                {deletingId === selected._id ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {deletingId === selected._id ? 'Deleting...' : 'Delete Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {visibleSubmissions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <GraduationCap size={48} className="mx-auto mb-3 opacity-30" />
            <p>No English program requests {statusFilter !== 'all' ? `with status "${labelize(statusFilter)}"` : 'yet'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-3 px-2 font-semibold text-gray-500">#</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Name</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Contact</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Program</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Level</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Status</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody>
              {visibleSubmissions.map((sub, idx) => (
                <tr key={sub._id} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors align-top">
                  <td className="py-3 px-2 text-gray-400">{idx + 1}</td>
                  <td className="py-3 px-2 font-medium text-gray-800 whitespace-nowrap">
                    <span className="block text-[10px] font-normal text-gray-400 mb-0.5">{formatDate(sub.createdAt, sub._id)}</span>
                    {sub.fullName || '—'}
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <a
                      href={sub.email ? buildGmailComposeUrl({ to: sub.email, name: sub.fullName }) : undefined}
                      className={`inline-flex items-center gap-1.5 font-medium text-left ${sub.email ? 'text-[#003A91] hover:underline' : 'text-gray-400 pointer-events-none'}`}
                    >
                      <Mail size={14} className="shrink-0" /> <span>{sub.email || '—'}</span>
                    </a>
                    {sub.phone && (
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1">
                        <Phone size={12} className="shrink-0" /> {sub.phone}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-600 max-w-[220px]">
                    {programLabel(sub.desiredProgram)}
                  </td>
                  <td className="py-3 px-2 text-gray-600 whitespace-nowrap text-xs">
                    {sub.currentLevel || (sub.knowsCurrentLevel === 'no' ? 'Needs test' : '—')}
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <select
                      value={sub.status || 'pending'}
                      onChange={(e) => handleStatusChange(sub._id, e.target.value)}
                      disabled={updatingId === sub._id}
                      className={`text-xs font-bold px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 ${STATUS_STYLES[sub.status || 'pending']}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{labelize(s)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(sub)}
                        className="text-xs font-semibold text-[#003A91] hover:opacity-80 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        View
                      </button>
                      <button
                        onClick={() => requestDelete(sub)}
                        disabled={deletingId === sub._id}
                        title="Delete"
                        className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 disabled:opacity-50 p-1.5 rounded-lg transition-colors"
                      >
                        {deletingId === sub._id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value, isEmail }) {
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
      {isEmail && value ? (
        <p className="mt-0.5 text-sm">
          <a href={`mailto:${value}`} className="text-[#003A91] hover:underline">{value}</a>
        </p>
      ) : (
        <p className="mt-0.5 text-gray-800 text-sm">{value || '—'}</p>
      )}
    </div>
  );
}

export default EnglishProgramRequestsAdmin;