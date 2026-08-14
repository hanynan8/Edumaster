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
export { getAssignmentModel, getSubmissionModel } from "./Assignment";
export { getCertificateModel } from "./Certificate";