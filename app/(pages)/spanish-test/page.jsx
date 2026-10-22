// app/(pages)/spanish-test/page.jsx
//
// اختبار تحديد المستوى (إسباني) A1 — كل الواجهة في app/components/SpanishTestRunner.jsx
// (مشتركة مع اختبار A2 على /spanish-test/a2).

import SpanishTestRunner from "@/app/components/SpanishTestRunner";

export default function SpanishTestPage() {
  return <SpanishTestRunner testId="a1" />;
}
