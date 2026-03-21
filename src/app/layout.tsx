import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "ProfitSight — Know Your Real Shopify Profit",
  description: "ProfitSight connects to your Shopify store and answers your profit questions in plain English. See real profit after COGS, fees, ads, and refunds. $19/mo.",
  openGraph: {
    title: "ProfitSight — Know Your Real Shopify Profit",
    description: "Stop guessing. Ask ProfitSight what your real profit is, which products make money, and where your ad spend goes. Connects to Shopify in 60 seconds.",
    type: "website",
    url: "https://data-concierge.vercel.app",
    siteName: "ProfitSight",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProfitSight — Know Your Real Shopify Profit",
    description: "Your Shopify profit, answered in plain English. Not revenue. Profit.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts: Instrument Serif, Plus Jakarta Sans, Fraunces, Source Sans 3, JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Fontshare: General Sans, Cabinet Grotesk, Satoshi */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        {/* Geist fonts — preconnect + preload for faster loading */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/style.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/style.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
