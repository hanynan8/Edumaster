// app/api/success-video/route.js
//
// 🔒 السبب اللي خلّانا نحتاج الراوت ده: صفحة قصص النجاح
// (app/(pages)/success-stories/page.jsx) بتعرض فيديو Bunny Stream ثابت،
// لكنها client component — ومكتبة الفيديو عندنا شغّالة بـ Token
// Authentication مفعّل من لوحة Bunny (BUNNY_STREAM_TOKEN_AUTH_KEY موجود في
// .env)، يعني أي رابط embed مش موقّع بيترفض بـ 403 مباشرة من Bunny نفسها.
//
// التوقيع (buildSecureStreamPlaybackUrl) بيحتاج المفتاح السري ده، ومينفعش
// يتحط في client component (هيبان في المتصفح). فالحل: راوت GET بسيط هنا
// بيولّد رابط موقّع صالح لمدة قصيرة (نفس مدة SIGNED_URL_EXPIRE_SECONDS في
// app/lib/bunny.js) ويرجّعه للـ client، اللي بيحطه في src بتاع الـ iframe.
//
// الفيديو ده تسويقي عام (مش محتوى درس محمي) فمفيش داعي لأي auth/session
// check هنا — أي زائر للصفحة العامة المفروض يقدر يتفرج عليه.

import { buildSecureStreamPlaybackUrl } from "@/app/lib/bunny";

// videoId ثابت لفيديو صفحة "قصص النجاح" — لو حبيت تغيّره لاحقًا، غيّره هنا بس.
const SUCCESS_STORIES_VIDEO_ID = "f2743013-e4ea-4a68-951a-e89337e46d53";

export async function GET() {
  const url = buildSecureStreamPlaybackUrl(SUCCESS_STORIES_VIDEO_ID);
  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // كاش قصير جدًا بس (الرابط نفسه بينتهي بعد ساعات، والـ CDN/المتصفح
      // ميستحقش يفضل شايل رابط ممكن يبقى منتهي قريب).
      "Cache-Control": "private, max-age=60",
    },
  });
}