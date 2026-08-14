// app/api/sections/[id]/route.js
//
// تعديل/حذف section معيّنة. الصلاحية بتتحقق عن طريق الكورس اللي الـ section
// تبعله (section.course.teacher) — مش فيه "مالك" مباشر على الـ section
// نفسها، فبنجيب الكورس أول حاجة.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getSectionModel, getLessonModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { recomputeCourseTotals } from "@/app/lib/courseHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function loadSectionWithCourse(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { section: null, course: null };
  const Section = getSectionModel();
  const Course = getCourseModel();
  const section = await Section.findById(id);
  if (!section) return { section: null, course: null };
  const course = await Course.findById(section.course);
  return { section, course };
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { section, course } = await loadSectionWithCourse(id);
    if (!section || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) return jsonResponse({ error: "invalid_body" }, 400);

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonResponse({ error: "invalid_title" }, 400);
      section.title = title;
    }
    if (body.description !== undefined) section.description = String(body.description);
    if (body.order !== undefined && Number.isFinite(body.order)) section.order = body.order;

    await section.save();

    return jsonResponse({
      id: section._id.toString(),
      title: section.title,
      description: section.description,
      order: section.order,
    });
  } catch (err) {
    console.error("[/api/sections/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { section, course } = await loadSectionWithCourse(id);
    if (!section || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const Lesson = getLessonModel();
    // حذف الـ section بيحذف كل دروسها معاها (مش بس يفضلوا معلقين بدون section)
    await Lesson.deleteMany({ section: section._id });
    await section.deleteOne();

    // ✅ لازم نحدّث عداد/مدة الكورس بعد ما مسحنا دروس
    await recomputeCourseTotals(course._id);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/sections/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
