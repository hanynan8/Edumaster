// app/lib/models/_helpers.js
//
// هيلبر مشترك لكل موديلات الـ LMS (Course, Section, Lesson, Category, ...).
// بيتبع نفس منطق الكاش اللي في app/lib/mongodb.js (globalThis._mongoModels)
// عشان في dev mode مع hot-reload الموديل ميتسجلش مرتين ويبوّظ mongoose.
//
// كل موديل بيتسجل بـ "key" مختلف عن اللي في mongodb.js (auth, audit_logs)
// عشان محدش يتصادم مع التاني.

import mongoose from "mongoose";

if (!globalThis._mongoModels) globalThis._mongoModels = {};

/**
 * بيرجع الموديل من الكاش لو موجود، أو يسجله لأول مرة.
 * @param {string} key - مفتاح فريد للموديل (مثلاً "course")
 * @param {mongoose.Schema} schema
 * @param {string} collectionName - اسم الكولكشن الفعلي في MongoDB (مثلاً "courses")
 */
export function getOrCreateModel(key, schema, collectionName) {
  if (globalThis._mongoModels[key]) return globalThis._mongoModels[key];

  const modelName = `Model_${key}`;
  const Model =
    mongoose.models[modelName] || mongoose.model(modelName, schema, collectionName);
  globalThis._mongoModels[key] = Model;
  return Model;
}

// اسم موديل الـ User الحالي (مسجل في app/lib/mongodb.js باسم "Model_auth")
// بنستخدمه كـ ref في الموديلات التانية (Course.teacher, إلخ) بدل ما نكرر
// تعريف الـ User schema تاني.
export const USER_MODEL_NAME = "Model_auth";