// app/api/membership-plans/route.js
//
// Phase 2 — اليوم 16-17: خطط الاشتراك (Free/Basic/Standard/Pro).
//
// GET  → عام. بيرجّع الخطط الفعّالة بس (isActive: true) — بتُستخدم في صفحة
//   الأسعار العامة /membership. ?all=1 بيرجّع كل الخطط (فعّالة ومعطّلة) لكن
//   أدمن بس — نفس نمط GET /api/categories?all=1 بالظبط.
// POST → إنشاء خطة جديدة، أدمن بس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMembershipPlanModel, getCourseModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { sanitizePrices, emptyPrices } from "@/app/lib/currency";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function serializePlan(p) {
  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    description: p.description,
    prices: p.prices || { EGP: 0, USD: 0, EUR: 0 },
    billingCycle: p.billingCycle,
    features: p.features || [],
    allowedCourses: (p.allowedCourses || []).map((c) => (c._id ? c._id.toString() : c.toString())),
    isActive: p.isActive,
    order: p.order,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function GET(request) {
  try {
    await connectToMongo();
    const MembershipPlan = getMembershipPlanModel();

    const { searchParams } = new URL(request.url);
    const wantsAll = searchParams.get("all") === "1";

    let filter = { isActive: true };
    if (wantsAll) {
      const session = await getServerSession(authOptions);
      if (session?.user?.role === "admin") filter = {};
    }

    // 🆕 مفيش حقل "price" واحد نرتّب بيه بعد التحويل لـ prices (خريطة لكل
    // عملة) — order يدوي (اللي الأدمن بيحدده) كافي وأوضح.
    const plans = await MembershipPlan.find(filter).sort({ order: 1 }).lean();
    return jsonResponse(plans.map(serializePlan));
  } catch (err) {
    console.error("[/api/membership-plans] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => null);
    const name = String(body?.name || "").trim();
    if (!name) return jsonResponse({ error: "missing_name" }, 400);

    const slug = body?.slug ? slugify(body.slug) : slugify(name);
    if (!slug) return jsonResponse({ error: "invalid_slug" }, 400);

    await connectToMongo();
    const MembershipPlan = getMembershipPlanModel();

    const existing = await MembershipPlan.findOne({ slug }).lean();
    if (existing) return jsonResponse({ error: "slug_taken" }, 409);

    const billingCycle = ["free", "monthly", "yearly"].includes(body?.billingCycle)
      ? body.billingCycle
      : "monthly";

    // 🔒 لو الـ IDs جاية من الأدمن، لازم نتأكد إنها فعلاً كورسات موجودة —
    // مش أي string اتبعت بالغلط أو بنية خبيثة.
    let allowedCourses = [];
    if (Array.isArray(body?.allowedCourses)) {
      allowedCourses = body.allowedCourses.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (allowedCourses.length > 0) {
        const Course = getCourseModel();
        const count = await Course.countDocuments({ _id: { $in: allowedCourses } });
        if (count !== allowedCourses.length) {
          return jsonResponse({ error: "invalid_course_in_list" }, 400);
        }
      }
    }

    const created = await MembershipPlan.create({
      name,
      slug,
      description: String(body?.description || ""),
      prices: billingCycle === "free" ? emptyPrices() : sanitizePrices(body?.prices),
      billingCycle,
      features: Array.isArray(body?.features) ? body.features.map(String) : [],
      allowedCourses,
      isActive: body?.isActive !== undefined ? Boolean(body.isActive) : true,
      order: Number.isFinite(body?.order) ? body.order : 0,
    });

    return jsonResponse(serializePlan(created), 201);
  } catch (err) {
    console.error("[/api/membership-plans] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}