// app/api/courses/[id]/route.js
//
// GET: عام لو الكورس published، وإلا صاحب الكورس/أدمن بس (عشان مدرس تاني
// أو زائر ميشوفش كورس لسه draft). PUT/DELETE: صاحب الكورس أو أدمن بس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getCategoryModel, getSectionModel, getLessonModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { slugify } from "@/app/lib/courseHelpers";

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

// حقول مسموح للمدرس/الأدمن يعدّلوها. أي حقل تاني (teacher, studentsCount,
// ratingAverage, totalDurationSeconds...) محسوب/محمي ومش موجود في اللستة دي
// عن قصد — حتى لو اتبعت في الـ body بيتجاهل تمامًا.
const EDITABLE_FIELDS = [
  "title",
  "shortDescription",
  "description",
  "thumbnail",
  "category",
  "level",
  "language",
  "price",
  "currency",
  "isFree",
  "requirements",
  "outcomes",
  "tags",
  "status",
];

async function loadCourse(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const Course = getCourseModel();
  getCategoryModel();
  return Course.findById(id).populate("category", "name slug").populate("teacher", "name");
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const course = await loadCourse(id);
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    if (course.status !== "published") {
      const auth = await requireSession();
      if (auth.response) return jsonResponse({ error: "not_found" }, 404); // مش هنسرّب وجود كورس draft
      if (!isOwnerOrAdmin(auth.session, course.teacher._id || course.teacher)) {
        return jsonResponse({ error: "not_found" }, 404);
      }
    }

    return jsonResponse(serializeCourse(course));
  } catch (err) {
    console.error("[/api/courses/[id]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const existing = await Course.findById(id);
    if (!existing) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, existing.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "invalid_body" }, 400);

    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] === undefined) continue;
      updates[field] = body[field];
    }

    if (updates.title !== undefined) {
      updates.title = String(updates.title).trim();
      if (!updates.title) return jsonResponse({ error: "invalid_title" }, 400);
    }
    if (updates.category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(updates.category)) {
        return jsonResponse({ error: "invalid_category" }, 400);
      }
      const Category = getCategoryModel();
      const cat = await Category.findById(updates.category).lean();
      if (!cat) return jsonResponse({ error: "category_not_found" }, 404);
    }
    if (updates.level !== undefined && !["beginner", "intermediate", "advanced"].includes(updates.level)) {
      return jsonResponse({ error: "invalid_level" }, 400);
    }
    if (updates.status !== undefined && !["draft", "published", "archived"].includes(updates.status)) {
      return jsonResponse({ error: "invalid_status" }, 400);
    }
    if (updates.price !== undefined) {
      updates.price = Math.max(0, Number(updates.price) || 0);
    }
    if (updates.isFree) {
      updates.price = 0;
    }
    if (updates.shortDescription !== undefined) {
      updates.shortDescription = String(updates.shortDescription).slice(0, 300);
    }
    // 🔒 لو المدرس عايز يغيّر الـ slug لازم يبقى فريد
    if (body.slug !== undefined) {
      const newSlug = slugify(body.slug);
      if (!newSlug) return jsonResponse({ error: "invalid_slug" }, 400);
      if (newSlug !== existing.slug) {
        const taken = await Course.exists({ slug: newSlug, _id: { $ne: existing._id } });
        if (taken) return jsonResponse({ error: "slug_taken" }, 409);
        updates.slug = newSlug;
      }
    }

    Object.assign(existing, updates);
    await existing.save();

    const populated = await existing.populate([
      { path: "category", select: "name slug" },
      { path: "teacher", select: "name" },
    ]);

    return jsonResponse(serializeCourse(populated));
  } catch (err) {
    console.error("[/api/courses/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id);
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    // 🔒 SECURITY / DATA SAFETY: منع حذف كورس فيه طلاب مسجلين فعلاً — الحذف
    // العادي هيمسح كل الأقسام/الدروس وممكن يبوّظ تجربة طلاب دافعين. لو محتاج
    // "يقفل" كورس فيه طلاب، يستخدم status=archived بدل الحذف الفعلي.
    if (course.studentsCount > 0) {
      return jsonResponse({ error: "course_has_students", studentsCount: course.studentsCount }, 409);
    }

    const Section = getSectionModel();
    const Lesson = getLessonModel();

    await Promise.all([
      Lesson.deleteMany({ course: course._id }),
      Section.deleteMany({ course: course._id }),
    ]);
    await course.deleteOne();

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/courses/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}