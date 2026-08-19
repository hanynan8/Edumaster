// app/api/admin/enrollments/[id]/route.js
//
// 🔒 SECURITY FIX (F2 — security audit): قبل كده مفيش أي route بيكتب
// status="cancelled" على Enrollment — يعني الحقل ده كان موجود في الـ schema
// (Enrollment.js) بس "ديكوري"، مفيش أي طريقة فعلية تسحب وصول طالب من كورس
// اشتراه بعد ما اتسجل. الراوت ده بيسد الفجوة دي بنفس نمط الراوت المماثل
// لإدارة الـ membership (app/api/admin/users/[id]/membership/route.js):
// أدمن بس، rate-limited، وكل تغيير بيتسجل audit log.
//
// PATCH body: { status: "active" | "completed" | "cancelled" }
//
// ملحوظة: الفحص الفعلي اللي بيمنع الوصول بعد الإلغاء موجود في
// app/lib/access.js (getCourseAccessForUser) — الراوت ده بس بيدي أداة
// للأدمن يستخدمها؛ من غيره الفحص الأمني الأساسي ماكانش يقدر يتفعّل عمليًا.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getEnrollmentModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { logAudit } from "@/app/lib/auditLog";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_STATUSES = new Set(["active", "completed", "cancelled"]);

export async function PATCH(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 نفس نمط admin/users/[id]/membership — دفاع إضافي لو حساب أدمن
    // اتسرق، بيبطّئ أي محاولة تعديل جماعي/سريع لعدد كبير من الـ enrollments.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "admin:enrollments",
      limit: 30,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || body.status === undefined) {
      return jsonResponse({ error: "invalid_body" }, 400);
    }
    if (!ALLOWED_STATUSES.has(body.status)) {
      return jsonResponse({ error: "invalid_status" }, 400);
    }

    await connectToMongo();
    const Enrollment = getEnrollmentModel();
    const enrollment = await Enrollment.findById(id);
    if (!enrollment) return jsonResponse({ error: "not_found" }, 404);

    const previousStatus = enrollment.status;
    if (previousStatus === body.status) {
      return jsonResponse({
        id: enrollment._id.toString(),
        user: enrollment.user.toString(),
        course: enrollment.course.toString(),
        status: enrollment.status,
      });
    }

    enrollment.status = body.status;
    if (body.status === "completed" && !enrollment.completedAt) {
      enrollment.completedAt = new Date();
    }
    await enrollment.save();

    // 🔒 كل تغيير في enrollment.status (خصوصًا cancelled، اللي فعليًا بيسحب
    // وصول طالب لمحتوى كورس دفعه) بيتسجل audit log — نفس مستوى الحساسية
    // اللي بنعامل بيه تغييرات role/membership.
    await logAudit({
      request,
      actor: session.user,
      action: "enrollment.status_updated",
      targetId: enrollment._id.toString(),
      details: {
        user: enrollment.user.toString(),
        course: enrollment.course.toString(),
        from: previousStatus,
        to: enrollment.status,
      },
    });

    return jsonResponse({
      id: enrollment._id.toString(),
      user: enrollment.user.toString(),
      course: enrollment.course.toString(),
      status: enrollment.status,
    });
  } catch (err) {
    console.error("[/api/admin/enrollments/[id]] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}