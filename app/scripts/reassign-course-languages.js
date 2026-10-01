// app/scripts/reassign-course-languages.js
//
// الهدف: كل الكورسات الحالية تبقى تحت "إسباني" (es) بدل "عربي" (ar) — ده كان
// الافتراضي القديم للحقل course.language — ماعدا:
//   - كورسات الإنجليزي  → "en"
//   - كورسات العربي (لغير الناطقين بالعربية) → "ar"
//
// التصنيف بيتم من عنوان الكورس (كل اللغات: الأساسي + i18n) والـ slug، مش من
// الوصف (لأن وصف كورس الإسباني ممكن يذكر "Arabic and English speakers").
// الأولوية: لو العنوان فيه إسباني → es، وإلا لو فيه إنجليزي → en، وإلا لو فيه
// عربي → ar، وأي حاجة تانية → es.
//
// كمان بيربط الكورس بالساب-تصنيف المناسب (slug = es/en/ar) لو الكورس تابع
// لتصنيف "language" والساب-تصنيفات موجودة (شغّل seed-language-subcategories.js الأول).
//
// الكولكشن: "courses_landing" (نفس اللي بيستخدمه app/lib/models/Course.js).
//
// ⚠️ افتراضيًا بيعمل Dry-run (بيطبع بس من غير ما يكتب). أضف --apply للتنفيذ الفعلي.
//
//   MONGO_URI="mongodb+srv://..." node app/scripts/reassign-course-languages.js          # معاينة
//   MONGO_URI="mongodb+srv://..." node app/scripts/reassign-course-languages.js --apply  # تنفيذ
//
// PowerShell:
//   $env:MONGO_URI="mongodb+srv://..."; node app/scripts/reassign-course-languages.js --apply

const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
const APPLY = process.argv.includes("--apply");

const SPANISH_RE = /spanish|español|espanol|إسباني|اسباني|إسبانية|اسبانية|dele\b/i;
const ENGLISH_RE = /english|inglés|ingles|إنجليز|انجليز|ielts|toefl/i;
const ARABIC_RE = /arabic|árabe|arabe|العربية|عربي|عربى/i;

function titlesOf(course) {
  const out = [course.title, course.slug];
  const i18n = course.i18n || {};
  for (const lang of ["ar", "en", "es"]) {
    if (i18n[lang]?.title) out.push(i18n[lang].title);
  }
  return out.filter(Boolean).join(" | ");
}

function detectLanguage(course) {
  const text = titlesOf(course);
  if (SPANISH_RE.test(text)) return "es";
  if (ENGLISH_RE.test(text)) return "en";
  if (ARABIC_RE.test(text)) return "ar";
  return "es";
}

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول.");
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const courses = db.collection("courses_landing");
  const categories = db.collection("categories");

  // الساب-تصنيفات (slug es/en/ar) التابعة لـ "language"
  const languageCat = await categories.findOne({ slug: "language" });
  const subBySlug = {};
  if (languageCat) {
    const subs = await categories.find({ parent: languageCat._id, slug: { $in: ["es", "en", "ar"] } }).toArray();
    subs.forEach((s) => (subBySlug[s.slug] = s));
  }
  if (!languageCat || Object.keys(subBySlug).length < 3) {
    console.log('⚠️  تصنيف "language" أو ساب-تصنيفاته (es/en/ar) مش كاملين — هيتحدّث حقل language بس، من غير ربط ساب-تصنيف.');
    console.log("   شغّل seed-language-subcategories.js الأول لو عايز الربط كمان.\n");
  }

  const all = await courses.find({}).toArray();
  console.log(`${APPLY ? "🚀 تنفيذ فعلي" : "👀 معاينة (Dry-run)"} — عدد الكورسات: ${all.length}\n`);

  const counts = { es: 0, en: 0, ar: 0 };
  let changed = 0;

  for (const c of all) {
    const target = detectLanguage(c);
    counts[target] += 1;

    const set = {};
    if (c.language !== target) set.language = target;

    const isLanguageCategory =
      languageCat && String(c.category) === String(languageCat._id) && subBySlug[target];
    if (isLanguageCategory && String(c.subcategory || "") !== String(subBySlug[target]._id)) {
      set.subcategory = subBySlug[target]._id;
    }

    const note = Object.keys(set).length ? "← هيتغير" : "(زي ما هو)";
    console.log(`  [${(c.language || "-").padEnd(2)} → ${target}] ${c.title}  ${note}`);

    if (Object.keys(set).length) {
      changed += 1;
      if (APPLY) await courses.updateOne({ _id: c._id }, { $set: set });
    }
  }

  console.log(`\nالنتيجة: es=${counts.es} | en=${counts.en} | ar=${counts.ar} — كورسات اتغيّرت: ${changed}`);
  if (!APPLY) console.log("\nده معاينة بس. شغّله بـ --apply عشان يتنفّذ فعليًا.");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});