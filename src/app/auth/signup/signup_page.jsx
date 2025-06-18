"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/context/AuthProvider"
import { toast } from "sonner"
import { redirect, useRouter } from "next/navigation"

export default function SignupPage() {
  const email = useRef(null);
  const username = useRef(null);
  const  password = useRef(null);
  const [isLoading, setIsLoading] = useState(false)
  const {signUp, supabase, user: { user }} = useAuth();
  const router = useRouter();

  if (user) {
    redirect("/home");
  }

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.current || !username.current || !password.current) {
      toast.error("Invalid input", {
        description: "Please fill in all fields"
      });
      return;
    }

    const emailValue = email.current.value;
    const passwordValue = password.current.value;
    const usernameValue = username.current.value;
  
    try {
      // Sign up user
      const data = await signUp({email: emailValue, password: passwordValue});
  
      const user = data.user;
  
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username: usernameValue,
          })
          .select();

        const { error: display_name_error } = await supabase.auth.updateUser({
          data: { 
            display_name: usernameValue,
          }
        });

        if (profileError) {
          throw profileError;
        } else if (profileData && !display_name_error) {
          setTimeout(() => router.back(), 800);
        }
      }
    } catch (error) {
      toast.error("Sign Up Failed", {
        description: error?.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
          <CardDescription className="text-center">Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Username</Label>
              <Input
                ref={username}
                id="username" 
                placeholder="john_doe" 
                required
                autoComplete="off"
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
              <Input
                ref={password}
                id="password"
                type="password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : "Sign Up"}
            </Button>
          </form>

          <div className="flex items-center">
            <Separator className="flex-1" />
            <span className="px-3 text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}