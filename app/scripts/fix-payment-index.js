// app/scripts/fix-payment-index.js
//
// إصلاح لمرة واحدة، جزئين:
//   1) فهرس providerPaymentId_1: sparse بيستثني بس المستندات اللي الحقل
//      فيها *غير موجود خالص* (undefined) — مش المستندات اللي الحقل فيها
//      null صراحةً. الموديل القديم كان بيحط "default: null" فبيتسجل null
//      فعليًا في كل مستند جديد، فالفهرس مكانش بيستثنيه ➜ E11000. اتصلح في
//      app/lib/models/Payment.js (default: undefined دلوقتي)، لكن ده مش
//      بيأثر على مستندات اتعملت *قبل* التعديل.
//   2) عشان كده، السكريبت ده كمان بيشيل الحقل providerPaymentId تمامًا (مش
//      يحطه null، يشيله خالص بـ $unset) من أي payment قديم فيه null صريح —
//      عشان الفهرس يستثنيهم صح من دلوقتي.
//
// طريقة التشغيل (من جذر المشروع):
//   $env:MONGO_URI="mongodb+srv://..."   (PowerShell)
//   node app/scripts/fix-payment-index.js
//
// آمن يتشغّل أكتر من مرة.

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI env var مش متظبطة. مثال:\n  $env:MONGO_URI=\"mongodb+srv://...\"");
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db();
    const collection = db.collection("payments");

    // --- الجزء 1: الفهرس ---
    const indexes = await collection.indexes();
    const badIndex = indexes.find((idx) => idx.name === "providerPaymentId_1");

    if (badIndex && !badIndex.sparse) {
      console.log("لقيت فهرس providerPaymentId_1 من غير sparse — بيتشال دلوقتي...");
      await collection.dropIndex("providerPaymentId_1");
      console.log("✅ الفهرس اتشال، Mongoose هيعيد بناءه صح.");
    } else if (badIndex) {
      console.log("الفهرس موجود بالفعل وهو sparse بشكل صحيح — مفيش حاجة تتعمل في الفهرس.");
    } else {
      console.log("مفيش فهرس providerPaymentId_1 موجود أصلاً.");
    }

    // --- الجزء 2: تنظيف المستندات القديمة اللي فيها null صريح ---
    const result = await collection.updateMany(
      { providerPaymentId: null },
      { $unset: { providerPaymentId: "" } }
    );
    console.log(
      `✅ اتشال الحقل providerPaymentId من ${result.modifiedCount} مستند (كان متحط فيهم null صراحةً).`
    );
  } finally {
    await client.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ حصل خطأ:", err.message);
    process.exit(1);
  });