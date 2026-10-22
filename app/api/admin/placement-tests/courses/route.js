// app/api/admin/placement-tests/courses/route.js
//
// GET — قايمة الكورسات (المنشورة والمسودات) اللي الأدمن يختار منها الكورسات اللي هيظهر عليها
// زرار "اختبر مستواك" لاختبار معيّن. كل كورس راجع معاه الاختبار المخصص المربوط بيه حاليًا (لو فيه).
// أدمن بس.

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { getCourseModel } from "@/app/lib/models";
import { listCustomTests } from "@/app/lib/customPlacementTests";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    await connectToMongo();
    const [courses, tests] = await Promise.all([
      getCourseModel()
        .find({ status: { $in: ["published", "draft"] } }, { title: 1, slug: 1, language: 1, status: 1, displayOrder: 1 })
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(500)
        .lean(),
      listCustomTests(),
    ]);

    const linkedTo = {};
    for (const t of tests) for (const c of t.courseIds || []) linkedTo[c] = t.id;

    return jsonResponse({
      courses: courses.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        language: c.language || null,
        status: c.status,
        linkedTestId: linkedTo[c._id.toString()] || null,
      })),
    });
  } catch (err) {
    console.error("[/api/admin/placement-tests/courses] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
