// app/scripts/find-course-by-id.js
//
// سكريبت تشخيصي — قراءة فقط، مابيعدّلش ولا بيمسح أي حاجة.
// بيدوّر على id واحد أو أكتر في *كل* كولكشنز الداتابيز (كـ ObjectId وكـ string)
// ويطبع: الكولكشن، نوع الـ _id، الـ status، والعنوان.
//
// التشغيل (من جذر المشروع):
//   PowerShell:  node app/scripts/find-course-by-id.js 6ab90b0f0df6cae38b4910b1 6ae1114fdb3216058e6591df
//   (لو MONGO_URI مش متعرّف في الـ shell بيقراه من .env.local / .env تلقائيًا)

const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

function loadEnvUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  for (const f of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*MONGO_URI\s*=\s*(.*)\s*$/);
      if (m) return m[1].replace(/^['"]|['"]$/g, "");
    }
  }
  return null;
}

function maskUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("usage: node app/scripts/find-course-by-id.js <id> [<id> ...]");
    process.exit(1);
  }
  const uri = loadEnvUri();
  if (!uri) {
    console.error("❌ MONGO_URI مش موجود (لا في الـ shell ولا في .env.local/.env)");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // الداتابيز الافتراضية من الـ URI (نفس سلوك mongoose.connect)
  console.log("🔌 URI:", maskUri(uri));
  console.log("🗄️  database name:", db.databaseName);

  const colls = (await db.listCollections().toArray()).map((c) => c.name).sort();
  console.log("📂 collections:", colls.join(", "), "\n");

  for (const id of ids) {
    console.log("════════════════════════════════════════");
    console.log("🔎", id);
    const valid = /^[0-9a-fA-F]{24}$/.test(id);
    let found = false;
    for (const name of colls) {
      const coll = db.collection(name);
      const filters = [];
      if (valid) filters.push(["ObjectId", { _id: new ObjectId(id) }]);
      filters.push(["string", { _id: id }]);
      for (const [kind, filter] of filters) {
        const doc = await coll.findOne(filter, { projection: { title: 1, status: 1, slug: 1, teacher: 1, createdBy: 1 } });
        if (doc) {
          found = true;
          console.log(`  ✅ ${name}  (_id as ${kind})  status=${doc.status}  slug=${doc.slug}  title=${JSON.stringify(doc.title)}`);
        }
      }
    }
    if (!found) console.log("  ❌ مش موجود في أي كولكشن في الداتابيز دي");
  }

  // كورسات في courses_landing _id بتاعها مش ObjectId (دي اللي findById مش هيلاقيها)
  if (colls.includes("courses_landing")) {
    const bad = await db
      .collection("courses_landing")
      .aggregate([
        { $project: { title: 1, status: 1, t: { $type: "$_id" } } },
        { $match: { t: { $ne: "objectId" } } },
      ])
      .toArray();
    console.log("\n════════════════════════════════════════");
    console.log(`courses_landing — مستندات _id بتاعها مش ObjectId: ${bad.length}`);
    for (const d of bad.slice(0, 30)) console.log(`  - ${d._id} (${d.t}) status=${d.status} title=${JSON.stringify(d.title)}`);
  }

  await client.close();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
