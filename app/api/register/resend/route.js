// app/api/register/resend/route.js
//
// إعادة إرسال كود التأكيد لتسجيل معلّق موجود. بيبعت كود جديد (القديم بيبطل)
// ويصفّر عدّاد المحاولات، بحدّين: فاصل 60 ثانية بين كل إرسالين، وحصة يومية
// 5 أكواد/يوم لكل إيميل ولكل IP (الإرسال الأول من /api/register بيتحسب فيها).

import bcrypt from "bcryptjs";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPendingRegistrationModel } from "@/app/lib/models";
import { getClientIp } from "@/app/lib/rateLimit";
import {
  VERIFY_CODE_TTL_MS,
  consumeSendQuota,
  cooldownRemainingSeconds,
  generateVerificationCode,
  isValidEmail,
  sendVerificationCodeEmail,
} from "@/app/lib/registrationHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) return jsonResponse({ error: "invalid_email" }, 400);

    await connectToMongo();
    const Pending = getPendingRegistrationModel();
    const pending = await Pending.findOne({ email });
    if (!pending) return jsonResponse({ error: "no_pending_registration" }, 404);

    const wait = cooldownRemainingSeconds(pending.lastSentAt);
    if (wait > 0) {
      return jsonResponse({ error: "resend_too_soon", retryAfterSeconds: wait }, 429);
    }

    // 🔒 الحصة اليومية (5 لكل إيميل + 5 لكل IP).
    const quota = await consumeSendQuota(ip, email);
    if (!quota.allowed) {
      return jsonResponse(
        {
          error: "too_many_codes",
          scope: quota.scope,
          retryAfterSeconds: quota.retryAfterSeconds,
          dailyLimit: quota.limit,
          remainingSends: 0,
        },
        429
      );
    }

    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const now = new Date();

    await Pending.updateOne(
      { _id: pending._id },
      {
        $set: {
          codeHash,
          codeExpiry: new Date(now.getTime() + VERIFY_CODE_TTL_MS),
          attempts: 0,
          lastSentAt: now,
        },
        $inc: { sendCount: 1 },
      }
    );

    const sent = await sendVerificationCodeEmail({ to: email, name: pending.name, code });
    if (!sent) return jsonResponse({ error: "email_send_failed" }, 502);

    return jsonResponse({ ok: true, remainingSends: quota.remaining, dailyLimit: quota.limit }, 200);
  } catch (err) {
    console.error("[/api/register/resend] error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
