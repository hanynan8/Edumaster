'use client';

// app/admin/components/customPlacementTestsManager.jsx
//
// 🆕 تبويب "Manage tests" في لوحة اختبارات تحديد المستوى — الأدمن (من غير برمجة) يقدر:
//   1) ينزّل قالب PDF (أو TXT) بالصيغة الثابتة — أو قالب Excel القديم.
//   2) يرفع ملفه (PDF / TXT / XLSX) → معاينة الأخطاء برقم السطر/الصف (بالعربي والإنجليزي) → حفظ لو مفيش أخطاء.
//   3) يشوف قايمة الاختبارات المخصصة: نشر / إخفاء، تحديث من ملف، تصدير الاختبار كـ Excel، حذف (أرشفة لو ليه نتايج).
//   4) يختار الكورسات اللي زرار "اختبر مستواك" بتاع الاختبار يظهر عليها.
//   5) يروح لتبويب الاختبار نفسه لرفع صوتياته ومشاهدة نتايج الطلاب.
// مصدر البيانات: /api/admin/placement-tests/{template,import,custom,custom/export,courses}.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader, AlertCircle, Upload, Download, FileSpreadsheet, CheckCircle2, Eye, EyeOff,
  Archive, Trash2, Link2, BookOpen, RefreshCw, Headphones, Copy, X, Pencil, Plus, RotateCcw,
} from 'lucide-react';

const STATUS_STYLES = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-200 text-gray-600',
};

async function readJson(res) {
  return res.json().catch(() => null);
}

// ───────────────────────── مراجعة وتعديل الأسئلة قبل النشر ─────────────────────────
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// نفس حدود السيرفر (placementTestSheetSpec) — السيرفر بيتحقق تاني قبل الحفظ
const MAX_OPTIONS = 6;
const MAX_QUESTION_LEN = 1000;
const MAX_CONTEXT_LEN = 2000;
const MAX_OPTION_LEN = 400;

const baseOf = (item) => ({ q: item.q, ctx: item.ctx || '', options: [...item.options], correct: item.correct });
const sameEdit = (a, b) =>
  a.q === b.q && a.ctx === b.ctx && a.correct === b.correct &&
  a.options.length === b.options.length && a.options.every((o, i) => o === b.options[i]);

// بترجّع نص المشكلة (أو null لو التعديل سليم)
function validateEdit(e, isMatching) {
  if (!e.q.trim()) return 'Question text is empty · نص السؤال فاضي';
  if (e.q.trim().length > MAX_QUESTION_LEN) return `Question is too long (max ${MAX_QUESTION_LEN})`;
  if (e.ctx.trim().length > MAX_CONTEXT_LEN) return `Context is too long (max ${MAX_CONTEXT_LEN})`;
  if (!isMatching) {
    if (e.options.length < 2) return 'At least 2 options are required · لازم خيارين على الأقل';
    if (e.options.some((o) => !o.trim())) return 'Options cannot be empty · الخيارات مينفعش تبقى فاضية';
    if (e.options.some((o) => o.trim().length > MAX_OPTION_LEN)) return `An option is too long (max ${MAX_OPTION_LEN})`;
  }
  if (!Number.isInteger(e.correct) || e.correct < 0 || e.correct >= e.options.length) return 'Pick the correct answer · اختار الإجابة الصحيحة';
  return null;
}

function QuestionItem({ item, task, edit, showAnswers, onChange, onReset }) {
  const [open, setOpen] = useState(false);
  const isMatching = Boolean(task.bank);
  const base = baseOf(item);
  const cur = edit || base;
  const problem = edit ? validateEdit(edit, isMatching) : null;

  const set = (patch) => {
    const next = { ...cur, ...patch };
    onChange(item.n, sameEdit(next, base) ? null : next);
  };
  const setOption = (i, v) => set({ options: cur.options.map((o, j) => (j === i ? v : o)) });
  const addOption = () => set({ options: [...cur.options, ''] });
  const removeOption = (i) =>
    set({
      options: cur.options.filter((_, j) => j !== i),
      correct: cur.correct === i ? null : cur.correct > i ? cur.correct - 1 : cur.correct,
    });

  const optionLabel = (i) => (isMatching ? '' : `${LETTERS[i]}. `);

  return (
    <li className={`rounded-lg border px-3 py-2 ${problem ? 'border-red-200 bg-red-50/40' : edit ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-gray-900" dir="auto">
          <span className="font-bold text-gray-500" dir="ltr">Q{item.n} </span>
          {cur.q}
          {item.audio ? <span className="text-xs text-gray-400"> · 🎧 #{item.audio}</span> : null}
          {edit && !problem && <span className="ml-1.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">edited</span>}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
        >
          <Pencil size={12} /> {open ? 'Done' : 'Edit'}
        </button>
      </div>

      {!open && (
        <>
          {cur.ctx && <p className="mt-0.5 text-xs text-gray-500" dir="auto">{cur.ctx}</p>}
          <ul className="mt-1.5 space-y-0.5">
            {cur.options.map((opt, oi) => {
              const isCorrect = showAnswers && cur.correct === oi;
              return (
                <li key={oi} dir="auto" className={`text-xs rounded px-2 py-1 ${isCorrect ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-700'}`}>
                  {optionLabel(oi)}{opt}
                  {isCorrect && <CheckCircle2 size={12} className="inline ml-1.5 -mt-0.5" />}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {open && (
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500">Question</span>
            <textarea
              value={cur.q}
              onChange={(e) => set({ q: e.target.value })}
              rows={2}
              dir="auto"
              className="mt-0.5 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500">Context (optional)</span>
            <textarea
              value={cur.ctx}
              onChange={(e) => set({ ctx: e.target.value })}
              rows={2}
              dir="auto"
              className="mt-0.5 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
            />
          </label>

          <div>
            <span className="text-[11px] font-semibold text-gray-500">
              {isMatching ? 'Correct answer (from the Bank)' : 'Options — select the correct one'}
            </span>
            <ul className="mt-1 space-y-1">
              {cur.options.map((opt, oi) => (
                <li key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${item.n}`}
                    checked={cur.correct === oi}
                    onChange={() => set({ correct: oi })}
                    className="accent-green-600"
                    title="Mark as correct"
                  />
                  <span className="w-5 text-xs font-bold text-gray-500">{LETTERS[oi]}</span>
                  {isMatching ? (
                    <span className="text-xs text-gray-600 truncate" dir="auto">
                      {(task.bank.find((b) => b.l === opt) || {}).t || ''}
                    </span>
                  ) : (
                    <>
                      <input
                        value={opt}
                        onChange={(e) => setOption(oi, e.target.value)}
                        dir="auto"
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(oi)}
                        disabled={cur.options.length <= 2}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                        title="Remove option"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {!isMatching && cur.options.length < MAX_OPTIONS && (
              <button type="button" onClick={addOption} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                <Plus size={12} /> Add option
              </button>
            )}
          </div>
        </div>
      )}

      {problem && <p className="mt-1.5 text-xs font-semibold text-red-600">{problem}</p>}
      {edit && (
        <button type="button" onClick={() => onReset(item.n)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800">
          <RotateCcw size={11} /> Reset to the file&apos;s version
        </button>
      )}
    </li>
  );
}

function QuestionsReview({ review, edits, onChange, onReset, onResetAll }) {
  const [showAnswers, setShowAnswers] = useState(true);
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const editedCount = Object.keys(edits).length;

  const matches = (item) =>
    !q || `${item.n} ${item.q} ${item.ctx || ''} ${(item.options || []).join(' ')}`.toLowerCase().includes(q);

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search in questions…"
          className="flex-1 min-w-[10rem] border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={() => setShowAnswers((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1.5"
        >
          {showAnswers ? <EyeOff size={13} /> : <Eye size={13} />}
          {showAnswers ? 'Hide correct answers' : 'Show correct answers'}
        </button>
        {editedCount > 0 && (
          <button type="button" onClick={onResetAll} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 px-2 py-1.5">
            <RotateCcw size={12} /> Discard {editedCount} edit{editedCount === 1 ? '' : 's'}
          </button>
        )}
      </div>

      <div className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100">
        {review.map((part, pi) => (
          <div key={pi} className="px-3 py-3">
            <p className="text-sm font-bold text-gray-800">
              {part.title} <span className="text-xs font-normal text-gray-400">({part.minutes} min)</span>
            </p>
            {part.tasks.map((task, ti) => {
              const shown = task.questions.filter(matches);
              if (q && !shown.length) return null;
              return (
                <div key={ti} className="mt-3">
                  <p className="text-xs font-semibold text-indigo-700">
                    {task.title}
                    {task.bank ? ' · matching' : ''}
                    {task.audio ? ` · 🎧 #${task.audio}` : ''}
                  </p>
                  {task.intro && <p className="mt-1 text-xs text-gray-500 whitespace-pre-line" dir="auto">{task.intro}</p>}
                  {task.passage && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-gray-500">Passage</summary>
                      <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 whitespace-pre-line" dir="auto">{task.passage}</p>
                    </details>
                  )}
                  {task.bank && (
                    <ul className="mt-1.5 space-y-0.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                      {task.bank.map((b) => (
                        <li key={b.l} dir="auto"><span className="font-bold">{b.l}.</span> {b.t}</li>
                      ))}
                    </ul>
                  )}
                  <ol className="mt-2 space-y-2.5">
                    {shown.map((item) => (
                      <QuestionItem
                        key={item.n}
                        item={item}
                        task={task}
                        edit={edits[item.n]}
                        showAnswers={showAnswers}
                        onChange={onChange}
                        onReset={onReset}
                      />
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── رفع ملف + معاينة + حفظ ─────────────────────────
// expectId: لو بنحدّث اختبار موجود (الـ Test ID جوه الملف لازم يطابقه).
function ImportFlow({ expectId = null, onSaved, onCancel }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('published'); // للاختبار الجديد بس
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // رد الـ preview
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [edits, setEdits] = useState({}); // تعديلات الأدمن على الأسئلة: { [رقم السؤال]: { q, ctx, options, correct } }
  const [saveErrors, setSaveErrors] = useState([]); // أخطاء التحقق من التعديلات وقت الحفظ
  const input = useRef(null);

  // رقم السؤال → هل هو في مهمة ربط (matching)؟ (مهام الربط خياراتها من الـ Bank فمبتتبعتش)
  const matchingByN = useMemo(() => {
    const m = {};
    for (const part of result?.review || []) for (const task of part.tasks) for (const it of task.questions) m[it.n] = Boolean(task.bank);
    return m;
  }, [result]);
  const editCount = Object.keys(edits).length;
  const hasInvalidEdit = Object.entries(edits).some(([n, e]) => validateEdit(e, matchingByN[n]));

  const changeEdit = (n, next) =>
    setEdits((prev) => {
      const copy = { ...prev };
      if (next) copy[n] = next;
      else delete copy[n];
      return copy;
    });
  const resetEdit = (n) => changeEdit(n, null);

  const send = async (mode, f = file) => {
    const fd = new FormData();
    fd.append('file', f);
    fd.append('mode', mode);
    fd.append('status', status);
    if (expectId) fd.append('expectId', expectId);
    if (mode === 'save' && editCount) {
      const payload = {};
      for (const [n, e] of Object.entries(edits)) {
        payload[n] = { q: e.q.trim(), ctx: e.ctx.trim(), correct: e.correct };
        if (!matchingByN[n]) payload[n].options = e.options.map((o) => o.trim());
      }
      fd.append('edits', JSON.stringify(payload));
    }
    const res = await fetch('/api/admin/placement-tests/import', { method: 'POST', body: fd });
    const data = await readJson(res);
    if (!data) throw new Error('request_failed');
    if (data.error === 'file_too_large') throw new Error('الملف كبير (الأقصى 5MB) · File is too large (max 5MB)');
    if (data.error) throw new Error(data.error);
    return data;
  };

  const pick = async (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
    setShowReview(false);
    setEdits({});
    setSaveErrors([]);
    setBusy(true);
    try {
      setResult(await send('preview', f));
    } catch (e) {
      setError(e.message === 'request_failed' ? 'تعذّر قراءة الملف، حاول مرة أخرى · Could not read the file' : e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const save = async () => {
    setBusy(true);
    setError('');
    setSaveErrors([]);
    try {
      const data = await send('save');
      if (!data.ok || !data.saved) {
        // لو الرفض بسبب التعديلات: نخلّي المعاينة والتعديلات زي ما هي ونعرض الأخطاء تحت الزرار
        if (data.edits) setSaveErrors(data.errors || []);
        else setResult(data);
        return;
      }
      onSaved?.(data);
    } catch (e) {
      setError(e.message === 'request_failed' ? 'تعذّر الحفظ، حاول مرة أخرى · Could not save' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const ok = result?.ok && !(result.errors || []).length;
  // اختبار جديد بـ ID موجود → لازم يتحدّث من القايمة (مش يتكتب فوقه بالغلط)
  const blockedByExisting = ok && result.exists && !expectId;
  const s = result?.summary;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept=".pdf,.txt,.xlsx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <button
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader className="animate-spin" size={13} /> : <Upload size={13} />}
          {file ? 'Choose another file' : expectId ? `Choose the updated file for "${expectId}"` : 'Choose the file (PDF / TXT / Excel)'}
        </button>
        {!expectId && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white"
            title="Status of the new test"
          >
            <option value="published">Publish now</option>
            <option value="draft">Save as draft (hidden)</option>
          </select>
        )}
        {onCancel && (
          <button onClick={onCancel} className="inline-flex items-center gap-1 text-gray-500 text-xs font-semibold px-2 py-2 hover:text-gray-800">
            <X size={13} /> Cancel
          </button>
        )}
        {file && <span className="text-xs text-gray-500 truncate max-w-[16rem]" dir="ltr">{file.name}</span>}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {result && !ok && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-red-700 mb-2">
            الملف فيه أخطاء ({(result.errors || []).length}) — صلّحها وارفعه تاني · Fix these errors and upload again:
          </p>
          <ul className="max-h-72 overflow-y-auto space-y-1.5">
            {(result.errors || []).map((e, i) => (
              <li key={i} className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs">
                <span className="font-bold text-red-700" dir="ltr">
                  {e.line ? `PDF · line ${e.line}` : `${e.sheet}${e.row ? ` · row ${e.row}` : ''}`}
                </span>
                {e.excerpt && <code className="block mt-0.5 text-[11px] text-gray-500 truncate" dir="auto">{e.excerpt}</code>}
                <p className="text-gray-800 mt-0.5" dir="rtl">{e.ar}</p>
                <p className="text-gray-500" dir="ltr">{e.en}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (result.warnings || []).length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-amber-700 mb-1.5">تنبيهات (مش بتمنع الحفظ) · Warnings:</p>
          <ul className="max-h-40 overflow-y-auto space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs text-gray-700">
                <span className="font-bold text-amber-700" dir="ltr">{w.line ? `PDF · line ${w.line}` : `${w.sheet}${w.row ? ` · row ${w.row}` : ''}`}</span> — {w.ar}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ok && s && (
        <div className="mt-3 rounded-lg bg-white border border-green-100 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <CheckCircle2 size={16} /> الملف سليم · The file is valid
          </p>
          <p className="text-sm text-gray-800 mt-1">
            <span className="font-bold">{s.label}</span> — {s.title}{' '}
            <span className="text-xs text-gray-400" dir="ltr">(ID: {s.id})</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {s.questions} questions · {s.parts} parts · {s.tasks} tasks
            {s.matchingTasks ? ` (${s.matchingTasks} matching)` : ''} · {s.audioSlots} audio recording{s.audioSlots === 1 ? '' : 's'}
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
            {(s.partList || []).map((p, i) => (
              <li key={i}>
                <span className="font-semibold">{p.title}</span> ({p.minutes} min):{' '}
                {p.tasks.map((k) => `${k.title} · ${k.questions}Q${k.matching ? ' · matching' : ''}${k.audio ? ` · 🎧 ${k.audio === 'per-question' ? 'per question' : `#${k.audio}`}` : ''}`).join('  |  ')}
              </li>
            ))}
          </ul>
          {(result.review || []).length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowReview((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-indigo-100"
              >
                {showReview ? <EyeOff size={13} /> : <Eye size={13} />}
                {showReview ? 'Hide questions' : `Review ${s.questions} questions before publishing`}
              </button>
              {showReview && (
                <QuestionsReview
                  review={result.review}
                  edits={edits}
                  onChange={changeEdit}
                  onReset={resetEdit}
                  onResetAll={() => setEdits({})}
                />
              )}
              {!showReview && editCount > 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  {editCount} edited question{editCount === 1 ? '' : 's'} will be saved with the test.
                </p>
              )}
            </>
          )}
          {blockedByExisting ? (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              فيه اختبار بنفس الـ ID ({s.id}) بالفعل. افتحه من القايمة تحت واستخدم &quot;Update from file&quot;، أو غيّر الـ Test ID في الملف.
              <br />
              A test with this ID already exists — use “Update from file” on it in the list below, or change the Test ID.
            </p>
          ) : (
            <button
              onClick={save}
              disabled={busy || hasInvalidEdit}
              className="mt-3 inline-flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              {expectId ? 'Save the update' : status === 'draft' ? 'Save as draft' : 'Save & publish'}
              {editCount > 0 ? ` (with ${editCount} edit${editCount === 1 ? '' : 's'})` : ''}
            </button>
          )}
          {hasInvalidEdit && (
            <p className="mt-2 text-xs text-red-600">
              فيه تعديل مش سليم — افتح المراجعة وصلّحه عشان تقدر تحفظ · Fix the highlighted edits in the review to enable saving.
            </p>
          )}
          {saveErrors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {saveErrors.map((e, i) => (
                <li key={i} className="rounded-lg bg-red-50 border border-red-100 px-3 py-1.5 text-xs">
                  <p className="text-gray-800" dir="rtl">{e.ar}</p>
                  <p className="text-gray-500" dir="ltr">{e.en}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── اختيار الكورسات ─────────────────────────
function CoursePicker({ test, onSaved, onClose }) {
  const [courses, setCourses] = useState(null);
  const [selected, setSelected] = useState(() => new Set(test.courseIds || []));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/placement-tests/courses')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => alive && setCourses(d.courses || []))
      .catch(() => alive && setError('Could not load the courses'));
    return () => { alive = false; };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (courses || []).filter((c) => !q || `${c.title} ${c.slug}`.toLowerCase().includes(q));
  }, [courses, query]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/placement-tests/custom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: test.id, courseIds: [...selected] }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error('failed');
      onSaved(data.tests || null);
    } catch {
      setError('Could not save the courses, please try again');
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800">
        الكورسات اللي هيظهر عليها زرار &quot;اختبر مستواك&quot; · Courses that show this test
      </p>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        الكورس بيتربط باختبار واحد بس — لو اخترت كورس مربوط باختبار تاني هيتنقل لهنا. الزرار بيظهر للطلاب لما الاختبار يكون Published.
      </p>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {!courses && !error ? (
        <div className="flex justify-center py-6"><Loader className="animate-spin text-indigo-600" size={20} /></div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"
          />
          <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-gray-400">No courses found</li>}
            {shown.map((c) => {
              const movedFrom = c.linkedTestId && c.linkedTestId !== test.id && selected.has(c.id);
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-gray-800 truncate">{c.title}</span>
                      <span className="block text-[11px] text-gray-400">
                        {c.language || '—'} · {c.status}
                        {c.linkedTestId && c.linkedTestId !== test.id && (
                          <span className={movedFrom ? 'text-amber-600' : ''}> · linked to “{c.linkedTestId}”{movedFrom ? ' (will move here)' : ''}</span>
                        )}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !courses}
          className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
          Save ({selected.size} selected)
        </button>
        <button onClick={onClose} className="text-gray-500 text-xs font-semibold px-2 py-2 hover:text-gray-800">Cancel</button>
      </div>
    </div>
  );
}

// ───────────────────────── كارت اختبار ─────────────────────────
function TestCard({ test, busy, onStatus, onDelete, onOpenTest, onChanged, setNotice }) {
  const [panel, setPanel] = useState(null); // 'update' | 'courses' | null
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}${test.path}` : test.path;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const isPublished = test.status === 'published';
  const archived = test.status === 'archived';
  const btn = 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg border disabled:opacity-50';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-gray-900">{test.label} — {test.title}</h4>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[test.status] || STATUS_STYLES.draft}`}>{test.status}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5" dir="ltr">
            ID: {test.id} · {test.questions} questions · {test.parts} parts · {test.audioSlots.length} audio
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Shown on {test.courseIds.length} course{test.courseIds.length === 1 ? '' : 's'}
            {isPublished && test.courseIds.length === 0 && <span className="text-amber-600"> — لسه مفيش كورس مربوط · no course linked yet</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onOpenTest(test.id)} className={`${btn} border-indigo-100 text-indigo-700 hover:bg-indigo-50`} title="Upload audio & see student results">
            <Headphones size={13} /> Audio & results
          </button>
          <button onClick={() => setPanel(panel === 'courses' ? null : 'courses')} disabled={archived} className={`${btn} border-gray-200 text-gray-700 hover:bg-gray-50`}>
            <BookOpen size={13} /> Courses
          </button>
          <button onClick={() => setPanel(panel === 'update' ? null : 'update')} className={`${btn} border-gray-200 text-gray-700 hover:bg-gray-50`}>
            <RefreshCw size={13} /> Update from file
          </button>
          <a href={`/api/admin/placement-tests/custom/export?id=${encodeURIComponent(test.id)}&format=pdf`} className={`${btn} border-gray-200 text-gray-700 hover:bg-gray-50`}>
            <Download size={13} /> PDF
          </a>
          <a href={`/api/admin/placement-tests/custom/export?id=${encodeURIComponent(test.id)}`} className={`${btn} border-gray-200 text-gray-700 hover:bg-gray-50`}>
            <Download size={13} /> Excel
          </a>
          {isPublished ? (
            <button onClick={() => onStatus(test, 'draft')} disabled={busy} className={`${btn} border-amber-200 text-amber-700 hover:bg-amber-50`}>
              <EyeOff size={13} /> Hide
            </button>
          ) : (
            <button onClick={() => onStatus(test, 'published')} disabled={busy} className={`${btn} border-green-200 text-green-700 hover:bg-green-50`}>
              <Eye size={13} /> Publish
            </button>
          )}
          <button onClick={() => onDelete(test)} disabled={busy} className={`${btn} border-red-100 text-red-600 hover:bg-red-50`} title="Delete (archived if students took it)">
            {archived ? <Trash2 size={13} /> : <Archive size={13} />} Delete
          </button>
        </div>
      </div>

      {isPublished && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-500">
          <Link2 size={13} />
          <a href={test.path} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline" dir="ltr">{test.path}</a>
          <button onClick={copy} className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-700">
            <Copy size={12} /> {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}

      {panel === 'update' && (
        <div className="mt-3">
          <ImportFlow
            expectId={test.id}
            onCancel={() => setPanel(null)}
            onSaved={async () => {
              setPanel(null);
              setNotice(`تم تحديث الاختبار "${test.id}" · Test "${test.id}" updated`);
              await onChanged();
            }}
          />
          <p className="text-[11px] text-gray-400 mt-1.5">
            التحديث بيستبدل الأسئلة ومفتاح الإجابات. الكورسات المربوطة والحالة والصوتيات المرفوعة بتفضل زي ما هي (راجع أرقام خانات الصوت بعد التعديل).
          </p>
        </div>
      )}
      {panel === 'courses' && (
        <CoursePicker
          test={test}
          onClose={() => setPanel(null)}
          onSaved={async () => {
            setPanel(null);
            setNotice('تم حفظ الكورسات المربوطة · Linked courses saved');
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────── التبويب ─────────────────────────
export default function CustomPlacementTestsManager({ tests, onChanged, onOpenTest }) {
  const [showNew, setShowNew] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const setStatus = async (test, status) => {
    setError('');
    setBusyId(test.id);
    try {
      const res = await fetch('/api/admin/placement-tests/custom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: test.id, status }),
      });
      if (!res.ok) throw new Error('failed');
      setNotice(status === 'published' ? `الاختبار "${test.id}" اتنشر · Published` : `الاختبار "${test.id}" اتخفى · Hidden`);
      await onChanged();
    } catch {
      setError('Could not change the status, please try again');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (test) => {
    const msg =
      test.status === 'archived'
        ? `Delete the archived test "${test.id}"? Past student results keep their answers but can't be opened again.`
        : `Delete the test "${test.id}"?\n\nIf students already took it, it will be archived (hidden from students, old results stay viewable). Otherwise it is deleted permanently.`;
    if (!window.confirm(msg)) return;
    setError('');
    setBusyId(test.id);
    try {
      const res = await fetch(`/api/admin/placement-tests/custom?id=${encodeURIComponent(test.id)}`, { method: 'DELETE' });
      const data = await readJson(res);
      if (!res.ok) throw new Error('failed');
      setNotice(data?.archived ? `اتأرشف "${test.id}" لأن عليه نتايج طلاب · Archived (it has student results)` : `اتحذف "${test.id}" · Deleted`);
      await onChanged();
    } catch {
      setError('Could not delete the test, please try again');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="text-indigo-600" size={18} />
              <h3 className="text-sm font-semibold text-gray-800">Add a new level test (B1, B2, …) from a PDF</h3>
            </div>
            <ol className="text-xs text-gray-500 space-y-0.5 list-decimal ps-4">
              <li>نزّل قالب الـ PDF (فيه شرح الصيغة ومثال)، اكتب أسئلتك في Word بنفس الصيغة وصدّرها PDF نصّي. أماكن الأوديو بتتحدد بعلامة [AUDIO] جوه الملف.</li>
              <li>ارفع الملف — هتشوف معاينة وأي أخطاء برقم السطر قبل الحفظ.</li>
              <li>بعد الحفظ: ارفع التسجيلات الصوتية، واختار الكورسات اللي هيظهر عليها الاختبار، وانشره.</li>
            </ol>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/placement-tests/template?format=pdf"
              className="inline-flex items-center gap-1.5 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-indigo-50"
            >
              <Download size={13} /> PDF template
            </a>
            <a
              href="/api/admin/placement-tests/template?format=txt"
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-gray-50"
              title="Plain text — copy into Word / Google Docs"
            >
              TXT
            </a>
            <a
              href="/api/admin/placement-tests/template?format=xlsx"
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-gray-50"
              title="Old Excel template"
            >
              Excel
            </a>
            <button
              onClick={() => setShowNew((v) => !v)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90"
            >
              <Upload size={13} /> {showNew ? 'Close' : 'Upload a new test'}
            </button>
          </div>
        </div>
        {showNew && (
          <div className="mt-4">
            <ImportFlow
              onCancel={() => setShowNew(false)}
              onSaved={async (data) => {
                setShowNew(false);
                setNotice(
                  data.status === 'draft'
                    ? 'اتحفظ كمسودة (مخفي) · Saved as a draft (hidden)'
                    : 'اتحفظ واتنشر — اربطه بالكورسات من زرار Courses · Saved & published — link it to courses with “Courses”'
                );
                await onChanged();
              }}
            />
          </div>
        )}
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
          <span className="flex items-center gap-2"><CheckCircle2 size={15} /> {notice}</span>
          <button onClick={() => setNotice('')} className="text-green-700/60 hover:text-green-800" aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {tests.length === 0 ? (
        <div className="text-center py-14 text-gray-400 text-sm">
          لسه مفيش اختبارات مخصصة. نزّل القالب وارفع أول اختبار. · No custom tests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <TestCard
              key={t.id}
              test={t}
              busy={busyId === t.id}
              onStatus={setStatus}
              onDelete={remove}
              onOpenTest={onOpenTest}
              onChanged={onChanged}
              setNotice={setNotice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
