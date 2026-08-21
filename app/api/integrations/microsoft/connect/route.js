// app/api/integrations/microsoft/connect/route.js
//
// 🆕 خطوة 1 من ربط حساب Microsoft: GET /api/integrations/microsoft/connect
// بيتنده من زرار "اربط حساب Microsoft Teams" في صفحة إعدادات المدرس.
// بيوجّه المتصفح لصفحة تسجيل دخول/موافقة Microsoft (getMicrosoftAuthUrl).
//
// 🔒 SECURITY: بنولّد "state" عشوائي ونخزنه في cookie قصيرة العمر
// (httpOnly + secure) قبل التوجيه. الـ callback بيقارن نفس القيمة —
// ده بيمنع CSRF على الـ OAuth flow (حد يخلي مدرس تاني يربط حسابه بيه
// عن طريق تمرير callback مزوّر).

import { requireRole } from "@/app/lib/rbac";
import { getMicrosoftAuthUrl, isMicrosoftIntegrationConfigured } from "@/app/lib/microsoftGraph";
import crypto from "crypto";

const STATE_COOKIE = "ms_oauth_state";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  // بس المدرسين والأدمن يقدروا يربطوا حساب (نفس منطق إنشاء الاجتماعات).
  const auth = await requireRole(["teacher", "admin"]);
  if (auth.response) return auth.response;

  if (!isMicrosoftIntegrationConfigured()) {
    return jsonResponse(
      { error: "microsoft_not_configured", message: "AZURE_CLIENT_ID/SECRET/REDIRECT_URI غير مضبوطة على السيرفر." },
      500
    );
  }

  // الـ state بيحمل قيمة عشوائية + معرّف المدرس (مربوطين مع بعض) عشان
  // الـ callback يتأكد إن نفس المستخدم اللي بدأ الطلب هو اللي رجع بيه.
  const nonce = crypto.randomBytes(24).toString("hex");
  const state = `${auth.session.user.id}.${nonce}`;

  const authUrl = getMicrosoftAuthUrl(state);

  const res = Response.redirect(authUrl, 302);
  // خمس دقايق كافية جدًا لعملية تسجيل الدخول والموافقة عند Microsoft.
  res.headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=${nonce}; Path=/; Max-Age=300; HttpOnly; SameSite=Lax; Secure`
  );
  return res;
}