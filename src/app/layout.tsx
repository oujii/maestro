import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#14102c'
};

export const metadata: Metadata = {
  title: "Maestro Quiz - Testa dina musikkunskaper",
  description: "Gissa vilket år låtarna släpptes och testa dina musikkunskaper i Maestro Quiz. Utmana dig själv och dina vänner!",
  keywords: "musik quiz, musikkunskap, gissa år, låtar, musikhistoria",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Maestro Quiz"
  },
  openGraph: {
    title: "Maestro Quiz - Testa dina musikkunskaper",
    description: "Gissa vilket år låtarna släpptes och testa dina musikkunskaper i Maestro Quiz. Utmana dig själv och dina vänner!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${inter.variable} ${montserrat.variable} antialiased`}
      >
        {children}
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
