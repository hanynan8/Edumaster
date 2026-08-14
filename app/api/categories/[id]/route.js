// app/api/categories/[id]/route.js
//
// اليوم 14: تكملة نظام الـ Categories — الأدمن panel (categories.jsx) بيندي
// على /api/categories/[id] بـ PATCH/DELETE من زمان، لكن الراوت ده مكانش
// موجود أصلاً. ده بيضيفه:
//
//   GET    → عام (زي /api/categories بس لتصنيف واحد بالـ id)
//   PATCH  → أدمن بس. بيقبل أي حقل من EDITABLE_FIELDS جزئيًا (مش لازم تبعت
//            كل الحقول)، وبيتحقق من فرادة الـ slug لو اتغيّر.
//   DELETE → أدمن بس. 🔒 بيرفض الحذف لو فيه أي كورس مربوط بالتصنيف ده (منعًا
//            لكورسات تفضل بـ category يشاور على تصنيف محذوف) — لازم الأدمن
//            ينقل الكورسات لتصنيف تاني الأول أو يعطّل التصنيف (isActive=false).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCategoryModel, getCourseModel } from "@/app/lib/models";
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

function serializeCategory(c) {
  return {
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    order: c.order,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

const EDITABLE_FIELDS = ["name", "slug", "description", "icon", "order", "isActive"];

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Category = getCategoryModel();
    const category = await Category.findById(id).lean();
    if (!category) return jsonResponse({ error: "not_found" }, 404);

    return jsonResponse(serializeCategory(category));
  } catch (err) {
    console.error("[/api/categories/[id]] GET error:", err);
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
    const Category = getCategoryModel();
    const existing = await Category.findById(id);
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
        const taken = await Category.exists({ slug: newSlug, _id: { $ne: existing._id } });
        if (taken) return jsonResponse({ error: "slug_taken" }, 409);
      }
      updates.slug = newSlug;
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
    if (updates.icon !== undefined) {
      updates.icon = updates.icon ? String(updates.icon) : null;
    }

    Object.assign(existing, updates);
    await existing.save();

    return jsonResponse(serializeCategory(existing));
  } catch (err) {
    console.error("[/api/categories/[id]] PATCH error:", err);
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
    const Category = getCategoryModel();
    const category = await Category.findById(id);
    if (!category) return jsonResponse({ error: "not_found" }, 404);

    // 🔒 منع حذف تصنيف لسه مربوط بكورسات — شوف الشرح فوق.
    const Course = getCourseModel();
    const coursesCount = await Course.countDocuments({ category: id });
    if (coursesCount > 0) {
      return jsonResponse({ error: "category_in_use", coursesCount }, 409);
    }

    await category.deleteOne();
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/categories/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}