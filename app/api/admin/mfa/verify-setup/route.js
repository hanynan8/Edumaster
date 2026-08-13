// app/api/admin/mfa/verify-setup/route.js
//
// خطوة 2 من 2: الأدمن بيبعت كود من تطبيق الـ authenticator بتاعه للتأكيد.
// لو صح، بنفعّل mfaEnabled فعليًا ونولّد 8 أكواد احتياطية (backup codes)
// بتتعرض مرة واحدة بس هنا في الرد — ونخزن الـ hash بتاعهم فقط.

import bcrypt from "bcryptjs";
import crypto from "crypto";
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

function generateBackupCodes(count = 8) {
  // كل كود شكله "xxxx-xxxx" من حروف/أرقام، سهل يتكتب لكن صعب يتخمن (40 بت عشوائية تقريبًا)
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
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
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    if (!user.mfaSecret) {
      return jsonResponse({ error: "setup_not_started" }, 400);
    }
    if (user.mfaEnabled) {
      return jsonResponse({ error: "mfa_already_enabled" }, 400);
    }

    const totp = new TOTP({
      secret: Secret.fromBase32(user.mfaSecret),
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return jsonResponse({ error: "invalid_code" }, 400);
    }

    const backupCodes = generateBackupCodes();
    user.mfaBackupCodeHashes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 10))
    );
    user.mfaEnabled = true;

    // 🔒 SECURITY: تفعيل MFA لازم يفرض إعادة تحقق أي جلسة مفتوحة كمان،
    // من نفس مبدأ tokenVersion.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await logAudit({
      request,
      actor: session.user,
      action: "admin.mfa_enabled",
      targetId: user._id.toString(),
      targetEmail: user.email || null,
    });

    return jsonResponse(
      {
        message: "MFA enabled successfully",
        backupCodes, // ⚠️ آخر مرة هترجع فيها دي — نبّه المستخدم يحفظها في مكان آمن
      },
      200
    );
  } catch (err) {
    console.error("[/api/admin/mfa/verify-setup] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}