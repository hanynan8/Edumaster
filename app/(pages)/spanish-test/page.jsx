"use client";

// app/(pages)/spanish-test/page.jsx
//
// اختبار تحديد المستوى (إسباني) — Prueba de nivel (90 نقطة).
// بيتفتح من زرار "اختبر مستواك" اللي جمب سعر كل كورس إسباني (تصنيف Language).
//
// التدفق: بيانات الطالب → الأسئلة على مراحل (A1 → A2 → B1 → C1، وبعد كل مرحلة
// يقدر يكمّل أو ينهي) → عند الإنهاء الإجابات بتتبعت للسيرفر (POST /api/placement-tests)
// وبيتصحح هناك ويتسجّل للأدمن → رسالة "انتهى الاختبار" + دفع رسوم الاختبار (5$ بعملة
// لغة الموقع) بنفس نظام GetPayIn بتاع الكورسات → النتيجة بتظهر في صفحة النجاح بعد الدفع.
// 🔒 الدرجة مش بتوصل المتصفح قبل الدفع، ومفتاح الإجابات على السيرفر بس.

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  PLACEMENT_STAGES,
  PLACEMENT_TEST_FEE_USD,
  PLACEMENT_TEST_TITLE,
  getVisibleBlocks,
} from "@/app/lib/spanishPlacementTest";
import { convertPrice, formatPrice, getCurrencyForLanguage } from "@/app/lib/currency";

const PENDING_KEY = "spanishTestPending";

const STRINGS = {
  en: {
    title: "Spanish Level Test",
    name: "Full name",
    studentNumber: "Student number",
    email: "Email",
    start: "Start the test",
    required: "Please fill in all fields with a valid email",
    dontKnow: "No sé (I don't know)",
    next: "Continue",
    finish: "Finish the test",
    stageDone: "You've completed this level. Continue, or finish the test here.",
    stage: "Level",
    hardNote: "If the questions get too difficult, you can finish the test at the end of each level.",
    submitting: "Submitting your answers...",
    doneTitle: "The test has been completed successfully",
    doneBody: "To receive your result, you need to pay the test fee:",
    pay: "Pay & get my result",
    paying: "Redirecting to payment...",
    newTest: "Start a new test",
    submitError: "Something went wrong while submitting your answers, please try again",
    payError: "Couldn't start the payment, please try again",
  },
  ar: {
    title: "اختبار تحديد المستوى في الإسبانية",
    name: "الاسم بالكامل",
    studentNumber: "رقم الطالب",
    email: "البريد الإلكتروني",
    start: "ابدأ الاختبار",
    required: "من فضلك املأ كل الحقول وأدخل بريدًا إلكترونيًا صحيحًا",
    dontKnow: "No sé (لا أعرف)",
    next: "متابعة",
    finish: "إنهاء الاختبار",
    stageDone: "أنهيت هذا المستوى. يمكنك المتابعة أو إنهاء الاختبار هنا.",
    stage: "المستوى",
    hardNote: "لو الأسئلة بقت صعبة تقدر تنهي الاختبار في نهاية أي مستوى.",
    submitting: "جارٍ إرسال إجاباتك...",
    doneTitle: "تم انتهاء الاختبار بنجاح",
    doneBody: "لاستلام نتيجتك يجب دفع رسوم الاختبار:",
    pay: "ادفع واستلم نتيجتي",
    paying: "جارٍ التحويل لصفحة الدفع...",
    newTest: "ابدأ اختبارًا جديدًا",
    submitError: "حدث خطأ أثناء إرسال إجاباتك، حاول مرة أخرى",
    payError: "تعذّر بدء عملية الدفع، حاول مرة أخرى",
  },
  es: {
    title: "Prueba de nivel de español",
    name: "Nombre completo",
    studentNumber: "Número del estudiante",
    email: "Correo electrónico",
    start: "Empezar la prueba",
    required: "Completa todos los campos con un correo válido",
    dontKnow: "No sé",
    next: "Seguir",
    finish: "Terminar el examen",
    stageDone: "Has alcanzado otro nivel. Puedes seguir o terminar el examen aquí.",
    stage: "Nivel",
    hardNote: "Si encuentras las preguntas difíciles, puedes terminar el examen al final de cada nivel.",
    submitting: "Enviando tus respuestas...",
    doneTitle: "La prueba se ha completado con éxito",
    doneBody: "Para recibir tu resultado debes pagar la tarifa de la prueba:",
    pay: "Pagar y recibir mi resultado",
    paying: "Redirigiendo al pago...",
    newTest: "Empezar una nueva prueba",
    submitError: "Ocurrió un error al enviar tus respuestas, inténtalo de nuevo",
    payError: "No se pudo iniciar el pago, inténtalo de nuevo",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SpanishTestPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;

  const [step, setStep] = useState("intro"); // intro | quiz | submitting | pay
  const [info, setInfo] = useState({ name: "", number: "", email: "" });
  const [infoError, setInfoError] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [n]: optionIndex | -1 (no sé) }
  const [testId, setTestId] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // لو الطالب خلّص اختبار قبل كده وماكملش الدفع (رجع من صفحة فشل الدفع مثلًا)
  // نرجّعه مباشرة لخطوة الدفع بدل ما يعيد الاختبار.
  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (pending?.id) {
        setTestId(pending.id);
        setStep("pay");
      }
    } catch {}
  }, []);

  const stages = useMemo(
    () =>
      PLACEMENT_STAGES.map((s) => ({ ...s, blocks: getVisibleBlocks(s) })).filter((s) =>
        s.blocks.some((b) => b.questions.length)
      ),
    []
  );

  const currency = getCurrencyForLanguage(language);
  const feeLabel = formatPrice(convertPrice(PLACEMENT_TEST_FEE_USD, "USD", currency), currency, language);

  function start() {
    if (!info.name.trim() || !info.number.trim() || !EMAIL_RE.test(info.email.trim())) {
      return setInfoError(true);
    }
    setInfoError(false);
    setStep("quiz");
  }

  async function submitTest() {
    setError("");
    setStep("submitting");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await fetch("/api/placement-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: info.name.trim(),
          studentNumber: info.number.trim(),
          email: info.email.trim(),
          language,
          answers,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error("submit_failed");
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({ id: data.id })); } catch {}
      setTestId(data.id);
      setStep("pay");
    } catch {
      setError(t.submitError);
      setStep("quiz");
    }
  }

  async function startPayment() {
    setError("");
    setPaying(true);
    try {
      const res = await fetch("/api/payments/getpayin/placement-test-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, language }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.redirectUrl) throw new Error("checkout_failed");
      window.location.href = data.redirectUrl;
    } catch {
      setError(t.payError);
      setPaying(false);
    }
  }

  function startNew() {
    try { localStorage.removeItem(PENDING_KEY); } catch {}
    setAnswers({});
    setStageIdx(0);
    setTestId(null);
    setError("");
    setStep("intro");
  }

  const stage = stages[stageIdx];
  const isLast = stageIdx === stages.length - 1;
  const dir = isRTL ? "rtl" : "ltr";
  const btn = "px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60";
  const input =
    "mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A91]/20 focus:border-[#003A91]";

  return (
    <main dir={dir} className="min-h-screen bg-gray-50 pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{PLACEMENT_TEST_TITLE}</p>
        </div>

        {step === "intro" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">{t.name}</span>
              <input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">{t.studentNumber}</span>
              <input value={info.number} onChange={(e) => setInfo({ ...info, number: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">{t.email}</span>
              <input
                type="email"
                dir="ltr"
                value={info.email}
                onChange={(e) => setInfo({ ...info, email: e.target.value })}
                className={input}
              />
            </label>
            {infoError && <p className="text-sm text-red-500">{t.required}</p>}
            <p className="text-xs text-gray-400">{t.hardNote}</p>
            <button onClick={start} className={`${btn} bg-[#003A91] text-white`}>
              {t.start}
            </button>
          </div>
        )}

        {step === "quiz" && stage && (
          <div className="space-y-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#003A91]">
              {t.stage} {stage.id}
            </p>

            {stage.blocks.map((block, bi) => (
              <div key={bi} className="space-y-4">
                {block.audioSrc && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    {block.title && <p className="text-sm font-semibold text-gray-800 mb-3">{block.title}</p>}
                    <audio controls src={block.audioSrc} className="w-full" />
                  </div>
                )}

                {block.questions.map((q) => (
                  <div key={q.n} dir="ltr" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left">
                    <p className="text-sm font-semibold text-gray-900 mb-3">
                      {q.n}. {q.q}
                      {q.p > 1 && <span className="ml-2 text-[11px] font-bold text-[#003A91]">({q.p} pts)</span>}
                    </p>
                    <div className="space-y-2">
                      {[...q.o, null].map((opt, oi) => {
                        const value = opt === null ? -1 : oi;
                        const checked = answers[q.n] === value;
                        return (
                          <label
                            key={oi}
                            className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              checked ? "border-[#003A91] bg-[#003A91]/5" : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q${q.n}`}
                              checked={checked}
                              onChange={() => setAnswers({ ...answers, [q.n]: value })}
                            />
                            <span>{opt === null ? t.dontKnow : opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-3">
              {error && <p className="text-sm text-red-500 w-full">{error}</p>}
              {!isLast && <p className="text-sm text-gray-600 w-full">{t.stageDone}</p>}
              {!isLast && (
                <button
                  onClick={() => {
                    setStageIdx(stageIdx + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`${btn} bg-[#003A91] text-white`}
                >
                  {t.next}
                </button>
              )}
              <button
                onClick={submitTest}
                className={`${btn} ${isLast ? "bg-[#003A91] text-white" : "border border-gray-300 text-gray-700"}`}
              >
                {t.finish}
              </button>
            </div>
          </div>
        )}

        {step === "submitting" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
            {t.submitting}
          </div>
        )}

        {step === "pay" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{t.doneTitle}</h2>
            <p className="text-sm text-gray-600">{t.doneBody}</p>
            <p className="text-4xl font-black text-[#003A91]">{feeLabel}</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={startPayment} disabled={paying} className={`${btn} bg-[#003A91] text-white`}>
                {paying ? t.paying : t.pay}
              </button>
              <button onClick={startNew} disabled={paying} className={`${btn} border border-gray-300 text-gray-700`}>
                {t.newTest}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
