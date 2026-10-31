// ═══════════════════════════════════════════════
//  app/lib/placementTestPdfTemplate.js
//  🆕 قالب PDF / TXT جاهز لرفع اختبار تحديد مستوى (الصيغة: placementTestPdfParser.js).
//    buildSampleTemplateText() → نص القالب (الشرح بالإنجليزي كسطور تعليق "#" بيتجاهلها القارئ + مثال شغّال)
//    buildSampleTemplatePdf()  → نفس النص كـ PDF نصّي (بيتقري بنجاح لو اترفع زي ما هو)
//    textToPdfBuffer(text)     → أي نص بالصيغة → PDF (بنستخدمه في الاختبارات كمان)
//  الشرح العربي الكامل في README-PLACEMENT-PDF-AR.md.
//  ⚠️ الخط Helvetica (WinAnsi): حروف لاتينية بس (إنجليزي/إسباني/فرنسي..). الأحرف الغريبة بتتبدّل بـ "?".
//  سيرفر بس.
// ═══════════════════════════════════════════════

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { testToPlacementText } from "@/app/lib/placementTestPdfParser";
import { SAMPLE_TEST } from "@/app/lib/placementTestTemplate";

export const TEMPLATE_GUIDE = [
  "HOW TO USE THIS FILE: edit the example below (keep the keywords), export as a TEXT PDF from Word / Google Docs, then upload it in Admin > Level Tests.",
  "Lines starting with # are comments and are ignored. Do not use scanned images. Use single line spacing, and no headers / footers.",
  "",
  "KEYWORDS (one per line):",
  "TEST: c1 | LEVEL: C1 | TITLE: ... | LANGUAGE: es | THRESHOLDS: 40,60,80   <- first line (LANGUAGE and THRESHOLDS are optional)",
  "PART: name | minutes      TASK: name      INSTRUCTIONS: ...      PASSAGE: ...   (INSTRUCTIONS / PASSAGE are shared by the whole task)",
  "Q: question text      CONTEXT: text for this question only (optional)      a) ... b) ... c) ... (2 to 6 options)      ANSWER: b",
  "Matching task: write BANK: and then one line per text, like (A) text, then questions with no options: Q: ... ANSWER: C",
  "",
  "AUDIO: [AUDIO] covers the questions after it, until the next marker or the end of the task.",
  "  - one marker under TASK, before the first question = one recording for the whole task",
  "  - a marker before a Q: line (or inside a question) = a recording for that question and the following ones",
  "  - a marker after PART and before the first TASK = one recording for every task of the part that has no marker of its own",
  "  - [AUDIO] numbers recordings automatically (1, 2, 3...). Write [AUDIO 5] to fix the number, so uploaded files never get mixed up when you add a new spot.",
  "  - [AUDIO 5: Name] sets the label shown in the admin panel.  [NO AUDIO] stops the recording above from covering the next questions.",
  "  - SCRIPT: text of the recording (admin only, never shown to students), right after the marker.",
  "After saving, upload the audio files from Admin > Level Tests > Audio & results (same as before).",
];

export function buildSampleTemplateText() {
  return testToPlacementText(SAMPLE_TEST, { comments: TEMPLATE_GUIDE });
}

const A4 = [595.28, 841.89];
const MARGIN = 50;
const SIZE = 10;
const LEADING = 14;

function safe(font, text) {
  let out = "";
  for (const ch of String(text)) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

function wrap(font, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && font.widthOfTextAtSize(next, SIZE) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  lines.push(cur);
  return lines;
}

export async function textToPdfBuffer(text, { title = "Level test" } = {}) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const maxWidth = A4[0] - MARGIN * 2;
  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;
  const newPage = () => {
    page = pdf.addPage(A4);
    y = A4[1] - MARGIN;
  };
  for (const raw of String(text).split("\n")) {
    if (!raw.trim()) {
      y -= LEADING; // سطر فاضي = فراغ كامل (القارئ بيفهمه كفقرة جديدة)
      if (y < MARGIN) newPage();
      continue;
    }
    const isComment = raw.trim().startsWith("#");
    const body = safe(font, isComment ? raw.trim().replace(/^#\s?/, "") : raw);
    const prefix = isComment ? "# " : "";
    const lines = wrap(font, body, maxWidth - (isComment ? font.widthOfTextAtSize(prefix, SIZE) : 0));
    for (const line of lines) {
      if (y < MARGIN) newPage();
      page.drawText(prefix + line, { x: MARGIN, y, size: SIZE, font, color: isComment ? rgb(0.4, 0.4, 0.4) : rgb(0, 0, 0) });
      y -= LEADING;
    }
  }
  return Buffer.from(await pdf.save());
}

export async function buildSampleTemplatePdf() {
  return textToPdfBuffer(buildSampleTemplateText(), { title: "Level test template" });
}
