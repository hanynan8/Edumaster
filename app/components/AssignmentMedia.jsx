"use client";

// app/components/AssignmentMedia.jsx
//
// 🆕 عرض فيديو أو أوديو واجب/تسليم (متخزّن على Bunny):
//   - video → iframe الـ embed بتاع Bunny Stream
//   - audio → <audio controls> بملف من Bunny Storage
// الرابط بييجي من الـ API جاهز للعرض (موقّع لو Token Auth مفعّل).

export default function AssignmentMedia({ url, type, title = "" }) {
  if (!url || !type) return null;

  if (type === "video") {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={url}
          title={title || "video"}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <audio controls preload="metadata" src={url} className="w-full" aria-label={title || "audio"}>
      {/* المتصفح ما بيدعمش الأوديو */}
    </audio>
  );
}
