// app/api/membership-plans/[id]/route.js
//
// Phase 2 — اليوم 16-17 (تكملة). زي app/api/categories/[id]/route.js بالظبط
// في البنية:
//   GET    → عام، خطة واحدة بالـ id (حتى لو معطّلة — الأدمن محتاج يفتحها
//            للتعديل، ونفس منطق GET category/[id] القديم).
//   PATCH  → أدمن بس. جزئي (partial update).
//   DELETE → أدمن بس. 🔒 بيرفض الحذف لو فيه أي مستخدم مرتبط بالخطة دي
//            حاليًا (user.membership.plan === هذه الخطة) — لازم الأدمن ينقل
//            المشتركين لخطة تانية الأول أو يعطّل الخطة (isActive=false).

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMembershipPlanModel, getCourseModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";

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
    price: p.price,
    currency: p.currency,
    billingCycle: p.billingCycle,
    features: p.features || [],
    allowedCourses: (p.allowedCourses || []).map((c) => (c._id ? c._id.toString() : c.toString())),
    isActive: p.isActive,
    order: p.order,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const EDITABLE_FIELDS = [
  "name",
  "slug",
  "description",
  "price",
  "currency",
  "billingCycle",
  "features",
  "allowedCourses",
  "isActive",
  "order",
];

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const MembershipPlan = getMembershipPlanModel();
    const plan = await MembershipPlan.findById(id).lean();
    if (!plan) return jsonResponse({ error: "not_found" }, 404);

    return jsonResponse(serializePlan(plan));
  } catch (err) {
    console.error("[/api/membership-plans/[id]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const MembershipPlan = getMembershipPlanModel();
    const existing = await MembershipPlan.findById(id);
    if (!existing) return jsonResponse({ error: "not_found" }, 404);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "invalid_body" }, 400);

    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] === undefined) continue;
      updates[field] = body[field];
    }

    if (updates.name !== undefined) {
      updates.name = String(updates.name).trim();
      if (!updates.name) return jsonResponse({ error: "invalid_name" }, 400);
    }

    if (updates.slug !== undefined) {
      const newSlug = slugify(updates.slug);
      if (!newSlug) return jsonResponse({ error: "invalid_slug" }, 400);
      if (newSlug !== existing.slug) {
        const taken = await MembershipPlan.exists({ slug: newSlug, _id: { $ne: existing._id } });
        if (taken) return jsonResponse({ error: "slug_taken" }, 409);
      }
      updates.slug = newSlug;
    }

    if (updates.billingCycle !== undefined && !["free", "monthly", "yearly"].includes(updates.billingCycle)) {
      return jsonResponse({ error: "invalid_billing_cycle" }, 400);
    }
    if (updates.price !== undefined) {
      updates.price = Math.max(0, Number(updates.price) || 0);
    }
    if ((updates.billingCycle || existing.billingCycle) === "free") {
      updates.price = 0;
    }
    if (updates.features !== undefined) {
      updates.features = Array.isArray(updates.features) ? updates.features.map(String) : [];
    }
    if (updates.order !== undefined) {
      updates.order = Number.isFinite(Number(updates.order)) ? Number(updates.order) : 0;
    }
    if (updates.isActive !== undefined) {
      updates.isActive = Boolean(updates.isActive);
    }
    if (updates.description !== undefined) {
      updates.description = String(updates.description);
    }
    if (updates.allowedCourses !== undefined) {
      const ids = Array.isArray(updates.allowedCourses)
        ? updates.allowedCourses.filter((cid) => mongoose.Types.ObjectId.isValid(cid))
        : [];
      if (ids.length > 0) {
        const Course = getCourseModel();
        const count = await Course.countDocuments({ _id: { $in: ids } });
        if (count !== ids.length) return jsonResponse({ error: "invalid_course_in_list" }, 400);
      }
      updates.allowedCourses = ids;
    }

    Object.assign(existing, updates);
    await existing.save();

    return jsonResponse(serializePlan(existing));
  } catch (err) {
    console.error("[/api/membership-plans/[id]] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const MembershipPlan = getMembershipPlanModel();
    const plan = await MembershipPlan.findById(id);
    if (!plan) return jsonResponse({ error: "not_found" }, 404);

    // 🔒 منع حذف خطة لسه مشترك فيها مستخدمين — يمنع user.membership.plan
    // يفضل يشاور على خطة محذوفة (dangling reference).
    const AuthModel = getAuthModel();
    const subscribersCount = await AuthModel.countDocuments({ "membership.plan": id });
    if (subscribersCount > 0) {
      return jsonResponse({ error: "plan_in_use", subscribersCount }, 409);
    }

    await plan.deleteOne();
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/membership-plans/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}