import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";
import { Analytics } from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Recharge Guard — never let a family phone go dark",
    template: "%s · Recharge Guard",
  },
  description:
    "Track every family mobile and broadband recharge in one place and get reminded on Telegram or your browser before the due date.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Recharge Guard",
    title: "Recharge Guard — never let a family phone go dark",
    description:
      "One dashboard for every family recharge, with reminders on Telegram or browser push before the due date.",
  },
  twitter: { card: "summary" },
};

export const viewport = {
  themeColor: "#F97316",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <Analytics />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}