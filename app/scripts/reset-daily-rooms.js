// app/scripts/reset-daily-rooms.js
//
// إعادة ضبط غرف Daily للمحاضرات — الحل الجذري لمشكلة "المدرس في غرفة والطلاب في غرفة تانية".
//
// بيعمل إيه:
//   1) لكل محاضرة Daily لسه ماخلصتش (وقتها + ساعتين لسه ماعدّاش): بيغيّر اسم الغرفة لاسم
//      ثابت مشتق من الـ _id (edu-<id>) والرابط لدومين حسابك الحالي. الغرفة نفسها بتتعمل
//      أوتوماتيك أول ما حد يدخل (بنفس الاسم دايمًا — شوف ensureDailyRoom في app/lib/daily.js).
//   2) بيمسح الغرف القديمة من حساب Daily الحالي، ومن الحساب/الحسابات القديمة لو حطيت
//      DAILY_API_KEY_OLD (ممكن أكتر من مفتاح مفصولين بفاصلة).
//   3) اختياري --purge-daily: بيمسح *كل* الغرف الموجودة في الحسابات دي (حتى اللي مالهاش
//      علاقة بمحاضرات). التسجيلات (recordings) ليها تبويب منفصل في Daily — راجعه قبل ما تنفّذ.
//
// ⚠️ الافتراضي "تجربة بس" (dry-run): بيعرض اللي هيتغيّر من غير ما يعدّل أي حاجة.
// التنفيذ الفعلي بيحصل بس لما تضيف --apply.
// ⚠️ مش بيشتغل لو فيه محاضرة شغالة دلوقتي (عشان ما نقطعش حد) إلا لو ضفت --force.
//
// طريقة التشغيل (من جذر المشروع) — استخدم نفس القيم اللي على السيرفر الأساسي:
//
//   1) تجربة:
//      MONGO_URI="mongodb+srv://..." DAILY_API_KEY="<مفتاح الحساب الحالي>" \
//        node app/scripts/reset-daily-rooms.js --domain edumaster365
//
//   2) تنفيذ فعلي + مسح الغرف القديمة من الحساب القديم كمان:
//      MONGO_URI="..." DAILY_API_KEY="<الحالي>" DAILY_API_KEY_OLD="<القديم>" \
//        node app/scripts/reset-daily-rooms.js --domain edumaster365 --apply
//
//   3) مسح كل الغرف من كل الحسابات:
//      ... node app/scripts/reset-daily-rooms.js --domain edumaster365 --apply --purge-daily
//
// PowerShell: $env:MONGO_URI="..."; $env:DAILY_API_KEY="..."; node app/scripts/reset-daily-rooms.js --domain edumaster365
//
// بعد التنفيذ: لازم كل نسخ الموقع (الإنتاج وأي بيئة تانية على نفس الداتابيز) تشتغل
// بنفس DAILY_API_KEY بتاع الحساب الحالي.

const { MongoClient } = require("mongodb");

const DAILY_BASE = "https://api.daily.co/v1";
const MONGO_URI = process.env.MONGO_URI;
const KEY_CURRENT = process.env.DAILY_API_KEY;
const KEYS_OLD = (process.env.DAILY_API_KEY_OLD || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const DOMAIN = String(arg("--domain", "")).trim().replace(/\.daily\.co$/i, "").toLowerCase();
const APPLY = process.argv.includes("--apply");
const PURGE = process.argv.includes("--purge-daily");
const FORCE = process.argv.includes("--force");
const DB_NAME = arg("--db", undefined);

const roomNameForMeeting = (id) => `edu-${String(id)}`;

async function daily(key, method, path) {
  const res = await fetch(`${DAILY_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function deleteRoom(key, name) {
  const r = await daily(key, "DELETE", `/rooms/${encodeURIComponent(name)}`);
  if (r.ok) return "deleted";
  if (r.status === 404) return "not-found";
  return `error HTTP ${r.status}`;
}

async function purgeAllRooms(key, label) {
  let total = 0;
  for (let round = 0; round < 200; round++) {
    const list = await daily(key, "GET", "/rooms?limit=100");
    if (!list.ok) {
      console.log(`   [${label}] تعذّر جلب الغرف: HTTP ${list.status}`);
      return total;
    }
    const rooms = Array.isArray(list.data?.data) ? list.data.data : [];
    if (rooms.length === 0) return total;
    for (const r of rooms) {
      const s = await deleteRoom(key, r.name);
      if (s === "deleted") total++;
      else console.log(`   [${label}] ${r.name}: ${s}`);
    }
  }
  return total;
}

async function main() {
  if (!MONGO_URI) throw new Error("MONGO_URI مش متحدد.");
  if (!KEY_CURRENT) throw new Error("DAILY_API_KEY (مفتاح الحساب الحالي) مش متحدد.");
  if (!DOMAIN) throw new Error('لازم --domain (مثال: --domain edumaster365 يعني https://edumaster365.daily.co).');

  // تأكيد إن المفتاح الحالي فعلًا بتاع الدومين اللي كتبته (لو Daily رجّعت اسم الدومين).
  const info = await daily(KEY_CURRENT, "GET", "/");
  if (!info.ok) throw new Error(`مفتاح DAILY_API_KEY مرفوض من Daily (HTTP ${info.status}).`);
  const actual = String(info.data?.domain_name || "").toLowerCase();
  if (actual && actual !== DOMAIN) {
    throw new Error(`DAILY_API_KEY بتاع الدومين "${actual}" مش "${DOMAIN}". صحّح --domain أو المفتاح.`);
  }
  console.log(`حساب Daily الحالي: ${actual || "(مجهول — Daily ماردّتش اسم الدومين)"} | الوضع: ${APPLY ? "تنفيذ فعلي" : "تجربة (dry-run)"}`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  try {
    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const meetings = db.collection("meetings");

    const now = Date.now();
    const candidates = await meetings
      .find(
        { source: "daily", dailyRoomName: { $ne: null }, scheduledAt: { $gte: new Date(now - 24 * 3600 * 1000) } },
        { projection: { title: 1, scheduledAt: 1, durationMinutes: 1, dailyRoomName: 1, link: 1 } }
      )
      .sort({ scheduledAt: 1 })
      .toArray();

    const endOf = (m) => new Date(m.scheduledAt).getTime() + (m.durationMinutes || 60) * 60_000;
    const live = candidates.filter((m) => now >= new Date(m.scheduledAt).getTime() - 15 * 60_000 && now <= endOf(m) + 60_000);
    if (live.length > 0 && !FORCE) {
      console.log("\n⛔ فيه محاضرات شغالة/بتفتح دلوقتي — مش هنكمل عشان ما نقطعش حد:");
      live.forEach((m) => console.log(`   - ${m.title} (${m.scheduledAt.toISOString()})`));
      console.log("استنى لما تخلص، أو أضف --force لو متأكد.");
      return;
    }

    const upcoming = candidates.filter((m) => endOf(m) + 2 * 3600 * 1000 > now);
    const plan = upcoming
      .map((m) => ({
        id: m._id,
        title: m.title,
        at: m.scheduledAt,
        oldName: m.dailyRoomName,
        oldLink: m.link,
        newName: roomNameForMeeting(m._id),
        newLink: `https://${DOMAIN}.daily.co/${roomNameForMeeting(m._id)}`,
      }))
      .filter((p) => p.oldName !== p.newName || p.oldLink !== p.newLink);

    console.log(`\nمحاضرات Daily لسه ماخلصتش: ${upcoming.length} | محتاجة إعادة ضبط: ${plan.length}`);
    plan.forEach((p) =>
      console.log(`  • ${p.title} | ${new Date(p.at).toISOString()}\n      ${p.oldName} → ${p.newName}`)
    );

    const keys = [{ label: `current(${DOMAIN})`, key: KEY_CURRENT }, ...KEYS_OLD.map((k, i) => ({ label: `old#${i + 1}`, key: k }))];

    if (!APPLY) {
      console.log(`\n(تجربة بس) هيتمسح ${plan.length} غرفة قديمة من ${keys.length} حساب${PURGE ? "، وبعدها *كل* الغرف في الحسابات دي (--purge-daily)" : ""}.`);
      console.log("أضف --apply للتنفيذ.");
      return;
    }

    // 1) مسح الغرف القديمة بالاسم من كل حساب (404 = مش موجودة هناك، عادي).
    for (const p of plan) {
      const results = [];
      for (const { label, key } of keys) results.push(`${label}:${await deleteRoom(key, p.oldName)}`);
      console.log(`  مسح ${p.oldName} → ${results.join(" | ")}`);
    }

    // 2) تثبيت الاسم/الرابط الجديد (بشرط إن الاسم القديم لسه هو اللي في الداتابيز).
    let updated = 0;
    for (const p of plan) {
      const r = await meetings.updateOne(
        { _id: p.id, dailyRoomName: p.oldName },
        { $set: { dailyRoomName: p.newName, link: p.newLink } }
      );
      updated += r.modifiedCount;
    }
    console.log(`\n✅ اتحدّثت ${updated} محاضرة (الغرف هتتعمل أوتوماتيك أول دخول بنفس الاسم).`);

    // 3) اختياري: مسح كل الغرف.
    if (PURGE) {
      for (const { label, key } of keys) {
        const n = await purgeAllRooms(key, label);
        console.log(`🧹 [${label}] اتمسح ${n} غرفة.`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
