'use client';

import { useState, useEffect } from 'react';
import {
  Users, Loader, AlertCircle, Trash2, Lock, ShieldCheck, FileText,
} from 'lucide-react';

import { useSession } from 'next-auth/react';

// 🔒 SECURITY: اتشال أي إيميل أدمن ثابت من هنا. الاعتماد بقى على role بس،
// نفس المصدر الوحيد اللي بيتفحص في الـ API (route.js) — عشان الواجهة والباك إند
// يبقوا متطابقين، ومفيش أي fallback بإيميل مكتوب صريح يتسرب في الـ JS bundle
// اللي بيتبعت للمتصفح (أي حد يقدر يفتحه من devtools ويشوفه).

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
      const res = await fetch('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
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
      const res = await fetch('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-setup', code }),
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
      const res = await fetch('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', code: disableCode }),
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

export default UsersAdmin;