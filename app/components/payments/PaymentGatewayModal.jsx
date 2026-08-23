"use client";

// app/components/payments/PaymentGatewayModal.jsx
//
// 🆕 مودال بسيط بيخلي المستخدم يختار بوابة الدفع (PayPal أو Paymob) قبل ما
// نبدأ POST /api/payments/checkout. مستخدم من صفحتين: شراء كورس مفرد
// (app/(pages)/courses/[id]/page.jsx) واشتراك membership مدفوع
// (app/(pages)/membership/page.jsx) — نفس الشكل بالظبط في الاتنين عشان
// تجربة موحّدة.
//
// الاستخدام:
//   <PaymentGatewayModal
//     onSelect={(provider) => ...}   // "paypal" | "paymob"
//     onClose={() => ...}
//   />

import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, CreditCard, Wallet } from "lucide-react";

const STRINGS = {
  ar: {
    title: "اختار طريقة الدفع",
    subtitle: "هتتحول لصفحة الدفع الآمنة بعد الاختيار",
    paypal: "PayPal",
    paypalDesc: "بطاقات دولية وحساب PayPal",
    paymob: "Paymob",
    paymobDesc: "فيزا/ماستركارد ومحافظ إلكترونية محلية",
  },
  en: {
    title: "Choose a payment method",
    subtitle: "You'll be redirected to a secure payment page",
    paypal: "PayPal",
    paypalDesc: "International cards & PayPal balance",
    paymob: "Paymob",
    paymobDesc: "Local cards & e-wallets",
  },
};

export default function PaymentGatewayModal({ onSelect, onClose, disabled = false }) {
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

  const options = [
    { id: "paypal", label: t.paypal, desc: t.paypalDesc, Icon: CreditCard },
    { id: "paymob", label: t.paymob, desc: t.paymobDesc, Icon: Wallet },
  ];

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

        <div className="space-y-3">
          {options.map(({ id, label, desc, Icon }) => (
            <button
              key={id}
              disabled={disabled}
              onClick={() => onSelect(id)}
              className="w-full flex items-center gap-3 border border-gray-200 rounded-xl p-3.5 text-start hover:border-[#1D6FD8] hover:bg-blue-50/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon size={18} className="text-[#1D6FD8]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-[11px] text-gray-400 truncate">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}