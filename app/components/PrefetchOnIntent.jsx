// PATH: app/components/PrefetchOnIntent.jsx
"use client";
// ⚡ بمجرد ما المستخدم يعدّي بالماوس (أو يلمس) على لينك داخلي، بنسخّن بيانات
// الصفحة دي في كاش الكلاينت — فلحظة الضغط تكون الداتا جاهزة والصفحة بتتعرض
// فورًا من غير أي انتظار. event delegation واحد على document (مش listener
// لكل لينك).
import { useEffect } from "react";
import { prefetchData } from "@/app/lib/clientCache";
import { collectionUrl } from "@/app/lib/useCollection";

const ROUTE_DATA = {
  "/about": [collectionUrl("about")],
  "/services": [collectionUrl("services"), "/api/membership-plans"],
  "/countries": [collectionUrl("countries")],
  "/blog": [collectionUrl("blogs")],
  "/success-stories": [collectionUrl("successStories")],
  "/contact": [collectionUrl("contact")],
  "/membership": ["/api/membership-plans"],
  "/courses": ["/api/courses"],
  "/": [collectionUrl("home"), "/api/courses"],
};

export default function PrefetchOnIntent() {
  useEffect(() => {
    const c = navigator.connection;
    if (c?.saveData) return;

    const onIntent = (e) => {
      const a = e.target?.closest?.("a[href^='/']");
      if (!a) return;
      const path = a.getAttribute("href").split(/[?#]/)[0].replace(/\/$/, "") || "/";
      const key = path.startsWith("/countries/") ? "/countries" : path;
      ROUTE_DATA[key]?.forEach(prefetchData);
    };

    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, []);
  return null;
}