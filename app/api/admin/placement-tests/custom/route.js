// app/api/admin/placement-tests/custom/route.js
//
// إدارة اختبارات تحديد المستوى المخصصة (B1, B2, ...) اللي الأدمن رفعها من Excel — أدمن بس.
//   GET            → قايمة الاختبارات المخصصة (من غير مفتاح الإجابات ولا نصوص التسجيلات)
//   PATCH          → body { id, status?, courseIds? } — نشر/إخفاء/أرشفة + اختيار الكورسات اللي بيظهر عليها الاختبار
//   DELETE ?id=... → حذف: لو فيه نتايج طلاب بيتأرشف بدل ما يتمسح (النتايج القديمة محتاجة هيكل الاختبار)

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { logAudit } from "@/app/lib/auditLog";
import { listCustomTests, updateCustomTestMeta, deleteCustomTest } from "@/app/lib/customPlacementTests";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ERROR_STATUS = { not_found: 404, invalid_status: 400, invalid_courses: 400 };

export async function GET() {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    await connectToMongo();
    return jsonResponse({ tests: await listCustomTests() });
  } catch (err) {
    console.error("[/api/admin/placement-tests/custom] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => null);
    const id = String(body?.id || "").toLowerCase();
    if (!id) return jsonResponse({ error: "invalid_id" }, 400);
    const patch = {};
    if (body.status !== undefined) patch.status = body.status;
    if (body.courseIds !== undefined) patch.courseIds = body.courseIds;
    if (!Object.keys(patch).length) return jsonResponse({ error: "nothing_to_update" }, 400);

    await connectToMongo();
    const res = await updateCustomTestMeta(id, patch);
    if (res.error) return jsonResponse({ error: res.error }, ERROR_STATUS[res.error] || 400);

    await logAudit({
      request,
      actor: auth.session.user,
      action: "placement_test.updated",
      targetId: id,
      details: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.courseIds !== undefined ? { courses: patch.courseIds.length } : {}),
      },
    });
    return jsonResponse({ ok: true, tests: await listCustomTests() });
  } catch (err) {
    console.error("[/api/admin/placement-tests/custom] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const id = String(new URL(request.url).searchParams.get("id") || "").toLowerCase();
    if (!id) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const res = await deleteCustomTest(id);
    if (res.error) return jsonResponse({ error: res.error }, ERROR_STATUS[res.error] || 400);

    await logAudit({
      request,
      actor: auth.session.user,
      action: res.archived ? "placement_test.archived" : "placement_test.deleted",
      targetId: id,
    });
    return jsonResponse({ ok: true, archived: res.archived, tests: await listCustomTests() });
  } catch (err) {
    console.error("[/api/admin/placement-tests/custom] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
