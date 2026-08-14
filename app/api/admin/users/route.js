// app/api/admin/users/route.js
// بديل آمن عن GET /api/data?collection=auth — محمي بصلاحية admin فعليًا على السيرفر،
// وبيرجع بيانات المستخدمين من غير حقل الباسورد أبدًا.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      // 🔒 SECURITY: بيانات مستخدمين حساسة — تتخزنش (cache) في المتصفح ولا أي proxy
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// 🔒 SECURITY: حد أقصى لعدد المستخدمين المرجعين في الطلب الواحد، حتى لو الجدول كبر جدًا.
// لو محتاج تصفّح كل المستخدمين، ضيف pagination حقيقي (page/limit) بدل ما تسيبها مفتوحة.
const MAX_USERS_RETURNED = 2000;

export async function GET() {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    await connectToMongo();
    const AuthModel = getAuthModel();

    // 🔒 SECURITY: استبعاد الباسورد من الـ query نفسه، مش بعد ما يتجاب — عشان
    // محتفظش بيه في ذاكرة السيرفر أصلاً، وده بيمنع تسريبه بالغلط في logs أو
    // errors لاحقة. لو الـ schema بتاعك فيه حقول حساسة تانية (زي reset tokens
    // أو أي secret) ضيفها هنا بنفس الطريقة: "-password -fieldName".
    const users = await AuthModel.find({}, "-password")
      .sort({ createdAt: -1 })
      .limit(MAX_USERS_RETURNED)
      .lean();

    const safe = users.map((u) => ({
      id: u._id?.toString(),
      name: u.name || null,
      email: u.email || null,
      role: u.role || "student",
      status: u.status || "active",
      createdAt: u.createdAt || null,
    }));

    return jsonResponse(safe, 200);
  } catch (err) {
    // 🔒 SECURITY: التفاصيل الكاملة في الـ server logs بس، رسالة عامة للعميل
    console.error("[/api/admin/users] GET error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}