"use client";

// app/(pages)/payments/success/page.jsx
//
// Phase 3 — اليوم 30: صفحة هبوط لما الدفع ينجح — app/api/payments/paypal/return
// بيحوّل هنا بـ ?payment=<paymentId> بعد ما markPaymentSucceededAndGrantAccess
// تخلص (Enrollment أو تفعيل membership اتعمل فعلاً في الداتابيز قبل ما
// المستخدم يشوف الصفحة دي). بنجيب تفاصيل الدفعة من GET /api/payments/[id]
// (بيسمح بالوصول لصاحب الدفعة أو الأدمن بس) عشان نعرض تأكيد واضح ورابط
// مباشر للمحتوى اللي اشتراه، بالإضافة لرابط الإيصال.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Loader, Receipt, ArrowRight, ArrowLeft, BookOpen, Crown } from "lucide-react";

const STRINGS = {
  ar: {
    title: "تم الدفع بنجاح 🎉",
    subtitleCourse: "تم تفعيل اشتراكك في الكورس وأصبح متاحًا الآن",
    subtitleMembership: "تم تفعيل اشتراكك في خطة العضوية",
    goToCourse: "اذهب إلى الكورس",
    goToCourses: "كورساتي",
    goToMembership: "خطط الاشتراك",
    receipt: "عرض الإيصال",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل تفاصيل الدفعة، لكن عملية الدفع تمت بنجاح",
    amount: "المبلغ المدفوع",
  },
  en: {
    title: "Payment successful 🎉",
    subtitleCourse: "Your course access has been activated",
    subtitleMembership: "Your membership plan has been activated",
    goToCourse: "Go to course",
    goToCourses: "My Courses",
    goToMembership: "Membership Plans",
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

  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId) return;
    fetch(`/api/payments/${paymentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data ? setPayment(data) : setError(t.error)))
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const isMembership = payment?.type === "membership";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4 py-16"
      style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="text-green-500" size={32} />
        </div>
        <h1 className="text-xl font-black text-gray-800 mb-2">{t.title}</h1>

        {!payment && !error && (
          <div className="flex justify-center py-6">
            <Loader className="animate-spin text-[#1D6FD8]" size={22} />
          </div>
        )}

        {error && <p className="text-sm text-gray-400 mb-6">{error}</p>}

        {payment && (
          <>
            <p className="text-sm text-gray-400 mb-1">
              {isMembership ? t.subtitleMembership : t.subtitleCourse}
            </p>
            <p className="text-sm font-bold text-gray-700 mb-5">
              {payment.courseTitle || payment.membershipPlanName}
            </p>
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
            isMembership ? (
              <Link
                href="/student"
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
              href="/student"
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