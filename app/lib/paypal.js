// app/lib/paypal.js
//
// Phase 3 — اليوم 26: تكامل بوابة الدفع PayPal. غلاف رفيع حوالين REST API
// بتاع PayPal (Orders v2 + Webhooks) بنفس فلسفة app/lib/bunny.js: fetch()
// مباشر من غير SDK إضافي، لأن احتياجاتنا محدودة (create order / capture /
// verify webhook signature بس).
//
// env vars مطلوبة (.env.local):
//   PAYPAL_CLIENT_ID=
//   PAYPAL_CLIENT_SECRET=
//   PAYPAL_MODE=sandbox            (أو live للإنتاج — sandbox هو الافتراضي)
//   PAYPAL_WEBHOOK_ID=             (من PayPal Developer Dashboard → Webhooks،
//                                    بعد ما تسجل رابط الـ webhook بتاعنا:
//                                    https://<domain>/api/payments/webhook)
//
// ⚠️ العملة: PayPal بيدعم مجموعة محددة من العملات بس (الدولار، اليورو،
// الجنيه الإسترليني، إلخ) — الجنيه المصري (EGP) *مش* من ضمنها عادةً. لو
// خطة/كورس بعملة مش مدعومة من PayPal، إنشاء الـ order هيفشل وهيرجع
// "paypal_error" من /api/payments/checkout. الحل: الأدمن يحدد سعر الكورس/
// الخطة بعملة PayPal بتدعمها (USD مثلاً) — مفيش تحويل عملة تلقائي هنا.

const PAYPAL_API_BASE = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

function getMode() {
  return process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
}

function getBaseUrl() {
  return PAYPAL_API_BASE[getMode()];
}

export function isPaypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// كاش بسيط لتوكن الـ access token في الميموري (مشترك بين كل الطلبات في نفس
// الـ server instance) — PayPal بيديك توكن صالح لساعات طويلة، مفيش داعي
// نطلب واحد جديد في كل عملية دفع.
let cachedToken = null; // { token, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal is not configured");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PayPal OAuth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 32400) * 1000,
  };
  return cachedToken.token;
}

// المبلغ في الموديل عندنا integer بالقروش/السنت (شوف Payment.js/Course.js)
// — PayPal محتاجه string عشري بخانتين.
function formatAmount(minorUnits) {
  return (Number(minorUnits) / 100).toFixed(2);
}

async function paypalFetch(path, { method = "GET", body, extraHeaders = {} } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.message || `PayPal API error (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

/**
 * بيفتح PayPal Order جديد (intent=CAPTURE) لعملية دفع واحدة (كورس أو
 * membership). referenceId المفروض يبقى Payment._id بتاعنا عشان نربط
 * الـ order بالسجل المالي عندنا.
 */
export async function createPaypalOrder({ amount, currency, referenceId, description, returnUrl, cancelUrl }) {
  return paypalFetch("/v2/checkout/orders", {
    method: "POST",
    // PayPal-Request-Id: idempotency key — لو نفس الطلب اتكرر (retry شبكة)
    // من غير قصد، PayPal بيرجّع نفس الـ order القديم بدل ما يفتح واحد تاني.
    extraHeaders: { "PayPal-Request-Id": `order-${referenceId}` },
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          custom_id: referenceId,
          description,
          amount: { currency_code: currency, value: formatAmount(amount) },
        },
      ],
      application_context: {
        brand_name: "EduMaster",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    },
  });
}

export async function getPaypalOrder(orderId) {
  return paypalFetch(`/v2/checkout/orders/${orderId}`, { method: "GET" });
}

/**
 * بيأكد (capture) عملية دفع بعد ما المستخدم وافق عليها في صفحة PayPal.
 * لو الـ order اتعمله capture بالفعل من مصدر تاني (مثلاً الـ webhook سبق
 * return route)، PayPal بيرجّع خطأ ORDER_ALREADY_CAPTURED — بنتعامل معه
 * بهدوء عن طريق قراءة حالة الـ order الحالية بدل ما نفشل العملية كلها،
 * عشان markPaymentSucceededAndGrantAccess (app/lib/paymentHelpers.js) تقدر
 * تكمل بنفس الشكل مهما مين اللي عمل الـ capture فعليًا.
 */
export async function capturePaypalOrder(orderId) {
  try {
    return await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, { method: "POST", body: {} });
  } catch (err) {
    const issue = err?.details?.details?.[0]?.issue;
    if (issue === "ORDER_ALREADY_CAPTURED") {
      return getPaypalOrder(orderId);
    }
    throw err;
  }
}

/**
 * بيتحقق إن الـ webhook event اللي وصلنا فعلاً من PayPal ومش مزوّر —
 * بيستخدم endpoint التحقق الرسمي بتاع PayPal نفسه (أضمن من إعادة تنفيذ
 * التحقق بالتوقيع يدويًا في الكود عندنا).
 */
export async function verifyPaypalWebhookSignature({ headers, event }) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const result = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });

  return result?.verification_status === "SUCCESS";
}