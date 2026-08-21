// app/api/integrations/microsoft/callback/route.js
//
// 🆕 خطوة 2 من ربط حساب Microsoft: GET /api/integrations/microsoft/callback
// Microsoft بترجّع المستخدم هنا بعد ما يوافق (أو يرفض)، مع query params:
//   ?code=...&state=...   (نجاح)
//   ?error=...&error_description=...   (رفض/فشل)
//
// بنتحقق من الـ state (شوف route الـ connect)، نبادل الـ code بتوكنات
// (exchangeCodeForTokens)، نجيب بيانات الحساب (getMicrosoftProfile)،
// ونعمل upsert لسجل MicrosoftAccount بتاع المدرس ده. في الآخر بنعمل
// redirect لصفحة الإعدادات في الواجهة مع ?ms_connected=1 أو ?ms_error=...
// عشان الواجهة توري رسالة نجاح/فشل مناسبة.

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMicrosoftAccountModel } from "@/app/lib/models/MicrosoftAccount";
import {
  exchangeCodeForTokens,
  encryptSecret,
  getMicrosoftProfile,
} from "@/app/lib/microsoftGraph";

const STATE_COOKIE = "ms_oauth_state";
// 🔧 غيّر المسار ده لو صفحة إعدادات المدرس عندكم في مكان مختلف.
const SETTINGS_PATH = "/teacher/settings";

function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function redirectToSettings(origin, params) {
  const url = new URL(SETTINGS_PATH, origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = Response.redirect(url.toString(), 302);
  // نمسح cookie الـ state بعد ما نستخدمه (نجاح أو فشل، مش محتاجينها تاني).
  res.headers.append("Set-Cookie", `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
  return res;
}

export async function GET(request) {
  const { origin } = new URL(request.url);
  const searchParams = new URL(request.url).searchParams;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToSettings(origin, { ms_error: oauthError });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  if (!code || !state) {
    return redirectToSettings(origin, { ms_error: "missing_code_or_state" });
  }

  // 🔒 لازم يكون فيه session نشطة (نفس المستخدم اللي بدأ الطلب) + الـ nonce
  // في الـ state يطابق اللي في الـ cookie، وإلا نرفض العملية (حماية CSRF).
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return redirectToSettings(origin, { ms_error: "unauthorized" });
  }

  const [stateUserId, stateNonce] = state.split(".");
  const cookieNonce = getCookie(request, STATE_COOKIE);
  if (!cookieNonce || cookieNonce !== stateNonce || stateUserId !== session.user.id) {
    return redirectToSettings(origin, { ms_error: "invalid_state" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = await getMicrosoftProfile(tokens.access_token);

    await connectToMongo();
    const MicrosoftAccount = getMicrosoftAccountModel();

    await MicrosoftAccount.findOneAndUpdate(
      { teacher: session.user.id },
      {
        teacher: session.user.id,
        microsoftDisplayName: profile?.displayName || "",
        microsoftEmail: profile?.email || "",
        accessToken: tokens.access_token,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        refreshTokenEncrypted: encryptSecret(tokens.refresh_token),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return redirectToSettings(origin, { ms_connected: "1" });
  } catch (err) {
    console.error("[/api/integrations/microsoft/callback] error:", err);
    return redirectToSettings(origin, { ms_error: "token_exchange_failed" });
  }
}