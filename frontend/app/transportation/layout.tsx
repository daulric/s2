import type { ReactNode } from "react"

export default function TransportationLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen pt-15 bg-background">
      {children}
    </main>
  )
}
