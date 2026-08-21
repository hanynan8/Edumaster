"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/app/components/auth/authModel";
import { Check as CheckIcon, Crown, Loader, CheckCircle2 } from "lucide-react";

function useServicesData() {
  const [data, setData] = useState(null);
  useEffect(() => {
fetch("/api/data?collection=services")
  .then((r) => r.json())
  .then((res) => {
    console.log("API response:", res); // ← شوف الشكل هنا
    const doc = Array.isArray(res) ? res[0] : res;
    setData(doc);
  })
      .catch(console.error);
  }, []);
  return data;
}

// خطط الاشتراك (membership) — عامة، بتتعرض لأي زائر بدون تسجيل دخول.
// نفس الـ API المستخدم في /membership: GET /api/membership-plans
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

function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function ArrowRight({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function Check({ size = 11 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1D6FD8" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}

function Label({ text, visible, dark = false }) {
  return (
    <div className={`flex items-center gap-2 mb-3 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="w-4 sm:w-5 h-px bg-[#1D6FD8]" />
      <span className={`text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase ${dark ? "text-gray-400" : "text-[#1D6FD8]"}`}>{text}</span>
    </div>
  );
}

export default function ServicesPage() {
  const { language, isRTL } = useLanguage();
  const data = useServicesData();

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Loading</span>
        </div>
      </div>
    );
  }

  const t = data.i18n[language] ?? data.i18n["en"];

  return (
    <>
      <style>{STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">
        <HeroSection data={data} t={t} />
        <ServicesList data={data} t={t} />
        <MembershipSection isRTL={isRTL} />
        <StatsStrip data={data} t={t} />
      </div>
    </>
  );
}

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
    redirecting: "جارِ التحويل لـ PayPal...",
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
    redirecting: "Redirecting to PayPal...",
    subscribed: "Your current plan",
    login: "Log in to subscribe",
    paymentSoon: "Online payment isn't available right now — contact us to activate manually",
    paymentGatewayError: "Couldn't start the payment, please try again",
    error: "Couldn't load plans",
  },
};

function MembershipSection({ isRTL }) {
  const { language } = useLanguage();
  const t = MEMBERSHIP_STRINGS[language] ?? MEMBERSHIP_STRINGS.en;
  const { plans, error } = useMembershipPlans();
  const [ref, visible] = useReveal(0.08);

  // نفس بالظبط منطق /membership: تسجيل الدخول + الدفع (مجاني أو PayPal)
  const { data: session, status: sessionStatus } = useSession();
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [subscribingId, setSubscribingId] = useState(null);
  const [subscribeError, setSubscribeError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrentPlanId(data?.status === "active" ? data?.plan?.id || null : null))
      .catch(() => {});
  }, [sessionStatus]);

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

  // مفيش أي شرط تسجيل دخول لعرض الخطط — القسم ده لازم يظهر لأي زائر عادي.
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
            <Loader className="animate-spin text-[#1D6FD8]" size={28} />
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
                const isFree = plan.billingCycle === "free" || plan.price === 0;
                const isFeatured = plans.length > 1 && i === featuredIndex;
                return (
                  <div
                    key={plan.id}
                    className={`relative w-full sm:w-65 bg-white rounded-2xl border p-6 flex flex-col transition-all duration-500 ${
                      isCurrent
                        ? "border-[#1D6FD8] ring-2 ring-[#1D6FD8]/20"
                        : isFeatured
                        ? "border-[#1D6FD8] shadow-xl shadow-[#1D6FD8]/10 sm:scale-110 z-10"
                        : "border-gray-100 sm:scale-95 opacity-100"
                    } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    {isFeatured && !isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1D6FD8] text-white px-3 py-1 rounded-full whitespace-nowrap">
                        {t.popular}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1D6FD8] text-white px-3 py-1 rounded-full whitespace-nowrap">
                        {t.subscribed}
                      </span>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isFeatured || isCurrent ? "bg-[#1D6FD8]/10" : "bg-amber-50"}`}>
                      <Crown size={18} className={isFeatured || isCurrent ? "text-[#1D6FD8]" : "text-amber-500"} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{plan.name}</h3>
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
                      {(plan.allowedCourses?.length ?? 0) === 0 ? t.allCourses : t.someCourses(plan.allowedCourses.length)}
                    </p>

                    {plan.features?.length > 0 && (
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.slice(0, 4).map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckIcon size={15} className="text-[#1D6FD8] shrink-0 mt-0.5" /> {f}
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
                          isFeatured ? "bg-[#1D6FD8] text-white hover:opacity-90" : "bg-[#0a0a0a] text-white hover:opacity-90"
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
            <Link href="/membership" className="inline-flex items-center gap-2 font-bold text-[#1D6FD8] hover:underline text-sm">
              {t.viewAll} <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {showAuthModal && (
        <AuthModal mode={authMode} onClose={() => setShowAuthModal(false)} onSwitch={(next) => setAuthMode(next)} />
      )}
    </section>
  );
}
function HeroSection({ data, t }) {
  return (
    <section className="relative overflow-hidden bg-white px-0 min-[851px]:px-20">
      <div className="relative w-full">
        <div className="relative w-full h-75 sm:h-90 md:h-105">
          <Image
            src={data.hero.backgroundImage}
            alt={t.hero.headline ?? "Services background"}
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
        </div>

        {/* White card: stacked below the image up to 850px, overlapping it above 850px — matches guest home hero */}
        <div className="min-[851px]:absolute min-[851px]:inset-0 flex items-center">
          <div className="w-full px-0 min-[851px]:px-12">
            <div className="bg-white rounded-none min-[851px]:rounded-md shadow-none min-[851px]:shadow-xl w-full max-w-full min-[851px]:max-w-100 px-6 sm:px-8 py-6 sm:py-8 animate-fadein-up">
              <h1 className="font-semibold tracking-tight text-[#1c1d1f] text-xl sm:text-2xl md:text-3xl leading-tight mb-2 sm:mb-3">
                {t.hero.headline}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed animate-fadein-up2">
                {t.hero.subheadline}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const ID_MAP = {
  "Study in Spain": "study-spain",
  "Visa Services": "visa",
  "language Courses": "language",
};

function ServicesList({ data, t }) {
  const merged = data.services.map((svc) => {
    const i18nKey = ID_MAP[svc.id] ?? svc.id;
    return { ...svc, ...(t.services[i18nKey] ?? {}) };
  });

  return (
    <section className="py-14 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-0">
        {merged.map((svc, i) => <ServiceRow key={svc.id} service={svc} index={i} />)}
      </div>
    </section>
  );
}

function ServiceRow({ service, index }) {
  const [ref, visible] = useReveal(0.08);
  const isEven = index % 2 === 0;
  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-0 items-stretch border-b border-gray-100 last:border-0">
      {/* Image — always first on mobile */}
      <div className={`relative overflow-hidden min-h-55 sm:min-h-75 lg:min-h-115 order-1 ${isEven ? "lg:order-1" : "lg:order-2"} transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
        <Image src={service.image} alt={service.title ?? "Service image"} fill  className="object-cover hover:scale-105 transition-transform duration-700" unoptimized />
        <div className="absolute top-0 inset-x-0 h-1" style={{ background: service.color }} />
        <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <span className="text-white font-black text-base sm:text-xl leading-none">{String(index + 1).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col justify-center px-5 sm:px-8 md:px-10 py-8 sm:py-12 lg:py-20 order-2 ${isEven ? "lg:order-2 bg-white" : "lg:order-1 bg-[#f7f7f7]"} transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-3 sm:mb-4">{service.title}</h2>
        <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed mb-6 sm:mb-8">{service.desc}</p>
        <ul className="flex flex-col gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          {(service.features ?? []).map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 sm:gap-3">
              <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><Check size={20} /></span>
              <span className="text-[#0a0a0a] text-xs sm:text-sm font-medium">{f}</span>
            </li>
          ))}
        </ul>
        <div>
          <Link href={service.ctaHref}
            className="inline-flex items-center gap-2 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg text-sm text-white transition-all active:scale-95 shadow-sm"
            style={{ background: service.color }}>
            {service.cta} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatsStrip({ data, t }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className="relative py-16 sm:py-20 md:py-28 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 z-0 opacity-10">
        <Image src={data.stats.backgroundImage} alt="" aria-hidden="true" fill className="object-cover" unoptimized />
      </div>
      <div className="absolute top-0 inset-x-0 h-0.75 bg-[#1D6FD8] z-10" />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
        <div className={`mb-10 sm:mb-14 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight">{t.stats.title}</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/8">
          {data.stats.items.map((s, i) => (
            <div key={i} className={`bg-[#111] p-5 sm:p-7 md:p-10 flex flex-col gap-2 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <span className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">{s.value}</span>
              <span className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-1 sm:mt-2">{t.stats.items[i]}</span>
              <div className="w-5 sm:w-6 h-0.5 bg-[#1D6FD8] mt-1 sm:mt-2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@400;700;800&display=swap');
  @keyframes fadein     { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadein-up  { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadein      { animation: fadein    0.6s ease both; }
  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }
`;