/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
};

export default nextConfig;