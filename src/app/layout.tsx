import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/AuthProvider"
import { Header } from "@/components/header"
import {Toaster} from "@/components/ui/sonner"
import NextTopLoader from "nextjs-toploader"

const inter = Inter({ subsets: ["latin"] })

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Header />
            <NextTopLoader showSpinner={false}/>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}