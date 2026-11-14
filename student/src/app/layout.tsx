import ContextMenuGuard from "@/components/security/ContextMenuGuard";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Inter, self-hosted (SIL Open Font License) so pages do not depend on Google Fonts.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Mentora — Learn • Grow • Go Further", template: "%s | Mentora" },
  description: "Better Learning. Bigger Horizons. Exam-focused learning for Cambridge and Edexcel students.",
  icons: {
    icon: [
      { url: "/favicons/favicon.svg", type: "image/svg+xml" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicons/favicon.ico",
    apple: [
      { url: "/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicons/site.webmanifest",
  openGraph: {
    type: "website",
    title: "Mentora™ — Learn • Grow • Go Further",
    description: "Better Learning. Bigger Horizons. Exam-focused learning for Cambridge and Edexcel students.",
    images: [
      {
        url: "/social-og/og-image-1200x630.png",
        width: 1200,
        height: 630,
        alt: "Mentora — Learn • Grow • Go Further",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentora™ — Learn • Grow • Go Further",
    description: "Better Learning. Bigger Horizons.",
    images: ["/social-og/og-image-1200x630.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#062A35",
};

// Runs before the page paints, so a saved light or dark choice does not flash the other theme.
const themeScript = `try{var t=localStorage.getItem('mentora-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full"><ContextMenuGuard />{children}</body>
    </html>
  );
}
