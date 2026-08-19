// app/api/certificates/route.js
//
// Phase 5 — اليوم 45: "صفحة تحميل الشهادة". الصفحة (app/student/certificates)
// بتندي على GET هنا عشان تجيب كل شهادات المستخدم الحالي.
//
// GET /api/certificates → { certificates: [...] }
//
// 🩹 Self-heal: قبل ما نرجّع القايمة، بنشيك هل فيه enrollments بحالة
// "completed" لليوزر الحالي مالهاش شهادة مُصدرة بالفعل — لو لقينا، بننادي
// issueCertificateForCompletedEnrollment() لكل واحدة فيهم قبل الرد. ده
// شبكة أمان لأي حالة نادرة كان فيها إصدار الشهادة التلقائي (progressHelpers.js)
// فشل وقت اكتمال الكورس فعليًا (مثلاً مشكلة عابرة في الداتابيز) — الطالب
// أول ما يفتح صفحة "شهاداتي" بعد كده، الشهادة بتتصدر من نفسها من غير ما
// يحتاج يعمل أي حاجة أو يتواصل مع الدعم.
// best-effort: issueCertificateForCompletedEnrollment نفسها بتمسك أي خطأ
// وترجّع null (شوف certificateHelpers.js)، فمفيش داعي try/catch إضافي هنا.

import { connectToMongo } from "@/app/lib/mongodb";
import { getCertificateModel, getEnrollmentModel, getCourseModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { issueCertificateForCompletedEnrollment } from "@/app/lib/certificateHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeCertificate(c) {
  return {
    id: c._id.toString(),
    certificateId: c.certificateId,
    course: c.course?._id ? c.course._id.toString() : c.course?.toString?.() ?? c.course,
    courseTitle: c.course?.title || c.courseTitleSnapshot,
    courseSlug: c.course?.slug,
    courseThumbnail: resolveSecureStoredUrl(c.course?.thumbnail),
    studentName: c.studentNameSnapshot,
    issuedAt: c.issuedAt,
  };
}

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY (Day 59): كل نداء بيعمل self-heal writes (إصدار شهادات)
    // فمش مجرد قراءة بسيطة — نحدّ من التكرار السريع.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "certificates:list",
      limit: 30,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    await connectToMongo();
    const Enrollment = getEnrollmentModel();
    const Certificate = getCertificateModel();
    // 🩹 Registers "Model_course" with mongoose before the .populate("course")
    // call below — without this, populate throws MissingSchemaError whenever
    // the self-heal branch further down is skipped (i.e. the common case
    // where the user already has all their certificates and nothing new
    // needs to be issued), since that was the only other place in this
    // route that touched the Course model.
    getCourseModel();

    // 🩹 self-heal: كورسات مكتملة من غير شهادة مُصدرة — نصدرها دلوقتي
    const completedEnrollments = await Enrollment.find(
      { user: session.user.id, status: "completed" },
      "course"
    ).lean();

    if (completedEnrollments.length > 0) {
      const existingCertCourseIds = new Set(
        (
          await Certificate.find(
            { user: session.user.id, course: { $in: completedEnrollments.map((e) => e.course) } },
            "course"
          ).lean()
        ).map((c) => c.course.toString())
      );

      const missing = completedEnrollments.filter((e) => !existingCertCourseIds.has(e.course.toString()));
      if (missing.length > 0) {
        await Promise.all(
          missing.map((e) => issueCertificateForCompletedEnrollment(session.user.id, e.course))
        );
      }
    }

    const certificates = await Certificate.find({ user: session.user.id })
      .populate("course", "title slug thumbnail")
      .sort({ issuedAt: -1 })
      .lean();

    return jsonResponse({ certificates: certificates.map(serializeCertificate) });
  } catch (err) {
    console.error("[/api/certificates] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}