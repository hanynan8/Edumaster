// app/api/membership/route.js
//
// Phase 2 — اليوم 20-21: حالة عضوية المستخدم الحالي (مش أي مستخدم تاني).
// بتُستخدم في صفحة "My Courses" (app/student/page.jsx) عشان تعرض اسم الخطة
// الحالية وحالتها وتاريخ انتهائها. الإدارة الكاملة (تغيير خطة مستخدم تاني)
// من app/api/admin/users/[id]/membership بس — مش هنا.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMembershipPlanModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(session.user.id, "membership").lean();
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    const membership = user.membership || { plan: null, status: "inactive", startedAt: null, expiresAt: null };

    let plan = null;
    if (membership.plan) {
      const MembershipPlan = getMembershipPlanModel();
      const planDoc = await MembershipPlan.findById(membership.plan).lean();
      if (planDoc) {
        plan = {
          id: planDoc._id.toString(),
          name: planDoc.name,
          slug: planDoc.slug,
          price: planDoc.price,
          currency: planDoc.currency,
          billingCycle: planDoc.billingCycle,
          allCoursesIncluded: !planDoc.allowedCourses || planDoc.allowedCourses.length === 0,
        };
      }
    }

    // 🔒 عضوية "منتهية فعليًا" بس مخزّنة status=active لسه (متأخرة عن أي
    // job دوري بيحدّث الحالة) — بنعكس الحقيقة الفعلية للعميل هنا حتى لو
    // القيمة المخزّنة في الداتابيز لسه ما اتحدّثتش.
    const isExpired = Boolean(
      membership.expiresAt && new Date(membership.expiresAt).getTime() <= Date.now()
    );
    const effectiveStatus = isExpired && membership.status === "active" ? "expired" : membership.status;

    return jsonResponse({
      plan,
      status: effectiveStatus,
      startedAt: membership.startedAt,
      expiresAt: membership.expiresAt,
    });
  } catch (err) {
    console.error("[/api/membership] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}