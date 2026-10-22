// app/api/admin/placement-tests/custom/export/route.js
//
// GET ?id=<testId> — بينزّل اختبار مخصص موجود كملف Excel (.xlsx) بنفس فورمات القالب،
// عشان الأدمن يعدّل فيه ويرجّع يرفعه بـ "تحديث من ملف". أدمن بس.
// ⚠️ الملف فيه مفتاح الإجابات الصح (هو أصلًا ملف الأدمن) — بيتبعت للأدمن بس.

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { getCustomTestDoc } from "@/app/lib/customPlacementTests";
import { testToXlsxBuffer } from "@/app/lib/placementTestTemplate";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const id = String(new URL(request.url).searchParams.get("id") || "").toLowerCase();
    await connectToMongo();
    const doc = await getCustomTestDoc(id);
    if (!doc) return jsonResponse({ error: "not_found" }, 404);

    const buffer = await testToXlsxBuffer({
      id: doc.testId,
      label: doc.label,
      title: doc.title,
      subject: doc.subject,
      thresholds: doc.thresholds,
      parts: doc.parts || [],
      answerKey: doc.answerKey || {},
      audioSlots: doc.audioSlots || [],
      scripts: doc.scripts || {},
    });
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="level-test-${doc.testId}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/admin/placement-tests/custom/export] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
