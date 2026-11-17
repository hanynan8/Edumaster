// app/api/assignments/[id]/answers/route.js
//
// 🆕 تصحيح فوري لأسئلة الواجب التفاعلية (اختيار من متعدد / صح وغلط) — نفس منطق
// الكويزات: الطالب يبعت اختياراته والسيرفر هو اللي يصحّح ويرجّع الدرجة والإجابات
// الصح على طول.
//
// POST /api/assignments/[id]/answers { answers: [{ question, selectedOptionIndex }] }
//   🔒 التصحيح سيرفر-سايد بالكامل (الطالب مبيبعتش isCorrect ولا نتيجة).
//   🔒 محاولة واحدة لكل طالب لكل واجب (الـ filter + الـ unique index بيمنعوا ضغطتين سريعتين).
//   - allowManualSubmission=false (أسئلة بس): الدرجة النهائية بتتحسب تلقائي
//     (مقياس maxScore) والتسليم بيبقى "graded" فورًا.
//   - allowManualSubmission=true: درجة الأسئلة بتظهر فورًا، لكن الدرجة النهائية
//     لسه بتاعة المدرّس (التسليم اليدوي بيتصحّح زي الأول، ومش بنلمس تصحيحه).
//   نفس قيود التسليم العادي: واجب منشور، وصول فعلي للكورس، ميعاد التسليم.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getAssignmentModel, getSubmissionModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { createNotification } from "@/app/lib/notificationHelpers";
import {
  gradeAssignmentQuestions,
  scaleToMaxScore,
  serializeAssignmentQuestions,
  serializeQuizResult,
} from "@/app/lib/assignmentQuestions";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_assignment" }, 400);

    await connectToMongo();
    const Assignment = getAssignmentModel();
    const assignment = await Assignment.findById(id).lean();
    if (!assignment || !assignment.isPublished) return jsonResponse({ error: "not_found" }, 404);

    const Course = getCourseModel();
    const course = await Course.findById(assignment.course).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const questions = assignment.questions || [];
    if (questions.length === 0) return jsonResponse({ error: "no_questions" }, 400);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 لازم وصول فعلي للكورس (enrollment/membership)
    const access = await getCourseAccessForUser({ userId: session.user.id, courseId: course._id });
    if (!access.hasAccess) return jsonResponse({ error: "forbidden" }, 403);

    const rl = await enforceRateLimit(request, {
      keyPrefix: "assignments:answers",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const now = new Date();
    const isLate = Boolean(assignment.dueDate && now.getTime() > new Date(assignment.dueDate).getTime());
    if (isLate && !assignment.allowLateSubmission) return jsonResponse({ error: "deadline_passed" }, 400);

    const body = await request.json().catch(() => null);
    const graded = gradeAssignmentQuestions(questions, body?.answers);
    const quiz = { ...graded, submittedAt: now };

    const autoFinal = assignment.allowManualSubmission === false;
    const finalScore = autoFinal ? scaleToMaxScore(graded.earnedPoints, graded.totalPoints, assignment.maxScore) : null;

    const Submission = getSubmissionModel();
    const update = autoFinal
      ? {
          $set: {
            quiz,
            submittedAt: now,
            status: "graded",
            score: finalScore,
            feedback: null,
            gradedBy: null,
            gradedAt: now,
          },
        }
      : {
          // مش بنلمس تسليم الطالب اليدوي ولا تصحيح المدرّس لو موجودين
          $set: { quiz },
          $setOnInsert: { submittedAt: now, status: isLate ? "late" : "submitted" },
        };

    let saved;
    try {
      // 🔒 بيطابق بس لو الطالب لسه ما حلّش الأسئلة (quiz: null بيطابق null أو غير موجود).
      // لو حلّها قبل كده → الـ upsert بيحاول insert وبيصطدم بالـ unique index (11000) → 409.
      saved = await Submission.findOneAndUpdate(
        { assignment: assignment._id, student: session.user.id, quiz: null },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      if (err?.code === 11000) return jsonResponse({ error: "already_answered" }, 409);
      throw err;
    }

    if (autoFinal) {
      await createNotification({
        user: session.user.id,
        type: "assignment_graded",
        key: "assignment_graded",
        params: { assignmentTitle: assignment.title, score: finalScore, maxScore: assignment.maxScore },
        link: `/student/grades`,
        course: assignment.course,
      });
    }

    return jsonResponse(
      {
        autoGraded: autoFinal,
        maxScore: assignment.maxScore,
        score: saved.score,
        status: saved.status,
        quiz: serializeQuizResult(saved.quiz),
        // 🔒 كشف الإجابات الصح هنا مقبول لأنه *بعد* التسليم
        questions: serializeAssignmentQuestions(questions, { revealAnswers: true }),
      },
      201
    );
  } catch (err) {
    console.error("[/api/assignments/[id]/answers] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
