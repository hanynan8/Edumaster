// app/api/admin/progress/recompute/route.js
//
// تصحيح لمرة واحدة (أو عند الحاجة) لنسب إكمال الطلاب المخزّنة (Enrollment.progressPercent
// / status) في الكورسات اللي محتواها اتغيّر قبل ما إعادة الحساب التلقائي تتضاف
// (شوف recomputeCourseProgress في app/lib/progressHelpers.js). من هنا ورا، أي
// تعديل محتوى بيصحّح النسب تلقائيًا، فالـ route ده للبيانات القديمة بس.
//
// POST /api/admin/progress/recompute            → كل الكورسات
// POST /api/admin/progress/recompute { courseId } → كورس واحد
//
// أدمن بس (middleware + requireRole). آمن يتكرر (idempotent): مبيكتبش غير اللي
// فعلاً اتغيّر. بيرجّع ملخّص: عدد الكورسات، المسجّلين اللي اتحدّثوا، واللي بقوا مكتملين.
//
// من الكونسول وإنت مسجّل دخول كأدمن:
//   fetch("/api/admin/progress/recompute", { method: "POST" }).then(r => r.json()).then(console.log)

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { recomputeCourseProgress } from "@/app/lib/progressHelpers";
import { logAudit } from "@/app/lib/auditLog";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    // عملية تقيلة نسبيًا (بتعدّي على كل الكورسات) → حد منخفض
    const rl = await enforceRateLimit(request, {
      keyPrefix: "admin:progress-recompute",
      limit: 5,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const courseId = body?.courseId;
    if (courseId !== undefined && courseId !== null && !mongoose.Types.ObjectId.isValid(courseId)) {
      return jsonResponse({ error: "invalid_course" }, 400);
    }

    await connectToMongo();
    const Course = getCourseModel();
    let ids;
    if (courseId) {
      const exists = await Course.exists({ _id: courseId });
      if (!exists) return jsonResponse({ error: "not_found" }, 404);
      ids = [courseId];
    } else {
      ids = (await Course.find({}, "_id").lean()).map((c) => c._id);
    }

    let updated = 0;
    let newlyCompleted = 0;
    let failedCourses = 0;
    // ورا بعض (مش Promise.all) عشان ما نضغطش الـ DB ولا مولّد الشهادات
    for (const id of ids) {
      const out = await recomputeCourseProgress(id);
      if (out === null) failedCourses += 1;
      else {
        updated += out.updated;
        newlyCompleted += out.newlyCompleted;
      }
    }

    await logAudit({
      request,
      actor: session.user,
      action: "progress.recomputed",
      targetId: courseId ? String(courseId) : "all",
      details: { courses: ids.length, updated, newlyCompleted, failedCourses },
    });

    return jsonResponse({ courses: ids.length, updated, newlyCompleted, failedCourses });
  } catch (err) {
    console.error("[/api/admin/progress/recompute] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
