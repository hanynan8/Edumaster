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
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getCategoryModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { generateUniqueCourseSlug, sanitizeCourseI18n, resolveCourseSubcategory } from "@/app/lib/courseHelpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";
import { sanitizePrices, emptyPrices } from "@/app/lib/currency";
import { createNotification, getAdminUserIds } from "@/app/lib/notificationHelpers";

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
    thumbnail: resolveSecureStoredUrl(c.thumbnail),
    // 🆕 محتوى مترجم لكل لغة مدعومة — c.i18n موديل Map في mongoose، لازم
    // نحوّلها لـ plain object عادي عشان JSON.stringify يشتغل صح.
    i18n: c.i18n instanceof Map ? Object.fromEntries(c.i18n) : c.i18n || {},
    durationLabel: c.durationLabel || "",
    category: c.category?._id ? c.category._id.toString() : c.category?.toString(),
    categoryName: c.category?.name,
    categorySlug: c.category?.slug || "",
    categoryI18n: c.category?.i18n instanceof Map ? Object.fromEntries(c.category.i18n) : c.category?.i18n || {},
    // 🆕 ساب-تصنيف حقيقي (مثلاً لغة الكورس تحت تصنيف "Language") — لو
    // الكورس مالوش ساب-تصنيف، كل الحقول دي بترجع فاضية/null بدل ما تتكسر.
    subcategory: c.subcategory?._id ? c.subcategory._id.toString() : c.subcategory?.toString() || null,
    subcategoryName: c.subcategory?.name || "",
    subcategorySlug: c.subcategory?.slug || "",
    subcategoryI18n: c.subcategory?.i18n instanceof Map ? Object.fromEntries(c.subcategory.i18n) : c.subcategory?.i18n || {},
    teacher: c.teacher?._id ? c.teacher._id.toString() : c.teacher?.toString(),
    teacherName: c.teacher?.name,
    level: c.level,
    language: c.language,
    prices: c.prices || { EGP: 0, USD: 0, EUR: 0 },
    isFree: c.isFree,
    requirements: c.requirements,
    outcomes: c.outcomes,
    tags: c.tags,
    classMarkerQuizId: c.classMarkerQuizId || "",
    status: c.status,
    studentsCount: c.studentsCount,
    ratingAverage: c.ratingAverage,
    ratingCount: c.ratingCount,
    totalDurationSeconds: c.totalDurationSeconds,
    totalLessonsCount: c.totalLessonsCount,
    displayOrder: typeof c.displayOrder === "number" ? c.displayOrder : null,
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
    // 🐛 BUG FIX: .populate("teacher") تحت بيحتاج موديل "Model_auth" يكون
    // متسجل في mongoose الأول (Course.teacher الفعلي بيشاور عليه بالاسم
    // ده — شوف app/lib/models/_helpers.js: USER_MODEL_NAME). getAuthModel()
    // كان بيتسجل بس "بالصدفة" لو route تاني (زي login) نادى عليه قبل كده
    // في نفس الـ process — لو /api/courses كان أول حاجة بتتنادى، كان
    // بيطلع MissingSchemaError. بننادي عليه هنا صراحة عشان الترتيب مايفرقش.
    getAuthModel();

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
      // أدمن: كل الكورسات، مع فلترة اختيارية بمدرس معيّن و/أو بحالة معيّنة
      // (🆕 status=pending بتُستخدم في لوحة "مراجعة الكورسات" — شوف
      // app/admin/components/coursesReviewPanel.jsx)
      const teacherFilter = searchParams.get("teacher");
      if (teacherFilter && mongoose.Types.ObjectId.isValid(teacherFilter)) {
        query.teacher = teacherFilter;
      }
      const statusFilter = searchParams.get("status");
      if (statusFilter && ["draft", "pending", "published", "archived"].includes(statusFilter)) {
        query.status = statusFilter;
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
        .populate("category", "name slug i18n")
        .populate("subcategory", "name slug i18n parent")
        .populate("teacher", "name")
        .sort({ displayOrder: 1, createdAt: -1 })
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

    // 🆕 ساب-تصنيف حقيقي (اختياري) — شوف شرح resolveCourseSubcategory في
    // app/lib/courseHelpers.js.
    const subRes = await resolveCourseSubcategory(Category, body, body.category);
    if (!subRes.ok) return jsonResponse({ error: subRes.error }, 400);

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

    // 🆕 الكورس الجديد يتحط في آخر الترتيب اللي الأدمن حدده (لو فيه ترتيب
    // متحدد أصلاً) بدل ما يظهر في الأول لكل الزوار.
    const lastOrdered = await Course.findOne({ displayOrder: { $type: "number" } })
      .sort({ displayOrder: -1 })
      .select("displayOrder")
      .lean();
    const nextDisplayOrder = lastOrdered ? lastOrdered.displayOrder + 1 : null;

    const isFree = Boolean(body?.isFree);
    const level = ["beginner", "intermediate", "advanced"].includes(body?.level)
      ? body.level
      : "beginner";

    const requestedStatus = body?.status === "archived" ? "archived" : "pending";

    const created = await Course.create({
      title,
      slug,
      shortDescription: String(body?.shortDescription || "").slice(0, 300),
      description: String(body?.description || ""),
      thumbnail: body?.thumbnail || null,
      // 🆕 نسخ لغوية إضافية (ar/en/es) — اختيارية، مفيش أي كورس مجبور
      // يعبّيها كلها؛ اللغة اللي المدرس مكملهاش بترجع للحقول الأساسية برّه
      // i18n وقت العرض.
      i18n: sanitizeCourseI18n(body?.i18n),
      durationLabel: String(body?.durationLabel || "").trim(),
      category: body.category,
      teacher: session.user.id, // 🔒 دايمًا صاحب الـ session، مش من الـ body
      level,
      // 🆕 لو فيه subcategory حقيقي تابع لتصنيف "Language"، الـ language
      // القديم بيتعبّي تلقائيًا من الـ slug بتاعه (backward-compat) — وإلا
      // بيرجع للقيمة اللي المدرس بعتها يدوي أو "es" (إسباني) افتراضيًا.
      language: subRes.provided && subRes.autoLanguage ? subRes.autoLanguage : body?.language || "es",
      subcategory: subRes.provided ? subRes.id : null,
      prices: isFree ? emptyPrices() : sanitizePrices(body?.prices),
      isFree,
      requirements: Array.isArray(body?.requirements) ? body.requirements.map(String) : [],
      outcomes: Array.isArray(body?.outcomes) ? body.outcomes.map(String) : [],
      tags: Array.isArray(body?.tags) ? body.tags.map(String) : [],
      classMarkerQuizId: String(body?.classMarkerQuizId || "").trim().slice(0, 100),
      displayOrder: nextDisplayOrder,
      // 🆕 المدرس بيختار وهو بيرفع الكورس: "pending" (رفع وانتظار موافقة
      // الأدمن — ده الافتراضي) أو "archived" (أرشفة فقط). مفيش "published"
      // مباشرة أبدًا: النشر بموافقة أدمن صريحة بس.
      status: requestedStatus,
    });

    const populated = await created.populate([
      { path: "category", select: "name slug i18n" },
      { path: "subcategory", select: "name slug i18n parent" },
      { path: "teacher", select: "name" },
    ]);

    const submittedForReview = requestedStatus === "pending";
    if (submittedForReview) {
      getAdminUserIds()
        .then((adminIds) =>
          Promise.all(
            adminIds.map((adminId) =>
              createNotification({
                user: adminId,
                type: "course_pending_review",
                title: "دورة جديدة بانتظار المراجعة",
                message: `المدرس "${populated.teacher?.name || ""}" طلب نشر الدورة "${populated.title}" — وهي بحاجة إلى مراجعتك.`,
                link: "/admin",
                course: populated._id,
              })
            )
          )
        )
        .catch((err) => console.error("[/api/courses] POST notify admins error:", err));
    }

    return jsonResponse({ ...serializeCourse(populated), submittedForReview }, 201);
  } catch (err) {
    console.error("[/api/courses] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}