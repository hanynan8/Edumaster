// app/lib/models/MembershipPlan.js
//
// خطط الاشتراك (Free/Basic/Standard/Pro). الأدمن هو الوحيد اللي بينشئ/يعدّل
// خطة (rbac في الـ API route). اليوزر بيرتبط بخطة عن طريق user.membership.plan
// (شوف mongodb.js) — العلاقة 1-to-1 من ناحية اليوزر، لكن خطة واحدة ممكن
// يشترك فيها آلاف المستخدمين، عشان كده الخطة نفسها collection منفصلة.

import mongoose from "mongoose";
import { getOrCreateModel } from "./_helpers";

const membershipPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },

    // 🆕 نفس منطق Course.prices بالظبط — سعر منفصل يدوي لكل عملة
    // (EGP/USD/EUR)، الأدمن هو اللي بيحطهم وقت إنشاء/تعديل الخطة. خطة مجانية
    // = billingCycle "free" (شوف تحت)، prices بتتجاهل في الحالة دي.
    prices: {
      EGP: { type: Number, default: 0, min: 0 },
      USD: { type: Number, default: 0, min: 0 },
      EUR: { type: Number, default: 0, min: 0 },
    },

    billingCycle: {
      type: String,
      enum: ["free", "monthly", "yearly"],
      default: "monthly",
    },

    features: { type: [String], default: [] }, // نقاط تسويقية تتعرض للمستخدم

    // 🔒 لو الـ array فاضي [] = الخطة دي بتفتح *كل* الكورسات (زي Pro مثلاً).
    // لو فيها عناصر = الخطة دي بتفتح الكورسات دي بس. الفحص الفعلي (هل
    // اليوزر عنده access لكورس معين) بيتم في Phase 2 عن طريق دالة مشتركة،
    // مش هنا في الموديل.
    allowedCourses: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Model_course" },
    ],

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export function getMembershipPlanModel() {
  return getOrCreateModel("membership_plan", membershipPlanSchema, "membership_plans");
}