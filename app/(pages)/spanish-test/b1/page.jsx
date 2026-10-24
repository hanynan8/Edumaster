// app/(pages)/spanish-test/b1/page.jsx
//
// اختبار تحديد المستوى (إسباني) B1 — Prueba de nivel de español B1.
// بنفس ميكانيزم ومنطق اختبار A1/A2 (الواجهة في app/components/SpanishTestRunner.jsx).
// بيظهر زرار "اختبر مستواك" على كورسات الإسباني اللي اسمها B1.x
// (Independent B1.1 / Fluency B1.2 / Professional B1.3 / Study & Work B1.4).

import SpanishTestRunner from "@/app/components/SpanishTestRunner";

export default function SpanishTestB1Page() {
  return <SpanishTestRunner testId="b1" />;
}
