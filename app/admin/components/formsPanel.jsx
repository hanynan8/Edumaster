'use client';

import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import {
  Loader, AlertCircle, Inbox, Trash2, Mail, MessageCircle, FileText,
} from 'lucide-react';

// الإيميل اللي هيبعت منه الرد (الحساب اللي هيفتح جيميل بيه)
const SENDER_EMAIL = 'info@edumaster365.com';

// بناء رابط mailto: عشان يرد على صاحب الرسالة مباشرة
// mailto مش تابع لجيميل، هيفتح برنامج الإيميل الافتراضي عند الأدمن (Outlook مثلاً)
function buildGmailComposeUrl({ to, name, originalMessage }) {
  const subject = `Reply to your inquiry - Edumaster`;
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const quoted = originalMessage
    ? `\n\n----- Your original message -----\n${originalMessage}\n`
    : '';
  const body = `${greeting}\n\nThank you for contacting Edumaster.\n${quoted}`;

  const params = new URLSearchParams({ subject, body });

  return `mailto:${to || ''}?${params.toString()}`;
}

// ✅ استخراج تاريخ الإنشاء من الـ MongoDB ObjectId نفسه (أول 4 bytes بتشيل timestamp)
// بيستخدم كـ fallback لو الـ document القديم معندوش حقل createdAt محفوظ فعليًا
function getDateFromObjectId(id) {
  if (!id || typeof id !== 'string' || id.length < 8) return null;
  const hex = id.substring(0, 8);
  if (!/^[0-9a-fA-F]{8}$/.test(hex)) return null;
  const timestamp = parseInt(hex, 16) * 1000;
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
}

// تنسيق التاريخ لعرضه في الجدول ونافذة التفاصيل
// لو createdAt مش موجود أو مش صالح، بيرجع يستخرج التاريخ من الـ _id (fallbackId)
function formatDate(value, fallbackId) {
  let d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) {
    d = fallbackId ? getDateFromObjectId(fallbackId) : null;
  }
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ✅ يرجع أفضل تاريخ متاح كـ timestamp رقمي (للترتيب) — createdAt لو موجود، وإلا من الـ _id
function getEffectiveTimestamp(doc) {
  if (doc?.createdAt) {
    const d = new Date(doc.createdAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const fromId = getDateFromObjectId(doc?._id);
  return fromId ? fromId.getTime() : 0;
}

function FormSubmissionsAdmin() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // ✅ عشان نعرف مين اللي بيتمسح دلوقتي
  const [confirmTarget, setConfirmTarget] = useState(null); // ✅ الرسالة المطلوب تأكيد حذفها (custom modal بدل window.confirm)

  useEffect(() => {
    fetch('/api/data?collection=form')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        // ✅ الأقدم الأول (الأحدث في الآخر) — بيعتمد على createdAt لو موجود، وإلا بيستخرج التاريخ من الـ _id
        const sorted = [...list].sort((a, b) => getEffectiveTimestamp(a) - getEffectiveTimestamp(b));
        setSubmissions(sorted);
        setLoading(false);
      })
      .catch(() => { setError('Error fetching submissions'); setLoading(false); });
  }, []);

  // ✅ بيفتح نافذة تأكيد الحذف في نص الشاشة بدل window.confirm
  const requestDelete = (sub) => {
    if (!sub?._id) return;
    setConfirmTarget(sub);
  };

  // ✅ مسح الرسالة نهائيًا من الداتابيز بعد التأكيد
  const handleDelete = async (id) => {
    if (!id) return;
    setConfirmTarget(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/data?collection=form&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');

      // شيلها من الـ state عشان تختفي من الجدول فورًا من غير ما نعمل refetch
      setSubmissions(prev => prev.filter(s => s._id !== id));
      // لو النافذة المفتوحة هي نفسها اللي اتمسحت، اقفلها
      setSelected(prev => (prev && prev._id === id ? null : prev));
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Something went wrong while deleting the message, please try again');
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ تصدير إكسيل بنفس هوية الموقع (تدرّج أزرق/بنفسجي للهيدر + تلوين متبادل للصفوف)
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Edumaster Admin';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Submissions', {
        views: [{ state: 'frozen', ySplit: 1 }], // تجميد صف العناوين
      });

      // حدود عرض لكل عمود (min/max) — الأرقام بوحدة "حرف تقريبي"
const COLUMN_LIMITS = {
  index:   { min: 5,  max: 6   },
  name:    { min: 14, max: 32  },
  email:   { min: 18, max: 38  },
  phone:   { min: 12, max: 20  },
  service: { min: 12, max: 24  },
  message: { min: 40, max: 100 }, // ← زوّد الـ max عشان الرسائل الطويلة
  date:    { min: 16, max: 22  },
  id:      { min: 22, max: 26  },
};

      // بيحسب أطول قيمة في كل عمود (بما فيها العنوان نفسه) عشان العمود ياخد عرضه الطبيعي تلقائيًا
      const rowsData = submissions.map((sub, idx) => ({
        index: String(idx + 1),
        name: sub.name || '—',
        email: sub.email || '—',
        phone: sub.phone || '—',
        service: sub.service || '—',
        message: sub.message || '—',
        date: formatDate(sub.createdAt, sub._id),
        id: sub._id || '',
      }));

      const computeWidth = (key, header) => {
        const { min, max } = COLUMN_LIMITS[key];
        const longest = rowsData.reduce((acc, r) => {
          const cellLen = String(r[key] ?? '').length;
          return Math.max(acc, cellLen);
        }, header.length);
        return Math.min(Math.max(longest + 2, min), max);
      };

      // نفس الأعمدة اللي في الجدول بالظبط — لكن العرض دلوقتي بيتحسب من طول المحتوى الفعلي
      const columnDefs = [
        { header: '#', key: 'index' },
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Service', key: 'service' },
        { header: 'Message', key: 'message' },
        { header: 'Date', key: 'date' },
        { header: 'ID', key: 'id' },
      ];

      sheet.columns = columnDefs.map(col => ({
        ...col,
        width: computeWidth(col.key, col.header),
      }));

      // ستايل صف العناوين — تدرّج أزرق/بنفسجي زي هيدر الموقع (from-blue-700 to-purple-700)
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4338CA' },
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });
      headerRow.height = 26;

      // الصفوف
      submissions.forEach((sub, idx) => {
        const row = sheet.addRow({
          index: idx + 1,
          name: sub.name || '—',
          email: sub.email || '—',
          phone: sub.phone || '—',
          service: sub.service || '—',
          message: sub.message || '—',
          date: formatDate(sub.createdAt, sub._id),
          id: sub._id || '',
        });

        // تلوين متبادل للصفوف (زي hover:bg-blue-50 في الجدول)
        const isEven = idx % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFEFF6FF' },
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
          cell.alignment = {
            vertical: 'top',
            wrapText: colNumber === 6,
            horizontal: colNumber === 1 ? 'center' : 'left',
          };
          // الإيميل بلون أزرق زي اللينك في الموقع
          if (colNumber === 3) {
            cell.font = { color: { argb: 'FF2563EB' } };
          }
          // الـ Service كـ نص لوني بسيط زي الـ badge
          if (colNumber === 5 && sub.service) {
            cell.font = { color: { argb: 'FF1D4ED8' }, bold: true };
          }
        });
        // ارتفاع ديناميكي حسب طول الرسالة (كل ~50 حرف ≈ سطر إضافي)
const msgLen = (sub.message || '').length;
row.height = Math.min(Math.max(24, Math.ceil(msgLen / 45) * 15), 120);
      });

      // Auto filter على العناوين
      sheet.autoFilter = {
        from: 'A1',
        to: { row: 1, column: sheet.columns.length },
      };

      // تصدير الملف
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-submissions-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      <Loader className="animate-spin mx-auto text-blue-500" size={48} />
      <p className="mt-4 text-gray-400 font-medium">Loading submissions...</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
      <div className="p-4 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-900">
            <Inbox size={28} /> Form Submissions
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{submissions.length}</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">Messages sent via the contact form</p>
        </div>
        <button
          onClick={exportToExcel}
          disabled={submissions.length === 0 || exporting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-colors shadow"
        >
          {exporting ? <Loader size={18} className="animate-spin" /> : <FileText size={18} />}
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>
      {error && (
        <div className="mx-4 mt-4 px-4 py-4 rounded-xl bg-red-500 text-white flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}
      {confirmTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-7 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete this message?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete the message from{' '}
              <span className="font-semibold text-gray-700">{confirmTarget.name || 'this contact'}</span>.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 font-semibold px-4 py-2.5 rounded-xl transition-colors bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmTarget._id)}
                className="flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors shadow bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Submission Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Name</span>
                <p className="mt-1 text-[11px] font-medium text-gray-400">{formatDate(selected.createdAt, selected._id)}</p>
                <p className="mt-0.5 text-gray-800 text-sm">{selected.name || '—'}</p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Email</span>
                <div className="mt-1">
                  <a
                    href={selected.email ? buildGmailComposeUrl({ to: selected.email, name: selected.name, originalMessage: selected.message }) : undefined}
                    className={`inline-flex items-center gap-2 text-sm font-medium ${
                      selected.email ? 'text-blue-600 hover:text-blue-800 hover:underline' : 'text-gray-400 pointer-events-none'
                    }`}
                  >
                    <Mail size={15} /> {selected.email || '—'}
                  </a>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Phone</span>
                <p className="mt-1 text-gray-800 text-sm">{selected.phone || '—'}</p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Service</span>
                <p className="mt-1 text-gray-800 text-sm">{selected.service || '—'}</p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Message</span>
                <p className="mt-1 text-gray-800 text-sm whitespace-pre-wrap break-words bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100">
                  {selected.message || '—'}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">ID</span>
                <p className="mt-1 text-gray-500 font-mono text-xs">{selected._id}</p>
              </div>

              <div className="flex gap-3 mt-2">
                <a
                  href={selected.email ? buildGmailComposeUrl({ to: selected.email, name: selected.name, originalMessage: selected.message }) : undefined}
                  className={`flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors shadow ${
                    selected.email
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 pointer-events-none'
                  }`}
                >
                  <MessageCircle size={18} /> Reply via Email
                </a>

                <button
                  onClick={() => requestDelete(selected)}
                  disabled={deletingId === selected._id}
                  className="flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors shadow bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white"
                >
                  {deletingId === selected._id ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  {deletingId === selected._id ? 'Deleting...' : 'Delete Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="p-4">
        {submissions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Inbox size={48} className="mx-auto mb-3 opacity-30" />
            <p>No submissions yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-3 px-2 font-semibold text-gray-500">#</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Name</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Email</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Phone</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Service</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 w-full">Message</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500 whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => (
                <tr key={sub._id} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors align-top">
                  <td className="py-3 px-2 text-gray-400">{idx + 1}</td>
                  <td className="py-3 px-2 font-medium text-gray-800 whitespace-nowrap">
                    <span className="block text-[10px] font-normal text-gray-400 mb-0.5">
                      {formatDate(sub.createdAt, sub._id)}
                    </span>
                    {sub.name || '—'}
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <a
                      href={sub.email ? buildGmailComposeUrl({ to: sub.email, name: sub.name, originalMessage: sub.message }) : undefined}
                      title="ابعت رد"
                      className={`inline-flex items-center gap-1.5 font-medium text-left ${
                        sub.email
                          ? 'text-blue-600 hover:text-blue-800 hover:underline'
                          : 'text-gray-400 pointer-events-none'
                      }`}
                    >
                      <Mail size={14} className="shrink-0" />
                      <span>{sub.email || '—'}</span>
                    </a>
                  </td>
                  <td className="py-3 px-2 text-gray-600 whitespace-nowrap">{sub.phone || '—'}</td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    {sub.service
                      ? <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{sub.service}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-2 text-gray-600">
                    <p
                      className="whitespace-pre-wrap break-words leading-relaxed"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {sub.message || '—'}
                    </p>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(sub)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
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

export default FormSubmissionsAdmin;