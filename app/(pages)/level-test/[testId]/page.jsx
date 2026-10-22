// app/(pages)/level-test/[testId]/page.jsx
//
// 🆕 صفحة اختبار تحديد المستوى المخصص (B1, B2, ...) اللي الأدمن رفعه من ملف Excel.
// الواجهة نفسها (app/components/SpanishTestRunner.jsx) مشتركة مع A1/A2 — بتحمّل الاختبار من
// GET /api/placement-tests/custom/<testId> (ومن غير مفتاح الإجابات). الاختبار لازم يكون منشور،
// وإلا بتظهر رسالة "غير متاح". بيظهر زرار "اختبر مستواك" على الكورسات اللي الأدمن ربطها بيه.

import SpanishTestRunner from "@/app/components/SpanishTestRunner";

export const metadata = { robots: { index: false } };

export default async function LevelTestPage({ params }) {
  const { testId } = await params;
  return <SpanishTestRunner testId={decodeURIComponent(String(testId || ""))} />;
}
