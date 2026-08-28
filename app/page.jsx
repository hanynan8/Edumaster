"use client";

import { useSession } from "next-auth/react";
import HomePageLoggedOut from "./(home)/HomePageLoggedOut";
import HomePageLoggedIn from "./(home)/Homepageloggedin";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingScreen from "./components/LoadingScreen";

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
      <LoadingScreen />
    );
  }

  return status === "authenticated" ? <HomePageLoggedIn /> : <HomePageLoggedOut />;
}