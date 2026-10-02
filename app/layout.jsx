import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import "./globals.css";
import { authOptions } from "./lib/authOptions";
import { getSeedData } from "./lib/publicData";
import Providers from "./components/Providers";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import CookieConsent from "./components/CookieConsent";

// ⚡ PERFORMANCE: Cairo متاح كـ variable font — من غير تحديد weight بيتحمّل
// ملف واحد لكل subset بدل 7 ملفات منفصلة. وشلنا Geist_Mono (مكنش مستخدم
// في أي مكان) = طلب خطوط أقل وCSS أخف.
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

/* ─────────────────────────────────────────
   SEO METADATA
───────────────────────────────────────── */
export const metadata = {
  /* ── Core ── */
  title: {
    default: "Edumaster | Premium Education Platform",
    template: "%s | Edumaster",
  },
  description:
    "Edumaster — منصة تعليمية متكاملة تقدم برامج أكاديمية وتدريبية متميزة لبناء مستقبل أفضل. اكتشف خدماتنا التعليمية المتنوعة.",

  /* ── Keywords ── */
  keywords: [
    "Edumaster",
    "منصة تعليمية",
    "تعليم أونلاين",
    "برامج تدريبية",
    "تعليم متميز",
    "online education",
    "e-learning",
    "academic programs",
  ],

  /* ── Authors / Creator ── */
  authors: [{ name: "Edumaster Team" }],
  creator: "Edumaster",
  publisher: "Edumaster",

  /* ── Canonical URL ── */
  metadataBase: new URL("https://www.edumaster365.com"),
  alternates: {
    canonical: "/",
    languages: {
      "ar-EG": "/ar",
      "en-US": "/en",
    },
  },

  /* ── Open Graph ── */
  openGraph: {
    type: "website",
    locale: "ar_EG",
    alternateLocale: "en_US",
    url: "https://www.edumaster365.com",
    siteName: "Edumaster",
    title: "Edumaster | Premium Education Platform",
    description:
      "منصة تعليمية متكاملة تقدم برامج أكاديمية وتدريبية متميزة لبناء مستقبل أفضل.",
    images: [
      {
        url: "https://raw.githubusercontent.com/hanynan8/e-commerce/refs/heads/main/WhatsApp%20Image%202026-04-04%20at%2012.54.46%20PM.jpeg",
        width: 1200,
        height: 630,
        alt: "Edumaster — Premium Education Platform",
      },
    ],
  },

  /* ── Twitter / X Card ── */
  twitter: {
    card: "summary_large_image",
    title: "Edumaster | Premium Education Platform",
    description:
      "منصة تعليمية متكاملة تقدم برامج أكاديمية وتدريبية متميزة لبناء مستقبل أفضل.",
    images: [
      "https://raw.githubusercontent.com/hanynan8/e-commerce/refs/heads/main/WhatsApp%20Image%202026-04-04%20at%2012.54.46%20PM.jpeg",
    ],
    creator: "@edumaster",
  },

  /* ── Favicon / Icons ── */
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },

  /* ── Robots ── */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // verification: {
  //   google: "YOUR_GOOGLE_VERIFICATION_CODE",
  // },
};

/* ─────────────────────────────────────────
   ROOT LAYOUT
───────────────────────────────────────── */
export default async function RootLayout({ children }) {
  // ⚡ PERFORMANCE: بنقرا اللغة (كوكي) + الـ session + بيانات النافبار/الفوتر
  // على السيرفر بالتوازي، فأول HTML يوصل جاهز (بدون flash لغة/اتجاه، وبدون
  // حالة "loading" في useSession، والنافبار مش بيستنى fetch).
  const cookieStore = await cookies();
  const savedLang = cookieStore.get("language")?.value;
  const language = ["en", "ar", "es"].includes(savedLang) ? savedLang : "en";

  const [session, seed] = await Promise.all([
    getServerSession(authOptions).catch(() => null),
    getSeedData().catch(() => ({})),
  ]);

  return (
    <html
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className={`${cairo.className} antialiased`} suppressHydrationWarning>
        <Providers session={session} initialLanguage={language} seed={seed}>
          <Navbar />
          <main id="main-content">{children}</main>
          <Footer />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
