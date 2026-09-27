// app/scripts/seed-language-subcategories.js
//
// المشكلة: صفحة الكورسات والهوم بيفلتروا فعليًا على ساب-تصنيفات حقيقية
// تابعة لتصنيف "Language" (شوف app/(pages)/courses/page.jsx و
// app/components/CoursesSection.jsx — الفلتر بيستخدم course.language
// المتحسوب تلقائيًا من الساب-تصنيف، شوف resolveCourseSubcategory في
// app/lib/courseHelpers.js). النظام ده حقيقي بالكامل وموجود في الكود من
// زمان — لكن لسه محتاج الداتا الفعلية في الداتابيز نفسها: تصنيف رئيسي
// اسمه "Language" + 3 ساب-تصنيفات تحته (عربي/إنجليزي/إسباني). من غير
// الداتا دي، فورم "كورس جديد" بتاع المدرس مش هيعرض أي قايمة ساب-تصنيف
// خالص (شوف hasSubcategories في app/teacher/components/CourseFormModal.jsx
// — بتبقى false لو مفيش ساب-تصنيفات فعلية في الداتابيز).
//
// السكريبت ده بيعمل بالظبط كده:
//   1) يدور على تصنيف رئيسي بـ slug="language" — لو مش موجود يعمله.
//   2) يعمل 3 ساب-تصنيفات تحته بالـ slugs "ar"/"en"/"es" بالظبط — لازم
//      الـ slugs دي بالظبط عشان autoLanguage في resolveCourseSubcategory
//      يطابق قيم الفلتر في الفرونت إند (courseLanguageOptions: es/en/ar).
//   3) idempotent بالكامل: لو شغّلته أكتر من مرة، مش هيعمل تكرار — بيتحقق
//      بالـ slug الأول وبيسيب أي حاجة موجودة زي ما هي (مبيعملش overwrite
//      لاسم/وصف اتعدّل يدوي من لوحة الأدمن بعد كده).
//
// طريقة التشغيل (من جذر المشروع):
//   MONGO_URI="mongodb+srv://..." node app/scripts/seed-language-subcategories.js
//
// PowerShell:
//   $env:MONGO_URI="mongodb+srv://..."; node app/scripts/seed-language-subcategories.js

const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

// نفس بنية app/lib/models/Category.js بالظبط (منسوخة هنا عشان السكريبت
// يفضل مستقل شغّال بـ CommonJS من غير ما يعتمد على alias "@/..." بتاع
// Next.js اللي مش متاح في سكريبت مستقل بره الـ app).
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

const LANGUAGE_CATEGORY = {
  slug: "language",
  name: "Language",
  order: 0,
  icon: "Languages",
  i18n: {
    ar: { name: "لغات", description: "دورات تعليم اللغات" },
    en: { name: "Language", description: "Language learning courses" },
    es: { name: "Idiomas", description: "Cursos de idiomas" },
  },
};

// ⚠️ الـ slug هنا لازم يفضل بالظبط "ar"/"en"/"es" — ده مش اختياري، ده
// اللي بيخلي autoLanguage في resolveCourseSubcategory (app/lib/courseHelpers.js)
// وفلتر اللغة في courses/page.jsx و CoursesSection.jsx يطابقوا بعض صح.
const SUBCATEGORIES = [
  {
    slug: "ar",
    name: "Arabic",
    order: 1,
    i18n: {
      ar: { name: "عربي" },
      en: { name: "Arabic" },
      es: { name: "Árabe" },
    },
  },
  {
    slug: "en",
    name: "English",
    order: 2,
    i18n: {
      ar: { name: "إنجليزي" },
      en: { name: "English" },
      es: { name: "Inglés" },
    },
  },
  {
    slug: "es",
    name: "Spanish",
    order: 3,
    i18n: {
      ar: { name: "إسباني" },
      en: { name: "Spanish" },
      es: { name: "Español" },
    },
  },
];

async function main() {
  if (!MONGO_URI) {
    console.error('❌ حط MONGO_URI الأول، مثلاً:');
    console.error('   MONGO_URI="mongodb+srv://..." node app/scripts/seed-language-subcategories.js');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ اتوصّل بالداتابيز");

  const Category = getCategoryModel();

  // 1) التصنيف الرئيسي "Language"
  let languageCat = await Category.findOne({ slug: LANGUAGE_CATEGORY.slug });
  if (languageCat) {
    console.log(`↷ تصنيف "Language" موجود بالفعل (id=${languageCat._id}) — مش هيتعمل تاني.`);
  } else {
    languageCat = await Category.create({
      name: LANGUAGE_CATEGORY.name,
      slug: LANGUAGE_CATEGORY.slug,
      order: LANGUAGE_CATEGORY.order,
      icon: LANGUAGE_CATEGORY.icon,
      i18n: LANGUAGE_CATEGORY.i18n,
      parent: null,
      isActive: true,
    });
    console.log(`✅ اتعمل تصنيف "Language" جديد (id=${languageCat._id})`);
  }

  // 2) الساب-تصنيفات (عربي/إنجليزي/إسباني) تحته
  for (const sub of SUBCATEGORIES) {
    const existing = await Category.findOne({ slug: sub.slug });

    if (existing) {
      if (String(existing.parent || "") === String(languageCat._id)) {
        console.log(`↷ ساب-تصنيف "${sub.name}" (slug="${sub.slug}") موجود بالفعل وتابع لـ Language — مش هيتعمل تاني.`);
      } else {
        // 🔒 الـ slug ده مستخدم بالفعل لتصنيف تاني مش تابع لـ Language —
        // بنوقف ونحذّر بدل ما نعمل تعديل ممكن يبوّظ حاجة تانية في المشروع
        // (الـ slug unique على مستوى الداتابيز كله، مش بس تحت نفس الأب).
        console.error(
          `❌ فيه تصنيف تاني بالفعل بنفس الـ slug="${sub.slug}" (id=${existing._id}, name="${existing.name}") ` +
            `مش تابع لـ "Language". غيّر الـ slug في SUBCATEGORIES فوق أو راجع التصنيف ده يدوي في لوحة الأدمن.`
        );
      }
      continue;
    }

    const created = await Category.create({
      name: sub.name,
      slug: sub.slug,
      order: sub.order,
      i18n: sub.i18n,
      parent: languageCat._id,
      isActive: true,
    });
    console.log(`✅ اتعمل ساب-تصنيف "${sub.name}" (slug="${sub.slug}", id=${created._id}) تابع لـ Language`);
  }

  console.log("\n🎉 خلصنا. دلوقتي:");
  console.log('   - فورم "كورس جديد" عند المدرس هيعرض قايمة "الساب تصنيف" لما يختار تصنيف "Language".');
  console.log('   - لوحة الأدمن (تصنيفات الكورسات) هتعرض Language وتحته الـ 3 ساب-تصنيفات.');
  console.log('   - فلتر اللغة (عربي/إنجليزي/إسباني) في صفحة الكورسات والهوم هيشتغل فعليًا على كورسات حقيقية.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err);
  process.exit(1);
});