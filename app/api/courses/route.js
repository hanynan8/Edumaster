// app/api/courses/route.js
//
// اليوم 6: GET بيخدم حالتين مختلفتين حسب مين بيطلب:
//   - زائر/طالب (مفيش session أو role=student): بيشوف الكورسات المنشورة
//     (status=published) بس — ده اللي بيسمح لهدف الـ Phase ("الطالب يتصفح
//     بدون تسجيل") إنه يشتغل من غير ما نبني endpoint منفصل.
//   - مدرس: بيشوف كورساته هو بس (كل الحالات: draft/published/archived) —
//     ده اللي هيتستخدم في صفحة "كورساتي" (اليوم 10).
//   - أدمن: بيشوف كل الكورسات لأي مدرس (مع فلترة اختيارية ?teacher=).
//
// POST: إنشاء كورس جديد — teacher/admin بس، والكورس بيتسجل دايمًا باسم
// صاحب الـ session (مفيش تمرير teacher من الـ body، منعًا لأي حد يعمل كورس
// باسم مدرس تاني).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getCategoryModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { generateUniqueCourseSlug } from "@/app/lib/courseHelpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeCourse(c) {
  return {
    id: c._id.toString(),
    title: c.title,
    slug: c.slug,
    shortDescription: c.shortDescription,
    description: c.description,
    thumbnail: c.thumbnail,
    category: c.category?._id ? c.category._id.toString() : c.category?.toString(),
    categoryName: c.category?.name,
    teacher: c.teacher?._id ? c.teacher._id.toString() : c.teacher?.toString(),
    teacherName: c.teacher?.name,
    level: c.level,
    language: c.language,
    price: c.price,
    currency: c.currency,
    isFree: c.isFree,
    requirements: c.requirements,
    outcomes: c.outcomes,
    tags: c.tags,
    status: c.status,
    studentsCount: c.studentsCount,
    ratingAverage: c.ratingAverage,
    ratingCount: c.ratingCount,
    totalDurationSeconds: c.totalDurationSeconds,
    totalLessonsCount: c.totalLessonsCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function GET(request) {
  try {
    await connectToMongo();
    const Course = getCourseModel();
    // بنتأكد إن موديل الـ Category متسجل عشان .populate("category") يشتغل
    getCategoryModel();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const categoryFilter = searchParams.get("category");
    const search = searchParams.get("search");

    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    const query = {};

    if (role === "teacher") {
      // مدرس: كورساته هو بس، بكل الحالات
      query.teacher = session.user.id;
    } else if (role === "admin") {
      // أدمن: كل الكورسات، مع فلترة اختيارية بمدرس معيّن
      const teacherFilter = searchParams.get("teacher");
      if (teacherFilter && mongoose.Types.ObjectId.isValid(teacherFilter)) {
        query.teacher = teacherFilter;
      }
    } else {
      // زائر/طالب: المنشور بس (الكتالوج العام)
      query.status = "published";
    }

    if (categoryFilter && mongoose.Types.ObjectId.isValid(categoryFilter)) {
      query.category = categoryFilter;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate("category", "name slug")
        .populate("teacher", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Course.countDocuments(query),
    ]);

    return jsonResponse({
      courses: courses.map(serializeCourse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[/api/courses] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request) {
  try {
    const auth = await requireRole(["teacher", "admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY (Day 59)
    const rl = await enforceRateLimit(request, {
      keyPrefix: "courses:create",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const title = String(body?.title || "").trim();
    if (!title) return jsonResponse({ error: "missing_title" }, 400);
    if (!body?.category || !mongoose.Types.ObjectId.isValid(body.category)) {
      return jsonResponse({ error: "invalid_category" }, 400);
    }

    await connectToMongo();
    const Course = getCourseModel();
    const Category = getCategoryModel();

    const category = await Category.findById(body.category).lean();
    if (!category) return jsonResponse({ error: "category_not_found" }, 404);

    // slug: إما اللي المدرس كتبه (بنتأكد إنه فريد وإلا نرفض)، أو بيتولّد
    // تلقائيًا من العنوان مع ضمان الفرادة (شوف courseHelpers.js)
    let slug;
    if (body?.slug) {
      const { slugify } = await import("@/app/lib/courseHelpers");
      slug = slugify(body.slug);
      if (!slug) return jsonResponse({ error: "invalid_slug" }, 400);
      const taken = await Course.exists({ slug });
      if (taken) return jsonResponse({ error: "slug_taken" }, 409);
    } else {
      slug = await generateUniqueCourseSlug(title);
    }

    const isFree = Boolean(body?.isFree);
    const level = ["beginner", "intermediate", "advanced"].includes(body?.level)
      ? body.level
      : "beginner";

    const created = await Course.create({
      title,
      slug,
      shortDescription: String(body?.shortDescription || "").slice(0, 300),
      description: String(body?.description || ""),
      thumbnail: body?.thumbnail || null,
      category: body.category,
      teacher: session.user.id, // 🔒 دايمًا صاحب الـ session، مش من الـ body
      level,
      language: body?.language || "ar",
      price: isFree ? 0 : Math.max(0, Number(body?.price) || 0),
      currency: body?.currency || "EGP",
      isFree,
      requirements: Array.isArray(body?.requirements) ? body.requirements.map(String) : [],
      outcomes: Array.isArray(body?.outcomes) ? body.outcomes.map(String) : [],
      tags: Array.isArray(body?.tags) ? body.tags.map(String) : [],
      status: "draft", // 🔒 كورس جديد دايمًا draft — النشر إجراء منفصل وواعي
    });

    const populated = await created.populate([
      { path: "category", select: "name slug" },
      { path: "teacher", select: "name" },
    ]);

    return jsonResponse(serializeCourse(populated), 201);
  } catch (err) {
    console.error("[/api/courses] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}