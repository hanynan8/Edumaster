import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";
import Navbar from "./components/navbar";
import Footer from "./components/footer";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.className} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}