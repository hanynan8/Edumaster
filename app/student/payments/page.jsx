"use client";

// app/student/payments/page.jsx
//
// Phase 3 — اليوم 31-32: "سجل المدفوعات" بتاع الطالب. بتجيب GET
// /api/payments (مدفوعات المستخدم الحالي بس، مع pagination بسيطة) وتعرضها
// كجدول/كروت مع رابط للإيصال لكل عملية ناجحة.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Receipt, Loader, ArrowRight, ArrowLeft, BookOpen, ChevronRight, ChevronLeft, CreditCard,
} from "lucide-react";

const STRINGS = {
  ar: {
    title: "سجل المدفوعات",
    subtitle: "كل عمليات الدفع اللي عملتها",
    myCourses: "كورساتي",
    payments: "المدفوعات",
    empty: "لسه معملتش أي عملية دفع",
    browse: "تصفّح الكورسات",
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل سجل المدفوعات",
    statusLabels: { succeeded: "ناجحة", pending: "قيد الانتظار", failed: "فشلت", refunded: "مستردة" },
    typeLabels: { course: "كورس", membership: "اشتراك" },
    viewReceipt: "الإيصال",
    prev: "السابق",
    next: "التالي",
    page: (p, total) => `صفحة ${p} من ${total}`,
  },
  en: {
    title: "Payment History",
    subtitle: "All the payments you've made",
    myCourses: "My Courses",
    payments: "Payments",
    empty: "You haven't made any payments yet",
    browse: "Browse Courses",
    loading: "Loading...",
    error: "Couldn't load your payment history",
    statusLabels: { succeeded: "Succeeded", pending: "Pending", failed: "Failed", refunded: "Refunded" },
    typeLabels: { course: "Course", membership: "Membership" },
    viewReceipt: "Receipt",
    prev: "Previous",
    next: "Next",
    page: (p, total) => `Page ${p} of ${total}`,
  },
};

function statusColor(status) {
  if (status === "succeeded") return "bg-green-50 text-green-700";
  if (status === "refunded") return "bg-amber-50 text-amber-700";
  if (status === "failed") return "bg-red-50 text-red-600";
  return "bg-gray-100 text-gray-500";
}

export default function StudentPaymentsPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;

  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    fetch(`/api/payments?page=${page}&limit=10`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => (res ? setData(res) : setError(t.error)))
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f7f7]" style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0a0a0a] to-[#1D6FD8] flex items-center justify-center">
            <CreditCard className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
            <p className="text-sm text-gray-400">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Link href="/student" className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
            {t.myCourses}
          </Link>
          <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#0a0a0a] text-white">{t.payments}</span>
        </div>

        {!data && !error && (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-[#1D6FD8]" size={32} />
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {data?.payments?.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <Receipt className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400 mb-4">{t.empty}</p>
            <Link href="/courses" className="text-[#1D6FD8] font-semibold hover:underline">
              {t.browse}
            </Link>
          </div>
        )}

        {data?.payments?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {data.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 px-5 py-4 border-b last:border-b-0 border-gray-50 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {p.courseTitle || p.membershipPlanName || "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.typeLabels[p.type] || p.type} · {new Date(p.createdAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-bold text-gray-800">
                    {(p.amount / 100).toFixed(2)} {p.currency}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusColor(p.status)}`}>
                    {t.statusLabels[p.status] || p.status}
                  </span>
                  {p.status === "succeeded" && (
                    <Link href={`/payments/receipt/${p.id}`} className="text-xs font-semibold text-[#1D6FD8] hover:underline whitespace-nowrap">
                      {t.viewReceipt}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data?.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-white border border-gray-100 disabled:opacity-40"
            >
              {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <span className="text-xs text-gray-400">{t.page(data.page, data.pages)}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="p-2 rounded-lg bg-white border border-gray-100 disabled:opacity-40"
            >
              {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}