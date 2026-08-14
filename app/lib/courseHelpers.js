// app/lib/courseHelpers.js
//
// هيلبرات مشتركة بين routes الكورسات/الأقسام/الدروس. الأهم هنا هو
// recomputeCourseTotals: بعد أي إضافة/تعديل/حذف لدرس، بنعيد حساب
// totalLessonsCount و totalDurationSeconds بتاعة الكورس من واقع الداتابيز
// فعليًا (aggregate) بدل ما نزوّد/ننقص العداد يدويًا في كل route — ده أبطأ
// شوية لكن مستحيل يطلع غلط (لو حصل خطأ في route ونسي يحدّث العداد، أو لو
// اتحذفت مستندات مباشرة من الداتابيز، العداد بيرجع يتظبط تلقائي في أول
// تعديل جديد).

import { getLessonModel } from "@/app/lib/models/Lesson";
import { getCourseModel } from "@/app/lib/models/Course";

export async function recomputeCourseTotals(courseId) {
  const Lesson = getLessonModel();
  const Course = getCourseModel();

  const [agg] = await Lesson.aggregate([
    { $match: { course: courseId } },
    {
      $group: {
        _id: null,
        totalLessonsCount: { $sum: 1 },
        totalDurationSeconds: { $sum: { $ifNull: ["$durationSeconds", 0] } },
      },
    },
  ]);

  await Course.findByIdAndUpdate(courseId, {
    totalLessonsCount: agg?.totalLessonsCount || 0,
    totalDurationSeconds: agg?.totalDurationSeconds || 0,
  });
}

// توليد slug فريد من العنوان: بيحول العربي/الإنجليزي لصيغة صالحة للرابط،
// ولو فيه تصادم مع slug موجود بيضيف رقم في الآخر (course-2, course-3...)
// بدل ما يرفض الطلب — تجربة أفضل للمدرس، مش لازم يفكر في slug يدوي.
export function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function generateUniqueCourseSlug(baseTitle) {
  const Course = getCourseModel();
  const base = slugify(baseTitle) || "course";
  let slug = base;
  let counter = 2;

  while (await Course.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}