// app/api/admin/placement-tests/route.js
//
// لوحة الأدمن: نتائج اختبار تحديد المستوى (إسباني) مع بيانات صاحب الاختبار
// وحالة الدفع. أدمن بس (requireRole + middleware على /api/admin).
//   GET            → كل النتائج (الأحدث أولًا) — من غير الإجابات التفصيلية
//   GET ?id=...    → نتيجة واحدة بالتفصيل: بيانات الطالب + الدرجة + إجاباته على كل سؤال
//                    مع الإجابة الصحيحة والتصحيح (review)
//   DELETE ?id=... → مسح نتيجة

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { getPlacementTestsCollection } from "@/app/lib/placementTest";
import { reviewFromDoc } from "@/app/lib/placementReview";
import { normalizeTestId } from "@/app/lib/placementTests";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// صف النتيجة (نفس الحقول في القايمة وفي التفاصيل)
function toRow(d) {
  return {
    _id: d._id.toString(),
    userId: d.userId || null,
    test: normalizeTestId(d.test), // نتيجة قديمة من غير test = A1
    name: d.name,
    // الرقم = تليفون الطالب من حسابه (النتايج القديمة كانت مخزّنة في studentNumber)
    phone: d.phone || d.studentNumber || "",
    email: d.email,
    language: d.language,
    score: d.score,
    maxScore: d.maxScore,
    level: d.level || null,
    answeredCount: d.answeredCount,
    totalQuestions: d.totalQuestions,
    paymentStatus: d.paymentStatus || "unpaid",
    paidAmount: d.paidAmount ?? null,
    paidCurrency: d.paidCurrency ?? null,
    paidAt: d.paidAt ?? null,
    emailSent: d.emailSent ?? null,
    createdAt: d.createdAt ?? null,
  };
}

export async function GET(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const id = new URL(request.url).searchParams.get("id");
    if (id !== null) {
      if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);
      await connectToMongo();
      const doc = await getPlacementTestsCollection().findOne({ _id: new mongoose.Types.ObjectId(id) });
      if (!doc) return jsonResponse({ error: "not_found" }, 404);
      return jsonResponse({ ...toRow(doc), review: reviewFromDoc(doc) });
    }

    await connectToMongo();
    const docs = await getPlacementTestsCollection()
      .find({}, { projection: { answers: 0, results: 0 } })
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray();

    return jsonResponse(docs.map(toRow));
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
