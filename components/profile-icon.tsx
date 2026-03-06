"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { LogOut, Settings, UserIcon, Mail, Github } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useWebHaptics } from "web-haptics/react"

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
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => trigger("light")}>
            <UserIcon className="h-5 w-5" />
            <span className="sr-only">Login options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>Login Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/auth" className="w-full cursor-pointer" onClick={() => trigger("light")}>
                <Mail className="mr-2 h-4 w-4" />
                <span>Login</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/auth" className="w-full cursor-pointer" onClick={() => trigger("light")}>
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
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={avatar_url}
              alt={profile?.username  || "G"}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.username || "G"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/user/${user.id}`} className="w-full cursor-pointer" onClick={() => trigger("light")}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="w-full cursor-pointer" onClick={() => trigger("light")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { handleLogout(); trigger("light") }} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}