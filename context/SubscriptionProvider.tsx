"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
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
  const { user: { user } } = useAuth()
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    subscribed: false,
    status: null,
    planId: null,
    currentPeriodEnd: null,
    paypalSubscriptionId: null,
  })

  const refresh = useCallback(() => {
    if (!user) {
      setState({
        loading: false,
        subscribed: false,
        status: null,
        planId: null,
        currentPeriodEnd: null,
        paypalSubscriptionId: null,
      })
      return
    }

    setState(prev => ({ ...prev, loading: true }))
    fetch("/api/paypal/status")
      .then(r => r.json())
      .then(data => {
        setState({
          loading: false,
          subscribed: data.subscribed ?? false,
          status: data.status ?? null,
          planId: data.planId ?? null,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          paypalSubscriptionId: data.paypalSubscriptionId ?? null,
        })
      })
      .catch(() => {
        setState(prev => ({ ...prev, loading: false }))
      })
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return (
    <SubscriptionContext.Provider value={{ ...state, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  )
}
