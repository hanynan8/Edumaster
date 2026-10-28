// app/api/admin/placement-tests/import/route.js
//
// POST (multipart/form-data) — رفع ملف Excel لاختبار تحديد مستوى مخصص (أدمن بس).
//   file     : ملف .pdf أو .txt (الصيغة الثابتة — placementTestPdfParser.js) أو .xlsx (القالب القديم)
//   mode     : "preview" (الافتراضي) → بيقرا الملف ويرجّع المعاينة والأخطاء من غير ما يحفظ حاجة
//              "save"                → بيقرا ويتحقق ويحفظ الاختبار (لو فيه أخطاء مبيحفظش)
//   status   : "published" | "draft" (للاختبار الجديد بس — الافتراضي published)
//   structure: (اختياري، mode=save بس) 🆕 الاختبار كله بعد ما الأدمن عدّله في المحرّر (placementTestEditor.js): الإعدادات، الأجزاء،
//              المهام، الأسئلة (إضافة/حذف/ترتيب/نقل)، الخيارات، الإجابات، وأماكن الأوديو. بيحلّ محل محتوى الملف المقروء،
//              وبيتحقق بنفس قواعد المحرّر — ولو فيه خطأ مفيش حاجة بتتحفظ. (الـ Test ID بيفضل اللي في الملف.)
//   edits    : (اختياري، قديم) JSON بتعديلات على نص/خيارات/إجابة الأسئلة { [رقم السؤال]: { q, ctx, options, correct } } — لسه مدعوم،
//              بس بيتجاهل لو structure موجود.
//   expectId : (اختياري) لو بتحدّث اختبار موجود: الـ Test ID اللي جوه الملف لازم يطابقه (بيمنع الكتابة فوق اختبار غلط)
//
// الرد: { ok, errors, warnings, summary, exists, saved?, created?, format } — الأخطاء { sheet, row, en, ar } (+ line/excerpt للـ PDF/TXT).
// 🔒 في mode=save مفيش إجابات بترجع. في mode=preview (أدمن بس) بيرجع "review" لمراجعة الأسئلة والإجابات الصحيحة قبل النشر.

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { parsePlacementTestWorkbook } from "@/app/lib/placementTestImport";
import { parsePlacementTestPdf, parsePlacementTestText } from "@/app/lib/placementTestPdfParser";
import { saveCustomTest, getCustomTestDoc, countQuestions } from "@/app/lib/customPlacementTests";
import { applyReviewEdits } from "@/app/lib/placementTestEdits";
import { buildTestFromEditable, testToEditable } from "@/app/lib/placementTestEditor";
import { logAudit } from "@/app/lib/auditLog";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const rl = await enforceRateLimit(request, {
      keyPrefix: "placement-tests:import",
      limit: 30,
      windowSeconds: 60,
      extraKey: `user:${auth.session.user.id}`,
    });
    if (rl) return rl;

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return jsonResponse({ error: "file_required" }, 400);
    if (file.size > MAX_BYTES) return jsonResponse({ error: "file_too_large", maxBytes: MAX_BYTES }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    // نوع الملف من محتواه: .xlsx = zip ("PK") · .pdf = "%PDF" · .txt = نص عادي (بس لو اسم الملف .txt)
    let kind = null;
    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) kind = "xlsx";
    else if (buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") kind = "pdf";
    else if (/\.(txt|text)$/i.test(String(file.name || ""))) kind = "txt";
    if (!kind) {
      return jsonResponse(
        {
          ok: false,
          errors: [{ sheet: "File", row: null, en: "Unsupported file. Upload a text PDF (or .txt) in the fixed format, or the Excel template (.xlsx).", ar: "نوع الملف مش مدعوم. ارفع PDF نصّي (أو .txt) بالصيغة الثابتة، أو قالب Excel (.xlsx)." }],
          warnings: [],
        },
        400
      );
    }

    const mode = form.get("mode") === "save" ? "save" : "preview";
    const status = form.get("status") === "draft" ? "draft" : "published";
    const expectId = String(form.get("expectId") || "").toLowerCase().trim();

    const parsed =
      kind === "pdf"
        ? await parsePlacementTestPdf(buffer)
        : kind === "txt"
          ? await parsePlacementTestText(buffer.toString("utf8"))
          : await parsePlacementTestWorkbook(buffer);
    const { errors, warnings } = parsed;
    if (!parsed.ok) return jsonResponse({ ok: false, errors, warnings, format: kind }, 200);

    const t = parsed.test;
    if (expectId && t.id !== expectId) {
      errors.push({
        sheet: "Settings",
        row: null,
        en: `This file's Test ID is "${t.id}" but you are updating "${expectId}". Change Test ID in the file or use the "New test" upload.`,
        ar: `الـ Test ID في الملف "${t.id}" بس إنت بتحدّث "${expectId}". غيّر الـ Test ID في الملف أو ارفعه كاختبار جديد.`,
      });
      return jsonResponse({ ok: false, errors, warnings, format: kind }, 200);
    }

    await connectToMongo();
    const existing = await getCustomTestDoc(t.id);
    const summary = {
      id: t.id,
      label: t.label,
      title: t.title,
      subject: t.subject,
      ...parsed.stats,
      audio: t.audioSlots.map(({ slot, label, hint }) => ({ slot, label, hint })),
      // ملاحظة: parts/tasks في stats أرقام (عدد) — التفاصيل في partList عشان ما نكتبش فوق العدد
      partList: t.parts.map((p) => ({
        title: p.title,
        minutes: p.minutes,
        tasks: p.tasks.map((k) => ({
          title: k.title,
          questions: k.questions.length,
          matching: Boolean(k.bank),
          audio: k.audioSlot ?? (k.questions.some((q) => q.audioSlot) ? "per-question" : null),
        })),
      })),
    };
    const exists = Boolean(existing);

    if (mode === "preview") {
      // 🔍 مراجعة الأسئلة قبل النشر (أدمن بس): نص السؤال + الخيارات + الإجابة الصحيحة.
      // الإجابة الصحيحة بترجع هنا بمفتاح "correct" (index الخيار) — مش بمفتاح answerKey، ومش بترجع للطلاب خالص.
      const review = t.parts.map((p) => ({
        title: p.title,
        minutes: p.minutes,
        tasks: p.tasks.map((k) => ({
          title: k.title,
          intro: k.intro || "",
          passage: k.passage || "",
          audio: k.audioSlot ?? null,
          bank: k.bank || null,
          questions: k.questions.map((q) => ({
            n: q.n,
            ln: q.ln,
            q: q.q,
            ctx: q.ctx || "",
            options: q.o,
            correct: t.answerKey?.[q.n]?.a ?? null,
            audio: q.audioSlot ?? null,
          })),
        })),
      }));
      // 🆕 editable: نفس الاختبار بشكل قابل للتعديل الكامل في المحرّر (أدمن بس — فيه الإجابات ونصوص التسجيلات)
      return jsonResponse({ ok: true, errors, warnings, summary, review, editable: testToEditable(t), exists, existingStatus: existing?.status || null, format: kind });
    }

    // save: لو الاختبار موجود ومش بنحدّثه صراحةً (expectId) → بنسمح بالتحديث بس لو الأدمن اتأكد في الواجهة (expectId)
    if (exists && !expectId) {
      return jsonResponse(
        {
          ok: false,
          errors: [{ sheet: "Settings", row: null, en: `A test with ID "${t.id}" already exists. Open it from the list and use "Update from file", or change Test ID.`, ar: `فيه اختبار بنفس الـ ID "${t.id}". افتحه من القايمة واستخدم "تحديث من ملف"، أو غيّر الـ Test ID.` }],
          warnings,
        },
        200
      );
    }

    // ✏️ 🆕 المحرّر الكامل: الأدمن عدّل الهيكل كله في شاشة المراجعة → بيحلّ محل الملف المقروء (بعد التحقق الكامل)
    let editedCount = 0;
    let finalWarnings = warnings;
    const rawStructure = form.get("structure");
    const hasStructure = typeof rawStructure === "string" && rawStructure.trim();
    if (hasStructure) {
      let structure = null;
      try {
        structure = rawStructure.length <= 2 * 1024 * 1024 ? JSON.parse(rawStructure) : null;
      } catch {
        structure = null;
      }
      if (!structure || typeof structure !== "object") {
        return jsonResponse({ ok: false, errors: [{ sheet: "Editor", row: null, en: "Invalid edited test payload.", ar: "صيغة تعديلات الاختبار غير صحيحة." }], warnings, edits: true }, 200);
      }
      // اختبار جديد/محدّث من ملف: الأسئلة بتتـرقّم من 1 بالترتيب بعد التعديل (زي أي رفع من ملف)
      const built = buildTestFromEditable(structure, { renumber: true });
      if (!built.ok) return jsonResponse({ ok: false, errors: built.errors, warnings: built.warnings, edits: true }, 200);
      const before = JSON.stringify([t.label, t.title, t.subject, t.thresholds, t.parts, t.answerKey, t.audioSlots, t.scripts]);
      Object.assign(t, {
        label: built.test.label,
        title: built.test.title,
        subject: built.test.subject,
        thresholds: built.test.thresholds,
        parts: built.test.parts,
        answerKey: built.test.answerKey,
        audioSlots: built.test.audioSlots,
        scripts: built.test.scripts,
        nextN: built.test.nextN,
      });
      const after = JSON.stringify([t.label, t.title, t.subject, t.thresholds, t.parts, t.answerKey, t.audioSlots, t.scripts]);
      editedCount = before === after ? 0 : 1;
      finalWarnings = [...warnings, ...built.warnings];
    }

    // ✏️ تعديلات الأدمن القديمة من شاشة المراجعة (نص/خيارات/إجابة) — لو مفيش structure
    const rawEdits = hasStructure ? null : form.get("edits");
    if (typeof rawEdits === "string" && rawEdits.trim()) {
      let edits = null;
      try {
        edits = rawEdits.length <= 2 * 1024 * 1024 ? JSON.parse(rawEdits) : null;
      } catch {
        edits = null;
      }
      const applied = edits ? applyReviewEdits(t, edits) : { ok: false, errors: [{ sheet: "Review", row: null, en: "Invalid edits payload.", ar: "صيغة التعديلات غير صحيحة." }] };
      if (!applied.ok) return jsonResponse({ ok: false, errors: applied.errors, warnings, edits: true }, 200);
      editedCount = applied.count;
    }

    const saved = await saveCustomTest(t, { mode: expectId ? "update" : "create", status });
    if (saved.error) return jsonResponse({ ok: false, errors: [{ sheet: "Settings", row: null, en: `Could not save (${saved.error}).`, ar: `تعذّر الحفظ (${saved.error}).` }], warnings }, 200);

    await logAudit({
      request,
      actor: auth.session.user,
      action: saved.created ? "placement_test.created" : "placement_test.updated",
      targetId: t.id,
      details: { questions: countQuestions(t.parts), status: saved.status, format: kind, editedQuestions: editedCount, editedInReview: Boolean(hasStructure && editedCount) },
    });

    return jsonResponse({ ok: true, errors, warnings: finalWarnings, summary: { ...summary, ...(hasStructure ? { questions: countQuestions(t.parts) } : {}) }, saved: true, created: saved.created, status: saved.status, format: kind, editedQuestions: editedCount });
  } catch (err) {
    console.error("[/api/admin/placement-tests/import] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
