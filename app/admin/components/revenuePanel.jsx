'use client';

// app/admin/components/revenuePanel.jsx
//
// Phase 3 — اليوم 31-32: "صفحة متابعة الإيرادات للأدمن". الـ backend كان
// جاهز بالكامل (GET /api/admin/revenue بيرجّع إجمالي الإيرادات، تقسيم حسب
// النوع، اتجاه آخر 6 شهور، عدد العمليات حسب الحالة، وأحدث 15 عملية ناجحة)
// لكن معندناش أي تاب في لوحة الأدمن بينادي عليه — اللوحة دي بتسد الفجوة دي،
// بنفس نمط باقي لوحات الأدمن (membershipPlansPanel/usersPanel): بطاقات
// إجمالي + جدول تقسيم النوع + مخطط أعمدة بسيط بـ CSS (من غير مكتبة رسوم
// بيانية إضافية، مفيش recharts متركب في المشروع) + جدول أحدث العمليات.

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Receipt, Clock, XCircle, RefreshCcw, Loader, AlertCircle } from 'lucide-react';

function formatMoney(minorUnits, currency = 'EGP') {
  return `${(Number(minorUnits || 0) / 100).toFixed(2)} ${currency}`;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_META = {
  succeeded: { label: 'Succeeded', color: 'text-green-700 bg-green-50 border-green-200', icon: TrendingUp },
  pending: { label: 'Pending', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: Clock },
  failed: { label: 'Failed', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  refunded: { label: 'Refunded', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: RefreshCcw },
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function RevenueAdmin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/revenue')
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching revenue data');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Loader className="animate-spin mx-auto" size={48} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-100 p-8">
        <div className="px-6 py-4 rounded-xl bg-red-500 text-white flex items-center gap-3">
          <AlertCircle size={20} /> {error || 'Failed to load revenue data'}
        </div>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ⚠️ الإجماليات في /api/admin/revenue بتجمع كل العملات مع بعض كرقم واحد —
  // معروض هنا بعملة أول دفعة ناجحة لقيناها (الغالب الأعم في المشروع عملة
  // واحدة بس). لو المشروع بدأ يستخدم أكتر من عملة فعليًا، الـ API محتاج
  // يتقسّم totals حسب currency كمان.
  const currency = data.recentPayments?.[0]?.currency || 'EGP';
  const maxMonthly = Math.max(1, ...data.monthly.map((m) => m.total));
  const courseRevenue = data.byType.find((t) => t.type === 'course');
  const membershipRevenue = data.byType.find((t) => t.type === 'membership');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-900">
            <DollarSign size={28} /> Revenue
          </h2>
          <button
            onClick={load}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatMoney(data.totalRevenue, currency)}
          accent="bg-green-50 text-green-600"
        />
        <StatCard
          icon={Receipt}
          label="Successful Payments"
          value={data.totalSucceededPayments}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Course Revenue"
          value={formatMoney(courseRevenue?.total, currency)}
          accent="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Membership Revenue"
          value={formatMoney(membershipRevenue?.total, currency)}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Monthly trend (simple CSS bar chart) */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-6">
        <h3 className="text-lg font-bold text-gray-700 mb-6">Last 6 Months</h3>
        {data.monthly.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No revenue recorded in the last 6 months</p>
        ) : (
          <div className="flex items-end justify-between gap-3 h-48">
            {data.monthly.map((m, i) => {
              const heightPct = Math.max(4, Math.round((m.total / maxMonthly) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                  <span className="text-[11px] font-semibold text-gray-500">{formatMoney(m.total, currency)}</span>
                  <div
                    className="w-full max-w-[52px] rounded-t-lg bg-gradient-to-t from-blue-600 to-purple-500 transition-all"
                    style={{ height: `${heightPct}%` }}
                    title={`${m.count} payment(s)`}
                  />
                  <span className="text-xs font-semibold text-gray-400">{MONTH_LABELS[m.month - 1]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-6">
        <h3 className="text-lg font-bold text-gray-700 mb-4">Payments by Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <div key={key} className={`rounded-xl border-2 p-4 flex items-center gap-3 ${meta.color}`}>
                <Icon size={20} />
                <div>
                  <p className="text-xs font-semibold opacity-80">{meta.label}</p>
                  <p className="text-lg font-bold">{data.statusCounts[key] || 0}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent successful payments */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
        <div className="p-6 border-b-2 border-gray-200">
          <h3 className="text-lg font-bold text-gray-700">Recent Payments</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Invoice</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{p.customerName || '—'}</p>
                      <p className="text-xs text-gray-400">{p.customerEmail}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{p.itemTitle || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{formatMoney(p.amount, p.currency)}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{p.invoiceNumber || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentPayments.length === 0 && (
              <div className="text-center py-12 text-gray-400">No successful payments yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RevenueAdmin;