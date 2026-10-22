// app/api/placement-tests/route.js
//
// POST — استلام إجابات اختبار تحديد المستوى (إسباني) بعد ما الطالب يخلّصه.
// بيتم التصحيح هنا على السيرفر وبيتخزن في كولكشن "placement_tests".
// - اختبار مجاني (PLACEMENT_TEST_IS_FREE=true): بيتسجّل بحالة "free" والراوت
//   بيرجع الدرجة (من 100) + المستوى + إجابات الطالب مع التصحيح (review) + الكورسات
//   الموصى بها فورًا للطالب، وبيبعتله نسخة على إيميل حسابه.
// - اختبار مدفوع: بيتسجّل بحالة "unpaid" 🔒 والراوت مبيرجعش الدرجة للـ client،
//   والطالب مبيستلمها غير بعد نجاح الدفع (شوف ./result/route.js).
//
// 🆕 body.test = "a1" | "a2" (الافتراضي a1) — الأسئلة والمفتاح والصوتيات والمستوى بيتحددوا حسب الاختبار،
// والنتيجة بتتخزن بحقل test.
//
// 🔐 لازم الطالب يكون مسجّل دخول: الاسم والإيميل والرقم (التليفون) بيتاخدوا من
// الـ session على السيرفر — مش من الـ body — فمفيش حد يقدر يبعت بيانات مزيّفة، وبيانات
// الطالب بتتسجّل مع النتيجة وتظهر للأدمن. فيه rate limit بالـ IP.

import { connectToMongo } from "@/app/lib/mongodb";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { requireSession } from "@/app/lib/rbac";
import { sendPlacementResultEmail } from "@/app/lib/emailHelpers";
import { buildResults, buildReview } from "@/app/lib/placementReview";
import { PLACEMENT_TEST_IS_FREE } from "@/app/lib/spanishPlacementTest";
import { normalizeTestId } from "@/app/lib/placementTests";
import {
  getAudioMap,
  getPlacementTestsCollection,
  getRecommendedCourses,
  sanitizeAnswers,
  scoreAnswers,
} from "@/app/lib/placementTest";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const rl = await enforceRateLimit(request, {
      keyPrefix: "placement-tests:submit",
      limit: 5,
      windowSeconds: 60,
    });
    if (rl) return rl;

    // 🔐 غير مسجّل دخول → 401 (الـ client بيفتح له الـ Login ويحتفظ بإجاباته)
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const user = auth.session.user;

    const body = await request.json().catch(() => null);
    // بيانات الطالب من الـ session بس — أي name/email جايين في الـ body بنتجاهلهم
    const name = String(user.name || "").trim().slice(0, 120);
    const email = String(user.email || "").trim().slice(0, 160);
    const phone = String(user.phone || "").trim().slice(0, 60);
    const userId = String(user.id || "");
    const language = ["ar", "en", "es"].includes(body?.language) ? body.language : "ar";
    const testId = normalizeTestId(body?.test);

    if (!name || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: "invalid_profile" }, 400);
    }

    await connectToMongo();
    // الأسئلة المصححة = الأسئلة الظاهرة فعلًا (مهام الاستماع من غير صوت مرفوع بتتخفي)
    const audio = await getAudioMap(testId);
    const answers = sanitizeAnswers(body?.answers, audio, testId);
    const result = scoreAnswers(answers, audio, testId);
    // لقطة التصحيح لكل سؤال (إجابة الطالب + الصحيحة) — بتتخزّن عشان الأدمن والطالب
    // يشوفوا الإجابات مع التصحيح، وتفضل مطابقة للدرجة المحسوبة دلوقتي.
    const results = buildResults(answers, audio, testId);

    const col = getPlacementTestsCollection();
    const inserted = await col.insertOne({
      userId,
      test: testId,
      name,
      phone,
      email,
      language,
      answers,
      results,
      score: result.score,
      maxScore: result.maxScore,
      answeredCount: result.answered,
      totalQuestions: result.totalQuestions,
      level: result.level,
      a11Correct: result.a11,
      a12Correct: result.a12,
      rawScore: result.rawScore,
      rawMax: result.rawMax,
      paymentStatus: PLACEMENT_TEST_IS_FREE ? "free" : "unpaid",
      createdAt: new Date(),
    });

    const id = inserted.insertedId.toString();
    if (PLACEMENT_TEST_IS_FREE) {
      const review = buildReview(results, testId);

      // 📧 نسخة من النتيجة + الإجابات والتصحيح على إيميل الطالب المسجّل بيه (من الـ session).
      // best-effort: فشل الإرسال مبيوقّفش النتيجة، والـ client بيعرف لو اتبعت (emailSentTo).
      const emailSent = await sendPlacementResultEmail({
        toEmail: email,
        name,
        language,
        score: result.score,
        maxScore: result.maxScore,
        level: result.level,
        review,
      }).catch(() => false);
      await col
        .updateOne({ _id: inserted.insertedId }, { $set: { emailSent: Boolean(emailSent) } })
        .catch((e) => console.error("[/api/placement-tests] emailSent update error:", e));

      // الكورسات الموصى بها (نفس مستوى الطالب وأعلى) — لو فشلت منوقّفش النتيجة
      const recommended = await getRecommendedCourses(result.level, language).catch(() => []);
      return jsonResponse(
        {
          id,
          free: true,
          test: testId,
          name,
          score: result.score,
          maxScore: result.maxScore,
          level: result.level,
          answeredCount: result.answered,
          totalQuestions: result.totalQuestions,
          review,
          emailSentTo: emailSent ? email : null,
          recommended,
        },
        201
      );
    }
    return jsonResponse({ id }, 201);
  } catch (err) {
    console.error("[/api/placement-tests] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}