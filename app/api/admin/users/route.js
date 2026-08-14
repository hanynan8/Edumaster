// app/api/admin/users/route.js
// بديل آمن عن GET /api/data?collection=auth — محمي بصلاحية admin فعليًا على السيرفر،
// وبيرجع بيانات المستخدمين من غير حقل الباسورد أبدًا.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMembershipPlanModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      // 🔒 SECURITY: بيانات مستخدمين حساسة — تتخزنش (cache) في المتصفح ولا أي proxy
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// 🔒 SECURITY: حد أقصى لعدد المستخدمين المرجعين في الطلب الواحد، حتى لو الجدول كبر جدًا.
// لو محتاج تصفّح كل المستخدمين، ضيف pagination حقيقي (page/limit) بدل ما تسيبها مفتوحة.
const MAX_USERS_RETURNED = 2000;

export async function GET(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    await connectToMongo();
    const AuthModel = getAuthModel();

    // Phase 2 — اليوم 23-24: متابعة انتهاء الصلاحية. ?membershipExpiringWithinDays=N
    // بيرجّع بس المستخدمين اللي عضويتهم "active" وهتنتهي خلال N يوم جايين —
    // مفيدة للأدمن عشان يلحق يجدد قبل ما تنتهي بدل ما يدوّر يدوي على الكل.
    const { searchParams } = new URL(request.url);
    const expiringWithinDays = Number(searchParams.get("membershipExpiringWithinDays"));

    const query = {};
    if (Number.isFinite(expiringWithinDays) && expiringWithinDays > 0) {
      const cutoff = new Date(Date.now() + expiringWithinDays * 24 * 60 * 60 * 1000);
      query["membership.status"] = "active";
      query["membership.expiresAt"] = { $ne: null, $lte: cutoff };
    }

    // 🔒 SECURITY: استبعاد الباسورد من الـ query نفسه، مش بعد ما يتجاب — عشان
    // محتفظش بيه في ذاكرة السيرفر أصلاً، وده بيمنع تسريبه بالغلط في logs أو
    // errors لاحقة. لو الـ schema بتاعك فيه حقول حساسة تانية (زي reset tokens
    // أو أي secret) ضيفها هنا بنفس الطريقة: "-password -fieldName".
    const users = await AuthModel.find(query, "-password")
      .sort({ createdAt: -1 })
      .limit(MAX_USERS_RETURNED)
      .lean();

    // أسماء الخطط بيتجابوا مرة واحدة (batch) بدل ما نعمل query لكل مستخدم
    const planIds = [...new Set(users.map((u) => u.membership?.plan?.toString()).filter(Boolean))];
    let plansById = {};
    if (planIds.length > 0) {
      const MembershipPlan = getMembershipPlanModel();
      const plans = await MembershipPlan.find({ _id: { $in: planIds } }, "name").lean();
      plansById = Object.fromEntries(plans.map((p) => [p._id.toString(), p.name]));
    }

    const safe = users.map((u) => {
      const planId = u.membership?.plan ? u.membership.plan.toString() : null;
      const expiresAt = u.membership?.expiresAt || null;
      const isExpired = Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
      return {
        id: u._id?.toString(),
        name: u.name || null,
        email: u.email || null,
        role: u.role || "student",
        status: u.status || "active",
        createdAt: u.createdAt || null,
        membership: {
          plan: planId,
          planName: planId ? plansById[planId] || null : null,
          status: isExpired && u.membership?.status === "active" ? "expired" : u.membership?.status || "inactive",
          startedAt: u.membership?.startedAt || null,
          expiresAt,
        },
      };
    });

    return jsonResponse(safe, 200);
  } catch (err) {
    // 🔒 SECURITY: التفاصيل الكاملة في الـ server logs بس، رسالة عامة للعميل
    console.error("[/api/admin/users] GET error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}