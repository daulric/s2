"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthProvider"

export default function Home() {

  const { user: { user } } = useAuth();
  const router = useRouter();

  if (user) {
    router.push("/home");
    return null;
  }


  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">A Better Experience</h1>
            <p className="text-muted-foreground mt-2">You are an Unknown Entity</p>
            <p className="text-muted-foreground mt-2">Choose one below to continue</p>
          </div>
          <div className="space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/home">Browse as Guest</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}