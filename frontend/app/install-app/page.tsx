import type { Metadata } from "next"
import { InstallAppClient } from "./install-app-client"

export const metadata: Metadata = {
  title: "Install app — s2",
  description: "Add s2 to your home screen for the best experience",
}

export default function InstallAppPage() {
  return <InstallAppClient />
}
