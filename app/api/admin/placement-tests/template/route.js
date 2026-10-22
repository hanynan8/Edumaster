// app/api/admin/placement-tests/template/route.js
//
// GET — بينزّل قالب Excel (.xlsx) جاهز لرفع اختبار تحديد مستوى جديد (أدمن بس).
// فيه شيت README بالعربي + Settings + Questions + Bank + Audio ومثال صغير شغّال.

import { requireRole } from "@/app/lib/rbac";
import { buildSampleTemplate } from "@/app/lib/placementTestTemplate";

export async function GET() {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const buffer = await buildSampleTemplate();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="level-test-template.xlsx"',
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
