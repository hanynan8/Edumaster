// app/lib/microsoftGraph.js
//
// 🆕 تكامل Microsoft Graph API — إنشاء اجتماعات Teams تلقائيًا نيابة عن
// المدرس، بدل ما يفتح Teams بنفسه وينسخ الرابط يدويًا (شوف app/lib/models/
// Meeting.js القديم للسياق الكامل عن ليه كان القرار الأول يدوي).
//
// طريقة العمل (OAuth 2.0 Authorization Code Flow):
//   1) المدرس يضغط "اربط حساب Microsoft" → /api/integrations/microsoft/connect
//      → بيوجهه لصفحة تسجيل دخول Microsoft (getMicrosoftAuthUrl).
//   2) بعد الموافقة، Microsoft بترجّعه لـ /api/integrations/microsoft/callback
//      مع "code" مؤقت → بنبادله بـ access_token + refresh_token
//      (exchangeCodeForTokens) ونخزنهم مشفّرين في MicrosoftAccount.
//   3) وقت إنشاء أي اجتماع، بنجيب access_token صالح (getValidAccessTokenForTeacher
//      بيجدده تلقائيًا لو انتهت صلاحيته باستخدام refresh_token) وننده
//      createOnlineMeeting.
//
// env vars مطلوبة (.env.local) — شوف تعليق تسجيل التطبيق في Azure Portal
// أسفل الملف:
//   AZURE_CLIENT_ID=
//   AZURE_CLIENT_SECRET=
//   AZURE_TENANT_ID=common        (أو Tenant ID بتاع مؤسستك لو عايز تقصر
//                                   الدخول على حسابات المؤسسة بس)
//   AZURE_REDIRECT_URI=http://localhost:3000/api/integrations/microsoft/callback
//   MS_TOKEN_ENCRYPTION_KEY=       (32 بايت عشوائي — لتشفير refresh_token
//                                   قبل ما يتخزن في الداتابيز. اعمله بـ:
//                                   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
//
// 📋 خطوات تسجيل التطبيق في Azure (مرة واحدة بس، من حساب الأدمن/المؤسسة):
//   1) https://portal.azure.com → Microsoft Entra ID → App registrations
//      → New registration.
//   2) Redirect URI (Web): نفس قيمة AZURE_REDIRECT_URI فوق (لازم تتطابق
//      حرفيًا، بما فيها http/https والـ trailing slash).
//   3) Certificates & secrets → New client secret → انسخ الـ value فورًا
//      (بيتخفي بعد ما تسيب الصفحة) → ده AZURE_CLIENT_SECRET.
//   4) API permissions → Add a permission → Microsoft Graph → Delegated
//      permissions → أضف: OnlineMeetings.ReadWrite, offline_access, User.Read
//      → اعمل "Grant admin consent" لو التطبيق داخلي لمؤسسة واحدة.
//   5) Overview → Application (client) ID = AZURE_CLIENT_ID،
//      Directory (tenant) ID = AZURE_TENANT_ID (أو سيبها "common" لو عايز
//      تسمح لأي حساب Microsoft شخصي/مؤسسي يربط حسابه).

import crypto from "crypto";
import { getMicrosoftAccountModel } from "@/app/lib/models/MicrosoftAccount";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function getTenant() {
  return process.env.AZURE_TENANT_ID || "common";
}

function getAuthorityBase() {
  return `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0`;
}

// الصلاحيات (scopes) المطلوبة من المدرس وقت الموافقة:
//  - offline_access: عشان نقدر نجدد access_token من غير ما يوافق تاني كل ساعة.
//  - OnlineMeetings.ReadWrite: إنشاء/تعديل اجتماعات Teams نيابة عنه.
//  - User.Read: بيانات أساسية (الاسم/الإيميل) عشان نعرضهم في "حسابك مربوط بـ...".
const GRAPH_SCOPES = ["offline_access", "OnlineMeetings.ReadWrite", "User.Read"];

/**
 * بيبني رابط تسجيل الدخول/الموافقة بتاع Microsoft. الـ state بيتخزن في
 * cookie قصيرة العمر (شوف route الـ connect) وبيترجع تاني في الـ callback
 * عشان نتأكد إن الطلب فعلاً جاي من نفس الجلسة (حماية CSRF لـ OAuth flow).
 */
export function getMicrosoftAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.AZURE_REDIRECT_URI,
    response_mode: "query",
    scope: GRAPH_SCOPES.join(" "),
    state,
    prompt: "select_account",
  });
  return `${getAuthorityBase()}/authorize?${params.toString()}`;
}

export function isMicrosoftIntegrationConfigured() {
  return Boolean(
    process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_REDIRECT_URI
  );
}

async function requestToken(bodyParams) {
  const res = await fetch(`${getAuthorityBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParams.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error_description || data?.error || `HTTP ${res.status}`;
    throw new Error(`microsoft_token_error: ${reason}`);
  }
  return data; // { access_token, refresh_token, expires_in, ... }
}

/** بيبادل الـ authorization code (من الـ callback) بـ access/refresh tokens. */
export function exchangeCodeForTokens(code) {
  return requestToken(
    new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.AZURE_REDIRECT_URI,
      scope: GRAPH_SCOPES.join(" "),
    })
  );
}

/** بيجدد access_token منتهي باستخدام refresh_token المخزّن. */
export function refreshAccessToken(refreshToken) {
  return requestToken(
    new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: GRAPH_SCOPES.join(" "),
    })
  );
}

// --- تشفير refresh_token قبل التخزين في MongoDB (AES-256-GCM) ---------------
// access_token عمره قصير (~ساعة) فمش بنشفّره، لكن refresh_token صالح لشهور
// فلازم يتخزن مشفّر، مش نص عادي، حتى لو حد وصل لنسخة احتياطية من الداتابيز.

function getEncryptionKey() {
  const raw = process.env.MS_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "MS_TOKEN_ENCRYPTION_KEY is not defined — required to encrypt Microsoft refresh tokens."
    );
  }
  // بيقبل مفتاح hex بطول 64 حرف (32 بايت) أو أي نص، وبيعمله hash لـ 32 بايت
  // ثابتة عشان AES-256 محتاج مفتاح بالظبط 32 بايت.
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plainText) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // بنخزن iv + authTag + النص المشفّر مع بعض في قيمة واحدة (base64) عشان
  // سهل نخزنها في حقل String واحد بالموديل.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload) {
  const key = getEncryptionKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/**
 * بيرجع access_token صالح لمدرس معيّن — لو لسه صالح بيرجعه على طول، لو
 * قرب ينتهي (أو انتهى) بيجدده تلقائيًا بالـ refresh_token المخزّن ويحدّث
 * الداتابيز، من غير ما المدرس يعمل أي حاجة أو يوافق تاني.
 *
 * @returns {Promise<string|null>} access_token أو null لو المدرس مش رابط حسابه.
 */
export async function getValidAccessTokenForTeacher(teacherId) {
  const MicrosoftAccount = getMicrosoftAccountModel();
  const account = await MicrosoftAccount.findOne({ teacher: teacherId });
  if (!account) return null;

  const now = Date.now();
  // هامش أمان دقيقتين قبل الانتهاء الفعلي، عشان نتجنب استخدام توكن بيموت
  // في نص الطلب لـ Graph API.
  const stillValid = account.accessTokenExpiresAt && account.accessTokenExpiresAt.getTime() - 120_000 > now;
  if (stillValid && account.accessToken) {
    return account.accessToken;
  }

  const refreshToken = decryptSecret(account.refreshTokenEncrypted);
  const tokens = await refreshAccessToken(refreshToken);

  account.accessToken = tokens.access_token;
  account.accessTokenExpiresAt = new Date(now + tokens.expires_in * 1000);
  if (tokens.refresh_token) {
    // Microsoft أحيانًا بيرجّع refresh_token جديد (rotation) — لازم نحدّثه.
    account.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
  }
  await account.save();

  return account.accessToken;
}

/**
 * بينشئ اجتماع Teams فعلي عن طريق Microsoft Graph Online Meetings API،
 * ويرجّع رابط الانضمام (joinWebUrl) الجاهز يتخزن في Meeting.link — بالظبط
 * زي الرابط اللي كان المدرس بيلزقه يدويًا، بس متولّد تلقائيًا.
 */
export async function createOnlineMeeting({ accessToken, subject, startDateTime, endDateTime }) {
  const res = await fetch(`${GRAPH_BASE}/me/onlineMeetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      startDateTime,
      endDateTime,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`graph_create_meeting_error: ${reason}`);
  }
  return {
    joinUrl: data.joinWebUrl,
    graphMeetingId: data.id,
  };
}

/** بيانات بسيطة عن صاحب الحساب (اسم/إيميل) — تُستخدم في شاشة "حسابك مربوط بـ". */
export async function getMicrosoftProfile(accessToken) {
  const res = await fetch(`${GRAPH_BASE}/me?$select=displayName,mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return {
    displayName: data.displayName || null,
    email: data.mail || data.userPrincipalName || null,
  };
}