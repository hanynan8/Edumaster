'use client';

import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import {
  Users, Loader, AlertCircle, Trash2, Lock, ShieldCheck, FileText, CreditCard, X, Check, Clock, ClipboardList, Download,
} from 'lucide-react';

import { useSession } from 'next-auth/react';

// 🔒 SECURITY: اتشال أي إيميل أدمن ثابت من هنا. الاعتماد بقى على role بس،
// نفس المصدر الوحيد اللي بيتفحص في الـ API (route.js) — عشان الواجهة والباك إند
// يبقوا متطابقين، ومفيش أي fallback بإيميل مكتوب صريح يتسرب في الـ JS bundle
// اللي بيتبعت للمتصفح (أي حد يقدر يفتحه من devtools ويشوفه).

// Phase 2 — اليوم 23-24 (تكملة). PATCH /api/admin/users/[id]/membership كان
// جاهز بالكامل على السيرفر (ترقية/تخفيض/إلغاء/تجديد + expiresAt + audit log)
// لكن مفيش أي زرار في اللوحة بينادي عليه — الأدمن مكانش يقدر يعمل ولا حاجة
// من الاشتراكات إلا يدويًا عن طريق API call مباشر. عمود "Membership" + مودال
// "Manage" تحت بيسدوا الفجوة دي.

function membershipBadgeColor(status) {
  if (status === 'active') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'expired') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'cancelled') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-gray-50 text-gray-500 border-gray-200';
}

// 🆕 ONBOARDING — خرائط بسيطة لتحويل المفاتيح المخزنة (goal/educationLevel)
// لنص مقروء في لوحة الأدمن (اللوحة بالإنجليزي زي باقي usersPanel).
const GOAL_LABELS = {
  start_career: 'Start my career',
  change_career: 'Change my career',
  grow_current_role: 'Grow in my current role',
  explore_topics: 'Explore topics outside of work',
};

const EDUCATION_LABELS = {
  less_than_high_school: 'Less than high school diploma',
  high_school: 'High school diploma',
  some_college: 'Some college, no degree',
  associate: 'Associate Degree',
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  professional: 'Professional school degree',
  doctorate: 'Doctorate degree',
};

function UsersAdmin() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // user targeted for delete confirmation
  const [manageMembershipUser, setManageMembershipUser] = useState(null); // user targeted for membership management
  const [viewOnboardingUser, setViewOnboardingUser] = useState(null); // 🆕 user targeted for onboarding details view

  const myId = session?.user?.id;

  // 🆕 Export to Excel — نفس نمط exportToExcel في overviewPanel.jsx/formsPanel.jsx
  // (ExcelJS في المتصفح، تنزيل مباشر بـ Blob، من غير أي route سيرفر إضافي).
  // roleFilter: null = كل المستخدمين، "teacher" = المدرسين بس، "student" = الطلاب بس.
  const [exportingRole, setExportingRole] = useState(null);

  const exportUsersToExcel = async (roleFilter) => {
    const rows = roleFilter ? users.filter((u) => u.role === roleFilter) : users;
    if (rows.length === 0) return;

    setExportingRole(roleFilter || 'all');
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Edumaster Admin';
      workbook.created = new Date();

      const sheetName = roleFilter === 'teacher' ? 'Teachers' : roleFilter === 'student' ? 'Students' : 'All Users';
      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'Name', key: 'name', width: 26 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Role', key: 'role', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Membership Plan', key: 'planName', width: 20 },
        { header: 'Membership Status', key: 'membershipStatus', width: 18 },
        { header: 'Joined', key: 'createdAt', width: 18 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      headerRow.height = 26;

      rows.forEach((u, idx) => {
        const row = sheet.addRow({
          idx: idx + 1,
          name: u.name || '—',
          email: u.email || '—',
          phone: u.phone || '—',
          role: u.role || 'student',
          status: u.status || 'active',
          planName: u.membership?.planName || 'None',
          membershipStatus: u.membership?.status || 'inactive',
          createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—',
        });
        const isEven = idx % 2 === 0;
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFEFF6FF' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileTag = roleFilter === 'teacher' ? 'teachers' : roleFilter === 'student' ? 'students' : 'all-users';
      a.download = `edumaster-${fileTag}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export failed:', err);
      setActionError('Failed to export to Excel, please try again.');
    } finally {
      setExportingRole(null);
    }
  };

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

  // خطط الاشتراك — عشان مودال إدارة العضوية يقدر يعرضها في dropdown
  useEffect(() => {
    fetch('/api/membership-plans?all=1')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]));
  }, []);

  // ✅ Phase 2 — اليوم 23-24: تحديث عضوية مستخدم (ترقية/تخفيض/إلغاء/تجديد)
  const handleMembershipSave = async (userId, payload) => {
    setActionError('');
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/membership`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const messages = {
          plan_not_found: 'Selected plan was not found.',
          invalid_status: 'Invalid membership status.',
          invalid_plan: 'Invalid plan selected.',
          invalid_extend_days: 'Extend days must be a positive number.',
          active_status_requires_plan: "Can't set status to active without a plan.",
          nothing_to_update: 'Nothing to update.',
        };
        setActionError(messages[data.error] || 'Failed to update membership, please try again.');
        return false;
      }
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, membership: { ...u.membership, ...data.membership } } : u)));
      setManageMembershipUser(null);
      return true;
    } catch {
      setActionError('Failed to update membership, please try again.');
      return false;
    } finally {
      setSavingId(null);
    }
  };

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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold flex items-center gap-3 text-blue-900">
              <Users size={28} /> Registered Users
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{users.length}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportUsersToExcel(null)}
                disabled={exportingRole !== null || users.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
                title="Export all users to Excel"
              >
                {exportingRole === 'all' ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                Export All
              </button>
              <button
                onClick={() => exportUsersToExcel('teacher')}
                disabled={exportingRole !== null || users.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 border-2 border-blue-200 text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
                title="Export teachers only to Excel"
              >
                {exportingRole === 'teacher' ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                Export Teachers
              </button>
              <button
                onClick={() => exportUsersToExcel('student')}
                disabled={exportingRole !== null || users.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 border-2 border-blue-200 text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
                title="Export students only to Excel"
              >
                {exportingRole === 'student' ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                Export Students
              </button>
            </div>
          </div>
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Membership</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Onboarding</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      <div className="flex items-center gap-2.5">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar}
                            alt={user.name || ""}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-black/5 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                        )}
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-blue-600">{user.email}</td>
                    <td className="py-3 px-4 text-gray-600">{user.phone || '—'}</td>
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
                        onClick={() => { setActionError(''); setManageMembershipUser(user); }}
                        disabled={savingId === user.id}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border-2 disabled:opacity-50 transition-colors hover:brightness-95 ${membershipBadgeColor(user.membership?.status)}`}
                        title="Manage membership"
                      >
                        {user.membership?.planName ? user.membership.planName : 'None'}
                        {user.membership?.status && user.membership.status !== 'inactive' ? ` · ${user.membership.status}` : ''}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setViewOnboardingUser(user)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border-2 transition-colors hover:brightness-95 ${
                          user.onboarding?.completed
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                        title="View onboarding details"
                      >
                        {user.onboarding?.completed ? 'Completed' : 'Not done'}
                      </button>
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
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete this user?</h3>
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

      {manageMembershipUser && (
        <MembershipManageModal
          user={manageMembershipUser}
          plans={plans}
          actionError={actionError}
          saving={savingId === manageMembershipUser.id}
          onClose={() => setManageMembershipUser(null)}
          onSave={(payload) => handleMembershipSave(manageMembershipUser.id, payload)}
        />
      )}

      {viewOnboardingUser && (
        <OnboardingDetailsModal
          user={viewOnboardingUser}
          onClose={() => setViewOnboardingUser(null)}
        />
      )}
    </div>
  );
}

// 🆕 ONBOARDING — مودال بسيط (عرض بس، من غير تعديل) بيورّي إجابات المستخدم
// الأربعة (الهدف، الدور الحالي، المهارات، المؤهل الدراسي) + وقت الإنهاء.
function OnboardingDetailsModal({ user, onClose }) {
  const o = user.onboarding || {};
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b-2 border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-blue-600" />
            Onboarding — {user.name}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-lg text-xs font-semibold border-2 ${
                o.completed
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}
            >
              {o.completed ? 'Completed' : 'Not completed yet'}
            </span>
            {o.completedAt && (
              <span className="text-xs text-gray-400">on {new Date(o.completedAt).toLocaleString()}</span>
            )}
          </div>

          {!o.completed && !o.goal && !o.currentRole && o.skills.length === 0 && !o.educationLevel ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              This user hasn&apos;t gone through onboarding yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Goal</p>
                <p className="text-sm text-gray-800 font-medium">{GOAL_LABELS[o.goal] || o.goal || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Current role</p>
                <p className="text-sm text-gray-800 font-medium">{o.currentRole || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Skills to develop</p>
                {o.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {o.skills.map((s) => (
                      <span key={s} className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-800 font-medium">—</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Education level</p>
                <p className="text-sm text-gray-800 font-medium">
                  {EDUCATION_LABELS[o.educationLevel] || o.educationLevel || '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Phase 2 — اليوم 23-24: مودال إدارة اشتراك مستخدم واحد. بيدعم أربع عمليات:
//   - ترقية/تخفيض: تغيير الخطة (plan)
//   - إلغاء: status = "cancelled"
//   - تجديد يدوي: extendDays (بيمدد من تاريخ الانتهاء الحالي لو لسه ساري،
//     أو من دلوقتي لو خلص/مفيش — نفس منطق الـ API تمامًا)
//   - إزالة العضوية بالكامل: plan = null
function MembershipManageModal({ user, plans, actionError, saving, onClose, onSave }) {
  const currentPlanId = user.membership?.plan || '';
  const [planId, setPlanId] = useState(currentPlanId);
  const [status, setStatus] = useState(user.membership?.status || 'inactive');
  const [expiresAt, setExpiresAt] = useState(
    user.membership?.expiresAt ? new Date(user.membership.expiresAt).toISOString().slice(0, 10) : ''
  );

  const expiresAtDisplay = user.membership?.expiresAt ? new Date(user.membership.expiresAt).toLocaleDateString() : '—';

  const handleExtend = (days) => onSave({ extendDays: days });

  const handleApply = (e) => {
    e.preventDefault();
    const payload = {};
    if (planId !== currentPlanId) payload.plan = planId || null;
    if (status !== (user.membership?.status || 'inactive')) payload.status = status;
    const currentExpiresAtStr = user.membership?.expiresAt
      ? new Date(user.membership.expiresAt).toISOString().slice(0, 10)
      : '';
    if (expiresAt !== currentExpiresAtStr) payload.expiresAt = expiresAt ? expiresAt : null;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    onSave(payload);
  };

  const handleRemove = () => onSave({ plan: null });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-600" /> Manage Membership
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          <span className="font-semibold">{user.name}</span> ({user.email})
        </p>

        {actionError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
            {actionError}
          </div>
        )}

        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
          <Clock size={14} /> Current expiry: {expiresAtDisplay}
        </div>

        {/* تجديد سريع — بيندي extendDays فورًا من غير ما تحتاج تحفظ فورم منفصل */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 mb-2">Quick renew</label>
          <div className="flex gap-2">
            {[30, 90, 365].map((days) => (
              <button
                key={days}
                type="button"
                disabled={saving}
                onClick={() => handleExtend(days)}
                className="flex-1 py-2 rounded-xl border-2 border-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-50 disabled:opacity-50 transition-colors"
              >
                +{days}d
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleApply} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Plan</label>
            <select
              value={planId || ''}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              <option value="">No plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
            >
              <option value="inactive">Inactive</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Expires at</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving || !currentPlanId}
              className="py-2.5 px-4 rounded-xl border-2 border-red-100 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              Remove membership
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={16} /> : <Check size={16} />}
              Apply Changes
            </button>
          </div>
        </form>
      </div>
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
        <h2 className="text-xl font-semibold flex items-center gap-3 text-blue-900">
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
        <h2 className="text-xl font-semibold flex items-center gap-3 text-blue-900">
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