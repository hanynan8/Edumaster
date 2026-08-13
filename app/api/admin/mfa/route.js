// app/api/admin/mfa/route.js
//
// ملف واحد بيجمّع الثلاث خطوات بتاعة MFA اللي كانت في 3 ملفات منفصلة
// (setup, verify-setup, disable). كلهم POST على نفس الـ URL دلوقتي، والفرق
// بينهم عن طريق حقل "action" في الـ body:
//   { "action": "setup" }
//   { "action": "verify-setup", "code": "123456" }
//   { "action": "disable", "code": "123456" }
//
// المنطق الأمني جوه كل حالة زي ما كان بالظبط في الملفات الأصلية —
// اتنقل هنا كما هو من غير أي تغيير في السلوك أو مستوى الحماية.

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
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

function buildTotp({ secretBase32, email, name }) {
  return new TOTP({
    issuer: "Edumaster",
    label: email || name || "admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secretBase32 ? Secret.fromBase32(secretBase32) : undefined,
  });
}

// ---------------------------------------------------------------------------
// خطوة 1 من 2: توليد secret جديد + QR code. لسه من غير تفعيل mfaEnabled —
// التفعيل الفعلي بيحصل في handleVerifySetup بعد ما الأدمن يثبت إنه قدر
// يولّد كود صح من تطبيق الـ authenticator بتاعه.
// ---------------------------------------------------------------------------
async function handleSetup({ user }) {
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
}

// ---------------------------------------------------------------------------
// خطوة 2 من 2: تأكيد الكود من الـ authenticator. لو صح، بنفعّل mfaEnabled
// فعليًا ونولّد 8 أكواد احتياطية (backup codes) بتتعرض مرة واحدة بس هنا في
// الرد — ونخزن الـ hash بتاعهم فقط.
// ---------------------------------------------------------------------------
async function handleVerifySetup({ request, session, user, code }) {
  if (!code) return jsonResponse({ error: "missing_code" }, 400);

  if (!user.mfaSecret) {
    return jsonResponse({ error: "setup_not_started" }, 400);
  }
  if (user.mfaEnabled) {
    return jsonResponse({ error: "mfa_already_enabled" }, 400);
  }

  const totp = buildTotp({ secretBase32: user.mfaSecret });
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return jsonResponse({ error: "invalid_code" }, 400);
  }

  const backupCodes = generateBackupCodes();
  user.mfaBackupCodeHashes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));
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
}

// ---------------------------------------------------------------------------
// تعطيل MFA لازم يتطلب كود صحيح حالي (TOTP أو backup code) — مش بس تسجيل
// دخول عادي — عشان لو حد سرق الجلسة (session) بس مش عنده الموبايل بتاع
// الأدمن، يفضل مش قادر يعطّل الحماية دي.
// ---------------------------------------------------------------------------
async function handleDisable({ request, session, user, code }) {
  if (!code) return jsonResponse({ error: "missing_code" }, 400);

  if (!user.mfaEnabled) {
    return jsonResponse({ error: "mfa_not_enabled" }, 400);
  }

  let valid = false;
  if (user.mfaSecret) {
    const totp = buildTotp({ secretBase32: user.mfaSecret });
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
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;
    const code = body?.code ? String(body.code).trim() : "";

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(session.user.id);
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    switch (action) {
      case "setup":
        return await handleSetup({ user });
      case "verify-setup":
        return await handleVerifySetup({ request, session, user, code });
      case "disable":
        return await handleDisable({ request, session, user, code });
      default:
        return jsonResponse({ error: "invalid_action" }, 400);
    }
  } catch (err) {
    console.error("[/api/admin/mfa] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}