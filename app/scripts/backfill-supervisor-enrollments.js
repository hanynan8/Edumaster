// app/scripts/backfill-supervisor-enrollments.js
//
// يسجّل المدرّس المشرف (Supervising teacher) مجانًا في كل الكورسات الموجودة
// فعلًا قبل ما الميزة دي تتفعّل (الكورسات الجديدة بتتسجّل تلقائيًا من
// POST /api/courses). مصدر التسجيل: "supervisor_grant" — مش بيتحسب طالب
// (مابيزوّدش studentsCount ومابيظهرش في أداء الطلاب).
//
// - idempotent: اللي عنده enrollment بأي مصدر بيتساب زي ما هو، واللي
//   enrollment بتاعه cancelled بيتفعّل تاني.
// - الافتراضي dry-run (بيطبع بس اللي هيتعمل). مرّر --apply للتنفيذ الفعلي.
//
// التشغيل (من جذر المشروع):
//   node app/scripts/backfill-supervisor-enrollments.js          (معاينة)
//   node app/scripts/backfill-supervisor-enrollments.js --apply  (تنفيذ)
// (لو MONGO_URI مش متعرّف في الـ shell بيقراه من .env.local / .env تلقائيًا)

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

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

async function main() {
  const apply = process.argv.includes("--apply");
  const uri = loadEnvUri();
  if (!uri) {
    console.error("❌ MONGO_URI مش موجود (لا في الـ shell ولا في .env.local/.env)");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db();
    const courses = db.collection("courses_landing");
    const enrollments = db.collection("enrollments");

    // الكورسات اللي ليها مدرّس مشرف (المنشورة/المعلّقة/المسودة — كلها).
    const cursor = courses.find({ teacher: { $exists: true, $ne: null } }, { projection: { teacher: 1, title: 1 } });

    let created = 0;
    let reactivated = 0;
    let skipped = 0;

    for await (const course of cursor) {
      const existing = await enrollments.findOne({ user: course.teacher, course: course._id });
      if (existing && existing.status !== "cancelled") {
        skipped++;
        continue;
      }
      if (existing) {
        reactivated++;
        console.log(`♻️  تفعيل تاني: ${course.title} (${course._id})`);
        if (apply) {
          await enrollments.updateOne(
            { _id: existing._id },
            { $set: { status: "active", source: "supervisor_grant", updatedAt: new Date() } }
          );
        }
        continue;
      }
      created++;
      console.log(`➕ تسجيل جديد: ${course.title} (${course._id})`);
      if (apply) {
        await enrollments.insertOne({
          user: course.teacher,
          course: course._id,
          source: "supervisor_grant",
          status: "active",
          grantedBy: null,
          progressPercent: 0,
          completedLessons: [],
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    console.log(
      `\n${apply ? "✅ تم" : "👀 معاينة فقط (مرّر --apply للتنفيذ)"} — جديد: ${created}، إعادة تفعيل: ${reactivated}، موجود أصلًا: ${skipped}`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
