// path: app/(pages)/privacy/page.jsx
// المحتوى بقى ديناميك: بيتقرا من collection "privacy_policy" ويتعدّل من لوحة الأدمن
// (Pages → Privacy). المحتوى الحالي محفوظ كـ default في app/lib/legalDefaults/privacy.js.
"use client";

import LegalPage from "@/app/components/legal/LegalPage";
import PRIVACY_DEFAULTS from "@/app/lib/legalDefaults/privacy";

export default function PrivacyPage() {
  return <LegalPage collection="privacy_policy" defaults={PRIVACY_DEFAULTS} />;
}
