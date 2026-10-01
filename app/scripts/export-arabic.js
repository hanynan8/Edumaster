// export-arabic.js
//
// بيطلّع كل النصوص العربية من كولكشنز المحتوى في ملف واحد: arabic-strings.json
// (القراءة فقط — مبيكتبش حاجة في الداتابيز).
//
// التشغيل من جذر المشروع:
//   PowerShell:  $env:MONGO_URI="mongodb+srv://..."; node export-arabic.js
//   Bash:        MONGO_URI="mongodb+srv://..." node export-arabic.js
//
// اختياري: تحدد كولكشنز بعينها:
//   node export-arabic.js contact services home

const fs = require("fs");
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
const OUT = "arabic-strings.json";

// كولكشنز فيها بيانات مستخدمين/مدفوعات/طلبات — مش هنقرّبها أبدًا
const DENY = /user|auth|account|session|payment|enroll|form|consult|request|certificate|notification|comment|otp|token|meeting|lesson|progress|order|invoice|receipt/i;

const ARABIC = /[\u0600-\u06FF]/;

function walk(node, path, out, ctx) {
  if (typeof node === "string") {
    if (ARABIC.test(node)) out.push({ ...ctx, path: path.slice(), text: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, path.concat(String(i)), out, ctx));
    return;
  }
  if (node && typeof node === "object" && !(node instanceof Date) && !node._bsontype) {
    for (const [k, v] of Object.entries(node)) {
      if (k === "_id" || k === "createdAt" || k === "updatedAt" || k === "__v") continue;
      if (k.includes(".") || k.startsWith("$")) {
        console.warn(`⚠️  اتخطّيت مفتاح غير مدعوم: ${ctx.collection}/${ctx.id} → ${k}`);
        continue;
      }
      walk(v, path.concat(k), out, ctx);
    }
  }
}

(async () => {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول");
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  let names = process.argv.slice(2);
  if (!names.length) {
    names = (await db.listCollections().toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith("system.") && !DENY.test(n));
  }
  console.log("📚 الكولكشنز:", names.join(", "));

  const out = [];
  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    for (const doc of docs) {
      const idType = doc._id && doc._id._bsontype === "ObjectId" ? "ObjectId" : typeof doc._id;
      walk(doc, [], out, { collection: name, id: String(doc._id), idType });
    }
    console.log(`  • ${name}: ${docs.length} مستند`);
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`\n✅ ${out.length} نص عربي اتكتبوا في ${OUT}`);
  console.log("ابعت الملف ده هنا.");
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });