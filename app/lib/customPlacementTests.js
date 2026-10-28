// ═══════════════════════════════════════════════
//  app/lib/customPlacementTests.js
//  🆕 اختبارات تحديد المستوى المخصصة (B1, B2, ...) اللي الأدمن بيرفعها من ملف Excel — السيرفر بس.
//
//  بتتخزن في كولكشن "placement_test_defs" (مستند لكل اختبار):
//    { testId, label, title, subject, thresholds, parts, answerKey, scripts, audioSlots, nextN,
//      status: "published" | "draft" | "archived", courseIds: [string], createdAt, updatedAt }
//  - nextN: أول رقم متاح لسؤال جديد (رقم السؤال n هو مفتاح الإجابات ونتايج الطلاب — مابيتعادش استخدامه حتى لو السؤال اتحذف).
//  - parts: نفس هيكل PLACEMENT_PARTS لـ A1/A2 (فمنطق الأسئلة الظاهرة/التصحيح/المراجعة مشترك).
//  - answerKey و scripts 🔒 بيفضلوا في السيرفر بس — النسخة العامة (toPublicTest) من غيرهم.
//  - الصوتيات: كولكشن placement_settings (مستند "audio_custom_<id>") + Bunny Storage زي A1/A2.
//  - courseIds: الكورسات اللي زرار "اختبر مستواك" بتاع الاختبار بيظهر عليها (الأدمن بيختارها).
//
//  اختبار تم استخدامه (فيه نتايج طلاب) ما بيتمسحش نهائيًا — بيتأرشف (archived) عشان مراجعة النتايج القديمة
//  تفضل شغالة. لازم connectToMongo() يتنادى قبل أي دالة هنا.
// ═══════════════════════════════════════════════

import mongoose from "mongoose";
import { normalizeTestId, PLACEMENT_TESTS } from "@/app/lib/placementTests";
import { buildStandardLevels } from "@/app/lib/placementLevels";
import { DEFAULT_THRESHOLDS, RESERVED_TEST_IDS, TEST_ID_RE } from "@/app/lib/placementTestSheetSpec";
import { buildTestFromEditable, listQuestionNs, nextQuestionNumber, testToEditable } from "@/app/lib/placementTestEditor";

export const DEFS_COLLECTION = "placement_test_defs";
export const STATUSES = ["published", "draft", "archived"];

let indexEnsured = false;
function defsCollection() {
  const col = mongoose.connection.db.collection(DEFS_COLLECTION);
  if (!indexEnsured) {
    indexEnsured = true;
    // ID الاختبار فريد (لو فشل إنشاء الإندكس مش بنوقف حاجة — saveCustomTest بيتأكد بنفسه برضه)
    Promise.resolve(col.createIndex({ testId: 1 }, { unique: true })).catch(() => { indexEnsured = false; });
  }
  return col;
}
function resultsCollection() {
  return mongoose.connection.db.collection("placement_tests");
}
function settingsCollection() {
  return mongoose.connection.db.collection("placement_settings");
}

export const customAudioDocId = (id) => `audio_custom_${id}`;
export const customAudioPrefix = (id) => `edumaster/placement-test-custom/${id}/audio`;
export const customPath = (id) => `/level-test/${encodeURIComponent(id)}`;

// مستند الداتابيز → تعريف اختبار جاهز للاستخدام في الدوال المشتركة (placementTests / placementTest / placementReview)
export function docToDef(doc) {
  if (!doc) return null;
  const thresholds = Array.isArray(doc.thresholds) && doc.thresholds.length === 3 ? doc.thresholds : DEFAULT_THRESHOLDS;
  return {
    custom: true,
    id: doc.testId,
    label: doc.label,
    title: doc.title,
    subject: doc.subject || "es",
    thresholds,
    status: doc.status,
    courseIds: Array.isArray(doc.courseIds) ? doc.courseIds : [],
    parts: doc.parts || [],
    answerKey: doc.answerKey || {}, // 🔒
    scripts: doc.scripts || {}, // 🔒
    audioSlots: doc.audioSlots || [],
    nextN: Number.isInteger(doc.nextN) ? doc.nextN : undefined,
    levels: buildStandardLevels(doc.label, thresholds),
    audioDocId: customAudioDocId(doc.testId),
    audioPathPrefix: customAudioPrefix(doc.testId),
    path: customPath(doc.testId),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// النسخة اللي تتبعت للمتصفح: من غير مفتاح الإجابات ولا نصوص التسجيلات
export function toPublicTest(def) {
  return {
    id: def.id,
    custom: true,
    label: def.label,
    title: def.title,
    subject: def.subject,
    path: def.path,
    parts: def.parts,
    audioSlots: def.audioSlots.map(({ slot, label }) => ({ slot, label })),
    levels: def.levels,
  };
}

export function countQuestions(parts) {
  return (parts || []).reduce((s, p) => s + p.tasks.reduce((t, k) => t + k.questions.length, 0), 0);
}

export async function getCustomTestDoc(testId) {
  const id = String(testId || "").toLowerCase();
  if (!TEST_ID_RE.test(id)) return null;
  return defsCollection().findOne({ testId: id });
}

// بيحلّ test id الجاي من الـ client لاختبار: مدمج (a1/a2) أو مخصص.
//   - فاضي/غريب/غير موجود → الاختبار الافتراضي a1 (توافق مع الكود القديم)
//   - مخصص موجود لكن مش منشور (draft/archived) → null (والـ route يرد 404): الطالب ميقدرش يقدّم اختبار مخفي.
//     { allowUnpublished: true } للأدمن (معاينة / مراجعة نتايج قديمة). { strict: true }: id غير معروف → null.
// بيرجّع { id, ref, custom, subject, levels, recommend } حيث ref = اللي بتتمرر لدوال التصحيح (id للمدمج، تعريف للمخصص).
export async function resolveTest(raw, { allowUnpublished = false, strict = false } = {}) {
  const lower = String(raw ?? "").toLowerCase();
  if (!lower || PLACEMENT_TESTS[lower]) {
    const id = normalizeTestId(lower);
    return { id, ref: id, custom: false, subject: "es", levels: null, recommend: {}, def: null };
  }
  const doc = await getCustomTestDoc(lower);
  if (!doc) {
    if (strict) return null; // routes الأدمن: id غلط ← 404 بدل ما يتحوّل لـ a1 بصمت
    const id = normalizeTestId(lower); // غريب → a1
    return { id, ref: id, custom: false, subject: "es", levels: null, recommend: {}, def: null };
  }
  if (!allowUnpublished && doc.status !== "published") return null;
  const def = docToDef(doc);
  return {
    id: def.id,
    ref: def,
    custom: true,
    subject: def.subject,
    levels: def.levels,
    // الكورسات الموصى بيها لاختبار مخصص: لغة المادة (لو معروفة) — أو الكورسات اللي الأدمن ربطها بالاختبار
    recommend:
      def.subject && def.subject !== "other"
        ? { levels: def.levels, courseLanguage: def.subject }
        : { levels: def.levels, courseLanguage: null, courseIds: def.courseIds },
    def,
  };
}

// معلومات المستوى للمتصفح (للاختبار المخصص عشان الواجهة متعتمدش على جداول A1/A2)
export function levelInfoFor(resolved, code) {
  if (!resolved?.custom) return null;
  const l = (resolved.levels || []).find((x) => x.code === code);
  return l ? { code: l.code, min: l.min, max: l.max, desc: l.desc, nextCode: l.nextCode, nextCourseName: l.nextCourseName } : null;
}

// ───────── قراءة للأدمن ─────────

function summarize(doc) {
  return {
    id: doc.testId,
    label: doc.label,
    title: doc.title,
    subject: doc.subject || "es",
    status: doc.status,
    questions: countQuestions(doc.parts),
    parts: (doc.parts || []).length,
    audioSlots: (doc.audioSlots || []).map(({ slot, label, hint }) => ({ slot, label, hint })),
    courseIds: Array.isArray(doc.courseIds) ? doc.courseIds : [],
    path: customPath(doc.testId),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

export async function listCustomTests() {
  const docs = await defsCollection()
    .find({}, { projection: { answerKey: 0, scripts: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => ({ ...summarize(d), parts: (d.parts || []).length }));
}

// ───────── كتابة ─────────

// بيحفظ اختبار اتقرا من Excel (نتيجة parsePlacementTestWorkbook().test).
//   mode "create": لو الـ ID موجود → { error: "exists" }
//   mode "update": لازم يكون موجود (نفس ID) — بيحدّث الأسئلة/المفتاح/الصوتيات المطلوبة وبيحتفظ بالكورسات والحالة والصوتيات المرفوعة
//   mode "auto"  : create لو مش موجود، update لو موجود
export async function saveCustomTest(test, { mode = "auto", status = "published" } = {}) {
  if (RESERVED_TEST_IDS.includes(test.id) || PLACEMENT_TESTS[test.id]) return { error: "reserved_id" };
  const col = defsCollection();
  const existing = await col.findOne({ testId: test.id }, { projection: { status: 1, courseIds: 1, createdAt: 1, nextN: 1 } });
  if (mode === "create" && existing) return { error: "exists" };
  if (mode === "update" && !existing) return { error: "not_found" };

  const now = new Date();
  const fields = {
    label: test.label,
    title: test.title,
    subject: test.subject,
    thresholds: test.thresholds,
    parts: test.parts,
    answerKey: test.answerKey,
    scripts: test.scripts || {},
    audioSlots: test.audioSlots || [],
    // علامة "أول رقم سؤال متاح": مابتنزلش أبدًا (حتى لو الملف الجديد أقصر) عشان أرقام نتايج الطلاب القديمة ماتتعادش لأسئلة تانية
    nextN: Math.max(Number.isInteger(existing?.nextN) ? existing.nextN : 0, nextQuestionNumber(test)),
    updatedAt: now,
  };
  if (existing) {
    // لو كان مؤرشف واترفع عليه ملف تاني → بيرجع draft (مش منشور تلقائي)
    const nextStatus = existing.status === "archived" ? "draft" : existing.status;
    await col.updateOne({ testId: test.id }, { $set: { ...fields, status: nextStatus } });
    return { ok: true, created: false, id: test.id, status: nextStatus };
  }
  await col.insertOne({
    testId: test.id,
    ...fields,
    status: STATUSES.includes(status) ? status : "published",
    courseIds: [],
    createdAt: now,
  });
  return { ok: true, created: true, id: test.id, status };
}

// ───────── 🆕 تعديل اختبار منشور (محرّر الهيكل الكامل) ─────────

// بيرجّع الاختبار بشكل قابل للتعديل للأدمن (فيه الإجابات الصحيحة ونصوص التسجيلات — أدمن بس) + بيانات التعديل.
export async function getCustomTestForEdit(testId) {
  const doc = await getCustomTestDoc(testId);
  if (!doc) return { error: "not_found" };
  const resultsCount = await resultsCollection().countDocuments({ test: doc.testId });
  return {
    ok: true,
    meta: {
      id: doc.testId,
      status: doc.status,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      resultsCount,
      path: customPath(doc.testId),
    },
    test: testToEditable(doc),
  };
}

// بيطبّق تعديلات الأدمن على اختبار موجود (أي حاجة: الإعدادات، الأجزاء، المهام، الأسئلة، الخيارات، الإجابات، أماكن الصوت).
//   - بيتحقق من الـ payload كله الأول (buildTestFromEditable) — لو فيه أي خطأ مفيش حاجة بتتحفظ.
//   - الأسئلة الموجودة بتحتفظ برقمها (n)، والجديدة بتاخد أرقام جديدة → نتايج الطلاب القديمة والمفتاح مابيتلخبطوش.
//   - الحالة والكورسات المربوطة والصوتيات المرفوعة بتفضل زي ما هي (الصوت مربوط برقم الخانة) — إلا تسجيل الأدمن حذفه صراحةً من المكتبة.
//   - expectedUpdatedAt: لو أدمن تاني عدّل الاختبار بعد ما فتحته → { error: "conflict" } بدل ما نكتب فوق شغله.
export async function editCustomTest(testId, payload, { expectedUpdatedAt = null } = {}) {
  const id = String(testId || "").toLowerCase();
  const col = defsCollection();
  const doc = await col.findOne({ testId: id });
  if (!doc) return { error: "not_found" };
  if (expectedUpdatedAt && doc.updatedAt && new Date(doc.updatedAt).toISOString() !== expectedUpdatedAt) return { error: "conflict" };

  const built = buildTestFromEditable(payload, { allowedNs: listQuestionNs(doc), nextN: nextQuestionNumber(doc) });
  if (!built.ok) return { error: "invalid", errors: built.errors, warnings: built.warnings };

  const t = built.test;
  const now = new Date();
  const filter = doc.updatedAt ? { testId: id, updatedAt: doc.updatedAt } : { testId: id };
  const res = await col.updateOne(filter, {
    $set: {
      label: t.label,
      title: t.title,
      subject: t.subject,
      thresholds: t.thresholds,
      parts: t.parts,
      answerKey: t.answerKey,
      scripts: t.scripts,
      audioSlots: t.audioSlots,
      nextN: t.nextN,
      updatedAt: now,
    },
  });
  if (res && res.matchedCount === 0) return { error: "conflict" };

  // تسجيلات الأدمن حذفها صراحةً من المكتبة → بنفك ارتباط الملف المرفوع (الملف نفسه بيفضل على Bunny زي DELETE الصوت)،
  // عشان لو خانة بنفس الرقم اتضافت بعدين ماتاخدش صوت قديم بالغلط.
  const removedSlots = (doc.audioSlots || []).map((a) => a.slot).filter((s) => !t.audioSlots.some((a) => a.slot === s));
  if (removedSlots.length) {
    await settingsCollection().updateOne(
      { _id: customAudioDocId(id) },
      { $unset: Object.fromEntries(removedSlots.map((slot) => [`tracks.${slot}`, ""])) }
    );
  }
  return {
    ok: true,
    id,
    status: doc.status,
    updatedAt: now.toISOString(),
    warnings: built.warnings,
    stats: built.stats,
    removedSlots,
  };
}

// تعديل الحالة / الكورسات المربوطة. الكورس بيتربط باختبار مخصص واحد بس: ربطه بالاختبار ده بيشيله من أي اختبار تاني.
export async function updateCustomTestMeta(testId, { status, courseIds } = {}) {
  const id = String(testId || "").toLowerCase();
  const col = defsCollection();
  const doc = await col.findOne({ testId: id }, { projection: { testId: 1 } });
  if (!doc) return { error: "not_found" };
  const $set = { updatedAt: new Date() };
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return { error: "invalid_status" };
    $set.status = status;
  }
  if (courseIds !== undefined) {
    if (!Array.isArray(courseIds)) return { error: "invalid_courses" };
    const clean = [...new Set(courseIds.map(String))];
    if (!clean.every((c) => mongoose.Types.ObjectId.isValid(c))) return { error: "invalid_courses" };
    if (clean.length) {
      await col.updateMany({ testId: { $ne: id }, courseIds: { $in: clean } }, { $pull: { courseIds: { $in: clean } } });
    }
    $set.courseIds = clean;
  }
  await col.updateOne({ testId: id }, { $set });
  return { ok: true };
}

// حذف: لو فيه نتايج طلاب → أرشفة (النتايج القديمة محتاجة هيكل الاختبار)، وإلا حذف نهائي + مسح مستند الصوتيات.
export async function deleteCustomTest(testId) {
  const id = String(testId || "").toLowerCase();
  const col = defsCollection();
  const doc = await col.findOne({ testId: id }, { projection: { testId: 1 } });
  if (!doc) return { error: "not_found" };
  const used = await resultsCollection().countDocuments({ test: id }, { limit: 1 });
  if (used > 0) {
    await col.updateOne({ testId: id }, { $set: { status: "archived", courseIds: [], updatedAt: new Date() } });
    return { ok: true, archived: true };
  }
  await col.deleteOne({ testId: id });
  await settingsCollection().deleteOne({ _id: customAudioDocId(id) });
  return { ok: true, archived: false };
}

// ───────── ربط الكورسات ─────────
// بيرجّع { [courseId]: { id, path, label } } للاختبارات المخصصة المنشورة المربوطة بالكورسات دي.
export async function getPlacementLinksForCourses(courseIds) {
  const ids = [...new Set((courseIds || []).map(String))];
  if (!ids.length) return {};
  const docs = await defsCollection()
    .find({ status: "published", courseIds: { $in: ids } }, { projection: { testId: 1, label: 1, courseIds: 1 } })
    .toArray();
  const out = {};
  for (const d of docs) {
    for (const c of d.courseIds || []) {
      if (ids.includes(c)) out[c] = { id: d.testId, path: customPath(d.testId), label: d.label };
    }
  }
  return out;
}
