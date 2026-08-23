// jest.config.mjs
//
// 🆕 كان مفيش jest config خالص في المشروع — ملف app/lib/access.test.js
// كان موجود بس مش قابل للتشغيل فعليًا (jest مش devDependency، ومفيش
// "test" script في package.json). استخدمنا next/jest بدل إعداد Babel/
// module-mapper يدويًا، لأنه بيتعامل تلقائيًا مع كل حاجة Next.js-specific
// (path alias "@/*" من jsconfig.json، CSS imports، إلخ) من غير ما نكرر
// إعداد موجود أصلًا في next.config.mjs.

import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // مسار جذر المشروع، عشان next/jest يلاقي next.config.mjs و.env files
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "node",
  // 🆕 next/jest المفروض يقرأ "@/*" من jsconfig.json تلقائيًا، لكن في
  // النسخة الحالية من Next.js ده مبيحصلش (اتأكدنا فعليًا بتشغيل الاختبارات:
  // jest.mock('@/app/lib/models', ...) في access.test.js كان بيفشل بـ
  // "Cannot find module"). بنضيف الـ mapping يدويًا هنا كحل أضمن مايعتمدش
  // على سلوك ضمني ممكن يتغيّر بين نسخ Next.js.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // 🆕 ملفات الاختبار: كل ملف *.test.js تحت app/ (زي access.test.js
  // وmeetingPhase.test.js) — مش محتاجين jsdom لأننا بنختبر منطق سيرفر/lib
  // خالص دلوقتي، مش components. لو ضفنا اختبارات React مستقبلًا، ممكن
  // نستخدم testEnvironment: "jsdom" لملفات معينة عن طريق docblock
  // (`/** @jest-environment jsdom */`) في أول الملف.
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  clearMocks: true,
};

export default createJestConfig(customJestConfig);
