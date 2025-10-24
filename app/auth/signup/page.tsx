import { Metadata } from "next"
import SignupPage from "./signup_page"
import Loading from "../../loading"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "s2 - Signup",
    description: "Enter the world of real stuff"
}

export default async function PAGE() {
    return ( 
        <Suspense fallback={<Loading />}>
            <SignupPage />
        </Suspense>
    )
}