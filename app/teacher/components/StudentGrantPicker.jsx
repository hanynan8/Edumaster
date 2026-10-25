"use client";

// app/teacher/components/StudentGrantPicker.jsx
//
// 🆕 منتقي الطلاب اللي الموديريتور هيسجّلهم مجانًا في الكورس (بيتعرض في
// CourseFormModal للموديريتور/الأدمن بس). بيعرض الطلاب المسجّلين في المنصة بالاسم
// أو الإيميل (GET /api/meetings/invitees?role=student — الطلاب بس)
// وبيسمح باختيار أي عدد منهم. اللي بيتختار بيتسجّل في الكورس فعليًا وقت الحفظ
// (POST /api/courses أو PUT /api/courses/[id] بـ body.grantedEmails) ويتفتح له
// الكورس من غير ما يضغط "اشترك".
//
// - selected: إيميلات الطلاب المختارين دلوقتي (lowercase).
// - alreadyGranted: [{ email, name }] اللي اتسجّلوا قبل كده (وضع التعديل) —
//   بتتعرض للقراءة بس، وبتتعلّم في القايمة عشان مايتختاروش تاني.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader, Search, X } from "lucide-react";

const T = {
  ar: {
    selected: (n) => `${n} طالب مختار`,
    clear: "مسح الكل",
    add: "إضافة طلاب",
    close: "تم",
    search: "ابحث بالاسم أو الإيميل...",
    noResults: "لا يوجد مستخدمون",
    selectAll: "تحديد كل المعروض",
    loadMore: "عرض المزيد",
    already: "مسجّل بالفعل",
    alreadyTitle: (n) => `مسجّلون مسبقًا (${n})`,
  },
  en: {
    selected: (n) => `${n} student(s) selected`,
    clear: "Clear all",
    add: "Add students",
    close: "Done",
    search: "Search by name or email...",
    noResults: "No users found",
    selectAll: "Select all shown",
    loadMore: "Load more",
    already: "Already enrolled",
    alreadyTitle: (n) => `Already enrolled (${n})`,
  },
  es: {
    selected: (n) => `${n} estudiante(s) seleccionado(s)`,
    clear: "Borrar todo",
    add: "Agregar estudiantes",
    close: "Listo",
    search: "Buscar por nombre o correo...",
    noResults: "No se encontraron usuarios",
    selectAll: "Seleccionar todos los mostrados",
    loadMore: "Cargar más",
    already: "Ya inscrito",
    alreadyTitle: (n) => `Ya inscritos (${n})`,
  },
};

export default function StudentGrantPicker({ selected, onChange, alreadyGranted = [], language = "ar" }) {
  const t = T[language] || T.en;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const grantedSet = useMemo(() => new Set(alreadyGranted.map((s) => s.email)), [alreadyGranted]);

  const load = useCallback(async (q, skip) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/invitees?q=${encodeURIComponent(q)}&skip=${skip}&limit=30&role=student`);
      const data = await res.json().catch(() => ({}));
      if (id !== requestId.current) return; // رد قديم — اتجاهله
      const users = Array.isArray(data?.users) ? data.users : [];
      setResults((prev) => (skip === 0 ? users : [...prev, ...users]));
      setHasMore(Boolean(data?.hasMore));
    } catch {
      if (id === requestId.current && skip === 0) {
        setResults([]);
        setHasMore(false);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // بحث مع debounce بسيط، وبيشتغل بس والمنتقي مفتوح.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => load(query.trim(), 0), 300);
    return () => clearTimeout(timer);
  }, [query, open, load]);

  function toggle(email) {
    if (grantedSet.has(email)) return;
    onChange(selectedSet.has(email) ? selected.filter((e) => e !== email) : [...selected, email]);
  }

  function selectAllShown() {
    const merged = new Set(selected);
    results.forEach((u) => {
      if (!grantedSet.has(u.email)) merged.add(u.email);
    });
    onChange([...merged]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-600">{t.selected(selected.length)}</span>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="text-xs text-red-500 hover:underline">
              {t.clear}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-[#003A91] border border-[#003A91] rounded-lg px-3 py-1 hover:bg-[#EBEFF6]"
          >
            {open ? t.close : t.add}
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border border-gray-200 rounded-xl p-2">
          {selected.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 bg-[#EBEFF6] text-[#003A91] text-[11px] font-semibold rounded-full pl-2.5 pr-1.5 py-1"
              dir="ltr"
            >
              {email}
              <button type="button" onClick={() => toggle(email)} className="hover:text-red-600" aria-label="remove">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {alreadyGranted.length > 0 && (
        <details className="border border-gray-200 rounded-xl bg-gray-50">
          <summary className="cursor-pointer text-xs font-semibold text-gray-600 px-3 py-2">
            {t.alreadyTitle(alreadyGranted.length)}
          </summary>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto px-3 pb-2">
            {alreadyGranted.map((s) => (
              <span key={s.email} className="bg-white border border-gray-200 text-gray-500 text-[11px] rounded-full px-2.5 py-1" dir="ltr">
                {s.email}
              </span>
            ))}
          </div>
        </details>
      )}

      {open && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
            />
            <button
              type="button"
              onClick={selectAllShown}
              disabled={results.length === 0}
              className="text-xs font-semibold text-[#003A91] hover:underline disabled:opacity-40 shrink-0"
            >
              {t.selectAll}
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {results.map((u) => {
              const already = grantedSet.has(u.email);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${already ? "opacity-60" : "cursor-pointer hover:bg-gray-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={already || selectedSet.has(u.email)}
                    disabled={already}
                    onChange={() => toggle(u.email)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-gray-700 truncate">{u.name || u.email}</span>
                    <span className="block text-xs text-gray-400 truncate text-left" dir="ltr">
                      {u.email}
                    </span>
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">{already ? t.already : ""}</span>
                </label>
              );
            })}
            {loading && (
              <div className="flex justify-center py-3">
                <Loader size={16} className="animate-spin text-gray-400" />
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">{t.noResults}</p>
            )}
            {!loading && hasMore && (
              <button
                type="button"
                onClick={() => load(query.trim(), results.length)}
                className="w-full text-xs font-semibold text-[#003A91] py-2.5 hover:bg-gray-50"
              >
                {t.loadMore}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
