// app/api/certificates/verify/[certId]/route.js
//
// Phase 5 — اليوم 45: "صفحة عامة للتحقق من صحة الشهادة /verify/[certId]".
// الراوت ده عمدًا **من غير أي auth** — الهدف بالظبط إن أي حد (جهة توظيف
// مثلاً) يقدر يتحقق من رقم شهادة شافه على CV من غير ما يحتاج يعمل حساب أو
// يسجّل دخول. middleware.js مش بيحميه (مش تحت /api/admin ولا /api/teacher).
//
// GET /api/certificates/verify/EDU-XXXXXXXX-XXXX
//   → 200 { valid: true, certificate: { studentName, courseTitle,
//       certificateId, issuedAt } }
//   → 200 { valid: false }   (رقم غلط/مش موجود — 200 مش 404 عن قصد، عشان
//       الـ UI يقدر يفرّق بسهولة بين "رقم غلط" و"مشكلة سيرفر حقيقية")
//
// 🔒 مقصودًا مش بنرجّع أي بيانات حساسة (إيميل الطالب، الـ Mongo _id بتاع
// اليوزر/الكورس، إلخ) — بس المعلومات اللي أصلاً مطبوعة وظاهرة على وش
// الشهادة نفسها، عشان صفحة التحقق العامة متسربش حاجة زيادة عن كده.

import { connectToMongo } from "@/app/lib/mongodb";
import { getCertificateModel } from "@/app/lib/models";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const { certId } = await params;
    if (!certId) return jsonResponse({ valid: false });

    await connectToMongo();
    const Certificate = getCertificateModel();
    const certificate = await Certificate.findOne({ certificateId: certId })
      .populate("course", "title")
      .lean();

    if (!certificate) return jsonResponse({ valid: false });

    return jsonResponse({
      valid: true,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentNameSnapshot,
        courseTitle: certificate.course?.title || certificate.courseTitleSnapshot,
        issuedAt: certificate.issuedAt,
      },
    });
  } catch (err) {
    console.error("[/api/certificates/verify/[certId]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}