// path: app/(pages)/terms/page.jsx
// المحتوى بقى ديناميك: بيتقرا من collection "terms_conditions" ويتعدّل من لوحة الأدمن
// (Pages → Terms). المحتوى الحالي محفوظ كـ default في app/lib/legalDefaults/terms.js.
"use client";

import LegalPage from "@/app/components/legal/LegalPage";
import TERMS_DEFAULTS from "@/app/lib/legalDefaults/terms";

export default function TermsPage() {
  return <LegalPage collection="terms_conditions" defaults={TERMS_DEFAULTS} />;
}
