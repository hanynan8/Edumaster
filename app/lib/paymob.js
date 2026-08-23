// app/lib/paymob.js
//
// 🆕 بوابة الدفع الثانية: Paymob (Accept API) — غلاف رفيع بنفس فلسفة
// app/lib/paypal.js: fetch() مباشر من غير SDK إضافي. Paymob هو الاختيار
// المنطقي كبوابة ثانية جنب PayPal لأنه (على عكس PayPal) بيدعم الجنيه
// المصري (EGP) وبطاقات مصرية/محافظ محلية (Fawry, Vodafone Cash, إلخ حسب
// الـ integration المفعّلة في حساب Paymob).
//
// تدفق Paymob (Accept API v1) مختلف عن PayPal في 3 خطوات بدل واحدة:
//   1) Authentication  → POST /api/auth/tokens            (api_key → auth_token, صالح ~1 ساعة)
//   2) Order Registration → POST /api/ecommerce/orders     (auth_token → order.id)
//   3) Payment Key     → POST /api/acceptance/payment_keys (auth_token + order.id + billing_data → payment_token)
// وبعدين المستخدم بيتحول لصفحة الدفع (iframe المستضافة عند Paymob):
//   https://accept.paymob.com/api/acceptance/iframes/{IFRAME_ID}?payment_token={payment_token}
//
// env vars مطلوبة (.env.local):
//   PAYMOB_API_KEY=              (من Paymob Dashboard → Settings → Account Info)
//   PAYMOB_INTEGRATION_ID=       (Dashboard → Payment Integrations — اختار الـ integration بتاعة الكارت/المحفظة)
//   PAYMOB_IFRAME_ID=            (Dashboard → Payment Integrations → iframes)
//   PAYMOB_HMAC_SECRET=          (Dashboard → Payment Integrations → HMAC — لازم تتظبط عشان نتحقق من الـ callbacks)
//   PAYMOB_CURRENCY=EGP          (اختياري — EGP افتراضيًا، ده العملة اللي Paymob (مصر) بيدعمها أساسًا)
//
// ⚠️ العملة: Paymob (النسخة المصرية) بيتوقع "قروش" (amount_cents) مش جنيه —
// زي بالظبط تخزين Payment.amount عندنا (قروش/سنت)، فمفيش تحويل مطلوب،
// بنبعت amount زي ما هو باسم amount_cents.

import crypto from "crypto";

const PAYMOB_API_BASE = "https://accept.paymob.com/api";

export function isPaymobConfigured() {
  return Boolean(
    process.env.PAYMOB_API_KEY &&
      process.env.PAYMOB_INTEGRATION_ID &&
      process.env.PAYMOB_IFRAME_ID
  );
}

async function paymobFetch(path, body) {
  const res = await fetch(`${PAYMOB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.detail || `Paymob API error (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

// كاش بسيط لتوكن الـ auth في الميموري، زي كاش توكن PayPal — بس مدة صلاحية
// Paymob أقصر بكتير (حوالي ساعة)، فبنحط هامش أمان أصغر (60 ثانية) ونطلب
// توكن جديد لو حصل شك في انتهاء الصلاحية.
let cachedToken = null; // { token, expiresAt }

async function getAuthToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) throw new Error("Paymob is not configured");

  const data = await paymobFetch("/auth/tokens", { api_key: apiKey });
  // Paymob مبيرجعش expiry صريح للتوكن في الرد ده — التوكن بيفضل صالح لحوالي
  // ساعة حسب توثيقهم، فبنكاشه لمدة 50 دقيقة بس عشان نبقى في الأمان.
  cachedToken = { token: data.token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return cachedToken.token;
}

/**
 * بيسجّل Order جديد عند Paymob. merchantOrderId المفروض يبقى Payment._id
 * بتاعنا (زي referenceId في createPaypalOrder) — ده اللي بيربط الـ order
 * عند Paymob بالسجل المالي عندنا، وبنعتمد عليه في lookup وقت الـ webhook.
 */
export async function createPaymobOrder({ amount, merchantOrderId, items = [] }) {
  const authToken = await getAuthToken();
  return paymobFetch("/ecommerce/orders", {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: Math.round(Number(amount)),
    currency: process.env.PAYMOB_CURRENCY || "EGP",
    merchant_order_id: merchantOrderId,
    items,
  });
}

/**
 * بيطلب payment_token اللي بيتحط في رابط الـ iframe. billingData الحقول
 * المطلوبة من Paymob كتيرة وغالبًا مش كلها متاحة عندنا (زي city/street)،
 * فبنملاها بقيم "NA" افتراضية زي الموصى بيه في توثيق Paymob نفسه لما
 * البيانات مش متاحة فعليًا — ده مقبول ومنتشر ومش بيأثر على نجاح العملية.
 */
export async function createPaymobPaymentKey({ amount, orderId, billingData }) {
  const authToken = await getAuthToken();
  return paymobFetch("/acceptance/payment_keys", {
    auth_token: authToken,
    amount_cents: Math.round(Number(amount)),
    expiration: 3600, // صلاحية payment_token: ساعة — كافية لأي جلسة دفع حقيقية
    order_id: orderId,
    currency: process.env.PAYMOB_CURRENCY || "EGP",
    integration_id: Number(process.env.PAYMOB_INTEGRATION_ID),
    billing_data: {
      first_name: billingData?.firstName || "NA",
      last_name: billingData?.lastName || "NA",
      email: billingData?.email || "NA@NA.com",
      phone_number: billingData?.phone || "NA",
      city: "NA",
      country: "NA",
      street: "NA",
      building: "NA",
      floor: "NA",
      apartment: "NA",
      state: "NA",
    },
  });
}

/**
 * بيبني رابط صفحة الدفع (iframe المستضافة عند Paymob) اللي بنحوّل المستخدم
 * ليه — نفس فلسفة approveLink.href في PayPal: redirect كامل، مفيش iframe
 * مضمّن في صفحتنا احنا.
 */
export function buildPaymobIframeUrl(paymentToken) {
  const iframeId = process.env.PAYMOB_IFRAME_ID;
  return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;
}

// 🔒 قائمة الحقول ومسلسلها بالظبط زي ما موثّق في Paymob Docs (HMAC
// Calculation) — أي تغيير في الترتيب أو الحقول بيكسر التحقق تمامًا، فمهم
// جدًا الترتيب ده يفضل زي ما هو من غير تعديل.
const HMAC_FIELDS_ORDER = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
];

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function computeHmac(values, secret) {
  const concatenated = values.map((v) => (v === null || v === undefined ? "" : String(v))).join("");
  return crypto.createHmac("sha512", secret).update(concatenated).digest("hex");
}

/**
 * بيتحقق من الـ HMAC بتاع "Transaction Processed Callback" (الـ webhook
 * الحقيقي، POST من سيرفر Paymob لسيرفرنا، body: { type: "TRANSACTION", obj: {...} }).
 * الـ hmac نفسه بيوصل كـ query param في الرابط (?hmac=...) مش جوه الـ body.
 */
export function verifyPaymobWebhookHmac({ transactionObj, hmacFromQuery }) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !hmacFromQuery) return false;

  // order هنا لازم يبقى الـ order.id بس (مش الكائن كله) — Paymob بيحسبه كده
  // حتى في نسخة الـ webhook (body) رغم إن order في الـ obj الأصلي كائن كامل.
  const values = HMAC_FIELDS_ORDER.map((field) => {
    if (field === "order") return transactionObj?.order?.id;
    return getNestedValue(transactionObj, field);
  });

  const expected = computeHmac(values, secret);
  return expected.toLowerCase() === String(hmacFromQuery).toLowerCase();
}

/**
 * بيتحقق من الـ HMAC بتاع "Transaction Response Callback" (المستخدم بيتحول
 * هنا في متصفحه بعد الدفع، GET query params flat — زي source_data.pan بيبقى
 * source_data.pan برضو كـ اسم query param، مش nested object).
 */
export function verifyPaymobCallbackHmac(searchParams) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  const hmacFromQuery = searchParams.get("hmac");
  if (!secret || !hmacFromQuery) return false;

  const values = HMAC_FIELDS_ORDER.map((field) => searchParams.get(field));
  const expected = computeHmac(values, secret);
  return expected.toLowerCase() === String(hmacFromQuery).toLowerCase();
}