// app/lib/placementTest.js
//
// 🔒 منطق السيرفر لاختبار تحديد المستوى (إسباني): الوصول لكولكشن النتائج +
// التصحيح + تحديد المستوى + الكورسات الموصى بها + حساب رسوم الاختبار (لو الاختبار
// مدفوع). التصحيح هنا بس (مفاتيح الإجابات app/lib/spanishPlacementTestKey.js و
// spanishPlacementTestKeyA2.js مش بيتحمّلوا في المتصفح أبدًا).
//
// 🆕 فيه اختبارين (a1 / a2 — شوف placementTests.js). كل دوال التصحيح/الصوتيات بتاخد testId
// كآخر باراميتر (الافتراضي "a1" — فالكود القديم شغال زي ما هو).

import mongoose from "mongoose";
import { PLACEMENT_TEST_FEE_USD } from "@/app/lib/spanishPlacementTest";
import { getVisiblePartsFor, normalizeTestId, getPlacementTest } from "@/app/lib/placementTests";
import { getAnswerKey } from "@/app/lib/placementTestKeys";
import { getCurrencyForLanguage, convertPrice, getPriceForCurrency } from "@/app/lib/currency";
import { getCourseModel, getCategoryModel } from "@/app/lib/models";
import { resolveSecureStoredUrl, buildStoragePublicUrl } from "@/app/lib/bunny";
import {
  PLACEMENT_LEVELS,
  getLevelByPercent,
  getLevelByCode,
  levelRank,
  detectLevelCode,
  fallbackLevelFromEnum,
} from "@/app/lib/placementLevels";

// كولكشن عام بسكيمة مرنة (زي consultations) — مفيش موديل mongoose ثابت.
// لازم connectToMongo() يتنادى قبل الاستخدام.
export function getPlacementTestsCollection() {
  return mongoose.connection.db.collection("placement_tests");
}

// كل الأسئلة المعروضة فعليًا (مهام الاستماع من غير audioSrc بتتخفي).
export function getVisibleQuestions(audio = {}, testId = "a1") {
  return getVisiblePartsFor(testId, audio).flatMap((p) => p.tasks.flatMap((t) => t.questions));
}

// بيصحّح answers = { [رقم السؤال]: index } ويرجع:
//   score/maxScore: الدرجة من 100 (لو في مهام مخفية بتتحوّل لنسبة من 100)
//   rawScore/rawMax: الدرجة الخام على الأسئلة الظاهرة
//   a11/a12: عدد الإجابات الصحيحة في أسئلة A1.1 و A1.2 (من 51 / 49) — اختبار A1 بس
//            (اختبار A2 مفيهوش تقسيم للأسئلة فبيرجع 0)
//   level: كود المستوى حسب جدول الاختبار (Pre-A1…A1.3 أو Pre-A2…A2.3)
export function scoreAnswers(answers, audio = {}, testId = "a1") {
  const tid = normalizeTestId(testId);
  const ANSWER_KEY = getAnswerKey(tid);
  const questions = getVisibleQuestions(audio, tid);
  let rawScore = 0;
  let answered = 0;
  let a11 = 0;
  let a12 = 0;
  for (const q of questions) {
    const key = ANSWER_KEY[q.n];
    const ans = answers?.[q.n];
    if (Number.isInteger(ans) && ans >= 0) answered += 1;
    if (!key) continue;
    if (ans === key.a) {
      rawScore += 1;
      if (key.s === "A1.1") a11 += 1;
      else if (key.s === "A1.2") a12 += 1;
    }
  }
  const rawMax = questions.length;
  const score = rawMax ? Math.round((rawScore / rawMax) * 100) : 0;
  const level = getLevelByPercent(score, tid);
  return {
    score,
    maxScore: 100,
    rawScore,
    rawMax,
    answered,
    totalQuestions: rawMax,
    a11,
    a12,
    level: level.code,
  };
}

// بيفلتر answers الجاية من الـ client: أرقام أسئلة معروفة بس وقيم صحيحة ضمن عدد الخيارات.
export function sanitizeAnswers(input, audio = {}, testId = "a1") {
  const clean = {};
  if (!input || typeof input !== "object") return clean;
  for (const q of getVisibleQuestions(audio, testId)) {
    const v = input[q.n];
    if (Number.isInteger(v) && v >= 0 && v < q.o.length) clean[q.n] = v;
  }
  return clean;
}

// رسوم الاختبار بالمبلغ الكامل (مش قروش) حسب لغة الموقع.
export function getPlacementTestFee(language) {
  const currency = getCurrencyForLanguage(language);
  const amount = convertPrice(PLACEMENT_TEST_FEE_USD, "USD", currency);
  return { currency, amount };
}

// ─── صوتيات الاختبار (4 خانات لكل اختبار) ───
// بتتخزن في كولكشن placement_settings — doc لكل اختبار (_id شوف placementTests.js:
// "audio" لـ A1 و"audio_a2" لـ A2):
//   { tracks: { "1": { path, name, size, uploadedAt }, ... } }
// الملف نفسه على Bunny Storage. بنخزّن المسار (path) مش الرابط، والرابط بيتبني
// ويتوقّع وقت القراءة (resolveSecureStoredUrl) عشان Token Authentication لو مفعّل.
export const AUDIO_SLOTS = [1, 2, 3, 4];

function getSettingsCollection() {
  return mongoose.connection.db.collection("placement_settings");
}

function audioDocId(testId) {
  return getPlacementTest(testId).audioDocId;
}

export async function getAudioTracks(testId = "a1") {
  const doc = await getSettingsCollection().findOne({ _id: audioDocId(testId) });
  return doc?.tracks || {};
}

export async function setAudioTrack(slot, track, testId = "a1") {
  await getSettingsCollection().updateOne(
    { _id: audioDocId(testId) },
    track ? { $set: { [`tracks.${slot}`]: track } } : { $unset: { [`tracks.${slot}`]: "" } },
    { upsert: true }
  );
}

// { [slot]: رابط جاهز للتشغيل } للمسارات المرفوعة بس
export async function getAudioMap(testId = "a1") {
  const tracks = await getAudioTracks(testId);
  const map = {};
  for (const slot of AUDIO_SLOTS) {
    const t = tracks[slot];
    if (t?.path) map[slot] = resolveSecureStoredUrl(buildStoragePublicUrl(t.path));
  }
  return map;
}

// ─── الكورسات الموصى بها ───
// كورسات الموقع المنشورة (إسباني تحت تصنيف Language) اللي مستواها نفس مستوى الطالب أو أعلى.
// - Pre-A1: بنبدأ من A1.1. Pre-A2: بنبدأ من A1.3 (مراجعة قبل A2) — حسب floorCode في placementLevels.js.
// - مستوى الكورس بيتقرا من اسمه (كل اللغات) + slug + وسومه، وإلا من حقل level القديم.
// - الترتيب: من الأقرب لمستوى الطالب للأعلى. الكورس الأنسب (الخطوة التالية حسب الجدول) بيتعلّم.
export async function getRecommendedCourses(levelCode, language = "ar", limit = 12) {
  const level = getLevelByCode(levelCode);
  if (!level) return [];
  const floorRank = Math.max(levelRank(level.code), levelRank(level.floorCode || "A1.1"));
  const nextRank = levelRank(level.nextCode);

  getCategoryModel();
  const Course = getCourseModel();
  const docs = await Course.find({ status: "published", language: "es" })
    .populate("category", "slug")
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(200)
    .lean();

  const currency = getCurrencyForLanguage(language);
  const out = [];
  for (const c of docs) {
    if (c.category?.slug !== "language") continue;
    const i18n = c.i18n instanceof Map ? Object.fromEntries(c.i18n) : c.i18n || {};
    const names = [c.title, c.slug, ...(c.tags || []), ...Object.values(i18n).map((x) => x?.title)];
    let code = null;
    for (const n of names) {
      code = detectLevelCode(n);
      if (code) break;
    }
    if (!code) code = fallbackLevelFromEnum(c.level);
    const rank = levelRank(code);
    if (rank < floorRank) continue;
    const entry = i18n[language] || i18n.en || null;
    out.push({
      id: c._id.toString(),
      title: entry?.title || c.title,
      shortDescription: entry?.shortDescription || c.shortDescription || "",
      thumbnail: resolveSecureStoredUrl(c.thumbnail) || "",
      levelCode: code,
      isFree: Boolean(c.isFree),
      price: c.isFree ? 0 : getPriceForCurrency(c.prices, language).amount,
      currency,
      isNextStep: rank === nextRank,
      _rank: rank,
    });
  }
  out.sort((a, b) => a._rank - b._rank);
  return out.slice(0, limit).map(({ _rank, ...rest }) => rest);
}

export { PLACEMENT_LEVELS };
