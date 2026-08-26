'use client';

// app/admin/components/membershipPlansPanel.jsx
//
// Phase 2 — اليوم 16-17 (تكملة). الـ backend كان جاهز بالكامل
// (GET/POST /api/membership-plans + GET/PATCH/DELETE /api/membership-plans/[id])
// لكن معندناش أي واجهة أدمن فعلية تنادي عليه — الأدمن مكانش يقدر يعمل/يعدّل
// خطة إلا عن طريق نداء الـ API يدويًا. اللوحة دي بتسد الفجوة دي: قايمة كل
// الخطط (فعّالة ومعطّلة، ?all=1) + نموذج إنشاء/تعديل + تحديد الكورسات
// المسموحة لكل خطة + حذف (مع رسالة واضحة لو الخطة لسه فيها مشتركين).

import { useState, useEffect } from 'react';
import { Layers, Loader, AlertCircle, Plus, Pencil, Trash2, X, Check, BookOpen } from 'lucide-react';

const EMPTY_FORM = {
  id: null,
  name: '',
  slug: '',
  description: '',
  prices: { EGP: 0, USD: 0, EUR: 0 },
  billingCycle: 'monthly',
  features: '', // نص، سطر لكل feature — بيتحول لـ array وقت الحفظ
  allowedCourses: [],
  isActive: true,
  order: 0,
};

function formatPrice(plan) {
  const prices = plan.prices || { EGP: 0, USD: 0, EUR: 0 };
  if (plan.billingCycle === 'free' || (!prices.EGP && !prices.USD && !prices.EUR)) return 'Free';
  const cycle = plan.billingCycle === 'yearly' ? '/yr' : '/mo';
  return `EGP ${prices.EGP || 0} · USD ${prices.USD || 0} · EUR ${prices.EUR || 0}${cycle}`;
}

function MembershipPlansAdmin() {
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const isEditing = Boolean(form.id);

  const loadPlans = () => {
    setLoading(true);
    setError('');
    fetch('/api/membership-plans?all=1')
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching membership plans');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPlans();
    // قايمة الكورسات لاختيار allowedCourses — أدمن بيشوف كل الكورسات
    fetch('/api/courses?limit=50')
      .then((r) => (r.ok ? r.json() : { courses: [] }))
      .then((data) => setCourses(Array.isArray(data?.courses) ? data.courses : []))
      .catch(() => setCourses([]));
  }, []);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setActionError('');
    setShowForm(true);
  };

  const openEditForm = (plan) => {
    setForm({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      prices: {
        EGP: plan.prices?.EGP ?? 0,
        USD: plan.prices?.USD ?? 0,
        EUR: plan.prices?.EUR ?? 0,
      },
      billingCycle: plan.billingCycle,
      features: (plan.features || []).join('\n'),
      allowedCourses: plan.allowedCourses || [],
      isActive: plan.isActive,
      order: plan.order,
    });
    setActionError('');
    setShowForm(true);
  };

  const updatePlanPrice = (currency, value) => {
    setForm((f) => ({ ...f, prices: { ...f.prices, [currency]: value } }));
  };

  const toggleCourse = (courseId) => {
    setForm((f) => ({
      ...f,
      allowedCourses: f.allowedCourses.includes(courseId)
        ? f.allowedCourses.filter((c) => c !== courseId)
        : [...f.allowedCourses, courseId],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setActionError('Plan name is required.');
      return;
    }
    setSaving(true);
    setActionError('');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description,
      prices:
        form.billingCycle === 'free'
          ? { EGP: 0, USD: 0, EUR: 0 }
          : {
              EGP: Number(form.prices.EGP) || 0,
              USD: Number(form.prices.USD) || 0,
              EUR: Number(form.prices.EUR) || 0,
            },
      billingCycle: form.billingCycle,
      features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
      allowedCourses: form.allowedCourses,
      isActive: form.isActive,
      order: Number(form.order) || 0,
    };

    try {
      const url = isEditing ? `/api/membership-plans/${form.id}` : '/api/membership-plans';
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const messages = {
          slug_taken: 'This slug is already used by another plan.',
          invalid_course_in_list: 'One of the selected courses is invalid.',
          missing_name: 'Plan name is required.',
          invalid_slug: 'Invalid slug.',
        };
        setActionError(messages[data.error] || 'Failed to save the plan, please try again.');
        return;
      }
      setShowForm(false);
      loadPlans();
    } catch {
      setActionError('Failed to save the plan, please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    setConfirmDelete(null);
    setActionError('');
    try {
      const res = await fetch(`/api/membership-plans/${plan.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'plan_in_use') {
          setActionError(
            `Can't delete "${plan.name}" — ${data.subscribersCount} user(s) are currently subscribed to it. Move them to another plan first, or deactivate this plan instead.`
          );
        } else {
          setActionError('Failed to delete the plan, please try again.');
        }
        return;
      }
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } catch {
      setActionError('Failed to delete the plan, please try again.');
    }
  };

  const quickToggleActive = async (plan) => {
    setActionError('');
    try {
      const res = await fetch(`/api/membership-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (!res.ok) throw new Error('failed');
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, isActive: !p.isActive } : p)));
    } catch {
      setActionError('Failed to update plan status.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Loader className="animate-spin mx-auto" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-blue-900">
            <Layers size={28} /> Membership Plans
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{plans.length}</span>
          </h2>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={18} /> New Plan
          </button>
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Slug</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Courses</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{plan.name}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{plan.slug}</td>
                    <td className="py-3 px-4 text-gray-700">{formatPrice(plan)}</td>
                    <td className="py-3 px-4 text-gray-600 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-gray-400" />
                      {plan.allowedCourses.length === 0 ? 'All courses' : `${plan.allowedCourses.length} course(s)`}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => quickToggleActive(plan)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border-2 transition-colors ${
                          plan.isActive
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                        title="Click to toggle"
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditForm(plan)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(plan)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plans.length === 0 && (
              <div className="text-center py-12 text-gray-400">No membership plans yet — create the first one.</div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800">{isEditing ? 'Edit Plan' : 'New Plan'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {actionError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Pro"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Slug (optional — auto-generated from name)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="pro"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Billing Cycle</label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                >
                  <option value="free">Free</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* 🆕 سعر منفصل يدوي لكل عملة (EGP/USD/EUR) — نفس منطق أسعار
                  الكورسات، العملة بتتحدد حسب لغة الموقع وقت الاشتراك (شوف
                  app/lib/currency.js). بيتم تجاهلها بالكامل لو billingCycle
                  = free. */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Price (per currency)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">EGP</label>
                    <input
                      type="number"
                      min="0"
                      value={form.prices.EGP}
                      disabled={form.billingCycle === 'free'}
                      onChange={(e) => updatePlanPrice('EGP', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">USD</label>
                    <input
                      type="number"
                      min="0"
                      value={form.prices.USD}
                      disabled={form.billingCycle === 'free'}
                      onChange={(e) => updatePlanPrice('USD', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">EUR</label>
                    <input
                      type="number"
                      min="0"
                      value={form.prices.EUR}
                      disabled={form.billingCycle === 'free'}
                      onChange={(e) => updatePlanPrice('EUR', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Features (one per line)</label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
                  rows={3}
                  placeholder={'Unlimited access\nCertificate included'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">
                  Allowed Courses — leave empty to unlock <span className="font-bold">all</span> courses (e.g. Pro plan)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                  {courses.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-xs">No courses found</div>
                  )}
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.allowedCourses.includes(c.id)}
                        onChange={() => toggleCourse(c.id)}
                        className="rounded"
                      />
                      <span className="text-gray-700">{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  Active (visible on the public /membership page)
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                    className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader className="animate-spin" size={16} /> : <Check size={16} />}
                  {isEditing ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete this plan?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-semibold">{confirmDelete.name}</span> will be permanently deleted. This is blocked
              if any user is currently subscribed to it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
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

export default MembershipPlansAdmin;