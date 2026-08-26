// app/api/admin/users/[id]/membership/route.js
//
// Phase 2 — اليوم 23-24: إدارة اشتراكات المستخدمين من لوحة الأدمن —
// ترقية/تخفيض/إلغاء/تجديد يدوي، ومتابعة تاريخ الانتهاء (expiresAt).
// أدمن بس (requireRole)، وكل تغيير بيتسجل في الـ audit log زي أي إجراء
// إداري حساس تاني في المشروع (شوف app/api/admin/users/[id]/route.js).
//
// PATCH body:
//   { plan: "<planId>" | null,       // null = يشيل العضوية تمامًا
//     status: "active"|"inactive"|"expired"|"cancelled",
//     expiresAt: "<ISO date>" | null,
//     extendDays: <number> }         // اختياري: تجديد N يوم بدل ما تحسب
//                                     // expiresAt يدوي — بيمدد من تاريخ
//                                     // الانتهاء الحالي لو لسه ما خلصش،
//                                     // أو من دلوقتي لو خلص/مفيش.
//
// 🔒 لو status اتحول لـ "active" (ترقية/تجديد)، بيتسجل تلقائيًا Payment
// بـ provider="manual" — نفس فكرة Payment model (مصدر الحقيقة المالي)، بس
// من غير charge فعلي لأن ده إجراء يدوي من الأدمن مش دفع إلكتروني.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMembershipPlanModel, getPaymentModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { logAudit } from "@/app/lib/auditLog";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_STATUSES = new Set(["inactive", "active", "expired", "cancelled"]);

export async function PATCH(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY: نفس نمط admin/users/[id] (PATCH) — دفاع إضافي لو حساب
    // أدمن اتسرق، بيبطّئ أي محاولة تعديل جماعي/سريع لعضويات مستخدمين كتير.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "admin:users:membership",
      limit: 30,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "invalid_body" }, 400);

    if (
      body.plan === undefined &&
      body.status === undefined &&
      body.expiresAt === undefined &&
      body.extendDays === undefined
    ) {
      return jsonResponse({ error: "nothing_to_update" }, 400);
    }

    if (body.status !== undefined && !ALLOWED_STATUSES.has(body.status)) {
      return jsonResponse({ error: "invalid_status" }, 400);
    }
    if (body.plan !== undefined && body.plan !== null && !mongoose.Types.ObjectId.isValid(body.plan)) {
      return jsonResponse({ error: "invalid_plan" }, 400);
    }
    if (body.extendDays !== undefined && (!Number.isFinite(Number(body.extendDays)) || Number(body.extendDays) <= 0)) {
      return jsonResponse({ error: "invalid_extend_days" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const target = await AuthModel.findById(id);
    if (!target) return jsonResponse({ error: "not_found" }, 404);

    const MembershipPlan = getMembershipPlanModel();
    let plan = null;
    if (body.plan) {
      plan = await MembershipPlan.findById(body.plan).lean();
      if (!plan) return jsonResponse({ error: "plan_not_found" }, 404);
    }

    const previous = {
      plan: target.membership?.plan ? target.membership.plan.toString() : null,
      status: target.membership?.status || "inactive",
      expiresAt: target.membership?.expiresAt || null,
    };

    const next = {
      plan: target.membership?.plan || null,
      status: target.membership?.status || "inactive",
      startedAt: target.membership?.startedAt || null,
      expiresAt: target.membership?.expiresAt || null,
    };

    // plan === null صراحةً → يشيل العضوية بالكامل (رجوع لـ inactive)
    if (body.plan === null) {
      next.plan = null;
      next.status = "inactive";
      next.expiresAt = null;
    } else if (body.plan !== undefined) {
      next.plan = plan._id;
      if (previous.plan !== body.plan) {
        next.startedAt = new Date(); // خطة جديدة = بداية عضوية جديدة
      }
    }

    if (body.status !== undefined) next.status = body.status;

    if (body.extendDays !== undefined) {
      const days = Number(body.extendDays);
      const base =
        next.expiresAt && new Date(next.expiresAt).getTime() > Date.now()
          ? new Date(next.expiresAt)
          : new Date();
      next.expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      next.status = "active"; // تجديد بيفعّل العضوية تلقائيًا
    } else if (body.expiresAt !== undefined) {
      next.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    if (next.status === "active" && !next.plan) {
      return jsonResponse({ error: "active_status_requires_plan" }, 400);
    }
    if (next.status === "active" && !next.startedAt) {
      next.startedAt = new Date();
    }

    target.membership = next;
    await target.save();

    const becameActive = previous.status !== "active" && next.status === "active";

    // 🔒 كل ترقية/تجديد (تحويل لـ active) بيسجّل Payment يدوي — سجل مالي
    // موحّد حتى لو الاشتراك اتفعّل يدويًا مش عن طريق بوابة دفع.
    if (becameActive && next.plan) {
      try {
        const Payment = getPaymentModel();
        await Payment.create({
          user: target._id,
          type: "membership",
          membershipPlan: next.plan,
          // 🆕 التفعيل هنا يدوي من الأدمن (مش عن طريق Paymob checkout فعلي)،
          // فمفيش "لغة موقع" فعلية نستنتج منها العملة — بنسجل السعر الأساسي
          // بالجنيه المصري (EGP) دايمًا كسجل مرجعي، بغض النظر عن لغة اليوزر.
          amount: Math.round((plan?.prices?.EGP ?? 0) * 100), // 🩹 FIX: plan.prices مبالغ كاملة، Payment.amount بالقروش — نفس تحويل checkout/route.js.
          currency: "EGP",
          status: "succeeded",
          provider: "manual",
          paidAt: new Date(),
          metadata: { grantedBy: session.user.id, reason: "admin_manual_membership_update" },
        });
      } catch (err) {
        // فشل تسجيل الدفع مايوقفش تفعيل العضوية نفسها، لكن لازم يتسجل.
        console.error("[/api/admin/users/[id]/membership] Payment record failed:", err);
      }
    }

    await logAudit({
      request,
      actor: session.user,
      action: "user.membership_updated",
      targetId: target._id.toString(),
      targetEmail: target.email || null,
      details: { from: previous, to: { plan: next.plan?.toString() || null, status: next.status, expiresAt: next.expiresAt } },
    });

    return jsonResponse({
      id: target._id.toString(),
      membership: {
        plan: next.plan ? next.plan.toString() : null,
        planName: plan?.name || null,
        status: next.status,
        startedAt: next.startedAt,
        expiresAt: next.expiresAt,
      },
    });
  } catch (err) {
    console.error("[/api/admin/users/[id]/membership] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}