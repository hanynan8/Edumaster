// lib/mongodb.js
// نقطة اتصال واحدة بالداتابيز ونموذج (Model) واحد لكولكشن الـ auth،
// عشان كل الملفات اللي بتتعامل مع المستخدمين تستخدم نفس المنطق بدل ما يتكرر.

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if (!globalThis._mongo) globalThis._mongo = { conn: null, promise: null };
if (!globalThis._mongoModels) globalThis._mongoModels = {};

export async function connectToMongo() {
  // ✅ لو عندنا conn متخزن لكن الاتصال الحقيقي وقع (مثلاً السيرفر قفل الاتصال)،
  // مانرجعش نسخة ميتة — نتأكد إن readyState فعلاً 1 (connected).
  if (globalThis._mongo.conn && mongoose.connection.readyState === 1) {
    return globalThis._mongo.conn;
  }
  if (!MONGO_URI) throw new Error("MONGO_URI is not defined");

  if (!globalThis._mongo.promise) {
    globalThis._mongo.promise = mongoose
      .connect(MONGO_URI)
      .then((m) => m)
      .catch((err) => {
        // ✅ لازم نصفّر الاتنين هنا، مش بس الـ promise — عشان أي نداء جاي
        // يقدر يعيد المحاولة بدل ما يفضل عالق على فشل قديم للأبد.
        globalThis._mongo.promise = null;
        globalThis._mongo.conn = null;
        throw err;
      });
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

    // 🔒 SECURITY: حالة الحساب — "active" العادي، "suspended" لو الأدمن أوقفه
    // (مخالفة، طلب المستخدم، إلخ). الإيقاف بيتم فحصه في authOptions.js *قبل*
    // ما نتحقق من الباسورد أصلاً، فالحساب الموقوف مايقدرش يدخل حتى لو
    // الباسورد صح. منفصل تمامًا عن loginLockedUntil (ده مؤقت وتلقائي بسبب
    // محاولات فاشلة، وده يدوي من الأدمن ومفتوح المدة لحد ما يتم إلغاؤه).
    status: { type: String, enum: ["active", "suspended"], default: "active" },

    // خاصين بـ forgot/reset password
    resetCodeHash: { type: String, default: null },
    resetCodeExpiry: { type: Date, default: null },
    resetAttempts: { type: Number, default: 0 },
    // 🔒 SECURITY: وقت آخر محاولة تخمين للكود (ناجحة أو فاشلة) — بيُستخدم
    // لحساب فاصل الـ 5 دقايق الإجباري بين كل محاولة والتانية، وكمان لحساب
    // الـ 24 ساعة قفل بعد ما الـ 5 محاولات تخلص (شوف resetPasswordHelpers.js).
    resetLastAttemptAt: { type: Date, default: null },

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

    // ==========================================================================
    // 🎓 حقول الـ LMS — أُضيفت في Phase 0 (Day 1/3 من خطة التطوير)
    // ==========================================================================

    // بيانات بروفايل إضافية غير الحقول الأساسية (name/email/phone/address
    // الموجودة فوق أصلاً وبيستخدمها authOptions.js مباشرة — سيبناها زي ما هي
    // عشان منكسرش أي كود شغال).
    profile: {
      avatar: { type: String, default: null },
      bio: { type: String, default: "" },
      country: { type: String, default: null },
    },

    // 🔒 SECURITY: membership هنا "snapshot" لحالة الاشتراك الحالية بس (1-to-1
    // مع اليوزر)، مش سجل كامل. بتتحدث فقط عن طريق كود السيرفر (Payment
    // webhook / أدمن) — مفيش أي API بيسمح للمستخدم يعدلها مباشرة عن نفسه،
    // غير كده أي حد هيقدر "يشترك مجانًا" بمجرد تعديل الـ request بتاعه.
    membership: {
      plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Model_membership_plan",
        default: null,
      },
      status: {
        type: String,
        enum: ["inactive", "active", "expired", "cancelled"],
        default: "inactive",
      },
      startedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
    },

    // 🆕 ONBOARDING — خطوات جمع المعلومات اللي بتظهر أول مرة بعد التسجيل
    // مباشرة (زي تدفق Coursera: الهدف → الدور الحالي → المهارات المطلوب
    // تطويرها → المستوى التعليمي). بتتسجل مرة واحدة بس (completed=true بعد
    // "Finish")؛ لو المستخدم دخل تاني على /onboarding بعد ما خلّص، الصفحة
    // بتحوّله على طول للداشبورد بدل ما تعرضله الخطوات تاني.
    onboarding: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      // start_career | change_career | grow_current_role | explore_topics
      goal: { type: String, default: null },
      // اسم الدور الحالي — إما مُختار من القايمة الجاهزة أو مكتوب يدويًا
      // لو مختار "something else" في الواجهة.
      currentRole: { type: String, default: null },
      skills: { type: [String], default: [] },
      educationLevel: { type: String, default: null },
    },

    // ⚠️ قرار تصميم مقصود: purchases / enrollments / quizResults /
    // certificates / notifications *ماتمش* إضافتهم كـ arrays مُضمّنة (embedded)
    // جوه الـ User زي ما كانوا في الخريطة الأصلية. السبب: الحقول دي بتكبر
    // باستمرار مع نشاط المستخدم (مستخدم نشط ممكن يوصل لمئات النتائج/الإشعارات)،
    // وMongoDB بيبقى بطيء جدًا مع مستندات كبيرة كتير التعديل، وفيه حد أقصى
    // 16MB للمستند الواحد. بدل كده هنعملهم collections منفصلة (Enrollment,
    // Payment, QuizResult, Certificate, Notification) وكل واحدة فيها userId
    // كمرجع — أسرع في القراءة/الكتابة وأسهل في الفهرسة والفلترة. هنبنيهم في
    // Phase 2/4/5/6 من خطة التطوير.
  },
  { strict: false, timestamps: true }
);

// ⚡ PERFORMANCE (Phase 8 — اليوم 60): "email" هو أكتر حقل بيتفلتر بيه على
// الكولكشن ده — كل login (authOptions.js)، register، forgot-password،
// verify-reset-code، reset-password كلهم بيعملوا findOne({email}). من غير
// index، كل واحد من الاستعلامات دي (يعني كل تسجيل دخول تقريبًا) بيعمل
// collection scan كامل على كل المستخدمين. unique:true هنا مش بس بيسرّع
// القراءة، كمان بيمنع على مستوى الداتابيز نفسه وجود إيميلين متطابقين حتى
// لو حصل race condition بين طلبين تسجيل متزامنين (الفحص اليدوي في
// /api/register مش كافي لوحده لمنع ده).
authSchema.index({ email: 1 }, { unique: true, sparse: true });

// ⚡ PERFORMANCE (audit fix): بيسرّع فحص تكرار الاسم في /api/register
// (findOne({ $or: [{email}, {name}] })) — مش unique لأن الاسم مسموح
// يتكرر فعليًا في نظرية النظام الحالي (الفحص بيتم على مستوى التطبيق بس)،
// فده index عادي للسرعة فقط، مش قيد على مستوى الداتابيز.
authSchema.index({ name: 1 });

// ⚡ PERFORMANCE (Phase 8 — اليوم 60): "membership.status" + "membership.expiresAt"
// بيتفلتر بيهم في مكانين: app/api/cron/membership-expiry (بيتشغّل يوميًا،
// أو أكتر) وapp/api/admin/users (?membershipExpiringWithinDays=N). من غير
// index، الاتنين كانوا بيعملوا collection scan كامل على *كل* المستخدمين
// (مش بس أصحاب membership نشطة) في كل تشغيلة — مع نمو عدد المستخدمين، ده
// كان هيبقى أبطأ وأبطأ تدريجيًا بالظبط زي ما وصف الـ email index فوق.
// compound index بترتيب (status ثم expiresAt) بيغطي الاستعلامين بالظبط
// لأن الاتنين بيفلتروا بـ status="active" أولًا وبعدين بمدى تاريخ.
authSchema.index({ "membership.status": 1, "membership.expiresAt": 1 });

export function getAuthModel() {
  const modelName = "Model_auth";
  if (globalThis._mongoModels["auth"]) return globalThis._mongoModels["auth"];

  // ✅ لو الموديل كان متسجل قبل كده بالـ schema القديمة (بدون الحقول دي)،
  // نمسحه ونسجله تاني بالـ schema الجديدة — عشان في بيئة dev مع hot-reload
  // الموديل القديم يفضل عالق في mongoose.models.
  // 🔧 لازم نتأكد من *كل* الحقول اللي اتضافت بعد tokenVersion (زي onboarding)،
  // مش بس tokenVersion نفسه — وإلا لو السيرفر شغال من قبل إضافة onboarding
  // (أو بعد git pull من غير إعادة تشغيل)، الموديل هيفضل مسجل بالـ schema
  // القديمة وأي بيانات onboarding هترجع/تتسجل غلط بصمت من غير أي error ظاهر.
  const existing = mongoose.models[modelName];
  if (existing && (!existing.schema.path("tokenVersion") || !existing.schema.path("onboarding.completed"))) {
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

// ⚡ PERFORMANCE (Phase 8 — اليوم 60): /api/admin/audit-logs بيعمل
// .sort({ createdAt: -1 }).limit(limit) على الكولكشن ده من غير أي index —
// يعني Mongo مضطر يحمّل ويرتّب كل السجلات في الميموري (in-memory sort)
// قبل ما يرجّع أول limit بس، وده بيبقى أبطأ وأكتر استهلاكًا للميموري كل ما
// السجلات زادت مع الوقت (append-only collection). index تنازلي على
// createdAt بيخلي الترتيب نفسه مجاني (الداتا أصلاً متخزنة بالترتيب ده).
auditLogSchema.index({ createdAt: -1 });

export function getAuditLogModel() {
  const modelName = "Model_audit_logs";
  if (globalThis._mongoModels["audit_logs"]) return globalThis._mongoModels["audit_logs"];

  const Model =
    mongoose.models[modelName] || mongoose.model(modelName, auditLogSchema, "audit_logs");
  globalThis._mongoModels["audit_logs"] = Model;
  return Model;
}