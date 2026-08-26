// app/scripts/migrate-price-to-prices.js
//
// السبب اللي كل الكورسات وخطط الاشتراك بتظهر "مجانية" في الموقع:
//
// المشروع كان زمان بيسجّل سعر واحد وعملة واحدة لكل كورس/خطة (حقلين
// price/currency). بعد التحويل لدعم 3 عملات (EGP/USD/EUR)، الموديلات
// (Course.js وMembershipPlan.js) اتغيرت لحقل واحد اسمه prices بس
// (map فيه الـ 3 عملات) — وده صح.
//
// المشكلة: فورم المدرس (CourseFormModal.jsx) وفورم الأدمن
// (membershipPlansPanel.jsx) فضلوا لفترة بيبعتوا الحقل القديم "price"
// (رقم واحد) للـ API، بينما الـ API (app/api/courses/route.js،
// app/api/membership-plans/route.js) بقى بيتوقع "prices" (object). أي
// حقل زيادة زي "price" مش موجود في الـ schema، الـ API كان بيتجاهله
// بصمت ويحفظ sanitizePrices(undefined) اللي بترجع {EGP:0, USD:0, EUR:0}
// — يعني أي كورس أو خطة اتعمل أو اتعدّل من الفورم القديم كان بيتحفظ
// بسعر صفر فعليًا في الداتابيز، حتى لو المدرس/الأدمن كتب رقم في الفورم.
// ده اللي خلى كل حاجة تظهر "Free" في الواجهة (المنطق بيشوف السعر = 0
// فيعتبرها مجانية).
//
// الفورمين اتصلحوا دلوقتي (بيبعتوا prices: {EGP,USD,EUR} صح) — أي حفظ
// جديد من دلوقتي هيشتغل تمام. لكن الكورسات/الخطط اللي *اتحفظت قبل
// الإصلاح* لسه فيها prices = صفر في الداتابيز، ومفيش طريقة تلقائية
// تعرف السعر "الصح" اللي المفروض يتحط، لأن القيمة الأصلية اتفقدت وقت
// الحفظ (مكانتش اتسجلت في الداتابيز خالص من الأساس).
//
// السكريبت ده بيعمل حاجتين:
//   1) بيدوّر على أي كورس/خطة لسه معاها حقل "price" (رقم) قديم متسجل
//      فعليًا في المستند نفسه في MongoDB (من نسخة أقدم من الكود، قبل ما
//      الموديل يتغير لـ prices) — لو لقى، بيحوّل القيمة دي لـ prices
//      (بيحطها في العملة اللي كانت متسجلة، والعملتين التانيين صفر) —
//      استرجاع حقيقي للبيانات القديمة.
//   2) بيطبع تقرير (report) بكل الكورسات/الخطط اللي prices فيها لسه
//      كله أصفار وهي مش مجانية فعليًا (isFree=false / billingCycle != free)
//      — دول محتاجين المدرس/الأدمن يدخل يحط لهم سعر يدوي بنفسه من
//      اللوحة (مفيش قيمة تلقائية ممكن نسترجعها لهم، لأنها ماكانتش
//      متسجلة في الداتابيز أصلاً).
//
// طريقة التشغيل (من جذر المشروع):
//   $env:MONGO_URI="mongodb+srv://..."   (PowerShell)
//   node app/scripts/migrate-price-to-prices.js
//
// آمن يتشغّل أكتر من مرة (idempotent) — أي مستند اتصلح مرة، تاني مرة
// مش هيتغير لأنه مبقاش فيه حقل "price" قديم أصلاً.

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;
const SUPPORTED_CURRENCIES = ["EGP", "USD", "EUR"];

async function migrateCollection(db, collectionName, freeCheck) {
  const collection = db.collection(collectionName);
  const docs = await collection.find({}).toArray();

  let recovered = 0;
  let stillZero = [];

  for (const doc of docs) {
    const hasLegacyPrice = typeof doc.price === "number" && doc.price > 0;
    const currentPrices = doc.prices || {};
    const pricesAreAllZero = SUPPORTED_CURRENCIES.every((c) => !currentPrices[c]);

    if (hasLegacyPrice && pricesAreAllZero) {
      // استرجاع القيمة القديمة: نحطها في العملة القديمة لو متسجلة، وإلا EGP
      // (كانت هي الافتراضي القديم في كل المشروع).
      const legacyCurrency = SUPPORTED_CURRENCIES.includes(doc.currency) ? doc.currency : "EGP";
      const newPrices = { EGP: 0, USD: 0, EUR: 0 };
      newPrices[legacyCurrency] = doc.price;

      await collection.updateOne(
        { _id: doc._id },
        {
          $set: { prices: newPrices },
          $unset: { price: "", currency: "" },
        }
      );
      recovered++;
      continue;
    }

    // مفيش حقل price قديم نسترجع منه، وبردو الأسعار كلها صفر — لازم فحص
    // يدوي لو الكورس/الخطة دي المفروض تكون مدفوعة فعلاً.
    if (pricesAreAllZero && !freeCheck(doc)) {
      stillZero.push({ id: doc._id.toString(), name: doc.title || doc.name || "(بدون اسم)" });
    }
  }

  return { total: docs.length, recovered, stillZero };
}

async function main() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI env var مش متظبطة. مثال:\n  $env:MONGO_URI="mongodb+srv://..."');
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db();

    console.log("== كورسات (courses_landing) ==");
    const coursesResult = await migrateCollection(
      db,
      "courses_landing",
      (doc) => doc.isFree === true
    );
    console.log(`  إجمالي: ${coursesResult.total}`);
    console.log(`  ✅ تم استرجاع سعرها من حقل قديم: ${coursesResult.recovered}`);
    if (coursesResult.stillZero.length) {
      console.log(`  ⚠️ محتاجين إدخال سعر يدوي من لوحة المدرس (${coursesResult.stillZero.length}):`);
      coursesResult.stillZero.forEach((c) => console.log(`     - ${c.name} (${c.id})`));
    }

    console.log("\n== خطط الاشتراك (membership_plans) ==");
    const plansResult = await migrateCollection(
      db,
      "membership_plans",
      (doc) => doc.billingCycle === "free"
    );
    console.log(`  إجمالي: ${plansResult.total}`);
    console.log(`  ✅ تم استرجاع سعرها من حقل قديم: ${plansResult.recovered}`);
    if (plansResult.stillZero.length) {
      console.log(`  ⚠️ محتاجين إدخال سعر يدوي من لوحة الأدمن (${plansResult.stillZero.length}):`);
      plansResult.stillZero.forEach((p) => console.log(`     - ${p.name} (${p.id})`));
    }

    console.log("\nخلص. لو فيه عناصر في قايمة \"محتاجين إدخال سعر يدوي\"، ادخل لوحة المدرس/الأدمن وحط لهم سعر من الفورم الجديد (بيشتغل صح دلوقتي) واحفظ.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("فشل السكريبت:", err);
  process.exit(1);
});