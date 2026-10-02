// app/lib/publicData.js  (server-only)
//
// ⚡ PERFORMANCE: قراءة كولكشنز المحتوى العام مباشرة من السيرفر (في layout)
// مع كاش في الذاكرة. بنزرع النتيجة في الـ HTML، فالنافبار والفوتر بيظهروا
// مع أول رسم بدل ما يستنوا (HTML → JS → fetch → Mongo).
// بنقرا بس من PUBLIC_READ_COLLECTIONS الآمنة (نفس allowlist الـ API).

import mongoose from "mongoose";
import { connectToMongo } from "./mongodb";

const TTL_MS = 30_000;
const TIMEOUT_MS = 1500;
const SEEDABLE = new Set(["navbar", "footer", "services"]);

if (!globalThis._publicDataCache) globalThis._publicDataCache = new Map();
const cache = globalThis._publicDataCache;

async function readCollection(name) {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;

  await connectToMongo();
  const docs = await mongoose.connection.db.collection(name).find({}).limit(5).toArray();
  const data = JSON.parse(JSON.stringify(docs)); // ObjectId/Date → JSON آمن
  cache.set(name, { data, ts: Date.now() });
  return data;
}

export function clearPublicDataCache() {
  cache.clear();
}

// بيرجّع { "/api/data?collection=navbar": [...], ... } — أي فشل/تأخير = تجاهل
// صامت والكلاينت بيجيب الداتا بنفسه زي الأول (graceful fallback).
export async function getSeedData(names = ["navbar", "footer", "services"]) {
  const safe = names.filter((n) => SEEDABLE.has(n));
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));

  const results = await Promise.all(
    safe.map((n) =>
      Promise.race([readCollection(n).catch(() => null), timeout]).then((d) => [n, d])
    )
  );

  const out = {};
  for (const [n, d] of results) {
    if (Array.isArray(d) && d.length) out[`/api/data?collection=${n}`] = d;
  }
  return out;
}
