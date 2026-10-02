// contexts/LanguageContext.jsx
'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const SUPPORTED = ['en', 'ar', 'es'];

// ⚡ اللغة بتتخزن في كوكي (بالإضافة لـ localStorage للتوافق مع المستخدمين
// القدام) عشان السيرفر يقرأها ويرسم الـ HTML باللغة/الاتجاه الصح من أول طلب
// — من غير flash ولا إعادة رسم بعد الـ hydration.
const persist = (lang) => {
  try { localStorage.setItem('language', lang); } catch {}
  document.cookie = `language=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
};

export const LanguageProvider = ({ children, initialLanguage = 'en' }) => {
  const [language, setLanguage] = useState(
    SUPPORTED.includes(initialLanguage) ? initialLanguage : 'en'
  );

  // مستخدمين قدام عندهم اللغة في localStorage بس (من غير كوكي) → نزامن مرة.
  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem('language'); } catch {}
    const hasCookie = document.cookie.split('; ').some((c) => c.startsWith('language='));
    if (saved && SUPPORTED.includes(saved) && saved !== language && !hasCookie) {
      setLanguage(saved);
      persist(saved);
    } else if (!hasCookie) {
      persist(language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeLanguage = useCallback((lang) => {
    if (SUPPORTED.includes(lang)) {          // ✅ يقبل en و ar و es
      setLanguage(lang);
      persist(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    changeLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, changeLanguage]);

  // value مثبّت (memo) → المكونات اللي بتستهلك الـ context مش بتتعمل لها
  // re-render غير لما اللغة نفسها تتغير فعلًا.
  const value = useMemo(
    () => ({ language, toggleLanguage, changeLanguage, isRTL: language === 'ar' }),
    [language, toggleLanguage, changeLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
