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

    // ترتيب العرض في الصفحة العامة (الأصغر يظهر الأول)
    order: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export function getCategoryModel() {
  return getOrCreateModel("category", categorySchema, "categories");
}