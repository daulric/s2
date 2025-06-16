"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"

interface SearchInputProps {
  mobile?: boolean
}

export function SearchInput({ mobile = false }: SearchInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimed_key_search = inputRef.current?.value.trim();
    if (trimed_key_search) {
      router.push(`/search?q=${encodeURIComponent(trimed_key_search)}`)
      if (mobile) {
        setIsOpen(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
      inputRef.current!.value = ""
    }
  }

  // Focus input when opened on mobile
  useEffect(() => {
    if (isOpen && mobile && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, mobile])

  // Desktop search bar
  if (!mobile) {
    return (
      <form onSubmit={handleSearch} className="relative w-full max-w-lg">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search videos..."
          onKeyDown={handleKeyDown}
          className="pr-10 bg-background/50 border-muted-foreground/20 focus:border-primary"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
      </form>
    )
  }

  // Mobile search
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-9"
        onClick={() => setIsOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>

      {/* Mobile search overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center p-4 border-b">
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search videos..."
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="ml-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}