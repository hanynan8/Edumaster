// scripts/migrate-hash-passwords.js
//
// سكريبت لمرة واحدة: بيدور على أي حساب قديم في كولكشن "auth" لسه باسورده
// plain text، ويشفّره فورًا. مش لازم تشغله (النظام بيعمل نفس الحاجة تلقائيًا
// أول ما صاحب الحساب يعمل login)، لكنه مفيد لو عايز تأمن كل الحسابات فورًا
// حتى اللي هتفضل معطلة/محدش هيدخل بيها قريب.
//
// طريقة التشغيل (من جذر المشروع):
//   MONGO_URI="mongodb+srv://..." node scripts/migrate-hash-passwords.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase();

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول: MONGO_URI=... node scripts/migrate-hash-passwords.js");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const AuthModel = mongoose.models.Model_auth || mongoose.model("Model_auth", schema, "auth");

  const users = await AuthModel.find({});
  console.log(`لقيت ${users.length} حساب. جاري الفحص...`);

  let hashedCount = 0;
  let roleCount = 0;

  for (const user of users) {
    let changed = false;

    if (user.password && !isBcryptHash(user.password)) {
      user.password = await bcrypt.hash(user.password, 12);
      changed = true;
      hashedCount++;
    }

    if (!user.role) {
      user.role = user.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "student";
      changed = true;
      roleCount++;
    }

    if (changed) {
      await user.save();
      console.log(`  ✓ ${user.email || user.name || user._id} تم تحديثه`);
    }
  }

  console.log(`\n✅ خلصت. باسوردات اتشفرت: ${hashedCount} — أدوار اتحددت: ${roleCount}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err);
  process.exit(1);
});
