"use client";

// app/(pages)/spanish-test/page.jsx
//
// اختبار تحديد المستوى (إسباني) — Prueba de nivel de español A1 (100 نقطة).
// بيتفتح من زرار "اختبر مستواك" اللي جمب سعر كل كورس إسباني (تصنيف Language).
//
// التدفق: بيانات الطالب → 3 أجزاء (قراءة، استماع، قواعد ومفردات) → عند الإنهاء الإجابات
// بتتبعت للسيرفر (POST /api/placement-tests) وبيتصحح هناك ويتسجّل للأدمن →
// النتيجة من 100 + مستوى الطالب (Pre-A1 / A1.1 / A1.2 / A1.3) + الكورسات الموصى بها
// (نفس مستواه وأعلى).
// 🆓 الاختبار الحالي مجاني (PLACEMENT_TEST_IS_FREE في lib/spanishPlacementTest.js): النتيجة
// بتظهر لحظيًا. لو اتغيّرت لـ false بيرجع التدفق المدفوع (دفع رسوم الاختبار ثم النتيجة
// في صفحة النجاح).
// 🔒 مفتاح الإجابات على السيرفر بس.
// 🎧 مهام الاستماع بتظهر لما يتحط لها audioSrc في lib/spanishPlacementTest.js.

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  PLACEMENT_TEST_FEE_USD,
  PLACEMENT_TEST_IS_FREE,
  PLACEMENT_TEST_TITLE,
  getVisibleParts,
} from "@/app/lib/spanishPlacementTest";
import { convertPrice, formatPrice, getCurrencyForLanguage } from "@/app/lib/currency";
import PlacementResult from "@/app/components/PlacementResult";

const PENDING_KEY = "spanishTestPending";

const STRINGS = {
  en: {
    title: "Spanish Level Test",
    name: "Full name",
    email: "Email",
    start: "Start the test",
    required: "Please fill in all fields with a valid email",
    intro: "This test has three parts: reading, listening, and grammar & vocabulary. Choose one answer for each question. There is no penalty for wrong answers, so if you're unsure, pick an option. Don't use a dictionary.",
    part: "Part",
    min: "min",
    audioNote: "You will hear each audio twice.",
    next: "Continue",
    back: "Back",
    finish: "Finish the test",
    unanswered: "Unanswered questions",
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
    email: "البريد الإلكتروني",
    start: "ابدأ الاختبار",
    required: "من فضلك املأ كل الحقول وأدخل بريدًا إلكترونيًا صحيحًا",
    intro: "الاختبار من ثلاثة أجزاء: القراءة، الاستماع، القواعد والمفردات. اختر إجابة واحدة لكل سؤال. لا يوجد خصم على الإجابة الخاطئة، فإن لم تكن متأكدًا اختر أي خيار. لا تستخدم القاموس.",
    part: "الجزء",
    min: "دقيقة",
    audioNote: "ستسمع كل مقطع صوتي مرتين.",
    next: "متابعة",
    back: "رجوع",
    finish: "إنهاء الاختبار",
    unanswered: "أسئلة بدون إجابة",
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
    email: "Correo electrónico",
    start: "Empezar la prueba",
    required: "Completa todos los campos con un correo válido",
    intro: "Esta prueba tiene tres partes: lectura, auditiva, y gramática y vocabulario. Marca una sola respuesta en cada pregunta. No se resta por error: si dudas, elige una opción. No uses diccionario.",
    part: "Parte",
    min: "min",
    audioNote: "Escucharás cada audio dos veces.",
    next: "Seguir",
    back: "Atrás",
    finish: "Terminar el examen",
    unanswered: "Preguntas sin responder",
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
const LETTERS = "abcdefghijk";

export default function SpanishTestPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;

  const [step, setStep] = useState("intro"); // intro | quiz | submitting | result (مجاني) | pay (مدفوع)
  const [info, setInfo] = useState({ name: "", email: "" });
  const [infoError, setInfoError] = useState(false);
  const [partIdx, setPartIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [n]: optionIndex }
  const [testId, setTestId] = useState(null);
  const [result, setResult] = useState(null); // اختبار مجاني: النتيجة اللحظية
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // لو الطالب خلّص اختبار قبل كده وماكملش الدفع (رجع من صفحة فشل الدفع مثلًا)
  // نرجّعه مباشرة لخطوة الدفع بدل ما يعيد الاختبار.
  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (!PLACEMENT_TEST_IS_FREE && pending?.id) {
        setTestId(pending.id);
        setStep("pay");
      }
    } catch {}
  }, []);

  // 🎧 روابط الصوتيات اللي الأدمن رفعها (مهام الاستماع بتظهر لما صوتها يتّرفع)
  const [audio, setAudio] = useState({});
  useEffect(() => {
    fetch("/api/placement-tests/audio")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.audio && setAudio(d.audio))
      .catch(() => {});
  }, []);

  const parts = useMemo(() => getVisibleParts(audio), [audio]);
  const allQuestions = useMemo(
    () => parts.flatMap((p) => p.tasks.flatMap((tk) => tk.questions)),
    [parts]
  );

  const currency = getCurrencyForLanguage(language);
  const feeLabel = formatPrice(convertPrice(PLACEMENT_TEST_FEE_USD, "USD", currency), currency, language);

  function start() {
    if (!info.name.trim() || !EMAIL_RE.test(info.email.trim())) {
      return setInfoError(true);
    }
    setInfoError(false);
    setStep("quiz");
  }

  function goPart(idx) {
    setPartIdx(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          email: info.email.trim(),
          language,
          answers,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error("submit_failed");
      setTestId(data.id);
      // 🆓 اختبار مجاني: النتيجة بتظهر فورًا من غير دفع
      if (PLACEMENT_TEST_IS_FREE && data.free && Number.isFinite(data.score)) {
        try { localStorage.removeItem(PENDING_KEY); } catch {}
        setResult(data);
        setStep("result");
        return;
      }
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({ id: data.id })); } catch {}
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
    setPartIdx(0);
    setTestId(null);
    setResult(null);
    setError("");
    setStep("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const part = parts[partIdx];
  const isLast = partIdx === parts.length - 1;
  const unansweredCount = allQuestions.filter((q) => answers[q.n] === undefined).length;
  const dir = isRTL ? "rtl" : "ltr";
  const btn = "px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60";
  const input =
    "mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A91]/20 focus:border-[#003A91]";

  return (
    <main dir={dir} className="min-h-screen bg-gray-50 pt-28 pb-16 px-4">
      <div className={`${step === "result" ? "max-w-6xl" : "max-w-3xl"} mx-auto`}>
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
            <p className="text-xs text-gray-500 leading-relaxed">{t.intro}</p>
            <button onClick={start} className={`${btn} bg-[#003A91] text-white`}>
              {t.start}
            </button>
          </div>
        )}

        {step === "quiz" && part && (
          <div className="space-y-5">
            {/* شريط الأجزاء */}
            <div className="flex items-center gap-2" dir="ltr">
              {parts.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex-1 h-1.5 rounded-full ${i <= partIdx ? "bg-[#003A91]" : "bg-gray-200"}`}
                />
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#003A91]" dir="ltr">
              {t.part} {partIdx + 1}/{parts.length} · {part.title} · {part.minutes} {t.min}
            </p>

            {part.tasks.map((task, ti) => (
              <div key={ti} className="space-y-4" dir="ltr">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3">
                  <p className="text-sm font-bold text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-600">{task.intro}</p>

                  {task.audioSrc && (
                    <div>
                      <audio controls src={task.audioSrc} className="w-full" />
                      <p className="text-[11px] text-gray-400 mt-1">{t.audioNote}</p>
                    </div>
                  )}

                  {task.passage && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm text-gray-800 whitespace-pre-line">
                      {task.passage}
                    </div>
                  )}

                  {task.bank && (
                    <ul className="space-y-1.5">
                      {task.bank.map((b) => (
                        <li key={b.l} className="flex gap-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                          <span className="font-black text-[#003A91] shrink-0">{b.l}.</span>
                          <span>{b.t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {task.questions.map((q) => (
                  <div key={q.n} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left">
                    {q.ctx && (
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3">{q.ctx}</p>
                    )}
                    <p className="text-sm font-semibold text-gray-900 mb-3">
                      {q.ln}. {q.q}
                    </p>

                    {task.bank ? (
                      // أسئلة الربط: حروف (A, B, C...) — النصوص فوق في القائمة
                      <div className="flex flex-wrap gap-2">
                        {q.o.map((letter, oi) => {
                          const checked = answers[q.n] === oi;
                          return (
                            <button
                              key={letter}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.n]: oi })}
                              className={`w-10 h-10 rounded-lg border text-sm font-bold transition-colors ${
                                checked
                                  ? "border-[#003A91] bg-[#003A91] text-white"
                                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.o.map((opt, oi) => {
                          const checked = answers[q.n] === oi;
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
                                onChange={() => setAnswers({ ...answers, [q.n]: oi })}
                              />
                              <span>
                                <span className="font-bold text-gray-500">{LETTERS[oi]})</span> {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-3">
              {error && <p className="text-sm text-red-500 w-full">{error}</p>}
              {isLast && unansweredCount > 0 && (
                <p className="text-xs text-amber-600 w-full">
                  {t.unanswered}: {unansweredCount}
                </p>
              )}
              {partIdx > 0 && (
                <button onClick={() => goPart(partIdx - 1)} className={`${btn} border border-gray-300 text-gray-700`}>
                  {t.back}
                </button>
              )}
              {!isLast ? (
                <button onClick={() => goPart(partIdx + 1)} className={`${btn} bg-[#003A91] text-white`}>
                  {t.next}
                </button>
              ) : (
                <button onClick={submitTest} className={`${btn} bg-[#003A91] text-white`}>
                  {t.finish}
                </button>
              )}
            </div>
          </div>
        )}

        {step === "submitting" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
            {t.submitting}
          </div>
        )}

        {step === "result" && result && (
          <PlacementResult result={result} language={language}>
            <button onClick={startNew} className={`${btn} border border-gray-300 text-gray-700`}>
              {t.newTest}
            </button>
          </PlacementResult>
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
