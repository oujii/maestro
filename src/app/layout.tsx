import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Maestro Quiz - Testa dina musikkunskaper",
  description: "Gissa vilket år låtarna släpptes och testa dina musikkunskaper i Maestro Quiz. Utmana dig själv och dina vänner!",
  keywords: "musik quiz, musikkunskap, gissa år, låtar, musikhistoria",
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#14102c" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body
        className={`${inter.variable} ${montserrat.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
