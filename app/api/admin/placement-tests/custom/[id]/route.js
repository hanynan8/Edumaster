// app/api/admin/placement-tests/custom/[id]/route.js
//
// 🆕 تعديل اختبار مخصص منشور (B1, B2, ...) من لوحة الأدمن — أدمن بس.
//   GET → الاختبار بشكل قابل للتعديل: { test: <editable>, meta: { id, status, updatedAt, resultsCount, path } }
//         🔒 فيه الإجابات الصحيحة ونصوص التسجيلات (للأدمن بس — مش بتروح للطلاب أبدًا).
//   PUT → body { test: <editable>, expectedUpdatedAt? } — بيتحقق من كل حاجة (placementTestEditor.js) وبيحفظ.
//         لو فيه أي خطأ → 200 { ok:false, errors } ومفيش حاجة بتتحفظ. لو أدمن تاني عدّل بعد ما فتحت → 409 conflict.
//         الحالة والكورسات المربوطة والصوتيات المرفوعة بتفضل زي ما هي. أرقام الأسئلة بتفضل ثابتة (نتايج الطلاب القديمة).

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { logAudit } from "@/app/lib/auditLog";
import { getCustomTestForEdit, editCustomTest } from "@/app/lib/customPlacementTests";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB — أقصى اختبار (400 سؤال) بيقعد في بضع مئات KB

export async function GET(_request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { id } = await params;
    await connectToMongo();
    const res = await getCustomTestForEdit(id);
    if (res.error) return jsonResponse({ error: res.error }, 404);
    return jsonResponse({ test: res.test, meta: res.meta });
  } catch (err) {
    console.error("[/api/admin/placement-tests/custom/[id]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const rl = await enforceRateLimit(request, {
      keyPrefix: "placement-tests:edit",
      limit: 30,
      windowSeconds: 60,
      extraKey: `user:${auth.session.user.id}`,
    });
    if (rl) return rl;

    const raw = await request.text().catch(() => null);
    if (raw === null) return jsonResponse({ error: "invalid_body" }, 400);
    if (raw.length > MAX_BODY_BYTES) return jsonResponse({ error: "payload_too_large", maxBytes: MAX_BODY_BYTES }, 413);
    let body = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    if (!body || typeof body !== "object" || !body.test || typeof body.test !== "object") return jsonResponse({ error: "invalid_body" }, 400);

    const { id } = await params;
    await connectToMongo();
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : null;
    const res = await editCustomTest(id, body.test, { expectedUpdatedAt });

    if (res.error === "not_found") return jsonResponse({ error: "not_found" }, 404);
    if (res.error === "conflict") return jsonResponse({ error: "conflict" }, 409);
    if (res.error === "invalid") return jsonResponse({ ok: false, errors: res.errors, warnings: res.warnings || [] }, 200);
    if (res.error) return jsonResponse({ error: res.error }, 400);

    await logAudit({
      request,
      actor: auth.session.user,
      action: "placement_test.edited",
      targetId: res.id,
      details: { ...res.stats, status: res.status },
    });

    return jsonResponse({ ok: true, updatedAt: res.updatedAt, warnings: res.warnings, stats: res.stats, removedSlots: res.removedSlots });
  } catch (err) {
    console.error("[/api/admin/placement-tests/custom/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
