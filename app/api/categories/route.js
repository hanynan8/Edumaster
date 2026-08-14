// app/api/categories/route.js
//
// GET: عام بالكامل (أي زائر يشوف التصنيفات — محتاجينها لفلترة الكورسات في
// الصفحة العامة). POST: أدمن بس.

import { connectToMongo } from "@/app/lib/mongodb";
import { getCategoryModel } from "@/app/lib/models/Category";
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
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "") // يسمح بحروف عربية كمان
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  try {
    await connectToMongo();
    const Category = getCategoryModel();

    // 🔒 عام — بيرجّع بس التصنيفات الفعّالة، مرتبة بالـ order
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    return jsonResponse(
      categories.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        order: c.order,
      }))
    );
  } catch (err) {
    console.error("[/api/categories] GET error:", err);
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
    const Category = getCategoryModel();

    const existing = await Category.findOne({ slug }).lean();
    if (existing) return jsonResponse({ error: "slug_taken" }, 409);

    const created = await Category.create({
      name,
      slug,
      description: String(body?.description || ""),
      icon: body?.icon || null,
      order: Number.isFinite(body?.order) ? body.order : 0,
    });

    return jsonResponse({ id: created._id.toString(), name: created.name, slug: created.slug }, 201);
  } catch (err) {
    console.error("[/api/categories] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}