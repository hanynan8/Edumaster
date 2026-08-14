"use client";

// app/components/LessonVideoPlayer.jsx
//
// تحسين أداء: بدل ما نحط <iframe> بتاع Bunny Stream في الصفحة على طول
// (اللي بيبدأ يحمّل player.js + assets بتاعته أول ما الصفحة تفتح، حتى لو
// الطالب لسه مضغطش "شغّل")، بنعرض صورة غلاف (thumbnail) خفيفة بس، وميتولدش
// الـ iframe في الـ DOM إلا لما المستخدم يضغط زرار التشغيل. النتيجة:
// صفحة الدرس بتفتح سريعة جدًا حتى لو فيها فيديوهات تقيلة، والحمل الفعلي
// (تحميل الـ player + الفيديو) بيحصل بس وقت الحاجة الفعلية ليه.
//
// الاستخدام:
//   <LessonVideoPlayer playbackUrl={lesson.videoUrl} title={lesson.title} />
//
// playbackUrl هو نفس القيمة المخزّنة في lesson.videoUrl (رابط
// iframe.mediadelivery.net/embed/... اللي بيرجعه /api/upload/signature
// وقت الرفع — شوف app/lib/bunny.js).

import { useState } from "react";
import { Play } from "lucide-react";
import { buildStreamThumbnailUrl } from "@/app/lib/bunnyClient";

export default function LessonVideoPlayer({ playbackUrl, title = "فيديو الدرس" }) {
  const [started, setStarted] = useState(false);
  const thumbnailUrl = buildStreamThumbnailUrl(playbackUrl);

  if (!playbackUrl) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: "56.25%" }}>
      {started ? (
        // الـ iframe مش بيتولّد جوه الـ DOM غير هنا، بعد ضغطة المستخدم فعليًا.
        <iframe
          src={`${playbackUrl}?autoplay=true`}
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={title}
        />
      ) : (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="absolute inset-0 flex h-full w-full items-center justify-center group"
          aria-label={`تشغيل ${title}`}
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
            <Play size={28} className="text-blue-600 ml-1" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}