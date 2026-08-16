// app/lib/models/Course.js
//
// الكورس نفسه (بدون محتوى الـ Sections/Lessons — دي في موديلات منفصلة،
// شوف Section.js و Lesson.js). التقسيم ده مقصود: كورس ممكن يبقى فيه عشرات
// الـ lessons، وتحميل الكورس كله (مع كل محتواه) في كل مرة بيتطلب فيها بيانات
// بسيطة زي العنوان والسعر هيبقى تقيل وغير ضروري.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const LANGS = ["ar", "en", "es"];

// 🆕 محتوى مترجم لكل لغة مدعومة (عربي/إنجليزي/إسباني). الحقول الأساسية
// (title, shortDescription, description, requirements, outcomes) برّه i18n
// بتفضل موجودة كـ "نسخة افتراضية" — بتتحدث تلقائيًا من لغة الكورس الأساسية
// (language) وقت الحفظ، وبتستخدم في البحث النصي ($text) وأي مكان قديم لسه
// بيقرا course.title مباشرة من غير ما يعرف عن i18n. أي كورس جديد (بما فيهم
// اللي مدرس هيضيفه دلوقتي) بيقدر يتعمل بنفس البنية دي بالظبط — مفيش تفرقة
// بين "كورس تسويقي" و"كورس حقيقي" بعد كده، كلهم نفس الموديل.
const localizedContentSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    shortDescription: { type: String, default: "", maxlength: 300 },
    description: { type: String, default: "" },
    requirements: { type: [String], default: [] },
    outcomes: { type: [String], default: [] },
    // شهادة/اعتماد الكورس (اسمها + وصفها) — لو موجودة بتتعرض في صفحة تفاصيل
    // الكورس. اختيارية تمامًا، مش كل كورس لازم يكون ليه شهادة.
    certification: {
      name: { type: String, default: "" },
      desc: { type: String, default: "" },
    },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

    shortDescription: { type: String, default: "", maxlength: 300 },
    description: { type: String, default: "" }, // وصف كامل (يقبل HTML/Markdown بسيط)

    thumbnail: { type: String, default: null }, // رابط صورة الغلاف

    // 🆕 نسخ لغوية إضافية (ar/en/es) — كل مفتاح فيها نفس شكل
    // localizedContentSchema. الفرونت إند بيختار النسخة المناسبة حسب لغة
    // الموقع الحالية، مع fallback للحقول الأساسية برّه i18n لو اللغة
    // المطلوبة مش متوفرة.
    i18n: {
      type: Map,
      of: localizedContentSchema,
      default: {},
    },

    // 🆕 مدة الكورس كنص حر (مثلاً "3 months" أو "6 weeks") — مفيدة قبل ما
    // يتحط محتوى فعلي (Sections/Lessons) للكورس، لأن totalDurationSeconds
    // بيفضل صفر لحد ما دروس فعلية تتضاف. لو موجودة بتتفضّل على الحساب
    // التلقائي في العرض.
    durationLabel: { type: String, default: "" },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_category",
      required: true,
    },

    // 🔒 المدرس صاحب الكورس. بنتحقق في الـ API إن اللي بيعدّل الكورس هو
    // نفس الـ teacher ده أو أدمن — مش أي مدرس تاني.
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: USER_MODEL_NAME,
      required: true,
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    language: { type: String, default: "ar" },

    // السعر بالقروش/السنت (integer) لتفادي مشاكل الفاصلة العشرية في الحسابات
    // المالية. لو الكورس مجاني isFree=true وprice بيتجاهل.
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "EGP" },
    isFree: { type: Boolean, default: false },

    requirements: { type: [String], default: [] }, // "المتطلبات المسبقة"
    outcomes: { type: [String], default: [] }, // "هتتعلم إيه"
    tags: { type: [String], default: [] },

    // draft: لسه بيتظبط ومش ظاهر للطلاب | published: ظاهر ومتاح | archived: مخفي بدون حذف
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    // 🔒 SECURITY: إحصائيات محسوبة (denormalized) لتفادي COUNT ثقيل في كل
    // طلب. بتتحدث عن طريق الكود (مش المستخدم مباشرة) عند enroll/unenroll
    // أو إضافة تقييم — مش حقول يقدر أي API عادي يعدلها من غير تحقق.
    studentsCount: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },

    // ✅ محسوبة تلقائيًا كل ما تتضاف/تتحذف Lesson (مش بيتحدث يدوي)
    totalDurationSeconds: { type: Number, default: 0 },
    totalLessonsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// فهرسة تسريع البحث والفلترة الشائعة في صفحة الكورسات العامة
courseSchema.index({ status: 1, category: 1 });
courseSchema.index({ teacher: 1 });
// 🔒 FIX: بدون language_override، MongoDB بتفترض إن أي حقل اسمه "language"
// في الـ document هو "لغة الفهرسة" (للـ stemming)، وده بيتعارض مع حقل
// "language" بتاعنا (ar/en - لغة الكورس نفسه). لغة "ar" مش من اللغات
// المدعومة لـ MongoDB text search، فأي إنشاء/تعديل كورس كان بيفشل بخطأ:
// "language override unsupported: ar". الحل: نوجّه الـ override لحقل
// وهمي مش موجود في الـ schema أصلاً، فمفيش تعارض ومفيش stemming خاص
// (بيرجع للسلوك الافتراضي: English stemming بسيط، وهو كافي للبحث النصي).
courseSchema.index(
  { title: "text", shortDescription: "text" },
  { language_override: "textIndexLanguage" }
);

export const SUPPORTED_COURSE_LANGS = LANGS;

export function getCourseModel() {
  return getOrCreateModel("course", courseSchema, "courses_landing");
}