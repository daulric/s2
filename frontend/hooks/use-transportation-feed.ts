"use client"

import { useEffect, useCallback } from "react"
import { useSignal, useSignals } from "@preact/signals-react/runtime"
import { createClient } from "@/lib/supabase/client"

export type VehicleKind = "vessel" | "airplane"

export type TrailPoint = [lng: number, lat: number, ts: number]

export type Vehicle = {
  id: string
  kind: VehicleKind
  name: string
  lat: number
  lng: number
  heading: number
  speed: number
  updatedAt: number
  trail: TrailPoint[]
  origin?: string
  destination?: string
  flag?: string
  callsign?: string
  type?: string
  imo?: string
  registration?: string
  operator?: string
  altitude?: number
  lengthM?: number
  widthM?: number
}

export type TransportationFilter = "all" | "vessels" | "airplanes"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getWsUrl(): string {
  const base = BACKEND_URL.replace(/^http/, "ws")
  return `${base}/ws/transportation`
}

let ws: WebSocket | null = null
let wsReady = false
let connecting = false
let authRejected = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let currentFilter: TransportationFilter = "all"
const MAX_RECONNECT_DELAY = 30_000

type VehicleListener = (vehicles: Vehicle[]) => void
const listeners = new Set<VehicleListener>()
let latestVehicles: Vehicle[] = []

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function connect() {
  if (listeners.size === 0) return
  if (connecting) return
  if (authRejected) return
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  connecting = true
  const token = await getToken()
  if (!token || listeners.size === 0) {
    connecting = false
    return
  }

  if (ws) {
    try { ws.close() } catch { /* ignore */ }
    ws = null
  }

  const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    connecting = false
    wsReady = true
    reconnectAttempts = 0

    if (currentFilter !== "all") {
      ws?.send(JSON.stringify({ type: "filter", value: currentFilter }))
    }
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)

      if (msg.error) {
        if (msg.error.includes("subscription required") || msg.error.includes("token")) {
          authRejected = true
        }
        return
      }

      if (msg.type === "snapshot" || msg.type === "update") {
        latestVehicles = msg.vehicles as Vehicle[]
        for (const cb of listeners) cb(latestVehicles)
      }
    } catch {
      // malformed message
    }
  }

  ws.onclose = (ev) => {
    connecting = false
    wsReady = false
    ws = null

    if (ev.code === 4001 || ev.code === 4003) {
      authRejected = true
      return
    }

    scheduleReconnect()
  }

  ws.onerror = () => {
    // onclose fires after
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (listeners.size === 0) return
  if (authRejected) return

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
  reconnectAttempts++

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function sendFilter(filter: TransportationFilter) {
  currentFilter = filter
  if (wsReady && ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "filter", value: filter }))
  }
}

function addListener(cb: VehicleListener) {
  listeners.add(cb)
  if (listeners.size === 1) connect()
}

function removeListener(cb: VehicleListener) {
  listeners.delete(cb)
  if (listeners.size === 0 && ws) {
    clearReconnectTimer()
    reconnectAttempts = 0
    ws.close()
    ws = null
    wsReady = false
  }
}

export function shutdownAllTransportationFeeds(): void {
  clearReconnectTimer()
  reconnectAttempts = 0
  connecting = false
  authRejected = false
  listeners.clear()
  latestVehicles = []
  currentFilter = "all"

  const socket = ws
  ws = null
  wsReady = false

  if (socket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    try {
      socket.close()
    } catch {
      /* ignore */
    }
  }
}

export function useTransportationFeed() {
  useSignals()
  const vehicles = useSignal<Vehicle[]>(latestVehicles)
  const filter = useSignal<TransportationFilter>(currentFilter)

  useEffect(() => {
    const cb: VehicleListener = (v) => { vehicles.value = v }
    addListener(cb)

    if (latestVehicles.length > 0) vehicles.value = latestVehicles

    return () => removeListener(cb)
  }, [vehicles])

  const setFilter = useCallback((f: TransportationFilter) => {
    filter.value = f
    sendFilter(f)
  }, [filter])

  return { vehicles: vehicles.value, filter: filter.value, setFilter }
}

export type { Vehicle as TransportationVehicle }
