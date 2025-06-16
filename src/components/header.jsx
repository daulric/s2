"use client"

import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "./mode-toggle"
import { ProfileIcon } from "./profile-icon"
import { SearchInput } from "./search-input"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"

export function Header() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-10 w-full flex items-center justify-between p-3 sm:p-4 bg-background/80 backdrop-blur-sm border-b h-14 sm:h-16">
      <div className="flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity"
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

        {user && (
          <Link href="/upload">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Upload video">
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