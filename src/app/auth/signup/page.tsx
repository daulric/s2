import { Metadata } from "next"
import SignupPage from "./signup_page"

export const metadata: Metadata = {
    title: "s2 - Signup",
    description: "Enter the world of real stuff"
}

export default async function PAGE() {
    return ( <SignupPage /> )
}