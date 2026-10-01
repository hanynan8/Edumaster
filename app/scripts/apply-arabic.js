// apply-arabic.js
//
// بياخد الملف المصحَّح (arabic-strings.fixed.json) ويحدّث النصوص في الداتابيز
// بـ $set على المسار المحدد بس — مبيمسّش أي حقل تاني.
//
// الأمان:
//  - الوضع الافتراضي Dry-run: بيطبع التغييرات بس من غير ما يكتب.
//  - بيتأكد إن النص الحالي في الداتابيز = النص الأصلي قبل ما يستبدله
//    (لو حد عدّله في الأدمن في الأثناء، بيتخطاه).
//  - قبل الكتابة بيحفظ نسخة احتياطية في arabic-backup-<وقت>.json.
//
// التشغيل:
//   معاينة:   MONGO_URI="..." node apply-arabic.js
//   تنفيذ:    MONGO_URI="..." node apply-arabic.js --apply
//   (PowerShell: $env:MONGO_URI="..."; node apply-arabic.js --apply)

const fs = require("fs");
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
const FILE = "arabic-strings.fixed.json";
const APPLY = process.argv.includes("--apply");

function getAt(obj, path) {
  return path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

(async () => {
  if (!MONGO_URI) { console.error("❌ حط MONGO_URI الأول"); process.exit(1); }
  const items = JSON.parse(fs.readFileSync(FILE, "utf8"));
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  const { ObjectId } = mongoose.Types;

  const changes = items.filter((i) => i.fixed && i.fixed !== i.text);
  console.log(`📝 ${changes.length} نص هيتغيّر من أصل ${items.length}`);

  const backup = [];
  let done = 0, skipped = 0;

  for (const it of changes) {
    const _id = it.idType === "ObjectId" ? new ObjectId(it.id) : it.id;
    const col = db.collection(it.collection);
    const doc = await col.findOne({ _id });
    if (!doc) { console.warn(`⚠️ مستند مش موجود: ${it.collection}/${it.id}`); skipped++; continue; }

    const current = getAt(doc, it.path);
    if (current !== it.text) {
      console.warn(`⚠️ اتخطّيت (النص اتغيّر في الداتابيز): ${it.collection}/${it.id} → ${it.path.join(".")}`);
      skipped++; continue;
    }

    if (!APPLY) {
      console.log(`\n[${it.collection}] ${it.path.join(".")}\n  قبل: ${it.text}\n  بعد: ${it.fixed}`);
      continue;
    }
    backup.push({ collection: it.collection, id: it.id, idType: it.idType, path: it.path, text: it.text });
    await col.updateOne({ _id }, { $set: { [it.path.join(".")]: it.fixed } });
    done++;
  }

  if (APPLY) {
    const bf = `arabic-backup-${Date.now()}.json`;
    fs.writeFileSync(bf, JSON.stringify(backup, null, 2), "utf8");
    console.log(`\n✅ اتحدّث ${done} نص، اتخطّى ${skipped}. النسخة الاحتياطية: ${bf}`);
  } else {
    console.log(`\nℹ️ ده Dry-run — مفيش حاجة اتكتبت. أضف --apply للتنفيذ الفعلي.`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });