"use client";

// app/(pages)/payments/success/page.jsx
//
// Phase 3 — اليوم 30: صفحة هبوط لما الدفع ينجح — app/api/payments/getpayin/callback
// (أو الـ webhook المقابل) بيحوّل هنا بـ ?payment=<paymentId> بعد ما markPaymentSucceededAndGrantAccess
// تخلص (Enrollment أو تفعيل membership اتعمل فعلاً في الداتابيز قبل ما
// المستخدم يشوف الصفحة دي). بنجيب تفاصيل الدفعة من GET /api/payments/[id]
// (بيسمح بالوصول لصاحب الدفعة أو الأدمن بس) عشان نعرض تأكيد واضح ورابط
// مباشر للمحتوى اللي اشتراه، بالإضافة لرابط الإيصال.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Loader, Receipt, ArrowRight, ArrowLeft, BookOpen, Crown } from "lucide-react";

const STRINGS = {
  ar: {
    title: "تم الدفع بنجاح",
    subtitleCourse: "تم تفعيل اشتراكك في الدورة وأصبحت متاحة الآن",
    subtitleMembership: "تم تفعيل اشتراكك في خطة العضوية",
    subtitleConsultation: "تم تأكيد حجز استشارتك، سنتواصل معك قريبًا لتأكيد الموعد",
    consultationLabel: "استشارة",
    subtitlePlacement: "تم الدفع بنجاح، وهذه نتيجة اختبار تحديد المستوى",
    placementLabel: "اختبار تحديد المستوى (إسباني)",
    yourScore: "درجتك",
    outOf: "من",
    answered: "عدد الأسئلة المُجاب عنها",
    resultError: "تعذّر تحميل النتيجة الآن، حاول تحديث الصفحة",
    goToCourse: "اذهب إلى الدورة",
    goToCourses: "دوراتي",
    goToMembership: "خطط الاشتراك",
    backHome: "العودة إلى الرئيسية",
    receipt: "عرض الإيصال",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل تفاصيل الدفعة، لكن عملية الدفع تمت بنجاح",
    amount: "المبلغ المدفوع",
  },
  en: {
    title: "Payment successful",
    subtitleCourse: "Your course access has been activated",
    subtitleMembership: "Your membership plan has been activated",
    subtitleConsultation: "Your consultation booking is confirmed — we'll contact you soon",
    consultationLabel: "Consultation",
    subtitlePlacement: "Payment received — here is your level test result",
    placementLabel: "Spanish level test",
    yourScore: "Your score",
    outOf: "out of",
    answered: "Questions answered",
    resultError: "Couldn't load your result right now, please refresh the page",
    goToCourse: "Go to course",
    goToCourses: "My Courses",
    goToMembership: "Membership Plans",
    backHome: "Back to home",
    receipt: "View receipt",
    loading: "Loading...",
    error: "Couldn't load payment details, but your payment was successful",
    amount: "Amount paid",
  },
};

export default function PaymentSuccessPage({ searchParams }) {
  const params = usePromise(searchParams);
  const paymentId = params?.payment;
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;
  // 🔧 checkout متاح لأي مستخدم مسجّل دخول من غير قيد على الـ role (شوف
  // app/api/payments/checkout/route.js) — يعني مدرّس أو أدمن يقدروا يشتروا
  // كورس/عضوية زي أي طالب. الرابط تحت كان "/student" ثابت، وبعد ما middleware
  // بقى يمنع أي role غير student من دخول /student، كان بيوديهم لصفحة
  // هيترحّلوا منها فورًا لصفحتهم هم من غير ما يوصلوا للمحتوى اللي اشتروه.
  const { data: session } = useSession();
  const role = session?.user?.role;
  const dashboardHref = role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [placementResult, setPlacementResult] = useState(null);
  const [placementResultError, setPlacementResultError] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    fetch(`/api/payments/${paymentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data ? setPayment(data) : setError(t.error)))
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const isMembership = payment?.type === "membership";
  const isConsultation = payment?.type === "consultation";
  const isPlacement = payment?.type === "placement_test";

  // 🆕 اختبار تحديد المستوى: النتيجة بتتسلّم هنا بعد نجاح الدفع بس
  // (GET /api/placement-tests/result بيرفض لو الدفعة مش succeeded).
  useEffect(() => {
    if (!isPlacement || !paymentId) return;
    try { localStorage.removeItem("spanishTestPending"); } catch {}
    fetch(`/api/placement-tests/result?payment=${paymentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data ? setPlacementResult(data) : setPlacementResultError(true)))
      .catch(() => setPlacementResultError(true));
  }, [isPlacement, paymentId]);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4 py-16"
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="text-green-500" size={32} />
        </div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">{t.title}</h1>

        {!payment && !error && (
          <div className="flex justify-center py-6">
            <Loader className="animate-spin text-[#003A91]" size={22} />
          </div>
        )}

        {error && <p className="text-sm text-gray-400 mb-6">{error}</p>}

        {payment && (
          <>
            <p className="text-sm text-gray-400 mb-1">
              {isPlacement ? t.subtitlePlacement : isConsultation ? t.subtitleConsultation : isMembership ? t.subtitleMembership : t.subtitleCourse}
            </p>
            <p className="text-sm font-bold text-gray-700 mb-5">
              {isPlacement ? t.placementLabel : isConsultation ? t.consultationLabel : payment.courseTitle || payment.membershipPlanName}
            </p>
            {isPlacement && (
              <div className="bg-[#003A91]/5 rounded-xl py-4 px-3 mb-5">
                {placementResult ? (
                  <>
                    <p className="text-xs text-gray-500 mb-1">{t.yourScore}</p>
                    <p className="text-4xl font-black text-[#003A91]">
                      {placementResult.score}
                      <span className="text-base text-gray-400 font-bold"> {t.outOf} {placementResult.maxScore}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {t.answered}: {placementResult.answeredCount}/{placementResult.totalQuestions}
                    </p>
                  </>
                ) : placementResultError ? (
                  <p className="text-xs text-red-500">{t.resultError}</p>
                ) : (
                  <Loader className="animate-spin text-[#003A91] mx-auto" size={20} />
                )}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl py-3 mb-6">
              <span className="text-xs text-gray-400">{t.amount}</span>
              <span className="text-sm font-bold text-gray-800">
                {(payment.amount / 100).toFixed(2)} {payment.currency}
              </span>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2.5">
          {payment && (
            isConsultation || isPlacement ? (
              <Link
                href="/"
                className="flex items-center justify-center gap-2 bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                {t.backHome} <BackArrow size={15} />
              </Link>
            ) : isMembership ? (
              <Link
                href={dashboardHref}
                className="flex items-center justify-center gap-2 bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Crown size={15} /> {t.goToCourses}
              </Link>
            ) : (
              <Link
                href={`/courses/${payment.course}`}
                className="flex items-center justify-center gap-2 bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <BookOpen size={15} /> {t.goToCourse} <BackArrow size={15} />
              </Link>
            )
          )}
          {!payment && (
            <Link
              href={dashboardHref}
              className="flex items-center justify-center gap-2 bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              {t.goToCourses}
            </Link>
          )}
          {paymentId && (
            <Link
              href={`/payments/receipt/${paymentId}`}
              className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Receipt size={15} /> {t.receipt}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}