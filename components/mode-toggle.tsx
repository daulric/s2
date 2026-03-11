"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useWebHaptics } from "web-haptics/react"

export function ModeToggle() {
  const { setTheme } = useTheme()
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background",
          "hover:bg-accent hover:text-accent-foreground transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
        aria-label="Toggle theme"
      >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { setTheme("light"); trigger("light") }}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTheme("dark"); trigger("light") }}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTheme("system"); trigger("light") }}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}