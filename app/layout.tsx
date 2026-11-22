import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://astrxytempmail.beezelbub.com/"),
  title: "ASTRXY Temp Mail - Instant Disposable Temporary Email & VIP Outbound Dispatch",
  description: "Fast, secure, and private temporary email service. Generate instant disposable inboxes, receive OTP verification codes, and send outbound emails anonymously.",
  keywords: ["temp mail", "disposable email", "anonymous email", "temporary inbox", "receive otp", "fake email generator", "outbound temp mail", "astrxy temp mail"],
  alternates: { canonical: "https://astrxytempmail.beezelbub.com/" },
  robots: { index: true, follow: true },
  other: { "sitemap": "https://astrxytempmail.beezelbub.com/sitemap.xml" },
  openGraph: {
    type: "website",
    url: "https://astrxytempmail.beezelbub.com/",
    title: "ASTRXY Temp Mail - Instant Disposable Temporary Email & VIP Outbound Dispatch",
    description: "Fast, secure, and private temporary email service. Generate instant disposable inboxes, receive OTP verification codes, and send outbound emails anonymously.",
    siteName: "ASTRXY Temp Mail",
  },
  twitter: {
    card: "summary",
    title: "ASTRXY Temp Mail - Instant Disposable Temporary Email & VIP Outbound Dispatch",
    description: "Fast, secure, and private temporary email service. Generate instant disposable inboxes, receive OTP verification codes, and send outbound emails anonymously.",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="theme-cyber dark bg-[#0a0d14]"><body>{children}<Analytics /><SpeedInsights /><Toaster richColors position="top-center" closeButton /></body></html>
}
