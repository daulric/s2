import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/context/theme-provider"
import { AuthProvider } from "@/context/AuthProvider"
import { SubscriptionProvider } from "@/context/SubscriptionProvider"
import { NavigationProvider } from "@/context/NavigationProvider"
import { Header, ThemeTopLoader } from "@/components/layout"
import {Toaster} from "@/components/ui/sonner"
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip"
import { StocksRouteTeardown } from "@/components/stocks"
import { TransportationRouteTeardown } from "@/components/transportation"
import { MediaRouteTeardown } from "@/components/media"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "s2",
  description: "A fuze successor",
  
  icons: {
    icon: [ { url: "/logo.jpeg" } ]
  }
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TooltipProvider delay={0}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <NavigationProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <Header />
                  <ThemeTopLoader />
                  <Suspense fallback={null}>
                    <StocksRouteTeardown />
                    <TransportationRouteTeardown />
                    <MediaRouteTeardown />
                  </Suspense>
                  {children}
                  <Toaster position="top-right" />
                  <Analytics />
                  <SpeedInsights />
                </SubscriptionProvider>
              </AuthProvider>
            </NavigationProvider>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}