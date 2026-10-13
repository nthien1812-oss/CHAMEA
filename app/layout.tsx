import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHAMÉA — Chạm đúng người · Trao đúng quà",
  description: "Khám phá túi xách CHAMÉA và tìm món quà vừa vặn với người bạn trân trọng.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <meta name="theme-color" content="#3c2535" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/assets/fonts.css" />
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        {children}
        <Script src="/data.js" strategy="beforeInteractive" />
        <Script src="/editor-defaults.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
