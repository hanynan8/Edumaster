// app/lib/progressMath.js
//
// منطق حساب خالص (من غير DB ولا imports) لنسبة إكمال الكورس واختيار "أفضل
// نتيجة" كويز. اتفصل عن progressHelpers.js عشان:
//   1) نفس القاعدة بالظبط تتستخدم في كل مكان (تحديث الـ enrollment، وصفحة
//      أداء الطلاب للمدرس) فمستحيل الرقم يختلف من شاشة لشاشة.
//   2) يتختبر بسهولة من غير mocks.

/**
 * نسبة إكمال الكورس.
 *
 * عنصر الإكمال = (دروس غير-الكويز) + (الكويزات المنشورة). درس النوع "quiz"
 * نفسه ما بيتحسبش مرتين — إكماله بيتحدد من نجاح الكويز المرتبط بيه.
 *
 * 🔒 "مكتمل" بيتحدد بالعدّ الفعلي (completedItems >= totalItems) مش من النسبة
 * المقرّبة. قبل كده Math.round كان بيطلّع 199/200 = 100% فيتعلّم الكورس مكتمل
 * وتتصدر الشهادة وفاضل عنصر. ولو الكورس مش مكتمل فعليًا النسبة بتتسقّف عند 99%.
 *
 * @param {object} p
 * @param {Array<string|object>} p.nonQuizLessonIds  دروس الكورس اللي type != quiz
 * @param {Array<string|object>} p.publishedQuizIds  كويزات الكورس المنشورة
 * @param {Array<string|object>} p.completedLessonIds enrollment.completedLessons
 * @param {Array<string|object>} p.passedQuizIds     كويزات الطالب اللي نجح في أي محاولة منها
 */
export function computeProgress({
  nonQuizLessonIds = [],
  publishedQuizIds = [],
  completedLessonIds = [],
  passedQuizIds = [],
}) {
  const completedSet = new Set(completedLessonIds.map(String));
  const passedSet = new Set(passedQuizIds.map(String));

  const completedLessonItems = nonQuizLessonIds.filter((id) => completedSet.has(String(id))).length;
  const passedQuizItems = publishedQuizIds.filter((id) => passedSet.has(String(id))).length;

  const totalItems = nonQuizLessonIds.length + publishedQuizIds.length;
  const completedItems = completedLessonItems + passedQuizItems;
  const isComplete = totalItems > 0 && completedItems >= totalItems;

  let progressPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
  if (isComplete) progressPercent = 100;
  else if (progressPercent >= 100) progressPercent = 99;

  return { totalItems, completedItems, completedLessonItems, passedQuizItems, progressPercent, isComplete };
}

/** محاولة كويز لسه مستنية تصحيح يدوي (أسئلة مقالية). المحاولات القديمة من غير status = graded. */
export function isPendingReview(result) {
  return result?.status === "pending_review";
}

/**
 * أفضل نتيجة لطالب في كويز واحد، من كل محاولاته.
 *
 * - المحاولات المعلّقة (pending_review) بتتتجاهل: درجتها مؤقتة (الاختياري بس)
 *   و passed=false لحد ما المقالي يتصحح، فمينفعش تتعرض "راسب" ولا تغلب
 *   محاولة سابقة اتصححت.
 * - المحاولة الناجحة بتتفضّل على غير الناجحة (عشان العرض يطابق حساب التقدّم
 *   اللي بيعتبر الكويز منجوح لو أي محاولة نجحت)، وبعدها الأعلى درجة.
 *
 * @param {Array<{scorePercent:number, passed:boolean, status?:string, attemptNumber?:number}>} results
 * @returns {{ best: object|null, hasPendingReview: boolean, attemptsCount: number }}
 */
export function pickBestQuizResult(results = []) {
  let best = null;
  let hasPendingReview = false;

  for (const r of results) {
    if (isPendingReview(r)) {
      hasPendingReview = true;
      continue;
    }
    if (!best) {
      best = r;
      continue;
    }
    const rPassed = Boolean(r.passed);
    const bestPassed = Boolean(best.passed);
    if (rPassed !== bestPassed ? rPassed : r.scorePercent > best.scorePercent) best = r;
  }

  return { best, hasPendingReview, attemptsCount: results.length };
}
