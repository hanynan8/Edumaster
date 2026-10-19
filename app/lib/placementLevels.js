// ═══════════════════════════════════════════════
//  app/lib/placementLevels.js
//  جدول المستويات (Baremo) لاختبار تحديد المستوى (إسباني) — آمن للمتصفح والسيرفر
//  (مفيش فيه مفتاح إجابات).
//
//  النتيجة من 100 → المستوى:
//    أقل من 40  → Pre-A1   |  40–59 → A1.1  |  60–79 → A1.2  |  80–100 → A1.3
//  الكورسات الموصى بها = كورسات الموقع (إسباني) اللي مستواها نفس مستوى الطالب أو أعلى.
//  مستوى الكورس بيتقرا من اسمه/وسومه (A1.1, A1.2, A1.3, A2.1, B1, ...).
// ═══════════════════════════════════════════════

export const PLACEMENT_LEVELS = [
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

export function getLevelByPercent(percent) {
  const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  return PLACEMENT_LEVELS.find((l) => p >= l.min && p <= l.max) || PLACEMENT_LEVELS[0];
}

export function getLevelByCode(code) {
  return PLACEMENT_LEVELS.find((l) => l.code === code) || null;
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

// هل الكورس ده من كورسات A1 (Start A1.1 / Basic A1.2 / Survival A1.3...) — يعني الكورس
// اللي بيظهر عليه زرار "اختبر مستواك" (اختبار A1)؟ بيقرا الكود من اسم الكورس (كل اللغات)
// أو الـ slug أو الوسوم. course = الكورس الخام جاي من /api/courses.
export function isPlacementTestCourse(course) {
  if (!course) return false;
  const i18nTitles = Object.values(course.i18n || {}).map((x) => x?.title);
  const names = [course.title, course.slug, ...(course.tags || []), ...i18nTitles];
  for (const n of names) {
    const code = detectLevelCode(n);
    if (code) return code.startsWith("A1.");
  }
  return false;
}
