// app/lib/getpayin.js
//
// 🆕 بوابة الدفع الوحيدة في المشروع بعد استبدال Paymob بـ GetPayIn — غلاف
// رفيع: fetch() مباشر من غير SDK إضافي (نفس فلسفة app/lib/paymob.js القديم،
// بس بعقد GetPayIn الفعلي بدل Accept API بتاع Paymob).
//
// تدفق GetPayIn (Payment Integration API) خطوة واحدة بس لإنشاء الدفع (على
// عكس الـ 3 خطوات بتاعة Paymob: auth → order → payment_key):
//   POST /api/v2/integration/init  →  { checkout_url, invoice_id, expires_at }
// وبعدين المستخدم بيتحول لـ checkout_url (صفحة الدفع المستضافة عند
// GetPayIn) بـ redirect كامل (window.location.href)، بالظبط زي ما كان
// بيحصل مع iframe URL بتاع Paymob.
//
// كل endpoint عند GetPayIn بيتطلب توقيع HMAC-SHA256 (base64) محسوب من قيم
// مجموعة من حقول الطلب بترتيب محدد + سر hash_token — العملية دي موصوفة في
// SDK الرسمي (getpayin PyPI package) تحت GetpayinClient/_field_orders.py.
// أي تغيير في ترتيب الحقول بيكسر التحقق تمامًا عند GetPayIn، فمهم جدًا
// الترتيب يفضل زي التوثيق الرسمي بالظبط.
//
// env vars مطلوبة (.env.local):
//   GETPAYIN_PUBLIC_TOKEN=   (GetPayIn Dashboard → Settings → Payment Integrations → token العام، بيتبعت في كل request)
//   GETPAYIN_HASH_TOKEN=     (نفس الشاشة — السر بتاع التوقيع، سيرفر بس، منعرضوش أبدًا للـ client)
//   GETPAYIN_BASE_URL=       (اختياري — https://pay.getpayin.com افتراضيًا)
//
// ⚠️ العملة والمبلغ: على عكس Paymob اللي بيتوقع amount_cents (قروش/سنت)،
// GetPayIn بيتوقع order_amount كمبلغ عشري كامل (زي "250.00") مش قروش —
// شوف التحويل amountCentsToDecimalString تحت. Payment.amount عندنا لسه
// بالقروش/السنت زي ما هو (مفيش تغيير في شكل تخزين الداتابيز)، التحويل
// بيحصل بس وقت النداء لـ GetPayIn API.
//
// ⚠️ على عكس Paymob، GetPayIn مش مربوط "integration واحد = عملة واحدة" —
// نفس public_token/hash_token بيشتغلوا لأي عملة العميل حاططها فعليًا في
// حسابه عند GetPayIn، فمفيش خريطة عملة→integration_id هنا زي ما كان في
// paymob.js القديم.

import crypto from "crypto";

const GETPAYIN_BASE_URL = (process.env.GETPAYIN_BASE_URL || "https://pay.getpayin.com").replace(/\/+$/, "");

export function isGetPayInConfigured() {
  return Boolean(process.env.GETPAYIN_PUBLIC_TOKEN && process.env.GETPAYIN_HASH_TOKEN);
}

/** بيحوّل مبلغ مخزّن بالقروش/السنت (Payment.amount) لسترينج عشري كامل زي ما GetPayIn بيتوقعه ("250.00"). */
export function amountCentsToDecimalString(amountCents) {
  return (Math.round(Number(amountCents)) / 100).toFixed(2);
}

// 🔒 نفس coerce_to_string بتاع الـ SDK الرسمي (Python/PHP): null/undefined
// بيتحول لسترينج فاضي، boolean لـ "1"/"0"، والباقي زي ما هو كسترينج. بنستخدم
// نفس الدالة سواء وقت بناء التوقيع أو وقت بناء الـ body عشان نضمن إن
// البايتس اللي بنوقعها هي بالظبط البايتس اللي بنبعتها (لو اختلفوا، GetPayIn
// هيرفض التوقيع).
function coerceToString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }
    return String(value);
  }
  throw new Error(`Cannot serialize value of type ${typeof value}`);
}

function buildSignature(orderedValues, hashToken) {
  const concatenated = orderedValues.join("");
  return crypto.createHmac("sha256", hashToken).update(concatenated, "utf8").digest("base64");
}

// 🔒 مقارنة ثابتة الزمن للتواقيع (base64 strings) — نفس فلسفة safeCompareHex
// في paymob.js القديم؛ لو الطول مختلف مفيش داعي نقارن (تواقيع HMAC-SHA256
// المُرمّزة base64 دايمًا نفس الطول في الحالة الطبيعية، فده مش بيسرّب حاجة
// عن السر).
function safeCompareStrings(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// 🔒 قائمة الحقول ومسلسلها بالظبط زي ما موثّق في SDK الرسمي بتاع GetPayIn
// (_field_orders.py) — أي تغيير في الترتيب أو الحقول بيكسر التحقق تمامًا،
// فمهم جدًا الترتيب ده يفضل زي ما هو من غير تعديل. مفيش هنا غير الـ
// endpoints اللي المشروع فعليًا محتاجها (إنشاء الدفع + الاستعلام عن حالته)؛
// باقي الـ endpoints (void/refund/settle/recurring/...) موصوفة في نفس SDK
// لو احتجنا نضيفها لاحقًا.
const INVOICE_CREATE = {
  path: "/api/v2/integration/init",
  // { name, signed } — الحقول اللي signed:false بتتبعت في الـ body لكن
  // متتحسبش في التوقيع (زي payment_mode/iframe عند GetPayIn نفسها).
  fields: [
    { name: "first_name" },
    { name: "last_name" },
    { name: "email" },
    { name: "order_title" },
    { name: "order_amount" },
    { name: "address" },
    { name: "city" },
    { name: "country" },
    { name: "state" },
    { name: "currency" },
    { name: "redirection_url" },
    { name: "webhook_url" },
    { name: "order_details" },
  ],
};

const PAYMENT_CHECK_STATUS = {
  path: "/api/integration/check-status",
  fields: [{ name: "invoice_id" }],
};

/** بيبني الـ body الموقّع (توقيع + token) الجاهز يتبعت JSON لأي endpoint من اللي فوق. */
function buildSignedBody(spec, params, publicToken, hashToken) {
  const body = {};
  const signedValues = [];

  for (const f of spec.fields) {
    const raw = params[f.name];
    if (raw === undefined || raw === null || raw === "") continue; // حقول اختيارية غايبة: متتبعتش خالص، لا في الـ body ولا في التوقيع
    const strValue = coerceToString(raw);
    body[f.name] = strValue;
    signedValues.push(strValue);
  }

  const signature = buildSignature(signedValues, hashToken);
  return { ...body, token: publicToken, signature };
}

async function getpayinFetch(path, body) {
  const res = await fetch(`${GETPAYIN_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data?.success !== false;
  if (!ok) {
    const err = new Error(data?.message || `GetPayIn API error (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  // GetPayIn بيلف الرد الناجح في { success: true, data: {...} } — بنرجّع
  // data مباشرة زي ما الـ SDK الرسمي بيعمل.
  return data?.data ?? data;
}

/**
 * بينشئ Invoice جديد عند GetPayIn ويرجّع checkout_url المستضافة عندهم.
 * merchantOrderId مش موجود كحقل مباشر في invoice creation عند GetPayIn (على
 * عكس merchant_order_id بتاع Paymob) — الربط بالسجل المالي عندنا بيتم عن
 * طريق invoice_id الراجع هنا (بيتخزن في Payment.providerPaymentId فورًا)،
 * وكمان عن طريق redirectionUrl اللي بنبنيها إحنا وفيها Payment._id.
 */
export async function createGetPayInInvoice({
  amount,
  currency,
  firstName,
  lastName,
  email,
  orderTitle,
  orderDetails,
  redirectionUrl,
  webhookUrl,
}) {
  const publicToken = process.env.GETPAYIN_PUBLIC_TOKEN;
  const hashToken = process.env.GETPAYIN_HASH_TOKEN;
  if (!publicToken || !hashToken) throw new Error("GetPayIn is not configured");

  const body = buildSignedBody(
    INVOICE_CREATE,
    {
      first_name: firstName || "NA",
      last_name: lastName || "NA",
      email: email || "NA@NA.com",
      order_title: orderTitle,
      // 🔒 بنبعت المبلغ كسترينج عشري صريح (زي "250.00") مش رقم، بالظبط زي
      // الموصى بيه في توثيق GetPayIn — عشان نتحكم في الشكل النهائي على
      // السلك ونضمن إن التوقيع محسوب من نفس البايتس اللي بتتبعت فعليًا.
      order_amount: amount,
      currency,
      redirection_url: redirectionUrl,
      webhook_url: webhookUrl,
      order_details: orderDetails,
    },
    publicToken,
    hashToken
  );

  const data = await getpayinFetch(INVOICE_CREATE.path, body);
  return {
    checkoutUrl: data.checkout_url,
    invoiceId: data.invoice_id,
    expiresAt: data.expires_at,
  };
}

/**
 * استعلام مباشر (server-to-server, موقّع) عن حالة Invoice عند GetPayIn.
 * بنستخدمها في صفحة الرجوع (callback) كتحقق "دفاع في العمق" بدل ما نصدّق
 * أي query param جاي في رابط الـ redirect (GetPayIn، على عكس Paymob، مش
 * بيوقّع query params الرجوع بتاعته — التوقيع بتاعه على الـ webhook بس)،
 * فبدل ما نعتمد على حاجة مش موقّعة، بنسأل GetPayIn نفسها مباشرة عن الحالة
 * الحقيقية للـ invoice قبل ما نمنح أي وصول.
 */
export async function checkGetPayInInvoiceStatus(invoiceId) {
  const publicToken = process.env.GETPAYIN_PUBLIC_TOKEN;
  const hashToken = process.env.GETPAYIN_HASH_TOKEN;
  if (!publicToken || !hashToken) throw new Error("GetPayIn is not configured");

  const body = buildSignedBody(PAYMENT_CHECK_STATUS, { invoice_id: invoiceId }, publicToken, hashToken);
  const data = await getpayinFetch(PAYMENT_CHECK_STATUS.path, body);
  return {
    invoiceId: data.invoice_id,
    paidStatus: data.paid_status, // مثلاً "PAID" / "NOT_PAID" / "PENDING" حسب توثيق GetPayIn
    authCode: data.auth_code ?? null,
  };
}

// 🔒 حقول الـ webhook الموقّعة دايمًا (بترتيبها) — زي ما موصّف في SDK
// الرسمي (webhooks.py): success, invoice_id, invoice_status, message. أي
// حقل مش موجود بيتحط "" في التوقيع (نفس تعامل PHP implode مع null).
const WEBHOOK_ALWAYS_SIGNED = ["success", "invoice_id", "invoice_status", "message"];
// حقول موقّعة اختياريًا — بتتحسب في التوقيع بس لو موجودة فعليًا في الـ
// payload (مش دايمًا زي اللي فوق). auth_code مقصود إنه مش هنا (GetPayIn
// بيبعته من غير ما يوقّعه — شوف تعليق webhooks.py في SDK الرسمي).
const WEBHOOK_OPTIONALLY_SIGNED = ["mandate_id", "external_reference", "subscription_status"];

/**
 * بيتحقق من توقيع GetPayIn webhook. الـ signature هنا بيوصل جوه الـ body
 * نفسه (payload.signature) — مختلف عن Paymob اللي كان بيبعته كـ query param
 * منفصل. ⚠️ توقيع GetPayIn (زي ما موثّق رسميًا) مفيهوش timestamp، يعني
 * التحقق ده لوحده مبيمنعش replay attack — لازم نعتمد كمان على idempotency
 * الطبيعي بتاعنا (findOneAndUpdate بشرط status:"pending" في
 * markPaymentSucceededAndGrantAccess) عشان نفس الحدث لو اتكرر ميعملش تفعيل
 * تاني.
 */
export function verifyGetPayInWebhookSignature(payload) {
  const hashToken = process.env.GETPAYIN_HASH_TOKEN;
  const provided = payload?.signature;
  if (!hashToken || typeof provided !== "string" || provided === "") return false;

  const values = WEBHOOK_ALWAYS_SIGNED.map((key) => coerceToString(payload?.[key]));
  for (const key of WEBHOOK_OPTIONALLY_SIGNED) {
    if (Object.prototype.hasOwnProperty.call(payload || {}, key)) {
      values.push(coerceToString(payload[key]));
    }
  }

  const expected = buildSignature(values, hashToken);
  return safeCompareStrings(expected, provided);
}
