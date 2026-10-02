"use client";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { seedCache } from "@/app/lib/clientCache";
import WarmCache from "./WarmCache";
import PrefetchOnIntent from "./PrefetchOnIntent";

export default function Providers({ children, session, initialLanguage, seed }) {
  // بنزرع الكاش أثناء الـ render (idempotent) عشان أول render للنافبار/الفوتر
  // على السيرفر والكلاينت يشوفوا نفس الداتا → بدون hydration mismatch.
  seedCache(seed);

  return (
    // session جاية من السيرفر → status مش بيبدأ بـ "loading" (مفيش
    // spinner)، وrefetchOnWindowFocus=false بيمنع طلب /api/auth/session مع كل
    // رجوع للتاب (كان بيعمل hit على الداتابيز عبر jwt callback).
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <LanguageProvider initialLanguage={initialLanguage}>
        <WarmCache />
        <PrefetchOnIntent />
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
}
