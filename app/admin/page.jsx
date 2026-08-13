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

// 🔒 SECURITY: اتشال أي إيميل أدمن ثابت من هنا. الاعتماد بقى على role بس،
// نفس المصدر الوحيد اللي بيتفحص في الـ API (route.js) — عشان الواجهة والباك إند
// يبقوا متطابقين، ومفيش أي fallback بإيميل مكتوب صريح يتسرب في الـ JS bundle
// اللي بيتبعت للمتصفح (أي حد يقدر يفتحه من devtools ويشوفه).

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
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // user targeted for delete confirmation

  const myId = session?.user?.id;

  const loadUsers = () => {
    setLoading(true);
    fetch('/api/admin/users')
      .then(r => {
        if (!r.ok) throw new Error('forbidden');
        return r.json();
      })
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Error fetching users'); setLoading(false); });
  };

  useEffect(loadUsers, []);

  // ✅ تغيير role مستخدم — بيتسجل تلقائيًا في الـ Audit Log على السيرفر
  const handleRoleChange = async (user, newRole) => {
    if (newRole === user.role) return;
    setActionError('');
    setSavingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'last_admin_protection') {
          setActionError("Can't remove admin role — this is the last remaining admin.");
        } else {
          setActionError('Failed to update role, please try again.');
        }
        return;
      }
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, role: newRole } : u)));
    } catch {
      setActionError('Failed to update role, please try again.');
    } finally {
      setSavingId(null);
    }
  };

  // ✅ حذف مستخدم — بعد تأكيد من نافذة منتصف الشاشة (مش window.confirm)
  const handleDelete = async (userId) => {
    setConfirmDelete(null);
    setActionError('');
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'last_admin_protection') {
          setActionError("Can't delete the last remaining admin.");
        } else if (data.error === 'cannot_delete_self') {
          setActionError("You can't delete your own account from here.");
        } else {
          setActionError('Failed to delete user, please try again.');
        }
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch {
      setActionError('Failed to delete user, please try again.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
      <Loader className="animate-spin mx-auto" size={48} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
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
        {actionError && (
          <div className="mx-6 mt-4 px-6 py-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-800 flex items-center gap-3">
            <AlertCircle size={20} /> {actionError}
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">{user.name}</td>
                    <td className="py-3 px-4 text-blue-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border-2 outline-none disabled:opacity-50 ${
                          user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          user.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setConfirmDelete(user)}
                        disabled={savingId === user.id || user.id === myId}
                        title={user.id === myId ? "You can't delete your own account" : 'Delete user'}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
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

      <AdminMfaPanel />
      <AuditLogPanel />

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete this user?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-semibold">{confirmDelete.name}</span> ({confirmDelete.email}) will be permanently deleted. This action is logged and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 🔒 SECURITY: لوحة تفعيل MFA (TOTP) لحساب الأدمن الحالي المسجّل دخوله.
// خطوتين: 1) توليد secret + QR  2) تأكيد بكود من تطبيق authenticator.
function AdminMfaPanel() {
  const [status, setStatus] = useState('idle'); // idle | setup | confirm | enabled | backupCodes
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [busy, setBusy] = useState(false);

  const startSetup = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'mfa_already_enabled' ? 'MFA is already enabled on this account.' : 'Failed to start MFA setup.');
        return;
      }
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStatus('setup');
    } catch {
      setError('Failed to start MFA setup.');
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'invalid_code' ? 'Invalid code, please try again.' : 'Failed to verify code.');
        return;
      }
      setBackupCodes(data.backupCodes || []);
      setStatus('backupCodes');
    } catch {
      setError('Failed to verify code.');
    } finally {
      setBusy(false);
    }
  };

  const disableMfa = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'invalid_code' ? 'Invalid code.' : 'Failed to disable MFA.');
        return;
      }
      setStatus('idle');
      setDisableCode('');
    } catch {
      setError('Failed to disable MFA.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-xl font-bold flex items-center gap-3 text-blue-900">
          <Lock size={22} /> Two-Factor Authentication (MFA)
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Adds a required verification code from an authenticator app (Google Authenticator, Authy, ...) on top of your password.
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {status === 'idle' && (
          <div className="flex items-center gap-3">
            <button
              onClick={startSetup}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              Enable MFA
            </button>
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer font-medium">Already enabled and want to disable it?</summary>
              <form onSubmit={disableMfa} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="Current 6-digit code"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors">
                  Disable MFA
                </button>
              </form>
            </details>
          </div>
        )}

        {status === 'setup' && (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="MFA QR code" className="w-40 h-40 rounded-xl border-2 border-gray-100" />
            )}
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code with your authenticator app, or enter the secret manually:
              </p>
              <code className="block px-3 py-2 rounded-lg bg-gray-50 text-xs font-mono text-gray-700 break-all mb-4">{secret}</code>
              <form onSubmit={confirmSetup} className="flex items-center gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code to confirm"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                  autoFocus
                />
                <button type="submit" disabled={busy || !code} className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold text-sm hover:bg-blue-800 transition-colors disabled:opacity-50">
                  Confirm & Enable
                </button>
              </form>
            </div>
          </div>
        )}

        {status === 'backupCodes' && (
          <div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-semibold mb-4">
              <ShieldCheck size={18} /> MFA enabled successfully.
            </div>
            <p className="text-sm text-gray-600 mb-3 font-medium">
              Save these one-time backup codes somewhere safe — each can be used once if you lose access to your authenticator app. They won't be shown again.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {backupCodes.map((c) => (
                <code key={c} className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-mono text-center text-gray-700">{c}</code>
              ))}
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 🔒 SECURITY: عارض بسيط لآخر إجراءات الأدمن الموثّقة (تغيير role، حذف
// مستخدم، تفعيل/تعطيل MFA...).
function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/audit-logs?limit=100')
      .then(r => {
        if (!r.ok) throw new Error('forbidden');
        return r.json();
      })
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Error fetching audit logs'); setLoading(false); });
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-xl font-bold flex items-center gap-3 text-blue-900">
          <FileText size={22} /> Audit Log
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{logs.length}</span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">Every sensitive admin action (role changes, deletions, MFA changes) is recorded here — who did what, and when.</p>
      </div>
      <div className="p-6">
        {loading ? (
          <Loader className="animate-spin mx-auto" size={32} />
        ) : error ? (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No actions logged yet</div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">When</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Action</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">By</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Target</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Details</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono text-blue-700">{log.action}</td>
                    <td className="py-2 px-3 text-gray-700">{log.actorEmail || log.actorName || '—'}</td>
                    <td className="py-2 px-3 text-gray-700">{log.targetEmail || log.targetId || '—'}</td>
                    <td className="py-2 px-3 text-gray-500 font-mono max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-2 px-3 text-gray-400">{log.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

  // 🔒 SECURITY: مصدر واحد بس للتحقق من الأدمن — role. اتشال إيميل الفولباك
  // اللي كان بيتعارض مع الحماية بتاعة الـ API، ومهم توضيح إن ده check واجهة بس
  // (UX gate) مش حماية حقيقية — الحماية الفعلية موجودة سيرفر-سايد في كل
  // /api/data و /api/admin/* لأن أي حد يقدر يعدل الـ client code أو يستنى.
  const isAdmin = session?.user?.role === 'admin';
  if (status === 'unauthenticated' || !isAdmin) {
    return <NotFound />;
  }

  // ✅ مسجّل بحساب role = admin → فتح اللوحة مباشرة
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

    // ⚠️ 'auth' متشالة من هنا عن قصد — كولكشن المستخدمين بقى محمي ومش بيتصدّر
    // مع باقي بيانات الموقع. راجع تبويب Users لو محتاج بيانات المستخدمين.
    const collections = [
      'home', 'navbar', 'footer', 'about', 'services', 'courses',
      'countries', 'success_stories', 'blog', 'contact', 'form'
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