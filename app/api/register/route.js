// app/api/register/route.js
// نقطة تسجيل حساب جديد الوحيدة والمسموحة. بديل عن POST /api/data?collection=auth
// اللي كان بيسمح لأي حد يبعت أي بيانات (زي role) مباشرة للداتابيز من غير أي تحقق.
//
// 🆕 تأكيد الإيميل: الـ endpoint ده مابينشئش الحساب. بيتحقق من البيانات، يخزّنها
// كتسجيل معلّق (PendingRegistration)، ويبعت كود من 6 أرقام على الإيميل. الحساب
// بيتعمل فعليًا في POST /api/register/verify بعد ما الكود يتأكد.

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getPendingRegistrationModel } from "@/app/lib/models";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";
import {
  VERIFY_CODE_TTL_MS,
  consumeSendQuota,
  cooldownRemainingSeconds,
  generateVerificationCode,
  sendVerificationCodeEmail,
} from "@/app/lib/registrationHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// نفس منطق التحقق من رقم الهاتف المستخدم في /api/profile — مرن وبيقبل
// أكتر من صيغة دولة، عشان المنصة عندها طلاب من أكتر من بلد.
function isValidPhone(phone) {
  return /^\+?[0-9\s-]{7,20}$/.test(phone);
}

// 🔒 SECURITY: بدون rate limiting كان أي حد يقدر يعمل مئات الحسابات الوهمية
// بسكريبت بسيط. 10 تسجيلات كحد أقصى كل ساعة لكل IP كافية لأي استخدام حقيقي
// (شخص أو أسرة على نفس الشبكة) ومزعجة كفاية لأي سكريبت آلي.
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_SECONDS = 60 * 60;

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`register:ip:${ip}`, {
      limit: REGISTER_LIMIT,
      windowSeconds: REGISTER_WINDOW_SECONDS,
    });
    if (!allowed) {
      return jsonResponse(
        { error: "too_many_attempts", retryAfterSeconds },
        429
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) return jsonResponse({ error: "invalid_body" }, 400);

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();

    if (!name || !email || !password || !phone) {
      return jsonResponse({ error: "missing_fields" }, 400);
    }
    if (!isValidEmail(email)) {
      return jsonResponse({ error: "invalid_email" }, 400);
    }
    if (!isValidPhone(phone)) {
      return jsonResponse({ error: "invalid_phone" }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ error: "weak_password" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();

    // 🔒 PERFORMANCE/SECURITY (audit fix): كان بيجيب كل مستند في كولكشن الـ
    // auth بالكامل (find({})) في كل محاولة تسجيل — مع نمو عدد المستخدمين ده
    // بيبقى أبطأ وأتقل على الداتابيز والذاكرة تدريجيًا، وكمان قابل للاستغلال
    // كـ DoS بسيط (سبام تسجيلات يفرض collection scan متكرر). استبدلناه
    // بـ findOne({ $or: [...] }) واحد بيوقف عند أول تطابق — واستعلام الإيميل
    // فيه بيستفيد من الـ unique index الموجود أصلاً على email (mongodb.js).
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await AuthModel.findOne(
      {
        $or: [{ email }, { name: new RegExp(`^${escapedName}$`, "i") }],
      },
      "name email"
    ).lean();

    if (existing) {
      const emailTaken = existing.email?.toLowerCase().trim() === email;
      const nameTaken = existing.name?.toLowerCase().trim() === name.toLowerCase();
      // بنفحص الإيميل الأول لأنه المعرّف الأهم/الفريد فعليًا على مستوى الداتابيز.
      if (emailTaken) return jsonResponse({ error: "email_taken" }, 409);
      if (nameTaken) return jsonResponse({ error: "name_taken" }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // 🆕 مفيش حساب بيتعمل هنا. بنخزّن تسجيل معلّق ونبعت كود التأكيد.
    // لو فيه تسجيل معلّق لنفس الإيميل (المستخدم رجع صحّح اسمه/باسورده مثلًا)
    // بنحدّث بياناته ونبعت كود جديد — بس بحدّين ضد إغراق إيميل حد بالرسائل:
    // فاصل 60 ثانية بين كل إرسالين + حصة يومية: 5 أكواد/يوم لكل إيميل ولكل IP.
    const Pending = getPendingRegistrationModel();
    const pending = await Pending.findOne({ email });

    if (pending) {
      const wait = cooldownRemainingSeconds(pending.lastSentAt);
      if (wait > 0) {
        return jsonResponse({ error: "resend_too_soon", retryAfterSeconds: wait }, 429);
      }
    }

    // 🔒 الحصة اليومية (5 لكل إيميل + 5 لكل IP) — بتتخصم قبل الإرسال الفعلي.
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

    await Pending.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          phone,
          passwordHash,
          codeHash,
          codeExpiry: new Date(now.getTime() + VERIFY_CODE_TTL_MS),
          attempts: 0,
          lastSentAt: now,
        },
        // أول إرسال بيعمل sendCount = 1 (upsert)، وكل إرسال بعده بيزوّده 1.
        $inc: { sendCount: 1 },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, new: true }
    );

    const sent = await sendVerificationCodeEmail({ to: email, name, code });
    if (!sent) {
      // الإيميل ماوصلش لـ Resend (مفتاح غلط/Resend واقع) — مفيش فايدة نسيب
      // تسجيل معلّق مستخدمه عمره ما هيستلم كوده.
      await Pending.deleteOne({ email });
      return jsonResponse({ error: "email_send_failed" }, 502);
    }

    return jsonResponse(
      { verificationRequired: true, email, remainingSends: quota.remaining, dailyLimit: quota.limit },
      202
    );
  } catch (err) {
    console.error("Register error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}