// app/api/integrations/microsoft/status/route.js
//
// 🆕 GET /api/integrations/microsoft/status — بتستخدمها صفحة إعدادات
// المدرس عشان تعرف تعرض "مربوط بـ فلان@..." أو زرار "اربط حساب Microsoft".
// ملاحظة: بترجّع بس بيانات عرض (اسم/إيميل) — أبدًا مش بترجّع أي توكن.

import { requireRole } from "@/app/lib/rbac";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMicrosoftAccountModel } from "@/app/lib/models/MicrosoftAccount";
import { isMicrosoftIntegrationConfigured } from "@/app/lib/microsoftGraph";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const auth = await requireRole(["teacher", "admin"]);
  if (auth.response) return auth.response;

  // لو Azure مش متظبط أصلاً على السيرفر، نوري ده للواجهة عشان تخفي زرار
  // "الربط" بدل ما توري زرار هيفشل لو اتضغط.
  if (!isMicrosoftIntegrationConfigured()) {
    return jsonResponse({ configured: false, connected: false });
  }

  await connectToMongo();
  const MicrosoftAccount = getMicrosoftAccountModel();
  const account = await MicrosoftAccount.findOne(
    { teacher: auth.session.user.id },
    "microsoftDisplayName microsoftEmail createdAt"
  ).lean();

  if (!account) {
    return jsonResponse({ configured: true, connected: false });
  }

  return jsonResponse({
    configured: true,
    connected: true,
    displayName: account.microsoftDisplayName || null,
    email: account.microsoftEmail || null,
    connectedAt: account.createdAt,
  });
}