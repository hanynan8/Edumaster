// app/api/meetings/invitees/route.js
//
// 🆕 GET /api/meetings/invitees?q=&skip=&limit= — قائمة مستخدمي الموقع
// المسجّلين اللي المدرس/الأدمن يقدر يدعوهم لمحاضرة (منتقي المدعوين في
// app/meet/page.jsx). الدعوة بقت لمستخدمين مسجّلين بس، فمفيش إدخال إيميل حر.
//
// - مدرس/أدمن بس (غير كده 403).
// - بحث بالاسم أو الإيميل (q)، وترقيم (skip/limit، حد أقصى 100 في الصفحة) —
//   عدد المختارين نفسه مالوش حد، لكن القائمة المعروضة بتتحمّل على دفعات.
// - بيستبعد المستخدم نفسه، وأي حساب من غير إيميل.
// - 🔒 rate limit لكل مستخدم عشان القائمة دي مايتعملهاش scraping.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { requireSession } from "@/app/lib/rbac";
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
    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const rl = await enforceRateLimit(request, {
      keyPrefix: "meetings:invitees",
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
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { email: rx }];
    }

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
    console.error("[/api/meetings/invitees] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
