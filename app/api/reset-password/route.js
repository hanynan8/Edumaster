// app/api/reset-password/route.js
//
// الخطوة الأخيرة: المستخدم يبعت الإيميل + الكود اللي وصله (واتأكد منه
// قبل كده في /api/verify-reset-code) + باسورد جديد. بنتأكد من الكود تاني
// هنا كمان (defense in depth) قبل ما نحدّث الباسورد فعليًا.

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import {
  isCodeExpired,
  ensureAttemptWindow,
  hasExceededAttempts,
  remainingAttempts,
  clearResetState,
} from "@/app/lib/resetPasswordHelpers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

// 🔒 SECURITY (Phase 8 — اليوم 59): نفس السبب الموجود في
// /api/verify-reset-code — حد أقصى إضافي بالـ IP فوق حد الـ 5 محاولات
// لكل حساب، دفاع في العمق (defense in depth) لأن ده الراوت اللي فعليًا
// بيغيّر الباسورد.
const IP_RATE_LIMIT = { limit: 20, windowSeconds: 60 };

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const ipCheck = await checkRateLimit(`reset-password:ip:${ip}`, IP_RATE_LIMIT);
    if (!ipCheck.allowed) {
      return jsonResponse(
        { error: "too_many_requests", retryAfterSeconds: ipCheck.retryAfterSeconds },
        429
      );
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!email || !code || !newPassword) {
      return jsonResponse({ error: "missing_fields" }, 400);
    }
    if (newPassword.length < 8) {
      return jsonResponse({ error: "weak_password" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findOne({ email });

    const invalidResponse = () => jsonResponse({ error: "invalid_or_expired_code" }, 400);

    if (!user || !user.resetCodeHash || !user.resetCodeExpiry) {
      return invalidResponse();
    }

    if (isCodeExpired(user)) {
      user.resetCodeHash = null;
      user.resetCodeExpiry = null;
      await user.save();
      return invalidResponse();
    }

    // 🔒 SECURITY: نفس نافذة الـ 12 ساعة / 5 محاولات المستخدمة في
    // verify-reset-code — بيمنع أي حد يتخطى الخطوة دي ويضرب الكود مباشرة هنا.
    ensureAttemptWindow(user);
    if (hasExceededAttempts(user)) {
      await user.save();
      return jsonResponse({ error: "too_many_attempts", remainingAttempts: 0 }, 429);
    }

    const matches = await bcrypt.compare(code, user.resetCodeHash);

    if (!matches) {
      user.resetAttempts = (user.resetAttempts || 0) + 1;
      await user.save();
      return jsonResponse(
        { error: "invalid_or_expired_code", remainingAttempts: remainingAttempts(user) },
        400
      );
    }

    // ✅ الكود صح — نحدّث الباسورد ونمسح كل حاجة خاصة بالـ reset (بما فيها
    // عداد المحاولات ونافذته، عشان يبدأ نضيف في المرة الجاية).
    user.password = await bcrypt.hash(newPassword, 12);
    clearResetState(user);
    user.updatedAt = new Date();
    await user.save();

    return jsonResponse({ message: "Password updated successfully" }, 200);
  } catch (err) {
    console.error("[/api/reset-password] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}