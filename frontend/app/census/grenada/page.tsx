import type { Metadata } from "next"
import { Suspense } from "react"
import GrenadaCensusPage from "./page_client"

export const metadata: Metadata = {
  title: "s2 - Grenada Elections",
  description: "Grenada general election results mapped by parish and constituency",
}

export default function PAGE() {
  return (
    <main className="min-h-screen pt-15 bg-background">
      <Suspense fallback={null}>
        <GrenadaCensusPage />
      </Suspense>
    </main>
  )
}
