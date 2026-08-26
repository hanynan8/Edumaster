// app/api/courses/[id]/route.js
//
// GET: عام لو الكورس published، وإلا صاحب الكورس/أدمن بس (عشان مدرس تاني
// أو زائر ميشوفش كورس لسه draft). PUT/DELETE: صاحب الكورس أو أدمن بس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getCategoryModel, getSectionModel, getLessonModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { slugify, sanitizeCourseI18n } from "@/app/lib/courseHelpers";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";
import { createNotification, getAdminUserIds } from "@/app/lib/notificationHelpers";
import { sanitizePrices, emptyPrices } from "@/app/lib/currency";

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
    i18n: c.i18n instanceof Map ? Object.fromEntries(c.i18n) : c.i18n || {},
    durationLabel: c.durationLabel || "",
    category: c.category?._id ? c.category._id.toString() : c.category?.toString(),
    categoryName: c.category?.name,
    categoryI18n: c.category?.i18n instanceof Map ? Object.fromEntries(c.category.i18n) : c.category?.i18n || {},
    teacher: c.teacher?._id ? c.teacher._id.toString() : c.teacher?.toString(),
    teacherName: c.teacher?.name,
    level: c.level,
    language: c.language,
    prices: c.prices || { EGP: 0, USD: 0, EUR: 0 },
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
  "durationLabel",
  "category",
  "level",
  "language",
  "prices",
  "isFree",
  "requirements",
  "outcomes",
  "tags",
  "status",
];

// 🩹 FIX (باگ "مش بيتحذف"): بعض الكورسات ممكن تكون اتحطت في الداتابيز
// مباشرة (سكريبت/استيراد بيانات/تعديل يدوي في الكلستر) من غير ما تعدي على
// POST /api/courses، فبتفتقد حقول Mongoose بتحسبها تلقائي (totalDurationSeconds،
// totalLessonsCount، studentsCount...) — عشان كده بتظهر في الكارت بـ "NaN"
// أو قيم فاضية. المستند نفسه غالبًا سليم (_id عادي)، لكن أي عملية عليه لازم
// تفضل تشتغل عادي؛ الدالة دي مجرد نقطة مركزية لجيب الكورس مستخدمة في
// GET/PUT/DELETE عشان نضمن نفس السلوك في التلاتة.
async function findCourseFlexible(id) {
  const Course = getCourseModel();
  if (mongoose.Types.ObjectId.isValid(id)) {
    const found = await Course.findById(id);
    if (found) return found;
  }
  // fallback: لو الـ id مش شكل ObjectId عادي (مثلاً كورس اتحط يدوي بـ _id
  // نصي)، findById كان بيرفضه فورًا (invalid_id) قبل حتى ما يدوّر في
  // الداتابيز — فمفيش طريقة تاني تحذفه من الواجهة أبدًا. بندوّر هنا بالـ
  // driver الخام (من غير كاست Mongoose) عشان نلاقيه ونقدر نتعامل معاه.
  try {
    const raw = await Course.collection.findOne({ _id: id });
    return raw ? Course.hydrate(raw) : null;
  } catch {
    return null;
  }
}

async function loadCourse(id) {
  const course = await findCourseFlexible(id);
  if (!course) return null;
  getCategoryModel();
  return course.populate([
    { path: "category", select: "name slug i18n" },
    { path: "teacher", select: "name" },
  ]);
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

    await connectToMongo();
    const Course = getCourseModel();
    const existing = await findCourseFlexible(id);
    if (!existing) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isOwnerOrAdmin(session, existing.teacher)) {
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
    if (updates.status !== undefined && !["draft", "pending", "published", "archived"].includes(updates.status)) {
      return jsonResponse({ error: "invalid_status" }, 400);
    }

    // 🔒 PRODUCT RULE: مدرس (مش أدمن) مينفعش "ينشر" كورس مباشرة. لو حاول
    // يحط status="published" — سواء كورس جديد لسه draft، أو كورس رجّعه
    // draft بعدين حب ينشره تاني — بنحوّل الطلب لـ "pending" (قيد المراجعة)
    // بدل ما ننفذه زي ما هو، وبنبعت إشعار لكل الأدمنز إن فيه كورس مستني
    // مراجعة. لو الكورس أصلاً published ومحدّش غيّر status (لسه published
    // في الـ body)، ده مش "نشر جديد" فمنعملش حاجة (تعديل عادي مش لازم
    // مراجعة تانية).
    let submittedForReview = false;
    if (
      updates.status === "published" &&
      existing.status !== "published" &&
      session.user.role !== "admin"
    ) {
      updates.status = "pending";
      submittedForReview = true;
    }
    if (updates.prices !== undefined) {
      updates.prices = sanitizePrices(updates.prices);
    }
    if (updates.isFree) {
      updates.prices = emptyPrices();
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

    // 🆕 i18n بيتعامل معاه لوحده: بندمج اللغات الجايه في body.i18n مع اللي
    // موجودة بالفعل في الكورس (مش overwrite كامل)، عشان تحديث لغة واحدة بس
    // (مثلاً المدرس عدّل النسخة الإنجليزية بس) ميمسحش النسخ التانية.
    if (body.i18n !== undefined) {
      const incoming = sanitizeCourseI18n(body.i18n);
      const merged = existing.i18n instanceof Map ? new Map(existing.i18n) : new Map();
      for (const [lang, content] of Object.entries(incoming)) {
        merged.set(lang, content);
      }
      updates.i18n = merged;
    }

    Object.assign(existing, updates);
    await existing.save();

    const populated = await existing.populate([
      { path: "category", select: "name slug i18n" },
      { path: "teacher", select: "name" },
    ]);

    // 🆕 best-effort: مش لازم نستنى الإشعارات دي أو نفشل الطلب لو فشلت —
    // شوف تعليق notificationHelpers.js عن نفس المبدأ في certificateHelpers.js
    if (submittedForReview) {
      getAdminUserIds()
        .then((adminIds) =>
          Promise.all(
            adminIds.map((adminId) =>
              createNotification({
                user: adminId,
                type: "course_pending_review",
                title: "كورس جديد بينتظر المراجعة",
                message: `المدرس "${populated.teacher?.name || ""}" طلب نشر الكورس "${populated.title}" — محتاج مراجعتك.`,
                link: "/admin",
                course: populated._id,
              })
            )
          )
        )
        .catch((err) => console.error("[/api/courses/[id]] PUT notify admins error:", err));
    }

    return jsonResponse({ ...serializeCourse(populated), submittedForReview });
  } catch (err) {
    console.error("[/api/courses/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await connectToMongo();
    const Course = getCourseModel();
    const course = await findCourseFlexible(id);
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    // 🔒 SECURITY / DATA SAFETY: منع حذف كورس فيه طلاب مسجلين فعلاً — الحذف
    // العادي هيمسح كل الأقسام/الدروس وممكن يبوّظ تجربة طلاب دافعين. لو محتاج
    // "يقفل" كورس فيه طلاب، يستخدم status=archived بدل الحذف الفعلي.
    // (Number(...) عشان كورسات قديمة/معطوبة ممكن يبقى studentsCount عندها
    // undefined بدل 0 — undefined > 0 لوحدها كانت هتفوت بأمان برضه، لكن
    // بنثبّتها صراحة عشان الفحص يبقى واضح.)
    const studentsCount = Number(course.studentsCount) || 0;
    if (studentsCount > 0) {
      return jsonResponse({ error: "course_has_students", studentsCount }, 409);
    }

    const Section = getSectionModel();
    const Lesson = getLessonModel();

    try {
      await Promise.all([
        Lesson.deleteMany({ course: course._id }),
        Section.deleteMany({ course: course._id }),
      ]);
      await course.deleteOne();
    } catch (deleteErr) {
      // 🩹 FIX: كورسات معطوبة (اتحطت يدوي في الداتابيز، مش عن طريق
      // التطبيق) ممكن يبقى فيها قيمة _id أو حقول تانية بشكل Mongoose مش
      // متوقعه (مثلاً _id مش ObjectId قياسي) — في الحالة دي course.deleteOne()
      // بيحاول يعمل cast للفلتر ويفشل برمي CastError، فالحذف كان بيفشل بصمت
      // ويرجع "internal_error" عام من غير ما يتحذف أي حاجة فعليًا، والمستخدم
      // يفضل شايف الكورس في الليستة ومحتار ليه "مش بيتحذف".
      //
      // هنا بنعمل fallback بالـ native driver (من غير أي كاست Mongoose)
      // عشان نضمن حذف المستند الفعلي أيًا كان شكل الـ _id بتاعه، وبرضه
      // ننضّف أي Sections/Lessons مرتبطة بيه لو موجودة.
      console.error("[/api/courses/[id]] DELETE fallback (raw driver) triggered:", deleteErr?.message);
      await Promise.all([
        Lesson.collection.deleteMany({ course: course._id }).catch(() => null),
        Section.collection.deleteMany({ course: course._id }).catch(() => null),
      ]);
      const rawResult = await Course.collection.deleteOne({ _id: course._id });
      if (!rawResult?.deletedCount) {
        console.error("[/api/courses/[id]] DELETE fallback failed to remove course:", course._id);
        return jsonResponse({ error: "delete_failed" }, 500);
      }
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/courses/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}