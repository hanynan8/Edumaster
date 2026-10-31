// ═══════════════════════════════════════════════
//  app/lib/placementTestImport.js
//  🆕 قراءة ملف Excel (.xlsx) اللي الأدمن بيرفعه والتحقق منه وتحويله لتعريف اختبار تحديد مستوى
//  بنفس هيكل A1/A2 بالظبط (parts → tasks → questions) + مفتاح الإجابات + خانات الصوت.
//  شكل الملف: شوف placementTestSheetSpec.js (وقالب جاهز من placementTestTemplate.js).
//
//  parsePlacementTestWorkbook(buffer) → { ok, errors, warnings, test, stats }
//    errors   : [{ sheet, row, en, ar }] — لو فيه أي خطأ، ok=false ومفيش test.
//    warnings : نفس الشكل — مش بتمنع الحفظ.
//    test     : { id, label, title, subject, thresholds, parts, answerKey, audioSlots, scripts, levels }
//               🔒 answerKey و scripts للسيرفر بس (متتبعتش للمتصفح — شوف customPlacementTests.js).
//  سيرفر بس (exceljs).
// ═══════════════════════════════════════════════

import ExcelJS from "exceljs";
import { buildStandardLevels, CEFR_BASES } from "@/app/lib/placementLevels";
import {
  SHEETS,
  RESERVED_TEST_IDS,
  TEST_ID_RE,
  MAX_QUESTIONS,
  MAX_AUDIO_SLOT,
  MAX_OPTIONS,
  MAX_BANK,
  DEFAULT_PART_MINUTES,
  DEFAULT_THRESHOLDS,
  SUBJECT_CODES,
  OPTION_LETTERS,
  LIMITS,
  QUESTION_COLUMNS,
  BANK_COLUMNS,
  AUDIO_COLUMNS,
  normHeader,
  cellText,
} from "@/app/lib/placementTestSheetSpec";

const OPT_KEYS = ["optA", "optB", "optC", "optD", "optE", "optF"];
const ARABIC_LETTERS = { "أ": 0, "ا": 0, "ب": 1, "ج": 2, "د": 3, "ه": 4, "هـ": 4, "و": 5 };

function findSheet(wb, name) {
  const want = normHeader(name);
  return wb.worksheets.find((ws) => normHeader(ws.name) === want) || null;
}

// بيقرا جدول: بيدوّر في أول 10 صفوف على صف العناوين (اللي فيه أكتر عدد أعمدة معروفة) وبعدها كل صف بيتحوّل
// لـ { row, v: { key: text } }. الصفوف الفاضية بتتتخطّى.
function readTable(ws, columns) {
  if (!ws) return { rows: [], found: false };
  const byNorm = new Map(columns.map((c) => [normHeader(c.header), c.key]));
  let headerRow = 0;
  let best = 0;
  let colMap = null;
  const limit = Math.min(ws.rowCount, 10);
  for (let r = 1; r <= limit; r++) {
    const map = {};
    let hits = 0;
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell, col) => {
      const key = byNorm.get(normHeader(cellText(cell.value)));
      if (key && map[key] === undefined) {
        map[key] = col;
        hits += 1;
      }
    });
    if (hits > best) {
      best = hits;
      headerRow = r;
      colMap = map;
    }
  }
  if (!headerRow || best < 2) return { rows: [], found: false };
  const rows = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const v = {};
    let any = false;
    for (const [key, col] of Object.entries(colMap)) {
      const t = cellText(row.getCell(col).value);
      v[key] = t;
      if (t) any = true;
    }
    if (any) rows.push({ row: r, v });
  }
  return { rows, found: true, colMap };
}

function readSettings(ws) {
  const out = {};
  if (!ws) return out;
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const key = normHeader(cellText(row.getCell(1).value));
    if (!key) continue;
    out[key] = { value: cellText(row.getCell(2).value), row: r };
  }
  return out;
}

function parseInt1(text) {
  if (!/^\d+$/.test(String(text).trim())) return null;
  return Number(text);
}

// "40,60,80" / "40/60/80" / "40 60 80" → [40,60,80] أو null لو غلط
function parseThresholds(text) {
  const parts = String(text).split(/[\s,;/|-]+/).filter(Boolean).map(Number);
  if (parts.length !== 3) return null;
  if (!parts.every((n) => Number.isInteger(n) && n >= 1 && n <= 99)) return null;
  if (!(parts[0] < parts[1] && parts[1] < parts[2])) return null;
  return parts;
}

// الإجابة الصحيحة → index (A=0...) أو -1. optionTexts = نصوص الخيارات (للمقارنة بالنص)، count = عدد الخيارات المتاحة.
function parseCorrect(raw, optionTexts, count) {
  const t = String(raw || "").trim();
  if (!t) return -1;
  const clean = t.replace(/[).:\s]+$/g, "").trim();
  if (/^[A-Za-z]$/.test(clean)) {
    const i = OPTION_LETTERS.indexOf(clean.toUpperCase());
    return i >= 0 && i < count ? i : -1;
  }
  if (ARABIC_LETTERS[clean] !== undefined) {
    const i = ARABIC_LETTERS[clean];
    return i < count ? i : -1;
  }
  if (/^\d$/.test(clean)) {
    const i = Number(clean) - 1;
    return i >= 0 && i < count ? i : -1;
  }
  if (optionTexts) {
    const norm = (x) => String(x).toLowerCase().replace(/\s+/g, " ").trim();
    const idx = optionTexts.findIndex((o) => norm(o) === norm(t));
    if (idx >= 0) return idx;
  }
  return -1;
}

export async function parsePlacementTestWorkbook(input) {
  const errors = [];
  const warnings = [];
  const err = (sheet, row, en, ar) => errors.push({ sheet, row: row || null, en, ar });
  const warn = (sheet, row, en, ar) => warnings.push({ sheet, row: row || null, en, ar });
  const fail = () => ({ ok: false, errors, warnings, test: null, stats: null });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(input);
  } catch {
    err("File", null, "This is not a valid .xlsx file. Use the template downloaded from the admin panel.", "الملف مش ملف Excel (.xlsx) صالح. استخدم القالب المحمّل من لوحة الأدمن.");
    return fail();
  }

  // ───────── Settings ─────────
  const settingsWs = findSheet(wb, SHEETS.settings);
  const questionsWs = findSheet(wb, SHEETS.questions);
  if (!settingsWs) err(SHEETS.settings, null, 'Sheet "Settings" is missing.', 'شيت "Settings" مش موجود.');
  if (!questionsWs) err(SHEETS.questions, null, 'Sheet "Questions" is missing.', 'شيت "Questions" مش موجود.');
  if (errors.length) return fail();

  const st = readSettings(settingsWs);
  const get = (...names) => {
    for (const n of names) if (st[normHeader(n)]) return st[normHeader(n)];
    return { value: "", row: null };
  };

  const idCell = get("Test ID", "id");
  const testId = idCell.value.toLowerCase().trim();
  if (!testId) err(SHEETS.settings, idCell.row, "Test ID is required.", "حقل Test ID مطلوب.");
  else if (!TEST_ID_RE.test(testId))
    err(SHEETS.settings, idCell.row, "Test ID must be 1–30 lowercase letters/numbers/dashes (e.g. c1).", "الـ Test ID لازم يكون حروف إنجليزي صغيرة وأرقام وشرطة فقط (1–30 حرف)، مثال: c1.");
  else if (RESERVED_TEST_IDS.includes(testId))
    err(SHEETS.settings, idCell.row, `Test ID "${testId}" is reserved for the built-in test. Choose another (e.g. ${testId}-new).`, `الـ ID "${testId}" محجوز للاختبار الأصلي. اختار اسم تاني (مثلاً ${testId}-new).`);

  const levelCell = get("Level (CEFR)", "Level", "CEFR");
  const level = levelCell.value.toUpperCase().trim();
  if (!CEFR_BASES.includes(level))
    err(SHEETS.settings, levelCell.row, `Level (CEFR) must be one of ${CEFR_BASES.join(", ")}.`, `المستوى لازم يكون واحد من: ${CEFR_BASES.join(", ")}.`);

  const titleCell = get("Test Title", "Title");
  const title = titleCell.value.trim();
  if (!title) err(SHEETS.settings, titleCell.row, "Test Title is required.", "عنوان الاختبار (Test Title) مطلوب.");
  else if (title.length > LIMITS.title) err(SHEETS.settings, titleCell.row, `Test Title is too long (max ${LIMITS.title}).`, `عنوان الاختبار طويل جدًا (أقصى ${LIMITS.title} حرف).`);

  const subjectCell = get("Subject", "Language");
  const subject = (subjectCell.value || "es").toLowerCase().trim();
  if (!SUBJECT_CODES.includes(subject))
    err(SHEETS.settings, subjectCell.row, `Subject must be one of ${SUBJECT_CODES.join(", ")}.`, `Subject لازم يكون واحد من: ${SUBJECT_CODES.join(", ")}.`);

  const thrCell = get("Level thresholds", "Thresholds");
  let thresholds = DEFAULT_THRESHOLDS;
  if (thrCell.value) {
    const parsed = parseThresholds(thrCell.value);
    if (!parsed) err(SHEETS.settings, thrCell.row, "Level thresholds must be 3 increasing numbers between 1 and 99, e.g. 40,60,80.", "حدود المستويات لازم تكون 3 أرقام تصاعدية بين 1 و99، مثال: 40,60,80.");
    else thresholds = parsed;
  }

  // ───────── Bank (مهام الربط) ─────────
  const bankTable = readTable(findSheet(wb, SHEETS.bank), BANK_COLUMNS);
  const banks = new Map(); // "part|task" → [{ l, t }]
  {
    let lastPart = "";
    let lastTask = "";
    for (const { row, v } of bankTable.rows) {
      const part = v.part || lastPart;
      const task = v.task || lastTask;
      lastPart = part;
      lastTask = task;
      if (!part || !task) {
        err(SHEETS.bank, row, "Part and Task are required in the Bank sheet.", "اسم الجزء والمهمة (Part / Task) مطلوبين في شيت Bank.");
        continue;
      }
      if (!v.text) {
        err(SHEETS.bank, row, "Text is empty.", "عمود Text فاضي.");
        continue;
      }
      if (v.text.length > LIMITS.bankText) err(SHEETS.bank, row, `Text is too long (max ${LIMITS.bankText}).`, `النص طويل جدًا (أقصى ${LIMITS.bankText} حرف).`);
      const key = `${normHeader(part)}|${normHeader(task)}`;
      if (!banks.has(key)) banks.set(key, []);
      const list = banks.get(key);
      const expected = OPTION_LETTERS[list.length];
      if (v.letter && v.letter.replace(/[.)\s]/g, "").toUpperCase() !== expected)
        err(SHEETS.bank, row, `Letters must run A, B, C... in order (expected "${expected}").`, `الحروف لازم تكون A, B, C... بالترتيب (المتوقع "${expected}").`);
      if (list.length >= MAX_BANK) {
        err(SHEETS.bank, row, `A matching bank can have at most ${MAX_BANK} texts.`, `بنك الربط أقصى عدد نصوص فيه ${MAX_BANK}.`);
        continue;
      }
      list.push({ l: expected, t: v.text });
    }
  }
  const usedBanks = new Set();

  // ───────── Questions → parts/tasks ─────────
  const qTable = readTable(questionsWs, QUESTION_COLUMNS);
  if (!qTable.found) {
    err(SHEETS.questions, null, 'Could not find the header row in "Questions" (columns like Part, Task, Question, Correct Answer).', 'مش لاقي صف العناوين في شيت "Questions" (أعمدة زي Part, Task, Question, Correct Answer).');
    return fail();
  }
  const errorsBeforeColumns = errors.length;
  for (const needed of ["question", "correct"]) {
    if (qTable.colMap[needed] === undefined) {
      const col = QUESTION_COLUMNS.find((c) => c.key === needed).header;
      err(SHEETS.questions, null, `Column "${col}" is missing.`, `العمود "${col}" مش موجود.`);
    }
  }
  if (errors.length > errorsBeforeColumns) return fail();

  const partsMap = new Map(); // normPart → part
  const parts = [];
  let lastPartName = "";
  let lastTaskName = "";

  for (const { row, v } of qTable.rows) {
    const partName = v.part || lastPartName;
    const taskName = v.task || (v.part && v.part !== lastPartName ? "" : lastTaskName);
    lastPartName = partName;
    lastTaskName = taskName;

    if (!partName) {
      err(SHEETS.questions, row, "Part is empty (the first question must have a Part).", "عمود Part فاضي (أول سؤال لازم يكون له Part).");
      continue;
    }
    if (!taskName) {
      err(SHEETS.questions, row, "Task is empty (each part's first question must have a Task).", "عمود Task فاضي (أول سؤال في كل جزء لازم يكون له Task).");
      continue;
    }
    if (!v.question) {
      err(SHEETS.questions, row, "Question text is empty.", "نص السؤال (Question) فاضي.");
      continue;
    }
    if (partName.length > LIMITS.partTitle) err(SHEETS.questions, row, `Part name is too long (max ${LIMITS.partTitle}).`, `اسم الجزء طويل جدًا (أقصى ${LIMITS.partTitle}).`);
    if (taskName.length > LIMITS.taskTitle) err(SHEETS.questions, row, `Task name is too long (max ${LIMITS.taskTitle}).`, `اسم المهمة طويل جدًا (أقصى ${LIMITS.taskTitle}).`);
    if (v.question.length > LIMITS.question) err(SHEETS.questions, row, `Question is too long (max ${LIMITS.question}).`, `السؤال طويل جدًا (أقصى ${LIMITS.question}).`);
    if (v.context.length > LIMITS.context) err(SHEETS.questions, row, `Context is too long (max ${LIMITS.context}).`, `الـ Context طويل جدًا (أقصى ${LIMITS.context}).`);
    if (v.passage.length > LIMITS.passage) err(SHEETS.questions, row, `Passage is too long (max ${LIMITS.passage}).`, `الـ Passage طويل جدًا (أقصى ${LIMITS.passage}).`);
    if (v.taskIntro.length > LIMITS.intro) err(SHEETS.questions, row, `Task Instructions are too long (max ${LIMITS.intro}).`, `تعليمات المهمة طويلة جدًا (أقصى ${LIMITS.intro}).`);

    const pKey = normHeader(partName);
    let part = partsMap.get(pKey);
    if (!part) {
      part = { id: `part-${parts.length + 1}`, title: partName, minutes: null, tasks: [], _tasks: new Map() };
      partsMap.set(pKey, part);
      parts.push(part);
    }
    if (v.partMinutes) {
      const m = parseInt1(v.partMinutes);
      if (!m || m < 1 || m > 300) err(SHEETS.questions, row, "Part Minutes must be a whole number between 1 and 300.", "Part Minutes لازم يكون رقم صحيح بين 1 و300.");
      else if (part.minutes === null) part.minutes = m;
    }

    const tKey = normHeader(taskName);
    let task = part._tasks.get(tKey);
    if (!task) {
      task = { title: taskName, intro: "", passage: "", audioSlot: undefined, _rows: [], questions: [], _qaudio: false, _firstRow: row };
      part._tasks.set(tKey, task);
      part.tasks.push(task);
    }
    if (v.taskIntro) {
      if (!task.intro) task.intro = v.taskIntro;
      else if (task.intro !== v.taskIntro) warn(SHEETS.questions, row, "Task Instructions differ between rows of the same task — the first one is used.", "تعليمات المهمة مختلفة بين صفوف نفس المهمة — هيتم استخدام الأولى.");
    }
    if (v.passage) {
      if (!task.passage) task.passage = v.passage;
      else if (task.passage !== v.passage) warn(SHEETS.questions, row, "Passage differs between rows of the same task — the first one is used.", "الـ Passage مختلف بين صفوف نفس المهمة — هيتم استخدام الأول.");
    }

    // تسجيلات صوتية
    let qAudio;
    if (v.taskAudio) {
      const n = parseInt1(v.taskAudio);
      if (!n || n < 1 || n > MAX_AUDIO_SLOT) err(SHEETS.questions, row, `Task Audio Slot must be a number 1–${MAX_AUDIO_SLOT}.`, `Task Audio Slot لازم يكون رقم من 1 لـ ${MAX_AUDIO_SLOT}.`);
      else if (task.audioSlot === undefined) task.audioSlot = n;
      else if (task.audioSlot !== n) err(SHEETS.questions, row, "This task has two different Task Audio Slot numbers.", "المهمة دي فيها رقمين مختلفين في Task Audio Slot.");
    }
    if (v.questionAudio) {
      const n = parseInt1(v.questionAudio);
      if (!n || n < 1 || n > MAX_AUDIO_SLOT) err(SHEETS.questions, row, `Question Audio Slot must be a number 1–${MAX_AUDIO_SLOT}.`, `Question Audio Slot لازم يكون رقم من 1 لـ ${MAX_AUDIO_SLOT}.`);
      else {
        qAudio = n;
        task._qaudio = true;
      }
    }

    task._rows.push(row);
    task.questions.push({
      _row: row,
      q: v.question,
      ctx: v.context || undefined,
      audioSlot: qAudio,
      optionsRaw: OPT_KEYS.map((k) => v[k]),
      correctRaw: v.correct,
    });
  }

  if (!parts.length && !errors.length) {
    err(SHEETS.questions, null, "No questions found.", "مفيش أي أسئلة في شيت Questions.");
  }

  // ───────── بناء الهيكل النهائي + التحقق ─────────
  const answerKey = {};
  const usage = new Map(); // slot → ["Part › Task (Q1–Q5)", ...]
  const noteUsage = (slot, text) => {
    if (!usage.has(slot)) usage.set(slot, []);
    usage.get(slot).push(text);
  };
  let n = 0;
  let matchingTasks = 0;

  for (const part of parts) {
    let ln = 0;
    for (const task of part.tasks) {
      const bank = banks.get(`${normHeader(part.title)}|${normHeader(task.title)}`) || null;
      if (bank) usedBanks.add(`${normHeader(part.title)}|${normHeader(task.title)}`);
      const isMatch = Boolean(bank);
      if (isMatch) {
        matchingTasks += 1;
        if (bank.length < 2) err(SHEETS.bank, null, `Matching task "${task.title}" needs at least 2 texts in the Bank sheet.`, `مهمة الربط "${task.title}" محتاجة نصّين على الأقل في شيت Bank.`);
      }
      if (task.audioSlot !== undefined && task._qaudio)
        err(SHEETS.questions, task._firstRow, `Task "${task.title}" uses both Task Audio Slot and Question Audio Slot — use only one of them.`, `المهمة "${task.title}" فيها Task Audio Slot و Question Audio Slot مع بعض — استخدم واحد بس.`);

      const firstN = n + 1;
      const questions = [];
      for (const q of task.questions) {
        const row = q._row;
        n += 1;
        ln += 1;
        let options;
        let a = -1;
        if (isMatch) {
          options = bank.map((b) => b.l);
          if (q.optionsRaw.some(Boolean)) warn(SHEETS.questions, row, "Options are ignored for matching tasks (the Bank sheet is used).", "الخيارات بتتجاهل في مهام الربط (بيتم استخدام شيت Bank).");
          a = parseCorrect(q.correctRaw, null, options.length);
          if (a < 0) err(SHEETS.questions, row, `Correct Answer must be a bank letter (A–${options[options.length - 1] || "B"}).`, `الإجابة الصحيحة لازم تكون حرف من البنك (A–${options[options.length - 1] || "B"}).`);
        } else {
          // خيارات متتالية من A من غير فجوات
          const filled = q.optionsRaw.map((x) => Boolean(x));
          const lastIdx = filled.lastIndexOf(true);
          const gap = lastIdx >= 0 && filled.slice(0, lastIdx + 1).includes(false);
          options = q.optionsRaw.slice(0, lastIdx + 1);
          if (lastIdx < 1) err(SHEETS.questions, row, "A question needs at least 2 options (Option A and Option B).", "السؤال محتاج خيارين على الأقل (Option A و Option B).");
          else if (gap) err(SHEETS.questions, row, "Options must be filled in order without gaps (A, B, C...).", "الخيارات لازم تتملّى بالترتيب من غير فراغات (A, B, C...).");
          else {
            if (options.length > MAX_OPTIONS) err(SHEETS.questions, row, `At most ${MAX_OPTIONS} options.`, `أقصى عدد خيارات ${MAX_OPTIONS}.`);
            if (options.some((o) => o.length > LIMITS.option)) err(SHEETS.questions, row, `An option is too long (max ${LIMITS.option}).`, `أحد الخيارات طويل جدًا (أقصى ${LIMITS.option}).`);
            if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) warn(SHEETS.questions, row, "Two options have the same text.", "فيه خيارين بنفس النص.");
            a = parseCorrect(q.correctRaw, options, options.length);
            if (a < 0) err(SHEETS.questions, row, `Correct Answer must be a letter between A and ${OPTION_LETTERS[options.length - 1]} (or the exact option text).`, `الإجابة الصحيحة لازم تكون حرف من A لـ ${OPTION_LETTERS[options.length - 1]} (أو نص الخيار بالظبط).`);
          }
        }
        if (!q.correctRaw) err(SHEETS.questions, row, "Correct Answer is empty.", "الإجابة الصحيحة (Correct Answer) فاضية.");

        if (n > MAX_QUESTIONS) {
          err(SHEETS.questions, row, `Too many questions (max ${MAX_QUESTIONS}).`, `عدد الأسئلة أكبر من المسموح (أقصى ${MAX_QUESTIONS}).`);
          break;
        }
        answerKey[n] = { a: Math.max(a, 0) };
        const out = { n, ln, q: q.q };
        if (q.ctx) out.ctx = q.ctx;
        out.o = options;
        if (q.audioSlot !== undefined) {
          out.audioSlot = q.audioSlot;
          noteUsage(q.audioSlot, `${part.title} › ${task.title} › Q${ln}`);
        }
        questions.push(out);
      }
      if (task.audioSlot !== undefined) noteUsage(task.audioSlot, `${part.title} › ${task.title} (Q${firstN}–Q${n})`.replace(/Q(\d+)–Q\1\)/, "Q$1)"));
      task.questions = questions;
      // تنظيف الحقول الداخلية
      delete task._rows;
      delete task._qaudio;
      delete task._firstRow;
      if (!task.intro) delete task.intro;
      if (!task.passage) delete task.passage;
      if (task.audioSlot === undefined) delete task.audioSlot;
      if (isMatch) task.bank = bank.map((b) => ({ l: b.l, t: b.t }));
      if (!isMatch) delete task.bank;
    }
    delete part._tasks;
    if (part.minutes === null) part.minutes = DEFAULT_PART_MINUTES;
  }

  // بنوك مش مربوطة بمهمة
  for (const [key, list] of banks) {
    if (!usedBanks.has(key) && list.length) {
      warn(SHEETS.bank, null, "A group of Bank rows does not match any Part/Task in the Questions sheet — it is ignored. Check the spelling of Part and Task.", "فيه صفوف في شيت Bank مش مطابقة لأي Part/Task في شيت Questions — هتتجاهل. راجع كتابة اسم الجزء والمهمة.");
    }
  }

  // ───────── Audio ─────────
  const audioTable = readTable(findSheet(wb, SHEETS.audio), AUDIO_COLUMNS);
  const defined = new Map(); // slot → { label, hint, script }
  for (const { row, v } of audioTable.rows) {
    const slot = parseInt1(v.slot);
    if (!slot || slot < 1 || slot > MAX_AUDIO_SLOT) {
      err(SHEETS.audio, row, `Slot must be a number 1–${MAX_AUDIO_SLOT}.`, `Slot لازم يكون رقم من 1 لـ ${MAX_AUDIO_SLOT}.`);
      continue;
    }
    if (defined.has(slot)) {
      err(SHEETS.audio, row, `Slot ${slot} is listed twice.`, `الـ Slot ${slot} مكرر.`);
      continue;
    }
    if (v.label.length > LIMITS.label) err(SHEETS.audio, row, `Label is too long (max ${LIMITS.label}).`, `الـ Label طويل جدًا (أقصى ${LIMITS.label}).`);
    if (v.script.length > LIMITS.script) err(SHEETS.audio, row, `Script is too long (max ${LIMITS.script}).`, `الـ Script طويل جدًا (أقصى ${LIMITS.script}).`);
    defined.set(slot, { label: v.label, hint: v.hint, script: v.script });
  }
  const audioSlots = [];
  const scripts = {};
  const slotNumbers = [...new Set([...usage.keys(), ...defined.keys()])].sort((x, y) => x - y);
  for (const slot of slotNumbers) {
    const d = defined.get(slot);
    if (!usage.has(slot)) {
      warn(SHEETS.audio, null, `Audio slot ${slot} is not used by any task/question, so it is ignored.`, `التسجيل رقم ${slot} مش مستخدم في أي مهمة/سؤال فهيتجاهل.`);
      continue;
    }
    audioSlots.push({
      slot,
      label: d?.label || `Audio ${slot}`,
      hint: d?.hint || usage.get(slot).join(" · "),
    });
    if (d?.script) scripts[slot] = d.script;
  }

  // ───────── تحققات عامة ─────────
  const totalQuestions = Object.keys(answerKey).length;
  if (!errors.length) {
    if (totalQuestions < 1) err(SHEETS.questions, null, "No questions found.", "مفيش أي أسئلة في شيت Questions.");
    else if (totalQuestions < 5) warn(SHEETS.questions, null, "The test has fewer than 5 questions.", "الاختبار فيه أقل من 5 أسئلة.");
    if (audioSlots.length && !Object.keys(scripts).length) {
      /* الـ script اختياري — مفيش تحذير */
    }
  }
  if (errors.length) return fail();

  const levels = buildStandardLevels(level, thresholds);
  const test = {
    id: testId,
    label: level,
    title,
    subject,
    thresholds,
    parts: parts.map((p) => ({ id: p.id, title: p.title, minutes: p.minutes, tasks: p.tasks })),
    answerKey,
    audioSlots,
    scripts,
    levels,
  };
  const stats = {
    parts: parts.length,
    tasks: parts.reduce((s, p) => s + p.tasks.length, 0),
    questions: totalQuestions,
    matchingTasks,
    audioSlots: audioSlots.length,
  };
  return { ok: true, errors, warnings, test, stats };
}
