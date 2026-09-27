'use client';

// app/admin/components/(editcomponents)/categories.jsx
//
// اليوم 14: لوحة إدارة كاملة لتصنيفات الكورسات (موديل Category الحقيقي في
// الداتابيز — مش الـ CMS القديم بتاع تبويب "Courses"). الأدمن يقدر:
//   - يضيف تصنيف جديد (اسم + slug اختياري + وصف + أيقونة + ترتيب)
//   - يعدّل أي تصنيف موجود (inline)
//   - يفعّل/يعطّل تصنيف (isActive) من غير حذف فعلي
//   - يحذف تصنيف — بس لو مفيش كورسات مربوطة بيه (الـ API بيرفض غير كده،
//     شوف app/api/categories/[id]/route.js)
//
// نفس نمط usersPanel.jsx: fetch عادي (مفيش React Query هنا)، loading/error
// منفصلين عن action errors، وتأكيد حذف بنافذة في النص بدل window.confirm.

import { useState, useEffect } from 'react';
import {
  Tags, Loader, AlertCircle, Trash2, Plus, Pencil, X, Check,
  Eye, EyeOff, GripVertical,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '', slug: '', description: '', icon: '', order: 0, parent: '',
  i18n: { ar: { name: '' }, en: { name: '' }, es: { name: '' } },
};

// 🆕 التصنيف الرئيسي (parent) بيتبعت دلوقتي فعليًا للـ API (كان الحقل ده
// موجود في EMPTY_FORM من زمان بس مالوش واجهة، فالأدمن ماكانش يقدر يعمل
// ساب-تصنيف حقيقي من لوحة الإدارة خالص — كان لازم يتعمل يدوي بالداتابيز).
// بيسمح بمستوى واحد بس (تصنيف رئيسي ← ساب-تصنيف)، زي ما الـ API بيفرضه.

const LANG_LABELS = { ar: 'عربي', en: 'إنجليزي', es: 'إسباني' };

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingId, setSavingId] = useState(null); // 'new' أو id التصنيف بيتحفظ دلوقتي
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const loadCategories = () => {
    setLoading(true);
    setError('');
    // ✅ نفس /api/categories العام، لكن بـ ?all=1 — بيرجّع كل التصنيفات
    // (فعّالة ومعطّلة) لأن الأدمن محتاج يشوفها كلها عشان يقدر يفعّل تصنيف
    // معطّل تاني. الـ API بيتحقق إن المستخدم أدمن فعلاً قبل ما يرجّع
    // المعطّلة (شوف app/api/categories/route.js).
    fetch('/api/categories?all=1')
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('تعذّر تحميل التصنيفات');
        setLoading(false);
      });
  };

  useEffect(loadCategories, []);

  // 🆕 التصنيفات الرئيسية بس (parent=null) — دي اللي تصلح تتختار كـ "تصنيف
  // رئيسي" لساب-تصنيف جديد. ساب-تصنيف مينفعش يبقى ليه هو كمان ساب-تصنيفات
  // (مستوى واحد بس)، فمش بنعرضه في القايمة دي أصلاً.
  const topLevelCategories = categories.filter((c) => !c.parent);
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  // للعرض: كل تصنيف رئيسي وتحته ساب-تصنيفاته (لو موجودة)، عشان الشكل
  // الشجري يبان واضح في الجدول بدل ليستة مسطحة تخلط الاتنين.
  const groupedForDisplay = (() => {
    const tops = topLevelCategories.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const rows = [];
    for (const top of tops) {
      rows.push({ cat: top, isSub: false });
      const subs = categories
        .filter((c) => c.parent === top.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const sub of subs) rows.push({ cat: sub, isSub: true });
    }
    // أي تصنيف parent بتاعه اتحذف أو مش موجود (حالة نادرة/بيانات قديمة) —
    // نوريه في الآخر بدل ما يختفي بصمت.
    const shown = new Set(rows.map((r) => r.cat.id));
    for (const c of categories) {
      if (!shown.has(c.id)) rows.push({ cat: c, isSub: Boolean(c.parent) });
    }
    return rows;
  })();

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      icon: cat.icon || '',
      order: cat.order ?? 0,
      parent: cat.parent || '',
      i18n: {
        ar: { name: cat.i18n?.ar?.name || '' },
        en: { name: cat.i18n?.en?.name || '' },
        es: { name: cat.i18n?.es?.name || '' },
      },
    });
    setActionError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setActionError('اكتب اسم التصنيف الأول');
      return;
    }
    setActionError('');
    setSavingId('new');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          slug: createForm.slug.trim() || undefined,
          description: createForm.description.trim(),
          icon: createForm.icon.trim() || null,
          order: Number(createForm.order) || 0,
          i18n: createForm.i18n,
          parent: createForm.parent || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          data.error === 'slug_taken'
            ? 'الرابط (slug) ده مستخدم بالفعل'
            : data.error === 'parent_not_found'
            ? 'التصنيف الرئيسي المختار مش موجود'
            : data.error === 'parent_must_be_top_level'
            ? 'التصنيف اللي اخترته كـ "رئيسي" هو نفسه ساب-تصنيف — اختر تصنيف رئيسي أصلي بس'
            : 'حصل خطأ أثناء الإضافة'
        );
        return;
      }
      setCreateForm(EMPTY_FORM);
      setCreating(false);
      loadCategories();
    } catch {
      setActionError('حصل خطأ أثناء الإضافة');
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveEdit(catId) {
    setActionError('');
    setSavingId(catId);
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          slug: editForm.slug.trim(),
          description: editForm.description.trim(),
          icon: editForm.icon.trim() || null,
          order: Number(editForm.order) || 0,
          i18n: editForm.i18n,
          parent: editForm.parent || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          data.error === 'slug_taken'
            ? 'الرابط (slug) ده مستخدم بالفعل'
            : data.error === 'parent_not_found'
            ? 'التصنيف الرئيسي المختار مش موجود'
            : data.error === 'parent_must_be_top_level'
            ? 'التصنيف اللي اخترته كـ "رئيسي" هو نفسه ساب-تصنيف — اختر تصنيف رئيسي أصلي بس'
            : data.error === 'parent_cannot_be_self'
            ? 'التصنيف مينفعش يبقى أب لنفسه'
            : data.error === 'has_subcategories'
            ? 'التصنيف ده ليه ساب-تصنيفات بالفعل، مينفعش يتحول لساب-تصنيف تاني'
            : 'حصل خطأ أثناء الحفظ'
        );
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, ...data } : c)));
      cancelEdit();
    } catch {
      setActionError('حصل خطأ أثناء الحفظ');
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(cat) {
    setActionError('');
    setSavingId(cat.id);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError('حصل خطأ أثناء تحديث الحالة');
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...data } : c)));
    } catch {
      setActionError('حصل خطأ أثناء تحديث الحالة');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(catId) {
    setConfirmDelete(null);
    setActionError('');
    setSavingId(catId);
    try {
      const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'category_in_use') {
          setActionError(`مينفعش تحذف التصنيف ده — فيه ${data.coursesCount} كورس مربوط بيه. انقلهم لتصنيف تاني الأول أو عطّل التصنيف بدل حذفه.`);
        } else {
          setActionError('حصل خطأ أثناء الحذف');
        }
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    } catch {
      setActionError('حصل خطأ أثناء الحذف');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-16 flex justify-center">
        <Loader className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-6 sm:p-8" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Tags size={22} className="text-blue-500" /> تصنيفات الكورسات
        </h2>
        <button
          onClick={() => { setCreating((v) => !v); setActionError(''); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <Plus size={16} /> تصنيف جديد
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          <AlertCircle size={16} /> {actionError}
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <input
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="اسم التصنيف *"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            value={createForm.slug}
            onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="slug (اختياري — بيتولد تلقائي)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            value={createForm.description}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="وصف مختصر"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 sm:col-span-2"
          />
          <input
            value={createForm.icon}
            onChange={(e) => setCreateForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder="اسم أيقونة (lucide-react) أو رابط صورة"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="number"
            value={createForm.order}
            onChange={(e) => setCreateForm((f) => ({ ...f, order: e.target.value }))}
            placeholder="ترتيب العرض (0 = الأول)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={createForm.parent}
            onChange={(e) => setCreateForm((f) => ({ ...f, parent: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 sm:col-span-2 bg-white"
          >
            <option value="">تصنيف رئيسي (مش ساب-تصنيف)</option>
            {topLevelCategories.map((c) => (
              <option key={c.id} value={c.id}>
                ساب-تصنيف تابع لـ «{c.name}»
              </option>
            ))}
          </select>

          <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 pt-1 border-t border-blue-100 mt-1">
            <p className="sm:col-span-3 text-xs font-semibold text-gray-500 -mb-1">
              ترجمة اسم التصنيف (اختياري — لو فاضي بيترجع للاسم الأساسي فوق)
            </p>
            {['ar', 'en', 'es'].map((lang) => (
              <input
                key={lang}
                value={createForm.i18n[lang].name}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    i18n: { ...f.i18n, [lang]: { name: e.target.value } },
                  }))
                }
                placeholder={`الاسم بال${LANG_LABELS[lang]}`}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
            ))}
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={savingId === 'new'}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              {savingId === 'new' ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
              حفظ
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setCreateForm(EMPTY_FORM); }}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-500 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <X size={14} /> إلغاء
            </button>
          </div>
        </form>
      )}

      {categories.length === 0 ? (
        <p className="text-center text-gray-400 py-12">لسه مفيش تصنيفات — ابدأ بإضافة واحد.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="py-2 px-2 font-semibold">الاسم</th>
                <th className="py-2 px-2 font-semibold">الرابط (slug)</th>
                <th className="py-2 px-2 font-semibold">الوصف</th>
                <th className="py-2 px-2 font-semibold">التصنيف الرئيسي</th>
                <th className="py-2 px-2 font-semibold">الترتيب</th>
                <th className="py-2 px-2 font-semibold">الحالة</th>
                <th className="py-2 px-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {groupedForDisplay.map(({ cat, isSub }) => {
                  const isEditing = editingId === cat.id;
                  const isSaving = savingId === cat.id;
                  // ساب-تصنيف مينفعش يبقى هو نفسه أب لتصنيف تاني (مستوى واحد
                  // بس)، فبنمنعه يظهر في قايمة "التصنيف الرئيسي" وقت التعديل.
                  const parentOptionsForEdit = topLevelCategories.filter((c) => c.id !== cat.id);
                  return (
                    <tr
                      key={cat.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 align-top ${isSub ? 'bg-blue-50/20' : ''}`}
                    >
                      {isEditing ? (
                        <>
                          <td className="py-2 px-2">
                            {isSub && <span className="text-gray-300 me-1">↳</span>}
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                            />
                            <div className="flex flex-col gap-1 mt-1.5">
                              {['ar', 'en', 'es'].map((lang) => (
                                <input
                                  key={lang}
                                  value={editForm.i18n[lang].name}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      i18n: { ...f.i18n, [lang]: { name: e.target.value } },
                                    }))
                                  }
                                  placeholder={`ترجمة (${LANG_LABELS[lang]})`}
                                  className="w-full border border-gray-100 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-200 text-gray-500"
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              value={editForm.slug}
                              onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              value={editForm.description}
                              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={editForm.parent}
                              onChange={(e) => setEditForm((f) => ({ ...f, parent: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                            >
                              <option value="">— رئيسي —</option>
                              {parentOptionsForEdit.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={editForm.order}
                              onChange={(e) => setEditForm((f) => ({ ...f, order: e.target.value }))}
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </td>
                          <td className="py-2 px-2 text-gray-400 text-xs">—</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => handleSaveEdit(cat.id)}
                                disabled={isSaving}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-60"
                                title="حفظ"
                              >
                                {isSaving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                title="إلغاء"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-2 font-semibold text-gray-800">
                            {isSub && <span className="text-gray-300 me-1">↳</span>}
                            {cat.name}
                            {(cat.i18n?.ar?.name || cat.i18n?.en?.name || cat.i18n?.es?.name) && (
                              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-normal text-gray-400">
                                {cat.i18n?.ar?.name && <span>AR: {cat.i18n.ar.name}</span>}
                                {cat.i18n?.en?.name && <span>EN: {cat.i18n.en.name}</span>}
                                {cat.i18n?.es?.name && <span>ES: {cat.i18n.es.name}</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-gray-400 font-mono text-xs">{cat.slug}</td>
                          <td className="py-3 px-2 text-gray-500 max-w-[220px] truncate">{cat.description || '—'}</td>
                          <td className="py-3 px-2">
                            {cat.parent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                                <Tags size={11} /> {categoryById[cat.parent]?.name || '—'}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">— رئيسي —</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-gray-500">{cat.order ?? 0}</td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleToggleActive(cat)}
                              disabled={isSaving}
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-colors disabled:opacity-60 ${
                                cat.isActive
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                              title={cat.isActive ? 'عطّل التصنيف' : 'فعّل التصنيف'}
                            >
                              {cat.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                              {cat.isActive ? 'مفعّل' : 'معطّل'}
                            </button>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => startEdit(cat)}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                title="تعديل"
                              >
                                <Pencil size={13} />
                              </button>
                              {confirmDelete === cat.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="text-[11px] font-bold bg-red-600 text-white px-2 py-1 rounded-lg"
                                  >
                                    تأكيد الحذف
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="text-[11px] font-semibold text-gray-500 px-2 py-1"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDelete(cat.id)}
                                  className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                                  title="حذف"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}