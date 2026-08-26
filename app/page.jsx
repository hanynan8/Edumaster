"use client";

import { useSession } from "next-auth/react";
import HomePageLoggedOut from "./(home)/HomePageLoggedOut";
import HomePageLoggedIn from "./(home)/Homepageloggedin";
import { useLanguage } from "@/contexts/LanguageContext";

// 🆕 كلمة "Loading" كانت إنجليزي ثابت — دلوقتي بتتبع اللغة المختارة
// من الناف بار زي باقي الموقع.
const T = {
  en: "Loading",
  ar: "جاري التحميل",
  es: "Cargando",
};

export default function HomePage() {
  const { status } = useSession();
  const { language } = useLanguage();

  // لسه بيتأكد لو المستخدم مسجل دخول ولا لأ — نعرض لودينج بسيط بدل
  // ما نلخبط ونعرض نسخة غلط للحظة واحدة
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">
            {T[language] || T.en}
          </span>
        </div>
      </div>
    );
  }

  return status === "authenticated" ? <HomePageLoggedIn /> : <HomePageLoggedOut />;
}