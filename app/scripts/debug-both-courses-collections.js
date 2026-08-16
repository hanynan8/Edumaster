// scripts/debug-both-courses-collections.js
//
// سكريبت تشخيصي بس — قراءة فقط، مش بيعدّل ولا بيمسح أي حاجة خالص.
// بيتكلم مع MongoDB مباشرة (بالـ driver الرسمي، من غير mongoose) عشان
// نتأكد بالظبط إيه اللي متخزّن فعليًا جوه الكولكشنين "courses" و
// "courses_landing"، وإيه الـ indexes الموجودة على كل واحد فيهم —
// عشان نعرف بالظبط أنهي كولكشن هو التسويقي وأنهي هو كورسات المدرسين
// الحقيقية *في الداتابيز بتاعتك فعليًا*، مش حسب التعليقات في الكود بس.
//
// طريقة التشغيل (PowerShell):
//   $env:MONGO_URI="mongodb+srv://..."; node app/scripts/debug-both-courses-collections.js

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;

async function inspect(db, name) {
  console.log(`\n════════════════════════════════════════`);
  console.log(`📂 كولكشن: "${name}"`);
  console.log(`════════════════════════════════════════`);

  const exists = (await db.listCollections({ name }).toArray()).length > 0;
  if (!exists) {
    console.log("  ⚠️ الكولكشن ده مش موجود خالص في الداتابيز.");
    return;
  }

  const coll = db.collection(name);

  const count = await coll.countDocuments({});
  console.log(`  📊 عدد المستندات: ${count}`);

  const indexes = await coll.indexes();
  console.log(`  🔑 الـ indexes الموجودة:`);
  indexes.forEach((idx) => {
    console.log(
      `     - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (UNIQUE)" : ""}${
        idx.sparse ? " (sparse)" : ""
      }`
    );
  });

  const docs = await coll.find({}).limit(10).toArray();
  docs.forEach((doc, i) => {
    console.log(`\n  --- مستند رقم ${i + 1} ---`);
    console.log("    _id:", doc._id.toString());
    console.log("    المفاتيح الموجودة:", Object.keys(doc).join(", "));
    if (doc.slug !== undefined) console.log("    slug:", doc.slug);
    if (doc.teacher !== undefined) console.log("    teacher:", doc.teacher);
    if (doc.status !== undefined) console.log("    status:", doc.status);
    if (doc.title !== undefined) console.log("    title:", doc.title);
    if (Array.isArray(doc.courses)) {
      console.log("    عدد عناصر courses[]:", doc.courses.length);
    }
    if (doc.i18n) {
      console.log("    عدد لغات i18n:", Object.keys(doc.i18n).length);
    }
  });
  if (count > 10) console.log(`\n  ... فيه ${count - 10} مستند تاني مش معروض هنا`);
}

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول: $env:MONGO_URI=\"...\"");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  console.log("📦 اسم الداتابيز المتصل بيها:", db.databaseName);

  const collections = await db.listCollections().toArray();
  console.log("📋 كل الكولكشنز الموجودة:", collections.map((c) => c.name).join(", "));

  await inspect(db, "courses");
  await inspect(db, "courses_landing");

  await client.close();
  console.log("\n✅ خلصنا. ده كان فحص قراءة فقط، مفيش حاجة اتغيّرت.");
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err);
  process.exit(1);
});