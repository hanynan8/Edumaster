// app/api/register/verify/route.js
//
// الخطوة التانية في التسجيل: المستخدم يبعت الإيميل + الكود اللي وصله. لو
// الكود صح بنعمل الحساب الحقيقي (كولكشن auth) من بيانات التسجيل المعلّق،
// ونمسح التسجيل المعلّق. الرد نفس رد /api/register القديم (201 + بيانات
// الحساب) عشان الواجهة تكمّل بنفس الـ flow (signIn تلقائي ثم onboarding).

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getPendingRegistrationModel } from "@/app/lib/models";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";
import { VERIFY_MAX_ATTEMPTS, isValidEmail } from "@/app/lib/registrationHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 حد على مستوى الـ IP فوق حد المحاولات لكل كود (5) — يمنع سكريبت يجرّب
// إيميلات كتير بالتوازي.
const VERIFY_IP_LIMIT = { limit: 30, windowSeconds: 60 * 60 };

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const ipCheck = await checkRateLimit(`register-verify:ip:${ip}`, VERIFY_IP_LIMIT);
    if (!ipCheck.allowed) {
      return jsonResponse({ error: "too_many_attempts", retryAfterSeconds: ipCheck.retryAfterSeconds }, 429);
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email || !isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return jsonResponse({ error: "invalid_code" }, 400);
    }

    await connectToMongo();
    const Pending = getPendingRegistrationModel();
    const pending = await Pending.findOne({ email });

    // مفيش تسجيل معلّق (اتمسح بعد ساعة، أو بعد ما المحاولات خلصت، أو اتأكد
    // قبل كده) → لازم يبدأ التسجيل من الأول.
    if (!pending) return jsonResponse({ error: "no_pending_registration" }, 404);

    if (new Date() > new Date(pending.codeExpiry)) {
      return jsonResponse({ error: "code_expired" }, 400);
    }

    if ((pending.attempts || 0) >= VERIFY_MAX_ATTEMPTS) {
      await Pending.deleteOne({ _id: pending._id });
      return jsonResponse({ error: "too_many_attempts_for_code" }, 429);
    }

    const valid = await bcrypt.compare(code, pending.codeHash);
    if (!valid) {
      // $inc ذرّي — طلبات متوازية مش هتعدّي حد الـ 5 محاولات.
      const updated = await Pending.findOneAndUpdate(
        { _id: pending._id },
        { $inc: { attempts: 1 } },
        { new: true }
      );
      const remaining = Math.max(0, VERIFY_MAX_ATTEMPTS - (updated?.attempts ?? VERIFY_MAX_ATTEMPTS));
      if (remaining === 0) {
        await Pending.deleteOne({ _id: pending._id });
        return jsonResponse({ error: "too_many_attempts_for_code" }, 429);
      }
      return jsonResponse({ error: "invalid_code", remainingAttempts: remaining }, 400);
    }

    // ✅ الكود صح — نعمل الحساب. بنعيد فحص الإيميل/الاسم لأن حد تاني ممكن
    // يكون سجّل بنفس الاسم/الإيميل في الفترة بين التسجيل والتأكيد.
    const AuthModel = getAuthModel();
    const escapedName = pending.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await AuthModel.findOne(
      { $or: [{ email }, { name: new RegExp(`^${escapedName}$`, "i") }] },
      "name email"
    ).lean();
    if (existing) {
      await Pending.deleteOne({ _id: pending._id });
      const emailTaken = existing.email?.toLowerCase().trim() === email;
      return jsonResponse({ error: emailTaken ? "email_taken" : "name_taken" }, 409);
    }

    const now = new Date();
    let created;
    try {
      // role دايمًا "student" و status دايمًا "active" — زي /api/register القديم.
      created = await AuthModel.create({
        name: pending.name,
        email,
        password: pending.passwordHash,
        phone: pending.phone,
        role: "student",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      if (err?.code === 11000) {
        await Pending.deleteOne({ _id: pending._id });
        return jsonResponse({ error: "email_taken" }, 409);
      }
      throw err;
    }

    await Pending.deleteOne({ _id: pending._id });

    return jsonResponse(
      {
        id: created._id.toString(),
        name: created.name,
        email: created.email,
        phone: created.phone,
        role: created.role,
      },
      201
    );
  } catch (err) {
    console.error("[/api/register/verify] error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
