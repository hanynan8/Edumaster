// app/api/admin/mfa/disable/route.js
//
// تعطيل MFA لازم يتطلب كود صحيح حالي (TOTP أو backup code) — مش بس تسجيل
// دخول عادي — عشان لو حد سرق الجلسة (session) بس مش عنده الموبايل بتاع
// الأدمن، يفضل مش قادر يعطّل الحماية دي.

import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { logAudit } from "@/app/lib/auditLog";

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

    const body = await request.json().catch(() => null);
    const code = String(body?.code || "").trim();
    if (!code) return jsonResponse({ error: "missing_code" }, 400);

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(session.user.id);
    if (!user || !user.mfaEnabled) {
      return jsonResponse({ error: "mfa_not_enabled" }, 400);
    }

    let valid = false;
    if (user.mfaSecret) {
      const totp = new TOTP({
        secret: Secret.fromBase32(user.mfaSecret),
        digits: 6,
        period: 30,
        algorithm: "SHA1",
      });
      valid = totp.validate({ token: code, window: 1 }) !== null;
    }

    if (!valid && Array.isArray(user.mfaBackupCodeHashes)) {
      for (const hash of user.mfaBackupCodeHashes) {
        if (await bcrypt.compare(code, hash)) {
          valid = true;
          break;
        }
      }
    }

    if (!valid) return jsonResponse({ error: "invalid_code" }, 400);

    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaBackupCodeHashes = [];
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await logAudit({
      request,
      actor: session.user,
      action: "admin.mfa_disabled",
      targetId: user._id.toString(),
      targetEmail: user.email || null,
    });

    return jsonResponse({ message: "MFA disabled" }, 200);
  } catch (err) {
    console.error("[/api/admin/mfa/disable] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}