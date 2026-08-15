// app/api/lessons/[id]/comments/route.js
//
// Phase 6 — اليوم 48-49: "Discussions/Comments بسيطة تحت كل Lesson (سؤال
// ورد)". موديل Comment.js كان موجود من غير أي API بيستخدمه — الملف ده هو
// الربط الناقص. مستوى واحد بس (سؤال + ردود مباشرة عليه)، زي ما الموديل
// نفسه مصمم بالظبط (parentComment).
//
// GET  /api/lessons/[id]/comments → الأسئلة (parentComment=null) الأقدم
//   أولًا مع ردودها متداخلة جوه كل سؤال. نفس فحص الوصول المستخدم في
//   lessons/[id] (GET): صاحب الكورس/أدمن، أو طالب عنده وصول فعلي
//   (enrollment/membership). درس preview مش استثناء هنا عن قصد — نقاش
//   الدرس حاجة لمشتركين فعليين، مش زوار بيتصفحوا preview.
//
// POST /api/lessons/[id]/comments { body, parentComment? } → نفس شرط
//   الوصول فوق. لو parentComment مبعوتة، لازم تكون سؤال أصلي (مش رد على
//   رد — الموديل بيدعم مستوى واحد بس) تابعة لنفس الدرس ده.
//   🔔 إشعار: سؤال جديد (parentComment=null) → للمدرس صاحب الكورس (لو مش
//   هو نفسه اللي بيسأل). رد (parentComment موجودة) → لصاحب السؤال الأصلي
//   (لو مش هو نفسه اللي بيرد).

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getLessonModel, getCommentModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createNotification } from "@/app/lib/notificationHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeComment(c) {
  return {
    id: c._id.toString(),
    body: c.body,
    user: { id: c.user._id ? c.user._id.toString() : c.user.toString(), name: c.user.name ?? null },
    parentComment: c.parentComment ? c.parentComment.toString() : null,
    createdAt: c.createdAt,
  };
}

async function loadLessonAndCheckAccess(lessonId) {
  const Lesson = getLessonModel();
  const Course = getCourseModel();
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) return { lesson: null, course: null, canManage: false, hasAccess: false };
  const course = await Course.findById(lesson.course).lean();
  if (!course) return { lesson: null, course: null, canManage: false, hasAccess: false };

  const auth = await requireSession();
  if (auth.response) return { lesson, course, canManage: false, hasAccess: false, authResponse: auth.response };

  const canManage = isOwnerOrAdmin(auth.session, course.teacher);
  const hasAccess =
    canManage ||
    (await getCourseAccessForUser({ userId: auth.session.user.id, courseId: course._id })).hasAccess;

  return { lesson, course, canManage, hasAccess, session: auth.session };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const { lesson, course, hasAccess, authResponse } = await loadLessonAndCheckAccess(id);
    if (authResponse) return authResponse;
    if (!lesson || !course) return jsonResponse({ error: "not_found" }, 404);
    if (!hasAccess) return jsonResponse({ error: "forbidden", reason: "enrollment_required" }, 403);

    const Comment = getCommentModel();
    getAuthModel(); // تسجيل موديل الـ auth عشان populate("user") يشتغل

    const all = await Comment.find({ lesson: id })
      .sort({ createdAt: 1 })
      .populate("user", "name")
      .lean();

    const questions = all.filter((c) => !c.parentComment);
    const repliesByParent = new Map();
    for (const c of all) {
      if (!c.parentComment) continue;
      const key = c.parentComment.toString();
      if (!repliesByParent.has(key)) repliesByParent.set(key, []);
      repliesByParent.get(key).push(serializeComment(c));
    }

    return jsonResponse({
      comments: questions.map((q) => ({
        ...serializeComment(q),
        replies: repliesByParent.get(q._id.toString()) || [],
      })),
    });
  } catch (err) {
    console.error("[/api/lessons/[id]/comments] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const { lesson, course, hasAccess, session, authResponse } = await loadLessonAndCheckAccess(id);
    if (authResponse) return authResponse;
    if (!lesson || !course) return jsonResponse({ error: "not_found" }, 404);
    if (!hasAccess) return jsonResponse({ error: "forbidden", reason: "enrollment_required" }, 403);

    const body = await request.json().catch(() => null);
    const text = String(body?.body || "").trim();
    if (!text) return jsonResponse({ error: "missing_body" }, 400);

    const Comment = getCommentModel();

    let parentDoc = null;
    if (body?.parentComment) {
      if (!mongoose.Types.ObjectId.isValid(body.parentComment)) {
        return jsonResponse({ error: "invalid_parent" }, 400);
      }
      parentDoc = await Comment.findOne({ _id: body.parentComment, lesson: id });
      // 🔒 مفيش رد على رد (مستوى واحد بس) — الموديل مصمم كده عن قصد
      if (!parentDoc || parentDoc.parentComment) {
        return jsonResponse({ error: "invalid_parent" }, 400);
      }
    }

    const created = await Comment.create({
      lesson: id,
      course: course._id,
      user: session.user.id,
      body: text.slice(0, 2000),
      parentComment: parentDoc ? parentDoc._id : null,
    });

    // 🔔 Phase 6 — اليوم 50-51
    if (parentDoc) {
      if (String(parentDoc.user) !== String(session.user.id)) {
        await createNotification({
          user: parentDoc.user,
          type: "comment_reply",
          title: "رد جديد على سؤالك",
          message: text.slice(0, 200),
          link: `/courses/${course._id}`,
          course: course._id,
        });
      }
    } else if (String(course.teacher) !== String(session.user.id)) {
      await createNotification({
        user: course.teacher,
        type: "comment_question",
        title: `سؤال جديد على درس "${lesson.title}"`,
        message: text.slice(0, 200),
        link: `/courses/${course._id}`,
        course: course._id,
      });
    }

    return jsonResponse(
      { ...serializeComment(created.toObject()), user: { id: session.user.id, name: session.user.name ?? null }, replies: [] },
      201
    );
  } catch (err) {
    console.error("[/api/lessons/[id]/comments] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}