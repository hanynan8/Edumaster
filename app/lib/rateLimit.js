// app/lib/rateLimit.js
//
// Rate limiter موحّد يُستخدم في /login (authOptions)، /api/register،
// وأي endpoint حساس تاني. بيشتغل بطريقتين:
//
// 1) لو UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN متظبطين في الـ env
//    (موصى بيه بشدة على Vercel serverless): العدّاد بيتخزن في Redis، وبالتالي
//    بيفضل صحيح حتى لو الطلبات راحت لـ instances مختلفة من الفنكشن.
// 2) لو مفيش Redis: fallback في ذاكرة العملية (نفس أسلوب /api/data و
//    /api/forgot-password الموجود بالفعل في المشروع). ده أفضل من مفيش حماية
//    خالص، لكنه مش دقيق 100% على serverless لأن كل instance ليه ذاكرته
//    الخاصة — لو الموقع بياخد ترافيك حقيقي، لازم تضيف Redis (Upstash عنده
//    free tier كافي جدًا لموقع زي ده: https://upstash.com).

import { Redis } from "@upstash/redis";

let redisClient = null;
let redisAttempted = false;

function getRedis() {
  if (redisAttempted) return redisClient;
  redisAttempted = true;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      console.warn(
        "⚠️ UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting falls back to in-memory " +
          "storage, which is NOT reliable across multiple serverless instances on Vercel. " +
          "Add Upstash Redis env vars for correct production behavior."
      );
    }
  } catch (err) {
    console.error("Failed to initialize Upstash Redis client:", err);
    redisClient = null;
  }
  return redisClient;
}

if (!globalThis._memRateLimit) globalThis._memRateLimit = new Map();

function memoryIncrement(key, windowSeconds) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = globalThis._memRateLimit.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    globalThis._memRateLimit.set(key, { windowStart: now, count: 1 });
    return { count: 1, retryAfterSeconds: windowSeconds };
  }

  entry.count += 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((entry.windowStart + windowMs - now) / 1000)
  );
  return { count: entry.count, retryAfterSeconds };
}

// تنظيف دوري بسيط لخريطة الـ fallback عشان ما تكبرش من غير حدود
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of globalThis._memRateLimit.entries()) {
    if (now - entry.windowStart > 60 * 60 * 1000) {
      globalThis._memRateLimit.delete(key);
    }
  }
}, 10 * 60 * 1000).unref?.();

/**
 * بيزوّد عدّاد المفتاح ده ويرجّع هل تعدّى الحد المسموح.
 * @param {string} key - مفتاح فريد (مثلاً: `login:ip:1.2.3.4` أو `login:user:email@x.com`)
 * @param {{limit:number, windowSeconds:number}} opts
 * @returns {Promise<{allowed:boolean, remaining:number, retryAfterSeconds:number}>}
 */
export async function checkRateLimit(key, { limit, windowSeconds }) {
  const redis = getRedis();

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      let ttl = await redis.ttl(key);
      if (!ttl || ttl < 0) ttl = windowSeconds;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: ttl,
      };
    } catch (err) {
      console.error("Redis rate limit error, falling back to memory:", err);
    }
  }

  const { count, retryAfterSeconds } = memoryIncrement(key, windowSeconds);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

/** بيصفّر عدّاد مفتاح معيّن (مثلاً بعد نجاح تسجيل الدخول). */
export async function resetRateLimit(key) {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (err) {
      console.error("Redis rate limit reset error:", err);
    }
  }
  globalThis._memRateLimit.delete(key);
}

/** استخراج IP العميل بنفس الطريقة المستخدمة في باقي المشروع. */
export function getClientIp(request) {
  const forwarded = request?.headers?.get?.("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request?.headers?.get?.("x-real-ip") || "unknown";
}

// 🔒 SECURITY (Day 59 audit): هيلبر جاهز عشان أي route جديد يقدر يضيف rate
// limiting بسطر واحد بدل ما يكرر منطق checkRateLimit + بناء الـ 429 response
// يدويًا في كل مكان. الاستخدام المعتاد:
//
//   import { enforceRateLimit } from "@/app/lib/rateLimit";
//
//   export async function POST(request) {
//     const rl = await enforceRateLimit(request, {
//       keyPrefix: "payments:checkout", limit: 10, windowSeconds: 60,
//     });
//     if (rl) return rl; // 429 جاهز
//     ...
//   }
//
// لو فيه extraKey (زي user id بعد ما تتأكد من الـ session)، ممكن تعمل نداء
// تاني بعد requireSession بمفتاح خاص بالمستخدم (مش بس IP)، عشان يمنع مستخدم
// واحد من استغلال IPs متعددة (VPN) *و* يمنع في نفس الوقت هجوم من IP واحد
// بحسابات كتير. الأفضل عمليًا: نادِ عليها مرتين (ip + user) لو الـ endpoint حساس جدًا.
export async function enforceRateLimit(
  request,
  { keyPrefix, limit, windowSeconds, extraKey }
) {
  const ip = getClientIp(request);
  const key = extraKey ? `${keyPrefix}:${extraKey}` : `${keyPrefix}:ip:${ip}`;
  const result = await checkRateLimit(key, { limit, windowSeconds });

  if (!result.allowed) {
    return new Response(JSON.stringify({ error: "too_many_requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfterSeconds),
      },
    });
  }
  return null;
}