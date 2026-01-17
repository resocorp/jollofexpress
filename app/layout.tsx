import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/env-validator"; // Validate environment on startup
import { GoogleAnalytics } from "@/components/analytics";
import { RestaurantJsonLd, WebsiteJsonLd } from "@/components/analytics";

export const metadata: Metadata = {
  title: {
    default: "Ur' Shawarma Express - Shawarma Delivery in Awka",
    template: "%s | Ur' Shawarma Express"
  },
  description: "Order the best tasting Nigerian-style shawarma delivered fresh to your doorstep in Awka. Fast delivery in 30 minutes!",
  keywords: [
    "food delivery", 
    "shawarma", 
    "Awka", 
    "restaurant", 
    "online food ordering",
    "Nigerian shawarma",
    "food delivery Awka",
    "shawarma delivery",
    "African food"
  ],
  authors: [{ name: "Ur' Shawarma Express" }],
  creator: "Ur' Shawarma Express",
  publisher: "Ur' Shawarma Express",
  applicationName: "Ur' Shawarma Express",
  category: "Food & Dining",
  
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "Ur' Shawarma Express",
    title: "Ur' Shawarma Express - Best Shawarma Delivery",
    description: "Order the best Nigerian-style shawarma delivered fresh to your doorstep in Awka. Fast delivery, authentic flavors!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ur' Shawarma Express - Shawarma Delivery"
      }
    ]
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Ur' Shawarma Express - Shawarma Delivery",
    description: "Order the best Nigerian-style shawarma delivered fresh to your doorstep in Awka",
    images: ["/og-image.png"],
    creator: "@urshawarma"
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
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
  
  alternates: {
    canonical: '/'
  },
  
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': "Ur' Shawarma Express",
    'application-name': "Ur' Shawarma Express",
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
      <head>
        {/* Preconnect to external origins for faster resource loading */}
        <link rel="preconnect" href="https://pijgeuspfgcccoxtjnby.supabase.co" />
        <link rel="dns-prefetch" href="https://pijgeuspfgcccoxtjnby.supabase.co" />
        <RestaurantJsonLd />
        <WebsiteJsonLd />
      </head>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <QueryProvider>
          {children}
          <Toaster />
          <GoogleAnalytics />
        </QueryProvider>
      </body>
    </html>
  );
}
