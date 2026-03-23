import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/context/theme-provider"
import { AuthProvider } from "@/context/AuthProvider"
import { NavigationProvider } from "@/context/NavigationProvider"
import { Header } from "@/components/header"
import {Toaster} from "@/components/ui/sonner"
import NextTopLoader from "@/components/theme-top-loader"
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip"
import { StocksRouteTeardown } from "@/components/stocks-route-teardown"
import { MediaRouteTeardown } from "@/components/media-route-teardown"

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
                  <Header />
                  <NextTopLoader />
                  <Suspense fallback={null}>
                    <StocksRouteTeardown />
                    <MediaRouteTeardown />
                  </Suspense>
                  {children}
                  <Toaster position="top-right" />
                  <Analytics />
                  <SpeedInsights />
              </AuthProvider>
            </NavigationProvider>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}