// app/api/cron/membership-expiry/route.js
//
// Phase 6 — اليوم 52 (اختياري): "إشعارات بالإيميل للأحداث المهمة ...
// انتهاء اشتراك". emailHelpers.js كان فيه sendMembershipExpiringEmail
// جاهزة من زمان، والتعليق فوقها بيقول صراحة إنها بتُستخدم من الراوت ده —
// بس الراوت نفسه مكانش موجود خالص. ده بيضيفه.
//
// GET /api/cron/membership-expiry
//   🔒 SECURITY: محمي بـ CRON_SECRET (.env) — لازم يتبعت
//   `Authorization: Bearer <CRON_SECRET>`. ده نفس أسلوب Vercel Cron Jobs
//   القياسي (بيبعت الهيدر ده تلقائي لو الـ cron job متسجّل في vercel.json
//   مع env var CRON_SECRET). لو CRON_SECRET مش متظبط في البيئة (تطوير
//   محلي)، بنسمح بالتشغيل من غير تحقق — نفس سلوك "تجاهل بهدوء" المتبع في
//   RESEND_API_KEY (emailHelpers.js).
//
// المنطق: أي مستخدم عنده membership نشطة (status="active") وموعد
// انتهاءها بين (دلوقتي - يوم) و (دلوقتي + 3 أيام) — المدى ده بيغطي
// "هتنتهي قريبًا" و"انتهت النهاردة تقريبًا" في نفس الاستعلام. مفيش حقل
// "اتبعتله إيميل قبل كده" في الموديل، فالافتراض إن الـ cron ده بيتشغّل
// مرة واحدة يوميًا (Vercel Cron: "0 9 * * *" مثلاً) — أي تشغيل تاني في
// نفس اليوم هيعيد بعت نفس الإيميل لنفس المستخدم، وده قرار مقبول هنا
// (بساطة أهم من إضافة حقل تتبع لسيناريو نادر) بدل ما يفشل بصمت.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMembershipPlanModel } from "@/app/lib/models";
import { sendMembershipExpiringEmail } from "@/app/lib/emailHelpers";

const CRON_SECRET = process.env.CRON_SECRET;
const WARNING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 أيام قدام
const LOOKBACK_MS = 24 * 60 * 60 * 1000; // يوم واحد وراء (انتهت للتو)

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    if (CRON_SECRET) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${CRON_SECRET}`) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    } else {
      console.warn("[cron/membership-expiry] CRON_SECRET not set — running without auth check");
    }

    await connectToMongo();
    const AuthModel = getAuthModel();

    const now = Date.now();
    const users = await AuthModel.find(
      {
        "membership.status": "active",
        "membership.expiresAt": { $gte: new Date(now - LOOKBACK_MS), $lte: new Date(now + WARNING_WINDOW_MS) },
      },
      "name email membership"
    ).lean();

    if (users.length === 0) return jsonResponse({ processed: 0 });

    const MembershipPlan = getMembershipPlanModel();
    const planIds = [...new Set(users.map((u) => u.membership.plan?.toString()).filter(Boolean))];
    const plans = await MembershipPlan.find({ _id: { $in: planIds } }, "name").lean();
    const planNameById = new Map(plans.map((p) => [p._id.toString(), p.name]));

    let sent = 0;
    for (const user of users) {
      if (!user.email) continue;
      const daysLeft = Math.ceil((new Date(user.membership.expiresAt).getTime() - now) / (24 * 60 * 60 * 1000));
      const ok = await sendMembershipExpiringEmail({
        toEmail: user.email,
        name: user.name || "Student",
        planName: planNameById.get(user.membership.plan?.toString()) || "Membership",
        expiresAt: user.membership.expiresAt,
        daysLeft,
      });
      if (ok) sent += 1;
    }

    return jsonResponse({ processed: users.length, sent });
  } catch (err) {
    console.error("[/api/cron/membership-expiry] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}