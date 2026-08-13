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
  if (existing && !existing.schema.path("resetAttemptsWindowStart")) {
    delete mongoose.models[modelName];
    if (mongoose.modelSchemas) delete mongoose.modelSchemas[modelName];
  }

  const Model = mongoose.models[modelName] || mongoose.model(modelName, authSchema, "auth");
  globalThis._mongoModels["auth"] = Model;
  return Model;
}