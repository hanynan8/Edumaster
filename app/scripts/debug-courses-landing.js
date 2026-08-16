// scripts/debug-courses-landing.js
//
// سكريبت تشخيصي بس — بيتكلم مع MongoDB مباشرة (بالـ driver الرسمي، من غير
// mongoose خالص) عشان نتأكد بالظبط إيه اللي متخزّن فعليًا جوه مستند
// "courses_landing"، من غير ما أي طبقة (mongoose schema, casting, إلخ)
// تأثر على الصورة.
//
// طريقة التشغيل:
//   PowerShell:
//     $env:MONGO_URI="mongodb+srv://..."; node app/scripts/debug-courses-landing.js
//   Bash/Mac/Linux:
//     MONGO_URI="mongodb+srv://..." node app/scripts/debug-courses-landing.js

const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(); // بياخد اسم الداتابيز من نفس الـ URI (study)

  console.log("📦 اسم الداتابيز المتصل بيها:", db.databaseName);

  const collections = await db.listCollections().toArray();
  console.log("📋 كل الكولكشنز الموجودة:", collections.map((c) => c.name).join(", "));

  const coll = db.collection("courses_landing");
  const count = await coll.countDocuments({});
  console.log(`\n📊 عدد المستندات في "courses_landing": ${count}`);

  const docs = await coll.find({}).toArray();
  docs.forEach((doc, i) => {
    console.log(`\n--- مستند رقم ${i + 1} ---`);
    console.log("  _id:", doc._id.toString());
    console.log("  المفاتيح الموجودة:", Object.keys(doc).join(", "));
    console.log("  عدد courses:", Array.isArray(doc.courses) ? doc.courses.length : "مفيش حقل courses خالص!");
    if (Array.isArray(doc.courses) && doc.courses.length > 0) {
      console.log("  أول كورس:", JSON.stringify(doc.courses[0]));
    }
    console.log("  عدد لغات i18n:", doc.i18n ? Object.keys(doc.i18n).length : "مفيش حقل i18n خالص!");
  });

  await client.close();
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err);
  process.exit(1);
});