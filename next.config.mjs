/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🆕 PERFORMANCE + SECURITY (احترافية أساسية للمواقع العالمية):
  // - poweredByHeader: false → يشيل هيدر "X-Powered-By: Next.js" اللي
  //   بيسرّب معلومة تقنية مجانية لأي مهاجم (إيه الـ framework المستخدم).
  // - compress: true → ضغط gzip/brotli للردود من Next نفسه (مفعّل افتراضيًا
  //   بس بنأكّده صراحة هنا، ومهم أوي لو الاستضافة مش Vercel اللي بتعمله
  //   تلقائيًا على مستوى الـ edge).
  // - reactStrictMode: true → بيكشف side-effects غير آمنة (زي باج الـ Hooks
  //   اللي اتصلح قبل كده) بدري في التطوير عن طريق تشغيل بعض الكود مرتين
  //   قصدًا، بدل ما تكتشفها في production.
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  // ⚡ PERFORMANCE — إعدادات سرعة التنقل والـ bundle:
  // - experimental.staleTimes: كاش الـ Router على الكلاينت. من غيره Next 15+
  //   بيعتبر الصفحات الديناميكية stale فورًا (0 ثانية) فكل تنقل/رجوع بيعمل
  //   طلب سيرفر جديد. دلوقتي الرجوع/إعادة زيارة صفحة خلال المدة = فوري.
  // - optimizePackageImports: tree-shaking أدق للمكتبات الكبيرة (lucide).
  // - compiler.removeConsole: يشيل console.log من الـ production (error/warn
  //   فاضلين).
  // - serverExternalPackages: مكتبات PDF/Excel التقيلة تفضل خارج bundle السيرفر
  //   (cold start أسرع وبناء أخف).
  experimental: {
    staleTimes: { dynamic: 180, static: 600 },
    optimizePackageImports: ["lucide-react"],
    // انتقال سلس بين الصفحات باستخدام View Transitions API (المتصفحات اللي
    // مش بتدعمها بتتجاهلها تلقائيًا).
    viewTransition: true,
  },
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },
  serverExternalPackages: ["pdf-parse", "exceljs", "pdf-lib", "@pdf-lib/fontkit", "xlsx", "qrcode"],
  productionBrowserSourceMaps: false,

  async headers() {
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      // ملفات public الثابتة (صور/أيقونات/خطوط) — كاش سنة (الاسم لازم يتغير لو الملف اتغير)
      { source: "/:all*(svg|png|jpg|jpeg|webp|avif|ico|woff2)", headers: immutable },
    ];
  },
  // 🆕 محلي/تجربة بس: Next.js dev server بيرفض افتراضيًا أي طلب جاي من
  // دومين غير localhost (حماية ضد DNS rebinding). لما بنعدّي عن طريق
  // tunnel (cloudflared/ngrok) عشان نختبر GetPayIn (اللي بيتطلب HTTPS
  // فعلي في redirection_url)، الطلبات بتوصل من دومين الـ tunnel مش
  // localhost، فلازم نضيفه هنا وإلا Next هيرفضها بـ "Unauthorized" —
  // خصوصًا على اتصال الـ HMR (websocket) اللي بيتحدث تلقائيًا.
  // ⚠️ ده تأثيره في وضع dev بس (next dev) — production (next start /
  // next build) مش بيستخدم الإعداد ده خالص، فمفيش أي أثر أمني على
  // الاستضافة الحقيقية. حدّث القيمة دي كل مرة رابط tunnel جديد يتعمل
  // (روابط trycloudflare.com/ngrok-free.app بتتغيّر كل تشغيلة جديدة).
  allowedDevOrigins: [
    'references-two-tobacco-stevens.trycloudflare.com',
    '*.trycloudflare.com', // بديل: يغطي أي رابط جديد يتعمل من غير ما تعدّل الملف تاني
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        // ✅ Day 9 (محدّث): صور الكورسات (Bunny Storage) وصور غلاف الفيديوهات
        // (Bunny Stream thumbnails) بتتخزن على دومينز b-cdn.net.
        // ** بتغطي أي subdomain، لأن كل storage zone / stream library
        // بياخد hostname مختلف تلقائيًا من Bunny.
        protocol: 'https',
        hostname: '**.b-cdn.net',
      },
    ],
    // 🆕 PERFORMANCE: صيغ حديثة (AVIF/WebP) بيختارها Next تلقائيًا حسب دعم
    // متصفح الزائر — بيقلل حجم الصور بشكل كبير (أحيانًا 30-50% أصغر من
    // نفس الصورة JPEG/PNG) من غير أي تغيير في الكود أو الجودة المرئية.
    formats: ['image/avif', 'image/webp'],
    // ⚡ الصور المحسّنة بتتخزن 30 يوم بدل 60 ثانية (الافتراضي) → أقل
    // تحويلات على السيرفر وصور فورية في الزيارات المتكررة.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;