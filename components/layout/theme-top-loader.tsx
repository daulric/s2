"use client"

import { useTheme } from "next-themes"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useEffect } from "react"
import NextTopLoader from "nextjs-toploader"

export default function TopLoader() {
    useSignals()
    const { resolvedTheme } = useTheme()
    const loaderColorSignal = useSignal("#000000") // fallback color

    useEffect(() => {
        if (resolvedTheme === "dark") {
            loaderColorSignal.value = "#FFFFFF" // light color for dark mode
        } else {
            loaderColorSignal.value = "#000000" // dark color for light mode
        }
    }, [resolvedTheme, loaderColorSignal])

    return <NextTopLoader color={loaderColorSignal.value} showSpinner={false} />
}
