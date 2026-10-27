// app/lib/loadCoursePage.js
//
// 🩹 FIX (Couldn't load this course): منطق تحميل بيانات صفحة تفاصيل الكورس.
// كان جوه الصفحة نفسها وأي طلب فاشل من الأربعة (كورس/أقسام/كويزات/واجبات)
// أو رد مش JSON كان بيوقّع الصفحة كلها. القاعدة دلوقتي:
//   - الكورس هو الطلب الأساسي الوحيد (مع إعادة محاولة لو الفشل مؤقت 5xx/شبكة).
//   - الأقسام/الكويزات/الواجبات اختيارية: فشلها = قايمة فاضية، مش خطأ.
// مفصول في ملف لوحده عشان يتختبر (loadCoursePage.test.js).

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function optionalJson(fetchImpl, url) {
  try {
    const res = await fetchImpl(url, { cache: "no-store" });
    return res.ok ? await safeJson(res) : null;
  } catch {
    return null;
  }
}

export async function fetchCourseWithRetry(id, fetchImpl = fetch, { retries = 3, delayMs = 400 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetchImpl(`/api/courses/${id}`, { cache: "no-store" });
      if (res.status === 404) return { notFound: true };
      const data = await safeJson(res);
      if (res.ok && data && typeof data === "object" && !data.error) {
        return { course: data };
      }
      lastErr = new Error(data?.error || `status_${res.status}`);
      // 4xx (غير 404) مش هتتصلح بإعادة المحاولة
      if (res.status >= 400 && res.status < 500) break;
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries - 1) await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
  }
  throw lastErr || new Error("error");
}

/**
 * @returns {Promise<{notFound:true} | {course:object, sections:Array, quizzes:Array, assignments:Array}>}
 * بيرمي exception بس لو الكورس نفسه فشل تحميله بعد كل المحاولات.
 */
export async function loadCoursePageData(id, fetchImpl = fetch, opts) {
  const [courseResult, sectionsData, quizzesData, assignmentsData] = await Promise.all([
    fetchCourseWithRetry(id, fetchImpl, opts),
    optionalJson(fetchImpl, `/api/courses/${id}/sections`),
    optionalJson(fetchImpl, `/api/quizzes?course=${id}`),
    optionalJson(fetchImpl, `/api/assignments?course=${id}`),
  ]);
  if (courseResult.notFound) return { notFound: true };
  return {
    course: courseResult.course,
    sections: Array.isArray(sectionsData) ? sectionsData : [],
    quizzes: Array.isArray(quizzesData?.quizzes) ? quizzesData.quizzes : [],
    assignments: Array.isArray(assignmentsData?.assignments) ? assignmentsData.assignments : [],
  };
}
