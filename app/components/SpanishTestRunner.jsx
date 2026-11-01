"use client";

// app/components/SpanishTestRunner.jsx
//
// واجهة اختبار تحديد المستوى (إسباني) — Prueba de nivel de español (100 نقطة).
// مشتركة بين كل الاختبارات: <SpanishTestRunner testId="a1" /> (صفحة /spanish-test) و a2 و b1 و b2،
// وأي اختبار مخصص رفعه الأدمن (/level-test/<id>).
//
// 🆕 الشكل والترتيب على نمط امتحان SIELE التجريبي (examendemo.siele.org):
//   1) صفحة مقدمة: عدد المهام + عدد الأسئلة + الوقت + تحذير "مفيش رجوع للمهام المنتهية" + زرار Iniciar.
//   2) اختبار صوت (Prueba de sonido) — بيظهر بس لو الاختبار فيه مهام استماع.
//   3) المهام (Tareas) واحدة واحدة: كل أسئلة المهمة في صفحة واحدة، وزرار Siguiente في آخرها.
//      بعد Siguiente مفيش رجوع للمهمة اللي خلصت.
//   4) مؤقت واحد للاختبار كله (PLACEMENT_TEST_DURATION_MINUTES = 60 دقيقة): لما الوقت يخلص الاختبار
//      بيتقفل والإجابات بتتبعت تلقائيًا للسيرفر.
//   حالة الاختبار الجاري (الوقت النهائي + الإجابات + المهمة الحالية) بتتحفظ في localStorage،
//   فلو الطالب عمل refresh الوقت مبيتصفّرش، ولو الوقت خلص وهو بره الإجابات بتتبعت أول ما يرجع.
//
// 🔐 لازم تسجيل دخول: بيانات الطالب (الاسم/الإيميل/الرقم) بتتاخد تلقائيًا من الـ session
// (مفيش إدخال يدوي). غير المسجّل بيتفتحله الـ Login قبل ما الاختبار يبدأ.
//
// التدفق: (تسجيل دخول) → مقدمة → (اختبار صوت) → المهام → عند الإنهاء/انتهاء الوقت الإجابات
// بتتبعت للسيرفر (POST /api/placement-tests) وبيتصحح هناك ويتسجّل للأدمن (باسم ورقم وإيميل
// الطالب من حسابه) → النتيجة من 100 + مستوى الطالب + الكورسات الموصى بها.
// 🆓 الاختبار الحالي مجاني (PLACEMENT_TEST_IS_FREE في lib/spanishPlacementTest.js): النتيجة
// بتظهر لحظيًا. لو اتغيّرت لـ false بيرجع التدفق المدفوع (دفع رسوم الاختبار ثم النتيجة
// في صفحة النجاح).
// 🔒 مفتاح الإجابات على السيرفر بس.
// 🎧 مهام الاستماع بتظهر لما يتحط لها audioSrc (الصوتيات من لوحة الأدمن).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import { PLACEMENT_TEST_FEE_USD, PLACEMENT_TEST_IS_FREE } from "@/app/lib/spanishPlacementTest";
import {
  PLACEMENT_TESTS,
  PLACEMENT_TEST_DURATION_MINUTES,
  getPlacementTest,
  getVisiblePartsFor,
} from "@/app/lib/placementTests";
import { convertPrice, formatPrice, getCurrencyForLanguage } from "@/app/lib/currency";
import PlacementResult from "@/app/components/PlacementResult";

// مفتاح الدفع المعلّق (للاختبار المدفوع بس) — A1 بيفضل بنفس المفتاح القديم، وباقي الاختبارات لها مفتاح مستقل
const pendingKeyFor = (testId) => (testId === "a1" ? "spanishTestPending" : `spanishTestPending_${testId}`);
// مفتاح الاختبار الجاري (الوقت النهائي + الإجابات + المهمة الحالية)
const runKeyFor = (testId) => `placementRun_${testId}`;

const DURATION_MS = PLACEMENT_TEST_DURATION_MINUTES * 60 * 1000;
const LOW_TIME_SECONDS = 5 * 60; // آخر 5 دقايق: المؤقت بيتلوّن بالأحمر

const STRINGS = {
  en: {
    title: "Spanish Level Test",
    taking: "Taking the test as",
    loginTitle: "Please log in to start the test",
    loginBody: "Your name, phone and email are taken from your account and saved with your result.",
    loginBtn: "Log in",
    checking: "Checking your account...",
    sessionExpired: "Your session has expired. Please log in again, then press Retry — your answers are still saved.",
    notFound: "This test is not available right now.",
    backToCourses: "Browse courses",
    tasksLabel: "Number of tasks",
    questionsLabel: "Number of questions",
    timeLabel: "Time to complete the test",
    minutes: "minutes",
    warnTitle: "Attention!",
    warnBody:
      "In this test you cannot go back to completed tasks. If you press Next at the end of a task, you cannot go back.",
    soundIntro: "Before starting the test you will do a sound check. Press the Start button.",
    startIntro: "Press the Start button to begin the test.",
    start: "Start",
    soundTitle: "Sound check",
    soundBody: "Press the button to play a sound. If you can hear it clearly, press Continue to begin the test.",
    soundPlay: "Play sound",
    soundContinue: "Continue",
    task: "Task",
    timeLeft: "Time left",
    audioNote: "You will hear each audio twice.",
    next: "Next",
    finish: "Finish the test",
    skipWarn: (n) =>
      `You have ${n} unanswered ${n === 1 ? "question" : "questions"} in this task. If you press the button again you will not be able to come back.`,
    timeUp: "Time is up. Sending your answers...",
    submitting: "Submitting your answers...",
    retry: "Retry sending",
    doneTitle: "The test has been completed successfully",
    doneBody: "To receive your result, you need to pay the test fee:",
    pay: "Pay & get my result",
    paying: "Redirecting to payment...",
    newTest: "Start a new test",
    submitError: "Something went wrong while submitting your answers. Your answers are saved — please try again",
    payError: "Couldn't start the payment, please try again",
  },
  ar: {
    title: "اختبار تحديد المستوى في الإسبانية",
    taking: "ستدخل الاختبار بحساب",
    loginTitle: "سجّل دخولك أولًا لبدء الاختبار",
    loginBody: "اسمك ورقمك وبريدك الإلكتروني بتُؤخذ تلقائيًا من حسابك وتُسجَّل مع نتيجتك.",
    loginBtn: "تسجيل الدخول",
    checking: "جارٍ التحقق من حسابك...",
    sessionExpired: "انتهت جلستك. سجّل دخولك مرة أخرى ثم اضغط إعادة المحاولة — إجاباتك ما زالت محفوظة.",
    notFound: "هذا الاختبار غير متاح حاليًا.",
    backToCourses: "تصفّح الكورسات",
    tasksLabel: "عدد المهام",
    questionsLabel: "عدد الأسئلة",
    timeLabel: "الوقت المخصص للاختبار",
    minutes: "دقيقة",
    warnTitle: "تنبيه!",
    warnBody:
      "في هذا الاختبار لا يمكنك العودة إلى المهام المنتهية. إذا ضغطت على «التالي» في نهاية مهمة فلن تستطيع الرجوع.",
    soundIntro: "قبل بدء الاختبار ستُجري اختبارًا للصوت. اضغط على زر «ابدأ».",
    startIntro: "اضغط على زر «ابدأ» لبدء الاختبار.",
    start: "ابدأ",
    soundTitle: "اختبار الصوت",
    soundBody: "اضغط على الزر لتشغيل صوت. إذا سمعته بوضوح اضغط «متابعة» لبدء الاختبار.",
    soundPlay: "تشغيل الصوت",
    soundContinue: "متابعة",
    task: "المهمة",
    timeLeft: "الوقت المتبقي",
    audioNote: "ستسمع كل مقطع صوتي مرتين.",
    next: "التالي",
    finish: "إنهاء الاختبار",
    skipWarn: (n) =>
      `لديك ${n} ${n === 1 ? "سؤال" : "أسئلة"} بدون إجابة في هذه المهمة. إذا ضغطت على الزر مرة أخرى فلن تستطيع العودة.`,
    timeUp: "انتهى الوقت. جارٍ إرسال إجاباتك...",
    submitting: "جارٍ إرسال إجاباتك...",
    retry: "إعادة محاولة الإرسال",
    doneTitle: "تم انتهاء الاختبار بنجاح",
    doneBody: "لاستلام نتيجتك يجب دفع رسوم الاختبار:",
    pay: "ادفع واستلم نتيجتي",
    paying: "جارٍ التحويل لصفحة الدفع...",
    newTest: "ابدأ اختبارًا جديدًا",
    submitError: "حدث خطأ أثناء إرسال إجاباتك. إجاباتك محفوظة — حاول مرة أخرى",
    payError: "تعذّر بدء عملية الدفع، حاول مرة أخرى",
  },
  es: {
    title: "Prueba de nivel de español",
    taking: "Realiza la prueba como",
    loginTitle: "Inicie sesión para empezar la prueba",
    loginBody: "Su nombre, teléfono y correo se toman de su cuenta y se guardan con su resultado.",
    loginBtn: "Iniciar sesión",
    checking: "Verificando su cuenta...",
    sessionExpired:
      "Su sesión ha expirado. Inicie sesión de nuevo y pulse Reintentar: sus respuestas siguen guardadas.",
    notFound: "Esta prueba no está disponible ahora.",
    backToCourses: "Ver cursos",
    tasksLabel: "Número de tareas",
    questionsLabel: "Número de preguntas",
    timeLabel: "Tiempo para realizar la prueba",
    minutes: "minutos",
    warnTitle: "¡Atención!",
    warnBody:
      "En esta prueba, no puede volver a las tareas terminadas. Si pulsa Siguiente al final de una tarea, no puede volver atrás.",
    soundIntro: "Antes de empezar la prueba va a realizar una prueba de sonido. Pulse el botón de Iniciar.",
    startIntro: "Pulse el botón de Iniciar para empezar la prueba.",
    start: "Iniciar",
    soundTitle: "Prueba de sonido",
    soundBody: "Pulse el botón para reproducir un sonido. Si lo oye bien, pulse Continuar para empezar la prueba.",
    soundPlay: "Reproducir sonido",
    soundContinue: "Continuar",
    task: "Tarea",
    timeLeft: "Tiempo restante",
    audioNote: "Escuchará cada audio dos veces.",
    next: "Siguiente",
    finish: "Terminar el examen",
    skipWarn: (n) =>
      `Tiene ${n} ${n === 1 ? "pregunta sin responder" : "preguntas sin responder"} en esta tarea. Si pulsa de nuevo el botón, no podrá volver atrás.`,
    timeUp: "Se ha agotado el tiempo. Enviando sus respuestas...",
    submitting: "Enviando sus respuestas...",
    retry: "Reintentar el envío",
    doneTitle: "La prueba se ha completado con éxito",
    doneBody: "Para recibir su resultado debe pagar la tarifa de la prueba:",
    pay: "Pagar y recibir mi resultado",
    paying: "Redirigiendo al pago...",
    newTest: "Empezar una nueva prueba",
    submitError: "Ocurrió un error al enviar sus respuestas. Sus respuestas están guardadas: inténtelo de nuevo",
    payError: "No se pudo iniciar el pago, inténtelo de nuevo",
  },
};

const LETTERS = "abcdefghijk";

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// 🔊 نغمة قصيرة لاختبار الصوت (من غير ملف صوتي)
function playTestTone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
        ctx.close();
      } catch {}
    }, 1200);
  } catch {}
}

export default function SpanishTestRunner({ testId: testIdProp = "a1" }) {
  // testId = "a1" | "a2" | "b1" | "b2" (مدمجين) أو id اختبار مخصص رفعه الأدمن: المخصص بيتحمّل من
  // GET /api/placement-tests/custom/<id> (من غير مفتاح الإجابات — التصحيح على السيرفر بس).
  const rawId = String(testIdProp || "a1").toLowerCase();
  const isBuiltin = Boolean(PLACEMENT_TESTS[rawId]);
  const testId = rawId;
  const [custom, setCustom] = useState({ status: isBuiltin ? "ready" : "loading", test: null });
  const test = isBuiltin ? getPlacementTest(testId) : custom.test;
  const PENDING_KEY = pendingKeyFor(testId);
  const RUN_KEY = runKeyFor(testId);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;

  // 🔐 بيانات الطالب (الاسم/الإيميل/الرقم) بتيجي من الـ session — مفيش إدخال يدوي.
  const { data: session, status: sessionStatus } = useSession();
  const user = session?.user ?? null;
  const uid = user ? String(user.id || user.email || "") : "";
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const autoPrompted = useRef(false);

  // intro | sound | quiz | submitting | retry (فشل الإرسال) | result (مجاني) | pay (مدفوع)
  const [step, setStep] = useState("intro");
  const [taskIdx, setTaskIdx] = useState(0); // رقم المهمة الحالية (مهمة واحدة في الصفحة)
  const [answers, setAnswers] = useState({}); // { [n]: optionIndex }
  const [deadline, setDeadline] = useState(null); // وقت انتهاء الاختبار (ms)
  const [remaining, setRemaining] = useState(DURATION_MS / 1000);
  const [timeUp, setTimeUp] = useState(false);
  const [skipWarning, setSkipWarning] = useState(false); // تحذير "أسئلة بدون إجابة" قبل Siguiente
  const [resultId, setResultId] = useState(null); // id نتيجة الاختبار اللي اتسجّلت على السيرفر
  const [result, setResult] = useState(null); // اختبار مجاني: النتيجة اللحظية
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // refs عشان الإرسال التلقائي (لما الوقت يخلص) يقرأ آخر إجابات من غير ما يتأثر بـ closure قديم
  const answersRef = useRef({});
  const submittingRef = useRef(false);
  const submitRef = useRef(null);
  const resumed = useRef(false);

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
    if (isBuiltin) return;
    let alive = true;
    fetch(`/api/placement-tests/custom/${encodeURIComponent(testId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (d?.test) {
          setCustom({ status: "ready", test: d.test });
          setAudio(d.audio || {});
        } else setCustom({ status: "notfound", test: null });
      })
      .catch(() => alive && setCustom({ status: "notfound", test: null }));
    return () => {
      alive = false;
    };
  }, [testId, isBuiltin]);
  useEffect(() => {
    if (!isBuiltin) return;
    fetch(`/api/placement-tests/audio?test=${testId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.audio && setAudio(d.audio))
      .catch(() => {});
  }, [testId, isBuiltin]);

  const parts = useMemo(() => (test ? getVisiblePartsFor(test, audio) : []), [test, audio]);

  // 🆕 قائمة المهام (Tareas) بالترتيب عبر كل الأجزاء: كل عنصر = مهمة بأسئلتها كلها
  const taskList = useMemo(
    () => parts.flatMap((p, pi) => p.tasks.map((tk) => ({ part: p, partIdx: pi, task: tk }))),
    [parts]
  );
  const totalTasks = taskList.length;
  const totalQuestions = useMemo(() => taskList.reduce((sum, x) => sum + x.task.questions.length, 0), [taskList]);
  const hasAudio = useMemo(
    () => taskList.some((x) => x.task.audioSrc || x.task.questions.some((q) => q.audioSrc)),
    [taskList]
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

  function setAllAnswers(next) {
    answersRef.current = next;
    setAnswers(next);
  }

  function clearRun() {
    try {
      localStorage.removeItem(RUN_KEY);
    } catch {}
  }

  // ▶️ بداية الاختبار الفعلية: المؤقت بيبدأ من هنا (بعد اختبار الصوت لو موجود)
  function startQuiz() {
    setAllAnswers({});
    setTaskIdx(0);
    setSkipWarning(false);
    setTimeUp(false);
    setError("");
    setRemaining(DURATION_MS / 1000);
    setDeadline(Date.now() + DURATION_MS);
    setStep("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function begin() {
    if (!user) return openLogin();
    if (hasAudio) setStep("sound");
    else startQuiz();
  }

  // ♻️ استكمال اختبار جاري بعد refresh: الوقت النهائي محفوظ، فالمؤقت مبيتصفّرش.
  // لو الوقت خلص وهو بره، المؤقت (تحت) بيلاحظ إن الوقت خلص وبيبعت الإجابات تلقائيًا.
  useEffect(() => {
    if (resumed.current) return;
    if (sessionStatus !== "authenticated" || !uid || !test || !totalTasks || step !== "intro") return;
    resumed.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(RUN_KEY) || "null");
      if (!saved || saved.uid !== uid || !Number.isFinite(saved.deadline)) return;
      const savedAnswers = saved.answers && typeof saved.answers === "object" ? saved.answers : {};
      setAllAnswers(savedAnswers);
      setTaskIdx(Math.min(Math.max(0, Number(saved.taskIdx) || 0), totalTasks - 1));
      setDeadline(saved.deadline);
      setRemaining(Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)));
      setStep("quiz");
    } catch {}
  }, [sessionStatus, uid, test, totalTasks, step]);

  // 💾 حفظ حالة الاختبار الجاري (الوقت النهائي + الإجابات + المهمة الحالية)
  useEffect(() => {
    if (!uid || !deadline || (step !== "quiz" && step !== "retry")) return;
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify({ uid, deadline, answers, taskIdx }));
    } catch {}
  }, [step, uid, deadline, answers, taskIdx]);

  // ⏱️ المؤقت: بيتحسب من الوقت النهائي (Date.now) مش بعدّاد، فمبيتأثرش لو التاب اتأخر.
  // لما يوصل صفر → الاختبار بيتقفل والإجابات بتتبعت تلقائيًا.
  useEffect(() => {
    if (step !== "quiz" || !deadline) return;
    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) submitRef.current?.(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, deadline]);

  function selectAnswer(n, optionIndex) {
    if (step !== "quiz") return; // الاختبار اتقفل
    setAllAnswers({ ...answersRef.current, [n]: optionIndex });
    setSkipWarning(false);
  }

  const current = taskList[taskIdx];
  const isLastTask = taskIdx === totalTasks - 1;

  // Siguiente: مفيش رجوع بعدها. لو فيه أسئلة بدون إجابة في المهمة نحذّر مرة قبل ما نكمّل.
  function nextTask() {
    if (!current) return;
    const unanswered = current.task.questions.filter((q) => answersRef.current[q.n] === undefined).length;
    if (unanswered > 0 && !skipWarning) {
      setSkipWarning(true);
      return;
    }
    setSkipWarning(false);
    if (isLastTask) {
      submitTest(false);
      return;
    }
    setTaskIdx(taskIdx + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitTest(auto = false) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (auto) setTimeUp(true);
    setError("");
    setStep("submitting");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await fetch("/api/placement-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // الاسم/الإيميل/الرقم بيتاخدوا من الـ session على السيرفر
        body: JSON.stringify({ language, answers: answersRef.current, test: testId }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        // الجلسة انتهت أثناء الاختبار → إجاباته محفوظة، نفتح الـ Login وبعدها يضغط إعادة المحاولة
        setError(t.sessionExpired);
        setStep("retry");
        openLogin();
        return;
      }
      if (!res.ok || !data?.id) throw new Error("submit_failed");
      clearRun();
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
      setStep("retry");
    } finally {
      submittingRef.current = false;
    }
  }
  submitRef.current = submitTest;

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
    clearRun();
    setAllAnswers({});
    setTaskIdx(0);
    setSkipWarning(false);
    setDeadline(null);
    setTimeUp(false);
    setRemaining(DURATION_MS / 1000);
    setResultId(null);
    setResult(null);
    setError("");
    setStep("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const dir = isRTL ? "rtl" : "ltr";
  const btn = "px-6 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60";
  const card = "bg-white rounded-2xl border border-gray-100 shadow-sm";
  const task = current?.task;
  const unansweredHere = task ? task.questions.filter((q) => answers[q.n] === undefined).length : 0;
  // راس المهمة (نص القراءة / صوت المهمة / قائمة الربط) بيظهر بس مع المهام اللي محتاجاه
  const showTaskAudio = Boolean(task?.audioSrc && !task.sharedAudio);
  const lowTime = remaining <= LOW_TIME_SECONDS;

  return (
    <main dir={dir} className="min-h-screen bg-gray-50 pt-28 pb-16 px-4">
      <div className={`${step === "result" ? "max-w-6xl" : "max-w-3xl"} mx-auto`}>
        {/* عنوان الاختبار (مخفي أثناء حل المهام عشان الشاشة تبقى للمهمة والمؤقت بس) */}
        {step !== "quiz" && step !== "result" && (
          <div className={`${card} p-6 sm:p-8 mb-6`}>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{isBuiltin ? t.title : test?.title || ""}</h1>
            {test && isBuiltin && <p className="text-sm text-gray-500 mt-1">{test.title}</p>}
            {test && !isBuiltin && test.label && <p className="text-sm text-gray-500 mt-1">{test.label}</p>}
          </div>
        )}

        {/* اختبار مخصص: تحميل / مش موجود أو مش منشور */}
        {!isBuiltin && custom.status === "loading" && (
          <div className={`${card} p-8 text-center text-sm text-gray-500`}>{t.checking}</div>
        )}
        {!isBuiltin && custom.status === "notfound" && (
          <div className={`${card} p-8 text-center space-y-4`}>
            <p className="text-sm text-gray-600">{t.notFound}</p>
            <Link href="/courses" className={`${btn} inline-block bg-[#003A91] text-white`}>
              {t.backToCourses}
            </Link>
          </div>
        )}

        {test && step === "intro" && sessionStatus === "loading" && (
          <div className={`${card} p-8 text-center text-sm text-gray-500`}>{t.checking}</div>
        )}

        {/* 🔐 غير مسجّل دخول: لازم يسجّل الأول قبل ما الاختبار يبدأ */}
        {test && step === "intro" && sessionStatus !== "loading" && !user && (
          <div className={`${card} p-6 sm:p-8 text-center space-y-4`}>
            <h2 className="text-xl font-semibold text-gray-900">{t.loginTitle}</h2>
            <p className="text-sm text-gray-600">{t.loginBody}</p>
            <button onClick={openLogin} className={`${btn} bg-[#003A91] text-white`}>
              {t.loginBtn}
            </button>
          </div>
        )}

        {/* 1) المقدمة — نفس ترتيب صفحة SIELE: المهام، الأسئلة، الوقت، التحذير، اختبار الصوت، Iniciar */}
        {test && step === "intro" && user && totalTasks > 0 && (
          <div className={`${card} p-6 sm:p-8 space-y-5`}>
            <div className="space-y-2.5 text-lg sm:text-xl text-gray-900">
              <h3>
                {t.tasksLabel}: <strong>{totalTasks}</strong>
              </h3>
              <h3>
                {t.questionsLabel}: <strong>{totalQuestions}</strong>
              </h3>
              <h3>
                {t.timeLabel}:{" "}
                <strong>
                  {PLACEMENT_TEST_DURATION_MINUTES} {t.minutes}
                </strong>
              </h3>
            </div>
            <h3 className="text-lg sm:text-xl text-gray-900">
              <strong>{t.warnTitle}</strong> {t.warnBody}
            </h3>
            <h3 className="text-lg sm:text-xl text-gray-900">{hasAudio ? t.soundIntro : t.startIntro}</h3>
            <div className="pt-1">
              <button onClick={begin} className={`${btn} bg-[#003A91] text-white`}>
                {t.start}
              </button>
            </div>
            <p className="text-xs text-gray-400 pt-2" dir="ltr">
              {t.taking}: {user.name} · {user.email}
            </p>
          </div>
        )}

        {/* 2) اختبار الصوت */}
        {test && step === "sound" && (
          <div className={`${card} p-6 sm:p-8 space-y-5`}>
            <h2 className="text-xl font-semibold text-gray-900">{t.soundTitle}</h2>
            <p className="text-sm text-gray-600">{t.soundBody}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={playTestTone} className={`${btn} border border-gray-300 text-gray-700`}>
                {t.soundPlay}
              </button>
              <button onClick={startQuiz} className={`${btn} bg-[#003A91] text-white`}>
                {t.soundContinue}
              </button>
            </div>
          </div>
        )}

        {/* 3) المهام: مهمة واحدة في الصفحة + المؤقت */}
        {step === "quiz" && current && task && (
          <div className="space-y-5">
            {/* شريط المؤقت (ثابت أثناء السكرول) */}
            <div
              className={`sticky top-24 z-20 ${card} px-5 py-3 flex items-center justify-between gap-3`}
              dir="ltr"
            >
              <p className="text-sm font-bold text-gray-900">
                {t.task} {taskIdx + 1}/{totalTasks}
                <span className="font-medium text-gray-400"> · {current.part.title}</span>
              </p>
              <p
                className={`text-sm font-bold tabular-nums ${lowTime ? "text-red-600" : "text-[#003A91]"}`}
                role="timer"
                aria-live="off"
              >
                {t.timeLeft}: {formatClock(remaining)}
              </p>
            </div>

            <div className="space-y-4" dir="ltr" key={taskIdx}>
              <div className={`${card} p-5 text-left space-y-3`}>
                <p className="text-sm font-bold text-gray-900">{task.title}</p>
                {task.intro && <p className="text-sm text-gray-600">{task.intro}</p>}

                {showTaskAudio && (
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
                <div key={q.n} id={`q-${q.n}`} className={`${card} p-5 text-left`}>
                  {q.ctx && (
                    <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3">{q.ctx}</p>
                  )}
                  {q.audioSrc && (
                    // 🎧 تسجيل منفصل لكل سؤال/رسالة (مثلًا A2 Tarea 1 و 2 استماع)
                    <div className="mb-3">
                      <audio controls src={q.audioSrc} className="w-full" />
                      <p className="text-[11px] text-gray-400 mt-1">{t.audioNote}</p>
                    </div>
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
                            onClick={() => selectAnswer(q.n, oi)}
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
                              onChange={() => selectAnswer(q.n, oi)}
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

            {/* لا يوجد زرار رجوع: بعد Siguiente مفيش عودة للمهمة */}
            <div className={`${card} p-5 flex flex-wrap items-center gap-3`}>
              {skipWarning && unansweredHere > 0 && (
                <p className="text-sm text-amber-700 w-full">{t.skipWarn(unansweredHere)}</p>
              )}
              <button onClick={nextTask} className={`${btn} bg-[#003A91] text-white`}>
                {isLastTask ? t.finish : t.next}
              </button>
            </div>
          </div>
        )}

        {step === "submitting" && (
          <div className={`${card} p-8 text-center text-sm text-gray-500`}>
            {timeUp ? t.timeUp : t.submitting}
          </div>
        )}

        {/* فشل الإرسال (نت/جلسة منتهية): الإجابات محفوظة والاختبار مقفول — إعادة المحاولة بس */}
        {step === "retry" && (
          <div className={`${card} p-6 sm:p-8 text-center space-y-4`}>
            {timeUp && <p className="text-sm font-semibold text-gray-900">{t.timeUp}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => submitTest(timeUp)} className={`${btn} bg-[#003A91] text-white`}>
                {t.retry}
              </button>
              {!user && (
                <button onClick={openLogin} className={`${btn} border border-gray-300 text-gray-700`}>
                  {t.loginBtn}
                </button>
              )}
            </div>
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
          <div className={`${card} p-6 sm:p-8 text-center space-y-4`}>
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
