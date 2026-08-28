"use client";

// app/loading.jsx — شاشة اللودينج التلقائية اللي Next.js بيعرضها بين
// التنقل من صفحة لصفحة. بتستخدم نفس <LoadingScreen /> المستخدم في كل
// صفحات الموقع، عشان يبقى في تصميم واحد بس للودينج بدل تكراره.

import LoadingScreen from "./components/LoadingScreen";

export default function Loading() {
  return <LoadingScreen />;
}
