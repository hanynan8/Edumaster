// app/lib/certificateHelpers.js
//
// Phase 5 — Days 43-44:
//   - Day 43: "Design the Certificate template (dynamic PDF with student
//     name + course + date)" — generateCertificatePdf() draws a full
//     A4-landscape certificate (navy/gold corner design, dotted gold seal,
//     student name, course name, issue date, certificate number,
//     verification link) programmatically with pdf-lib, not from a static
//     image template — every field is computed and drawn at request time
//     (100% dynamic).
//   - Day 44: "Automatic certificate issuance when a course reaches 100%
//     completion + unique verification number" — issueCertificateForCompletedEnrollment()
//     is called automatically from app/lib/progressHelpers.js when an
//     enrollment's status becomes "completed", and uses an upsert against
//     the unique {user, course} index (see app/lib/models/Certificate.js)
//     to guarantee exactly one certificate per student/course even under
//     concurrent attempts (race condition). The unique verification number
//     (certificateId) is generated automatically by the model's own default
//     (crypto.randomBytes, not Math.random).
//
// 🖋️ Language handling:
//   Fixed template labels ("Certificate of Completion", "Date", etc.) are
//   plain English and drawn with the embedded Cairo font.
//   The two DYNAMIC fields — studentName and courseTitle — come straight
//   from the database and may be Arabic, English, or a mix of both.
//
//   ⚠️ Why Amiri (not Cairo) for the Arabic runs: pdf-lib draws literal
//   Unicode codepoints from a font's cmap — it does NOT run an OpenType
//   shaping engine (no GSUB "init/medi/fina/liga" substitution). The
//   arabic-reshaper library works around this by converting each Arabic
//   letter to its correct contextual form as an actual Unicode codepoint
//   (Arabic Presentation Forms A/B, U+FB50–U+FEFF) that fonts can map
//   directly. Amiri includes full glyph coverage for that block, so this
//   renders correctly. Many modern multi-script fonts (Cairo included)
//   only expose those shapes via GSUB features, not as directly-mapped
//   presentation-form codepoints — with no shaping engine, pdf-lib can't
//   find matching glyphs for them, so Arabic text comes out broken/
//   disconnected. Cairo is used for the plain-English labels only, where
//   this limitation doesn't apply.
//
//   🖋️ Student-name font: the student name is drawn in "Great Vibes" (a
//   script/cursive font) for Latin runs, so English/mixed names get the
//   handwritten-signature look. Great Vibes has no Arabic glyph coverage
//   (it's a Latin-script display face), so Arabic runs inside the name
//   still fall back to Amiri Bold — otherwise the glyphs would be missing
//   entirely. This is the same run-splitting mechanism used for the rest
//   of the mixed-script text below, just with a different "Latin" font
//   supplied specifically for the name field.
//
//   The mixed-script renderer below:
//     1) arabic-reshaper converts each Arabic letter to its correct
//        contextual form (initial/medial/final/isolated) based on its
//        neighbors.
//     2) bidi-js applies the Unicode BiDi algorithm to compute the correct
//        visual order (Arabic RTL text can be interleaved with Latin
//        words/numbers like "EduMaster" on the same line).
//   The result is split into runs (Arabic vs. Latin) and each run is drawn
//   with the matching embedded font (Amiri for Arabic, Cairo/Great Vibes
//   for Latin) in sequence. Arabic content is kept as-is (not translated).
//
//   🖼️ Company logo: a transparent-background PNG of the EduMaster seal is
//   embedded as the bottom-right stamp (replaces the earlier hand-drawn
//   dotted-ring placeholder). Must exist on disk at
//   app/lib/certificate-assets/logo.png — without it generateCertificatePdf
//   will throw ENOENT, same as the font files below.
//
//   🔗 verifyUrl: still accepted as a parameter (buildVerifyUrl() below is
//   unchanged and still used by the public /verify page), but is no longer
//   drawn on the certificate face itself per product decision — the
//   certificate now shows Date + Certificate No. + the logo/seal only.
//
//   ⚠️ REQUIRES five font files to exist on disk at app/lib/fonts/:
//     - Amiri-Regular.ttf / Amiri-Bold.ttf   (https://fonts.google.com/specimen/Amiri)
//     - Cairo-Regular.ttf / Cairo-Bold.ttf   (https://fonts.google.com/specimen/Cairo)
//     - GreatVibes-Regular.ttf               (https://fonts.google.com/specimen/Great+Vibes)
//   All three families are SIL OFL 1.1 licensed — free to embed in
//   generated documents like this certificate. Without these files
//   present, generateCertificatePdf will throw ENOENT.
//
//   arabic-reshaper is GPL-3.0 licensed. Since it's used here as a
//   server-side library inside a web app that isn't distributed as
//   software/a binary to anyone (SaaS), there's no obligation to publish
//   the whole project's code under GPL — this is a standard, common use of
//   GPL libraries in web services.

import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";
import { getCertificateModel, getCourseModel } from "@/app/lib/models";
import { getAuthModel } from "@/app/lib/mongodb";
import { createNotification } from "@/app/lib/notificationHelpers";

const bidi = bidiFactory();

/* ─────────────────────────────────────────────────────────────
   1) Plain-English text helpers (fixed template labels, Cairo only)
───────────────────────────────────────────────────────────── */

function drawText(page, text, { x, y, size, font, color }) {
  page.drawText(text, { x, y, size, font, color });
  return font.widthOfTextAtSize(text, size);
}

function drawTextCentered(page, text, { centerX, y, size, font, color }) {
  const width = font.widthOfTextAtSize(text, size);
  drawText(page, text, { x: centerX - width / 2, y, size, font, color });
  return width;
}

function drawTrackedUppercase(page, text, { centerX, y, size, font, color, tracking }) {
  let total = 0;
  for (const ch of text) total += font.widthOfTextAtSize(ch, size) + tracking;
  total -= tracking;
  let cursorX = centerX - total / 2;
  for (const ch of text) {
    page.drawText(ch, { x: cursorX, y, size, font, color });
    cursorX += font.widthOfTextAtSize(ch, size) + tracking;
  }
}



/* ─────────────────────────────────────────────────────────────
   2) Mixed Arabic/Latin text (dynamic fields only: studentName,
      courseTitle) — reshape + bidi reorder + run splitting.
      Arabic runs → Amiri, Latin runs → whichever font is passed in
      (Cairo for the course title, Great Vibes for the student name).
───────────────────────────────────────────────────────────── */

function isArabicChar(ch) {
  const c = ch.codePointAt(0);
  return (
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0x0750 && c <= 0x077f) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
}

function toVisualOrder(text) {
  const reshaped = arabicReshaper.convertArabic(text);
  const levels = bidi.getEmbeddingLevels(reshaped);
  return bidi.getReorderedString(reshaped, levels);
}

function splitRuns(visualText) {
  const runs = [];
  let current = "";
  let currentIsArabic = null;
  for (const ch of visualText) {
    const isAr = isArabicChar(ch);
    const bucket = ch === " " ? currentIsArabic : isAr;
    if (currentIsArabic === null) currentIsArabic = bucket ?? isAr;
    if (bucket === currentIsArabic || ch === " ") {
      current += ch;
    } else {
      runs.push({ text: current, isArabic: currentIsArabic });
      current = ch;
      currentIsArabic = isAr;
    }
  }
  if (current) runs.push({ text: current, isArabic: currentIsArabic });
  return runs;
}

function measureMixed(text, size, arFont, latinFont) {
  const runs = splitRuns(toVisualOrder(text));
  const widths = runs.map((r) => (r.isArabic ? arFont : latinFont).widthOfTextAtSize(r.text, size));
  return { runs, widths, total: widths.reduce((a, b) => a + b, 0) };
}

function drawMixed(page, text, { x, y, size, arFont, latinFont, color }) {
  const { runs, widths } = measureMixed(text, size, arFont, latinFont);
  let cursorX = x;
  runs.forEach((r, i) => {
    const font = r.isArabic ? arFont : latinFont;
    page.drawText(r.text, { x: cursorX, y, size, font, color });
    cursorX += widths[i];
  });
  return widths.reduce((a, b) => a + b, 0);
}

function drawMixedCentered(page, text, { centerX, y, size, arFont, latinFont, color }) {
  const { total } = measureMixed(text, size, arFont, latinFont);
  drawMixed(page, text, { x: centerX - total / 2, y, size, arFont, latinFont, color });
  return total;
}

function fitFontSizeForWidth(text, maxWidth, startSize, minSize, arFont, latinFont) {
  let size = startSize;
  while (size > minSize) {
    const { total } = measureMixed(text, size, arFont, latinFont);
    if (total <= maxWidth) return size;
    size -= 1;
  }
  return minSize;
}

/* ─────────────────────────────────────────────────────────────
   3) Certificate PDF generation (Day 43)
───────────────────────────────────────────────────────────── */

const FONTS_DIR = path.join(process.cwd(), "app", "lib", "fonts");
const ASSETS_DIR = path.join(process.cwd(), "app", "lib", "certificate-assets");

function formatDate(date) {
  const d = new Date(date);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function generateCertificatePdf({ studentName, courseTitle, certificateId, issuedAt, verifyUrl }) {
  const arBoldBytes = fs.readFileSync(path.join(FONTS_DIR, "Amiri-Bold.ttf"));
  const cairoBoldBytes = fs.readFileSync(path.join(FONTS_DIR, "Cairo-Bold.ttf"));
  const cairoRegBytes = fs.readFileSync(path.join(FONTS_DIR, "Cairo-Regular.ttf"));
  const scriptBytes = fs.readFileSync(path.join(FONTS_DIR, "GreatVibes-Regular.ttf"));
  const logoBytes = fs.readFileSync(path.join(ASSETS_DIR, "logo.png"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.setTitle(`EduMaster Certificate — ${certificateId}`);
  pdfDoc.setSubject("Certificate of Completion");
  pdfDoc.setProducer("EduMaster");

  const arBold = await pdfDoc.embedFont(arBoldBytes, { subset: false });
  const bold = await pdfDoc.embedFont(cairoBoldBytes, { subset: false });
  const regular = await pdfDoc.embedFont(cairoRegBytes, { subset: false });
  const script = await pdfDoc.embedFont(scriptBytes, { subset: false }); // Great Vibes — student name only
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const NAVY = rgb(9 / 255, 20 / 255, 46 / 255);
  const GOLD = rgb(199 / 255, 161 / 255, 92 / 255);
  const GOLD_LIGHT = rgb(230 / 255, 200 / 255, 140 / 255);
  const GRAY = rgb(0.42, 0.45, 0.5);
  const LIGHT_GRAY = rgb(0.65, 0.67, 0.72);
  const CREAM = rgb(0.988, 0.98, 0.965);

  const W = 842;
  const H = 595;

  const page = pdfDoc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });

  // ---- gold sliver + navy diagonal swoosh (top-right → bottom-right corner) ----
  // NOTE: pdf-lib's drawSvgPath internally flips the Y axis (SVG is y-down),
  // so every y coordinate below is negated to land at the intended page-space y.
  const ny = (y) => -y;

  const goldPath = `M ${W * 0.74} ${ny(H)}
    C ${W * 0.93} ${ny(H)} ${W} ${ny(H * 0.9)} ${W} ${ny(H * 0.72)}
    L ${W} ${ny(H)}
    Z`;
  page.drawSvgPath(goldPath, { x: 0, y: 0, color: GOLD_LIGHT });

  const navyPath = `M ${W * 0.82} ${ny(H)}
    C ${W * 0.97} ${ny(H)} ${W} ${ny(H * 0.9)} ${W} ${ny(H * 0.74)}
    L ${W} ${ny(0)}
    L ${W * 0.66} ${ny(0)}
    C ${W * 0.7} ${ny(H * 0.3)} ${W * 0.68} ${ny(H * 0.66)} ${W * 0.82} ${ny(H)}
    Z`;
  page.drawSvgPath(navyPath, { x: 0, y: 0, color: NAVY });

  // thin frame brackets (top-left and bottom-left open corners)
  page.drawLine({ start: { x: 55, y: H - 55 }, end: { x: W * 0.6, y: H - 55 }, thickness: 1.2, color: NAVY });
  page.drawLine({ start: { x: 55, y: H - 55 }, end: { x: 55, y: H * 0.42 }, thickness: 1.2, color: NAVY });
  page.drawLine({ start: { x: 55, y: 55 }, end: { x: W * 0.46, y: 55 }, thickness: 1.2, color: NAVY });
  page.drawLine({ start: { x: 55, y: 55 }, end: { x: 55, y: H * 0.3 }, thickness: 1.2, color: NAVY });

  // ---- company logo seal, bottom-right ----
  const sealCx = W - 108;
  const sealCy = 100;
  const logoSize = 118;
  page.drawImage(logoImage, {
    x: sealCx - logoSize / 2,
    y: sealCy - logoSize / 2,
    width: logoSize,
    height: logoSize,
  });

  // ---- header ----
  const bodyCenterX = W * 0.335;

  drawTrackedUppercase(page, "EDUMASTER", { centerX: bodyCenterX, y: H - 96, size: 10.5, font: bold, color: GOLD, tracking: 4.2 });
  drawTrackedUppercase(page, "CERTIFICATE", { centerX: bodyCenterX, y: H - 150, size: 38, font: bold, color: NAVY, tracking: 5 });
  drawTrackedUppercase(page, "OF COMPLETION", { centerX: bodyCenterX, y: H - 178, size: 12.5, font: regular, color: GRAY, tracking: 5 });

  // ---- body ----
  const contentMaxWidth = W * 0.5;

  drawTextCentered(page, "This certificate is proudly presented to", {
    centerX: bodyCenterX, y: H - 230, size: 12, font: regular, color: GRAY,
  });

  // Student name: Great Vibes for Latin runs, Amiri Bold for any Arabic runs.
  const nameSize = fitFontSizeForWidth(studentName, contentMaxWidth, 50, 24, arBold, script);
  const nameWidth = drawMixedCentered(page, studentName, {
    centerX: bodyCenterX, y: H - 298, size: nameSize, arFont: arBold, latinFont: script, color: NAVY,
  });
  page.drawLine({
    start: { x: bodyCenterX - nameWidth / 2 - 20, y: H - 314 },
    end: { x: bodyCenterX + nameWidth / 2 + 20, y: H - 314 },
    thickness: 0.8, color: GOLD,
  });

  drawTextCentered(page, "for successfully completing all requirements of the course", {
    centerX: bodyCenterX, y: H - 342, size: 11, font: regular, color: GRAY,
  });

  const courseSize = fitFontSizeForWidth(courseTitle, contentMaxWidth, 18, 11, arBold, bold);
  drawMixedCentered(page, courseTitle, {
    centerX: bodyCenterX, y: H - 368, size: courseSize, arFont: arBold, latinFont: bold, color: NAVY,
  });

  // ---- footer: issue date (left) / certificate number (right) ----
  const footerY = 76;
  const col1X = 70;
  const col2X = 300;

  page.drawLine({ start: { x: col1X, y: footerY + 26 }, end: { x: col1X + 150, y: footerY + 26 }, thickness: 0.8, color: LIGHT_GRAY });
  drawTrackedUppercase(page, "DATE", { centerX: col1X + 75, y: footerY + 8, size: 9, font: bold, color: NAVY, tracking: 2 });
  drawTextCentered(page, formatDate(issuedAt), { centerX: col1X + 75, y: footerY - 8, size: 10, font: regular, color: GRAY });

  page.drawLine({ start: { x: col2X, y: footerY + 26 }, end: { x: col2X + 150, y: footerY + 26 }, thickness: 0.8, color: LIGHT_GRAY });
  drawTrackedUppercase(page, "CERTIFICATE NO.", { centerX: col2X + 75, y: footerY + 8, size: 9, font: bold, color: NAVY, tracking: 1.6 });
  drawTextCentered(page, certificateId, { centerX: col2X + 75, y: footerY - 8, size: 9, font: regular, color: GRAY });

  return pdfDoc.save();
}

/* ─────────────────────────────────────────────────────────────
   4) Automatic issuance on course completion (Day 44)
───────────────────────────────────────────────────────────── */

export async function issueCertificateForCompletedEnrollment(userId, courseId) {
  try {
    const Certificate = getCertificateModel();

    const existing = await Certificate.findOne({ user: userId, course: courseId }).lean();
    if (existing) return existing;

    const Course = getCourseModel();
    const AuthModel = getAuthModel();
    const [course, user] = await Promise.all([
      Course.findById(courseId, "title").lean(),
      AuthModel.findById(userId, "name email").lean(),
    ]);
    if (!course || !user) return null;

    const studentNameSnapshot = user.name || user.email || "Student";
    const courseTitleSnapshot = course.title || "Course";

    try {
      const created = await Certificate.create({
        user: userId,
        course: courseId,
        studentNameSnapshot,
        courseTitleSnapshot,
        issuedAt: new Date(),
      });

      await createNotification({
        user: userId,
        type: "certificate_issued",
        title: courseTitleSnapshot,
        message: "Your certificate is ready",
        link: "/student/certificates",
        course: courseId,
      });

      return created.toObject();
    } catch (err) {
      if (err?.code === 11000) {
        return await Certificate.findOne({ user: userId, course: courseId }).lean();
      }
      throw err;
    }
  } catch (err) {
    console.error("[issueCertificateForCompletedEnrollment] error:", err);
    return null;
  }
}

export function buildVerifyUrl(request, certificateId) {
  const origin = new URL(request.url).origin;
  return `${origin.replace(/^https?:\/\//, "")}/verify/${certificateId}`;
}