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
//
// 🆕 تبويبات ديناميكية: A1 / A2 + أي اختبار مخصص (B1, B2, ...) الأدمن رفعه + تبويب "Manage tests"
//   (رفع Excel، نشر/إخفاء، ربط الكورسات — شوف customPlacementTestsManager.jsx). كل تبويب اختبار ليه:
//   - رفع صوتيات الاستماع بتاعته (4 خانات منفصلة) — في A2 بتظهر كمان "Script" لكل خانة
//     (نص التسجيل اللي هتسجّله بنفسك، بييجي من API الأدمن بس).
//   - نتائجه (النتايج القديمة من غير حقل test بتتحسب A1).

import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Loader, AlertCircle, GraduationCap, Trash2, Download, Upload, Headphones, Eye, X, FileSpreadsheet } from 'lucide-react';
import PlacementReview from '@/app/components/PlacementReview';
import { PLACEMENT_TESTS, TEST_IDS } from '@/app/lib/placementTests';
import CustomPlacementTestsManager from './customPlacementTestsManager';

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


function formatSize(bytes) {
  if (!bytes) return '';
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

// رفع صوتيات قسم الاستماع (A1: 4 خانات · A2: 12 خانة زي ملف الاختبار) — بتظهر في الاختبار فورًا أول ما تتّرفع.
// testInfo = { label, audioSlots: [{slot,label,hint}] } — مدمج (PLACEMENT_TESTS) أو مخصص (من قايمة الاختبارات المخصصة)
function ListeningAudioManager({ testId, testInfo }) {
  const AUDIO_SLOTS = testInfo.audioSlots;
  const [tracks, setTracks] = useState({});
  const [scripts, setScripts] = useState({}); // نص التسجيل لكل خانة (لو متاح — A2)
  const [openScript, setOpenScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState(null);
  const [error, setError] = useState('');
  const inputs = useRef({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setTracks({});
    setScripts({});
    setOpenScript(null);
    fetch(`/api/admin/placement-tests/audio?test=${testId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => {
        if (cancelled) return;
        setTracks(d.tracks || {});
        setScripts(d.scripts || {});
      })
      .catch(() => { if (!cancelled) setError('Could not load the audio files'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [testId]);

  const upload = async (slot, file) => {
    if (!file) return;
    setError('');
    setBusySlot(slot);
    try {
      const fd = new FormData();
      fd.append('test', testId);
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
      const res = await fetch(`/api/admin/placement-tests/audio?test=${testId}&slot=${slot}`, { method: 'DELETE' });
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
        <h3 className="text-sm font-semibold text-gray-800">Listening audio (Part 2) — {testInfo.label} test</h3>
        <span className="text-xs text-gray-400">({uploadedCount}/{AUDIO_SLOTS.length} uploaded)</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Each audio appears in its place in the {testInfo.label} test as soon as it is uploaded. A question or task without audio stays hidden from the test (the score is then calculated out of 100 from the visible questions).
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
                {scripts[slot] && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setOpenScript(openScript === slot ? null : slot)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {openScript === slot ? 'Hide script' : 'Show script (to record)'}
                    </button>
                    {openScript === slot && (
                      <pre
                        dir="ltr"
                        className="mt-1.5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3 text-left text-xs leading-relaxed text-gray-700 font-sans"
                      >
                        {scripts[slot]}
                      </pre>
                    )}
                  </div>
                )}
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

// الاختبارات المخصصة (B1, ...) — بترمي Error لو الطلب فشل
async function fetchCustomTests() {
  const res = await fetch('/api/admin/placement-tests/custom');
  if (!res.ok) throw new Error('failed');
  const data = await res.json();
  return Array.isArray(data?.tests) ? data.tests : [];
}

function PlacementTestsAdmin() {
  const [testId, setTestId] = useState('a1'); // التبويب الحالي: a1 | a2 | id اختبار مخصص | 'manage'
  const [customTests, setCustomTests] = useState([]); // الاختبارات المخصصة (B1, ...)
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

  const loadCustomTests = async () => {
    try {
      setCustomTests(await fetchCustomTests());
    } catch {
      setError('Error fetching the custom tests');
    }
  };

  useEffect(() => {
    fetch('/api/admin/placement-tests')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => { setRows(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Error fetching placement test results'); setLoading(false); });
    fetchCustomTests()
      .then(setCustomTests)
      .catch(() => setError('Error fetching the custom tests'));
  }, []);

  // نتيجة قديمة من غير test = A1 · الاختبار المخصص = id الاختبار
  const rowTestId = (r) => (r.test ? String(r.test).toLowerCase() : 'a1');
  const countFor = (id) => rows.filter((r) => rowTestId(r) === id).length;
  // تبويبات الاختبارات: المدمجة + المخصصة (المؤرشف بيظهر بس لو ليه نتايج قديمة)
  const tabs = [
    ...TEST_IDS.map((id) => ({ id, label: PLACEMENT_TESTS[id].label, audioSlots: PLACEMENT_TESTS[id].audioSlots })),
    ...customTests
      .filter((t) => t.status !== 'archived' || countFor(t.id) > 0)
      .map((t) => ({ id: t.id, label: t.label, status: t.status, audioSlots: t.audioSlots || [] })),
  ];
  const isManage = testId === 'manage';
  const current = tabs.find((t) => t.id === testId) || tabs[0];
  const testRows = rows.filter((r) => rowTestId(r) === testId);
  const visible = filter === 'all' ? testRows : testRows.filter((r) => r.paymentStatus === filter);

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
      const sheet = workbook.addWorksheet(`Level Tests ${current.label}`.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
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
      a.download = `level-test-${testId}-results-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex flex-wrap rounded-xl border border-gray-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setTestId(tab.id); setFilter('all'); setSelected(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                testId === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label} test
              {tab.status && tab.status !== 'published' && (
                <span className={`ml-1 text-[10px] uppercase ${testId === tab.id ? 'text-indigo-200' : 'text-amber-600'}`}>{tab.status}</span>
              )}
              <span className={`ml-1.5 text-xs ${testId === tab.id ? 'text-indigo-200' : 'text-gray-400'}`}>({countFor(tab.id)})</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setTestId('manage'); setSelected(null); }}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
            isManage ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          <FileSpreadsheet size={15} /> Manage tests
          <span className={`text-xs ${isManage ? 'text-indigo-200' : 'text-gray-400'}`}>({customTests.length})</span>
        </button>
      </div>
      {isManage ? (
        <CustomPlacementTestsManager
          tests={customTests}
          onChanged={loadCustomTests}
          onOpenTest={(id) => { setTestId(id); setFilter('all'); setSelected(null); }}
        />
      ) : (
      <>
      {current.audioSlots.length > 0 && <ListeningAudioManager key={testId} testId={testId} testInfo={current} />}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-indigo-600" size={22} />
          <h2 className="text-lg font-semibold text-gray-800">Level Test Results — {current.label}</h2>
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
        <div className="text-center py-16 text-gray-400">No {current.label} test results yet.</div>
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

      </>
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