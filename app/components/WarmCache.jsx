"use client";
// ⚡ بيسخّن كاش بيانات الصفحات العامة وقت خمول المتصفح، فالتنقل لأي صفحة
// منهم بيعرض المحتوى فورًا. بيحترم Save-Data / الشبكات البطيئة.
import { useEffect } from "react";
import { prefetchData } from "@/app/lib/clientCache";
import { collectionUrl } from "@/app/lib/useCollection";

const PAGES = ["about", "countries", "blogs", "successStories", "contact", "home"];

export default function WarmCache() {
  useEffect(() => {
    const c = navigator.connection;
    if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType || "")) return;

    const run = () => PAGES.forEach((n) => prefetchData(collectionUrl(n)));
    const id =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(run, { timeout: 4000 })
        : setTimeout(run, 2500);
    return () =>
      "cancelIdleCallback" in window ? window.cancelIdleCallback(id) : clearTimeout(id);
  }, []);
  return null;
}
