import { Metadata } from "next"
import AuthPage from "./AuthPage"
import Loading from "@/app/loading"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "s2 - Auth",
    description: "Login or Sign up to experience real stuff"
}

export default async function PAGE() {
    return ( 
        <Suspense fallback={<Loading />}>
            <AuthPage /> 
        </Suspense>
    )
}