"use client";

// app/components/SpanishTestRunner.jsx
//
// واجهة اختبار تحديد المستوى (إسباني) — Prueba de nivel de español (100 نقطة).
// 🆕 مشتركة بين الاختبارين: <SpanishTestRunner testId="a1" /> (صفحة /spanish-test) و
// <SpanishTestRunner testId="a2" /> (صفحة /spanish-test/a2). كان الكود ده جوه
// app/(pages)/spanish-test/page.jsx واتنقل هنا من غير تغيير في منطق A1.
// بيتفتح من زرار "اختبر مستواك" اللي جمب سعر كل كورس إسباني (تصنيف Language):
// كورسات A1 → اختبار A1، كورسات A2 → اختبار A2 (شوف getPlacementTestForCourse).
//
// 🔐 لازم تسجيل دخول: بيانات الطالب (الاسم/الإيميل/الرقم) بتتاخد تلقائيًا من الـ session
// (مفيش إدخال يدوي). غير المسجّل بيتفتحله الـ Login قبل ما الاختبار يبدأ.
//
// التدفق: (تسجيل دخول) → 3 أجزاء (قراءة، استماع، قواعد ومفردات) → عند الإنهاء الإجابات
// بتتبعت للسيرفر (POST /api/placement-tests) وبيتصحح هناك ويتسجّل للأدمن (باسم ورقم
// وإيميل الطالب من حسابه) →
// النتيجة من 100 + مستوى الطالب (Pre-A1 / A1.1 / A1.2 / A1.3) + الكورسات الموصى بها
// (نفس مستواه وأعلى).
// 🆓 الاختبار الحالي مجاني (PLACEMENT_TEST_IS_FREE في lib/spanishPlacementTest.js): النتيجة
// بتظهر لحظيًا. لو اتغيّرت لـ false بيرجع التدفق المدفوع (دفع رسوم الاختبار ثم النتيجة
// في صفحة النجاح).
// 🔒 مفتاح الإجابات على السيرفر بس.
// 🎧 مهام الاستماع بتظهر لما يتحط لها audioSrc في lib/spanishPlacementTest.js.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import { PLACEMENT_TEST_FEE_USD, PLACEMENT_TEST_IS_FREE } from "@/app/lib/spanishPlacementTest";
import { getPlacementTest, getVisiblePartsFor, normalizeTestId } from "@/app/lib/placementTests";
import { convertPrice, formatPrice, getCurrencyForLanguage } from "@/app/lib/currency";
import PlacementResult from "@/app/components/PlacementResult";

// مفتاح الدفع المعلّق (للاختبار المدفوع بس) — A1 بيفضل بنفس المفتاح القديم، وA2 له مفتاح مستقل
const pendingKeyFor = (testId) => (testId === "a1" ? "spanishTestPending" : `spanishTestPending_${testId}`);

const STRINGS = {
  en: {
    title: "Spanish Level Test",
    name: "Name",
    email: "Email",
    phone: "Phone",
    start: "Start the test",
    takingAs: "You will take this test with your account details:",
    loginTitle: "Please log in to start the test",
    loginBody: "Your name, phone and email are taken from your account and saved with your result.",
    loginBtn: "Log in",
    checking: "Checking your account...",
    sessionExpired: "Your session has expired. Please log in again — your answers are still saved on this page.",
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
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    start: "ابدأ الاختبار",
    takingAs: "ستدخل الاختبار ببيانات حسابك:",
    loginTitle: "سجّل دخولك أولًا لبدء الاختبار",
    loginBody: "اسمك ورقمك وبريدك الإلكتروني بتُؤخذ تلقائيًا من حسابك وتُسجَّل مع نتيجتك.",
    loginBtn: "تسجيل الدخول",
    checking: "جارٍ التحقق من حسابك...",
    sessionExpired: "انتهت جلستك. سجّل دخولك مرة أخرى — إجاباتك ما زالت محفوظة في هذه الصفحة.",
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
    name: "Nombre",
    email: "Correo electrónico",
    phone: "Teléfono",
    start: "Empezar la prueba",
    takingAs: "Harás la prueba con los datos de tu cuenta:",
    loginTitle: "Inicia sesión para empezar la prueba",
    loginBody: "Tu nombre, teléfono y correo se toman de tu cuenta y se guardan con tu resultado.",
    loginBtn: "Iniciar sesión",
    checking: "Verificando tu cuenta...",
    sessionExpired: "Tu sesión ha expirado. Inicia sesión de nuevo — tus respuestas siguen guardadas en esta página.",
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

const LETTERS = "abcdefghijk";

export default function SpanishTestRunner({ testId: testIdProp = "a1" }) {
  const testId = normalizeTestId(testIdProp);
  const test = getPlacementTest(testId);
  const PENDING_KEY = pendingKeyFor(testId);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;

  // 🔐 بيانات الطالب (الاسم/الإيميل/الرقم) بتيجي من الـ session — مفيش إدخال يدوي.
  const { data: session, status: sessionStatus } = useSession();
  const user = session?.user ?? null;
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const autoPrompted = useRef(false);

  const [step, setStep] = useState("intro"); // intro | quiz | submitting | result (مجاني) | pay (مدفوع)
  const [partIdx, setPartIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [n]: optionIndex }
  const [resultId, setResultId] = useState(null); // id نتيجة الاختبار اللي اتسجّلت على السيرفر
  const [result, setResult] = useState(null); // اختبار مجاني: النتيجة اللحظية
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // لو الطالب خلّص اختبار قبل كده وماكملش الدفع (رجع من صفحة فشل الدفع مثلًا)
  // نرجّعه مباشرة لخطوة الدفع بدل ما يعيد الاختبار.
  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (!PLACEMENT_TEST_IS_FREE && pending?.id) {
        setResultId(pending.id);
        setStep("pay");
      }
    } catch {}
  }, []);

  // 🎧 روابط الصوتيات اللي الأدمن رفعها (مهام الاستماع بتظهر لما صوتها يتّرفع)
  const [audio, setAudio] = useState({});
  useEffect(() => {
    fetch(`/api/placement-tests/audio?test=${testId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.audio && setAudio(d.audio))
      .catch(() => {});
  }, [testId]);

  const parts = useMemo(() => getVisiblePartsFor(testId, audio), [testId, audio]);
  const allQuestions = useMemo(
    () => parts.flatMap((p) => p.tasks.flatMap((tk) => tk.questions)),
    [parts]
  );

  const currency = getCurrencyForLanguage(language);
  const feeLabel = formatPrice(convertPrice(PLACEMENT_TEST_FEE_USD, "USD", currency), currency, language);

  function openLogin() {
    setAuthMode("login");
    setAuthOpen(true);
  }

  // غير مسجّل دخول → نفتح له الـ Login تلقائيًا أول ما الصفحة تفتح (مرة واحدة)؛
  // لو قفله، بيفضل كارت "سجّل دخولك" وزرار يفتحه تاني.
  useEffect(() => {
    if (sessionStatus === "unauthenticated" && !autoPrompted.current) {
      autoPrompted.current = true;
      setAuthMode("login");
      setAuthOpen(true);
    }
  }, [sessionStatus]);

  function start() {
    if (!user) return openLogin();
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
        // الاسم/الإيميل/الرقم بيتاخدوا من الـ session على السيرفر
        body: JSON.stringify({ language, answers, test: testId }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        // الجلسة انتهت أثناء الاختبار → نرجّعه للاختبار (إجاباته محفوظة) ونفتح الـ Login
        setError(t.sessionExpired);
        setStep("quiz");
        openLogin();
        return;
      }
      if (!res.ok || !data?.id) throw new Error("submit_failed");
      setResultId(data.id);
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
        body: JSON.stringify({ testId: resultId, language }),
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
    setResultId(null);
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

  return (
    <main dir={dir} className="min-h-screen bg-gray-50 pt-28 pb-16 px-4">
      <div className={`${step === "result" ? "max-w-6xl" : "max-w-3xl"} mx-auto`}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{test.title}</p>
        </div>

        {step === "intro" && sessionStatus === "loading" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
            {t.checking}
          </div>
        )}

        {/* 🔐 غير مسجّل دخول: لازم يسجّل الأول قبل ما الاختبار يبدأ */}
        {step === "intro" && sessionStatus !== "loading" && !user && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{t.loginTitle}</h2>
            <p className="text-sm text-gray-600">{t.loginBody}</p>
            <button onClick={openLogin} className={`${btn} bg-[#003A91] text-white`}>
              {t.loginBtn}
            </button>
          </div>
        )}

        {/* مسجّل دخول: بياناته بتظهر للقراءة بس (من الحساب) ثم يبدأ الاختبار */}
        {step === "intro" && user && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
            <p className="text-sm text-gray-600">{t.takingAs}</p>
            <dl className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2.5 text-sm">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <dt className="font-semibold text-gray-500 min-w-[5.5rem]">{t.name}</dt>
                <dd className="text-gray-900 break-all">{user.name}</dd>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <dt className="font-semibold text-gray-500 min-w-[5.5rem]">{t.email}</dt>
                <dd className="text-gray-900 break-all" dir="ltr">{user.email}</dd>
              </div>
              {user.phone && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <dt className="font-semibold text-gray-500 min-w-[5.5rem]">{t.phone}</dt>
                  <dd className="text-gray-900" dir="ltr">{user.phone}</dd>
                </div>
              )}
            </dl>
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

      {authOpen && (
        <AuthModal mode={authMode} onClose={() => setAuthOpen(false)} onSwitch={(next) => setAuthMode(next)} />
      )}
    </main>
  );
}
