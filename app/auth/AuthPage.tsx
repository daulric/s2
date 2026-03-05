"use client"

import React, { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { Github } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { Separator } from "../../components/ui/separator"
import { ModeToggle } from "../../components/mode-toggle"

import { useAuth } from "../../context/AuthProvider"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSignal, useSignals } from "@preact/signals-react/runtime"
import { Provider } from "@supabase/supabase-js"
import { Turnstile } from "@marsidev/react-turnstile"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp"
import { useWebHaptics } from "web-haptics/react"

export default function AuthPage() {
  useSignals()
  const email = useRef<HTMLInputElement>(null)
  const emailAddress = useSignal<string>("")
  const otp = useSignal<string>("")
  const otpSent = useSignal<boolean>(false)
  const isLoading = useSignal(false)
  const turnstileToken = useSignal<string | null>(null)
  const router = useRouter()
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  const {
    signInWithOtp,
    verifyOtp,
    user: { user },
    oauth,
  } = useAuth()

  useEffect(() => {
    if (user) {
      router.push("/home")
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!turnstileToken.value) {
      toast.error("Please complete the captcha verification.")
      return
    }

    isLoading.value = true

    try {
      if (!otpSent.value) {
        // Send OTP
        if (!email.current?.value) {
          toast.error("Email is required.")
          isLoading.value = false
          return
        }

        await signInWithOtp(email.current.value)
        emailAddress.value = email.current.value
        otpSent.value = true
        trigger("success");
        toast.success("OTP sent to your email.")
      } else {
        // Verify OTP
        if (!otp.value || otp.value.length !== 6) {
          toast.error("Please enter a valid 6-digit OTP.")
          isLoading.value = false
          return
        }
        trigger("success");
        await verifyOtp(emailAddress.value, otp.value)
        // verifyOtp in AuthProvider handles redirection
      }
    } catch (error) {
      console.log(error)
      trigger("light");
      trigger("error");
      toast.error(otpSent.value ? "Verification Failed" : "Login Failed", {
        description: error instanceof Error && error.message ? error.message : "An unknown error occurred.",
      })
    } finally {
      isLoading.value = false
    }
  }

  const handleOAuthLogin = async (provider: Provider, redirectTo: string) => {
    if (!turnstileToken.value) {
      toast.error("Please complete the captcha verification.")
      return
    }

    try {
      oauth(provider, redirectTo)
      trigger("success");
    } catch (error) {
      toast.error("OAuth verification failed. Please try again.")
      trigger("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {otpSent.value ? "Verify OTP" : "Welcome"}
          </CardTitle>
          <CardDescription className="text-center">
            {otpSent.value 
              ? `Enter the 6-digit code sent to ${emailAddress.value}` 
              : "Enter your email to login or create an account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {!otpSent.value ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input ref={email} id="email" type="email" placeholder="m@example.com" required />
              </div>
            ) : (
              <div className="space-y-2 flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp.value}
                  onChange={(value) => ( otp.value = value ) }
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            {/* Cloudflare Turnstile */}
            {!otpSent.value && (
               <Turnstile siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || ""} onSuccess={(token) => turnstileToken.value = token} />
            )}

            <Button type="submit" className="w-full" disabled={isLoading.value || (!otpSent && !turnstileToken.value)}>
              {isLoading.value ? "Loading..." : (otpSent.value ? "Verify" : "Send Code")}
            </Button>
            
            {otpSent.value && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => ( otpSent.value = false ) }
                    disabled={isLoading.value}
                >
                    Back to Email
                </Button>
            )}
          </form>

          <div className="flex items-center">
            <Separator className="flex-1" />
            <span className="px-3 text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 bg-transparent"
              onClick={() => handleOAuthLogin("github", "home")}
              disabled={isLoading.value || (!otpSent.value && !turnstileToken.value)}
            >
              <Github className="h-4 w-4" />
              GitHub
            </Button>

            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 bg-transparent"
              onClick={() => handleOAuthLogin("google", "home")}
              disabled={isLoading.value || (!otpSent.value && !turnstileToken.value)}
            >
              <FcGoogle className="h-4 w-4" />
              Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}