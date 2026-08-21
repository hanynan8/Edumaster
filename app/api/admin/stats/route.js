// app/api/admin/stats/route.js
//
// Phase 7 — اليوم 53-54: "Admin Dashboard: إحصائيات عامة (عدد طلاب/مدرسين/
// كورسات/إيرادات) بشكل Charts". كل الأرقام المطلوبة هنا كانت متفرقة على
// endpoints تانية (users, courses, revenue) بس مفيش مكان واحد بيلخّصها مع
// بعض بشكل "overview" — الـ route ده هو نقطة التجميع دي، أدمن بس
// (requireRole)، ونفس فلسفة /api/admin/revenue: aggregate على السيرفر
// بدل ما نجيب كل السجلات للـ client ونعدها هناك.
//
// GET /api/admin/stats →
//   counts: { students, teachers, admins, coursesPublished, coursesDraft,
//             coursesArchived, totalEnrollments, certificatesIssued }
//   totalRevenue: إجمالي المدفوعات الناجحة (بنفس منطق /api/admin/revenue،
//     بس رقم واحد ملخّص هنا بدل التفصيل الكامل)
//   signupsTrend: عدد المستخدمين الجداد لكل شهر من آخر 6 شهور (لطالب/مدرس
//     مع بعض) — بيانات الرسم البياني الأساسي في اللوحة.
//   enrollmentsTrend: نفس الفكرة لعدد تسجيلات الكورسات الجديدة.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getEnrollmentModel, getPaymentModel, getCertificateModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// بيحوّل نتيجة aggregate بـ {_id:{y,m}, count} لمصفوفة كاملة الـ 6 شهور
// (شهور من غير بيانات بترجع count=0) — عشان الرسم البياني يفضل متساوي
// العرض حتى لو شهر معين مفيهوش نشاط خالص.
function fillLastSixMonths(rows) {
  const byKey = new Map(rows.map((r) => [`${r._id.y}-${r._id.m}`, r.count]));
  const out = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - 5);
  for (let i = 0; i < 6; i++) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    out.push({ year: y, month: m, count: byKey.get(`${y}-${m}`) || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export async function GET() {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    await connectToMongo();
    const AuthModel = getAuthModel();
    const Course = getCourseModel();
    const Enrollment = getEnrollmentModel();
    const Payment = getPaymentModel();
    const Certificate = getCertificateModel();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      roleCounts,
      courseStatusCounts,
      totalEnrollments,
      certificatesIssued,
      revenueTotal,
      signupsRaw,
      enrollmentsRaw,
    ] = await Promise.all([
      AuthModel.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Course.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Enrollment.countDocuments({}),
      Certificate.countDocuments({}),
      Payment.aggregate([
        { $match: { status: "succeeded" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      AuthModel.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Enrollment.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const roleMap = Object.fromEntries(roleCounts.map((r) => [r._id || "student", r.count]));
    const statusMap = Object.fromEntries(courseStatusCounts.map((c) => [c._id || "draft", c.count]));

    return jsonResponse({
      counts: {
        students: roleMap.student || 0,
        teachers: roleMap.teacher || 0,
        admins: roleMap.admin || 0,
        totalUsers: roleCounts.reduce((sum, r) => sum + r.count, 0),
        coursesPublished: statusMap.published || 0,
        coursesDraft: statusMap.draft || 0,
        // 🆕 كورسات بعتها المدرسين وبتستنى موافقة/رفض الأدمن (شوف
        // app/admin/components/coursesReviewPanel.jsx) — كانت قبل كده مش
        // بتتحسب في أي عمود هنا فكان totalCourses بيبقى أكبر من مجموع
        // Published+Draft+Archived من غير تفسير في الواجهة.
        coursesPending: statusMap.pending || 0,
        coursesArchived: statusMap.archived || 0,
        totalCourses: courseStatusCounts.reduce((sum, c) => sum + c.count, 0),
        totalEnrollments,
        certificatesIssued,
      },
      totalRevenue: revenueTotal[0]?.total || 0,
      signupsTrend: fillLastSixMonths(signupsRaw),
      enrollmentsTrend: fillLastSixMonths(enrollmentsRaw),
    });
  } catch (err) {
    console.error("[/api/admin/stats] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}