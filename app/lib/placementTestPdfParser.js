// ═══════════════════════════════════════════════
//  app/lib/placementTestPdfParser.js
//  🆕 رفع اختبار تحديد مستوى من ملف PDF (أو TXT) بصيغة ثابتة بدل Excel.
//
//  الفكرة: بنقرا النص من الـ PDF، نفهمه بالصيغة الثابتة (تحت)، نبني منه ملف Excel في الذاكرة بنفس شكل
//  القالب القديم، ونمرّره لـ parsePlacementTestWorkbook — يعني نفس التحقق ونفس رسايل الأخطاء ونفس
//  شكل الاختبار الناتج (parts → tasks → questions + answerKey + audioSlots + scripts) بالظبط.
//  الأخطاء بترجع برقم السطر في الـ PDF (line) + مقتطف من السطر (excerpt).
//
//  ───────── الصيغة (سطر لكل كلمة مفتاحية — الكلمات إنجليزي والمحتوى بأي لغة) ─────────
//    TEST: b2 | LEVEL: B2 | TITLE: ... | LANGUAGE: es | THRESHOLDS: 40,60,80   (آخر اتنين اختياري)
//    PART: Comprensión de lectura | 45          (الدقائق اختياري)
//    TASK: Tarea 1. Mensajes breves
//    INSTRUCTIONS: ...      PASSAGE: ...        BANK: ثم سطر لكل نص:  (A) ...  (B) ...   (مهام الربط)
//    Q: نص السؤال    CONTEXT: ...    a) ...  b) ...  c) ...    ANSWER: b
//    [AUDIO] أو [AUDIO 5] أو [AUDIO: اسم] أو [AUDIO 5: اسم]   +  SCRIPT: نص التسجيل (للأدمن بس)
//    [NO AUDIO]   بتوقف تغطية الأوديو اللي قبلها
//    # سطر تعليق بيتتجاهل
//    سطر فاضي جوه PASSAGE/SCRIPT/INSTRUCTIONS = فقرة جديدة · الرمز \n جوه السطر = سطر جديد · الالتفاف العادي بيتدمج.
//
//  ───────── قاعدة الأوديو ─────────
//    علامة [AUDIO] بتغطي الأسئلة اللي بعدها لحد العلامة اللي بعدها أو نهاية المهمة (TASK).
//    • علامة واحدة تحت TASK قبل أول سؤال        → أوديو للمهمة كلها (Task Audio Slot)
//    • علامة جوه سؤال أو قبل Q:                  → أوديو للسؤال ده وللي بعده (Question Audio Slot)
//    • علامة بعد PART وقبل أول TASK              → أوديو لكل مهام الجزء اللي مفيهاش علامات خاصة
//    • الأرقام أوتوماتيك بالترتيب، أو يدوي [AUDIO 5] عشان الأوديو المرفوع ما يتلخبطش لما تضيف مكان جديد.
//
//  سيرفر بس (exceljs + pdf-parse).
// ═══════════════════════════════════════════════

import ExcelJS from "exceljs";
import { parsePlacementTestWorkbook } from "@/app/lib/placementTestImport";
import {
  SHEETS,
  QUESTION_COLUMNS,
  BANK_COLUMNS,
  AUDIO_COLUMNS,
  OPTION_LETTERS,
  MAX_AUDIO_SLOT,
  MAX_OPTIONS,
  MAX_BANK,
  DEFAULT_THRESHOLDS,
} from "@/app/lib/placementTestSheetSpec";

const HEADER_KEYS = new Set(["TEST", "LEVEL", "TITLE", "LANGUAGE", "THRESHOLDS"]);
const KEY_ALIASES = { LANG: "LANGUAGE", SUBJECT: "LANGUAGE", QUESTION: "Q" };
const KW_RE = /^\s*(TEST|LEVEL|TITLE|LANGUAGE|LANG|SUBJECT|THRESHOLDS|PART|TASK|INSTRUCTIONS|PASSAGE|BANK|CONTEXT|ANSWER|SCRIPT|QUESTION|Q)\s*\d*\s*[:：]\s*(.*)$/i;
const MARKER_RE = /^\s*\[\s*(AUDIO|NO\s*AUDIO)(?:\s+(\d+))?\s*(?::\s*(.*?))?\s*\]\s*$/i;
// "a) text" / "(a) text" / "a. text" — بعد النقطة لازم مسافة (عشان "e.g. ..." ما تتفهمش خيار)
const OPTION_RE = /^\s*\(?([A-Fa-f])(?:\)\s*|\.\s+)(\S.*)$/;
const BANK_ITEM_RE = /^\s*\(?([A-Ka-k])(?:\)\s*|\.\s+)(\S.*)$/;
const SPEAKER_RE = /^[^\s:.!?¿¡]{1,30}(?:\s[^\s:]{1,20}){0,2}:\s/;
const DASH_RE = /^[-–—•]\s/;
const PAGE_NO_RE = /^\s*(?:page\s*)?\d{1,3}(?:\s*(?:\/|of)\s*\d{1,3})?\s*$/i;
const PAGE_MARK_RE = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/i;
const LIGATURES = { "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl" };

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const unescapeNl = (s) => String(s || "").replace(/\\n/g, "\n");

export function cleanPdfText(raw) {
  return String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ﬀ-ﬄ]/g, (m) => LIGATURES[m] || m)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ");
}

// ───────────────────────── 1) النص → هيكل ─────────────────────────
function parseStructure(rawText) {
  const lines = cleanPdfText(rawText).split("\n");
  const errors = [];
  const warnings = [];
  const excerptOf = (no) => String(lines[no - 1] || "").trim().slice(0, 70);
  const err = (line, en, ar) => errors.push({ sheet: "PDF", row: null, line, excerpt: line ? excerptOf(line) : "", en, ar });
  const warn = (line, en, ar) => warnings.push({ sheet: "PDF", row: null, line, excerpt: line ? excerptOf(line) : "", en, ar });

  const S = {}; // settings: key → { v, line }
  const parts = [];
  const allMarkers = [];
  let part = null;
  let task = null;
  let q = null;
  let lastMarker = null;
  let pendingCtx = null;
  let target = null; // { get, set, nlRe, noBlank, bank }
  let pendingBreak = false;

  const textTarget = (obj, key, extra = {}) => ({ get: () => obj[key], set: (v) => (obj[key] = v), ...extra });

  const addMarker = (m, no) => {
    const none = /^no/i.test(m[1]);
    const marker = { none, slotRaw: m[2] ? Number(m[2]) : null, label: (m[3] || "").trim(), script: "", line: no, at: 0, slot: null, used: false };
    if (!part) return err(no, "An audio marker must come after a PART line.", "علامة الأوديو لازم تيجي بعد سطر PART.");
    if (!none && marker.slotRaw !== null && (marker.slotRaw < 1 || marker.slotRaw > MAX_AUDIO_SLOT))
      err(no, `Audio number must be 1–${MAX_AUDIO_SLOT}.`, `رقم الأوديو لازم يكون من 1 لـ ${MAX_AUDIO_SLOT}.`);
    if (!task) {
      if (part.markers.length) return err(no, "Only one audio marker is allowed between PART and its first TASK.", "مسموح بعلامة أوديو واحدة بس بين PART وأول TASK.");
      part.markers.push(marker);
    } else {
      // علامة جوه سؤال لسه مخلصش (من غير ANSWER) = تغطي السؤال ده وللي بعده
      marker.at = q && !q.answer && task.questions.includes(q) ? task.questions.length - 1 : task.questions.length;
      if (task.markers.some((x) => x.at === marker.at))
        return err(no, "Two audio markers with no question between them.", "علامتين أوديو ورا بعض من غير سؤال بينهم.");
      task.markers.push(marker);
    }
    if (!none) {
      allMarkers.push(marker);
      lastMarker = marker;
    }
    target = null;
  };

  const addBankItem = (m, no) => {
    const expected = OPTION_LETTERS[task.bank.length];
    if (m[1].toUpperCase() !== expected) err(no, `Bank letters must run A, B, C... in order (expected "${expected}").`, `حروف البنك لازم تكون A, B, C... بالترتيب (المتوقع "${expected}").`);
    if (task.bank.length >= MAX_BANK) return err(no, `A matching bank can have at most ${MAX_BANK} texts.`, `بنك الربط أقصى عدد نصوص فيه ${MAX_BANK}.`);
    const item = { l: expected, t: m[2].trim(), line: no };
    task.bank.push(item);
    target = textTarget(item, "t", { bank: true });
  };

  const startQuestion = (value, no) => {
    q = { line: no, text: value, ctx: pendingCtx || "", options: [], answer: "", rowLine: no };
    pendingCtx = null;
    task.questions.push(q);
    target = textTarget(q, "text");
  };

  const handleKeyword = (key, value, no) => {
    const need = (cond, en, ar) => (cond ? true : (err(no, en, ar), false));
    switch (key) {
      case "PART": {
        const pm = /^(.*?)\s*\|\s*(\d{1,3})\s*(?:min\w*)?\s*$/i.exec(value);
        const title = (pm ? pm[1] : value).trim();
        if (!title) return err(no, "PART needs a title.", "PART لازم يكون له عنوان.");
        if (parts.some((p) => norm(p.title) === norm(title))) err(no, `Part "${title}" appears twice.`, `الجزء "${title}" مكرر.`);
        part = { title, minutes: pm ? Number(pm[2]) : "", tasks: [], markers: [], line: no };
        parts.push(part);
        task = null;
        q = null;
        lastMarker = null;
        pendingCtx = null;
        target = textTarget(part, "title", { noBlank: true });
        return;
      }
      case "TASK": {
        if (!need(part, "TASK must come after a PART line.", "TASK لازم يجي بعد سطر PART.")) return;
        if (!value) return err(no, "TASK needs a title.", "TASK لازم يكون له عنوان.");
        if (part.tasks.some((t) => norm(t.title) === norm(value))) err(no, `Task "${value}" appears twice in this part.`, `المهمة "${value}" مكررة في نفس الجزء.`);
        task = { title: value, intro: "", passage: "", bank: null, questions: [], markers: [], line: no };
        part.tasks.push(task);
        q = null;
        lastMarker = null;
        pendingCtx = null;
        target = textTarget(task, "title", { noBlank: true });
        return;
      }
      case "INSTRUCTIONS":
      case "PASSAGE": {
        if (!need(task, `${key} must come after a TASK line.`, `${key} لازم يجي بعد سطر TASK.`)) return;
        const field = key === "INSTRUCTIONS" ? "intro" : "passage";
        if (task[field]) err(no, `${key} appears twice in the same task.`, `${key} مكرر في نفس المهمة.`);
        task[field] = value;
        target = textTarget(task, field, { nlRe: key === "PASSAGE" ? DASH_RE : null });
        return;
      }
      case "BANK": {
        if (!need(task, "BANK must come after a TASK line.", "BANK لازم يجي بعد سطر TASK.")) return;
        if (task.bank) err(no, "BANK appears twice in the same task.", "BANK مكرر في نفس المهمة.");
        task.bank = task.bank || [];
        target = { bank: true, get: () => "", set: () => {} };
        if (value) {
          const m = BANK_ITEM_RE.exec(value);
          if (m) addBankItem(m, no);
          else err(no, 'BANK items must look like "(A) text".', 'نصوص BANK لازم تبقى بالشكل "(A) النص".');
        }
        return;
      }
      case "Q": {
        if (!need(task, "Q must come after a TASK line.", "Q لازم يجي بعد سطر TASK.")) return;
        startQuestion(value, no);
        return;
      }
      case "CONTEXT": {
        if (!need(task, "CONTEXT must come after a TASK line.", "CONTEXT لازم يجي بعد سطر TASK.")) return;
        if (q && !q.answer) {
          if (q.ctx) err(no, "CONTEXT appears twice in the same question.", "CONTEXT مكرر في نفس السؤال.");
          q.ctx = value;
          target = textTarget(q, "ctx");
        } else {
          pendingCtx = value;
          target = { get: () => pendingCtx, set: (v) => (pendingCtx = v) };
        }
        return;
      }
      case "ANSWER": {
        if (!need(q && !q.answer, "ANSWER must follow a question (and only once).", "ANSWER لازم ييجي بعد سؤال (ومرة واحدة بس)."))  return;
        const a = value.replace(/^\(\s*|\s*\)$/g, "").trim();
        if (!a) return err(no, "ANSWER is empty.", "ANSWER فاضي.");
        q.answer = a;
        q.rowLine = no;
        target = null;
        return;
      }
      case "SCRIPT": {
        if (!need(lastMarker, "SCRIPT must come right after an [AUDIO] marker.", "SCRIPT لازم ييجي بعد علامة [AUDIO]."))  return;
        lastMarker.script = value;
        target = textTarget(lastMarker, "script", { nlRe: SPEAKER_RE });
        return;
      }
      default:
    }
  };

  const handleHeader = (line, no) => {
    // TEST: b2 | LEVEL: B2 | TITLE: ... (كل جزء "KEY: value" مفصول بـ |)
    const segs = line.split("|");
    let lastKey = null;
    segs.forEach((seg, i) => {
      const m = KW_RE.exec(seg);
      const k = m ? KEY_ALIASES[m[1].toUpperCase()] || m[1].toUpperCase() : null;
      if (m && HEADER_KEYS.has(k)) {
        if (S[k]) err(no, `${k} appears twice.`, `${k} مكرر.`);
        S[k] = { v: m[2].trim(), line: no };
        lastKey = k;
      } else if (lastKey) {
        S[lastKey].v += ` | ${seg.trim()}`;
      } else if (i === 0) {
        err(no, "Unrecognized text.", "نص مش مفهوم.");
      }
    });
    if (lastKey) target = { get: () => S[lastKey].v, set: (v) => (S[lastKey].v = v), noBlank: true };
  };

  lines.forEach((rawLine, idx) => {
    const no = idx + 1;
    const line = rawLine.trim();
    if (!line) {
      pendingBreak = true;
      return;
    }
    if (line.startsWith("#") || PAGE_MARK_RE.test(line)) return;
    if (PAGE_NO_RE.test(line)) return;

    const mk = MARKER_RE.exec(line);
    if (mk) {
      addMarker(mk, no);
      pendingBreak = false;
      return;
    }

    const kw = KW_RE.exec(line);
    const key = kw ? KEY_ALIASES[kw[1].toUpperCase()] || kw[1].toUpperCase() : null;
    if (kw && (!part ? true : !HEADER_KEYS.has(key))) {
      pendingBreak = false;
      if (HEADER_KEYS.has(key)) handleHeader(line, no);
      else if (!part && key !== "PART") err(no, `${key} found before the first PART line.`, `${key} موجود قبل أول سطر PART.`);
      else handleKeyword(key, kw[2].trim(), no);
      return;
    }

    // سطر عادي: خيار / عنصر بنك / استكمال للحقل اللي فات
    if (target?.bank) {
      const m = BANK_ITEM_RE.exec(line);
      if (m) {
        addBankItem(m, no);
        pendingBreak = false;
        return;
      }
    }
    if (q && !q.answer && task?.questions.includes(q)) {
      const m = OPTION_RE.exec(line);
      if (m) {
        const expected = OPTION_LETTERS[q.options.length].toLowerCase();
        if (q.options.length >= MAX_OPTIONS) err(no, `At most ${MAX_OPTIONS} options per question.`, `أقصى عدد خيارات ${MAX_OPTIONS}.`);
        else if (m[1].toLowerCase() !== expected) err(no, `Options must run a, b, c... in order (expected "${expected})").`, `الخيارات لازم تكون a, b, c... بالترتيب (المتوقع "${expected})").`);
        else {
          const opt = { t: m[2].trim() };
          q.options.push(opt);
          target = textTarget(opt, "t");
        }
        pendingBreak = false;
        return;
      }
    }
    if (!target || (target.noBlank && pendingBreak) || (target.bank && !task?.bank?.length)) {
      err(no, "Unexpected text — start the line with a keyword (Q:, ANSWER:, PASSAGE: ...) or remove it.", "نص مش مفهوم — ابدأ السطر بكلمة مفتاحية (Q: / ANSWER: / PASSAGE: ...) أو امسحه.");
      pendingBreak = false;
      return;
    }
    // سطر فاضي = فقرة جديدة ("\n\n") · سطر بيبدأ باسم متحدّث/شرطة (SCRIPT/PASSAGE) = سطر جديد ("\n") · غير كده التفاف عادي
    const sep = pendingBreak ? "\n\n" : target.nlRe && target.nlRe.test(line) ? "\n" : " ";
    const cur = target.get();
    target.set(cur ? `${cur}${sep}${line}` : line);
    pendingBreak = false;
  });

  return { lines, S, parts, allMarkers, errors, warnings, err, warn };
}

// ───────────────────────── 2) الهيكل → Excel في الذاكرة ─────────────────────────
function assignSlots(allMarkers, err) {
  const explicit = new Set(allMarkers.filter((m) => m.slotRaw !== null).map((m) => m.slotRaw));
  let counter = 0;
  for (const m of allMarkers) {
    if (m.slotRaw !== null) {
      m.slot = m.slotRaw;
      continue;
    }
    do counter += 1;
    while (explicit.has(counter));
    if (counter > MAX_AUDIO_SLOT) {
      err(m.line, `Too many audio markers (max ${MAX_AUDIO_SLOT}).`, `علامات الأوديو أكتر من المسموح (أقصى ${MAX_AUDIO_SLOT}).`);
      m.slot = null;
      continue;
    }
    m.slot = counter;
  }
}

async function buildWorkbook(st) {
  const { S, parts, allMarkers, err, warn } = st;
  const lineMap = { settings: {}, questions: {}, bank: {}, audio: {} };

  // الجزء/المهمة اللي مفيهاش أسئلة بتتشال (مع تحذير)
  for (const p of parts) {
    for (const t of p.tasks) if (!t.questions.length) warn(t.line, `Task "${t.title}" has no questions — ignored.`, `المهمة "${t.title}" مفيهاش أسئلة — اتتجاهلت.`);
    p.tasks = p.tasks.filter((t) => t.questions.length);
  }
  const kept = parts.filter((p) => {
    if (!p.tasks.length) warn(p.line, `Part "${p.title}" has no questions — ignored.`, `الجزء "${p.title}" مفيهوش أسئلة — اتتجاهل.`);
    return p.tasks.length;
  });

  assignSlots(allMarkers, err);

  // تغطية الأوديو: لكل مهمة → { taskMarker | perQuestion[] }
  const taskAudio = new Map();
  for (const p of kept) {
    for (const t of p.tasks) {
      const markers = t.markers.length ? t.markers : p.markers.map((m) => ({ ...m, at: 0, _src: m }));
      if (!markers.length) continue;
      const sorted = [...markers].sort((a, b) => a.at - b.at);
      const cover = t.questions.map((_, i) => {
        let cur = null;
        for (const m of sorted) if (m.at <= i) cur = m;
        return cur && !cur.none ? cur : null;
      });
      const whole = sorted.length === 1 && sorted[0].at === 0 && !sorted[0].none;
      const mark = (m) => ((m._src || m).used = true);
      if (whole) {
        mark(sorted[0]);
        taskAudio.set(t, { task: sorted[0]._src || sorted[0], per: [] });
      } else {
        cover.forEach((m) => m && mark(m));
        taskAudio.set(t, { task: null, per: cover.map((m) => (m ? m._src || m : null)) });
      }
    }
  }
  for (const m of allMarkers) if (!m.used) warn(m.line, "This audio marker covers no questions — ignored.", "علامة الأوديو دي مش بتغطي أي سؤال — اتتجاهلت.");

  const wb = new ExcelJS.Workbook();

  // Settings
  const ws = wb.addWorksheet(SHEETS.settings);
  ws.addRow(["Key", "Value"]);
  const settingRows = [
    ["Test ID", S.TEST],
    ["Level (CEFR)", S.LEVEL],
    ["Test Title", S.TITLE],
    ["Subject", S.LANGUAGE],
    ["Level thresholds", S.THRESHOLDS],
  ];
  for (const [k, item] of settingRows) {
    if (!item) continue;
    const row = ws.addRow([k, item.v]);
    lineMap.settings[row.number] = item.line;
  }

  // Questions + Bank
  const qs = wb.addWorksheet(SHEETS.questions);
  qs.addRow(QUESTION_COLUMNS.map((c) => c.header));
  const bs = wb.addWorksheet(SHEETS.bank);
  bs.addRow(BANK_COLUMNS.map((c) => c.header));
  for (const p of kept) {
    let firstOfPart = true;
    for (const t of p.tasks) {
      let firstOfTask = true;
      const au = taskAudio.get(t);
      for (const b of t.bank || []) {
        const row = bs.addRow([p.title, t.title, b.l, unescapeNl(b.t)]);
        lineMap.bank[row.number] = b.line;
      }
      t.questions.forEach((qq, i) => {
        const v = {
          part: p.title,
          partMinutes: firstOfPart && p.minutes ? p.minutes : undefined,
          task: t.title,
          taskIntro: firstOfTask ? unescapeNl(t.intro) || undefined : undefined,
          passage: firstOfTask ? unescapeNl(t.passage) || undefined : undefined,
          taskAudio: firstOfTask && au?.task?.slot ? au.task.slot : undefined,
          questionAudio: au?.per[i]?.slot || undefined,
          question: unescapeNl(qq.text),
          context: unescapeNl(qq.ctx) || undefined,
          correct: qq.answer,
        };
        qq.options.forEach((o, k) => (v[["optA", "optB", "optC", "optD", "optE", "optF"][k]] = unescapeNl(o.t)));
        const row = qs.addRow(QUESTION_COLUMNS.map((c) => v[c.key]));
        lineMap.questions[row.number] = qq.line;
        firstOfPart = false;
        firstOfTask = false;
      });
    }
  }

  // Audio
  const as = wb.addWorksheet(SHEETS.audio);
  as.addRow(AUDIO_COLUMNS.map((c) => c.header));
  const slots = new Map();
  for (const m of allMarkers) {
    if (!m.used || !m.slot) continue;
    const cur = slots.get(m.slot) || { label: "", script: "", line: m.line };
    if (!cur.label && m.label) cur.label = m.label;
    if (!cur.script && m.script) cur.script = unescapeNl(m.script);
    slots.set(m.slot, cur);
  }
  for (const [slot, d] of [...slots].sort((a, b) => a[0] - b[0])) {
    const row = as.addRow([slot, d.label || undefined, undefined, d.script || undefined]);
    lineMap.audio[row.number] = d.line;
  }

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), lineMap };
}

// ───────────────────────── 3) الواجهة العامة ─────────────────────────
const SHEET_TO_MAP = { [SHEETS.settings]: "settings", [SHEETS.questions]: "questions", [SHEETS.bank]: "bank", [SHEETS.audio]: "audio" };

// نص (من PDF أو TXT) → نفس نتيجة parsePlacementTestWorkbook: { ok, errors, warnings, test, stats }
export async function parsePlacementTestText(rawText) {
  const st = parseStructure(rawText);
  const { S, errors, warnings, err } = st;
  const fail = () => ({ ok: false, errors, warnings, test: null, stats: null, format: "pdf" });

  if (!String(rawText || "").trim()) {
    err(null, "The file has no readable text. It must be a text PDF (exported from Word/Docs), not a scanned image.", "الملف مفيهوش نص مقروء. لازم يكون PDF نصّي (مُصدَّر من Word/Docs) مش صورة ممسوحة.");
    return fail();
  }
  if (!S.TEST) err(null, 'Missing the first line "TEST: b2 | LEVEL: B2 | TITLE: ...".', 'ناقص السطر الأول "TEST: b2 | LEVEL: B2 | TITLE: ...".');
  else {
    if (!S.LEVEL) err(S.TEST.line, 'Missing "LEVEL:" (e.g. LEVEL: B2).', 'ناقص "LEVEL:" (مثال: LEVEL: B2).');
    if (!S.TITLE) err(S.TEST.line, 'Missing "TITLE:".', 'ناقص "TITLE:".');
  }
  if (errors.length) return fail();

  const { buffer, lineMap } = await buildWorkbook(st);
  if (errors.length) return fail();

  const result = await parsePlacementTestWorkbook(buffer);
  const remap = (e) => {
    const map = lineMap[SHEET_TO_MAP[e.sheet]];
    const line = e.row && map ? map[e.row] || null : null;
    return { ...e, line, excerpt: line ? String(st.lines[line - 1] || "").trim().slice(0, 70) : "" };
  };
  const allWarnings = [...warnings, ...result.warnings.map(remap)];
  if (!result.ok) return { ok: false, errors: result.errors.map(remap), warnings: allWarnings, test: null, stats: null, format: "pdf" };
  return { ...result, warnings: allWarnings, format: "pdf" };
}

// PDF → نص. بنحافظ على الفواصل بين الفقرات (سطر فاضي) عن طريق قياس المسافة الرأسية بين السطور.
const PAGE_SENTINEL = "\u0000PAGE\u0000";
async function renderPageText(pageData) {
  const tc = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
  const rows = [];
  for (const it of tc.items) {
    if (!it.str && it.str !== " ") continue;
    const y = it.transform[5];
    const x = it.transform[4];
    const h = Math.abs(it.height || it.transform[3]) || 10;
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - y) < h * 0.4) {
      const gap = x - last.endX;
      const needSpace = gap > h * 0.25 && !/\s$/.test(last.text) && !/^\s/.test(it.str);
      last.text += (needSpace ? " " : "") + it.str;
      last.endX = x + (it.width || 0);
    } else {
      rows.push({ y, h, text: it.str, endX: x + (it.width || 0) });
    }
  }
  const gaps = [];
  for (let i = 1; i < rows.length; i++) gaps.push(Math.abs(rows[i - 1].y - rows[i].y));
  const sorted = [...gaps].sort((a, b) => a - b);
  const base = sorted.length ? sorted[Math.floor(sorted.length * 0.3)] : 0;
  let out = "";
  rows.forEach((r, i) => {
    if (i === 0) out += r.text;
    else out += (base && gaps[i - 1] > base * 1.4 ? "\n\n" : "\n") + r.text;
  });
  return PAGE_SENTINEL + out;
}

export async function extractPdfText(buffer) {
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = mod.default || mod;
  const data = await pdfParse(buffer, { pagerender: renderPageText });
  return String(data.text || "")
    .replace(/\n*\u0000PAGE\u0000/g, "\n") // حدود الصفحات = سطر عادي (مش فقرة جديدة)
    .replace(/^\n+/, "");
}

export async function parsePlacementTestPdf(buffer) {
  let text;
  try {
    text = await extractPdfText(buffer);
  } catch {
    return {
      ok: false,
      errors: [{ sheet: "PDF", row: null, line: null, excerpt: "", en: "Could not read this PDF. Export it again from Word/Docs as a text PDF.", ar: "تعذّرت قراءة ملف الـ PDF. صدّره تاني من Word/Docs كـ PDF نصّي." }],
      warnings: [],
      test: null,
      stats: null,
      format: "pdf",
    };
  }
  return parsePlacementTestText(text);
}

// ───────────────────────── 4) اختبار موجود → نص بنفس الصيغة ─────────────────────────
// بيستخدم للقالب وللتصدير (والـ round-trip في الاختبارات). الفقرات (\\n\\n) بتتكتب بسطر فاضي بينهم.
export function testToPlacementText(test, { comments = [] } = {}) {
  const out = [];
  const push = (s = "") => out.push(s);
  // "\n\n" → سطر فاضي (فقرة) · "\n" مفرد → الرمز \n جوه السطر (الـ PDF مبيفرّقش بين سطر جديد والتفاف عادي، فبنكتبه صراحةً)
  const esc = (v) => String(v).replace(/\n/g, "\\n");
  const multi = (key, value) => {
    String(value)
      .split("\n\n")
      .forEach((para, i) => {
        if (i === 0) push(`${key}: ${esc(para)}`);
        else {
          push("");
          push(esc(para));
        }
      });
  };
  for (const c of comments) push(`# ${c}`);
  if (comments.length) push("");

  const head = [`TEST: ${test.id}`, `LEVEL: ${test.label}`, `TITLE: ${test.title}`];
  if (test.subject) head.push(`LANGUAGE: ${test.subject}`);
  const thr = test.thresholds || DEFAULT_THRESHOLDS;
  if (thr.join(",") !== DEFAULT_THRESHOLDS.join(",")) head.push(`THRESHOLDS: ${thr.join(",")}`);
  push(head.join(" | "));

  const slotDef = (slot) => (test.audioSlots || []).find((a) => a.slot === slot);
  const emitted = new Set();
  const marker = (slot) => {
    const d = slotDef(slot);
    const label = d?.label && d.label !== `Audio ${slot}` ? `: ${String(d.label).replace(/\]/g, ")")}` : "";
    push(`[AUDIO ${slot}${label}]`);
    const script = test.scripts?.[slot];
    if (script && !emitted.has(slot)) multi("SCRIPT", script);
    emitted.add(slot);
  };

  for (const part of test.parts) {
    push("");
    push(`PART: ${part.title}${part.minutes ? ` | ${part.minutes}` : ""}`);
    for (const task of part.tasks) {
      push("");
      push(`TASK: ${task.title}`);
      if (task.audioSlot !== undefined) marker(task.audioSlot);
      if (task.intro) multi("INSTRUCTIONS", task.intro);
      if (task.passage) multi("PASSAGE", task.passage);
      if (task.bank?.length) {
        push("BANK:");
        for (const b of task.bank) push(`(${b.l}) ${esc(b.t)}`);
      }
      let prevSlot;
      for (const qq of task.questions) {
        push("");
        if (task.audioSlot === undefined) {
          if (qq.audioSlot !== undefined && qq.audioSlot !== prevSlot) marker(qq.audioSlot);
          else if (qq.audioSlot === undefined && prevSlot !== undefined) push("[NO AUDIO]");
          prevSlot = qq.audioSlot;
        }
        multi("Q", qq.q);
        if (qq.ctx) multi("CONTEXT", qq.ctx);
        const a = test.answerKey?.[qq.n]?.a ?? 0;
        if (task.bank?.length) {
          push(`ANSWER: ${OPTION_LETTERS[a]}`);
        } else {
          qq.o.forEach((o, i) => push(`${OPTION_LETTERS[i].toLowerCase()}) ${esc(o)}`));
          push(`ANSWER: ${OPTION_LETTERS[a].toLowerCase()}`);
        }
      }
    }
  }
  return `${out.join("\n")}\n`;
}
