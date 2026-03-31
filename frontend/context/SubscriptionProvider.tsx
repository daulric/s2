"use client"

import { createContext, useContext, useEffect, useCallback } from "react"
import { useSignal, useSignals } from "@preact/signals-react/runtime"
import { useAuth } from "./AuthProvider"

type SubscriptionState = {
  loading: boolean
  subscribed: boolean
  status: string | null
  planId: string | null
  currentPeriodEnd: string | null
  paypalSubscriptionId: string | null
}

type SubscriptionContextType = SubscriptionState & {
  refresh: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  loading: true,
  subscribed: false,
  status: null,
  planId: null,
  currentPeriodEnd: null,
  paypalSubscriptionId: null,
  refresh: () => {},
})

export function useSubscription(): SubscriptionContextType {
  return useContext(SubscriptionContext)
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  useSignals()
  const { user: { user } } = useAuth()

  const loading = useSignal(true)
  const subscribed = useSignal(false)
  const status = useSignal<string | null>(null)
  const planId = useSignal<string | null>(null)
  const currentPeriodEnd = useSignal<string | null>(null)
  const paypalSubscriptionId = useSignal<string | null>(null)

  const refresh = useCallback(() => {
    if (!user) {
      loading.value = false
      subscribed.value = false
      status.value = null
      planId.value = null
      currentPeriodEnd.value = null
      paypalSubscriptionId.value = null
      return
    }

    loading.value = true
    fetch("/api/paypal/status")
      .then(r => r.json())
      .then(data => {
        loading.value = false
        subscribed.value = data.subscribed ?? false
        status.value = data.status ?? null
        planId.value = data.planId ?? null
        currentPeriodEnd.value = data.currentPeriodEnd ?? null
        paypalSubscriptionId.value = data.paypalSubscriptionId ?? null
      })
      .catch(() => {
        loading.value = false
      })
  }, [user, loading, subscribed, status, planId, currentPeriodEnd, paypalSubscriptionId])

  useEffect(() => { refresh() }, [refresh])

  const value: SubscriptionContextType = {
    loading: loading.value,
    subscribed: subscribed.value,
    status: status.value,
    planId: planId.value,
    currentPeriodEnd: currentPeriodEnd.value,
    paypalSubscriptionId: paypalSubscriptionId.value,
    refresh,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
