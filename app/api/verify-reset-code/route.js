// app/api/verify-reset-code/route.js
//
// خطوة وسطى بين "طلب الكود" و"تحديث الباسورد": المستخدم يبعت الإيميل +
// الكود بس (من غير باسورد جديد)، ولو صح بنسمح للواجهة إنها تعرض له فورم
// الباسورد الجديد. الباسورد الفعلي بيتغيّر بس في /api/reset-password،
// اللي بيتأكد من الكود تاني كمان — عشان محدش يقدر يتخطى الخطوة دي.

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import {
  isCodeExpired,
  ensureAttemptWindow,
  hasExceededAttempts,
  remainingAttempts,
} from "@/app/lib/resetPasswordHelpers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

// 🔒 SECURITY (Phase 8 — اليوم 59): كان فيه حد أقصى 5 محاولات *لكل حساب*
// بس (resetAttempts في resetPasswordHelpers.js)، لكن مفيش أي حد على عدد
// الطلبات من نفس الـ IP — يعني حد واحد يقدر يضرب آلاف الإيميلات المختلفة
// (كل واحد فيها معاه 5 محاولات) من غير أي مانع، وده حمل غير ضروري على
// الداتابيز كمان (كل طلب بيعمل findOne + save). نفس نمط الـ rate limit
// المستخدم في /api/register و/authOptions.js (login).
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
    const ipCheck = await checkRateLimit(`verify-reset-code:ip:${ip}`, IP_RATE_LIMIT);
    if (!ipCheck.allowed) {
      return jsonResponse(
        { error: "too_many_requests", retryAfterSeconds: ipCheck.retryAfterSeconds },
        429
      );
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email || !code) {
      return jsonResponse({ error: "missing_fields" }, 400);
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

    // 🔒 SECURITY: نافذة الـ 12 ساعة + حد أقصى 5 محاولات تخمين للكود.
    ensureAttemptWindow(user);
    if (hasExceededAttempts(user)) {
      await user.save(); // نحفظ لو ensureAttemptWindow صفّر النافذة
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

    // ✅ الكود صح — منمسحوش resetCodeHash هنا عمدًا؛ /api/reset-password
    // هيتأكد منه تاني وقت تحديث الباسورد الفعلي.
    await user.save();
    return jsonResponse(
      { message: "Code verified", remainingAttempts: remainingAttempts(user) },
      200
    );
  } catch (err) {
    console.error("[/api/verify-reset-code] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}