// app/scripts/publish-real-courses.js
//
// ⚠️ ده السبب الحقيقي اللي غالبًا خلّى صفحة /courses العامة معرضاش الـ 8
// كورسات الحقيقية اللي انت عملتهم: GET /api/courses (اللي صفحة /courses
// الوحيدة بتاخد بياناتها منه — شوف app/(pages)/courses/page.jsx) بيرجع
// للزوار غير المسجلين الكورسات status="published" بس (شوف السطر
// "query.status = 'published'" في app/api/courses/route.js). وأي كورس
// جديد بيتعمل بيبقى دايمًا status="draft" افتراضيًا (شوف POST handler في
// نفس الملف: "status: 'draft', // 🔒 كورس جديد دايمًا draft"). يعني لو
// عملت الـ 8 كورسات من لوحة المدرس ومغيّرتش حالة كل واحد لـ "منشور" يدويًا
// من الفورم (CourseFormModal.jsx → حقل status)، هيفضلوا مخفيين عن العامة
// للأبد حتى لو موجودين فعلاً في الداتابيز.
//
// السكريبت ده بيتكلم مباشرة مع "courses_landing" (الكولكشن الحقيقي بتاع
// موديل Course — شوف app/lib/models/Course.js) بالـ MongoDB driver الرسمي.
//
// طريقة التشغيل (من جذر المشروع):
//
//   1) عرض حالة كل الكورسات بس (من غير أي تعديل):
//      MONGO_URI="mongodb+srv://..." node app/scripts/publish-real-courses.js --list
//
//   2) نشر كل الكورسات اللي لسه draft (بيسيب أي كورس status="archived" زي
//      ما هو، مش بيلمسه، عشان أرشفة كورس غالبًا قرار مقصود):
//      MONGO_URI="mongodb+srv://..." node app/scripts/publish-real-courses.js --publish-drafts
//
// PowerShell: استبدل السطر بـ
//   $env:MONGO_URI="mongodb+srv://..."; node app/scripts/publish-real-courses.js --list

const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;
const mode = process.argv.includes("--publish-drafts") ? "publish" : "list";

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول، مثلاً:");
    console.error('   MONGO_URI="mongodb+srv://..." node app/scripts/publish-real-courses.js --list');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  const coll = db.collection("courses_landing");

  const count = await coll.countDocuments({});
  console.log(`📦 قاعدة البيانات: ${db.databaseName}`);
  console.log(`📊 إجمالي عدد الكورسات الحقيقية في "courses_landing": ${count}\n`);

  const docs = await coll
    .find({}, { projection: { title: 1, slug: 1, status: 1, teacher: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  if (docs.length === 0) {
    console.log("⚠️ مفيش أي مستند في courses_landing خالص — يعني الكورسات مش اتحفظت في الداتابيز أصلاً.");
  }

  docs.forEach((d, i) => {
    const flag = d.status === "published" ? "✅" : d.status === "draft" ? "🟡" : "📦";
    console.log(`${flag} [${i + 1}] ${d.title || "(بدون عنوان)"}  —  status: ${d.status}  —  slug: ${d.slug || "—"}  —  _id: ${d._id}`);
  });

  const draftCount = docs.filter((d) => d.status === "draft").length;
  console.log(`\n🟡 عدد الكورسات لسه "draft" (مش ظاهرة للزوار): ${draftCount}`);
  console.log(`✅ عدد الكورسات "published" (ظاهرة للزوار): ${docs.filter((d) => d.status === "published").length}`);
  console.log(`📦 عدد الكورسات "archived": ${docs.filter((d) => d.status === "archived").length}`);

  if (mode === "list") {
    console.log("\nℹ️  ده عرض بس، مفيش حاجة اتغيّرت. عشان تنشر كل الـ draft فعليًا، شغّل السكريبت بـ --publish-drafts");
  } else if (mode === "publish") {
    if (draftCount === 0) {
      console.log("\n✅ مفيش أي كورس draft محتاج نشر — كله متظبط بالفعل.");
    } else {
      const result = await coll.updateMany(
        { status: "draft" },
        { $set: { status: "published", updatedAt: new Date() } }
      );
      console.log(`\n✅ اتنشر ${result.modifiedCount} كورس. دلوقتي المفروض يظهروا في /courses مباشرة.`);
    }
  }

  await client.close();
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err);
  process.exit(1);
});