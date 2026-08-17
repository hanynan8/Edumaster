// app/lib/certificateHelpers.js
//
// Phase 5 — Days 43-44:
//   - Day 43: "Design the Certificate template (dynamic PDF with student
//     name + course + date)" — generateCertificatePdf() draws a full
//     A4-landscape certificate (double border, EduMaster badge, student
//     name, course name, issue date, certificate number, verification
//     link) programmatically with pdf-lib, not from a static image
//     template — every field is computed and drawn at request time
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
// 🖋️ Language handling (updated):
//   All fixed template labels ("Certificate of Achievement", "Issue Date",
//   etc.) are plain English and drawn with pdf-lib's built-in Helvetica
//   fonts — no font file needed for them.
//   The two DYNAMIC fields — studentName and courseTitle — come straight
//   from the database and are frequently Arabic (most course titles on
//   this platform are Arabic). Helvetica (WinAnsi encoding) cannot render
//   Arabic glyphs at all and throws if it's asked to, so those two fields
//   are drawn with a small mixed-script renderer instead:
//     1) arabic-reshaper converts each Arabic letter to its correct
//        contextual form (initial/medial/final/isolated) based on its
//        neighbors.
//     2) bidi-js applies the Unicode BiDi algorithm to compute the correct
//        visual order (Arabic RTL text can be interleaved with Latin
//        words/numbers like "EduMaster" on the same line).
//   The result is split into runs (Arabic vs. Latin) and each run is drawn
//   with the matching embedded font (Amiri for Arabic, Helvetica for
//   Latin) in sequence.
//
//   ⚠️ arabic-reshaper is GPL-3.0 licensed. Since it's used here as a
//   server-side library inside a web app that isn't distributed as
//   software/a binary to anyone (SaaS), there's no obligation to publish
//   the whole project's code under GPL — this is a standard, common use of
//   GPL libraries in web services. The Arabic font itself (Amiri) is SIL
//   OFL 1.1 licensed (completely free to embed in generated documents like
//   this certificate) — see app/lib/fonts/OFL.txt.

import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";
import { getCertificateModel, getCourseModel } from "@/app/lib/models";
import { getAuthModel } from "@/app/lib/mongodb";
import { createNotification } from "@/app/lib/notificationHelpers";

const bidi = bidiFactory();

/* ─────────────────────────────────────────────────────────────
   1) Plain-English text helpers (fixed template labels, Helvetica only)
───────────────────────────────────────────────────────────── */

// Draws left-aligned text starting at x, returns its width — useful when
// something else needs to be drawn right after it.
function drawText(page, text, { x, y, size, font, color }) {
  page.drawText(text, { x, y, size, font, color });
  return font.widthOfTextAtSize(text, size);
}

// Same as above but centered around centerX (the most common usage on the
// certificate).
function drawTextCentered(page, text, { centerX, y, size, font, color }) {
  const width = font.widthOfTextAtSize(text, size);
  drawText(page, text, { x: centerX - width / 2, y, size, font, color });
  return width;
}

// Uppercase text with letter-spacing (tracking) — a classic touch in
// formal certificate design ("CERTIFICATE OF COMPLETION").
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
      courseTitle) — reshape + bidi reorder + run splitting
───────────────────────────────────────────────────────────── */

// Unicode ranges we treat as "Arabic" (basic + supplement + presentation
// forms A/B) — any character outside this range (Latin/digits/symbols/
// space) goes to the Latin font instead of the Arabic one.
function isArabicChar(ch) {
  const c = ch.codePointAt(0);
  return (
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0x0750 && c <= 0x077f) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
}

// Reshapes Arabic text and reorders it visually (bidi) — after this it's
// ready to draw left-to-right literally, like any plain Latin text, even
// when Arabic and Latin are mixed together.
function toVisualOrder(text) {
  const reshaped = arabicReshaper.convertArabic(text);
  const levels = bidi.getEmbeddingLevels(reshaped);
  return bidi.getReorderedString(reshaped, levels);
}

// Splits text (already in visual order) into consecutive runs: each run is
// either fully Arabic or fully Latin/symbols, so each run can be drawn
// with the right font. Spaces stick to the run before them (not split off
// on their own) so gaps between words aren't needlessly fragmented.
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

// Draws mixed (Arabic+Latin) text starting at x (left edge of the whole
// block), returns its full width — useful when something else needs to be
// drawn right after it.
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

// Same as above but centered around centerX (used for studentName and
// courseTitle on the certificate).
function drawMixedCentered(page, text, { centerX, y, size, arFont, latinFont, color }) {
  const { total } = measureMixed(text, size, arFont, latinFont);
  drawMixed(page, text, { x: centerX - total / 2, y, size, arFont, latinFont, color });
  return total;
}

// If the student name / course title is too long and would overflow the
// certificate's bounds, shrink the font size step by step (down to a
// minimum) instead of letting it get clipped at the edges.
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

function formatDate(date) {
  const d = new Date(date);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Generates the certificate PDF bytes (Uint8Array) — a fully dynamic A4
 * landscape template: every piece of text is drawn at call time from the
 * passed-in data, with no static template image. All fixed labels are
 * English; studentName/courseTitle render correctly whether they're
 * Arabic, English, or a mix of both.
 * @param {object} params
 * @param {string} params.studentName
 * @param {string} params.courseTitle
 * @param {string} params.certificateId
 * @param {Date|string} params.issuedAt
 * @param {string} params.verifyUrl - Public verification page URL (without https://)
 */
export async function generateCertificatePdf({ studentName, courseTitle, certificateId, issuedAt, verifyUrl }) {
  const arBoldBytes = fs.readFileSync(path.join(FONTS_DIR, "Amiri-Bold.ttf"));
  const arRegBytes = fs.readFileSync(path.join(FONTS_DIR, "Amiri-Regular.ttf"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.setTitle(`EduMaster Certificate — ${certificateId}`);
  pdfDoc.setSubject("Certificate of Completion");
  pdfDoc.setProducer("EduMaster");

  const arBold = await pdfDoc.embedFont(arBoldBytes, { subset: false });
  const arReg = await pdfDoc.embedFont(arRegBytes, { subset: false });
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const NAVY = rgb(0.039, 0.039, 0.039); // #0a0a0a — same gradient as the site header
  const BLUE = rgb(0.114, 0.435, 0.847); // #1D6FD8 — the site's primary brand color
  const GRAY = rgb(0.42, 0.45, 0.5);
  const LIGHT_GRAY = rgb(0.62, 0.65, 0.7);
  const WHITE = rgb(1, 1, 1);

  const W = 842; // A4 landscape @ 72dpi (≈ 297×210mm)
  const H = 595;
  const CENTER_X = W / 2;

  const page = pdfDoc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  // Double border (dark outer + brand-colored inner)
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: NAVY, borderWidth: 2.5 });
  page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: BLUE, borderWidth: 1 });

  // Diamond decorations in the four corners
  for (const [cx, cy] of [
    [40, 40],
    [W - 40, 40],
    [40, H - 40],
    [W - 40, H - 40],
  ]) {
    page.drawRectangle({ x: cx - 5, y: cy - 5, width: 10, height: 10, color: BLUE, rotate: { type: "degrees", angle: 45 } });
  }

  // Circular checkmark badge at the top of the certificate
  const badgeCx = CENTER_X;
  const badgeCy = H - 78;
  const badgeR = 24;
  page.drawEllipse({ x: badgeCx, y: badgeCy, xScale: badgeR, yScale: badgeR, color: NAVY });
  page.drawEllipse({ x: badgeCx, y: badgeCy, xScale: badgeR - 4, yScale: badgeR - 4, borderColor: WHITE, borderWidth: 1.2 });
  page.drawLine({ start: { x: badgeCx - 10, y: badgeCy + 1 }, end: { x: badgeCx - 3, y: badgeCy - 7 }, thickness: 2.6, color: WHITE });
  page.drawLine({ start: { x: badgeCx - 3, y: badgeCy - 7 }, end: { x: badgeCx + 12, y: badgeCy + 10 }, thickness: 2.6, color: WHITE });

  drawTrackedUppercase(page, "CERTIFICATE OF COMPLETION", {
    centerX: CENTER_X, y: H - 108, size: 11, font: bold, color: BLUE, tracking: 3.2,
  });

  drawTextCentered(page, "Certificate of Achievement", {
    centerX: CENTER_X, y: H - 150, size: 36, font: bold, color: NAVY,
  });

  drawTextCentered(page, "The EduMaster learning platform hereby certifies that", {
    centerX: CENTER_X, y: H - 195, size: 14, font: regular, color: GRAY,
  });

  const nameSize = fitFontSizeForWidth(studentName, W - 160, 30, 16, arBold, bold);
  const nameWidth = drawMixedCentered(page, studentName, {
    centerX: CENTER_X, y: H - 245, size: nameSize, arFont: arBold, latinFont: bold, color: BLUE,
  });
  page.drawLine({
    start: { x: CENTER_X - nameWidth / 2 - 20, y: H - 258 },
    end: { x: CENTER_X + nameWidth / 2 + 20, y: H - 258 },
    thickness: 1, color: LIGHT_GRAY,
  });

  drawTextCentered(page, "has successfully completed all requirements of the course", {
    centerX: CENTER_X, y: H - 290, size: 14, font: regular, color: GRAY,
  });

  const courseSize = fitFontSizeForWidth(courseTitle, W - 140, 22, 13, arBold, bold);
  drawMixedCentered(page, courseTitle, {
    centerX: CENTER_X, y: H - 330, size: courseSize, arFont: arBold, latinFont: bold, color: NAVY,
  });

  // Footer info row: issue date / certificate number / verification link
  const footerY = 70;
  drawText(page, `Issue Date: ${formatDate(issuedAt)}`, {
    x: 50, y: footerY, size: 10, font: regular, color: GRAY,
  });

  const idText = `Certificate No: ${certificateId}`;
  const idWidth = regular.widthOfTextAtSize(idText, 10);
  drawText(page, idText, {
    x: W - 50 - idWidth, y: footerY, size: 10, font: regular, color: GRAY,
  });

  if (verifyUrl) {
    drawTextCentered(page, verifyUrl, {
      centerX: CENTER_X, y: footerY, size: 9, font: regular, color: LIGHT_GRAY,
    });
  }

  return pdfDoc.save();
}

/* ─────────────────────────────────────────────────────────────
   4) Automatic issuance on course completion (Day 44)
───────────────────────────────────────────────────────────── */

/**
 * Automatically issues a certificate for a student who completed a given
 * course, if they don't already have one.
 * 🔒 SECURITY / RACE CONDITION: relies on an upsert + the unique
 * {user,course} index on the Certificate model (see
 * app/lib/models/Certificate.js) — if this function is called twice at
 * the same moment (e.g. two concurrent attempts to complete the last
 * lesson), Mongo will reject one of them with a duplicate key error,
 * which we catch here and return the existing record instead of failing
 * the operation that called this function in the first place (completing
 * the lesson/quiz must still succeed even if certificate issuance races).
 *
 * Intentionally best-effort and never throws upward: a failure to issue
 * the certificate (e.g. a transient PDF generation issue) must not break
 * the lesson-completion flow itself.
 *
 * @returns {Promise<object|null>} the certificate record (jsonable), or
 *   null if there's no actually-completed enrollment or an error occurred.
 */
export async function issueCertificateForCompletedEnrollment(userId, courseId) {
  try {
    const Certificate = getCertificateModel();

    // If it already exists, do nothing (idempotent).
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

      // 🔔 Phase 6 — Days 50-51: "new certificate" notification for the
      // student — only after an actual creation (not when the certificate
      // already existed, and not from the E11000 path below — so the
      // notification is sent exactly once per certificate).
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
      // 🔒 E11000 = duplicate key (raced with another call that created the
      // certificate a fraction of a second before us) — not a real error,
      // just return the record that was actually created.
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

/**
 * Builds the public verification link for a given certificate, from
 * request.url (same approach as app/api/payments/checkout/route.js) so it
 * works correctly in any environment (local/staging/production) without
 * needing an extra environment variable.
 */
export function buildVerifyUrl(request, certificateId) {
  const origin = new URL(request.url).origin;
  return `${origin.replace(/^https?:\/\//, "")}/verify/${certificateId}`;
}