// app/api/register/route.js
// نقطة تسجيل حساب جديد الوحيدة والمسموحة. بديل عن POST /api/data?collection=auth
// اللي كان بيسمح لأي حد يبعت أي بيانات (زي role) مباشرة للداتابيز من غير أي تحقق.

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

    if (!name || !email || !password) {
      return jsonResponse({ error: "missing_fields" }, 400);
    }
    if (!isValidEmail(email)) {
      return jsonResponse({ error: "invalid_email" }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ error: "weak_password" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();

    // نفس منطق فحص التكرار اللي كان في الـ frontend، لكن دلوقتي على السيرفر
    // بحيث الباسوردات متبقاش بترجع للمتصفح أبدًا في نص العملية.
    const existing = await AuthModel.find({}, "name email").lean();
    const nameTaken = existing.some(
      (u) => u.name?.toLowerCase().trim() === name.toLowerCase()
    );
    const emailTaken = existing.some(
      (u) => u.email?.toLowerCase().trim() === email
    );

    if (nameTaken) return jsonResponse({ error: "name_taken" }, 409);
    if (emailTaken) return jsonResponse({ error: "email_taken" }, 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    // role دايمًا "student" هنا — مفيش أي طريقة للـ client إنه يطلب دور أعلى.
    // ترقية أي حساب لـ teacher/admin بتتم من لوحة الأدمن فقط لاحقًا.
    // status دايمًا "active" عند التسجيل — مفيش طريقة إنشاء حساب موقوف من نفسه.
    const created = await AuthModel.create({
      name,
      email,
      password: passwordHash,
      role: "student",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return jsonResponse(
      {
        id: created._id.toString(),
        name: created.name,
        email: created.email,
        role: created.role,
      },
      201
    );
  } catch (err) {
    console.error("Register error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}