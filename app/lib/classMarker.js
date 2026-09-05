// app/lib/classMarker.js
//
// 🆕 هيلبر صغير مشترك لبناء رابط اختبار "قيّم مستواك" (ClassMarker) —
// نفس المنطق المستخدم أصلًا في صفحة تفاصيل الكورس (courses/[id]/page.jsx)،
// لكن مستخرج هنا عشان كارت الكورس (في /courses وفي الصفحة الرئيسية)
// يقدر يبني نفس الرابط من غير ما يكرر الكود.
export function buildClassMarkerTestUrl(quizId, { name, email, userId } = {}) {
  const params = new URLSearchParams();
  if (name) params.set("cm_fn", name);
  if (email) params.set("cm_e", email);
  if (userId) params.set("cm_user_id", String(userId).slice(0, 100));
  const query = params.toString();
  return `https://www.classmarker.com/online-test/start/?quiz=${encodeURIComponent(quizId)}${
    query ? `&${query}` : ""
  }`;
}