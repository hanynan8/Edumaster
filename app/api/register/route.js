// app/api/register/route.js
// نقطة تسجيل حساب جديد الوحيدة والمسموحة. بديل عن POST /api/data?collection=auth
// اللي كان بيسمح لأي حد يبعت أي بيانات (زي role) مباشرة للداتابيز من غير أي تحقق.

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
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
    const created = await AuthModel.create({
      name,
      email,
      password: passwordHash,
      role: "student",
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
