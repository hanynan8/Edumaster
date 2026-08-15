// app/lib/certificateHelpers.js
//
// Phase 5 — اليوم 43-44:
//   - اليوم 43: "تصميم قالب Certificate (PDF ديناميكي باسم الطالب + الكورس
//     + تاريخ)" — دالة generateCertificatePdf() بترسم شهادة A4-landscape
//     كاملة (border مزدوج، شعار EduMaster، اسم الطالب، اسم الكورس، تاريخ
//     الإصدار، رقم الشهادة، رابط التحقق) بيانيًا بـ pdf-lib، مش من قالب
//     صورة ثابتة — كل حقل بيتحسب ويترسم وقت الطلب (ديناميكي 100%).
//   - اليوم 44: "إصدار تلقائي للشهادة عند اكتمال الكورس 100% + رقم تحقق
//     فريد" — issueCertificateForCompletedEnrollment() بتتنادى تلقائيًا من
//     app/lib/progressHelpers.js لما enrollment.status يبقى "completed"،
//     وبتستخدم upsert على الـ unique index {user,course} (شوف
//     app/lib/models/Certificate.js) عشان تضمن شهادة واحدة بس لكل
//     طالب/كورس حتى مع محاولات متزامنة (race condition). رقم التحقق
//     الفريد (certificateId) بيتولد تلقائيًا من default الموديل نفسه
//     (crypto.randomBytes، مش Math.random).
//
// 🖋️ دعم النص العربي داخل الـ PDF (مهم جدًا ومش تفصيلة بسيطة):
//   pdf-lib بيرسم كل حرف كـ glyph منفرد على حسب كوده اليونيكود من غير أي
//   "shaping" — يعني نص عربي عادي هيطلع حروف منفصلة (شكل isolated) وبترتيب
//   LTR غلط تمامًا. عشان نصلّح الاتنين:
//     1) arabic-reshaper: بيحوّل كل حرف عربي للشكل السياقي الصح (ابتدائي/
//        وسطي/نهائي/منفرد) على حسب الحروف اللي جنبه — ده بيرجّع حروف من
//        "Arabic Presentation Forms" (U+FE70..U+FEFF) اللي كل واحد فيها
//        شكل الحرف الصحيح جاهز.
//     2) bidi-js: بيطبّق خوارزمية Unicode BiDi الرسمية عشان يحسب "الترتيب
//        البصري" الصحيح للنص (عربي RTL ممكن يتداخل مع أرقام/كلمات لاتينية
//        LTR زي "EduMaster" أو "JavaScript" في نفس السطر).
//   بعد الخطوتين دول، النص بقى "جاهز للرسم من الشمال لليمين حرفيًا" زي أي
//   نص لاتيني عادي — فبنقسّمه لأجزاء (runs) حسب مين محتاج فونت عربي (Noto
//   Naskh Arabic، مُضمّن في app/lib/fonts/) ومين محتاج فونت لاتيني
//   (Helvetica القياسي في pdf-lib، مفيش داعي نضيفه كملف)، ونرسم كل جزء
//   بالفونت بتاعه بالترتيب ده مباشرة.
//
//   ⚠️ arabic-reshaper رخصته GPL-3.0. بما إنه بيتستخدم هنا كمكتبة سيرفر-سايد
//   جوه تطبيق ويب مش بيتوزّع كبرنامج/باينري لحد (SaaS)، مفيش التزام نشر
//   الكود تحت GPL على المشروع كله — الاستخدام ده نمطي وشائع لمكتبات GPL في
//   خدمات ويب. الخط نفسه (Noto Naskh Arabic) رخصته SIL OFL 1.1 (مجانية
//   تمامًا للتضمين في مستندات مولّدة زي الشهادة دي).

import crypto from "crypto";
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
   1) نص عربي/لاتيني مختلط: reshape + bidi reorder + تقسيم runs
───────────────────────────────────────────────────────────── */

// مدى حروف اليونيكود اللي بنعتبرها "عربي" (الأساسي + الممتد + التوافقية +
// أشكال العرض A/B) — أي حرف برّه المدى ده (لاتيني/أرقام/رموز/مسافة) بيتحط
// في فونت لاتيني بدل العربي.
function isArabicChar(ch) {
  const c = ch.codePointAt(0);
  return (
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0x0750 && c <= 0x077f) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
}

// بيرجّع النص بعد ما يتشكّل عربيًا (reshape) ويترتب بصريًا (bidi) — يعني
// بقى جاهز يترسم من الشمال لليمين زي أي نص عادي، مهما كان فيه عربي ولاتيني
// مختلطين مع بعض.
function toVisualOrder(text) {
  const reshaped = arabicReshaper.convertArabic(text);
  const levels = bidi.getEmbeddingLevels(reshaped);
  return bidi.getReorderedString(reshaped, levels);
}

// بيقسّم النص (بعد ما بقى بترتيبه البصري) لأجزاء متتالية: كل جزء إما عربي
// بالكامل أو لاتيني/رموز بالكامل، عشان كل جزء يترسم بالفونت المناسب له.
// المسافات بتتحط مع الجزء اللي قبلها (ما بتعملش split لوحدها) عشان الفراغات
// بين الكلمات متتقسمش لجزء منفصل من غير داعي.
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

// بيرسم نص مختلط (عربي+لاتيني) مبتدئ من x (يسار الكتلة كلها)، وبيرجّع
// عرضها الكامل — مفيدة لو محتاجين نرسم حاجة تانية بعدها.
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

// نفس اللي فوق بس بيتمركز حول centerX (الاستخدام الأكتر شيوعًا في الشهادة).
function drawMixedCentered(page, text, { centerX, y, size, arFont, latinFont, color }) {
  const { total } = measureMixed(text, size, arFont, latinFont);
  drawMixed(page, text, { x: centerX - total / 2, y, size, arFont, latinFont, color });
  return total;
}

// نص لاتيني uppercase بمسافات بين الحروف (letter-spacing) — لمسة كلاسيكية
// في تصميم الشهادات الرسمية ("CERTIFICATE OF COMPLETION").
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

// لو اسم الكورس طويل جدًا وهيخرج برّه حدود الشهادة، بنصغّر حجم الخط
// تدريجيًا (لحد حد أدنى) بدل ما نسيبه يتقص من الحواف.
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
   2) توليد PDF الشهادة (اليوم 43)
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
 * بيولّد بايتات PDF الشهادة (Uint8Array) — قالب A4 landscape ديناميكي
 * بالكامل: كل نص بيترسم وقت الاستدعاء من البيانات الممررة، مفيش صورة
 * قالب ثابتة.
 * @param {object} params
 * @param {string} params.studentName
 * @param {string} params.courseTitle
 * @param {string} params.certificateId
 * @param {Date|string} params.issuedAt
 * @param {string} params.verifyUrl - رابط صفحة التحقق العامة (بدون https://)
 */
export async function generateCertificatePdf({ studentName, courseTitle, certificateId, issuedAt, verifyUrl }) {
  const arBoldBytes = fs.readFileSync(path.join(FONTS_DIR, "NotoNaskhArabic-Bold.ttf"));
  const arRegBytes = fs.readFileSync(path.join(FONTS_DIR, "NotoNaskhArabic-Regular.ttf"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.setTitle(`EduMaster Certificate — ${certificateId}`);
  pdfDoc.setSubject("Certificate of Completion");
  pdfDoc.setProducer("EduMaster");

  const arBold = await pdfDoc.embedFont(arBoldBytes, { subset: true });
  const arReg = await pdfDoc.embedFont(arRegBytes, { subset: true });
  const latinBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const latinReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const NAVY = rgb(0.039, 0.039, 0.039); // #0a0a0a — نفس تدرج الهيدر في الموقع
  const BLUE = rgb(0.114, 0.435, 0.847); // #1D6FD8 — اللون الأساسي في الموقع
  const GRAY = rgb(0.42, 0.45, 0.5);
  const LIGHT_GRAY = rgb(0.62, 0.65, 0.7);
  const WHITE = rgb(1, 1, 1);

  const W = 842; // A4 landscape @ 72dpi (≈ 297×210mm)
  const H = 595;
  const CENTER_X = W / 2;

  const page = pdfDoc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  // إطار مزدوج (خارجي غامق + داخلي بلون العلامة)
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: NAVY, borderWidth: 2.5 });
  page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: BLUE, borderWidth: 1 });

  // زخرفة معينات (diamonds) في الأركان الأربعة
  for (const [cx, cy] of [
    [40, 40],
    [W - 40, 40],
    [40, H - 40],
    [W - 40, H - 40],
  ]) {
    page.drawRectangle({ x: cx - 5, y: cy - 5, width: 10, height: 10, color: BLUE, rotate: { type: "degrees", angle: 45 } });
  }

  // شعار دائري بعلامة صح أعلى الشهادة
  const badgeCx = CENTER_X;
  const badgeCy = H - 78;
  const badgeR = 24;
  page.drawEllipse({ x: badgeCx, y: badgeCy, xScale: badgeR, yScale: badgeR, color: NAVY });
  page.drawEllipse({ x: badgeCx, y: badgeCy, xScale: badgeR - 4, yScale: badgeR - 4, borderColor: WHITE, borderWidth: 1.2 });
  page.drawLine({ start: { x: badgeCx - 10, y: badgeCy + 1 }, end: { x: badgeCx - 3, y: badgeCy - 7 }, thickness: 2.6, color: WHITE });
  page.drawLine({ start: { x: badgeCx - 3, y: badgeCy - 7 }, end: { x: badgeCx + 12, y: badgeCy + 10 }, thickness: 2.6, color: WHITE });

  drawTrackedUppercase(page, "CERTIFICATE OF COMPLETION", {
    centerX: CENTER_X, y: H - 108, size: 11, font: latinBold, color: BLUE, tracking: 3.2,
  });

  drawMixedCentered(page, "شهادة إتمام", {
    centerX: CENTER_X, y: H - 150, size: 36, arFont: arBold, latinFont: latinBold, color: NAVY,
  });

  drawMixedCentered(page, "تشهد منصة EduMaster التعليمية بأن الطالب/ة", {
    centerX: CENTER_X, y: H - 195, size: 14, arFont: arReg, latinFont: latinReg, color: GRAY,
  });

  const nameSize = fitFontSizeForWidth(studentName, W - 160, 30, 16, arBold, latinBold);
  const nameWidth = drawMixedCentered(page, studentName, {
    centerX: CENTER_X, y: H - 245, size: nameSize, arFont: arBold, latinFont: latinBold, color: BLUE,
  });
  page.drawLine({
    start: { x: CENTER_X - nameWidth / 2 - 20, y: H - 258 },
    end: { x: CENTER_X + nameWidth / 2 + 20, y: H - 258 },
    thickness: 1, color: LIGHT_GRAY,
  });

  drawMixedCentered(page, "قد أكمل(ت) بنجاح جميع متطلبات كورس", {
    centerX: CENTER_X, y: H - 290, size: 14, arFont: arReg, latinFont: latinReg, color: GRAY,
  });

  const courseSize = fitFontSizeForWidth(courseTitle, W - 140, 22, 13, arBold, latinBold);
  drawMixedCentered(page, courseTitle, {
    centerX: CENTER_X, y: H - 330, size: courseSize, arFont: arBold, latinFont: latinBold, color: NAVY,
  });

  // صف معلومات أسفل الشهادة: التاريخ / رقم الشهادة / رابط التحقق
  const footerY = 70;
  drawMixed(page, `تاريخ الإصدار: ${formatDate(issuedAt)}`, {
    x: 50, y: footerY, size: 10, arFont: arReg, latinFont: latinReg, color: GRAY,
  });

  const idText = `رقم الشهادة: ${certificateId}`;
  const idWidth = measureMixed(idText, 10, arReg, latinReg).total;
  drawMixed(page, idText, {
    x: W - 50 - idWidth, y: footerY, size: 10, arFont: arReg, latinFont: latinReg, color: GRAY,
  });

  if (verifyUrl) {
    drawMixedCentered(page, verifyUrl, {
      centerX: CENTER_X, y: footerY, size: 9, arFont: arReg, latinFont: latinReg, color: LIGHT_GRAY,
    });
  }

  return pdfDoc.save();
}

/* ─────────────────────────────────────────────────────────────
   3) الإصدار التلقائي عند اكتمال الكورس (اليوم 44)
───────────────────────────────────────────────────────────── */

/**
 * بتصدر شهادة تلقائيًا لطالب أكمل كورس معيّن، لو معندوش شهادة له بالفعل.
 * 🔒 SECURITY / RACE CONDITION: بتعتمد على upsert + الـ unique index
 * {user,course} في Certificate model (شوف app/lib/models/Certificate.js)
 * — لو الدالة اتنادت مرتين في نفس اللحظة (مثلاً محاولتين متزامنتين لإكمال
 * آخر درس)، Mongo هيرفض واحدة منهم بـ duplicate key error، وبنمسكها هنا
 * ونرجّع السجل الموجود بدل ما نفشل العملية اللي نادت الدالة دي أصلاً
 * (إكمال الدرس/الكويز لازم ينجح حتى لو إصدار الشهادة اتصادف مرتين).
 *
 * best-effort ومقصود إنها ما ترميش استثناء لفوق: فشل إصدار الشهادة (مثلاً
 * مشكلة مؤقتة في توليد PDF) ما ينفعش يبوّظ عملية تسجيل إكمال الدرس نفسها.
 *
 * @returns {Promise<object|null>} سجل الشهادة (jsonable) أو null لو مفيش
 *   enrollment مكتمل فعلاً أو حصل خطأ.
 */
export async function issueCertificateForCompletedEnrollment(userId, courseId) {
  try {
    const Certificate = getCertificateModel();

    // لو موجودة بالفعل، منعملش حاجة (idempotent).
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

      // 🔔 Phase 6 — اليوم 50-51: إشعار "شهادة جديدة" للطالب — بعد إنشاء
      // فعلي فقط (مش لو الشهادة كانت موجودة بالفعل، ومش من مسار E11000
      // تحت — عشان الإشعار يتبعت مرة واحدة بالظبط لكل شهادة).
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
      // 🔒 E11000 = duplicate key (سباق مع نداء تاني عمل الشهادة قبلنا
      // بأجزاء من الثانية) — مش خطأ حقيقي، بس نرجّع السجل اللي اتعمل فعلًا.
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
 * بيبني رابط التحقق العام لشهادة معيّنة، من request.url (نفس أسلوب
 * app/api/payments/checkout/route.js) عشان يشتغل صح في أي بيئة (local/
 * staging/production) من غير الحاجة لمتغيّر بيئة إضافي.
 */
export function buildVerifyUrl(request, certificateId) {
  const origin = new URL(request.url).origin;
  return `${origin.replace(/^https?:\/\//, "")}/verify/${certificateId}`;
}