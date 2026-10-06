// PATH: app/api/success-video/route.js
//
// بيرجّع فيديوهات قصص النجاح (اللي الأدمن بيتحكم فيها من تاب "Success Videos")
// برابط embed موقّع لكل فيديو. نفس القايمة بتتعرض في:
//   - الصفحة المخصصة /success-stories (كل الفيديوهات)
//   - الهوم (أول 4 فيديوهات)
//
// 🔒 ليه راوت: مكتبة الفيديو شغّالة بـ Token Authentication
// (BUNNY_STREAM_TOKEN_AUTH_KEY)، والتوقيع محتاج المفتاح السري ده، ومينفعش
// يتحط في client component. فالتوقيع بيحصل هنا بس.
//
// الفيديوهات متخزّنة في حقل storyVideos جوه document الـ successStories:
//   [{ id, videoId, title, thumbnail }]  (الترتيب = ترتيب العرض)
// لو الحقل ده عمره ما اتضبط (أو الداتابيز فشلت)، بنرجع للفيديو القديم الثابت
// عشان الصفحة متتكسرش. لو الأدمن مسح كل الفيديوهات (array فاضية)، بنرجّع
// قايمة فاضية.
//
// الفيديو ده تسويقي عام (مش محتوى درس محمي) فمفيش auth هنا.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { buildSecureStreamPlaybackUrl } from "@/app/lib/bunny";

// الفيديو القديم الثابت — fallback بس لو الأدمن لسه ماضافش فيديوهات.
const LEGACY_VIDEO_ID = "f2743013-e4ea-4a68-951a-e89337e46d53";
const VIDEO_ID_RE = /^[0-9a-fA-F-]{8,64}$/;

function json(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // كاش قصير: الفيديو الجديد يظهر خلال نص دقيقة، ورابط التوقيع بينتهي
      // بعد ساعات فمينفعش نكاشيه كتير.
      "Cache-Control": "private, max-age=30",
    },
  });
}

async function readStoryVideos() {
  try {
    await connectToMongo();
    const doc = await mongoose.connection.db.collection("successStories").findOne({});
    if (!doc || !Array.isArray(doc.storyVideos)) return null; // عمره ما اتضبط → legacy
    return doc.storyVideos;
  } catch (err) {
    console.error("[/api/success-video] GET error:", err);
    return null;
  }
}

export async function GET() {
  const stored = await readStoryVideos();
  const source = stored ?? [{ id: "legacy", videoId: LEGACY_VIDEO_ID, title: "", thumbnail: "" }];

  const videos = source
    .filter((v) => v && typeof v.videoId === "string" && VIDEO_ID_RE.test(v.videoId))
    .map((v, i) => ({
      id: String(v.id || `v${i + 1}`),
      title: typeof v.title === "string" ? v.title.slice(0, 200) : "",
      thumbnail: typeof v.thumbnail === "string" && /^https:\/\//i.test(v.thumbnail) ? v.thumbnail : "",
      url: buildSecureStreamPlaybackUrl(v.videoId),
    }));

  // url = أول فيديو (للتوافق مع أي كود قديم كان بيقرا { url })
  return json({ videos, url: videos[0]?.url ?? null });
}