"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

function useBlogsData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/data?collection=blogs")
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

function formatDate(dateStr, lang) {
  const date = new Date(dateStr);
  const localeMap = { en: "en-US", ar: "ar-EG", es: "es-ES" };
  return date.toLocaleDateString(localeMap[lang] || "en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogsPage() {
  const data = useBlogsData();
  const { language: lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");

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
  const filteredPosts = activeCategory === "all" ? data.posts : data.posts.filter((p) => p.category === activeCategory);
  const featuredPost = data.posts.find((p) => p.featured);
  const gridPosts = filteredPosts.filter((p) => !p.featured || activeCategory !== "all");

  return (
    <>
      <style>{STYLES}</style>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">
        <BlogHero data={data} t={t} />
        <CategoryFilter data={data} t={t} active={activeCategory} setActive={setActiveCategory} />
        {activeCategory === "all" && featuredPost && <FeaturedPost post={featuredPost} t={t} lang={lang} />}
        <PostsGrid posts={gridPosts} t={t} lang={lang} />
        <Newsletter data={data} t={t} />
      </div>
    </>
  );
}

function BlogHero({ data, t }) {
  return (
    <section className="relative min-h-[55vh] flex items-center overflow-hidden bg-[#f4f4f4]">
      <div className="absolute inset-0 z-0">
        <Image src={data.hero.backgroundImage} alt="blog hero" fill className="object-cover object-center" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-10 w-full px-5 pt-16 pb-12 sm:px-8 md:px-6 sm:pt-0 sm:pb-0 md:pt-0 md:pb-0">
        <div className="max-w-7xl mx-auto">

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight max-w-2xl mb-4 sm:mb-5 animate-fadein-up leading-[1.05]">
            {(() => {
              const words = t.hero.headline.split(" ");
              const black = words.slice(0, 2).join(" ");
              const blue  = words.slice(2).join(" ");
              return (<><span className="text-[#0a0a0a]">{black}</span><br /><span className="text-[#1D6FD8]">{blue}</span></>);
            })()}
          </h1>
          <p className="text-gray-500 text-sm sm:text-lg max-w-xl leading-relaxed animate-fadein-up2">{t.hero.subheadline}</p>
        </div>
      </div>
    </section>
  );
}

function CategoryFilter({ data, t, active, setActive }) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-3 sm:py-4">
          {data.categories.map((cat) => (
            <button key={cat.id} onClick={() => setActive(cat.id)}
              className={`shrink-0 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                active === cat.id ? "bg-[#1D6FD8] text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {t.categories[cat.id]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedPost({ post, t, lang }) {
  const [ref, visible] = useReveal();
  const postT = t.posts[post.id];
  return (
    <section ref={ref} className="py-10 sm:py-14 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
        <Link href={`/blog/${post.slug}`}
          className={`group grid lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-gray-100 hover:border-[#1D6FD8]/30 hover:shadow-2xl transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="relative h-56 sm:h-72 lg:h-auto overflow-hidden bg-gray-100">
            <Image src={post.image} alt={postT.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized />
            <div className="absolute top-0 inset-x-0 h-[4px]" style={{ background: post.color }} />
            <div className="absolute top-4 sm:top-5 start-4 sm:start-5">
              <span className="px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider" style={{ background: post.color }}>
                {t.categories[post.category]}
              </span>
            </div>
          </div>
          <div className="p-6 sm:p-8 md:p-10 lg:p-14 flex flex-col justify-center bg-white">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="text-xs text-gray-400 font-semibold">{formatDate(post.date, lang)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-400 font-semibold">{post.readTime} {t.readTime}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-4 sm:mb-5 group-hover:text-[#1D6FD8] transition-colors duration-200">
              {postT.title}
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">{postT.excerpt}</p>
            <div className="flex items-center gap-2 text-sm font-bold text-[#1D6FD8]">
              {t.readMore} <ArrowRight size={14} />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

function PostsGrid({ posts, t, lang }) {
  const [ref, visible] = useReveal();
  if (!posts.length) return null;
  return (
    <section ref={ref} className="py-10 sm:py-14 md:py-16 bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} t={t} lang={lang} visible={visible} delay={i * 70} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PostCard({ post, t, lang, visible, delay }) {
  const postT = t.posts[post.id];
  return (
    <Link href={`/blog/${post.slug}`}
      className={`group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-[#1D6FD8]/30 hover:shadow-xl transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className="relative h-44 sm:h-52 overflow-hidden bg-gray-100">
        <Image src={post.image} alt={postT.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
        <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: post.color }} />
        <div className="absolute top-3 sm:top-4 start-3 sm:start-4">
          <span className="px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider" style={{ background: post.color }}>
            {t.categories[post.category]}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-2.5 sm:gap-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-semibold">{formatDate(post.date, lang)}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
          <span className="text-[11px] text-gray-400 font-semibold">{post.readTime} {t.readTime}</span>
        </div>
        <h3 className="font-semibold text-[#0a0a0a] text-sm sm:text-base leading-snug group-hover:text-[#1D6FD8] transition-colors duration-150">{postT.title}</h3>
        <p className="text-gray-500 text-xs sm:text-sm leading-relaxed flex-1 line-clamp-3">{postT.excerpt}</p>
        <div className="flex items-center gap-1 text-xs font-bold text-[#1D6FD8] mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200">
          {t.readMore} <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  );
}

function Newsletter({ data, t }) {
  const [ref, visible] = useReveal();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function handleSubmit(e) { e.preventDefault(); if (email.trim()) setSubmitted(true); }
  return (
    <section ref={ref} className="relative py-16 sm:py-20 md:py-28 px-5 sm:px-8 md:px-6 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 z-0 opacity-10">
        <Image src={data.newsletter.backgroundImage} alt="" fill className="object-cover" unoptimized />
      </div>
      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#1D6FD8] z-10" />
      <div className={`relative z-10 max-w-2xl mx-auto text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight mb-3 sm:mb-4">{t.newsletter.title}</h2>
        <p className="text-gray-400 text-sm sm:text-base mb-8 sm:mb-10">{t.newsletter.subtitle}</p>
        {submitted ? (
          <div className="flex items-center justify-center gap-3 text-[#1D6FD8] font-bold text-lg">
            <Check size={20} color="#1D6FD8" /><span>Thank you!</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}


function ArrowRight({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function Check({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=Tajawal:wght@300;400;700;800&display=swap');
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadein-up { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadein      { animation: fadein    0.6s ease both; }
  .animate-fadein-up   { animation: fadein-up 0.7s ease 0.1s both; }
  .animate-fadein-up2  { animation: fadein-up 0.7s ease 0.25s both; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .start-4 { inset-inline-start: 1rem; }
  .start-5 { inset-inline-start: 1.25rem; }
`;