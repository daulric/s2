import { Metadata } from "next"
import Link from "next/link"
import { Ship, Plane } from "lucide-react"

export const metadata: Metadata = {
  title: "s2 - Transportation",
  description: "Real-time vessel and airplane tracking",
}

const sections = [
  {
    title: "vessels",
    description: "track ships and maritime vessels worldwide via AIS",
    href: "/transportation/vessels",
    icon: Ship,
    color: "text-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    border: "border-blue-500/20",
  },
  {
    title: "airlines",
    description: "track flights and aircraft in real-time via ADS-B",
    href: "/transportation/airlines",
    icon: Plane,
    color: "text-amber-400",
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    border: "border-amber-500/20",
  },
]

export default function TransportationPage() {
  return (
    <div className="p-4">
      <div className="max-w-screen-md mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">transportation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            real-time vessel and airplane tracking
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group flex flex-col gap-4 rounded-xl border ${s.border} ${s.bg} p-6 transition-colors`}
            >
              <div className={`flex items-center justify-center h-12 w-12 rounded-xl bg-background/60 ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {s.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
