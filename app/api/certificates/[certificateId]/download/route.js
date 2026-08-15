// app/api/certificates/[certificateId]/download/route.js
//
// 🩹 Day 59 audit fix: الملف ده كان موجود بس *فاضي تمامًا* (0 bytes) — يعني
// زرار "تحميل الشهادة" في الواجهة كان هيرجّع 404/خطأ دايمًا، وآخر خطوة في
// رحلة الطالب الكاملة (تسجيل → اشتراك → دفع → دراسة → كويز → شهادة) كانت
// عمليًا مكسورة. اتضاف هنا كجزء من مراجعة اليوم 59 + اختبار E2E اليوم 61.
//
// GET /api/certificates/[certificateId]/download
//   بيقبل إما الـ Mongo _id بتاع الشهادة أو certificateId العام (EDU-XXXX-XXXX)
//   عشان يشتغل مع أي رابط شكله الفرونت يستخدمه.
//   🔒 لازم المستخدم الحالي يكون صاحب الشهادة (أو admin) — الشهادة بيانات
//   شخصية (اسم الطالب كامل)، مش عامة زي صفحة /verify اللي بتاخد بيانات
//   مختصرة بس. بيرجّع الـ PDF كـ application/pdf مع Content-Disposition
//   attachment.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCertificateModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { generateCertificatePdf, buildVerifyUrl } from "@/app/lib/certificateHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY (Day 59): توليد PDF عملية مكلفة نسبيًا (رسم + فونتات
    // عربي/لاتيني) — بنحدّها عشان ميتستخدمش الـ endpoint كوسيلة استنزاف CPU.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "certificates:download",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const { certificateId } = await params;
    if (!certificateId) return jsonResponse({ error: "not_found" }, 404);

    await connectToMongo();
    const Certificate = getCertificateModel();

    const query = mongoose.Types.ObjectId.isValid(certificateId)
      ? { _id: certificateId }
      : { certificateId };
    const certificate = await Certificate.findOne(query).lean();

    if (!certificate) return jsonResponse({ error: "not_found" }, 404);

    // 🔒 صاحب الشهادة أو admin بس — مش أي مستخدم مسجل دخول.
    if (!isOwnerOrAdmin(session, certificate.user)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const pdfBytes = await generateCertificatePdf({
      studentName: certificate.studentNameSnapshot,
      courseTitle: certificate.courseTitleSnapshot,
      certificateId: certificate.certificateId,
      issuedAt: certificate.issuedAt,
      verifyUrl: buildVerifyUrl(request, certificate.certificateId),
    });

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="edumaster-certificate-${certificate.certificateId}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[/api/certificates/[certificateId]/download] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}