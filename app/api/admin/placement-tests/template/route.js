// app/api/admin/placement-tests/template/route.js
//
// GET — بينزّل قالب جاهز لرفع اختبار تحديد مستوى جديد (أدمن بس).
//   ?format=pdf  (الافتراضي) → قالب PDF نصّي بالصيغة الثابتة (فيه شرح + مثال شغّال)
//   ?format=txt              → نفس القالب كنص عادي (للنسخ في Word / Google Docs)
//   ?format=xlsx             → قالب Excel القديم (README + Settings + Questions + Bank + Audio)

import { requireRole } from "@/app/lib/rbac";
import { buildSampleTemplate } from "@/app/lib/placementTestTemplate";
import { buildSampleTemplatePdf, buildSampleTemplateText } from "@/app/lib/placementTestPdfTemplate";

const FILES = {
  pdf: { type: "application/pdf", name: "level-test-template.pdf" },
  txt: { type: "text/plain; charset=utf-8", name: "level-test-template.txt" },
  xlsx: { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name: "level-test-template.xlsx" },
};

export async function GET(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const asked = new URL(request.url).searchParams.get("format");
    const format = FILES[asked] ? asked : "pdf";
    const body =
      format === "xlsx" ? await buildSampleTemplate() : format === "txt" ? buildSampleTemplateText() : await buildSampleTemplatePdf();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": FILES[format].type,
        "Content-Disposition": `attachment; filename="${FILES[format].name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/admin/placement-tests/template] GET error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
