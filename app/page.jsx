"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import LoadingScreen from "./components/LoadingScreen";

// ⚡ PERFORMANCE: الصفحتين (مسجل/غير مسجل) كانوا بيتحمّلوا مع بعض في نفس الـ
// bundle. دلوقتي كل واحدة code-split — الزائر بيحمّل بس اللي محتاجه (SSR
// شغال، فالمحتوى بيظهر في أول HTML).
const HomePageLoggedOut = dynamic(() => import("./(home)/HomePageLoggedOut"), {
  loading: () => <LoadingScreen />,
});
const HomePageLoggedIn = dynamic(() => import("./(home)/Homepageloggedin"), {
  loading: () => <LoadingScreen />,
});

export default function HomePage() {
  // الـ session بقت جاية من السيرفر (layout → SessionProvider)، فالحالة
  // "loading" بقت نادرة جدًا (بس لو فشل جلب الـ session على السيرفر).
  const { status } = useSession();

  if (status === "loading") return <LoadingScreen />;

  return status === "authenticated" ? <HomePageLoggedIn /> : <HomePageLoggedOut />;
}
