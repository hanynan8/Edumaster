// ═══════════════════════════════════════════════
//  app/lib/placementTestTemplate.js
//  🆕 بناء ملف Excel (.xlsx) لاختبار تحديد المستوى:
//    - buildSampleTemplate()      → قالب جاهز فيه مثال صغير شغّال (الأدمن بيحمّله، يمسح المثال، ويكتب أسئلته)
//    - buildTestWorkbook(test)    → تصدير اختبار موجود (بإجاباته) لملف Excel قابل للتعديل وإعادة الرفع
//  نفس الشكل اللي placementTestImport.js بيقراه (المواصفات في placementTestSheetSpec.js).
//  ⚠️ سيرفر بس — التصدير فيه مفتاح الإجابات ونصوص التسجيلات (للأدمن بس).
// ═══════════════════════════════════════════════

import ExcelJS from "exceljs";
import {
  SHEETS,
  QUESTION_COLUMNS,
  BANK_COLUMNS,
  AUDIO_COLUMNS,
  SETTINGS_ROWS,
  SUBJECT_CODES,
  OPTION_LETTERS,
  DEFAULT_THRESHOLDS,
  MAX_QUESTIONS,
} from "@/app/lib/placementTestSheetSpec";
import { CEFR_BASES } from "@/app/lib/placementLevels";

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
const HEADER_FONT = { color: { argb: "FFFFFFFF" }, bold: true };
const KEY_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 22;
}

function addTable(ws, columns) {
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const header = ws.getRow(1);
  styleHeader(header);
  columns.forEach((c, i) => {
    if (c.note) header.getCell(i + 1).note = c.note;
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

const README_LINES = [
  ["title", "طريقة رفع اختبار تحديد مستوى جديد · How to upload a new level test"],
  ["h", "الفكرة"],
  ["p", "املأ هذا الملف (بدون تغيير أسماء الشيتات أو أسماء الأعمدة) ثم ارفعه من: لوحة الأدمن ← Level Tests ← Manage tests. النظام بيعرض لك معاينة وأي أخطاء قبل ما يتم النشر."],
  ["h", "1) شيت Settings"],
  ["p", "املأ: Test ID (مثلاً b1) · Level (CEFR) · Test Title · Subject (اختياري) · Level thresholds (اختياري)."],
  ["h", "2) شيت Questions — صف لكل سؤال"],
  ["p", "Part = الجزء (Reading / Listening / ...) · Task = المهمة داخل الجزء. الأسئلة اللي ليها نفس Task بتتجمع مع بعض. لو سبت Part أو Task فاضي بياخد نفس اللي فوقه."],
  ["p", "Task Instructions و Passage: اكتبهم في أول سؤال من المهمة فقط (التعليمات + النص المشترك لأسئلة المهمة)."],
  ["p", "Question + Option A…F (من 2 لـ 6 خيارات) + Correct Answer (حرف الإجابة الصحيحة A–F، أو نص الخيار نفسه)."],
  ["p", "Context: نص خاص بالسؤال ده بس (رسالة قصيرة مثلاً) بيظهر فوق السؤال."],
  ["h", "3) مهام الربط (Matching)"],
  ["p", "لو المهمة عبارة عن نصوص/إعلانات (A–I) والطالب بيربط كل سؤال بالنص المناسب: اكتب النصوص في شيت Bank (Part + Task بنفس الاسم في شيت Questions) وسيب Option A–F فاضية. الإجابة الصحيحة = حرف النص من Bank."],
  ["h", "4) التسجيلات الصوتية (Listening)"],
  ["p", "حدد مكان التسجيل برقمه: Task Audio Slot = تسجيل واحد لكل المهمة · Question Audio Slot = تسجيل لسؤال واحد (لو كل سؤال له تسجيل). متستخدمش الاتنين في نفس المهمة."],
  ["p", "في شيت Audio اكتب اسم كل تسجيل (Label) ونص التسجيل (Script، اختياري وبيظهر للأدمن بس). بعد نشر الاختبار هترفع ملفات الصوت من لوحة الأدمن لكل رقم. السؤال/المهمة اللي صوتها لسه ما اترفعش بتتخفي من الاختبار لحد ما يتّرفع."],
  ["h", "5) بعد الرفع"],
  ["p", "من لوحة الأدمن: ارفع الصوتيات · اختار الكورسات اللي الاختبار هيظهر عليها (زرار اختبر مستواك) · انشر/أخفِ الاختبار · نزّل الاختبار كملف Excel لتعديله."],
  ["title", "Quick guide (English)"],
  ["p", "Fill Settings, then one row per question in Questions (Part, Task, Question, Option A–F, Correct Answer). Optional: Task Instructions / Passage (first row of a task), matching banks in Bank, recording slots in Audio. Upload from Admin → Level Tests → Manage tests; you will get a preview and any errors before publishing."],
];

function buildReadme(wb) {
  const ws = wb.addWorksheet(SHEETS.readme, { views: [{ rightToLeft: true, showGridLines: false }] });
  ws.getColumn(1).width = 130;
  for (const [kind, text] of README_LINES) {
    const row = ws.addRow([text]);
    const cell = row.getCell(1);
    cell.alignment = { wrapText: true, vertical: "top", horizontal: "right", readingOrder: "rtl" };
    if (kind === "title") cell.font = { bold: true, size: 14, color: { argb: "FF4338CA" } };
    else if (kind === "h") cell.font = { bold: true, size: 12 };
  }
}

// def (شكل نتيجة parsePlacementTestWorkbook) → ورقة Settings
function buildSettings(wb, t) {
  const ws = wb.addWorksheet(SHEETS.settings);
  ws.columns = [
    { header: "Key", key: "k", width: 22 },
    { header: "Value", key: "v", width: 44 },
    { header: "Notes / ملاحظات", key: "n", width: 100 },
  ];
  styleHeader(ws.getRow(1));
  const values = {
    "Test ID": t.id,
    "Level (CEFR)": t.label,
    "Test Title": t.title,
    Subject: t.subject || "es",
    "Level thresholds": (t.thresholds || DEFAULT_THRESHOLDS).join(","),
  };
  for (const s of SETTINGS_ROWS) {
    const row = ws.addRow([s.key, values[s.key], s.note]);
    row.getCell(1).fill = KEY_FILL;
    row.getCell(1).font = { bold: true };
    row.getCell(3).alignment = { wrapText: true, vertical: "top" };
  }
  // ترتيب الصفوف حسب SETTINGS_ROWS: 2=Test ID · 3=Level · 4=Title · 5=Subject · 6=Thresholds
  ws.getCell("B3").dataValidation = { type: "list", allowBlank: false, formulae: [`"${CEFR_BASES.join(",")}"`] };
  ws.getCell("B5").dataValidation = { type: "list", allowBlank: true, formulae: [`"${SUBJECT_CODES.join(",")}"`] };
}

function buildQuestions(wb, t) {
  const ws = wb.addWorksheet(SHEETS.questions);
  addTable(ws, QUESTION_COLUMNS);
  const colIndex = Object.fromEntries(QUESTION_COLUMNS.map((c, i) => [c.key, i + 1]));
  let rowNo = 1;
  for (const part of t.parts) {
    let firstOfPart = true;
    for (const task of part.tasks) {
      let firstOfTask = true;
      const isMatch = Array.isArray(task.bank) && task.bank.length > 0;
      for (const q of task.questions) {
        const correctIdx = t.answerKey?.[q.n]?.a ?? 0;
        const row = ws.addRow({
          part: part.title,
          partMinutes: firstOfPart ? part.minutes : undefined,
          task: task.title,
          taskIntro: firstOfTask ? task.intro || undefined : undefined,
          passage: firstOfTask ? task.passage || undefined : undefined,
          taskAudio: firstOfTask && task.audioSlot !== undefined ? task.audioSlot : undefined,
          questionAudio: q.audioSlot,
          question: q.q,
          context: q.ctx,
          optA: isMatch ? undefined : q.o[0],
          optB: isMatch ? undefined : q.o[1],
          optC: isMatch ? undefined : q.o[2],
          optD: isMatch ? undefined : q.o[3],
          optE: isMatch ? undefined : q.o[4],
          optF: isMatch ? undefined : q.o[5],
          correct: OPTION_LETTERS[correctIdx] || "A",
        });
        rowNo = row.number;
        row.alignment = { vertical: "top", wrapText: true };
        row.getCell(colIndex.correct).alignment = { vertical: "top", horizontal: "center" };
        firstOfPart = false;
        firstOfTask = false;
      }
    }
  }
  // قايمة منسدلة للإجابة الصحيحة (لحد MAX_QUESTIONS + هامش)
  const last = Math.max(rowNo + 100, 120);
  const col = colIndex.correct;
  for (let r = 2; r <= Math.min(last, MAX_QUESTIONS + 50); r++) {
    ws.getCell(r, col).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${OPTION_LETTERS.split("").join(",")}"`],
    };
  }
}

function buildBank(wb, t) {
  const ws = wb.addWorksheet(SHEETS.bank);
  addTable(ws, BANK_COLUMNS);
  for (const part of t.parts) {
    for (const task of part.tasks) {
      for (const b of task.bank || []) {
        const row = ws.addRow({ part: part.title, task: task.title, letter: b.l, text: b.t });
        row.alignment = { vertical: "top", wrapText: true };
      }
    }
  }
}

function buildAudio(wb, t) {
  const ws = wb.addWorksheet(SHEETS.audio);
  addTable(ws, AUDIO_COLUMNS);
  for (const a of t.audioSlots || []) {
    const row = ws.addRow({ slot: a.slot, label: a.label, hint: a.hint, script: t.scripts?.[a.slot] });
    row.alignment = { vertical: "top", wrapText: true };
  }
}

// تصدير تعريف اختبار (parse-shape: parts + answerKey + audioSlots + scripts) لـ workbook
export async function buildTestWorkbook(test, { readme = false } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Edumaster Admin";
  wb.created = new Date();
  if (readme) buildReadme(wb);
  buildSettings(wb, test);
  buildQuestions(wb, test);
  buildBank(wb, test);
  buildAudio(wb, test);
  return wb;
}

export async function testToXlsxBuffer(test, opts) {
  const wb = await buildTestWorkbook(test, opts);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ───────── المثال اللي في القالب ─────────
// اختبار صغير بالإنجليزي: قراءة (اختيار من متعدد + ربط) + استماع (تسجيل لمهمة + تسجيل لكل سؤال) + قواعد.
const L = OPTION_LETTERS;
export const SAMPLE_TEST = (() => {
  const key = {};
  let n = 0;
  const q = (ln, text, options, correct, extra = {}) => {
    n += 1;
    key[n] = { a: correct };
    return { n, ln, q: text, ...(extra.ctx ? { ctx: extra.ctx } : {}), o: options, ...(extra.audioSlot ? { audioSlot: extra.audioSlot } : {}) };
  };
  const bank = [
    "SWIMMING POOL — Open every day from 7:00 to 21:00. Children under 8 must be with an adult.",
    "PIANO LESSONS — Private lessons for beginners. Call after 5 p.m.",
    "LOST DOG — Brown dog lost near the park on Monday. Please call if you see him.",
    "BOOK SALE — All books half price this weekend at the town library.",
  ].map((t, i) => ({ l: L[i], t }));

  const readTask1 = {
    title: "Task 1",
    intro: "Read the text and choose the correct option.",
    passage: "Hi Sam! I moved to a new flat last week. It is small but very bright, and the metro station is five minutes away. Come and visit on Saturday!",
    questions: [
      q(1, "What does the writer like about the flat?", ["It is big.", "It is bright and close to the metro.", "It is cheap."], 1),
      q(2, "When does the writer invite Sam?", ["On Saturday.", "Next week.", "Tomorrow."], 0),
    ],
  };
  const readTask2 = {
    title: "Task 2",
    intro: "Match each person with the right notice (A–D). There is one extra notice.",
    bank,
    questions: [
      q(3, "Anna wants to learn a musical instrument.", L.slice(0, 4).split(""), 1),
      q(4, "Tom wants cheap books.", L.slice(0, 4).split(""), 3),
      q(5, "Mia has found a pet in the street.", L.slice(0, 4).split(""), 2),
    ],
  };
  const listenTask1 = {
    title: "Task 1",
    intro: "Listen to the conversation and choose A, B or C. (One recording for the whole task.)",
    audioSlot: 1,
    questions: [
      q(1, "Where are the speakers?", ["At a station.", "In a shop.", "At school."], 1),
      q(2, "How much is the jacket?", ["20 euros.", "25 euros.", "30 euros."], 1),
    ],
  };
  const listenTask2 = {
    title: "Task 2",
    intro: "Listen to each message separately. (One recording per question.)",
    questions: [
      q(3, "Why is the man calling?", ["To cancel a meeting.", "To change the time.", "To say thanks."], 1, { audioSlot: 2 }),
      q(4, "What must the girl bring?", ["Her passport.", "Her book.", "Her phone."], 0, { audioSlot: 3 }),
    ],
  };
  const grammar = {
    title: "Task 1",
    intro: "Choose the correct option.",
    questions: [
      q(1, "She ___ to work every day.", ["go", "goes", "going"], 1),
      q(2, "We ___ dinner when the phone rang.", ["were having", "have", "are having", "had had"], 0),
    ],
  };
  return {
    id: "sample-b1",
    label: "B1",
    title: "Sample level test B1",
    subject: "en",
    thresholds: DEFAULT_THRESHOLDS,
    parts: [
      { id: "part-1", title: "Reading", minutes: 20, tasks: [readTask1, readTask2] },
      { id: "part-2", title: "Listening", minutes: 15, tasks: [listenTask1, listenTask2] },
      { id: "part-3", title: "Grammar", minutes: 10, tasks: [grammar] },
    ],
    answerKey: key,
    audioSlots: [
      { slot: 1, label: "Audio 1 — At the shop", hint: "Listening › Task 1" },
      { slot: 2, label: "Message 1", hint: "Listening › Task 2 › Q1" },
      { slot: 3, label: "Message 2", hint: "Listening › Task 2 › Q2" },
    ],
    scripts: {
      1: "Customer: Excuse me, how much is this jacket?\nShop assistant: It is thirty euros, but today it has a discount. You pay twenty-five.",
    },
  };
})();

// قالب جاهز للتحميل: README + Settings + Questions + Bank + Audio، وفيه المثال الصغير اللي فوق.
export async function buildSampleTemplate() {
  const wb = await buildTestWorkbook(SAMPLE_TEST, { readme: true });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
