// app/api/moderator/users/route.js
//
// GET /api/moderator/users?q=&skip=&limit=&role=student,teacher
// قائمة الطلاب والمدرّسين العاديين المسجّلين في المنصة — بتغذّي منتقي "تسجيل
// طلاب أو مدرّسين مجانًا" في فورم الكورس (StudentGrantPicker). مستقلة تمامًا
// عن الميتنجس (/api/meetings/invitees).
//
// - موديريتور/أدمن بس (الميدل وير بيمنع باقي الأدوار على /api/moderator).
// - بحث بالاسم أو الإيميل (q)، وترقيم (skip/limit، حد أقصى 100).
// - بيستبعد المستخدم نفسه وأي حساب من غير إيميل.
// - 🔒 rate limit لكل مستخدم.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { requireSession, isStaffRole } from "@/app/lib/rbac";
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

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isStaffRole(session.user.role)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const rl = await enforceRateLimit(request, {
      keyPrefix: "moderator:users",
      limit: 60,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const sp = new URL(request.url).searchParams;
    const q = String(sp.get("q") || "").trim().slice(0, 100);
    const limit = Math.min(100, Math.max(1, Math.round(Number(sp.get("limit"))) || 30));
    const skip = Math.max(0, Math.round(Number(sp.get("skip"))) || 0);

    await connectToMongo();
    const Auth = getAuthModel();

    const filter = { _id: { $ne: session.user.id }, email: { $type: "string", $ne: "" } };
    const and = [];
    // 🆕 ?role=student | teacher | student,teacher → تضييق القايمة على الأدوار دي بس
    // (منتقي تسجيل الكورس المجاني بيبعت student,teacher: طلاب + مدرّسين عاديين).
    // الحسابات القديمة من غير role بتتعامل كطلاب (زي ما بنرجّعها تحت). أي قيمة
    // تانية (admin/moderator/...) بتتجاهل — مش بنسمح بفلترة على أدوار الإدارة.
    const roleFilters = String(sp.get("role") || "")
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r === "student" || r === "teacher");
    if (roleFilters.length > 0) {
      const roleClauses = [];
      if (roleFilters.includes("student")) {
        roleClauses.push({ role: "student" }, { role: { $exists: false } }, { role: null });
      }
      if (roleFilters.includes("teacher")) roleClauses.push({ role: "teacher" });
      and.push({ $or: roleClauses });
    }
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      and.push({ $or: [{ name: rx }, { email: rx }] });
    }
    if (and.length > 0) filter.$and = and;

    // limit + 1 → نعرف فيه صفحة تانية ولا لأ من غير countDocuments.
    const rows = await Auth.find(filter, "name email role")
      .sort({ name: 1, _id: 1 })
      .skip(skip)
      .limit(limit + 1)
      .lean();

    const hasMore = rows.length > limit;
    const users = rows.slice(0, limit).map((u) => ({
      id: u._id.toString(),
      name: u.name || "",
      email: String(u.email).toLowerCase(),
      role: u.role || "student",
    }));

    return jsonResponse({ users, hasMore });
  } catch (err) {
    console.error("[/api/moderator/users] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
