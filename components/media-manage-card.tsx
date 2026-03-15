"use client"

import type React from "react"
import { Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MediaManageCardProps = {
  children: React.ReactNode
  onEdit: () => void
  className?: string
  editButtonClassName?: string
}

export function MediaManageCard({ children, onEdit, className, editButtonClassName }: MediaManageCardProps) {
  return (
    <div className={cn("relative group", className)}>
      {children}
      <div className={cn("absolute top-2 right-2 opacity-100 transition-opacity", editButtonClassName)}>
        <Button size="sm" variant="secondary" onClick={onEdit} className="h-8 w-8 p-0">
          <Edit3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
