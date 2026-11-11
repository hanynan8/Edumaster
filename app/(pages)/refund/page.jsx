// path: app/(pages)/refund/page.jsx
// المحتوى بقى ديناميك: بيتقرا من collection "refund_policy" ويتعدّل من لوحة الأدمن
// (Pages → Refund). المحتوى الحالي محفوظ كـ default في app/lib/legalDefaults/refund.js.
"use client";

import LegalPage from "@/app/components/legal/LegalPage";
import REFUND_DEFAULTS from "@/app/lib/legalDefaults/refund";

export default function RefundPage() {
  return <LegalPage collection="refund_policy" defaults={REFUND_DEFAULTS} />;
}
