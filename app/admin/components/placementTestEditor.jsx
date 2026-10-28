'use client';

// app/admin/components/placementTestEditor.jsx
//
// 🆕 محرّر الاختبار الكامل — بيتستخدم في مكانين (نفس الكومبوننت):
//   1) شاشة المراجعة قبل النشر بعد رفع الملف (customPlacementTestsManager → ImportFlow)
//   2) تعديل اختبار منشور من كارت الاختبار (زرار "Edit test")
//
// الأدمن يقدر يعدّل كل حاجة: إعدادات الاختبار (المستوى/العنوان/اللغة/حدود النتيجة)، الأجزاء والمهام (إضافة/حذف/ترتيب/نقل)،
// تعليمات ونصوص المهام، بنك الربط، الأسئلة (إضافة/حذف/تكرار/ترتيب/نقل لمهمة تانية) والخيارات والإجابة الصحيحة،
// وأماكن الأوديو: مكتبة تسجيلات (اسم + نص + ملف مرفوع) وكل مهمة/سؤال بيختار أنهي تسجيل يشغّل (أو من غير صوت).
//
// الكومبوننت controlled: value = payload المحرّر (شوف app/lib/placementTestEditor.js) + مفاتيح واجهة (_k, _mode) بتتشال قبل الإرسال.
// check = نتيجة validateEditable(value) — بيحسبها الأب (عشان يقفل زرار الحفظ) وبتتعرض هنا (أخطاء + تحذيرات + تظليل مكان الخطأ).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Copy, Headphones, AlertCircle, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import { CEFR_BASES } from '@/app/lib/placementLevels';
import { buildTestFromEditable } from '@/app/lib/placementTestEditor';
import { LIMITS, MAX_AUDIO_SLOT, MAX_BANK, MAX_OPTIONS, SUBJECT_CODES } from '@/app/lib/placementTestSheetSpec';

const LETTERS = 'ABCDEFGHIJK';
let keySeq = 0;
const uid = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;
const clone = (x) => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)));

// ───────────────────────── أدوات للأب ─────────────────────────

// payload جاي من السيرفر → payload للمحرّر (مفاتيح React ثابتة + وضع الصوت لكل مهمة)
export function prepareEditable(editable) {
  const c = clone(editable);
  for (const p of c.parts || []) {
    p._k = uid();
    for (const t of p.tasks || []) {
      t._k = uid();
      t._mode = t.audioSlot != null ? 'task' : (t.questions || []).some((q) => q.audioSlot != null) ? 'question' : 'none';
      for (const q of t.questions || []) q._k = uid();
    }
  }
  for (const a of c.audio || []) a._k = uid();
  return c;
}

// payload المحرّر → اللي بيتبعت للسيرفر (من غير مفاتيح الواجهة)
export function serializeEditable(value) {
  return JSON.parse(JSON.stringify(value, (k, v) => (k.startsWith('_') ? undefined : v)));
}

// التحقق اللحظي (نفس قواعد السيرفر — السيرفر بيتحقق تاني قبل الحفظ)
export function validateEditable(value) {
  return buildTestFromEditable(serializeEditable(value), { renumber: true });
}

// ───────────────────────── عناصر صغيرة ─────────────────────────
const inputCls = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white';
const iconBtn = 'p-1 rounded text-gray-400 hover:text-gray-800 disabled:opacity-25 disabled:hover:text-gray-400';
const linkBtn = 'inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-40';

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

function SlotSelect({ value, audio, onChange, onNew, none = '— no audio —' }) {
  const known = audio.some((a) => a.slot === value);
  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '__new') onChange(onNew());
        else onChange(v === '' ? null : Number(v));
      }}
      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white max-w-full"
    >
      <option value="">{none}</option>
      {value != null && !known && <option value={value}>#{value}</option>}
      {audio.map((a) => (
        <option key={a._k || a.slot} value={a.slot}>#{a.slot} — {a.label || `Audio ${a.slot}`}</option>
      ))}
      <option value="__new">+ New recording…</option>
    </select>
  );
}

// ───────────────────────── سؤال ─────────────────────────
function QuestionRow({ q, ln, qi, ti, pi, task, taskCount, c }) {
  const [open, setOpen] = useState(false);
  const where = `Part ${pi + 1} › Task ${ti + 1} › Q${ln}`;
  const bad = c.isBad(where);
  const isMatching = Boolean(task.bank);
  const opts = isMatching ? task.bank.map((b, i) => ({ l: LETTERS[i], t: b.t })) : q.options.map((o, i) => ({ l: LETTERS[i], t: o }));
  const upd = (fn) => c.update((d) => fn(d.parts[pi].tasks[ti].questions[qi], d.parts[pi].tasks[ti], d));

  const setOption = (i, v) => upd((qq) => { qq.options[i] = v; });
  const addOption = () => upd((qq) => { qq.options.push(''); });
  const removeOption = (i) =>
    upd((qq) => {
      qq.options.splice(i, 1);
      if (qq.correct === i) qq.correct = null;
      else if (Number.isInteger(qq.correct) && qq.correct > i) qq.correct -= 1;
    });

  return (
    <li className={`rounded-lg border px-3 py-2 ${bad ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <p className="text-sm text-gray-900 truncate" dir="auto">
            <span className="font-bold text-gray-500" dir="ltr">{ln}. </span>
            {q.q || <span className="text-gray-400">(empty question)</span>}
          </p>
          <p className="text-[11px] text-gray-400" dir="ltr">
            {q.n ? `id ${q.n}` : 'new'}
            {Number.isInteger(q.correct) && opts[q.correct] ? ` · answer ${LETTERS[q.correct]}` : ' · no answer selected'}
            {q.audioSlot != null ? ` · 🎧 #${q.audioSlot}` : ''}
          </p>
        </button>
        <div className="flex items-center shrink-0">
          <button type="button" className={iconBtn} disabled={qi === 0} onClick={() => c.moveQuestion(pi, ti, qi, -1)} title="Move up"><ChevronUp size={15} /></button>
          <button type="button" className={iconBtn} disabled={qi === taskCount - 1} onClick={() => c.moveQuestion(pi, ti, qi, 1)} title="Move down"><ChevronDown size={15} /></button>
          <button type="button" className={iconBtn} onClick={() => c.duplicateQuestion(pi, ti, qi)} title="Duplicate"><Copy size={14} /></button>
          <button type="button" className={`${iconBtn} hover:!text-red-600`} onClick={() => c.deleteQuestion(pi, ti, qi)} title="Delete question"><Trash2 size={14} /></button>
        </div>
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <Field label="Question">
            <textarea value={q.q} onChange={(e) => upd((qq) => { qq.q = e.target.value; })} rows={2} dir="auto" maxLength={LIMITS.question + 200} className={inputCls} />
          </Field>
          <Field label="Context (optional — short text shown above this question)">
            <textarea value={q.ctx} onChange={(e) => upd((qq) => { qq.ctx = e.target.value; })} rows={2} dir="auto" className={`${inputCls} text-xs`} />
          </Field>

          <div>
            <span className="text-[11px] font-semibold text-gray-500">
              {isMatching ? 'Correct answer — pick the matching text from the bank' : 'Options — select the correct one'}
            </span>
            <ul className="mt-1 space-y-1">
              {opts.map((o, oi) => (
                <li key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${q._k}`} checked={q.correct === oi} onChange={() => upd((qq) => { qq.correct = oi; })} className="accent-green-600" title="Mark as correct" />
                  <span className="w-5 text-xs font-bold text-gray-500">{o.l}</span>
                  {isMatching ? (
                    <span className="text-xs text-gray-600 truncate" dir="auto">{o.t}</span>
                  ) : (
                    <>
                      <input value={o.t} onChange={(e) => setOption(oi, e.target.value)} dir="auto" className={`${inputCls} !py-1 text-xs flex-1`} />
                      <button type="button" onClick={() => removeOption(oi)} disabled={q.options.length <= 2} className={`${iconBtn} hover:!text-red-600`} title="Remove option"><Trash2 size={13} /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {!isMatching && q.options.length < MAX_OPTIONS && (
              <button type="button" onClick={addOption} className={`${linkBtn} mt-1.5`}><Plus size={12} /> Add option</button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {task._mode === 'question' && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Headphones size={13} /> Plays:
                <SlotSelect value={q.audioSlot} audio={c.audio} onNew={c.addAudio} onChange={(slot) => upd((qq) => { qq.audioSlot = slot; })} />
              </div>
            )}
            {c.taskOptions.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <ArrowLeftRight size={13} /> Move to:
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [tp, tt] = e.target.value.split(':').map(Number);
                    c.moveQuestionToTask(pi, ti, qi, tp, tt);
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white max-w-[14rem]"
                >
                  <option value="">choose a task…</option>
                  {c.taskOptions.filter((o) => !(o.pi === pi && o.ti === ti)).map((o) => (
                    <option key={`${o.pi}:${o.ti}`} value={`${o.pi}:${o.ti}`}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// ───────────────────────── مهمة ─────────────────────────
function TaskCard({ task, ti, pi, taskCount, lnStart, c }) {
  const [open, setOpen] = useState(c.expandTasks);
  const where = `Part ${pi + 1} › Task ${ti + 1}`;
  const bad = c.isBad(where);
  const isMatching = Boolean(task.bank);
  const upd = (fn) => c.update((d) => fn(d.parts[pi].tasks[ti], d));

  const setMode = (mode) =>
    upd((t) => {
      t._mode = mode;
      if (mode !== 'task') t.audioSlot = null;
      if (mode !== 'question') for (const q of t.questions) q.audioSlot = null;
    });

  const setMatching = (on) =>
    upd((t) => {
      if (on === Boolean(t.bank)) return;
      if (on) {
        t.bank = [{ t: '' }, { t: '' }];
        for (const q of t.questions) { q.options = []; q.correct = null; }
      } else {
        t.bank = null;
        for (const q of t.questions) { q.options = ['', '']; q.correct = null; }
      }
    });
  const setBankText = (i, v) => upd((t) => { t.bank[i].t = v; });
  const addBank = () => upd((t) => { t.bank.push({ t: '' }); });
  const removeBank = (i) =>
    upd((t) => {
      t.bank.splice(i, 1);
      for (const q of t.questions) {
        if (q.correct === i) q.correct = null;
        else if (Number.isInteger(q.correct) && q.correct > i) q.correct -= 1;
      }
    });

  return (
    <div className={`rounded-lg border ${bad ? 'border-red-200' : 'border-gray-200'} bg-gray-50/50`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-indigo-800 truncate" dir="auto">
            {open ? '▾' : '▸'} {task.title || <span className="text-gray-400">(untitled task)</span>}
          </p>
          <p className="text-[11px] text-gray-500" dir="ltr">
            {task.questions.length} question{task.questions.length === 1 ? '' : 's'}
            {isMatching ? ' · matching' : ''}
            {task.audioSlot != null ? ` · 🎧 #${task.audioSlot} (whole task)` : task._mode === 'question' ? ' · 🎧 per question' : ''}
          </p>
        </button>
        <button type="button" className={iconBtn} disabled={ti === 0} onClick={() => c.moveTask(pi, ti, -1)} title="Move task up"><ChevronUp size={15} /></button>
        <button type="button" className={iconBtn} disabled={ti === taskCount - 1} onClick={() => c.moveTask(pi, ti, 1)} title="Move task down"><ChevronDown size={15} /></button>
        <button type="button" className={`${iconBtn} hover:!text-red-600`} onClick={() => c.deleteTask(pi, ti)} title="Delete task"><Trash2 size={14} /></button>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Task title">
              <input value={task.title} onChange={(e) => upd((t) => { t.title = e.target.value; })} dir="auto" className={inputCls} />
            </Field>
            <Field label="Move this task to part">
              <select
                value=""
                onChange={(e) => e.target.value !== '' && c.moveTaskToPart(pi, ti, Number(e.target.value))}
                disabled={c.partOptions.length < 2}
                className={`${inputCls} text-xs`}
              >
                <option value="">{c.partOptions.length < 2 ? '(only one part)' : 'choose a part…'}</option>
                {c.partOptions.filter((o) => o.pi !== pi).map((o) => <option key={o.pi} value={o.pi}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Instructions (shown to the student)">
            <textarea value={task.intro} onChange={(e) => upd((t) => { t.intro = e.target.value; })} rows={2} dir="auto" className={`${inputCls} text-xs`} />
          </Field>
          <Field label="Shared passage (optional — one text for all the questions of this task)">
            <textarea value={task.passage} onChange={(e) => upd((t) => { t.passage = e.target.value; })} rows={4} dir="auto" className={`${inputCls} text-xs`} />
          </Field>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-white border border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span className="font-semibold">Type:</span>
              <select value={isMatching ? 'matching' : 'choice'} onChange={(e) => setMatching(e.target.value === 'matching')} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="choice">Multiple choice</option>
                <option value="matching">Matching (bank of texts A, B, C…)</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
              <Headphones size={13} />
              <span className="font-semibold">Audio:</span>
              <select value={task._mode} onChange={(e) => setMode(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="none">No audio</option>
                <option value="task">One recording for the whole task</option>
                <option value="question">A recording per question</option>
              </select>
              {task._mode === 'task' && (
                <SlotSelect value={task.audioSlot} audio={c.audio} onNew={c.addAudio} onChange={(slot) => upd((t) => { t.audioSlot = slot; })} none="— choose a recording —" />
              )}
            </div>
          </div>
          {task._mode !== 'none' && (
            <p className="text-[11px] text-gray-500">
              {task._mode === 'task'
                ? 'الطالب مش هيشوف المهمة دي غير لما التسجيل يكون مرفوع. · Students only see this task once its recording is uploaded.'
                : 'كل سؤال بيظهر بس لو التسجيل بتاعه مرفوع (افتح السؤال واختار التسجيل). · A question only shows once its recording is uploaded.'}
            </p>
          )}

          {isMatching && (
            <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
              <span className="text-[11px] font-semibold text-gray-500">Bank texts (the answers are letters)</span>
              <ul className="mt-1 space-y-1">
                {task.bank.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-5 text-xs font-bold text-gray-500">{LETTERS[i]}</span>
                    <textarea value={b.t} onChange={(e) => setBankText(i, e.target.value)} rows={1} dir="auto" className={`${inputCls} !py-1 text-xs flex-1`} />
                    <button type="button" onClick={() => removeBank(i)} disabled={task.bank.length <= 2} className={`${iconBtn} hover:!text-red-600`} title="Remove text"><Trash2 size={13} /></button>
                  </li>
                ))}
              </ul>
              {task.bank.length < MAX_BANK && <button type="button" onClick={addBank} className={`${linkBtn} mt-1.5`}><Plus size={12} /> Add text</button>}
            </div>
          )}

          <ol className="space-y-2">
            {task.questions.map((q, qi) => (
              <QuestionRow key={q._k} q={q} ln={lnStart + qi} qi={qi} ti={ti} pi={pi} task={task} taskCount={task.questions.length} c={c} />
            ))}
          </ol>
          <button type="button" onClick={() => c.addQuestion(pi, ti)} className={linkBtn}><Plus size={12} /> Add question</button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── جزء ─────────────────────────
function PartCard({ part, pi, partCount, c }) {
  const [open, setOpen] = useState(true);
  const where = `Part ${pi + 1}`;
  const bad = c.isBad(where);
  const upd = (fn) => c.update((d) => fn(d.parts[pi], d));
  const qCount = part.tasks.reduce((s, t) => s + t.questions.length, 0);
  // رقم أول سؤال في كل مهمة (للعرض) — محسوب من غير تعديل متغير وقت الرسم
  const starts = part.tasks.map((_, i) => 1 + part.tasks.slice(0, i).reduce((s, t) => s + t.questions.length, 0));

  return (
    <section className={`rounded-xl border ${bad ? 'border-red-200' : 'border-gray-200'} bg-white`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-gray-900 truncate" dir="auto">
            {open ? '▾' : '▸'} {part.title || <span className="text-gray-400">(untitled part)</span>}
          </p>
          <p className="text-[11px] text-gray-500">{part.tasks.length} task{part.tasks.length === 1 ? '' : 's'} · {qCount} question{qCount === 1 ? '' : 's'} · {part.minutes} min</p>
        </button>
        <button type="button" className={iconBtn} disabled={pi === 0} onClick={() => c.movePart(pi, -1)} title="Move part up"><ChevronUp size={15} /></button>
        <button type="button" className={iconBtn} disabled={pi === partCount - 1} onClick={() => c.movePart(pi, 1)} title="Move part down"><ChevronDown size={15} /></button>
        <button type="button" className={`${iconBtn} hover:!text-red-600`} onClick={() => c.deletePart(pi)} title="Delete part"><Trash2 size={14} /></button>
      </div>
      {open && (
        <div className="p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <Field label="Part title">
              <input value={part.title} onChange={(e) => upd((p) => { p.title = e.target.value; })} dir="auto" className={inputCls} />
            </Field>
            <Field label="Minutes">
              <input type="number" min={1} max={300} value={part.minutes ?? ''} onChange={(e) => upd((p) => { p.minutes = e.target.value === '' ? '' : Number(e.target.value); })} className={inputCls} />
            </Field>
          </div>
          {part.tasks.map((t, ti) => (
            <TaskCard key={t._k} task={t} ti={ti} pi={pi} taskCount={part.tasks.length} lnStart={starts[ti]} c={c} />
          ))}
          <button type="button" onClick={() => c.addTask(pi)} className={linkBtn}><Plus size={12} /> Add task</button>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── مكتبة التسجيلات ─────────────────────────
function AudioLibrary({ value, usedBy, audioFiles, onSwapAudio, c }) {
  const [openScript, setOpenScript] = useState({});
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapError, setSwapError] = useState('');
  const canAdd = value.audio.length < MAX_AUDIO_SLOT;

  const swap = async (from, to) => {
    setSwapBusy(true);
    setSwapError('');
    try {
      await onSwapAudio(from, to);
    } catch (e) {
      setSwapError(e?.message || 'Could not move the file');
    } finally {
      setSwapBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="px-3 py-2.5 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Headphones size={15} className="text-indigo-600" /> Audio recordings</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          دي مكتبة التسجيلات. كل مهمة/سؤال بيختار أنهي تسجيل يشغّله (من جوه المهمة). رفع ملفات الصوت من تبويب &quot;Audio & results&quot; بعد الحفظ، وتغيير مكان التسجيل مش بيفقد الملف المرفوع.
          <br />
          Recordings keep their uploaded file when you point a different task/question at them.
        </p>
      </div>
      <div className="p-3 space-y-2">
        {value.audio.length === 0 && <p className="text-xs text-gray-400">No recordings yet.</p>}
        {swapError && <p className="text-xs text-red-600">{swapError}</p>}
        {value.audio.map((a) => {
          const file = audioFiles ? audioFiles[a.slot] : undefined;
          const users = usedBy[a.slot] || [];
          return (
            <div key={a._k} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5" dir="ltr">#{a.slot}</span>
                <input
                  value={a.label}
                  onChange={(e) => c.update((d) => { d.audio.find((x) => x._k === a._k).label = e.target.value; })}
                  placeholder={`Audio ${a.slot}`}
                  dir="auto"
                  className={`${inputCls} !py-1 text-xs flex-1 min-w-[10rem]`}
                />
                {file !== undefined && (
                  <span className={`text-[11px] rounded px-1.5 py-0.5 ${file ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`} dir="ltr">
                    {file ? `✓ ${file.name}` : 'no file uploaded'}
                  </span>
                )}
                {onSwapAudio && file !== undefined && value.audio.length > 1 && (
                  <select
                    value=""
                    disabled={swapBusy || !file}
                    onChange={(e) => e.target.value && swap(a.slot, Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-[11px] bg-white disabled:opacity-40"
                    title="Move this uploaded file to another recording (swaps if the other one has a file)"
                  >
                    <option value="">move file to…</option>
                    {value.audio.filter((o) => o.slot !== a.slot && audioFiles && audioFiles[o.slot] !== undefined).map((o) => (
                      <option key={o.slot} value={o.slot}>#{o.slot} — {o.label || `Audio ${o.slot}`}</option>
                    ))}
                  </select>
                )}
                <button type="button" className={linkBtn} onClick={() => setOpenScript((s) => ({ ...s, [a._k]: !s[a._k] }))}>
                  {openScript[a._k] ? 'Hide script' : a.script ? 'Script ✓' : 'Script'}
                </button>
                <button type="button" className={`${iconBtn} hover:!text-red-600`} onClick={() => c.removeAudio(a.slot, file)} title="Delete recording"><Trash2 size={14} /></button>
              </div>
              <p className="mt-1 text-[11px] text-gray-500" dir="ltr">
                {users.length ? `Plays at: ${users.join(' · ')}` : 'Not played anywhere yet — pick it from a task or question.'}
              </p>
              {openScript[a._k] && (
                <textarea
                  value={a.script}
                  onChange={(e) => c.update((d) => { d.audio.find((x) => x._k === a._k).script = e.target.value; })}
                  rows={4}
                  dir="auto"
                  placeholder="Recording script — visible to admins only, never to students"
                  className={`${inputCls} mt-1.5 text-xs`}
                />
              )}
            </div>
          );
        })}
        <button type="button" disabled={!canAdd} onClick={() => c.addAudio()} className={linkBtn}><Plus size={12} /> Add recording</button>
      </div>
    </section>
  );
}

// ───────────────────────── المحرّر ─────────────────────────
export default function PlacementTestEditor({ value, onChange, check, audioFiles = null, onSwapAudio = null, resultsCount = 0 }) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);

  // كل التعديلات بتمشي على آخر نسخة (حتى لو اتنفّذ تعديلين ورا بعض قبل ما React يرسم)
  const update = (fn) => {
    const next = clone(ref.current);
    fn(next);
    ref.current = next;
    onChange(next);
  };

  const errors = useMemo(() => check?.errors || [], [check]);
  const warnings = check?.warnings || [];
  const errWheres = useMemo(() => errors.map((e) => e.where || ''), [errors]);
  const isBad = (where) => errWheres.some((w) => w === where || w.startsWith(`${where} ›`));

  const totalQuestions = useMemo(() => value.parts.reduce((s, p) => s + p.tasks.reduce((t, k) => t + k.questions.length, 0), 0), [value]);

  const taskOptions = useMemo(
    () => value.parts.flatMap((p, pi) => p.tasks.map((t, ti) => ({ pi, ti, label: `${p.title || `Part ${pi + 1}`} › ${t.title || `Task ${ti + 1}`}${t.bank ? ' (matching)' : ''}` }))),
    [value]
  );
  const partOptions = useMemo(() => value.parts.map((p, pi) => ({ pi, label: p.title || `Part ${pi + 1}` })), [value]);

  // أنهي مهام/أسئلة بتشغّل كل تسجيل
  const usedBy = useMemo(() => {
    const m = {};
    const note = (slot, text) => { (m[slot] ||= []).push(text); };
    value.parts.forEach((p, pi) => {
      let ln = 0;
      p.tasks.forEach((t, ti) => {
        const first = ln + 1;
        ln += t.questions.length;
        const place = `${p.title || `Part ${pi + 1}`} › ${t.title || `Task ${ti + 1}`}`;
        if (t.audioSlot != null) note(t.audioSlot, `${place} (Q${first}${ln > first ? `–Q${ln}` : ''})`);
        t.questions.forEach((q, qi) => { if (q.audioSlot != null) note(q.audioSlot, `${place} › Q${first + qi}`); });
      });
    });
    return m;
  }, [value]);

  // ─── عمليات الهيكل ───
  const newQuestion = (task) => ({ _k: uid(), q: '', ctx: '', options: task.bank ? [] : ['', ''], correct: null, audioSlot: null });
  const swapItems = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

  const c = {
    update,
    isBad,
    taskOptions,
    partOptions,
    audio: value.audio,
    expandTasks: totalQuestions <= 40,

    addAudio: () => {
      let slot = 0;
      update((d) => {
        const used = new Set(d.audio.map((a) => a.slot));
        slot = 1;
        while (used.has(slot) && slot <= MAX_AUDIO_SLOT) slot += 1;
        if (slot > MAX_AUDIO_SLOT) return;
        d.audio.push({ _k: uid(), slot, label: `Audio ${slot}`, script: '' });
        d.audio.sort((a, b) => a.slot - b.slot);
      });
      return slot > MAX_AUDIO_SLOT ? null : slot;
    },
    removeAudio: (slot, file) => {
      const users = usedBy[slot] || [];
      const msg = `Delete recording #${slot}?${users.length ? `\n\nIt is used by ${users.length} place(s) — they will have no audio.` : ''}${file ? '\n\nThe uploaded file will be unlinked from this test (it stays in storage).' : ''}`;
      if ((users.length || file) && !window.confirm(msg)) return;
      update((d) => {
        d.audio = d.audio.filter((a) => a.slot !== slot);
        for (const p of d.parts) for (const t of p.tasks) {
          if (t.audioSlot === slot) t.audioSlot = null;
          for (const q of t.questions) if (q.audioSlot === slot) q.audioSlot = null;
        }
      });
    },

    addPart: () => update((d) => { d.parts.push({ _k: uid(), title: `Part ${d.parts.length + 1}`, minutes: 30, tasks: [] }); const p = d.parts.at(-1); p.tasks.push({ _k: uid(), title: 'Task 1', intro: '', passage: '', audioSlot: null, bank: null, _mode: 'none', questions: [] }); p.tasks[0].questions.push(newQuestion(p.tasks[0])); }),
    movePart: (pi, dir) => update((d) => swapItems(d.parts, pi, dir)),
    deletePart: (pi) => {
      const p = value.parts[pi];
      const n = p.tasks.reduce((s, t) => s + t.questions.length, 0);
      if (n && !window.confirm(`Delete "${p.title || `Part ${pi + 1}`}" with ${n} question(s)?`)) return;
      update((d) => { d.parts.splice(pi, 1); });
    },

    addTask: (pi) => update((d) => { const t = { _k: uid(), title: `Task ${d.parts[pi].tasks.length + 1}`, intro: '', passage: '', audioSlot: null, bank: null, _mode: 'none', questions: [] }; t.questions.push(newQuestion(t)); d.parts[pi].tasks.push(t); }),
    moveTask: (pi, ti, dir) => update((d) => swapItems(d.parts[pi].tasks, ti, dir)),
    moveTaskToPart: (pi, ti, toPi) => update((d) => { const [t] = d.parts[pi].tasks.splice(ti, 1); d.parts[toPi].tasks.push(t); }),
    deleteTask: (pi, ti) => {
      const t = value.parts[pi].tasks[ti];
      if (t.questions.length && !window.confirm(`Delete "${t.title || `Task ${ti + 1}`}" with ${t.questions.length} question(s)?`)) return;
      update((d) => { d.parts[pi].tasks.splice(ti, 1); });
    },

    addQuestion: (pi, ti) => update((d) => { const t = d.parts[pi].tasks[ti]; t.questions.push(newQuestion(t)); }),
    moveQuestion: (pi, ti, qi, dir) => update((d) => swapItems(d.parts[pi].tasks[ti].questions, qi, dir)),
    duplicateQuestion: (pi, ti, qi) =>
      update((d) => {
        const t = d.parts[pi].tasks[ti];
        const copy = clone(t.questions[qi]);
        delete copy.n; // سؤال جديد (رقم جديد) — مش نسخة بنفس رقم السؤال الأصلي
        copy._k = uid();
        t.questions.splice(qi + 1, 0, copy);
      }),
    deleteQuestion: (pi, ti, qi) => {
      if (!window.confirm('Delete this question?')) return;
      update((d) => { d.parts[pi].tasks[ti].questions.splice(qi, 1); });
    },
    moveQuestionToTask: (pi, ti, qi, toPi, toTi) =>
      update((d) => {
        const src = d.parts[pi].tasks[ti];
        const dst = d.parts[toPi].tasks[toTi];
        const [q] = src.questions.splice(qi, 1);
        // نوع المهمة اتغيّر (اختيار ↔ ربط): الخيارات والإجابة بيتعاد اختيارهم
        if (Boolean(src.bank) !== Boolean(dst.bank)) {
          q.options = dst.bank ? [] : ['', ''];
          q.correct = null;
        }
        if (dst._mode !== 'question') q.audioSlot = null;
        dst.questions.push(q);
      }),
  };

  const s = value;
  return (
    <div className="mt-3 space-y-3">
      {resultsCount > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={13} className="inline -mt-0.5 mr-1" />
          {resultsCount} student result{resultsCount === 1 ? '' : 's'} already exist for this test. تعديل الأسئلة أو ترتيب الخيارات أو حذف أسئلة بيأثر على شكل مراجعة النتايج القديمة (الدرجات اللي اتحسبت بتفضل زي ما هي).
          <br />
          Editing answers/options or deleting questions changes how old results are displayed (saved scores stay unchanged).
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="text-sm font-bold text-gray-900 mb-2">Test settings</p>
        <div className="grid gap-2 sm:grid-cols-[7rem_1fr_8rem]">
          <Field label="Level (CEFR)">
            <select value={s.label} onChange={(e) => update((d) => { d.label = e.target.value; })} className={inputCls}>
              {!CEFR_BASES.includes(s.label) && <option value={s.label}>{s.label}</option>}
              {CEFR_BASES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Test title (shown to the student)">
            <input value={s.title} onChange={(e) => update((d) => { d.title = e.target.value; })} dir="auto" className={inputCls} />
          </Field>
          <Field label="Subject / language">
            <select value={s.subject} onChange={(e) => update((d) => { d.subject = e.target.value; })} className={inputCls}>
              {SUBJECT_CODES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-2">
          <span className="text-[11px] font-semibold text-gray-500">Level thresholds (out of 100) — below the 1st = Pre-level, then .1 / .2 / .3</span>
          <div className="mt-0.5 flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="number"
                min={1}
                max={99}
                value={s.thresholds[i] ?? ''}
                onChange={(e) => update((d) => { d.thresholds[i] = e.target.value === '' ? '' : Number(e.target.value); })}
                className={`${inputCls} !w-20`}
              />
            ))}
          </div>
        </div>
      </section>

      <AudioLibrary value={value} usedBy={usedBy} audioFiles={audioFiles} onSwapAudio={onSwapAudio} c={c} />

      {value.parts.map((p, pi) => (
        <PartCard key={p._k} part={p} pi={pi} partCount={value.parts.length} c={c} />
      ))}
      <button type="button" onClick={c.addPart} className={linkBtn}><Plus size={12} /> Add part</button>

      <div className={`rounded-lg border px-3 py-2 text-xs ${errors.length ? 'border-red-200 bg-red-50' : 'border-green-100 bg-green-50'}`}>
        {errors.length === 0 ? (
          <p className="flex items-center gap-1.5 font-semibold text-green-700">
            <CheckCircle2 size={14} /> {totalQuestions} question{totalQuestions === 1 ? '' : 's'} · {value.parts.length} part{value.parts.length === 1 ? '' : 's'} — جاهز للحفظ · Ready to save
          </p>
        ) : (
          <>
            <p className="flex items-center gap-1.5 font-semibold text-red-700">
              <AlertCircle size={14} /> {errors.length} problem{errors.length === 1 ? '' : 's'} to fix before saving · لازم تصلّحها قبل الحفظ
            </p>
            <ul className="mt-1.5 max-h-40 overflow-y-auto space-y-1">
              {errors.slice(0, 30).map((e, i) => (
                <li key={i}>
                  <p className="text-gray-800" dir="rtl">{e.ar}</p>
                  <p className="text-gray-500" dir="ltr">{e.en}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        {warnings.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-amber-700">
            {warnings.slice(0, 10).map((w, i) => <li key={i} dir="auto">⚠ {w.ar}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
