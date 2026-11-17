"use client";

// app/components/FileViewer.jsx
//
// 🆕 عرض ملفات الواجب (مرفق المدرّس / ملف تسليم الطالب) جوه المنصة من غير تحميل:
//   - PDF            → iframe (عارض المتصفح)
//   - صور            → <img>
//   - Word/PPT/Excel → عارض Microsoft Office Online المجاني (iframe) — بيحتاج رابط
//                      عام يوصله سيرفر مايكروسوفت (روابط Bunny العامة/الموقّعة شغالة)
//   - غير كده (zip…) → تحميل بس
// التحميل لسه متاح دايمًا جنب العرض، فده خيار إضافي مش بديل.
//
// 🔒 CSP: لازم frame-src يسمح بـ https://*.b-cdn.net و https://view.officeapps.live.com
// (متضافين في middleware.js).

import { useState } from "react";
import { Eye, EyeOff, Download, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { detectFileKind, officeViewerUrl } from "@/app/lib/fileKind";

const STRINGS = {
  ar: {
    view: "عرض داخل المنصة",
    hide: "إخفاء العرض",
    download: "تحميل",
    openNewTab: "فتح في تبويب جديد",
    notViewable: "هذا النوع من الملفات لا يمكن عرضه داخل المنصة — يمكنك تحميله فقط",
    officeNote: "لو الملف لم يظهر، حمّله أو افتحه في تبويب جديد.",
  },
  en: {
    view: "View in platform",
    hide: "Hide preview",
    download: "Download",
    openNewTab: "Open in new tab",
    notViewable: "This file type can't be previewed here — you can download it instead",
    officeNote: "If the file doesn't show, download it or open it in a new tab.",
  },
};

export default function FileViewer({ url, title = "", label = "", className = "" }) {
  const { language } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const [open, setOpen] = useState(false);
  if (!url) return null;

  const kind = detectFileKind(url);
  const viewable = kind !== "other";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {label && <span className="text-sm font-semibold text-gray-700 me-1">{label}</span>}
        {viewable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#003A91] text-white px-3.5 py-2 rounded-xl hover:bg-[#002E74]"
          >
            {open ? <EyeOff size={15} /> : <Eye size={15} />} {open ? t.hide : t.view}
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

      {viewable && open && (
        <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={title || "file"} className="max-w-full max-h-[75vh] mx-auto object-contain" />
          ) : (
            <iframe
              src={kind === "pdf" ? url : officeViewerUrl(url)}
              title={title || "file"}
              loading="lazy"
              className="w-full h-[70vh] border-0 bg-white"
            />
          )}
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white border-t border-gray-100 text-xs text-gray-400">
            <span>{kind === "office" ? t.officeNote : ""}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#003A91] hover:underline shrink-0"
            >
              <ExternalLink size={12} /> {t.openNewTab}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
