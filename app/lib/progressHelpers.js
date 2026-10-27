// app/lib/progressHelpers.js
//
// Phase 4 — اليوم 42: "متابعة الـ Progress: نسبة إكمال الكورس (Lessons +
// Quizzes المكتملة)". بنفس فلسفة recomputeCourseTotals في courseHelpers.js
// — بنعيد حساب النسبة من واقع الداتابيز في كل مرة (lessons مكتملة +
// quizzes منجّحة) بدل ما نزوّد عداد يدوي، عشان مستحيل يطلع غلط.
//
// عنصر "الإكمال" لكورس معيّن = مجموع (عدد الدروس غير-الكويز) + (عدد
// الكويزات المنشورة المرتبطة بالكورس). درس النوع "quiz" نفسه (لو موجود
// كـ lesson.type==="quiz") ما بيتحسبش مرتين — بيتحسب إكماله من نجاح
// الكويز المرتبط بيه، مش من completedLessons.
//
// القاعدة الحسابية نفسها في progressMath.js (دالة خالصة) عشان تتستخدم بنفس
// الشكل في صفحة أداء الطلاب.
//
// الدالتين هنا:
//   - recomputeEnrollmentProgress(userId, courseId): طالب واحد (لما هو يكمل درس/كويز).
//   - recomputeCourseProgress(courseId): كل طلاب الكورس (لما المدرس يغيّر المحتوى:
//     يضيف/يمسح/يعدّل درس، أو ينشر/يلغي نشر/يمسح كويز). من غيرها النسبة المخزّنة
//     كانت بتفضل قديمة لحد ما كل طالب يعمل حاجة بنفسه.

import { getLessonModel, getEnrollmentModel, getQuizModel } from "@/app/lib/models";
import { getQuizResultModel } from "@/app/lib/models/QuizResult";
import { computeProgress } from "@/app/lib/progressMath";
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

  let passedQuizIds = [];
  if (quizzes.length > 0) {
    // لو أي محاولة (سابقة أو حالية) وصلت للنجاح، الكويز يتحسب مكتمل — مش
    // لازم آخر محاولة بالذات. المحاولات المعلّقة (pending_review) passed=false
    // لحد ما تتصحح، فمش بتتحسب.
    const results = await QuizResult.find(
      { student: userId, course: courseId, quiz: { $in: quizzes.map((q) => q._id) }, passed: true },
      "quiz"
    ).lean();
    passedQuizIds = results.map((r) => r.quiz);
  }

  const { progressPercent, isComplete: isNowComplete } = computeProgress({
    nonQuizLessonIds: nonQuizLessons.map((l) => l._id),
    publishedQuizIds: quizzes.map((q) => q._id),
    completedLessonIds: enrollment.completedLessons || [],
    passedQuizIds,
  });

  const wasComplete = enrollment.status === "completed";
  const isCancelled = enrollment.status === "cancelled";

  enrollment.progressPercent = progressPercent;
  // 🔒 التسجيل الملغي (cancelled) ما بنغيّرش حالته من هنا أبدًا — الإلغاء قرار
  // إداري، والنسبة بس هي اللي بتتحدّث.
  if (!isCancelled) {
    if (isNowComplete && !wasComplete) {
      enrollment.status = "completed";
      enrollment.completedAt = new Date();
    } else if (!isNowComplete && wasComplete) {
      // مثلاً المدرس ضاف درس جديد بعد ما الطالب خلّص — نرجّعها active
      // عشان النسبة/الحالة يفضلوا متطابقين.
      enrollment.status = "active";
      enrollment.completedAt = null;
    }
  }

  await enrollment.save();

  // Phase 5 — اليوم 44: بمجرد ما الحالة بقت "completed" دلوقتي (مكانتش
  // كده قبل الاستدعاء ده)، نصدر الشهادة تلقائيًا. best-effort ومقصود إنها
  // متبوظش عملية تسجيل إكمال الدرس/الكويز اللي نادت الدالة دي أصلاً لو
  // فشل توليد الشهادة لأي سبب (شوف تعليق issueCertificateForCompletedEnrollment
  // في certificateHelpers.js).
  if (!isCancelled && isNowComplete && !wasComplete) {
    await issueCertificateForCompletedEnrollment(userId, courseId);
  }

  return enrollment;
}

/**
 * يعيد حساب النسبة/الحالة لكل طلاب الكورس (غير الملغيين) دفعة واحدة — بـ 3
 * queries + bulkWrite بدل N استدعاء لـ recomputeEnrollmentProgress. بتتنادى بعد
 * أي تغيير في محتوى الكورس بيأثر على "إجمالي عناصر الإكمال".
 *
 * Best-effort: أي خطأ بيتسجّل ويتبلع، عشان تعديل المدرس للمحتوى ما يفشلش
 * بسبب إعادة الحساب (والنسبة هتتصحح تلقائي في أول مرة طالب يكمل حاجة).
 *
 * @returns {Promise<{updated:number, newlyCompleted:number}|null>}
 */
export async function recomputeCourseProgress(courseId) {
  try {
    const Lesson = getLessonModel();
    const Enrollment = getEnrollmentModel();
    const Quiz = getQuizModel();
    const QuizResult = getQuizResultModel();

    const [nonQuizLessons, quizzes, enrollments] = await Promise.all([
      Lesson.find({ course: courseId, type: { $ne: "quiz" } }, "_id").lean(),
      Quiz.find({ course: courseId, isPublished: true }, "_id").lean(),
      Enrollment.find(
        { course: courseId, status: { $ne: "cancelled" } },
        "user status progressPercent completedLessons"
      ).lean(),
    ]);
    if (enrollments.length === 0) return { updated: 0, newlyCompleted: 0 };

    const nonQuizLessonIds = nonQuizLessons.map((l) => l._id);
    const publishedQuizIds = quizzes.map((q) => q._id);

    const passedByStudent = new Map(); // studentId → [quizId]
    if (publishedQuizIds.length > 0) {
      const passed = await QuizResult.find(
        {
          course: courseId,
          quiz: { $in: publishedQuizIds },
          student: { $in: enrollments.map((e) => e.user) },
          passed: true,
        },
        "student quiz"
      ).lean();
      for (const r of passed) {
        const key = r.student.toString();
        if (!passedByStudent.has(key)) passedByStudent.set(key, []);
        passedByStudent.get(key).push(r.quiz);
      }
    }

    const ops = [];
    const newlyCompletedUsers = [];
    for (const e of enrollments) {
      const { progressPercent, isComplete } = computeProgress({
        nonQuizLessonIds,
        publishedQuizIds,
        completedLessonIds: e.completedLessons || [],
        passedQuizIds: passedByStudent.get(e.user.toString()) || [],
      });

      const wasComplete = e.status === "completed";
      const $set = {};
      if (progressPercent !== (e.progressPercent || 0)) $set.progressPercent = progressPercent;
      if (isComplete && !wasComplete) {
        $set.status = "completed";
        $set.completedAt = new Date();
        newlyCompletedUsers.push(e.user);
      } else if (!isComplete && wasComplete) {
        $set.status = "active";
        $set.completedAt = null;
      }

      if (Object.keys($set).length > 0) {
        ops.push({ updateOne: { filter: { _id: e._id }, update: { $set } } });
      }
    }

    if (ops.length > 0) await Enrollment.bulkWrite(ops, { ordered: false });

    // نفس سلوك recomputeEnrollmentProgress: اللي بقى مكتمل دلوقتي ياخد شهادته
    // (مثلاً المدرس مسح آخر عنصر ناقص). بتتنفذ ورا بعض عشان ما نضغطش الـ DB.
    for (const userId of newlyCompletedUsers) {
      await issueCertificateForCompletedEnrollment(userId, courseId);
    }

    return { updated: ops.length, newlyCompleted: newlyCompletedUsers.length };
  } catch (err) {
    console.error("[progressHelpers] recomputeCourseProgress failed:", err);
    return null;
  }
}
