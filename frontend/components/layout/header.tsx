"use client"

import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "./mode-toggle"
import { ProfileIcon } from "@/components/profile"
import { SearchInput } from "./search-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Upload,
  Shell,
  Music,
  Video,
  Compass,
  Headphones,
  Mic,
  FileVideo,
  Music2,
  Zap,
  Menu,
  Vote,
} from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useSubscription } from "@/context/SubscriptionProvider"
import { useWebHaptics } from "web-haptics/react"
import { cn } from "@/lib/utils"

function NavDropdown({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  const { trigger } = useWebHaptics({ debug: process.env.NODE_ENV !== "production" })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        onClick={() => trigger("light")}
        className={cn(
          "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md outline-none",
          "hover:bg-muted hover:text-foreground transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 rounded-xl p-1.5" align="end">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const { user: { user } } = useAuth()
  const { subscribed } = useSubscription()
  const { trigger } = useWebHaptics({ debug: process.env.NODE_ENV !== "production" })

  return (
    <header className="sticky top-0 z-50 w-full flex items-center justify-between p-3 sm:p-4 bg-background/80 backdrop-blur-sm border-b h-14 sm:h-16">
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

      <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
        <SearchInput />
      </div>

      <div className="flex items-center gap-1 sm:gap-4">
        <div className="md:hidden">
          <SearchInput mobile />
        </div>

        {/* Mobile: single hamburger menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Navigation menu"
              onClick={() => trigger("light")}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md outline-none",
                "hover:bg-muted hover:text-foreground transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <Menu className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52 rounded-xl p-1.5" align="end">
              <DropdownMenuItem>
                <Link
                  href="/pricing"
                  className="flex w-full items-center gap-2 text-sm"
                  onClick={() => trigger("light")}
                >
                  <Zap className={cn("h-4 w-4", subscribed && "fill-primary")} />
                  <span>s2+</span>
                  {subscribed && (
                    <span className="ml-auto inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Explore</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link href="/shorts" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Compass className="h-4 w-4" />
                  <span>Shorts</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/home" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Video className="h-4 w-4" />
                  <span>Videos</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/census" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Vote className="h-4 w-4" />
                  <span>Census</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Music</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link href="/music" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Headphones className="h-4 w-4" />
                  <span>Listen</span>
                </Link>
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem>
                  <Link href="/upload/music" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                    <Mic className="h-4 w-4" />
                    <span>Upload Music</span>
                  </Link>
                </DropdownMenuItem>
              )}

              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Upload</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Link href="/upload" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                      <FileVideo className="h-4 w-4" />
                      <span>Upload Video</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/upload/music" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                      <Music2 className="h-4 w-4" />
                      <span>Upload Music</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop: individual dropdown triggers */}
        <div className="hidden md:flex items-center gap-4">
          <NavDropdown icon={Shell} label="Explore">
            <DropdownMenuLabel>Explore</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/shorts" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Compass className="h-4 w-4" />
                  <span>Shorts</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/home" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Video className="h-4 w-4" />
                  <span>Videos</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/census" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Vote className="h-4 w-4" />
                  <span>Census</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </NavDropdown>

          <NavDropdown icon={Music} label="Music">
            <DropdownMenuLabel>Music</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/music" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                  <Headphones className="h-4 w-4" />
                  <span>Listen</span>
                </Link>
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem>
                  <Link href="/upload/music" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                    <Mic className="h-4 w-4" />
                    <span>Upload Music</span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </NavDropdown>

          <Link
            href="/pricing"
            onClick={() => trigger("light")}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              subscribed
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "hover:bg-muted hover:text-foreground text-primary",
            )}
          >
            <Zap className={cn("h-4 w-4", subscribed && "fill-primary")} />
            <span>s2+</span>
            {subscribed && (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </Link>

          {user && (
            <NavDropdown icon={Upload} label="Upload">
              <DropdownMenuLabel>Upload</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Link href="/upload" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                    <FileVideo className="h-4 w-4" />
                    <span>Upload Video</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/upload/music" className="flex w-full items-center gap-2 text-sm" onClick={() => trigger("light")}>
                    <Music2 className="h-4 w-4" />
                    <span>Upload Music</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </NavDropdown>
          )}
        </div>

        <ModeToggle />
        <ProfileIcon />
      </div>
    </header>
  )
}