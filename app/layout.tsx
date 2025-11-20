import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/env-validator"; // Validate environment on startup

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JollofExpress - Nigerian Food Delivery in Awka",
    template: "%s | JollofExpress"
  },
  description: "Order authentic Nigerian cuisine delivered fresh to your doorstep in Awka. Enjoy delicious Jollof rice, Egusi soup, Suya, and more. Fast delivery in 30 minutes!",
  keywords: [
    "food delivery", 
    "Nigerian food", 
    "Jollof rice", 
    "Awka", 
    "restaurant", 
    "online food ordering",
    "Nigerian cuisine",
    "Egusi soup",
    "Suya",
    "Asun",
    "food delivery Awka",
    "Nigerian restaurant",
    "African food"
  ],
  authors: [{ name: "JollofExpress" }],
  creator: "JollofExpress",
  publisher: "JollofExpress",
  applicationName: "JollofExpress",
  category: "Food & Dining",
  
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "JollofExpress",
    title: "JollofExpress - Authentic Nigerian Food Delivery",
    description: "Order delicious Nigerian cuisine delivered fresh to your doorstep in Awka. Fast delivery, authentic flavors!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JollofExpress - Nigerian Food Delivery"
      }
    ]
  },
  
  twitter: {
    card: "summary_large_image",
    title: "JollofExpress - Nigerian Food Delivery",
    description: "Order authentic Nigerian cuisine delivered fresh to your doorstep in Awka",
    images: ["/og-image.png"],
    creator: "@jollofexpress"
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '16x16' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/favicon.ico'
  },
  
  manifest: '/manifest.json',
  
  verification: {
    // google: 'your-google-site-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  
  alternates: {
    canonical: '/'
  },
  
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'JollofExpress',
    'application-name': 'JollofExpress',
    'msapplication-TileColor': '#FF4433',
    'theme-color': '#FF4433'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
