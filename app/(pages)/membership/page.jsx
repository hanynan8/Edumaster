"use client";

// app/(pages)/membership/page.jsx
//
// Phase 2 (اليوم 16-17/20-21) + Phase 3 (اليوم 29): صفحة عامة تعرض خطط
// الاشتراك (Free/Basic/Standard/Pro) اللي الأدمن أنشأها من
// app/api/membership-plans. أي زائر يقدر يشوفها؛ الاشتراك الفعلي:
//   - خطة مجانية → POST /api/membership-plans/[id]/subscribe (فوري، بدون دفع)
//   - خطة مدفوعة (شهري/سنوي) → POST /api/payments/checkout {type:"membership"}
//     يفتح PayPal Order ويحوّل المستخدم لصفحة الموافقة؛ التفعيل الفعلي
//     (user.membership) بيحصل بعد نجاح الدفع في app/api/payments/paypal/return
//     أو app/api/payments/webhook — نفس بالظبط منطق شراء الكورس المفرد.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import { Check, Crown, Loader, CheckCircle2 } from "lucide-react";

const STRINGS = {
  ar: {
    title: "خطط الاشتراك",
    subtitle: "اختار الخطة المناسبة لك وافتح كورسات أكتر",
    perMonth: "/شهر",
    perYear: "/سنة",
    free: "مجانية",
    subscribe: "اشترك",
    subscribing: "جارِ التفعيل...",
    redirecting: "جارِ التحويل لـ PayPal...",
    subscribed: "خطتك الحالية",
    login: "سجّل دخولك للاشتراك",
    paymentSoon: "الدفع الإلكتروني غير متاح حاليًا — تواصل مع الإدارة للتفعيل اليدوي",
    paymentGatewayError: "تعذّر بدء عملية الدفع، حاول مرة أخرى",
    allCourses: "كل الكورسات متاحة",
    someCourses: (n) => `${n} كورس متاح`,
    loading: "جارِ التحميل...",
    error: "تعذّر تحميل الخطط",
    empty: "لسه مفيش خطط اشتراك متاحة",
  },
  en: {
    title: "Membership Plans",
    subtitle: "Pick the plan that fits you and unlock more courses",
    perMonth: "/mo",
    perYear: "/yr",
    free: "Free",
    subscribe: "Subscribe",
    subscribing: "Activating...",
    redirecting: "Redirecting to PayPal...",
    subscribed: "Your current plan",
    login: "Log in to subscribe",
    paymentSoon: "Online payment isn't available right now — contact us to activate manually",
    paymentGatewayError: "Couldn't start the payment, please try again",
    allCourses: "All courses included",
    someCourses: (n) => `${n} courses included`,
    loading: "Loading...",
    error: "Couldn't load plans",
    empty: "No membership plans available yet",
  },
};

export default function MembershipPage() {
  const { language, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const { data: session, status: sessionStatus } = useSession();

  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [subscribingId, setSubscribingId] = useState(null);
  const [subscribeError, setSubscribeError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    fetch("/api/membership-plans")
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrentPlanId(data?.status === "active" ? data?.plan?.id || null : null))
      .catch(() => {});
  }, [sessionStatus]);

  // 🆕 Phase 3 — اليوم 29: خطة مدفوعة → PayPal checkout بدل التفعيل الفوري.
  // بعد الموافقة على PayPal، المستخدم بيرجع لـ app/api/payments/paypal/return
  // اللي بيعمل capture ويفعّل user.membership فعليًا (grantMembershipAccess
  // في app/lib/paymentHelpers.js) — مش هنا.
  async function handleSubscribeWithPaypal(plan) {
    setSubscribeError("");
    setSubscribingId(plan.id);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "membership", id: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.approveUrl) {
        setSubscribeError(
          data.error === "payment_gateway_not_configured" ? t.paymentSoon : t.paymentGatewayError
        );
        setSubscribingId(null);
        return;
      }
      window.location.href = data.approveUrl;
    } catch {
      setSubscribeError(t.paymentGatewayError);
      setSubscribingId(null);
    }
  }

  async function handleSubscribe(plan) {
    if (!session?.user) {
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }

    const isFree = plan.billingCycle === "free" || plan.price === 0;
    if (!isFree) {
      return handleSubscribeWithPaypal(plan);
    }

    setSubscribeError("");
    setSubscribingId(plan.id);
    try {
      const res = await fetch(`/api/membership-plans/${plan.id}/subscribe`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // fallback نادر: السيرفر شايف إنها مدفوعة رغم كده → نجرّب PayPal
        if (data.error === "payment_required") return handleSubscribeWithPaypal(plan);
        setSubscribeError(t.error);
        return;
      }
      setCurrentPlanId(plan.id);
    } catch {
      setSubscribeError(t.error);
    } finally {
      setSubscribingId(null);
    }
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f7f7]" style={{ fontFamily: "'DM Sans', 'Tajawal', sans-serif" }}>
      <section className="bg-[#0a0a0a] text-white text-center py-14 px-4">
        <h1 className="text-3xl sm:text-4xl font-black mb-3">{t.title}</h1>
        <p className="text-gray-300">{t.subtitle}</p>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {plans === null && !error && (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-[#1D6FD8]" size={32} />
          </div>
        )}

        {error && <div className="max-w-md mx-auto bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl text-center">{error}</div>}

        {subscribeError && (
          <div className="max-w-xl mx-auto bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-xl text-center mb-8">
            {subscribeError}
          </div>
        )}

        {plans?.length === 0 && <p className="text-center text-gray-400 py-16">{t.empty}</p>}

        {plans?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const isCurrent = currentPlanId === plan.id;
              const isFree = plan.billingCycle === "free" || plan.price === 0;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl border p-6 flex flex-col ${
                    isCurrent ? "border-[#1D6FD8] ring-2 ring-[#1D6FD8]/20" : "border-gray-100"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 start-6 text-[10px] font-bold bg-[#1D6FD8] text-white px-3 py-1 rounded-full">
                      {t.subscribed}
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                    <Crown size={18} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{plan.name}</h3>
                  {plan.description && <p className="text-xs text-gray-400 mb-4">{plan.description}</p>}

                  <p className="text-2xl font-black text-gray-900 mb-1">
                    {isFree ? t.free : `${plan.price} ${plan.currency || "EGP"}`}
                    {!isFree && (
                      <span className="text-sm font-medium text-gray-400">
                        {plan.billingCycle === "yearly" ? t.perYear : t.perMonth}
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-gray-400 mb-4">
                    {plan.allowedCourses.length === 0 ? t.allCourses : t.someCourses(plan.allowedCourses.length)}
                  </p>

                  {plan.features?.length > 0 && (
                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check size={15} className="text-[#1D6FD8] shrink-0 mt-0.5" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {isCurrent ? (
                    <div className="mt-auto flex items-center justify-center gap-2 bg-green-50 text-green-700 font-bold py-2.5 rounded-xl text-sm">
                      <CheckCircle2 size={15} /> {t.subscribed}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={subscribingId === plan.id}
                      className="mt-auto w-full bg-[#0a0a0a] text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
                    >
                      {subscribingId === plan.id
                        ? (isFree ? t.subscribing : t.redirecting)
                        : t.subscribe}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showAuthModal && (
        <AuthModal mode={authMode} onClose={() => setShowAuthModal(false)} onSwitch={(next) => setAuthMode(next)} />
      )}
    </div>
  );
}