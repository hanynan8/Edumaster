"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

function useContactData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=contact")
      .then((r) => r.json())
      .then((res) => { const doc = Array.isArray(res) ? res[0] : res; setData(doc); })
      .catch(console.error);
  }, []);
  return data;
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

// ✅ دالة التحقق من صحة الإيميل
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactPage() {
  const data = useContactData();
  const { language: lang } = useLanguage();

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

  const t = data.i18n[lang];
  const isRTL = lang === "ar";

  return (
    <>
      <style>{STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">
        <ContactHero data={data} t={t} />
        <ContactMain data={data} t={t} />
      </div>
    </>
  );
}

const CONTACT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&q=80";

function ContactHero({ data, t }) {
  return (
    <section className="relative overflow-hidden bg-white px-6 sm:px-12 md:px-20">
      <div className="relative w-full h-75 sm:h-90 md:h-105">
        <Image
          src={data?.hero?.backgroundImage || CONTACT_FALLBACK_IMAGE}
          alt={t.hero.headline ?? "Contact background"}
          fill
          className="object-cover object-center"
          priority
          unoptimized
        />

        {/* White card overlapping the image, Udemy-style — matches guest home hero */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-5 sm:px-8 md:px-12">
            <div className="bg-white rounded-none sm:rounded-md shadow-xl w-full max-w-75 sm:max-w-85 md:max-w-100 px-6 sm:px-8 py-6 sm:py-8 animate-fadein-up">
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

function PhoneIcon() {
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1D6FD8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" /></svg>;
}

function ContactMain({ data, t }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6 grid lg:grid-cols-2 gap-12 md:gap-14 lg:gap-16 items-start">
        <div>
          <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-8 sm:mb-10 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {t.info.title}
          </h2>
          <div className="flex flex-col gap-4 sm:gap-5">
            <InfoCard visible={visible} delay={150} icon={<EmailIcon />} label={t.info.emailLabel} value={data.contact.email} href={`mailto:${data.contact.email}`} />
            <InfoCard visible={visible} delay={220} icon={<WhatsAppIcon />} label={t.info.whatsappLabel} value={data.contact.whatsappDisplay} isExternal accent />
            <InfoCard visible={visible} delay={290} icon={<PhoneIcon />} label="Qatar" value="+971 47 190 1935" />
            <InfoCard visible={visible} delay={360} icon={<PhoneIcon />} label="Spain" value="+34 612 23 13 93" />
            <InfoCard visible={visible} delay={360} icon={<PhoneIcon />} label="Spain" value="+34 613 69 73 16" />
            <div className={`mt-1 p-5 sm:p-6 rounded-2xl bg-[#f7f7f7] border border-gray-100 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: "300ms" }}>
              <p className="text-gray-500 text-sm leading-relaxed">{t.info.note}</p>
            </div>
          </div>
        </div>
        <ConsultationForm data={data} t={t} visible={visible} />
      </div>
    </section>
  );
}

function InfoCard({ icon, label, value, href, isExternal, accent, visible, delay }) {
  const base = "group flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border transition-all duration-300 no-underline";
  const cls = accent
    ? `${base} border-[#1D6FD8]/20 bg-[#1D6FD8]/4 hover:bg-[#1D6FD8] hover:border-[#1D6FD8]`
    : `${base} border-gray-100 bg-white hover:border-[#1D6FD8]/30 hover:shadow-lg`;
  return (
    <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}
      className={`${cls} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} transition-all duration-500`}
      style={{ transitionDelay: `${delay}ms` }}>
      <span className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${accent ? "bg-[#1D6FD8]/10 group-hover:bg-white/20" : "bg-gray-100 group-hover:bg-[#1D6FD8]/10"}`}>
        {icon}
      </span>
      <div className="flex flex-col min-w-0">
        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-0.5 transition-colors duration-200 ${accent ? "text-[#1D6FD8] group-hover:text-white/70" : "text-gray-400"}`}>{label}</span>
        <span className={`font-black text-sm sm:text-base truncate transition-colors duration-200 ${accent ? "text-[#1D6FD8] group-hover:text-white" : "text-[#0a0a0a] group-hover:text-[#1D6FD8]"}`}>{value}</span>
      </div>
      <span className="ms-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ArrowRight size={15} color={accent ? "white" : "#1D6FD8"} />
      </span>
    </a>
  );
}

function ConsultationForm({ data, t, visible }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});

  const REQUIRED_LABELS   = { en: "Required",              ar: "مطلوب",                      es: "Obligatorio" };
  const OPTIONAL_LABELS   = { en: "Optional",              ar: "اختياري",                    es: "Opcional" };
  const EMAIL_ERROR_LABELS = { en: "Invalid email address", ar: "البريد الإلكتروني غير صحيح", es: "Correo electrónico inválido" };

  const lang = data.i18n ? Object.keys(data.i18n).find((l) => t === data.i18n[l]) ?? "en" : "en";

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === "email") {
      // ✅ تحقق فوري من الإيميل أثناء الكتابة
      setErrors((prev) => ({
        ...prev,
        email: e.target.value && !isValidEmail(e.target.value) ? "invalid" : false,
      }));
    } else if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: false }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {
      name:  !form.name,
      email: !form.email ? "empty" : !isValidEmail(form.email) ? "invalid" : false,
      phone: !form.phone,
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/data?collection=form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch { setStatus("error"); }
  }

  const req          = REQUIRED_LABELS[lang];
  const opt          = OPTIONAL_LABELS[lang];
  const emailErrMsg  = EMAIL_ERROR_LABELS[lang];

  return (
    <div id="form" className={`transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-6 sm:mb-8">{t.form.title}</h2>
      {status === "sent" ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-[#1D6FD8]/5 border border-[#1D6FD8]/20 flex flex-col items-center text-center gap-4">
          <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1D6FD8] flex items-center justify-center">
            <Check size={22} color="white" />
          </span>
          <h3 className="font-semibold text-lg sm:text-xl">{t.form.successTitle}</h3>
          <p className="text-gray-500 text-sm max-w-xs">{t.form.successMsg}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label={t.form.fields.name}  name="name"  type="text"  value={form.name}  onChange={handleChange} badge={req} error={errors.name}  errorMsg={req} />
            <Field label={t.form.fields.email} name="email" type="email" value={form.email} onChange={handleChange} badge={req} error={errors.email}
              errorMsg={errors.email === "invalid" ? emailErrMsg : req} />
          </div>
          <Field label={t.form.fields.phone} name="phone" type="tel" value={form.phone} onChange={handleChange} badge={req} error={errors.phone} errorMsg={req} />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t.form.fields.service}</label>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{opt}</span>
            </div>
            <select name="service" value={form.service} onChange={handleChange}
              className="w-full bg-[#f7f7f7] border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0a0a0a] focus:outline-none focus:border-[#1D6FD8] transition-colors">
              <option value="">{t.form.fields.servicePlaceholder}</option>
              {t.form.serviceOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t.form.fields.message}</label>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{opt}</span>
            </div>
            <textarea name="message" value={form.message} onChange={handleChange} rows={4} placeholder={t.form.fields.messagePlaceholder}
              className="w-full bg-[#f7f7f7] border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0a0a0a] placeholder-gray-400 focus:outline-none focus:border-[#1D6FD8] transition-colors resize-none" />
          </div>

          <button onClick={handleSubmit} disabled={status === "sending"}
            className="inline-flex items-center justify-center gap-2 bg-[#1D6FD8] text-white font-bold px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base hover:bg-[#C9A84C] transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-1">
            {status === "sending" ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t.form.sending}</>
            ) : (
              <>{t.form.submit}<ArrowRight size={16} /></>
            )}
          </button>
          {status === "error" && <p className="text-red-500 text-sm font-medium">{t.form.errorMsg}</p>}
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type, value, onChange, badge, error, errorMsg }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</label>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${error ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-100"}`}>
            {badge}
          </span>
        )}
      </div>
      <input type={type} name={name} value={value} onChange={onChange}
        className={`w-full bg-[#f7f7f7] border rounded-xl px-4 py-3 text-sm font-medium text-[#0a0a0a] focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-[#1D6FD8]"}`} />
      {/* ✅ رسالة الخطأ تحت الحقل */}
      {error && <span className="text-red-500 text-xs font-medium">{errorMsg}</span>}
    </div>
  );
}

function ArrowRight({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function Check({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}
function EmailIcon() {
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1D6FD8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" /></svg>;
}
function WhatsAppIcon() {
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1D6FD8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@300;400;700;800&display=swap');
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadein-up { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadein      { animation: fadein    0.6s ease both; }
  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }
`;