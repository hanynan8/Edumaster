"use client";

// app/components/FileViewer.jsx
//
// 🆕 عرض ملفات الواجب (مرفق المدرّس / ملف تسليم الطالب) جوه المنصة من غير تحميل:
//   - PDF            → صورة مصغّرة لأول صفحة ظاهرة على طول؛ بالضغط عليها بتتكبّر
//                      وتاخد الشاشة كلها (عارض المتصفح)
//   - صور            → مصغّرة بنفس الشكل، بالضغط بتتكبّر على الشاشة كلها
//   - Word/PPT/Excel → زرار "عرض داخل المنصة" بيفتح عارض Microsoft Office Online
//                      (بيحتاج رابط عام يوصله سيرفر مايكروسوفت) على الشاشة كلها
//   - غير كده (zip…) → تحميل بس
// التحميل لسه متاح دايمًا جنب العرض، فده خيار إضافي مش بديل.
//
// المصغّرة بتعتمد على عارض الـ PDF بتاع المتصفح (iframe) — من غير مكتبة ومن غير
// CORS على Bunny. على بعض موبايلات أندرويد المتصفح مبيعرضش PDF جوه iframe، وساعتها
// الطالب لسه يقدر يفتحه بالزرار/الضغط أو يحمّله.
//
// 🔒 CSP: لازم frame-src يسمح بـ https://*.b-cdn.net و https://view.officeapps.live.com
// (متضافين في middleware.js).

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Download, ExternalLink, Maximize2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { detectFileKind, officeViewerUrl } from "@/app/lib/fileKind";

const STRINGS = {
  ar: {
    view: "عرض داخل المنصة",
    download: "تحميل",
    openNewTab: "فتح في تبويب جديد",
    enlarge: "اضغط للتكبير",
    close: "إغلاق",
    notViewable: "هذا النوع من الملفات لا يمكن عرضه داخل المنصة — يمكنك تحميله فقط",
    officeNote: "لو الملف لم يظهر، حمّله أو افتحه في تبويب جديد.",
  },
  en: {
    view: "View in platform",
    download: "Download",
    openNewTab: "Open in new tab",
    enlarge: "Click to enlarge",
    close: "Close",
    notViewable: "This file type can't be previewed here — you can download it instead",
    officeNote: "If the file doesn't show, download it or open it in a new tab.",
  },
};

// بيخفي أدوات عارض الـ PDF ويثبّته على أول صفحة بعرض الإطار (للمصغّرة)
const PDF_THUMB_PARAMS = "#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH";

function FullscreenModal({ kind, url, title, t, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // يمنع سكرول الصفحة اللي ورا
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title || "file"} className="fixed inset-0 z-[100] flex flex-col bg-black/85">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-black/60 text-white">
        <span className="text-sm font-semibold truncate">{title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
          >
            <ExternalLink size={13} /> <span className="hidden sm:inline">{t.openNewTab}</span>
          </a>
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
          >
            <Download size={13} /> <span className="hidden sm:inline">{t.download}</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            title={t.close}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {kind === "image" ? (
          <button type="button" onClick={onClose} className="w-full h-full flex items-center justify-center p-4 cursor-zoom-out" aria-label={t.close}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={title || "file"} className="max-w-full max-h-full object-contain" />
          </button>
        ) : (
          <iframe
            src={kind === "pdf" ? url : officeViewerUrl(url)}
            title={title || "file"}
            className="w-full h-full border-0 bg-white"
          />
        )}
      </div>

      {kind === "office" && <p className="px-4 py-1.5 text-[11px] text-white/70 bg-black/60">{t.officeNote}</p>}
    </div>,
    document.body
  );
}

export default function FileViewer({ url, title = "", label = "", className = "" }) {
  const { language } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const [open, setOpen] = useState(false);
  if (!url) return null;

  const kind = detectFileKind(url);
  const viewable = kind !== "other";
  const hasThumb = kind === "pdf" || kind === "image";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {label && <span className="text-sm font-semibold text-gray-700 me-1">{label}</span>}
        {kind === "office" && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#003A91] text-white px-3.5 py-2 rounded-xl hover:bg-[#002E74]"
          >
            <Eye size={15} /> {t.view}
          </button>
        )}
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003A91] border border-[#003A91]/30 px-3.5 py-2 rounded-xl hover:bg-[#EBEFF6]"
        >
          <Download size={15} /> {t.download}
        </a>
      </div>

      {!viewable && <p className="text-xs text-gray-400 mt-2">{t.notViewable}</p>}

      {/* 🖼️ مصغّرة ظاهرة على طول (PDF: أول صفحة — صورة: الصورة نفسها) */}
      {hasThumb && (
        <div className="relative mt-3 w-full max-w-[260px] aspect-[3/4] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm group">
          {kind === "pdf" ? (
            <iframe
              src={`${url}${PDF_THUMB_PARAMS}`}
              title={title || "file"}
              loading="lazy"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full border-0 bg-white pointer-events-none"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={title || "file"} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {/* طبقة الضغط فوق المصغّرة */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`${t.enlarge}: ${title || label || "file"}`}
            className="absolute inset-0 w-full h-full cursor-zoom-in bg-transparent group-hover:bg-black/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003A91]"
          >
            <span className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-lg bg-black/65 text-white text-[11px] font-semibold px-2 py-1">
              <Maximize2 size={12} /> {t.enlarge}
            </span>
          </button>
        </div>
      )}

      {viewable && open && <FullscreenModal kind={kind} url={url} title={title || label} t={t} onClose={() => setOpen(false)} />}
    </div>
  );
}
