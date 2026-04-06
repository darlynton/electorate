import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header, Footer } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Electorate — Know Who Represents You",
    template: "%s | Electorate",
  },
  description:
    "Nigeria's definitive politician accountability and transparency platform. Track voting records, campaign promises, and corruption cases of Nigerian politicians.",
  keywords: [
    "Nigerian politicians",
    "politician accountability",
    "NASS",
    "Senate",
    "House of Representatives",
    "2027 elections",
    "Nigeria elections",
    "EFCC",
    "corruption",
    "voting records",
  ],
  authors: [{ name: "Electorate Team" }],
  creator: "Electorate",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.electorate.ng"),
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://www.electorate.ng",
    siteName: "Electorate",
    title: "Electorate — Know Who Represents You",
    description:
      "Nigeria's definitive politician accountability and transparency platform.",
    images: [
      {
        url: "https://iili.io/BRvekCJ.jpg",
        width: 1200,
        height: 630,
        alt: "Electorate - Know Who Represents You",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@electorating",
    title: "Electorate — Know Who Represents You",
    description:
      "Nigeria's definitive politician accountability and transparency platform.",
    images: ["https://iili.io/BRvekCJ.jpg"],
    creator: "@electorating",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png' },
    ],
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
