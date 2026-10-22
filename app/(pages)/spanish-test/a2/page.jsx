// app/(pages)/spanish-test/a2/page.jsx
//
// اختبار تحديد المستوى (إسباني) A2 — Prueba de nivel de español A2 (100 نقطة).
// بنفس ميكانيزم ومنطق اختبار A1 (الواجهة في app/components/SpanishTestRunner.jsx).
// بيظهر زرار "اختبر مستواك" على كورسات الإسباني اللي اسمها A2.x.

import SpanishTestRunner from "@/app/components/SpanishTestRunner";

export default function SpanishTestA2Page() {
  return <SpanishTestRunner testId="a2" />;
}
