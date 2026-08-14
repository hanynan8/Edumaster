// app/api/admin/users/[id]/route.js
//
// PATCH: تغيير role و/أو status لمستخدم معيّن. DELETE: حذف مستخدم. الاتنين
// admin-only (عبر requireRole من rbac.js)، وكل إجراء بيتسجل في الـ audit log
// (شوف lib/auditLog.js) قبل ما يرجع رد نجاح للعميل — عشان نضمن مفيش إجراء
// حساس بيتم من غير أثر موثّق.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { logAudit } from "@/app/lib/auditLog";
import { requireRole } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 SECURITY: الأدوار/الحالات المسموحة فقط — أي قيمة تانية (زي "superadmin"
// مخترعة من العميل) بترفض فورًا.
const ALLOWED_ROLES = new Set(["student", "teacher", "admin"]);
const ALLOWED_STATUSES = new Set(["active", "suspended"]);

export async function PATCH(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return jsonResponse({ error: "invalid_id" }, 400);
    }

    const body = await request.json().catch(() => null);
    const newRole = body?.role;
    const newStatus = body?.status;

    // 🔒 لازم يتبعت واحد على الأقل، وأي قيمة مبعوتة لازم تكون من القيم
    // المسموحة — مفيش partial trust هنا، أي حاجة غريبة بترفض الطلب كله.
    if (newRole === undefined && newStatus === undefined) {
      return jsonResponse({ error: "nothing_to_update" }, 400);
    }
    if (newRole !== undefined && !ALLOWED_ROLES.has(newRole)) {
      return jsonResponse({ error: "invalid_role" }, 400);
    }
    if (newStatus !== undefined && !ALLOWED_STATUSES.has(newStatus)) {
      return jsonResponse({ error: "invalid_status" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const target = await AuthModel.findById(id);
    if (!target) return jsonResponse({ error: "not_found" }, 404);

    const previousRole = target.role || "student";
    const previousStatus = target.status || "active";
    const isSelf = target._id.toString() === session.user.id;

    // 🔒 SECURITY: منع الأدمن من إنزال نفسه (privilege self-lockout) لو هو
    // آخر أدمن في النظام — غير كده ممكن محدش يقدر يدير النظام تاني.
    if (isSelf && previousRole === "admin" && newRole !== undefined && newRole !== "admin") {
      const adminCount = await AuthModel.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return jsonResponse({ error: "last_admin_protection" }, 400);
      }
    }

    // 🔒 SECURITY: نفس الحماية لكن للإيقاف — أدمن ميقدرش يوقف نفسه لو هو
    // آخر أدمن (وإلا محدش هيقدر يفك الإيقاف تاني).
    if (isSelf && newStatus === "suspended") {
      const adminCount = await AuthModel.countDocuments({ role: "admin", status: { $ne: "suspended" } });
      if (previousRole === "admin" && adminCount <= 1) {
        return jsonResponse({ error: "last_admin_protection" }, 400);
      }
    }

    const roleChanged = newRole !== undefined && newRole !== previousRole;
    const statusChanged = newStatus !== undefined && newStatus !== previousStatus;

    if (!roleChanged && !statusChanged) {
      return jsonResponse(
        { id: target._id.toString(), role: previousRole, status: previousStatus, unchanged: true },
        200
      );
    }

    if (roleChanged) target.role = newRole;
    if (statusChanged) target.status = newStatus;

    // 🔒 SECURITY: أي تعديل حساس (role أو status) لازم يفرض إعادة التحقق من
    // الجلسة — بنزوّد tokenVersion عشان أي جلسة مفتوحة للمستخدم ده تتحدّث
    // فورًا (خلال ~60 ثانية) بدل ما تفضل شغالة بالصلاحيات/الحالة القديمة.
    target.tokenVersion = (target.tokenVersion || 0) + 1;
    await target.save();

    if (roleChanged) {
      await logAudit({
        request,
        actor: session.user,
        action: "user.role_changed",
        targetId: target._id.toString(),
        targetEmail: target.email || null,
        details: { from: previousRole, to: newRole },
      });
    }
    if (statusChanged) {
      await logAudit({
        request,
        actor: session.user,
        action: newStatus === "suspended" ? "user.suspended" : "user.reactivated",
        targetId: target._id.toString(),
        targetEmail: target.email || null,
        details: { from: previousStatus, to: newStatus },
      });
    }

    return jsonResponse(
      {
        id: target._id.toString(),
        role: target.role,
        status: target.status,
        name: target.name,
        email: target.email,
      },
      200
    );
  } catch (err) {
    console.error("[/api/admin/users/[id]] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

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