// app/api/courses/[id]/grants/route.js
//
// GET /api/courses/[id]/grants
// 🆕 قايمة الطلاب اللي الموديريتور سجّلهم مجانًا في الكورس (Enrollment بمصدر
// moderator_grant) — بتظهر في فورم تعديل الكورس عشان الموديريتور يعرف مين
// اتسجّل بالفعل قبل ما يضيف غيرهم. التسجيل نفسه بيتم عن طريق
// POST /api/courses (وقت الإنشاء) و PUT /api/courses/[id] (إضافة طلاب).
//
// 🔒 SECURITY: موديريتور/أدمن بس — القايمة فيها إيميلات طلاب.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { listGrantedStudents } from "@/app/lib/courseGrants";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const auth = await requireRole(["moderator", "admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    const rl = await enforceRateLimit(request, {
      keyPrefix: "courses:grants",
      limit: 60,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const exists = await getCourseModel().exists({ _id: id });
    if (!exists) return jsonResponse({ error: "not_found" }, 404);

    const students = await listGrantedStudents(id);
    return jsonResponse({ students });
  } catch (err) {
    console.error("[/api/courses/[id]/grants] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
