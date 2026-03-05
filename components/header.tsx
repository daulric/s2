"use client"

import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "./mode-toggle"
import { ProfileIcon } from "./profile-icon"
import { SearchInput } from "./search-input"
import { Button } from "./ui/button"
import { Upload, Shell } from "lucide-react"
import { useAuth } from "../context/AuthProvider"
import { useWebHaptics } from "web-haptics/react"
export function Header() {
  const { user: { user } } = useAuth()
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  
  return (
    <header className="sticky top-0 z-10 w-full flex items-center justify-between p-3 sm:p-4 bg-background/80 backdrop-blur-sm border-b h-14 sm:h-16">
      <div className="flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity"
          onClick={() => trigger("light")}
        >
          <Image src="/logo.jpeg" width={32} height={32} alt="s2 logo" className="rounded" />
          <span>s2</span>
        </Link>
      </div>

      {/* Desktop search bar - hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
        <SearchInput />
      </div>

      <div className="flex items-center gap-1 sm:gap-4">
        {/* Mobile search button - hidden on desktop */}
        <div className="md:hidden">
          <SearchInput mobile />
        </div>

        <Link href="/shorts">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Explore" onClick={() => trigger("light")}>
            <Shell className="h-4 w-4 sm:h-5 sm:w-5"/>
          </Button>
        </Link>

        {/* Upload button - only visible if user is logged in */}
        {user && (
          <Link href="/upload">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Upload video" onClick={() => trigger("light")}>
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        )}
        <ModeToggle />
        <ProfileIcon />
      </div>
    </header>
  )
}