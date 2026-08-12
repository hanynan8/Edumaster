// app/api/admin/users/route.js
// بديل آمن عن GET /api/data?collection=auth — محمي بصلاحية admin فعليًا على السيرفر،
// وبيرجع بيانات المستخدمين من غير حقل الباسورد أبدًا.

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  await connectToMongo();
  const AuthModel = getAuthModel();
  const users = await AuthModel.find({}).lean();

  const safe = users.map((u) => ({
    id: u._id?.toString(),
    name: u.name || null,
    email: u.email || null,
    role: u.role || "student",
    createdAt: u.createdAt || null,
  }));

  return jsonResponse(safe, 200);
}
