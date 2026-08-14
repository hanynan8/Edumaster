// app/api/quizzes/route.js
//
// Phase 4 — اليوم 33-34: "Teacher: إنشاء Quiz مرتبط بـ Lesson أو Section".
//
// GET  /api/quizzes?course=<id>   → قائمة كويزات كورس معيّن. لو الطالب
//        (أو أي حد غير صاحب الكورس/أدمن) بيطلب، بيرجع الكويزات المنشورة
//        بس (isPublished=true) — المدرس صاحب الكورس أو الأدمن بيشوفوا
//        الكل (منشور + مسودة) عشان يقدروا يديروها.
// POST /api/quizzes { course, title, description?, lesson?, section?,
//        timeLimitMinutes?, passingScorePercent?, maxAttempts? } → إنشاء
//        كويز جديد. لازم تكون صاحب الكورس أو أدمن.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuestionModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeQuiz(q, { questionsCount = null } = {}) {
  const out = {
    id: q._id.toString(),
    course: q.course?.toString?.() ?? q.course,
    lesson: q.lesson ? q.lesson.toString() : null,
    section: q.section ? q.section.toString() : null,
    title: q.title,
    description: q.description,
    timeLimitMinutes: q.timeLimitMinutes,
    passingScorePercent: q.passingScorePercent,
    maxAttempts: q.maxAttempts,
    isPublished: q.isPublished,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
  if (questionsCount !== null) out.questionsCount = questionsCount;
  return out;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course");
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return jsonResponse({ error: "invalid_course" }, 400);
    }

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(courseId).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    const canManage = !auth.response && isOwnerOrAdmin(auth.session, course.teacher);

    const Quiz = getQuizModel();
    const query = { course: courseId };
    if (!canManage) query.isPublished = true;

    const quizzes = await Quiz.find(query).sort({ createdAt: -1 }).lean();

    const Question = getQuestionModel();
    const counts = await Question.aggregate([
      { $match: { quiz: { $in: quizzes.map((q) => q._id) } } },
      { $group: { _id: "$quiz", count: { $sum: 1 } } },
    ]);
    const countByQuiz = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    return jsonResponse({
      quizzes: quizzes.map((q) => serializeQuiz(q, { questionsCount: countByQuiz[q._id.toString()] || 0 })),
    });
  } catch (err) {
    console.error("[/api/quizzes] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json().catch(() => null);
    const courseId = body?.course;
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return jsonResponse({ error: "invalid_course" }, 400);
    }

    const title = String(body?.title || "").trim();
    if (!title) return jsonResponse({ error: "missing_title" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(courseId);
    if (!course) return jsonResponse({ error: "not_found" }, 404);
    if (!isOwnerOrAdmin(session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    if (body?.lesson && !mongoose.Types.ObjectId.isValid(body.lesson)) {
      return jsonResponse({ error: "invalid_lesson" }, 400);
    }
    if (body?.section && !mongoose.Types.ObjectId.isValid(body.section)) {
      return jsonResponse({ error: "invalid_section" }, 400);
    }

    const Quiz = getQuizModel();
    const created = await Quiz.create({
      course: courseId,
      lesson: body.lesson || null,
      section: body.section || null,
      title,
      description: String(body?.description || ""),
      timeLimitMinutes: Number.isFinite(Number(body?.timeLimitMinutes)) && body?.timeLimitMinutes !== null && body?.timeLimitMinutes !== ""
        ? Math.max(1, Number(body.timeLimitMinutes))
        : null,
      passingScorePercent: Number.isFinite(Number(body?.passingScorePercent))
        ? Math.min(100, Math.max(0, Number(body.passingScorePercent)))
        : 60,
      maxAttempts: Number.isFinite(Number(body?.maxAttempts)) ? Math.max(1, Number(body.maxAttempts)) : 1,
      isPublished: Boolean(body?.isPublished),
    });

    return jsonResponse(serializeQuiz(created, { questionsCount: 0 }), 201);
  } catch (err) {
    console.error("[/api/quizzes] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}