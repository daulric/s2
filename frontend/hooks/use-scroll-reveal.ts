"use client"

import { useEffect, useRef } from "react"


export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    )

    const targets = root.querySelectorAll("[data-reveal]")
    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [threshold])

  return ref
}
