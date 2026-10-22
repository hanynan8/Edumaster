"use client";

// app/components/PlacementResult.jsx
//
// عرض نتيجة اختبار تحديد المستوى (إسباني): الدرجة من 100 + مستوى الطالب (حسب جدول
// المستويات) + الكورسات الموصى بها من كورسات الموقع (نفس مستوى الطالب وأعلى).
// بيُستخدم في صفحة الاختبار (اختبار مجاني) وفي صفحة نجاح الدفع (اختبار مدفوع).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AuthModal from "@/app/components/auth/authModel";
import PaymentGatewayModal from "@/app/components/payments/PaymentGatewayModal";
import PlacementReview from "@/app/components/PlacementReview";
import { getLevelByCode, getLevelByPercent } from "@/app/lib/placementLevels";
import { formatPrice } from "@/app/lib/currency";

const STRINGS = {
  ar: {
    yourScore: "درجتك",
    yourLevel: "مستواك",
    recommended: "كورسات مقترحة لك",
    recommendedHint: "كورسات من نفس مستواك وأعلى",
    bestFit: "الأنسب لك",
    free: "مجاني",
    none: "لا توجد كورسات منشورة حاليًا بهذا المستوى أو أعلى. تصفّح كل الكورسات:",
    browse: "تصفّح الكورسات",
    answered: "الأسئلة المُجاب عنها",
    emailSent: "أرسلنا نسخة من نتيجتك وإجاباتك مع التصحيح إلى بريدك:",
    buy: "اشترِ الآن",
    enrollFree: "سجّل مجانًا",
    working: "جارٍ التنفيذ...",
    buyError: "تعذّرت العملية، حاول مرة أخرى",
    ownCourse: "لا يمكنك شراء كورسك الخاص",
    notConfigured: "الدفع الإلكتروني غير متاح حاليًا",
  },
  en: {
    yourScore: "Your score",
    yourLevel: "Your level",
    recommended: "Recommended courses for you",
    recommendedHint: "Courses at your level and above",
    bestFit: "Best fit",
    free: "Free",
    none: "There are no published courses at your level or above yet. Browse all courses:",
    browse: "Browse courses",
    answered: "Answered",
    emailSent: "We emailed a copy of your result and answers with corrections to:",
    buy: "Buy now",
    enrollFree: "Enroll free",
    working: "Please wait...",
    buyError: "Something went wrong, please try again",
    ownCourse: "You can't buy your own course",
    notConfigured: "Online payment isn't available right now",
  },
  es: {
    yourScore: "Tu puntuación",
    yourLevel: "Tu nivel",
    recommended: "Cursos recomendados para ti",
    recommendedHint: "Cursos de tu nivel y superiores",
    bestFit: "Ideal para ti",
    free: "Gratis",
    none: "Aún no hay cursos publicados de tu nivel o superior. Explora todos los cursos:",
    browse: "Ver cursos",
    answered: "Respondidas",
    emailSent: "Te enviamos una copia de tu resultado y respuestas con correcciones a:",
    buy: "Comprar ahora",
    enrollFree: "Inscribirme gratis",
    working: "Espera...",
    buyError: "Algo salió mal, inténtalo de nuevo",
    ownCourse: "No puedes comprar tu propio curso",
    notConfigured: "El pago en línea no está disponible ahora",
  },
};

export default function PlacementResult({ result, language = "ar", children }) {
  const t = STRINGS[language] ?? STRINGS.en;
  // 🆕 اختبار مخصص (B1, B2...): الـ API بيرجّع معلومات المستوى جاهزة (levelInfo) لأن جدول A1/A2 مايعرفش Pre-B1 / B1.x
  const level = result?.levelInfo?.desc ? result.levelInfo : getLevelByCode(result?.level) || getLevelByPercent(result?.score);
  const desc = level.desc[language] ?? level.desc.en;
  const recommended = Array.isArray(result?.recommended) ? result.recommended : [];

  const router = useRouter();
  const { data: session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [gatewayCourse, setGatewayCourse] = useState(null); // كورس مدفوع مستني تأكيد الدفع
  const [busyId, setBusyId] = useState(null);
  const [buyError, setBuyError] = useState({ id: null, msg: "" });

  const fail = (id, error) =>
    setBuyError({
      id,
      msg:
        error === "cannot_enroll_own_course" ? t.ownCourse
        : error === "payment_gateway_not_configured" ? t.notConfigured
        : t.buyError,
    });

  // شراء/تسجيل من نفس كارت الكورس: نفس تدفق صفحة تفاصيل الكورس
  // (مدفوع → تأكيد الدفع ثم /api/payments/checkout، مجاني → /api/enrollments)
  async function handleBuy(c) {
    setBuyError({ id: null, msg: "" });
    if (!session?.user) {
      setAuthMode("login");
      return setAuthOpen(true);
    }
    if (!c.isFree && c.price > 0) return setGatewayCourse(c);
    setBusyId(c.id);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: c.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && data.error === "payment_required") {
        setBusyId(null);
        return setGatewayCourse(c);
      }
      if (!res.ok) throw new Error(data.error || "error");
      router.push(`/courses/${c.id}`);
    } catch (e) {
      fail(c.id, e.message);
      setBusyId(null);
    }
  }

  async function confirmPayment() {
    const c = gatewayCourse;
    if (!c) return;
    setGatewayCourse(null);
    setBusyId(c.id);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "course", id: c.id, language }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.error === "already_have_access") return router.push(`/courses/${c.id}`);
      if (!res.ok || !data.redirectUrl) throw new Error(data.error || "error");
      window.location.href = data.redirectUrl; // بنسيب الزرار معطّل لحد التحويل
    } catch (e) {
      fail(c.id, e.message);
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-[#003A91]/5 rounded-xl py-5 px-3">
            <p className="text-xs text-gray-500 mb-1">{t.yourScore}</p>
            <p className="text-5xl font-black text-[#003A91]" dir="ltr">
              {result.score}
              <span className="text-lg font-bold text-gray-400"> / {result.maxScore}</span>
            </p>
          </div>
          <div className="bg-[#003A91] rounded-xl py-5 px-3">
            <p className="text-xs text-white/70 mb-1">{t.yourLevel}</p>
            <p className="text-5xl font-black text-white" dir="ltr">{level.code}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
        {Number.isFinite(result.answeredCount) && (
          <p className="text-[11px] text-gray-400">
            {t.answered}: {result.answeredCount}/{result.totalQuestions}
          </p>
        )}
        {result?.emailSentTo && (
          <p className="text-xs text-gray-500">
            {t.emailSent}{" "}
            <span className="font-semibold text-gray-700" dir="ltr">{result.emailSentTo}</span>
          </p>
        )}
        {children}
      </div>

      {/* إجابات الطالب على كل سؤال مع التصحيح (مطوية افتراضيًا) */}
      <PlacementReview review={result?.review} language={language} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900">{t.recommended}</h2>
        <p className="text-xs text-gray-400 mt-0.5 mb-4">{t.recommendedHint}</p>

        {recommended.length === 0 ? (
          <p className="text-sm text-gray-500">
            {t.none}{" "}
            <Link href="/courses" className="font-bold text-[#003A91] underline">
              {t.browse}
            </Link>
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map((c) => {
              const isPaid = !c.isFree && c.price > 0;
              const busy = busyId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group flex flex-col rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
                    c.isNextStep ? "border-[#003A91]" : "border-gray-100"
                  }`}
                >
                  <Link href={`/courses/${c.id}`} className="block">
                    {c.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumbnail} alt={c.title} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-[#003A91]/5 flex items-center justify-center text-3xl font-black text-[#003A91]/30" dir="ltr">
                        {c.levelCode}
                      </div>
                    )}
                  </Link>
                  <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#003A91]/10 text-[#003A91]" dir="ltr">
                        {c.levelCode}
                      </span>
                      {c.isNextStep && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                          {t.bestFit}
                        </span>
                      )}
                    </div>
                    <Link href={`/courses/${c.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#003A91] line-clamp-2">
                      {c.title}
                    </Link>
                    {c.shortDescription && <p className="text-xs text-gray-500 line-clamp-2">{c.shortDescription}</p>}

                    <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-gray-900">
                        {isPaid ? formatPrice(c.price, c.currency, language) : t.free}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBuy(c)}
                        disabled={busy}
                        className="inline-flex items-center justify-center bg-[#003A91] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-60"
                      >
                        {busy ? t.working : isPaid ? t.buy : t.enrollFree}
                      </button>
                    </div>
                    {buyError.id === c.id && <p className="text-[11px] text-red-500">{buyError.msg}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {authOpen && (
        <AuthModal mode={authMode} onClose={() => setAuthOpen(false)} onSwitch={(next) => setAuthMode(next)} />
      )}
      {gatewayCourse && (
        <PaymentGatewayModal
          amount={gatewayCourse.price}
          currency={gatewayCourse.currency}
          disabled={busyId === gatewayCourse.id}
          onClose={() => setGatewayCourse(null)}
          onConfirm={confirmPayment}
        />
      )}
    </div>
  );
}
