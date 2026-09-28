// app/api/courses/reorder/route.js
//
// PUT { orders: [{ id: "<courseId>", order: <number> }, ...] } — أدمن بس.
// بيحفظ رقم الأوردر (displayOrder) لكل كورس. الأرقام الأصغر بتظهر الأول في
// صفحة /courses والصفحة الرئيسية لكل الزوار (GET /api/courses بيفرز بيه).
// لو كورسين ليهم نفس الرقم، الأحدث بيظهر الأول.
//
// بنكتب بالـ driver مباشرة (Course.collection) مش عن طريق Mongoose، عشان في
// وضع الـ dev الموديل بيتكاشّى وممكن يكون شايل schema قديمة من غير
// displayOrder (ده كان بيطلع "Update document requires atomic operators").

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function PUT(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    const rl = await enforceRateLimit(request, {
      keyPrefix: "courses:reorder",
      limit: 30,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const orders = Array.isArray(body?.orders) ? body.orders : null;
    if (!orders || orders.length === 0 || orders.length > 2000) {
      return jsonResponse({ error: "invalid_orders" }, 400);
    }

    const seen = new Set();
    for (const o of orders) {
      const valid =
        o &&
        typeof o.id === "string" &&
        mongoose.Types.ObjectId.isValid(o.id) &&
        Number.isInteger(o.order) &&
        o.order >= 0 &&
        o.order <= 1000000;
      if (!valid || seen.has(o.id)) return jsonResponse({ error: "invalid_orders" }, 400);
      seen.add(o.id);
    }

    await connectToMongo();
    const Course = getCourseModel();

    const result = await Course.collection.bulkWrite(
      orders.map((o) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(o.id) },
          update: { $set: { displayOrder: o.order } },
        },
      })),
      { ordered: false }
    );

    return jsonResponse({ ok: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (err) {
    console.error("[/api/courses/reorder] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}