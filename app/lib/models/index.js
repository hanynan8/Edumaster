// app/lib/models/index.js
//
// نقطة استيراد واحدة لكل موديلات الـ LMS، عشان أي API route يقدر يكتب:
//   import { getCourseModel, getSectionModel } from "@/app/lib/models";
// بدل ما يستورد من كل ملف لوحده.

export { getCategoryModel } from "./Category";
export { getCourseModel } from "./Course";
export { getSectionModel } from "./Section";
export { getLessonModel } from "./Lesson";

// أُضيفت في Day 2
export { getMembershipPlanModel } from "./MembershipPlan";
export { getEnrollmentModel } from "./Enrollment";
export { getPaymentModel } from "./Payment";
export { getQuizModel, getQuestionModel } from "./Quiz";
export { getQuizResultModel } from "./QuizResult";
export { getAssignmentModel, getSubmissionModel } from "./Assignment";
export { getCertificateModel } from "./Certificate";

// أُضيفت في Phase 6
export { getNotificationModel } from "./Notification";
export { getAnnouncementModel } from "./Announcement";
export { getCommentModel } from "./Comment";
export { getMessageModel } from "./Message";

// 🆕 محاضرات لايف (تلقائي عبر Daily.co، مع fallback يدوي لو Daily مش
// متظبط على السيرفر أو فشل إنشاء الغرفة) — شوف app/lib/models/Meeting.js
// و app/lib/daily.js
export { getMeetingModel } from "./Meeting";