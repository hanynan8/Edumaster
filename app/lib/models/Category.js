// app/lib/models/Category.js
//
// تصنيفات الكورسات (مثال: برمجة، تسويق، لغات...). كل كورس بينتمي لتصنيف واحد.
// الأدمن هو الوحيد المسموح له بإنشاء/تعديل/حذف تصنيف (هيتحقق منه في الـ API route
// عبر rbac.js، مش هنا في الموديل).

import mongoose from "mongoose";
import { getOrCreateModel } from "./_helpers";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // slug بيتستخدم في الروابط (/courses?category=web-development) بدل الـ id
    // الخام، وبيتعمله lowercase تلقائي عشان يفضل متسق دايمًا.
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: { type: String, default: "" },
    icon: { type: String, default: null }, // اسم أيقونة (lucide-react) أو رابط صورة

    // 🆕 ساب-تصنيف حقيقي: لو موجودة، يبقى التصنيف ده "تحت-تصنيف" (subcategory)
    // تابع لتصنيف رئيسي تاني (مثال: "عربي/إنجليزي/إسباني" تحت تصنيف "Language").
    // null = تصنيف رئيسي (top-level). بنسمح بمستوى واحد بس (تصنيف رئيسي ← ساب
    // تصنيف)، يعني الساب-تصنيف نفسه ميقدرش يكون ليه هو كمان ساب-تصنيفات —
    // بيتحقق من كده في الـ API (routes)، مش هنا في الموديل.
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_category",
      default: null,
    },

    // 🆕 اسم/وصف التصنيف بلغات تانية (ar/en/es). "name"/"description" برّه
    // بيفضلوا الـ fallback الافتراضي. نفس فكرة i18n بتاعة Course.js بالظبط.
    i18n: {
      type: Map,
      of: new mongoose.Schema(
        { name: { type: String, default: "" }, description: { type: String, default: "" } },
        { _id: false }
      ),
      default: {},
    },

    // ترتيب العرض في الصفحة العامة (الأصغر يظهر الأول)
    order: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// فهرسة تسريع جلب "ساب-تصنيفات تصنيف معيّن" (شوف /api/categories?parent=)
categorySchema.index({ parent: 1, order: 1 });

export function getCategoryModel() {
  return getOrCreateModel("category", categorySchema, "categories");
}