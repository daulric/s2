import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "s2 - Census",
  description: "Election results and demographic data",
}

const countries = [
  {
    name: "Grenada",
    slug: "grenada",
    flag: "🇬🇩",
    description: "General election results from 1984 to 2022",
  },
]

export default function CensusPage() {
  return (
    <main className="min-h-screen pt-15 p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Census</h1>
        <p className="text-muted-foreground mb-8">election results and demographic data</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {countries.map((c) => (
            <Link
              key={c.slug}
              href={`/census/${c.slug}`}
              className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-4xl">{c.flag}</span>
              <div>
                <h2 className="font-semibold group-hover:text-primary transition-colors">
                  {c.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {c.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
