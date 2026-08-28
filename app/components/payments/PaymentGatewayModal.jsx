"use client";

// app/components/payments/PaymentGatewayModal.jsx
//
// 🆕 بعد إلغاء PayPal واعتماد Paymob كبوابة الدفع الوحيدة في المشروع،
// مبقاش فيه داعي لمودال "اختيار بوابة دفع" (كان فيه اختيار بين PayPal
// وPaymob قبل كده). المودال دلوقتي مجرد تأكيد بسيط قبل ما نفتح
// POST /api/payments/checkout: بيعرض السعر النهائي (بالعملة المحسوبة من
// لغة الموقع الحالية، شوف app/lib/currency.js) وزرار واحد "الدفع عبر
// Paymob". الاسم اتساب زي ما هو (PaymentGatewayModal) عشان أي حد يقرا
// كود المشروع يلاقي نفس المكوّن اللي كان بيستخدمه، بس دوره اتغيّر.
//
// الاستخدام:
//   <PaymentGatewayModal
//     amount={250}
//     currency="EGP"
//     onConfirm={() => ...}   // مفيش provider تاني، Paymob بس
//     onClose={() => ...}
//   />

import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/app/lib/currency";

const STRINGS = {
  ar: {
    title: "تأكيد الدفع",
    subtitle: "هتتحول لصفحة الدفع الآمنة بعد التأكيد",
    total: "الإجمالي",
    confirm: "الدفع عبر Paymob",
    secure: "دفع آمن ببطاقتك أو محفظتك الإلكترونية",
  },
  en: {
    title: "Confirm payment",
    subtitle: "You'll be redirected to a secure payment page",
    total: "Total",
    confirm: "Pay with Paymob",
    secure: "Secure payment via card or e-wallet",
  },
};

export default function PaymentGatewayModal({ amount, currency, onConfirm, onClose, disabled = false }) {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      dir={isRTL ? "rtl" : "ltr"}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(10,10,10,0.55)", backdropFilter: "blur(6px)" }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute top-4 end-4 text-gray-400 hover:text-gray-700"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-1">{t.title}</h2>
        <p className="text-xs text-gray-400 mb-5">{t.subtitle}</p>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-5">
          <span className="text-sm text-gray-500">{t.total}</span>
          <span className="text-lg font-black text-gray-900">{formatPrice(amount, currency, language)}</span>
        </div>

        <button
          disabled={disabled}
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 bg-[#003A91] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <ShieldCheck size={17} /> {t.confirm}
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-3">{t.secure}</p>
      </div>
    </div>
  );
}