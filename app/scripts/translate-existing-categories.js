// app/scripts/translate-existing-categories.js
//
// بيدور على كل التصنيفات (والساب-تصنيفات) الموجودة فعليًا في الداتابيز،
// وأي تصنيف ناقصه ترجمة (ar/en/es) في حقل i18n بتاعه، بيترجمله الاسم
// (والوصف لو موجود) تلقائيًا ويحفظها في نفس التصنيف — بنفس شكل i18n
// المستخدم في كل حتة تانية في المشروع (شوف app/lib/models/Category.js).
//
// الترجمة بتحصل بمكتبة مجانية (Google Translate غير رسمي، مفيهاش أي
// API key مطلوب) — يعني لازم تتأكد إن الجهاز اللي هتشغّل عليه السكريبت
// متصل بالإنترنت عادي.
//
// 🔒 آمن ومش هيبوّظ حاجة موجودة: أي لغة عندها ترجمة متسجلة بالفعل
// (i18n[lang].name مش فاضي) بيتسابها زي ما هي تمامًا ومبيترجمهاش تاني —
// إلا لو حطيت --force (شوف تحت). التصنيف اللي كل ترجماته الثلاثة موجودة
// أصلًا بيتخطّاه بالكامل من غير أي API calls زيادة.
//
// التثبيت (مرة واحدة بس، من جذر المشروع):
//   npm install @vitalets/google-translate-api --save-dev
//
// طريقة التشغيل (من جذر المشروع):
//
//   1) معاينة بس من غير أي تعديل فعلي في الداتابيز (مستحسن تشغّله الأول):
//      MONGO_URI="mongodb+srv://..." node app/scripts/translate-existing-categories.js --dry-run
//
//   2) الترجمة والحفظ الفعلي (بيسيب أي لغة متترجمة بالفعل زي ما هي):
//      MONGO_URI="mongodb+srv://..." node app/scripts/translate-existing-categories.js
//
//   3) إعادة ترجمة كل حاجة من الصفر حتى لو مترجمة بالفعل (بيدهس القديم):
//      MONGO_URI="mongodb+srv://..." node app/scripts/translate-existing-categories.js --force
//
// PowerShell: استبدل السطر بـ
//   $env:MONGO_URI="mongodb+srv://..."; node app/scripts/translate-existing-categories.js --dry-run

const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const SUPPORTED_LANGS = ["ar", "en", "es"];
const LANG_NAMES = { ar: "Arabic", en: "English", es: "Spanish" };

// نفس بنية app/lib/models/Category.js بالظبط (منسوخة هنا عشان السكريبت
// يفضل مستقل شغّال بـ CommonJS من غير alias "@/..." بتاع Next.js).
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: null },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Model_category", default: null },
    i18n: {
      type: Map,
      of: new mongoose.Schema(
        { name: { type: String, default: "" }, description: { type: String, default: "" } },
        { _id: false }
      ),
      default: {},
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

function getCategoryModel() {
  return mongoose.models.Model_category || mongoose.model("Model_category", categorySchema, "categories");
}

// تأخير بسيط بين نداءات الترجمة عشان مانضربش الخدمة المجانية بسرعة عالية
// جدًا (ممكن تحظرنا مؤقتًا لو عملنا كذا نداء في نفس اللحظة).
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// بيترجم نص واحد للغة معينة، مع إعادة محاولة بسيطة لو فشل (الخدمة
// المجانية أحيانًا بترفض طلب عشوائي من غير سبب واضح).
async function translateText(translate, text, targetLang, attempt = 1) {
  if (!text || !text.trim()) return "";
  try {
    const res = await translate(text, { to: targetLang });
    return res.text;
  } catch (err) {
    if (attempt < 3) {
      await sleep(800 * attempt);
      return translateText(translate, text, targetLang, attempt + 1);
    }
    console.warn(`   ⚠️ فشلت ترجمة "${text}" لـ ${targetLang} بعد 3 محاولات (${err.message}) — هتتسيب فاضية.`);
    return "";
  }
}

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول، مثلاً:");
    console.error('   MONGO_URI="mongodb+srv://..." node app/scripts/translate-existing-categories.js --dry-run');
    process.exit(1);
  }

  // المكتبة (@vitalets/google-translate-api) ESM-only في أحدث نسخها، فبنعملها
  // import ديناميكي بدل require عادي عشان تشتغل جوه سكريبت CommonJS عادي.
  let translate;
  try {
    ({ translate } = await import("@vitalets/google-translate-api"));
  } catch (err) {
    console.error('❌ المكتبة "@vitalets/google-translate-api" مش متثبتة.');
    console.error("   ثبّتها الأول بالأمر ده وبعدين جرّب تاني:");
    console.error("   npm install @vitalets/google-translate-api --save-dev");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ اتوصّل بالداتابيز");
  if (DRY_RUN) console.log("👀 وضع المعاينة (--dry-run) — مش هيتحفظ أي تعديل فعلي.\n");
  if (FORCE) console.log("⚠️ وضع --force — هيدهس أي ترجمة موجودة بالفعل ويعملها تاني.\n");

  const Category = getCategoryModel();
  const categories = await Category.find({}).sort({ parent: 1, order: 1 });

  if (categories.length === 0) {
    console.log("مفيش أي تصنيفات في الداتابيز أصلًا.");
    await mongoose.disconnect();
    return;
  }

  console.log(`🔎 لقيت ${categories.length} تصنيف/ساب-تصنيف. بنبدأ...\n`);

  let translatedCount = 0;
  let skippedCount = 0;

  for (const cat of categories) {
    const currentI18n = cat.i18n instanceof Map ? Object.fromEntries(cat.i18n) : cat.i18n || {};

    // اللغات اللي محتاجة ترجمة فعليًا (فاضية، أو --force مفعّل)
    const langsNeeded = SUPPORTED_LANGS.filter((lang) => FORCE || !currentI18n[lang]?.name?.trim());

    if (langsNeeded.length === 0) {
      skippedCount += 1;
      console.log(`↷ "${cat.name}" (${cat.slug}) — مترجم بالكامل بالفعل، متخطّاه.`);
      continue;
    }

    const label = cat.parent ? `${cat.name} (ساب-تصنيف)` : cat.name;
    console.log(`🌐 "${label}" — بيترجم لـ: ${langsNeeded.map((l) => LANG_NAMES[l]).join(", ")}...`);

    const newI18n = { ...currentI18n };

    for (const lang of langsNeeded) {
      const name = await translateText(translate, cat.name, lang);
      await sleep(350); // مسافة بسيطة بين كل نداء والتاني

      let description = "";
      if (cat.description && cat.description.trim()) {
        description = await translateText(translate, cat.description, lang);
        await sleep(350);
      }

      newI18n[lang] = {
        name: name || currentI18n[lang]?.name || "",
        description: description || currentI18n[lang]?.description || "",
      };

      console.log(`   ${lang}: "${newI18n[lang].name}"`);
    }

    if (!DRY_RUN) {
      cat.i18n = newI18n;
      await cat.save();
    }
    translatedCount += 1;
  }

  console.log(`\n🎉 خلصنا. اتترجم ${translatedCount} تصنيف${DRY_RUN ? " (معاينة بس، مفيش حاجة اتحفظت)" : ""}, واتخطّى ${skippedCount} كان مترجم بالفعل.`);
  if (DRY_RUN) {
    console.log('لو النتيجة عجبتك، شغّل نفس الأمر من غير "--dry-run" عشان يتحفظ فعليًا.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err);
  process.exit(1);
});