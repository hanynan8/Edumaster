"use client";

import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

// 🆕 النص كان إنجليزي ثابت مهما كانت اللغة المختارة من الناف بار —
// دلوقتي بيتبع اللغة الحالية زي باقي صفحات الموقع.
const T = {
  en: { title: 'Loading...', subtitle: 'Please wait a moment :)' },
  ar: { title: 'جاري التحميل...', subtitle: 'من فضلك انتظر لحظة :)' },
  es: { title: 'Cargando...', subtitle: 'Por favor espera un momento :)' },
};

export default function Loading() {
  const { language } = useLanguage();
  const t = T[language] || T.en;

  return (
    <main className='text-center'>
      <h2 className='text-3xl'>{t.title}</h2>
      <p>{t.subtitle}</p>
    </main>
  )
}