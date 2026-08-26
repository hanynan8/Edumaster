"use client";

// app/(pages)/payments/failed/page.jsx
//
// Phase 3 — صفحة هبوط بسيطة لما الدفع يفشل أو يتلغي. المصدر الوحيد
// اللي بيحوّل هنا دلوقتي هو app/api/payments/paymob/callback (بعد إلغاء
// PayPal نهائيًا من المشروع) بـ ?reason=<...>. القيم في REASON_KEYS
// مطابقة لكل الـ reason اللي بترجعها الراوت دي فعليًا.

import { use as usePromise } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { XCircle, ArrowRight, ArrowLeft } from "lucide-react";

const REASON_KEYS = {
  invalid_signature: { ar: "تعذّر التحقق من عملية الدفع", en: "Couldn't verify the payment", es: "No se pudo verificar el pago" },
  missing_reference: { ar: "بيانات الدفع ناقصة", en: "Missing payment data", es: "Faltan datos del pago" },
  not_found: { ar: "عملية الدفع غير موجودة", en: "Payment not found", es: "Pago no encontrado" },
  not_completed: { ar: "الدفع لم يكتمل", en: "The payment wasn't completed", es: "El pago no se completó" },
  internal_error: { ar: "حصل خطأ غير متوقع", en: "An unexpected error occurred", es: "Ocurrió un error inesperado" },
};

const STRINGS = {
  ar: { title: "لم تكتمل عملية الدفع", browse: "تصفّح الكورسات", membership: "خطط الاشتراك" },
  en: { title: "Payment didn't go through", browse: "Browse Courses", membership: "Membership Plans" },
  es: { title: "El pago no se realizó", browse: "Explorar cursos", membership: "Planes de membresía" },
};

export default function PaymentFailedPage({ searchParams }) {
  const params = usePromise(searchParams);
  const reason = params?.reason;
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;
  const reasonText = REASON_KEYS[reason]?.[language] || REASON_KEYS[reason]?.en || null;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4 py-16"
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <XCircle className="text-red-400" size={32} />
        </div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">{t.title}</h1>
        {reasonText && <p className="text-sm text-gray-400 mb-6">{reasonText}</p>}

        <div className="flex flex-col gap-2.5">
          <Link
            href="/courses"
            className="flex items-center justify-center gap-2 bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            {t.browse} <BackArrow size={15} />
          </Link>
          <Link
            href="/membership"
            className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t.membership}
          </Link>
        </div>
      </div>
    </div>
  );
}