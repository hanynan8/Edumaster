// app/api/membership-plans/[id]/subscribe/route.js
//
// Phase 2 — اليوم 18-19: اشتراك الطالب في خطة membership مجانية (Free plan)
// من غير ما يحتاج تدخل أدمن — بالظبط نفس فكرة "اشترك في كورس مجاني" في
// app/api/enrollments/route.js. خطط مدفوعة لسه معندناش مسار دفع إلكتروني
// (Phase قادمة) فبترجع 402 زي الكورسات المدفوعة، والأدمن يقدر يفعّل
// العضوية يدويًا من app/api/admin/users/[id]/membership.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMembershipPlanModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request, { params }) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    // 🔒 SECURITY (Day 59)
    const rl = await enforceRateLimit(request, {
      keyPrefix: "membership:subscribe",
      limit: 15,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    await connectToMongo();
    const MembershipPlan = getMembershipPlanModel();
    const plan = await MembershipPlan.findById(id).lean();
    if (!plan || !plan.isActive) return jsonResponse({ error: "not_found" }, 404);

    // 🔒 خطة مدفوعة: لسه معندناش دفع إلكتروني — بنرفض بدل ما نفعّل عضوية
    // من غير دفع فعلي.
    const anyPricePositive = plan.prices && Object.values(plan.prices).some((v) => Number(v) > 0);
    if (plan.billingCycle !== "free" || anyPricePositive) {
      return jsonResponse({ error: "payment_required" }, 402);
    }

    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(session.user.id);
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    // idempotent: لو مشترك فعلاً في نفس الخطة دي وفعّالة، رجّع نجاح بس
    const currentPlan = user.membership?.plan ? user.membership.plan.toString() : null;
    const currentlyActive =
      user.membership?.status === "active" &&
      (!user.membership.expiresAt || new Date(user.membership.expiresAt) > new Date());

    if (currentPlan === id && currentlyActive) {
      return jsonResponse({
        subscribed: true,
        membership: {
          plan: id,
          status: user.membership.status,
          expiresAt: user.membership.expiresAt,
        },
      });
    }

    // خطة مجانية: بدون تاريخ انتهاء (تفضل فعّالة لحد ما اليوزر يلغيها أو
    // الأدمن يغيّرها). خطط مدفوعة (Phase قادمة) هتحدد expiresAt فعليًا حسب
    // billingCycle وقت الدفع الناجح.
    user.membership = {
      plan: plan._id,
      status: "active",
      startedAt: new Date(),
      expiresAt: null,
    };
    await user.save();

    return jsonResponse(
      {
        subscribed: true,
        membership: { plan: id, status: "active", startedAt: user.membership.startedAt, expiresAt: null },
      },
      201
    );
  } catch (err) {
    console.error("[/api/membership-plans/[id]/subscribe] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}