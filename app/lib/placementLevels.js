// ═══════════════════════════════════════════════
//  app/lib/placementLevels.js
//  جدول المستويات (Baremo) لاختبار تحديد المستوى (إسباني) — آمن للمتصفح والسيرفر
//  (مفيش فيه مفتاح إجابات).
//
//  النتيجة من 100 → المستوى (لكل اختبار جدول مستقل):
//    اختبار A1: أقل من 40 → Pre-A1 | 40–59 → A1.1 | 60–79 → A1.2 | 80–100 → A1.3
//    اختبار A2: أقل من 40 → Pre-A2 | 40–59 → A2.1 | 60–79 → A2.2 | 80–100 → A2.3
//    (تقسيم A2.1/A2.2/A2.3 تقسيم داخلي لـ Edumaster — مش معيار رسمي من MCER/Instituto Cervantes)
//  الكورسات الموصى بها = كورسات الموقع (إسباني) اللي مستواها نفس مستوى الطالب أو أعلى.
//  مستوى الكورس بيتقرا من اسمه/وسومه (A1.1, A1.2, A1.3, A2.1, B1, ...).
// ═══════════════════════════════════════════════

const A1_LEVELS = [
  {
    code: "Pre-A1",
    min: 0,
    max: 39,
    // أول كورس مناسب للطالب (من جدول "Recommended courses for you")
    nextCourseName: "Start A1.1",
    nextCode: "A1.1",
    desc: {
      es: "Aún no domina el vocabulario y las estructuras básicas. Empezar el curso A1.1 desde el principio.",
      en: "You don't yet master the basic vocabulary and structures. Start the A1.1 course from the beginning.",
      ar: "لم تتقن بعد المفردات والتراكيب الأساسية. ابدأ كورس A1.1 من البداية.",
    },
  },
  {
    code: "A1.1",
    min: 40,
    max: 59,
    nextCourseName: "Basic A1.2",
    nextCode: "A1.2",
    desc: {
      es: "Comprende y usa lo más básico (presentarse, datos personales, familia, gustos, precios, objetos). Le faltan rutinas, horarios, lugares y planes.",
      en: "You understand and use the basics (introducing yourself, personal details, family, likes, prices, objects). You still need routines, schedules, places and plans.",
      ar: "تفهم وتستخدم الأساسيات (التعريف بالنفس، البيانات الشخصية، العائلة، الأذواق، الأسعار، الأشياء). ما زلت بحاجة إلى الروتين والمواعيد والأماكن والخطط.",
    },
  },
  {
    code: "A1.2",
    min: 60,
    max: 79,
    nextCourseName: "Survival A1.3",
    nextCode: "A1.3",
    desc: {
      es: "Domina lo básico y empieza a manejar horarios, rutinas, tiempo, comida, lugares y planes. Equivale al 60 % del criterio DELE.",
      en: "You master the basics and are starting to handle schedules, routines, weather, food, places and plans. This equals the 60% DELE criterion.",
      ar: "تتقن الأساسيات وبدأت تتعامل مع المواعيد والروتين والطقس والطعام والأماكن والخطط. يعادل 60% من معيار DELE.",
    },
  },
  {
    code: "A1.3",
    min: 80,
    max: 100,
    nextCourseName: "Everyday A2.1",
    nextCode: "A2.1",
    desc: {
      es: "Listo para empezar A2.1 y para preparar el DELE A1 (que además evalúa expresión escrita y oral).",
      en: "Ready to start A2.1 and to prepare for the DELE A1 (which also assesses written and spoken expression).",
      ar: "جاهز لبدء A2.1 والتحضير لاختبار DELE A1 (الذي يقيّم أيضًا التعبير الكتابي والشفهي).",
    },
  },
];

// ───── جدول مستويات اختبار A2 ─────
// floorCode: أدنى مستوى كورس بنوصي بيه (الطالب تحت 40 محتاج يقوّي A1 الأول).
const A2_LEVELS = [
  {
    code: "Pre-A2",
    min: 0,
    max: 39,
    nextCourseName: "Review A1.3",
    nextCode: "A1.3",
    floorCode: "A1.3",
    desc: {
      es: "Aún no domina los contenidos de A2. Se recomienda reforzar los contenidos de A1 antes de empezar un curso A2.",
      en: "You don't yet master the A2 content. We recommend reinforcing A1 content before starting an A2 course.",
      ar: "لم تتقن بعد محتوى المستوى A2. يُنصح بتقوية محتوى A1 قبل بدء كورس A2.",
    },
  },
  {
    code: "A2.1",
    min: 40,
    max: 59,
    nextCourseName: "Continue A2.2",
    nextCode: "A2.2",
    desc: {
      es: "Se desenvuelve en situaciones cotidianas sencillas (mensajes breves, anuncios, compras, viajes). Le falta consolidar los tiempos del pasado, los pronombres y el vocabulario cotidiano. Nivel orientativo: A2.1.",
      en: "You handle simple everyday situations (short messages, notices, shopping, travel). You still need to consolidate past tenses, pronouns and everyday vocabulary. Indicative level: A2.1.",
      ar: "تتعامل مع المواقف اليومية البسيطة (الرسائل القصيرة، الإعلانات، التسوق، السفر). ما زلت بحاجة إلى تثبيت أزمنة الماضي والضمائر والمفردات اليومية. المستوى الإرشادي: A2.1.",
    },
  },
  {
    code: "A2.2",
    min: 60,
    max: 79,
    nextCourseName: "Advanced A2.3",
    nextCode: "A2.3",
    desc: {
      es: "Comprende textos y audios cotidianos y usa con bastante seguridad los tiempos del pasado y los pronombres. Nivel orientativo: A2.2.",
      en: "You understand everyday texts and audio and use past tenses and pronouns with fair confidence. Indicative level: A2.2.",
      ar: "تفهم النصوص والتسجيلات اليومية وتستخدم أزمنة الماضي والضمائر بثقة جيدة. المستوى الإرشادي: A2.2.",
    },
  },
  {
    code: "A2.3",
    min: 80,
    max: 100,
    nextCourseName: "Start B1.1",
    nextCode: "B1.1",
    desc: {
      es: "Domina los contenidos de A2. Nivel orientativo: A2.3; conviene confirmarlo con producción escrita y expresión oral antes de pasar a B1.",
      en: "You master the A2 content. Indicative level: A2.3; it should be confirmed with written and spoken production before moving on to B1.",
      ar: "تتقن محتوى A2. المستوى الإرشادي: A2.3؛ ويُفضَّل تأكيده بالتعبير الكتابي والشفهي قبل الانتقال إلى B1.",
    },
  },
];

// جداول المستويات لكل اختبار (المفتاح = id الاختبار في placementTests.js)
export const PLACEMENT_LEVELS_BY_TEST = { a1: A1_LEVELS, a2: A2_LEVELS };

// للتوافق مع الكود القديم: PLACEMENT_LEVELS = جدول A1
export const PLACEMENT_LEVELS = A1_LEVELS;
const ALL_LEVELS = [...A1_LEVELS, ...A2_LEVELS];

// ترتيب المستويات (للمقارنة): Pre-A1=0 ... C2
const LEVEL_ORDER = [
  "Pre-A1",
  "A1.1",
  "A1.2",
  "A1.3",
  "A2.1",
  "A2.2",
  "A2.3",
  "B1.1",
  "B1.2",
  "B1.3",
  "B2.1",
  "B2.2",
  "B2.3",
  "C1.1",
  "C1.2",
  "C1.3",
  "C2.1",
  "C2.2",
  "C2.3",
];

export function levelRank(code) {
  return LEVEL_ORDER.indexOf(code);
}

// testId: "a1" (الافتراضي) | "a2" — كل اختبار له جدول مستويات
export function getLevelByPercent(percent, testId = "a1") {
  const levels = PLACEMENT_LEVELS_BY_TEST[testId] || A1_LEVELS;
  const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  return levels.find((l) => p >= l.min && p <= l.max) || levels[0];
}

// أكواد المستويات فريدة عبر الاختبارين (Pre-A1 / A1.x / Pre-A2 / A2.x) فمش محتاجين testId هنا
export function getLevelByCode(code) {
  return ALL_LEVELS.find((l) => l.code === code) || null;
}

// بيطلّع كود المستوى من نص (اسم الكورس/وسومه...). بيرجّع كود من LEVEL_ORDER أو null.
//   "A1.2" → "A1.2" · "A2" → "A2.1" · "B1" → "B1.1" · "A1" → "A1.1"
export function detectLevelCode(text) {
  if (!text) return null;
  const m = String(text).match(/\b([ABC][12])(?:\s*[.\-_]\s*([123]))?(?![0-9])/i);
  if (!m) return null;
  const base = m[1].toUpperCase();
  const sub = m[2] || "1";
  const code = `${base}.${sub}`;
  return LEVEL_ORDER.includes(code) ? code : null;
}

// احتياطي لو الكورس مالوش كود في اسمه: بنستخدم حقل level القديم (beginner/intermediate/advanced).
export function fallbackLevelFromEnum(level) {
  if (level === "advanced") return "B2.1";
  if (level === "intermediate") return "B1.1";
  return "A1.1";
}

// أنهي اختبار تحديد مستوى بيظهر على الكورس ده؟ "a1" لكورسات A1 (Start A1.1 / Basic A1.2 /
// Survival A1.3...) و"a2" لكورسات A2 (A2.1 / A2.2 / A2.3...) وإلا null (مفيش زرار اختبار).
// بيقرا الكود من اسم الكورس (كل اللغات) أو الـ slug أو الوسوم. course = الكورس الخام جاي من
// /api/courses. (مفيش import لبيانات الاختبارات هنا عشان صفحات الكورسات متتقلش.)
export function getPlacementTestForCourse(course) {
  if (!course) return null;
  const i18nTitles = Object.values(course.i18n || {}).map((x) => x?.title);
  const names = [course.title, course.slug, ...(course.tags || []), ...i18nTitles];
  for (const n of names) {
    const code = detectLevelCode(n);
    if (code) {
      if (code.startsWith("A1.")) return "a1";
      if (code.startsWith("A2.")) return "a2";
      return null;
    }
  }
  return null;
}

// رابط صفحة الاختبار حسب id الاختبار
export function getPlacementTestPath(testId) {
  return testId === "a2" ? "/spanish-test/a2" : "/spanish-test";
}

// (قديم) هل الكورس ده من كورسات A1 بس؟ — متسيب للتوافق.
export function isPlacementTestCourse(course) {
  return getPlacementTestForCourse(course) === "a1";
}
