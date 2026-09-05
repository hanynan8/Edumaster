"use client";

/* ════════════════════════════════════════════════════════════════════
   components/SuccessStoriesSection.jsx
   ------------------------------------------------------------------
   Shared "Success Stories" section — used on BOTH the guest home page
   and the logged-in home page, right under the Courses section.

   FULLY STATIC — no API call, no admin panel collection, no i18n
   fetch. All text lives right here in the STATIC_TEXT object below,
   per language. To add a real video, just fill in its
   "bunnyLibraryId" and "bunnyVideoId" (and optionally a "thumbnail"
   URL) in the VIDEOS array further down.

   Empty slots (bunnyVideoId: null) render a "Coming soon" placeholder
   card instead of crashing or hiding the whole section — so you can
   drop this in now and fill videos in one by one later.
════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

/* ─────────────────────────────────────────
   1) STATIC TEXT — edit directly here, no CMS/API involved
───────────────────────────────────────── */
const STATIC_TEXT = {
  en: {
    title: "Success Stories",
    subtitle: "Real students, real journeys, real results.",
    cta: "View More",
    comingSoon: "Coming Soon",
  },
  ar: {
    title: "قصص نجاحنا",
    subtitle: "طلاب حقيقيين، رحلات حقيقية، نتائج حقيقية.",
    cta: "شوف المزيد",
    comingSoon: "قريبًا",
  },
  es: {
    title: "Historias de Éxito",
    subtitle: "Estudiantes reales, viajes reales, resultados reales.",
    cta: "Ver Más",
    comingSoon: "Próximamente",
  },
};

/* ─────────────────────────────────────────
   2) VIDEOS — exactly 4 slots, fill in as you add them via Bunny.
   Leave bunnyLibraryId/bunnyVideoId as null for an empty placeholder.
───────────────────────────────────────── */
const VIDEOS = [
  {
    id: "story-1",
    title: "", // optional caption shown on the card
    bunnyLibraryId: null, // e.g. "123456"
    bunnyVideoId: null, // e.g. "abcd-1234-efgh-5678"
    thumbnail: null, // optional custom thumbnail URL
  },
  {
    id: "story-2",
    title: "",
    bunnyLibraryId: null,
    bunnyVideoId: null,
    thumbnail: null,
  },
  {
    id: "story-3",
    title: "",
    bunnyLibraryId: null,
    bunnyVideoId: null,
    thumbnail: null,
  },
  {
    id: "story-4",
    title: "",
    bunnyLibraryId: null,
    bunnyVideoId: null,
    thumbnail: null,
  },
];

/* ─────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────── */
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

function bunnyEmbedUrl(video) {
  if (!video?.bunnyLibraryId || !video?.bunnyVideoId) return null;
  return `https://iframe.mediadelivery.net/embed/${video.bunnyLibraryId}/${video.bunnyVideoId}?autoplay=true`;
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function SuccessStoriesSection({
  lang = "en",
  bgClassName = "bg-[#f7f7f7]",
  paddingClassName = "py-8 sm:py-14 md:py-20",
}) {
  const [ref, visible] = useReveal();
  const [playingId, setPlayingId] = useState(null);

  const t = STATIC_TEXT[lang] ?? STATIC_TEXT.en;

  return (
    <section ref={ref} className={`${paddingClassName} ${bgClassName}`}>
      <div className="px-5 sm:px-10 md:px-16">
        <div
          className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-7 sm:mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
              {t.title}
            </h2>
            {t.subtitle && (
              <p className="text-gray-500 text-sm sm:text-base mt-2">{t.subtitle}</p>
            )}
          </div>
          <Link
            href="/success-stories"
            className="inline-flex items-center gap-2 border-2 border-[#1E8A5F] text-[#1E8A5F] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm hover:bg-[#1E8A5F] hover:text-white transition-all shrink-0 self-start sm:self-auto w-fit"
          >
            {t.cta}
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {VIDEOS.map((v, i) => {
            const embedUrl = bunnyEmbedUrl(v);
            const isPlaying = playingId === v.id && embedUrl;
            const isEmpty = !embedUrl;

            return (
              <div
                key={v.id}
                className={`group relative bg-[#1B5A44] rounded-2xl overflow-hidden aspect-9/16 sm:aspect-3/4 transition-all duration-500 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {isEmpty ? (
                  /* ── EMPTY SLOT PLACEHOLDER ── */
                  <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 bg-linear-to-br from-[#1E8A5F] to-[#12523A] border border-dashed border-white/15">
                    <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 flex items-center justify-center">
                      <PlayIcon size={18} color="rgba(255,255,255,0.4)" />
                    </span>
                    <span className="text-white/40 text-xs sm:text-sm font-semibold">
                      {t.comingSoon}
                    </span>
                  </div>
                ) : isPlaying ? (
                  /* ── PLAYING (BUNNY IFRAME) ── */
                  <iframe
                    src={embedUrl}
                    loading="lazy"
                    className="w-full h-full"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={v.title || v.id}
                  />
                ) : (
                  /* ── THUMBNAIL / PLAY BUTTON ── */
                  <button
                    type="button"
                    onClick={() => setPlayingId(v.id)}
                    className="absolute inset-0 w-full h-full"
                    aria-label={v.title || "play video"}
                  >
                    {v.thumbnail ? (
                      <Image
                        src={v.thumbnail}
                        alt={v.title || ""}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-linear-to-br from-[#1E8A5F] to-[#12523A]" />
                    )}
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <PlayIcon size={18} color="#1E8A5F" />
                      </span>
                    </span>
                    {v.title && (
                      <span className="absolute bottom-0 inset-x-0 p-3 text-white text-xs sm:text-sm font-semibold leading-snug text-left bg-linear-to-t from-black/70 to-transparent">
                        {v.title}
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   INLINE SVG ICONS
───────────────────────────────────────── */
function ArrowRight({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function PlayIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}