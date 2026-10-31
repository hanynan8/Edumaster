// app/(pages)/spanish-test/b2/page.jsx
//
// اختبار تحديد المستوى (إسباني) B2 — Prueba de nivel de español B2.
// بنفس ميكانيزم ومنطق اختبار A1/A2/B1 (الواجهة في app/components/SpanishTestRunner.jsx).
// بيظهر زرار "اختبر مستواك" على كورسات الإسباني اللي اسمها B2.x
// (Advanced B2.1 / Advanced Plus B2.2 / Advanced Pro B2.3 / Advanced Mastery B2.4).

import SpanishTestRunner from "@/app/components/SpanishTestRunner";

export default function SpanishTestB2Page() {
  return <SpanishTestRunner testId="b2" />;
}
