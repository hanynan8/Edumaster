// app/lib/currency.js
//
// 🆕 المصدر الوحيد للحقيقة بخصوص العملة في المشروع بعد إلغاء PayPal
// واعتماد Paymob بالكامل. كل كورس/خطة اشتراك سعره مخزّن بشكل منفصل لكل
// عملة من التلاتة المدعومة (EGP/USD/EUR) في الداتابيز — مفيش تحويل عملة
// وقت الدفع نفسه، ولا ربط ديناميكي بين الأسعار بعد الحفظ. العملة اللي
// المستخدم بيدفع بيها بتتحدد تلقائيًا حسب لغة الموقع الحالية (مش حسب
// موقعه الجغرافي أو أي حاجة تانية):
//
//   لغة الموقع = عربي (ar)  → EGP (جنيه مصري)
//   لغة الموقع = إنجليزي (en) → USD (دولار أمريكي)
//   لغة الموقع = إسباني (es) → EUR (يورو)
//
// 🆕 السطر الوحيد اللي فيه "تحويل تلقائي" هو مساعدة وقت إدخال السعر في
// فورم المدرس بس (CourseFormModal) — شوف EXCHANGE_RATES_TO_EGP وconvertPrice
// تحت: بيحسبوا اقتراح لباقي العملات وقت الكتابة، لكن القيمة النهائية
// اللي بتتحفظ لسه 3 أرقام منفصلة زي ما هي، والمدرس يقدر يعدّلها يدوي.
//
// ⚠️ ملاحظة مهمة عن Paymob: حساب Paymob (مصر) بيدعم EGP أساسًا. الدفع
// بالدولار/اليورو (USD/EUR) هيشتغل بس لو الحساب متفعّل عليه multi-currency
// من Paymob نفسها (إعداد إداري من عندهم، مش كود). لو مش مفعّل، أي محاولة
// دفع بعملة غير EGP هترجع خطأ من Paymob مباشرة — مش مشكلة في الكود هنا.

export const SUPPORTED_CURRENCIES = ["EGP", "USD", "EUR"];

// 🆕 سعر صرف تقريبي/يدوي (مش لايف من API خارجي) بيتستخدم بس عشان نساعد
// المدرس/الأدمن وقت إدخال سعر الكورس: يكتب سعر بعملة واحدة وباقي
// العملات التلاتة تتحسب تلقائيًا (وبالعكس — أي عملة يعدّلها هي اللي
// بتبقى "الأساس" وقت الحساب). القيمة المخزّنة النهائية في الداتابيز
// (Course.prices) لسه 3 أرقام منفصلة زي ما كانت بالظبط — الحساب ده
// اقتراح تلقائي في الفورم بس، والمدرس يقدر يعدّل أي رقم يدوي بعد كده لو
// عايز سعر مختلف عن سعر الصرف (بس لو رجع يعدّل نفس الحقل اللي حسب منه
// تاني، هيعيد حساب باقي العملات تاني ويكتب فوق أي تعديل يدوي كان حاططه).
//
// ⚠️ الأرقام دي تقريبية وممكن تحتاج تحديث بين فترة والتانية حسب سعر
// الصرف الفعلي — مفيش تكامل مع أي API لأسعار الصرف حاليًا في المشروع.
export const EXCHANGE_RATES_TO_EGP = {
  EGP: 1,
  USD: 48,
  EUR: 52,
};

// بيحوّل مبلغ من عملة لعملة تانية عن طريق EXCHANGE_RATES_TO_EGP، وبيقرّب
// الناتج لأقرب رقم صحيح (زي باقي الأسعار في المشروع، مفيش كسور عشرية).
export function convertPrice(amount, fromCurrency, toCurrency) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return 0;
  if (fromCurrency === toCurrency) return Math.round(amt);
  const fromRate = EXCHANGE_RATES_TO_EGP[fromCurrency];
  const toRate = EXCHANGE_RATES_TO_EGP[toCurrency];
  if (!fromRate || !toRate) return 0;
  return Math.round((amt * fromRate) / toRate);
}

// 🆕 خريطة لغة الموقع → عملة الدفع. أي لغة مش موجودة هنا بترجع للـ EGP
// (الافتراضي الآمن) بدل ما تفشل.
export const LANGUAGE_TO_CURRENCY = {
  ar: "EGP",
  en: "USD",
  es: "EUR",
};

export function getCurrencyForLanguage(language) {
  return LANGUAGE_TO_CURRENCY[language] || "EGP";
}

// كائن أسعار فاضي (كل العملات صفر) — بيتستخدم لكورس/خطة مجانية عشان
// نضمن شكل موحّد (EGP/USD/EUR) حتى لو مفيش سعر فعلي.
export function emptyPrices() {
  return { EGP: 0, USD: 0, EUR: 0 };
}

// بيتأكد إن كائن الأسعار الجاي من الـ client (body) شكله صح: أرقام موجبة
// بس للعملات التلاتة المدعومة، وأي حاجة تانية (نص، سالب، NaN، عملة مش
// مدعومة) بترجع 0 بدل ما تتقبل زي ما هي أو تكسر الحفظ في الداتابيز.
export function sanitizePrices(input) {
  const prices = emptyPrices();
  if (!input || typeof input !== "object") return prices;
  for (const currency of SUPPORTED_CURRENCIES) {
    const raw = Number(input[currency]);
    prices[currency] = Number.isFinite(raw) && raw > 0 ? raw : 0;
  }
  return prices;
}

// بياخد كائن prices (EGP/USD/EUR) ولغة الموقع، ويرجّع العملة والسعر
// المناسبين للدفع الفعلي بيهم. لو السعر المحدد لهذه العملة بالذات = 0
// (المدرس/الأدمن ماحطش سعر لها) بيفضل يرجعها زي ما هي (0) — الراوت اللي
// بينادي الدالة دي هو المسؤول يقرر هل ده يعتبر "مجاني" أو "غير متاح
// بالعملة دي" حسب السياق.
export function getPriceForCurrency(prices, language) {
  const currency = getCurrencyForLanguage(language);
  const amount = Number(prices?.[currency]) || 0;
  return { currency, amount };
}

// أسماء/رموز العملات للعرض في الواجهة (بالعربي والإنجليزي) — بتُستخدم في
// أي مكان بيعرض سعر للمستخدم (كارت كورس، صفحة تفاصيل، خطط الاشتراك...).
const CURRENCY_LABELS = {
  EGP: { ar: "جنيه", en: "EGP", es: "EGP" },
  USD: { ar: "دولار", en: "USD", es: "USD" },
  EUR: { ar: "يورو", en: "EUR", es: "EUR" },
};

export function getCurrencyLabel(currency, language = "en") {
  return CURRENCY_LABELS[currency]?.[language] || currency;
}

// بيفورمات سعر جاهز للعرض، مثلاً formatPrice(250, "EGP", "ar") → "250 جنيه"
export function formatPrice(amount, currency, language = "en") {
  const num = Number(amount) || 0;
  // أرقام صحيحة تتعرض من غير كسور عشرية (الأسعار هنا مبالغ كاملة —
  // بالجنيه/الدولار/اليورو، مش بالقروش/السنت، شوف Payment.amount للفرق).
  const formattedNum = Number.isInteger(num) ? num : num.toFixed(2);
  return `${formattedNum} ${getCurrencyLabel(currency, language)}`;
}