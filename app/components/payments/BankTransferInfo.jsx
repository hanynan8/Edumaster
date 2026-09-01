// path: app/components/payments/BankTransferInfo.jsx
"use client";

// app/components/payments/BankTransferInfo.jsx
//
// 🅿️ PAYMOB مؤقتًا متوقف (الحساب لسه مش مفعّل عند Paymob) — بدالها بيانات
// تحويل بنكي بتتعرض هنا للمستخدم، ومطلوب منه يبعت سكرين شوت التحويل على
// واتساب لتفعيل الكورس/الاشتراك يدويًا من الإدارة.
//
// لما يتفعّل حساب Paymob: رجّع PAYMOB_ENABLED في PaymentGatewayModal.jsx
// (وأي مكان تاني بيستخدم المكوّن ده) لـ true، والمكوّن ده هيبقى غير
// مستخدم تلقائيًا (تقدر تسيبه موجود من غير ما يتشال، مفيش ضرر).

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Copy, Check, MessageCircle, Landmark } from "lucide-react";
import { formatPrice } from "@/app/lib/currency";

// 🏦 بيانات التحويل — عدّل هنا لو أي بيانات اتغيّرت
const BANK_DETAILS = {
  accountNumber: "1203551110010201",
  bankName: { ar: "البنك العربي الأفريقي الدولي", en: "Arab African International Bank", es: "Arab African International Bank" },
  bankShort: "AAIB",
  swift: "EG120057025701203551110010201",
  whatsapp: "201010115514", // بدون + أو أصفار في الأول (صيغة wa.me)
  whatsappDisplay: "+20 10 10115514",
};

const STRINGS = {
  ar: {
    title: "الدفع عن طريق تحويل بنكي",
    subtitle: "الدفع الإلكتروني هيتفعّل قريبًا — دلوقتي التفعيل بيتم عن طريق تحويل بنكي يدوي",
    amountLabel: "المبلغ المطلوب",
    accountLabel: "رقم الحساب",
    bankLabel: "البنك",
    swiftLabel: "SWIFT/BIC",
    copy: "نسخ",
    copied: "اتنسخ!",
    steps: "خطوات التفعيل",
    step1: "حوّل المبلغ المطلوب على رقم الحساب الموضّح فوق.",
    step2: "خد سكرين شوت لإثبات التحويل.",
    step3: "ابعت السكرين شوت على واتساب على الرقم اللي تحت.",
    step4: "هيتم تفعيل الكورس/الاشتراك خلال وقت قصير بعد التأكيد.",
    sendWhatsapp: "إرسال إشعار الدفع عبر واتساب",
  },
  en: {
    title: "Pay by bank transfer",
    subtitle: "Online payment will be available soon — activation is currently done via manual bank transfer",
    amountLabel: "Amount due",
    accountLabel: "Account number",
    bankLabel: "Bank",
    swiftLabel: "SWIFT/BIC",
    copy: "Copy",
    copied: "Copied!",
    steps: "Activation steps",
    step1: "Transfer the amount due to the account number above.",
    step2: "Take a screenshot as proof of transfer.",
    step3: "Send the screenshot via WhatsApp to the number below.",
    step4: "Your course/subscription will be activated shortly after confirmation.",
    sendWhatsapp: "Send payment proof via WhatsApp",
  },
  es: {
    title: "Pago por transferencia bancaria",
    subtitle: "El pago en línea estará disponible pronto — la activación se realiza actualmente mediante transferencia bancaria manual",
    amountLabel: "Monto a pagar",
    accountLabel: "Número de cuenta",
    bankLabel: "Banco",
    swiftLabel: "SWIFT/BIC",
    copy: "Copiar",
    copied: "¡Copiado!",
    steps: "Pasos de activación",
    step1: "Transfiere el monto indicado a la cuenta anterior.",
    step2: "Toma una captura de pantalla como comprobante.",
    step3: "Envía la captura por WhatsApp al número de abajo.",
    step4: "Tu curso/suscripción se activará poco después de la confirmación.",
    sendWhatsapp: "Enviar comprobante por WhatsApp",
  },
};

function CopyRow({ label, value, copiedField, setCopiedField, fieldKey }) {
  const copied = copiedField === fieldKey;
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-bold text-gray-900 break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopiedField(fieldKey);
          setTimeout(() => setCopiedField(null), 1500);
        }}
        className="shrink-0 ms-3 w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#003A91] hover:border-[#003A91] transition-colors"
        aria-label="copy"
      >
        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function BankTransferInfo({ amount, currency }) {
  const { language } = useLanguage();
  const t = STRINGS[language] ?? STRINGS.en;
  const [copiedField, setCopiedField] = useState(null);

  const waMessage = encodeURIComponent(
    language === "ar"
      ? `مرحبًا، أنا بعتلكم إشعار تحويل بمبلغ ${formatPrice(amount, currency, language)} على منصة Edumaster.`
      : `Hello, I'm sending you a payment transfer notice for ${formatPrice(amount, currency, language)} on Edumaster.`
  );
  const waLink = `https://wa.me/${BANK_DETAILS.whatsapp}?text=${waMessage}`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Landmark size={18} className="text-[#003A91]" />
        <h2 className="text-lg font-bold text-gray-900">{t.title}</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5 leading-relaxed">{t.subtitle}</p>

      {amount != null && currency && (
        <div className="flex items-center justify-between bg-[#003A91]/5 rounded-xl px-4 py-3 mb-3">
          <span className="text-sm text-gray-500">{t.amountLabel}</span>
          <span className="text-lg font-black text-[#003A91]">{formatPrice(amount, currency, language)}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-5">
        <CopyRow
          label={t.accountLabel}
          value={BANK_DETAILS.accountNumber}
          copiedField={copiedField}
          setCopiedField={setCopiedField}
          fieldKey="account"
        />
        <CopyRow
          label={t.bankLabel}
          value={`${BANK_DETAILS.bankName[language] ?? BANK_DETAILS.bankName.en} (${BANK_DETAILS.bankShort})`}
          copiedField={copiedField}
          setCopiedField={setCopiedField}
          fieldKey="bank"
        />
        <CopyRow
          label={t.swiftLabel}
          value={BANK_DETAILS.swift}
          copiedField={copiedField}
          setCopiedField={setCopiedField}
          fieldKey="swift"
        />
      </div>

      <div className="bg-amber-50 rounded-xl px-4 py-3 mb-5">
        <p className="text-xs font-bold text-amber-800 mb-2">{t.steps}</p>
        <ol className="text-xs text-amber-700 leading-relaxed list-decimal ps-4 space-y-1">
          <li>{t.step1}</li>
          <li>{t.step2}</li>
          <li>{t.step3}</li>
          <li>{t.step4}</li>
        </ol>
      </div>

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
      >
        <MessageCircle size={17} /> {t.sendWhatsapp}
      </a>
      <p className="text-[11px] text-gray-400 text-center mt-3">{BANK_DETAILS.whatsappDisplay}</p>
    </div>
  );
}