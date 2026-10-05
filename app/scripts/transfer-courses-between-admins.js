// app/scripts/transfer-courses-between-admins.js
//
// نقل ملكية كل الكورسات من أدمن لأدمن تاني.
//
// الافتراضي: hanynan8@gmail.com  ->  info@edumaster365.com
//
// بيعمل إيه بالظبط:
//   1) بيدوّر على الحسابين في كولكشن "auth" بالإيميل (لازم الاتنين موجودين).
//   2) بيغيّر حقل teacher في كل كورسات "courses_landing" اللي صاحبها الحساب القديم.
//   3) بيغيّر teacher كمان في الحاجات اللي بتخزّنه مكرر (denormalized) وتخص
//      نفس الكورسات بس: announcements / meetings / messages — عشان صلاحيات
//      التعديل والرسائل والمحاضرات تفضل شغالة مع المالك الجديد.
//   4) بيحفظ نسخة احتياطية (ملف JSON فيه _id كل كورس اتنقل) قبل أي تعديل،
//      عشان تقدر ترجّع لو احتجت (--revert بالملف ده).
//
// ⚠️ الافتراضي "تجربة بس" (dry-run): بيعرض اللي هيتغيّر من غير ما يعدّل حاجة.
// التعديل الفعلي بيحصل بس لما تضيف --apply.
//
// طريقة التشغيل (من جذر المشروع):
//
//   1) تجربة (من غير تعديل):
//      MONGO_URI="mongodb+srv://..." node app/scripts/transfer-courses-between-admins.js
//
//   2) تنفيذ فعلي:
//      MONGO_URI="mongodb+srv://..." node app/scripts/transfer-courses-between-admins.js --apply
//
//   3) رجوع عن النقل (بالملف الاحتياطي اللي اتعمل في الخطوة 2):
//      MONGO_URI="mongodb+srv://..." node app/scripts/transfer-courses-between-admins.js --revert transfer-backup-XXXX.json
//
//   إيميلات تانية (اختياري):
//      --from other@example.com --to someone@example.com
//
// PowerShell: $env:MONGO_URI="mongodb+srv://..."; node app/scripts/transfer-courses-between-admins.js

const fs = require("fs");
const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const FROM_EMAIL = arg("--from", "hanynan8@gmail.com").trim().toLowerCase();
const TO_EMAIL = arg("--to", "info@edumaster365.com").trim().toLowerCase();
const APPLY = process.argv.includes("--apply");
const REVERT_FILE = arg("--revert", null);

// الكولكشنز اللي بتخزّن teacher مكرر وليها حقل course
const DENORMALIZED = ["announcements", "meetings", "messages"];

async function findUserByEmail(db, email) {
  return db.collection("auth").findOne({ email }, { projection: { name: 1, email: 1, role: 1 } });
}

async function revert(db) {
  const backup = JSON.parse(fs.readFileSync(REVERT_FILE, "utf8"));
  const courseIds = backup.courseIds.map((id) => new ObjectId(id));
  const fromId = new ObjectId(backup.fromId);
  const toId = new ObjectId(backup.toId);

  console.log(`↩️  رجوع عن النقل: ${courseIds.length} كورس من ${backup.toEmail} إلى ${backup.fromEmail}`);
  if (!APPLY) console.log("   (تجربة فقط — أضف --apply للتنفيذ الفعلي)\n");

  const filter = { _id: { $in: courseIds }, teacher: toId };
  const n = await db.collection("courses_landing").countDocuments(filter);
  console.log(`   courses_landing: ${n} كورس هيرجع`);
  if (APPLY) await db.collection("courses_landing").updateMany(filter, { $set: { teacher: fromId } });

  for (const name of DENORMALIZED) {
    const f = { course: { $in: courseIds }, teacher: toId };
    const c = await db.collection(name).countDocuments(f);
    console.log(`   ${name}: ${c}`);
    if (APPLY && c) await db.collection(name).updateMany(f, { $set: { teacher: fromId } });
  }
  console.log(APPLY ? "\n✅ تم الرجوع." : "\nℹ️ ده كان dry-run بس.");
}

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول، مثلاً:");
    console.error('   MONGO_URI="mongodb+srv://..." node app/scripts/transfer-courses-between-admins.js');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log(`📦 قاعدة البيانات: ${db.databaseName}\n`);

  try {
    if (REVERT_FILE) return await revert(db);

    const from = await findUserByEmail(db, FROM_EMAIL);
    const to = await findUserByEmail(db, TO_EMAIL);

    if (!from) throw new Error(`مفيش حساب بالإيميل ${FROM_EMAIL} في كولكشن auth`);
    if (!to) {
      throw new Error(
        `مفيش حساب بالإيميل ${TO_EMAIL} في كولكشن auth — سجّل الحساب الأول (ويتحط role=admin) وبعدين شغّل السكريبت.`
      );
    }
    if (String(from._id) === String(to._id)) throw new Error("الحسابين نفس الحساب.");

    console.log(`من:  ${from.name || "-"} <${from.email}>  role=${from.role}  _id=${from._id}`);
    console.log(`إلى: ${to.name || "-"} <${to.email}>  role=${to.role}  _id=${to._id}\n`);

    if (to.role !== "admin") {
      console.log(`⚠️ تنبيه: حساب ${to.email} role بتاعه "${to.role}" مش "admin". لو عايزه أدمن، غيّره من لوحة الأدمن قبل/بعد النقل.\n`);
    }

    const courses = await db
      .collection("courses_landing")
      .find({ teacher: from._id }, { projection: { title: 1, status: 1 } })
      .toArray();

    console.log(`📚 عدد الكورسات اللي هتتنقل: ${courses.length}`);
    courses.forEach((c, i) => console.log(`   ${i + 1}. ${c.title || "(بدون عنوان)"}  —  ${c.status}  —  ${c._id}`));

    if (courses.length === 0) {
      console.log("\nℹ️ مفيش كورسات للنقل.");
      return;
    }

    const courseIds = courses.map((c) => c._id);
    console.log("\nالمتأثر كمان (teacher مكرر لنفس الكورسات):");
    for (const name of DENORMALIZED) {
      const n = await db.collection(name).countDocuments({ course: { $in: courseIds }, teacher: from._id });
      console.log(`   ${name}: ${n}`);
    }

    if (!APPLY) {
      console.log("\nℹ️ ده dry-run — مفيش حاجة اتعدّلت. أضف --apply للتنفيذ الفعلي.");
      return;
    }

    const backupFile = `transfer-backup-${Date.now()}.json`;
    fs.writeFileSync(
      backupFile,
      JSON.stringify(
        {
          fromEmail: from.email,
          toEmail: to.email,
          fromId: String(from._id),
          toId: String(to._id),
          courseIds: courseIds.map(String),
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
    console.log(`\n💾 نسخة احتياطية: ${backupFile}`);

    const res = await db
      .collection("courses_landing")
      .updateMany({ _id: { $in: courseIds }, teacher: from._id }, { $set: { teacher: to._id } });
    console.log(`✅ courses_landing: اتعدّل ${res.modifiedCount}`);

    for (const name of DENORMALIZED) {
      const r = await db
        .collection(name)
        .updateMany({ course: { $in: courseIds }, teacher: from._id }, { $set: { teacher: to._id } });
      console.log(`✅ ${name}: اتعدّل ${r.modifiedCount}`);
    }

    console.log(`\n🎉 خلص. للرجوع: node app/scripts/transfer-courses-between-admins.js --revert ${backupFile} --apply`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});