"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, UserIcon, Mail, Github } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useWebHaptics } from "web-haptics/react"
import { cn } from "@/lib/utils"

export function ProfileIcon() {
  const {user: {user, profile}, signOut} = useAuth();
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  const handleLogout = () => {
    signOut();
    sessionStorage.removeItem("profile_user");
  }  

  // Get initials for avatar fallback
  const initials = (profile && profile?.username) ? profile?.username
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase() : "G"

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full",
            "hover:bg-muted hover:text-foreground transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          onClick={() => trigger("light")}
          aria-label="Login options"
        >
            <UserIcon className="h-5 w-5" />
            <span className="sr-only">Login options</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60 rounded-xl p-1.5" align="end">
          <DropdownMenuLabel>Login Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Link
                href="/auth"
                className="flex w-full items-center gap-2 text-sm"
                onClick={() => trigger("light")}
              >
                <Mail className="h-4 w-4" />
                <span>Login</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link
              href="/auth"
              className="block w-full text-sm text-muted-foreground hover:text-foreground"
              onClick={() => trigger("light")}
            >
              <span>Don&apos;t have an account? Sign up</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const avatar_url = profile?.avatar_url || `${process.env.NEXT_PUBLIC_PROFILE}${profile?.username || "G"}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-full",
          "hover:bg-muted hover:text-foreground transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Open profile menu"
      >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={avatar_url}
              alt={profile?.username  || "G"}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-xl p-1.5" align="end" >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.username || "G"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link
              href={`/user/${user.id}`}
              className="flex w-full items-center gap-2 text-sm"
              onClick={() => trigger("light")}
            >
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 text-sm"
              onClick={() => trigger("light")}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { handleLogout(); trigger("light") }} className="cursor-pointer text-sm">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}