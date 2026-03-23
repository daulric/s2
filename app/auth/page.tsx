import { Metadata } from "next"
import AuthPage from "./AuthPage"
import { CenteredLandingSkeleton } from "@/components/layout/skeletons"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "s2 - Auth",
    description: "Login or Sign up to experience real stuff"
}

export default async function PAGE() {
    return ( 
        <Suspense fallback={<CenteredLandingSkeleton />}>
            <AuthPage /> 
        </Suspense>
    )
}