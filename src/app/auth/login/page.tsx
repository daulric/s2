import { Metadata } from "next"
import LoginPage from "./login_page"

export const metadata: Metadata = {
    title: "s2 - Login",
    description: "Login to experience real stuff"
}

export default async function PAGE() {
    return ( <LoginPage /> )
}