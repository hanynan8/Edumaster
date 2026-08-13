// app/api/admin/audit-logs/route.js
// عرض آخر إجراءات الأدمن الموثّقة. admin-only، ومحدود بعدد أقصى لكل طلب.

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo, getAuditLogModel } from "@/app/lib/mongodb";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const MAX_LOGS_RETURNED = 500;

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit"), 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LOGS_RETURNED)
      : 100;

    await connectToMongo();
    const AuditLog = getAuditLogModel();

    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return jsonResponse(
      logs.map((l) => ({
        id: l._id.toString(),
        action: l.action,
        actorEmail: l.actorEmail,
        actorName: l.actorName,
        targetId: l.targetId,
        targetEmail: l.targetEmail,
        details: l.details,
        ip: l.ip,
        createdAt: l.createdAt,
      })),
      200
    );
  } catch (err) {
    console.error("[/api/admin/audit-logs] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}