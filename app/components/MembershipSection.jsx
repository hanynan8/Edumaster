// path: app/components/MembershipSection.jsx
"use client";

/* ════════════════════════════════════════════════════════════════════
   components/MembershipSection.jsx
   ------------------------------------------------------------------
   Shared "Membership Plans" section, extracted from both home pages
   (logged-in and guest). Fetches the exact same endpoint the
   /membership page uses: GET /api/membership-plans, and reuses the
   exact same subscribe logic (free plans + Paymob checkout).

   No props required — it manages its own language, session, and
   data fetching, exactly like the original inline sections did.
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import PaymentGatewayModal from "@/app/components/payments/PaymentGatewayModal";
import { getPriceForCurrency, formatPrice } from "@/app/lib/currency";
import { Check as CheckIcon, Crown, Loader, CheckCircle2 } from "lucide-react";

const MEMBERSHIP_STRINGS = {
  ar: {
    label: "خطط الاشتراك",
    title: "افتح كل الكورسات باشتراك واحد",
    subtitle: "اختار الخطة اللي تناسبك وابدأ تعلّم من غير ما تدفع كل كورس لوحده",
    free: "مجانية",
    perMonth: "/شهر",
    perYear: "/سنة",
    allCourses: "كل الكورسات متاحة",
    someCourses: (n) => `${n} كورس متاح`,
    cta: "اشترك دلوقتي",
    viewAll: "شوف كل خطط الاشتراك",
    loading: "جارِ تحميل الخطط...",
    empty: "لسه مفيش خطط اشتراك متاحة",
    popular: "الأكتر طلبًا",
    subscribing: "جارِ التفعيل...",
    redirecting: "جارِ التحويل لصفحة الدفع...",
    subscribed: "خطتك الحالية",
    login: "سجّل دخولك للاشتراك",
    paymentSoon: "الدفع الإلكتروني غير متاح حاليًا — تواصل مع الإدارة للتفعيل اليدوي",
    paymentGatewayError: "تعذّر بدء عملية الدفع، حاول مرة أخرى",
    error: "تعذّر تحميل الخطط",
  },
  en: {
    label: "Membership Plans",
    title: "Unlock every course with one membership",
    subtitle: "Pick the plan that fits you and start learning without paying per course",
    free: "Free",
    perMonth: "/mo",
    perYear: "/yr",
    allCourses: "All courses included",
    someCourses: (n) => `${n} courses included`,
    cta: "Subscribe now",
    viewAll: "View all membership plans",
    loading: "Loading plans...",
    empty: "No membership plans available yet",
    popular: "Most popular",
    subscribing: "Activating...",
    redirecting: "Redirecting to payment...",
    subscribed: "Your current plan",
    login: "Log in to subscribe",
    paymentSoon: "Online payment isn't available right now — contact us to activate manually",
    paymentGatewayError: "Couldn't start the payment, please try again",
    error: "Couldn't load plans",
  },
};

/* same as /membership page: GET /api/membership-plans (active plans only) */
function useMembershipPlans() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/membership-plans")
      .then((r) => r.json())
      .then((res) => setPlans(Array.isArray(res) ? res : []))
      .catch(() => setError(true));
  }, []);
  return { plans, error };
}

/* scroll reveal hook */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ═══════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════ */
export default function MembershipSection() {
  const { language } = useLanguage();
  const t = MEMBERSHIP_STRINGS[language] ?? MEMBERSHIP_STRINGS.en;
  const { plans, error } = useMembershipPlans();
  const [ref, visible] = useReveal(0.08);

  // same logic as /membership: login gate + payment via Paymob
  const { data: session, status: sessionStatus } = useSession();
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [subscribingId, setSubscribingId] = useState(null);
  const [subscribeError, setSubscribeError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [gatewayPlan, setGatewayPlan] = useState(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrentPlanId(data?.status === "active" ? data?.plan?.id || null : null))
      .catch(() => {});
  }, [sessionStatus]);

  async function handleSubscribeCheckout(plan) {
    setGatewayPlan(null);
    setSubscribeError("");
    setSubscribingId(plan.id);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "membership", id: plan.id, language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectUrl) {
        setSubscribeError(
          data.error === "payment_gateway_not_configured" ? t.paymentSoon : t.paymentGatewayError
        );
        setSubscribingId(null);
        return;
      }
      window.location.href = data.redirectUrl;
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

    const isFree = plan.billingCycle === "free" || getPriceForCurrency(plan.prices, language).amount === 0;
    if (!isFree) {
      // 🅿️ بدل ما نتصل بـ Paymob على طول، بنفتح مودال الدفع (اللي دلوقتي
      // بيعرض بيانات التحويل البنكي طول ما Paymob مش مفعّل — شوف
      // PaymentGatewayModal.jsx / PAYMOB_ENABLED)
      setGatewayPlan(plan);
      return;
    }

    setSubscribeError("");
    setSubscribingId(plan.id);
    try {
      const res = await fetch(`/api/membership-plans/${plan.id}/subscribe`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "payment_required") return handleSubscribeCheckout(plan);
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

  // no login gate on viewing plans — this section must show for any guest
  if (error) return null;

  return (
    <section ref={ref} className="py-14 sm:py-16 md:py-20 bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
        <div className={`max-w-2xl mx-auto text-center mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <Label text={t.label} visible={visible} />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-3">{t.title}</h2>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed">{t.subtitle}</p>
        </div>

        {plans === null && (
          <div className="flex justify-center py-16">
            <Loader className="animate-spin text-[#003A91]" size={28} />
          </div>
        )}

        {plans?.length === 0 && (
          <p className="text-center text-gray-400 py-10">{t.empty}</p>
        )}

        {subscribeError && (
          <div className="max-w-xl mx-auto bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-xl text-center mb-8">
            {subscribeError}
          </div>
        )}

        {plans?.length > 0 && (() => {
          const featuredIndex = Math.floor((plans.length - 1) / 2);
          return (
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-7">
              {plans.map((plan, i) => {
                const isCurrent = currentPlanId === plan.id;
                const planPriceInfo = getPriceForCurrency(plan.prices, language);
                const isFree = plan.billingCycle === "free" || planPriceInfo.amount === 0;
                const isFeatured = plans.length > 1 && i === featuredIndex;
                return (
                  <div
                    key={plan.id}
                    className={`relative w-full sm:w-[260px] bg-white rounded-2xl border p-6 flex flex-col transition-all duration-500 ${
                      isCurrent
                        ? "border-[#003A91] ring-2 ring-[#003A91]/20"
                        : isFeatured
                        ? "border-[#003A91] shadow-xl shadow-[#003A91]/10 sm:scale-110 z-10"
                        : "border-gray-100 sm:scale-95 opacity-100"
                    } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    {isFeatured && !isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#003A91] text-white px-3 py-1 rounded-full whitespace-nowrap">
                        {t.popular}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#003A91] text-white px-3 py-1 rounded-full whitespace-nowrap">
                        {t.subscribed}
                      </span>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isFeatured || isCurrent ? "bg-[#003A91]/10" : "bg-amber-50"}`}>
                      <Crown size={18} className={isFeatured || isCurrent ? "text-[#003A91]" : "text-amber-500"} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-gray-400 mb-4">{plan.description}</p>}

                    <p className="text-2xl font-black text-gray-900 mb-1">
                      {isFree ? t.free : formatPrice(planPriceInfo.amount, planPriceInfo.currency, language)}
                      {!isFree && (
                        <span className="text-sm font-medium text-gray-400">
                          {plan.billingCycle === "yearly" ? t.perYear : t.perMonth}
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-gray-400 mb-4">
                      {(plan.allowedCourses?.length ?? 0) === 0 ? t.allCourses : t.someCourses(plan.allowedCourses.length)}
                    </p>

                    {plan.features?.length > 0 && (
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.slice(0, 4).map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckIcon size={15} className="text-[#003A91] shrink-0 mt-0.5" /> {f}
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
                        className={`mt-auto w-full inline-flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl transition-opacity text-sm text-center disabled:opacity-60 ${
                          isFeatured ? "bg-[#003A91] text-white hover:opacity-90" : "bg-[#0a0a0a] text-white hover:opacity-90"
                        }`}
                      >
                        {subscribingId === plan.id
                          ? (isFree ? t.subscribing : t.redirecting)
                          : t.cta}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {plans?.length > 0 && (
          <div className="flex justify-center mt-8 sm:mt-10">
            <Link href="/membership" className="inline-flex items-center gap-2 font-bold text-[#003A91] hover:underline text-sm">
              {t.viewAll} <ArrowIcon size={13} />
            </Link>
          </div>
        )}
      </div>

      {showAuthModal && (
        <AuthModal mode={authMode} onClose={() => setShowAuthModal(false)} onSwitch={(next) => setAuthMode(next)} />
      )}

      {gatewayPlan && (() => {
        const priceInfo = getPriceForCurrency(gatewayPlan.prices, language);
        return (
          <PaymentGatewayModal
            amount={priceInfo.amount}
            currency={priceInfo.currency}
            disabled={subscribingId === gatewayPlan.id}
            onClose={() => setGatewayPlan(null)}
            onConfirm={() => handleSubscribeCheckout(gatewayPlan)}
          />
        );
      })()}
    </section>
  );
}

/* ─────────────────────────────────────────
   SHARED UI BITS (local to this component)
───────────────────────────────────────── */
function Label({ text, visible }) {
  return (
    <div className={`flex items-center gap-2 mb-3 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="w-4 sm:w-5 h-px bg-[#C9A227]" />
      <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[#C9A227]">{text}</span>
    </div>
  );
}

function ArrowIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}