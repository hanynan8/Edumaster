// app/api/admin/placement-tests/custom/export/route.js
//
// GET ?id=<testId>[&format=xlsx|pdf|txt] — بينزّل اختبار مخصص موجود بنفس فورمات القالب (الافتراضي Excel)،
// عشان الأدمن يعدّل فيه ويرجّع يرفعه بـ "تحديث من ملف". أدمن بس.
// ⚠️ الملف فيه مفتاح الإجابات الصح (هو أصلًا ملف الأدمن) — بيتبعت للأدمن بس.

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { getCustomTestDoc } from "@/app/lib/customPlacementTests";
import { testToXlsxBuffer } from "@/app/lib/placementTestTemplate";
import { testToPlacementText } from "@/app/lib/placementTestPdfParser";
import { textToPdfBuffer } from "@/app/lib/placementTestPdfTemplate";

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

    const test = {
      id: doc.testId,
      label: doc.label,
      title: doc.title,
      subject: doc.subject,
      thresholds: doc.thresholds,
      parts: doc.parts || [],
      answerKey: doc.answerKey || {},
      audioSlots: doc.audioSlots || [],
      scripts: doc.scripts || {},
    };
    const format = ["pdf", "txt"].includes(new URL(request.url).searchParams.get("format")) ? new URL(request.url).searchParams.get("format") : "xlsx";
    let body;
    let type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (format === "xlsx") body = await testToXlsxBuffer(test);
    else {
      const text = testToPlacementText(test);
      body = format === "pdf" ? await textToPdfBuffer(text, { title: doc.title }) : text;
      type = format === "pdf" ? "application/pdf" : "text/plain; charset=utf-8";
    }
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="level-test-${doc.testId}.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/admin/placement-tests/custom/export] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
