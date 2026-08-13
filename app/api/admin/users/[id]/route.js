// app/api/admin/users/[id]/route.js
//
// PATCH: تغيير role مستخدم معيّن. DELETE: حذف مستخدم. الاتنين admin-only،
// وكل إجراء بيتسجل في الـ audit log (شوف lib/auditLog.js) قبل ما يرجع رد
// نجاح للعميل — عشان نضمن مفيش إجراء حساس بيتم من غير أثر موثّق.

import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { logAudit } from "@/app/lib/auditLog";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 SECURITY: الأدوار المسموحة فقط — أي قيمة تانية (زي "superadmin" مخترعة
// من العميل) بترفض فورًا.
const ALLOWED_ROLES = new Set(["student", "teacher", "admin"]);

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireAdminSession();
    if (!session) return jsonResponse({ error: "forbidden" }, 403);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return jsonResponse({ error: "invalid_id" }, 400);
    }

    const body = await request.json().catch(() => null);
    const newRole = body?.role;
    if (!newRole || !ALLOWED_ROLES.has(newRole)) {
      return jsonResponse({ error: "invalid_role" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const target = await AuthModel.findById(id);
    if (!target) return jsonResponse({ error: "not_found" }, 404);

    const previousRole = target.role || "student";

    // 🔒 SECURITY: منع الأدمن من إنزال نفسه (privilege self-lockout) لو هو
    // آخر أدمن في النظام — غير كده ممكن محدش يقدر يدير النظام تاني.
    if (target._id.toString() === session.user.id && previousRole === "admin" && newRole !== "admin") {
      const adminCount = await AuthModel.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return jsonResponse({ error: "last_admin_protection" }, 400);
      }
    }

    if (previousRole === newRole) {
      return jsonResponse({ id: target._id.toString(), role: previousRole, unchanged: true }, 200);
    }

    target.role = newRole;
    // 🔒 SECURITY: تغيير الصلاحيات لازم يفرض إعادة التحقق من الجلسة —
    // بنزوّد tokenVersion عشان أي جلسة مفتوحة للمستخدم ده تتحدّث فورًا
    // (خلال ~60 ثانية) بدل ما تفضل شغالة بالـ role القديم.
    target.tokenVersion = (target.tokenVersion || 0) + 1;
    await target.save();

    await logAudit({
      request,
      actor: session.user,
      action: "user.role_changed",
      targetId: target._id.toString(),
      targetEmail: target.email || null,
      details: { from: previousRole, to: newRole },
    });

    return jsonResponse(
      { id: target._id.toString(), role: target.role, name: target.name, email: target.email },
      200
    );
  } catch (err) {
    console.error("[/api/admin/users/[id]] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAdminSession();
    if (!session) return jsonResponse({ error: "forbidden" }, 403);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return jsonResponse({ error: "invalid_id" }, 400);
    }

    // 🔒 SECURITY: منع الأدمن من حذف حسابه هو نفسه من هنا (لتفادي أخطاء
    // بالغلط) — لو محتاج يقفل حسابه، يعمل ده من مكان تاني بوعي.
    if (id === session.user.id) {
      return jsonResponse({ error: "cannot_delete_self" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const target = await AuthModel.findById(id);
    if (!target) return jsonResponse({ error: "not_found" }, 404);

    // 🔒 SECURITY: منع حذف آخر أدمن في النظام.
    if ((target.role || "student") === "admin") {
      const adminCount = await AuthModel.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return jsonResponse({ error: "last_admin_protection" }, 400);
      }
    }

    const snapshot = { name: target.name, email: target.email, role: target.role };
    await AuthModel.findByIdAndDelete(id);

    await logAudit({
      request,
      actor: session.user,
      action: "user.deleted",
      targetId: id,
      targetEmail: snapshot.email || null,
      details: snapshot,
    });

    return jsonResponse({ id, deleted: true }, 200);
  } catch (err) {
    console.error("[/api/admin/users/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}