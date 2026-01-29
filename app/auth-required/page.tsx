import Link from "next/link"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { ModeToggle } from "../../components/mode-toggle"
import { Shield, UserPlus, LogIn, Video, ThumbsUp, MessageSquare } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "s2 - Authorization Required",
  description: "Authorization is required for the feature",
}

export default function AuthRequiredPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <div className="max-w-3xl w-full">
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Account Required</CardTitle>
            <CardDescription className="text-lg mt-2">Please create an account or sign in to continue</CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                <Video className="h-8 w-8 mb-2 text-primary" />
                <h3 className="font-medium mb-1">Upload Videos</h3>
                <p className="text-sm text-muted-foreground">Share your content with the world</p>
              </div>

              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                <ThumbsUp className="h-8 w-8 mb-2 text-primary" />
                <h3 className="font-medium mb-1">Like & Subscribe</h3>
                <p className="text-sm text-muted-foreground">Engage with your favorite creators</p>
              </div>

              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                <MessageSquare className="h-8 w-8 mb-2 text-primary" />
                <h3 className="font-medium mb-1">Join the Community</h3>
                <p className="text-sm text-muted-foreground">Comment and connect with others</p>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Why create an account?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Access exclusive content and features</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Save your favorite videos to watch later</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Track your viewing history across devices</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Receive personalized recommendations</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Upload and share your own videos</span>
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row sm:justify-center gap-4 pt-2">
            <Button asChild className="w-full sm:w-auto sm:min-w-[200px]" size="lg">
              <Link href="/auth">
                <UserPlus className="mr-2 h-5 w-5" />
                get started
              </Link>
            </Button>
          </CardFooter>

          <div className="text-center mt-6 text-sm text-muted-foreground">
            <p>
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}