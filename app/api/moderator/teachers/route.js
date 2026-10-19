// app/api/moderator/teachers/route.js
//
// GET /api/moderator/teachers[?q=...]
// 🆕 قايمة المدرّسين المسجلين (id + الاسم + الإيميل) — بتتستخدم في فورم إنشاء
// الكورس عشان الموديريتور يختار "المدرّس المشرف" على الكورس بالإيميل.
//
// 🔒 SECURITY: موديريتور/أدمن بس (middleware.js بيغطي /api/moderator، وفيه
// فحص requireRole هنا كطبقة تانية). مفيش role تاني يقدر يشوف إيميلات المدرّسين.
// بنرجّع المدرّسين النشطين بس (role = "teacher" وحسابهم مش موقوف) وبحقول
// محدودة (من غير تليفون أو أي بيانات تانية).

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_TEACHERS = 500;

export async function GET(request) {
  try {
    const auth = await requireRole(["moderator", "admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    const rl = await enforceRateLimit(request, {
      keyPrefix: "moderator:teachers",
      limit: 60,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const q = String(new URL(request.url).searchParams.get("q") || "").trim().slice(0, 100);

    await connectToMongo();
    const Auth = getAuthModel();

    const filter = {
      role: "teacher",
      status: { $ne: "suspended" },
      email: { $type: "string", $ne: "" },
    };
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const rows = await Auth.find(filter, "name email").sort({ email: 1 }).limit(MAX_TEACHERS).lean();

    return jsonResponse({
      teachers: rows.map((u) => ({
        id: u._id.toString(),
        name: u.name || "",
        email: u.email,
      })),
    });
  } catch (err) {
    console.error("[/api/moderator/teachers] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
