"use client";

// app/(pages)/payments/receipt/[id]/page.jsx
//
// Phase 3 — اليوم 30: "توليد Invoice/Receipt بسيط". مفيش PDF لازم — إيصال
// بسيط قابل للطباعة (window.print → "Save as PDF" من المتصفح كافي لأي
// طالب محتاج نسخة). البيانات جايه من GET /api/payments/[id]، اللي بيسمح
// بالوصول لصاحب الدفعة أو الأدمن بس.

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader, Printer, ArrowRight, ArrowLeft } from "lucide-react";

const STATUS_LABELS = {
  ar: { succeeded: "مدفوعة", pending: "قيد الانتظار", failed: "فشلت", refunded: "مستردة" },
  en: { succeeded: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded" },
};

const STRINGS = {
  ar: {
    title: "إيصال الدفع",
    invoiceNo: "رقم الفاتورة",
    date: "التاريخ",
    billedTo: "الفاتورة باسم",
    item: "البند",
    amount: "المبلغ",
    status: "الحالة",
    provider: "بوابة الدفع",
    print: "طباعة / حفظ PDF",
    back: "رجوع",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل تفاصيل الفاتورة",
    course: "كورس",
    membership: "اشتراك",
  },
  en: {
    title: "Payment Receipt",
    invoiceNo: "Invoice #",
    date: "Date",
    billedTo: "Billed to",
    item: "Item",
    amount: "Amount",
    status: "Status",
    provider: "Payment gateway",
    print: "Print / Save as PDF",
    back: "Back",
    loading: "Loading...",
    error: "Couldn't load invoice details",
    course: "Course",
    membership: "Membership",
  },
};

export default function ReceiptPage({ params }) {
  const { id } = usePromise(params);
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;
  // 🔧 GET /api/payments/[id] بيسمح لصاحب الدفعة أو للأدمن — يعني ممكن
  // مدرّس (صاحب دفعة) أو أدمن (بيشوف دفعة حد تاني) يوصلوا هنا. رابط "رجوع"
  // كان "/student/payments" ثابت، واللي بيرفض دلوقتي أي role غير student.
  const { data: session } = useSession();
  const role = session?.user?.role;
  const backHref = role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student/payments";

  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/payments/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data ? setPayment(data) : setError(t.error)))
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!payment && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f7f7f7]">
        <Loader className="animate-spin text-[#1D6FD8]" size={28} />
        <p className="text-sm text-gray-400">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7] px-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const itemLabel = payment.type === "course" ? payment.courseTitle : payment.membershipPlanName;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f7f7f7] py-10 px-4"
    >
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link href={backHref} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <BackArrow size={15} className={isRTL ? "rotate-180" : ""} /> {t.back}
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#0a0a0a] text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Printer size={15} /> {t.print}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-800">EduMaster</h1>
              <p className="text-xs text-gray-400 mt-1">{t.title}</p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                payment.status === "succeeded"
                  ? "bg-green-50 text-green-700"
                  : payment.status === "refunded"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {STATUS_LABELS[language]?.[payment.status] || payment.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-1">{t.invoiceNo}</p>
              <p className="font-mono font-bold text-gray-800">{payment.invoiceNumber || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">{t.date}</p>
              <p className="font-semibold text-gray-800">
                {new Date(payment.paidAt || payment.createdAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 text-xs mb-1">{t.billedTo}</p>
              <p className="font-semibold text-gray-800">{payment.customerName}</p>
              <p className="text-gray-400 text-xs">{payment.customerEmail}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase">
                <th className="text-start py-2 font-semibold">{t.item}</th>
                <th className="text-end py-2 font-semibold">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3">
                  <p className="font-semibold text-gray-800">{itemLabel || "—"}</p>
                  <p className="text-xs text-gray-400">{payment.type === "course" ? t.course : t.membership}</p>
                </td>
                <td className="py-3 text-end font-bold text-gray-800">
                  {(payment.amount / 100).toFixed(2)} {payment.currency}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between items-center border-t border-gray-100 pt-4 text-sm">
            <span className="text-gray-400">{t.provider}</span>
            <span className="font-semibold text-gray-700 capitalize">{payment.provider}</span>
          </div>
        </div>
      </div>
    </div>
  );
}