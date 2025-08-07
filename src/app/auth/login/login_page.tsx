"use client"

import { useRef } from "react"
import Link from "next/link"
import { Github, Gitlab } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"

import { useAuth } from "@/context/AuthProvider"
import { toast } from "sonner"
import { useRouter, redirect } from "next/navigation"
import { useSignal, useSignals } from "@preact/signals-react/runtime"

export default function LoginPage() {
  useSignals();
  const email = useRef(null);
  const password = useRef(null);
  const isLoading = useSignal(false);
  const router = useRouter();

  const { signIn, user: {user}, oauth } = useAuth();

  if (user) {
    redirect("/home");
  }

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    isLoading.value = true;

    try {
      if (!email.current || !password.current) {
        toast.error("Email or password input is missing.");
        isLoading.value = false;
        return;
      }
      const data = await signIn({email: (email.current as HTMLInputElement).value, password: (password.current as HTMLInputElement).value});

      if (data) {
        router.back();
      }
    } catch (error) {
      toast.error("Login Failed", {
        description: (error instanceof Error && error.message) ? error.message : "An unknown error occurred.",
      });
    } finally {
      isLoading.value = false
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={email}
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                  Forgot password?
                </Link>
              </div>
              <Input
                ref = {password}
                id="password"
                type="password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading.value}>
              {isLoading.value ? "Loading..." : "Login"}
            </Button>
          </form>

          <div className="flex items-center">
            <Separator className="flex-1" />
            <span className="px-3 text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={() => oauth("github", "home")}
              disabled={isLoading.value}
            >
              <Github className="h-4 w-4" />
              GitHub
            </Button>

            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={() => oauth("google", "home")}
              disabled={isLoading.value}
            >
              <FcGoogle className="h-4 w-4" />
              Google
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}