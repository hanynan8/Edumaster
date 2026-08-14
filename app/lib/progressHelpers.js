// app/lib/progressHelpers.js
//
// Phase 4 — اليوم 42: "متابعة الـ Progress: نسبة إكمال الكورس (Lessons +
// Quizzes المكتملة)". بنفس فلسفة recomputeCourseTotals في courseHelpers.js
// — بنعيد حساب النسبة من واقع الداتابيز في كل مرة (lessons مكتملة +
// quizzes منجحّة) بدل ما نزوّد عداد يدوي، عشان مستحيل يطلع غلط.
//
// عنصر "الإكمال" لكورس معيّن = مجموع (عدد الدروس غير-الكويز) + (عدد
// الكويزات المنشورة المرتبطة بالكورس). درس النوع "quiz" نفسه (لو موجود
// كـ lesson.type==="quiz") ما بيتحسبش مرتين — بيتحسب إكماله من نجاح
// الكويز المرتبط بيه، مش من completedLessons.

import { getLessonModel, getEnrollmentModel, getQuizModel } from "@/app/lib/models";
import { getQuizResultModel } from "@/app/lib/models/QuizResult";
// Phase 5 — اليوم 44: "إصدار تلقائي للشهادة عند اكتمال الكورس 100%" — بمجرد
// ما enrollment.status يتحول لـ "completed" هنا تحت، بننادي الدالة دي عشان
// تصدر الشهادة أوتوماتيك من غير ما الطالب يعمل أي حاجة إضافية. الدالة
// نفسها best-effort (بتمسك أي خطأ وترجّع null) عشان فشل توليد الشهادة
// (مثلاً مشكلة عابرة) ما يبوّظش عملية تسجيل إكمال الدرس/الكويز الأساسية.
import { issueCertificateForCompletedEnrollment } from "@/app/lib/certificateHelpers";

export async function recomputeEnrollmentProgress(userId, courseId) {
  const Lesson = getLessonModel();
  const Enrollment = getEnrollmentModel();
  const Quiz = getQuizModel();
  const QuizResult = getQuizResultModel();

  const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
  if (!enrollment) return null;

  const [nonQuizLessons, quizzes] = await Promise.all([
    Lesson.find({ course: courseId, type: { $ne: "quiz" } }, "_id").lean(),
    Quiz.find({ course: courseId, isPublished: true }, "_id passingScorePercent").lean(),
  ]);

  const completedLessonIds = new Set((enrollment.completedLessons || []).map((l) => l.toString()));
  const completedNonQuizCount = nonQuizLessons.filter((l) => completedLessonIds.has(l._id.toString())).length;

  let passedQuizCount = 0;
  if (quizzes.length > 0) {
    // آخر محاولة لكل كويز بس هي اللي بتحدد "نجح فيه ولا لأ" — لو أي محاولة
    // سابقة أو حالية وصلت للنجاح، يتحسب مكتمل (مش لازم آخر محاولة بالذات).
    const results = await QuizResult.find(
      { student: userId, course: courseId, quiz: { $in: quizzes.map((q) => q._id) }, passed: true },
      "quiz"
    ).lean();
    const passedQuizIds = new Set(results.map((r) => r.quiz.toString()));
    passedQuizCount = passedQuizIds.size;
  }

  const totalItems = nonQuizLessons.length + quizzes.length;
  const completedItems = completedNonQuizCount + passedQuizCount;
  const progressPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  const isNowComplete = totalItems > 0 && progressPercent >= 100;
  const wasComplete = enrollment.status === "completed";

  enrollment.progressPercent = progressPercent;
  if (isNowComplete && !wasComplete) {
    enrollment.status = "completed";
    enrollment.completedAt = new Date();
  } else if (!isNowComplete && wasComplete) {
    // نادر (مثلاً المدرس ضاف درس جديد بعد ما الطالب خلّص) — نرجّعها active
    // عشان النسبة/الحالة يفضلوا متطابقين.
    enrollment.status = "active";
    enrollment.completedAt = null;
  }

  await enrollment.save();
  return enrollment;
}