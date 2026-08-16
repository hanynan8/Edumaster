// scripts/cleanup-bad-course-doc.js
//
// ⚠️⚠️⚠️ خطر — السكريبت ده بقى Obsolete ومعكوس بعد الـ SWAP في
// app/api/data/route.js: دلوقتي "courses" هو الكولكشن الصح لمحتوى صفحة
// الكورسات التسويقي (hero/i18n)، و"courses_landing" هو كولكشن الكورسات
// الحقيقية. لو شغّلت السكريبت ده زي ما هو دلوقتي، هيدور جوه "courses"
// (اللي بقى المفروض فيه مستند المحتوى الشرعي بتاع صفحة /courses) ويمسحه
// بافتراض إنه "مستند غلط" — وده هيكسر صفحة الكورسات تاني!
// ماتشغّلوش غير لو أنت متأكد من ترتيب الكولكشنز الحالي وشيّكت يدويًا الأول
// (مثلًا بـ scripts/debug-courses-landing.js أو mongosh مباشرة).
//
// سكريبت لمرة واحدة (تاريخيًا): بيمسح المستند الغلط اللي اتحط بالغلط جوه كولكشن
// الكورسات الحقيقية "courses" (بتاعة المدرسين) بسبب باگ قديم في المشروع —
// كانت صفحة الكورسات وتاب الأدمن بينادوا collection=courses بدل
// collection=courses_landing، فأي محاولة حفظ لمحتوى صفحة الكورسات كانت
// بتكتب غلط جوه كولكشن الكورسات الحقيقية (اللي فيها فهرس unique على slug).
//
// السكريبت ده بيمسح بس المستندات اللي:
//   - مالهاش حقل "slug" خالص (يعني مش كورس حقيقي — كورس حقيقي دايمًا
//     ليه slug لإنه required في الـ schema)
//   - وفي نفس الوقت عندها حقل "hero" أو "i18n" (يعني هي فعلاً مستند
//     محتوى صفحة الكورسات، مش أي حاجة تانية اتحطت غلط بالصدفة)
//
// يعني الكورسات الحقيقية بتاعة المدرسين (اللي ليها slug) مش هيتلمسوا خالص.
//
// طريقة التشغيل (من جذر المشروع):
//   PowerShell:
//     $env:MONGO_URI="mongodb+srv://..."; node app/scripts/cleanup-bad-course-doc.js
//   Bash/Mac/Linux:
//     MONGO_URI="mongodb+srv://..." node app/scripts/cleanup-bad-course-doc.js

const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول: MONGO_URI=... node app/scripts/cleanup-bad-course-doc.js");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const RawCoursesCollection =
    mongoose.models.Model_raw_courses || mongoose.model("Model_raw_courses", schema, "courses");

  const filter = {
    slug: { $exists: false },
    $or: [{ hero: { $exists: true } }, { i18n: { $exists: true } }],
  };

  const toDelete = await RawCoursesCollection.find(filter).lean();

  if (toDelete.length === 0) {
    console.log("✅ مفيش أي مستند غلط لقيته في كولكشن الكورسات الحقيقية. كل حاجة نضيفة.");
  } else {
    console.log(`لقيت ${toDelete.length} مستند غلط (مش كورس حقيقي — محتوى صفحة كورسات اتحط غلط):`);
    toDelete.forEach((d) => console.log(`  - _id: ${d._id}`));

    const result = await RawCoursesCollection.deleteMany(filter);
    console.log(`✅ اتمسح ${result.deletedCount} مستند غلط من كولكشن "courses" الحقيقي.`);
  }

  const realCoursesCount = await RawCoursesCollection.countDocuments({ slug: { $exists: true } });
  console.log(`ℹ️  عدد الكورسات الحقيقية (بتاعة المدرسين) اللي فضلت زي ما هي: ${realCoursesCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err);
  process.exit(1);
});