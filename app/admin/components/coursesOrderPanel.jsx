'use client';

// app/admin/components/coursesOrderPanel.jsx
//
// 🆕 "Courses Order" — الأدمن بيحدد ترتيب ظهور كورسات الموقع من هنا.
// بيعرض كل الكورسات (أي حالة) وجنب كل كورس رقم الأوردر بتاعه. الأدمن بيغيّر
// الأرقام ويدوس Save، والترتيب ده بيبقى الافتراضي لكل الزوار في صفحة
// /courses والصفحة الرئيسية (الرقم الأصغر بيظهر الأول). لو كورسين ليهم
// نفس الرقم، الأحدث بيظهر الأول. الحفظ عن طريق PUT /api/courses/reorder.

import { useEffect, useMemo, useState } from 'react';
import {
  ListOrdered, Loader, AlertCircle, CheckCircle2, Search, Save, RefreshCw,
  ArrowUp, ArrowDown, Wand2,
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-600',
};

export default function CoursesOrderAdmin() {
  const [courses, setCourses] = useState([]);   // بالترتيب الحالي من السيرفر
  const [orders, setOrders] = useState({});     // { [id]: "3" } — القيم في الحقول
  const [original, setOriginal] = useState({}); // القيم المحفوظة، عشان نعرف إيه اتغيّر
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { load(); }, []);

  function flash(type, message) {
    setSuccess(type === 'success' ? message : '');
    setError(type === 'error' ? message : '');
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  }

  async function load() {
    setLoading(true);
    try {
      // GET /api/courses بيرجّع الكورسات بنفس ترتيب الموقع، 50 في الصفحة
      let page = 1;
      let totalPages = 1;
      const all = [];
      do {
        const res = await fetch(`/api/courses?limit=50&page=${page}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        all.push(...(data.courses || []));
        totalPages = data.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages && page <= 40);

      // الكورس اللي لسه ملوش رقم بياخد رقمه حسب مكانه الحالي (1-based)
      const initial = {};
      all.forEach((c, i) => {
        initial[c.id] = String(typeof c.displayOrder === 'number' ? c.displayOrder : i + 1);
      });
      setCourses(all);
      setOrders(initial);
      setOriginal(
        Object.fromEntries(
          all.map((c) => [c.id, typeof c.displayOrder === 'number' ? String(c.displayOrder) : null])
        )
      );
    } catch (err) {
      flash('error', 'Failed to load courses: ' + err.message);
    }
    setLoading(false);
  }

  const setOrder = (id, value) =>
    setOrders((prev) => ({ ...prev, [id]: value.replace(/[^\d]/g, '').slice(0, 6) }));

  // العرض: مرتّب بالأرقام الحالية في الحقول (مباشرة وأنت بتعدّل)
  const sorted = useMemo(() => {
    const idx = new Map(courses.map((c, i) => [c.id, i]));
    return [...courses].sort((a, b) => {
      const na = orders[a.id] === '' ? Infinity : Number(orders[a.id]);
      const nb = orders[b.id] === '' ? Infinity : Number(orders[b.id]);
      return na - nb || idx.get(a.id) - idx.get(b.id);
    });
  }, [courses, orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.title, c.teacherName, c.categoryName].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [sorted, search, statusFilter]);

  const hasEmpty = courses.some((c) => orders[c.id] === '');
  const dirtyCount = courses.filter((c) => orders[c.id] !== original[c.id]).length;

  // تبديل رقم الكورس مع اللي قبله/بعده في الترتيب الحالي
  function move(id, delta) {
    const i = sorted.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i].id;
    const b = sorted[j].id;
    setOrders((prev) => {
      // لو الرقمين متساويين، نرتّب الكل 1..n الأول عشان التبديل يبان
      const same = prev[a] === prev[b];
      const base = same
        ? Object.fromEntries(sorted.map((c, k) => [c.id, String(k + 1)]))
        : prev;
      return { ...base, [a]: base[b], [b]: base[a] };
    });
  }

  // ترتيب الأرقام 1..n بالتسلسل حسب الترتيب الحالي (بيشيل التكرار والفجوات)
  function renumber() {
    setOrders(Object.fromEntries(sorted.map((c, k) => [c.id, String(k + 1)])));
  }

  async function save() {
    if (hasEmpty) return flash('error', 'Every course needs an order number.');
    setSaving(true);
    try {
      const res = await fetch('/api/courses/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: courses.map((c) => ({ id: c.id, order: Number(orders[c.id]) })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      flash('success', '✓ Order saved — it now applies to all visitors');
      await load();
    } catch (err) {
      flash('error', 'Error saving order: ' + err.message);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-100">
      {/* Header */}
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-3 text-purple-900">
              <ListOrdered size={28} /> Courses Order
              <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{courses.length}</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Set the order number next to each course. Lower numbers appear first for all visitors
              (Courses page &amp; Home). Same number → newest first.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              disabled={loading || saving}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-60"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={renumber}
              disabled={loading || saving || courses.length === 0}
              title="Renumber 1..n following the current order"
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-60"
            >
              <Wand2 size={18} /> Renumber
            </button>
            <button
              onClick={save}
              disabled={loading || saving || courses.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
              Save Order{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      {(success || error) && (
        <div className={`mx-6 mt-4 px-6 py-4 rounded-xl flex items-center gap-3 ${success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {success ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <span className="font-medium">{success || error}</span>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, teacher or category..."
              className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-purple-400 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <p className="text-xs text-gray-400">
          Only <b>Published</b> courses are visible to visitors — the others keep their number for when they go live.
        </p>

        {loading ? (
          <div className="py-16 text-center"><Loader className="animate-spin mx-auto text-purple-500" size={40} /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No courses found.</div>
        ) : (
          <ul className="divide-y divide-gray-100 border-2 border-gray-100 rounded-xl overflow-hidden">
            {visible.map((c) => {
              const changed = orders[c.id] !== original[c.id];
              const pos = sorted.findIndex((x) => x.id === c.id);
              return (
                <li key={c.id} className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 ${changed ? 'bg-yellow-50' : 'bg-white'}`}>
                  {/* Order number */}
                  <div className="shrink-0 flex flex-col items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Order</label>
                    <input
                      inputMode="numeric"
                      value={orders[c.id] ?? ''}
                      onChange={(e) => setOrder(c.id, e.target.value)}
                      className={`w-16 text-center font-bold text-lg border-2 rounded-lg py-1.5 outline-none focus:border-purple-500 ${
                        orders[c.id] === '' ? 'border-red-400' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Thumbnail */}
                  <div className="shrink-0 w-16 h-11 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-gray-100">
                    {c.thumbnail && <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[c.categoryName, c.teacherName && `by ${c.teacherName}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                    {c.status}
                  </span>

                  {/* Quick move */}
                  <div className="shrink-0 flex flex-col gap-0.5">
                    <button
                      onClick={() => move(c.id, -1)}
                      disabled={pos <= 0}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                      title="Move up"
                    ><ArrowUp size={14} /></button>
                    <button
                      onClick={() => move(c.id, 1)}
                      disabled={pos >= sorted.length - 1}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                      title="Move down"
                    ><ArrowDown size={14} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}