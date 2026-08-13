// lib/mongodb.js
// نقطة اتصال واحدة بالداتابيز ونموذج (Model) واحد لكولكشن الـ auth،
// عشان كل الملفات اللي بتتعامل مع المستخدمين تستخدم نفس المنطق بدل ما يتكرر.

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if (!globalThis._mongo) globalThis._mongo = { conn: null, promise: null };
if (!globalThis._mongoModels) globalThis._mongoModels = {};

export async function connectToMongo() {
  if (globalThis._mongo.conn) return globalThis._mongo.conn;
  if (!MONGO_URI) throw new Error("MONGO_URI is not defined");

  if (!globalThis._mongo.promise) {
    globalThis._mongo.promise = mongoose
      .connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then((m) => m);
  }

  globalThis._mongo.conn = await globalThis._mongo.promise;
  return globalThis._mongo.conn;
}

// الحقول دي معرّفة صراحة عشان user.save() يشتغل عليها صح (Mongoose بيتجاهل
// بصمت أي property مش معرّفة كـ path رسمي في الـ schema، حتى مع strict:false).
// سايبين strict:false في الآخر عشان أي حقول قديمة تانية في الداتابيز تفضل شغالة.
const authSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, lowercase: true, trim: true },
    password: String,
    phone: String,
    address: mongoose.Schema.Types.Mixed,
    paymentMethod: { type: String, default: "cash" },
    role: { type: String, default: "student" },

    // خاصين بـ forgot/reset password
    resetCodeHash: { type: String, default: null },
    resetCodeExpiry: { type: Date, default: null },
    resetAttempts: { type: Number, default: 0 },
    // 🔒 SECURITY: بداية نافذة الـ 12 ساعة لعدّ محاولات تخمين الكود
    // (منفصلة عن resetCodeExpiry بتاع صلاحية الكود نفسه).
    resetAttemptsWindowStart: { type: Date, default: null },

    // 🔒 SECURITY: وقت آخر تغيير للباسورد + رقم نسخة الجلسة (tokenVersion).
    // كل JWT بيحمل tokenVersion وقت إصداره؛ لما نزوّد الرقم ده (عند تغيير
    // الباسورد مثلاً) أي JWT قديم بيبقى "باطل" حتى لو لسه في تاريخ صلاحيته
    // الأصلي (7 أيام) — شوف authOptions.js وresetPasswordHelpers.
    passwordChangedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },

    // 🔒 SECURITY: عدّاد/نافذة محاولات تسجيل الدخول الفاشلة لكل حساب،
    // بيتصفّر تلقائيًا لما ينجح الدخول. منفصل عن rate limit الخاص بالـ IP
    // (اللي بيتخزن في Redis/الميموري في lib/rateLimit.js) — الاتنين مع بعض
    // بيغطوا هجوم على حساب واحد وهجوم موزّع على حسابات كتير.
    loginFailedAttempts: { type: Number, default: 0 },
    loginFirstFailedAt: { type: Date, default: null },
    loginLockedUntil: { type: Date, default: null },

    // 🔒 SECURITY: خاصين بـ MFA (TOTP) — الأدمن بس المفروض يستخدمها.
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, default: null }, // base32 secret (يتخزن plain — لازم يبقى الاتصال بالداتابيز مشفّر/محمي؛ اختياري تشفيره بمفتاح تطبيق لاحقًا)
    mfaBackupCodeHashes: { type: [String], default: [] },
  },
  { strict: false, timestamps: true }
);

export function getAuthModel() {
  const modelName = "Model_auth";
  if (globalThis._mongoModels["auth"]) return globalThis._mongoModels["auth"];

  // ✅ لو الموديل كان متسجل قبل كده بالـ schema القديمة (بدون الحقول دي)،
  // نمسحه ونسجله تاني بالـ schema الجديدة — عشان في بيئة dev مع hot-reload
  // الموديل القديم يفضل عالق في mongoose.models.
  const existing = mongoose.models[modelName];
  if (existing && !existing.schema.path("tokenVersion")) {
    delete mongoose.models[modelName];
    if (mongoose.modelSchemas) delete mongoose.modelSchemas[modelName];
  }

  const Model = mongoose.models[modelName] || mongoose.model(modelName, authSchema, "auth");
  globalThis._mongoModels["auth"] = Model;
  return Model;
}

// ==========================================================================
// Audit Log — سجل موثّق لأي إجراء إداري حساس (تغيير role، حذف مستخدم، تفعيل
// MFA، إلخ). الكولكشن ده append-only من ناحية التطبيق: مفيش أي route بيعدّل
// أو يمسح منه، بس بيتكتب فيه.
// ==========================================================================
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // مثال: "user.role_changed", "user.deleted"
    actorId: { type: String, default: null }, // ID الأدمن اللي عمل الإجراء
    actorEmail: { type: String, default: null },
    actorName: { type: String, default: null },
    targetId: { type: String, default: null }, // ID المستخدم اللي اتأثر بالإجراء
    targetEmail: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }, // أي بيانات إضافية (before/after مثلاً)
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { strict: true, timestamps: true }
);

export function getAuditLogModel() {
  const modelName = "Model_audit_logs";
  if (globalThis._mongoModels["audit_logs"]) return globalThis._mongoModels["audit_logs"];

  const Model =
    mongoose.models[modelName] || mongoose.model(modelName, auditLogSchema, "audit_logs");
  globalThis._mongoModels["audit_logs"] = Model;
  return Model;
}