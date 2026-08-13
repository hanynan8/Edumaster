// app/api/admin/mfa/setup/route.js
//
// خطوة 1 من 2 لتفعيل MFA: الأدمن (مسجّل دخوله بالفعل بباسورده العادي) بيطلب
// secret جديد. بنولّده ونخزنه في userDoc.mfaSecret لكن من غير ما نفعّل
// mfaEnabled لسه — التفعيل الفعلي بيحصل في verify-setup بعد ما يثبت إنه
// قدر يولّد كود صح من تطبيق الـ authenticator بتاعه.

import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(session.user.id);
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    if (user.mfaEnabled) {
      return jsonResponse({ error: "mfa_already_enabled" }, 400);
    }

    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: "Edumaster",
      label: user.email || user.name || "admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    // 🔒 SECURITY: بنخزن الـ secret مؤقتًا (مش مفعّل لسه) عشان verify-setup
    // يتأكد منه. لو الأدمن ما كملش الخطوة، الـ secret ده مالوش أي تأثير
    // لأن mfaEnabled لسه false ومحدش بيتحقق منه وقت اللوجين.
    user.mfaSecret = secret.base32;
    await user.save();

    const otpauthUrl = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    return jsonResponse(
      {
        secret: secret.base32,
        otpauthUrl,
        qrDataUrl, // <img src="..."> — يترسم في المتصفح مباشرة، مفيش أي طرف تالت بيشوف الـ secret
      },
      200
    );
  } catch (err) {
    console.error("[/api/admin/mfa/setup] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}