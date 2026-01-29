import Link from "next/link"
import { Button } from "../components/ui/button"
import { createClient } from "../lib/supabase/server"
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function Home() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    revalidatePath("/")
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">a better experience</h1>
            <p className="text-muted-foreground mt-2">you an unknown entity</p>
            <p className="text-muted-foreground mt-2">choose one move forward</p>
          </div>
          <div className="space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link href="/auth">get started</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/home">browse as guest</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}