// app/lib/clientCache.js
//
// ⚡ PERFORMANCE: كاش بسيط على مستوى الـ module (stale-while-revalidate) لطلبات
// GET العامة. الفايدة:
//   1) التنقل لصفحة زرناها قبل كده بيعرض المحتوى فورًا من الكاش (من غير
//      سبينر)، وبعدين بيحدّث في الخلفية لو البيانات اتغيرت.
//   2) نفس الطلب من أكتر من مكون (navbar + صفحة services مثلًا) بيتبعت مرة
//      واحدة بس (request de-duplication).
//   3) البيانات بتتزرع (seed) من السيرفر في الـ layout، فالنافبار والفوتر
//      بيظهروا في أول HTML بدل ما يستنوا fetch بعد الـ hydration.

const store = new Map(); // url -> { data, ts }
const inflight = new Map(); // url -> Promise

const DEFAULT_TTL = 60_000; // دقيقة: قبلها الكاش "طازج" ومفيش revalidate

export function peek(url) {
  return store.get(url)?.data ?? null;
}

export function seedCache(entries) {
  if (!entries) return;
  const now = Date.now();
  for (const [url, data] of Object.entries(entries)) {
    if (data != null && !store.has(url)) store.set(url, { data, ts: now });
  }
}

export function fetchCached(url, { ttl = DEFAULT_TTL, force = false } = {}) {
  const hit = store.get(url);
  if (!force && hit && Date.now() - hit.ts < ttl) return Promise.resolve(hit.data);
  if (inflight.has(url)) return inflight.get(url);

  const p = fetch(url, { headers: { Accept: "application/json" } })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      store.set(url, { data, ts: Date.now() });
      return data;
    })
    .finally(() => inflight.delete(url));

  inflight.set(url, p);
  return p;
}

// تسخين الكاش في وقت الخمول أو عند hover — بدون أي أثر على الـ UI.
export function prefetchData(url) {
  if (typeof window === "undefined") return;
  fetchCached(url).catch(() => {});
}

export function invalidate(url) {
  if (url) store.delete(url);
  else store.clear();
}
