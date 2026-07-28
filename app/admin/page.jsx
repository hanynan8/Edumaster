'use client';

import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import {
  Database, Settings, Home, Navigation, Info, BookOpen,
  Globe, Star, FileText, Phone, Map, Users, MessageSquare,
  Loader, AlertCircle, Inbox, Trash2, Lock, Eye, EyeOff, ShieldCheck,
  Mail, MessageCircle
} from 'lucide-react';

import { useSession } from 'next-auth/react';

import NavbarAdmin from './components/navbar';
import FooterAdmin from './components/footer';
import HomeAdmin from './components/home';
import AboutAdmin from './components/about';
import ServicesAdmin from './components/services';
import CoursesAdmin from './components/courses';
import CountriesAdmin from './components/countries';
import SuccessStoriesAdmin from './components/success-stories';
import BlogAdmin from './components/blogs';
import ContactAdmin from './components/contact';

const ADMIN_EMAIL = 'admin@gmail.com';

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

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      textAlign: 'center',
      padding: '40px 20px',
    }}>
      <h1 style={{
        fontSize: '140px',
        fontWeight: '900',
        color: '#e5e7eb',
        lineHeight: 1,
        margin: 0,
      }}>404</h1>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#4b5563', marginTop: '12px' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '14px' }}>
        You don't have permission to view this page.
      </p>
    </div>
  );
}

function PlaceholderAdmin({ title }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-12 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <Settings size={36} className="text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-700 mb-2">{title}</h2>
      <p className="text-gray-400">This section is under development</p>
    </div>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/data?collection=auth')
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Error fetching users'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
      <Loader className="animate-spin mx-auto" size={48} />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-900">
          <Users size={28} /> Registered Users
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{users.length}</span>
        </h2>
      </div>
      {error && (
        <div className="mx-6 mt-4 px-6 py-4 rounded-xl bg-red-500 text-white flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-500">#</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Password</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{user.name}</td>
                  <td className="py-3 px-4 text-blue-600">{user.email}</td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-xs">{user.password}</td>
                  <td className="py-3 px-4 font-mono text-gray-400 text-xs">{user._id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400">No users registered yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormSubmissionsAdmin() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

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

              <a
                href={selected.email ? buildGmailComposeUrl({ to: selected.email, name: selected.name, originalMessage: selected.message }) : undefined}
                className={`mt-2 flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors shadow ${
                  selected.email
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 pointer-events-none'
                }`}
              >
                <MessageCircle size={18} /> Reply via Email
              </a>
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
                    <button
                      onClick={() => setSelected(sub)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      View
                    </button>
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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('home');
  const [exporting, setExporting] = useState(false);

  // لسه بيجيب بيانات السيشن من NextAuth
  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
      }}>
        <Loader className="animate-spin text-blue-500" size={44} />
      </div>
    );
  }

  // مش logged in أو الإيميل مش admin@gmail.com → 404
  if (status === 'unauthenticated' || session?.user?.email !== ADMIN_EMAIL) {
    return <NotFound />;
  }

  // ✅ مسجّل بـ admin@gmail.com → فتح اللوحة مباشرة بدون باسورد
  const tabs = [
    { id: 'home',             name: 'Home',             icon: Home,          component: HomeAdmin },
    { id: 'navbar',           name: 'Navbar',           icon: Navigation,    component: NavbarAdmin },
    { id: 'footer',           name: 'Footer',           icon: Info,          component: FooterAdmin },
    { id: 'about',            name: 'About',            icon: Users,         component: AboutAdmin },
    { id: 'services',         name: 'Services',         icon: Star,          component: ServicesAdmin },
    { id: 'courses',          name: 'Courses',          icon: BookOpen,      component: CoursesAdmin },
    { id: 'countries',        name: 'Countries',        icon: Globe,         component: CountriesAdmin },
    { id: 'success_stories',  name: 'Success Stories',  icon: MessageSquare, component: SuccessStoriesAdmin },
    { id: 'blog',             name: 'Blog',             icon: FileText,      component: BlogAdmin },
    { id: 'contact',          name: 'Contact',          icon: Phone,         component: ContactAdmin },
    { id: 'users',            name: 'Users',            icon: Users,         component: UsersAdmin },
    { id: 'form_submissions', name: 'Form Submissions', icon: Inbox,         component: FormSubmissionsAdmin },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || HomeAdmin;

  // تحميل كل بيانات الموقع كـ JSON من /api/data
  const handleExportAllData = async () => {
    setExporting(true);

    const collections = [
      'home', 'navbar', 'footer', 'about', 'services', 'courses',
      'countries', 'success_stories', 'blog', 'contact', 'auth', 'form'
    ];

    const result = {};

    await Promise.all(collections.map(async (col) => {
      try {
        const res = await fetch(`/api/data?collection=${col}`);
        const json = await res.json();
        result[col] = json;
      } catch (err) {
        result[col] = { error: 'Failed to fetch' };
      }
    }));

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      <div className="shadow-lg bg-gradient-to-r from-blue-700 to-purple-700 border-b-4 border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5 flex-wrap gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Database size={30} className="animate-pulse" />
              Edumaster Admin Panel
            </h1>
            <button
              onClick={handleExportAllData}
              disabled={exporting}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl transition-colors border border-white/30"
            >
              {exporting ? <Loader size={18} className="animate-spin" /> : <Database size={18} />}
              {exporting ? 'Exporting...' : 'Export All Site Data (JSON)'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[100rem] mx-auto px-2 sm:px-3 lg:px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-5 sticky top-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-5 pb-3 border-b flex items-center gap-2 text-gray-700">
                <Settings size={20} className="text-blue-500" />
                Sections
              </h2>
              <div className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left font-medium ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md scale-[1.02]'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}