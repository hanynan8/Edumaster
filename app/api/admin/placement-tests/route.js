// app/api/admin/placement-tests/route.js
//
// لوحة الأدمن: نتائج اختبار تحديد المستوى (إسباني) مع بيانات صاحب الاختبار
// وحالة الدفع. أدمن بس (requireRole + middleware على /api/admin).
//   GET            → كل النتائج (الأحدث أولًا)
//   DELETE ?id=... → مسح نتيجة

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { getPlacementTestsCollection } from "@/app/lib/placementTest";

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
    const docs = await getPlacementTestsCollection()
      .find({}, { projection: { answers: 0 } })
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray();

    return jsonResponse(
      docs.map((d) => ({
        _id: d._id.toString(),
        name: d.name,
        studentNumber: d.studentNumber,
        email: d.email,
        language: d.language,
        score: d.score,
        maxScore: d.maxScore,
        answeredCount: d.answeredCount,
        totalQuestions: d.totalQuestions,
        paymentStatus: d.paymentStatus || "unpaid",
        paidAmount: d.paidAmount ?? null,
        paidCurrency: d.paidCurrency ?? null,
        paidAt: d.paidAt ?? null,
        createdAt: d.createdAt ?? null,
      }))
    );
  } catch (err) {
    console.error("[/api/admin/placement-tests] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const id = new URL(request.url).searchParams.get("id");
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    await getPlacementTestsCollection().deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("[/api/admin/placement-tests] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
