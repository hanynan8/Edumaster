'use client';

// app/admin/components/placementTestsPanel.jsx
//
// لوحة أدمن: نتائج اختبار تحديد المستوى (إسباني) — اسم ورقم (تليفون) وإيميل صاحب
// الاختبار (بيتسجّلوا تلقائيًا من حساب الطالب وقت ما يكمّل الاختبار) + الدرجة +
// زرار 👁 لعرض إجابات الطالب على كل سؤال مع الإجابة الصحيحة والتصحيح +
// حالة الدفع (paid/unpaid) + المبلغ المدفوع. مصدر
// البيانات GET /api/admin/placement-tests. الأدمن بيشوف الدرجة دايمًا حتى
// لو الطالب لسه ماستلمهاش (لأنه لسه ما دفعش). فيه فلتر حالة الدفع،
// تصدير Excel، وحذف نتيجة.

import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Loader, AlertCircle, GraduationCap, Trash2, Download, Upload, Headphones, Eye, X } from 'lucide-react';
import PlacementReview from '@/app/components/PlacementReview';

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


const AUDIO_SLOTS = [
  { slot: 1, label: 'Audio 1 — Mensajes cortos', hint: 'Questions 1–5' },
  { slot: 2, label: 'Audio 2 — Mensajes muy breves', hint: 'Questions 6–10' },
  { slot: 3, label: 'Audio 3 — Carmen: su casa y su día', hint: 'Questions 11–18' },
  { slot: 4, label: 'Audio 4 — Rosa y Miguel', hint: 'Questions 19–25' },
];

function formatSize(bytes) {
  if (!bytes) return '';
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

// رفع صوتيات قسم الاستماع (4 خانات) — بتظهر في الاختبار فورًا أول ما تتّرفع.
function ListeningAudioManager() {
  const [tracks, setTracks] = useState({});
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState(null);
  const [error, setError] = useState('');
  const inputs = useRef({});

  useEffect(() => {
    fetch('/api/admin/placement-tests/audio')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => setTracks(d.tracks || {}))
      .catch(() => setError('Could not load the audio files'))
      .finally(() => setLoading(false));
  }, []);

  const upload = async (slot, file) => {
    if (!file) return;
    setError('');
    setBusySlot(slot);
    try {
      const fd = new FormData();
      fd.append('slot', String(slot));
      fd.append('file', file);
      const res = await fetch('/api/admin/placement-tests/audio', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error === 'invalid_mime' ? 'Unsupported file type — upload an MP3, M4A, WAV or OGG file'
          : data?.error === 'file_too_large' ? 'File is too large (max 30 MB)'
          : data?.error === 'upload_not_configured' ? 'Bunny Storage is not configured'
          : 'Upload failed, please try again'
        );
      }
      setTracks(data.tracks || {});
    } catch (e) {
      setError(e.message || 'Upload failed, please try again');
    } finally {
      setBusySlot(null);
      if (inputs.current[slot]) inputs.current[slot].value = '';
    }
  };

  const remove = async (slot) => {
    if (!window.confirm('Remove this audio? Its questions will be hidden from the test until you upload a new one.')) return;
    setError('');
    setBusySlot(slot);
    try {
      const res = await fetch(`/api/admin/placement-tests/audio?slot=${slot}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error('failed');
      setTracks(data.tracks || {});
    } catch {
      setError('Could not remove the audio, please try again');
    } finally {
      setBusySlot(null);
    }
  };

  const uploadedCount = AUDIO_SLOTS.filter((a) => tracks[a.slot]).length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Headphones className="text-indigo-600" size={18} />
        <h3 className="text-sm font-semibold text-gray-800">Listening audio (Part 2)</h3>
        <span className="text-xs text-gray-400">({uploadedCount}/4 uploaded)</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Each audio appears in its place in the test as soon as it is uploaded. A task without audio stays hidden from the test.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader className="animate-spin text-indigo-600" size={20} /></div>
      ) : (
        <div className="space-y-3">
          {AUDIO_SLOTS.map(({ slot, label, hint }) => {
            const t = tracks[slot];
            const busy = busySlot === slot;
            return (
              <div key={slot} className="border border-gray-100 rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-400">{hint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => { inputs.current[slot] = el; }}
                      type="file"
                      accept="audio/*,.mp3,.m4a,.wav,.ogg"
                      className="hidden"
                      onChange={(e) => upload(slot, e.target.files?.[0])}
                    />
                    <button
                      onClick={() => inputs.current[slot]?.click()}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {busy ? <Loader className="animate-spin" size={13} /> : <Upload size={13} />}
                      {busy ? 'Uploading...' : t ? 'Replace' : 'Upload'}
                    </button>
                    {t && (
                      <button
                        onClick={() => remove(slot)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold px-2.5 py-2 rounded-lg border border-red-100 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>
                </div>
                {t ? (
                  <div className="mt-2.5">
                    <p className="text-[11px] text-gray-500 mb-1">{t.name} · {formatSize(t.size)}</p>
                    <audio controls src={t.url} className="w-full h-9" />
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 mt-2">Not uploaded — its questions are hidden from the test.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// تفاصيل نتيجة طالب: بياناته + الدرجة + إجاباته على كل سؤال مع الإجابة الصحيحة والتصحيح.
function ResultDetailModal({ row, detail, loading, error, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const info = detail || row;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl rounded-2xl bg-gray-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4 rounded-t-2xl bg-white border-b border-gray-100 p-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{info.name}</h3>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span dir="ltr">{info.email}</span>
              <span dir="ltr">{info.phone || '—'}</span>
              <span>{formatDate(info.createdAt)}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                Score {info.score} / {info.maxScore}
              </span>
              <span className="text-sm font-bold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                Level {info.level || '—'}
              </span>
              <span className="text-xs text-gray-500">Answered {info.answeredCount}/{info.totalQuestions}</span>
              {detail && detail.emailSent !== null && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${detail.emailSent ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {detail.emailSent ? 'Result emailed to student' : 'Email not sent'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {loading && <div className="flex justify-center py-16"><Loader className="animate-spin text-indigo-600" size={24} /></div>}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {detail && (
            detail.review?.length
              ? <PlacementReview review={detail.review} language="en" defaultOpen collapsible={false} />
              : <p className="text-sm text-gray-500 py-8 text-center">No answers were recorded for this result.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PlacementTestsAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState(null); // الصف المفتوح تفاصيله
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    fetch('/api/admin/placement-tests')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => { setRows(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Error fetching placement test results'); setLoading(false); });
  }, []);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.paymentStatus === filter);

  const openDetail = async (row) => {
    setSelected(row);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/placement-tests?id=${row._id}`);
      if (!res.ok) throw new Error('failed');
      setDetail(await res.json());
    } catch {
      setDetailError('Could not load the answers, please try again');
    } finally {
      setDetailLoading(false);
    }
  };

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
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 32 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Out of', key: 'maxScore', width: 10 },
        { header: 'Level', key: 'level', width: 10 },
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
        phone: r.phone,
        email: r.email,
        score: r.score,
        maxScore: r.maxScore,
        level: r.level || '',
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
      <ListeningAudioManager />
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
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Level</th>
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
                  <td className="px-4 py-3 text-gray-600" dir="ltr">{r.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.email}</td>
                  <td className="px-4 py-3 font-bold text-indigo-700">{r.score} / {r.maxScore}</td>
                  <td className="px-4 py-3 font-bold text-gray-700">{r.level || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{r.answeredCount}/{r.totalQuestions}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${PAY_STYLES[r.paymentStatus] || PAY_STYLES.unpaid}`}>
                      {r.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatPaid(r)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => openDetail(r)}
                      className="text-indigo-600 hover:text-indigo-800 mr-3"
                      title="View answers & corrections"
                    >
                      <Eye size={16} />
                    </button>
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

      {selected && (
        <ResultDetailModal
          row={selected}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default PlacementTestsAdmin;