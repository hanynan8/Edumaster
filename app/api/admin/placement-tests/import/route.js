// app/api/admin/placement-tests/import/route.js
//
// POST (multipart/form-data) — رفع ملف Excel لاختبار تحديد مستوى مخصص (أدمن بس).
//   file     : ملف .xlsx (بالشكل اللي في القالب)
//   mode     : "preview" (الافتراضي) → بيقرا الملف ويرجّع المعاينة والأخطاء من غير ما يحفظ حاجة
//              "save"                → بيقرا ويتحقق ويحفظ الاختبار (لو فيه أخطاء مبيحفظش)
//   status   : "published" | "draft" (للاختبار الجديد بس — الافتراضي published)
//   expectId : (اختياري) لو بتحدّث اختبار موجود: الـ Test ID اللي جوه الملف لازم يطابقه (بيمنع الكتابة فوق اختبار غلط)
//
// الرد: { ok, errors, warnings, summary, exists, saved?, created? } — الأخطاء { sheet, row, en, ar }.
// 🔒 مفتاح الإجابات مبيرجعش في الرد.

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { parsePlacementTestWorkbook } from "@/app/lib/placementTestImport";
import { saveCustomTest, getCustomTestDoc, countQuestions } from "@/app/lib/customPlacementTests";
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
    // .xlsx = ملف zip → لازم يبدأ بـ "PK"
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return jsonResponse(
        {
          ok: false,
          errors: [{ sheet: "File", row: null, en: "This is not an .xlsx file. Save it as Excel Workbook (.xlsx).", ar: "الملف مش .xlsx. احفظه كـ Excel Workbook (.xlsx)." }],
          warnings: [],
        },
        400
      );
    }

    const mode = form.get("mode") === "save" ? "save" : "preview";
    const status = form.get("status") === "draft" ? "draft" : "published";
    const expectId = String(form.get("expectId") || "").toLowerCase().trim();

    const parsed = await parsePlacementTestWorkbook(buffer);
    const { errors, warnings } = parsed;
    if (!parsed.ok) return jsonResponse({ ok: false, errors, warnings }, 200);

    const t = parsed.test;
    if (expectId && t.id !== expectId) {
      errors.push({
        sheet: "Settings",
        row: null,
        en: `This file's Test ID is "${t.id}" but you are updating "${expectId}". Change Test ID in the file or use the "New test" upload.`,
        ar: `الـ Test ID في الملف "${t.id}" بس إنت بتحدّث "${expectId}". غيّر الـ Test ID في الملف أو ارفعه كاختبار جديد.`,
      });
      return jsonResponse({ ok: false, errors, warnings }, 200);
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
      parts: t.parts.map((p) => ({
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
      return jsonResponse({ ok: true, errors, warnings, summary, exists, existingStatus: existing?.status || null });
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
    const saved = await saveCustomTest(t, { mode: expectId ? "update" : "create", status });
    if (saved.error) return jsonResponse({ ok: false, errors: [{ sheet: "Settings", row: null, en: `Could not save (${saved.error}).`, ar: `تعذّر الحفظ (${saved.error}).` }], warnings }, 200);

    await logAudit({
      request,
      actor: auth.session.user,
      action: saved.created ? "placement_test.created" : "placement_test.updated",
      targetId: t.id,
      details: { questions: countQuestions(t.parts), status: saved.status },
    });

    return jsonResponse({ ok: true, errors, warnings, summary, saved: true, created: saved.created, status: saved.status });
  } catch (err) {
    console.error("[/api/admin/placement-tests/import] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
