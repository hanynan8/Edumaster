// PATH: app/lib/serviceUtils.js
//
// منطق مشترك بين: كروت الخدمات في الهوم (ServicesSection)، صفحة /services،
// وصفحة الخدمة المخصصة /services/[slug].
// كل خدمة ليها slug مشتق من الـ id الحقيقي بتاعها في الداتابيز، فأي خدمة
// الأدمن يضيفها بتاخد صفحة مخصصة تلقائيًا من غير ما نعدّل الكود.

// مفاتيح الترجمة اللي مختلفة عن الـ id الحقيقي للخدمة (نفس ID_MAP القديمة)
export const SERVICE_ID_MAP = {
  "Study in Spain": "study-spain",
  "Visa Services": "visa",
  "language Courses": "language",
};

// id الخدمة → slug صالح للـ URL (حروف صغيرة + شرطات)
// مثال: "Study in Spain" → "study-in-spain"
export function slugifyServiceId(id) {
  return String(id ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// لينك صفحة الخدمة المخصصة
export function serviceHref(id) {
  return `/services/${slugifyServiceId(id)}`;
}

// خدمتي Study in Spain / Study in Romania بيروحوا لصفحات الدول المخصصة
// (/countries/spain و /countries/romania) بدل صفحة /services/<slug>.
// بنعتمد على الـ id الأول وكاحتياط على العنوان بالـ 3 لغات.
export function getCountryIdForService(service) {
  const id = String(service?.id ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const title = String(service?.title ?? "");
  if (id.includes("romania") || /romania|رومانيا|rumanía|rumania/i.test(title)) return "romania";
  if (id.includes("spain") || /spain|إسبانيا|اسبانيا|españa/i.test(title)) return "spain";
  return null;
}

// لينك الكارت في الهوم: صفحة الدولة لو الخدمة Spain/Romania، وإلا صفحة الخدمة
export function serviceCardHref(service) {
  const country = getCountryIdForService(service);
  return country ? `/countries/${country}` : serviceHref(service?.id);
}

export const TRANSLATION_SERVICE_ID = "translation";
export const LANGUAGE_SERVICE_IDS = new Set(["language Courses", "language"]);
export const SCHOLARSHIP_SERVICE_IDS = new Set(["Scholarships", "scholarships"]);

// خدمة الـ Call Center (الـ id الافتراضي "career") — بنطبّع الـ id عشان يمسك
// أي كتابة زي "career" أو "call-center" أو "Call Center".
export function isCallCenterServiceId(id) {
  const key = String(id ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  return key === "career" || key.includes("callcenter");
}

// قيمة الخدمة اللي بتتبعت لصفحة /quick-inquiry (?service=...). بتعتمد على
// الـ id الأول وكاحتياط على العنوان بالـ 3 لغات. بترجّع null للخدمات اللي
// مش مشمولة.
export function getQuickInquiryService(service) {
  const id = String(service?.id ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const title = String(service?.title ?? "");
  const has = (idPart, titleRe) => id.includes(idPart) || titleRe.test(title);

  if (service?.id === TRANSLATION_SERVICE_ID) return "translation";
  if (SCHOLARSHIP_SERVICE_IDS.has(service?.id) || has("scholarship", /scholarship|منح|beca/i)) return "scholarships";
  if (has("romania", /romania|رومانيا|rumanía|rumania/i)) return "study-romania";
  if (has("spain", /spain|إسبانيا|اسبانيا|españa/i)) return "study-spain";
  if (has("admission", /admission|القبول|admisi/i)) return "admissions";
  if (has("visa", /visa|تأشيرة|visado/i)) return "visa";
  return null;
}

// نوع الخدمة — بيحدد أزرار الصفحة المخصصة (نفس منطق ServiceRow في /services)
export function getServiceKind(service) {
  if (isCallCenterServiceId(service?.id)) return "callcenter";
  if (LANGUAGE_SERVICE_IDS.has(service?.id)) return "language";
  if (SCHOLARSHIP_SERVICE_IDS.has(service?.id)) return "scholarship";
  if (service?.id === TRANSLATION_SERVICE_ID) return "translation";
  return "standard";
}

// بيدمج بيانات الخدمة الأساسية (صورة/لون/لينك) مع ترجمتها حسب اللغة
export function mergeService(svc, t) {
  const i18nKey = SERVICE_ID_MAP[svc.id] ?? svc.id;
  return { ...svc, ...(t?.services?.[i18nKey] ?? {}) };
}

// 🆕 لون موحّد لكل الخدمات: بناخد لون خدمة Study in Spain كمرجع (الزرار الأساسي
// وشريط الصورة) وبنطبّقه على باقي الخدمات. لو مفيش Spain بنرجع للأزرق الأساسي.
export const BRAND_COLOR = "#003A91";
export function getUnifiedServiceColor(services = []) {
  const spain = (services || []).find((s) => getCountryIdForService(s) === "spain");
  return spain?.color || BRAND_COLOR;
}

// 🆕 وصف خدمة اللغات: "professional English" → "professional language skills"
// (بدل ما يتكلم عن الإنجليزي بس). بيتطبّق وقت العرض عشان يشتغل حتى لو النص
// القديم لسه متخزّن في الداتابيز.
export function fixLanguageDesc(desc, lang) {
  if (typeof desc !== "string") return desc;
  if (lang === "ar") return desc.replace(/اللغة الإنجليزية المهنية|الإنجليزية المهنية|إنجليزيتك المهنية/g, "مهاراتك اللغوية المهنية");
  if (lang === "es") return desc.replace(/tu inglés profesional|el inglés profesional|inglés profesional/gi, "tus habilidades lingüísticas profesionales");
  return desc.replace(/professional English/gi, "professional language skills");
}