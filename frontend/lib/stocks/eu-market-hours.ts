export type EuMarketPhase = "pre_market" | "regular" | "after_hours" | "closed"

export const EU_REGULAR_HOURS_LABEL =
  "Regular session: Mon-Fri, 9:00 AM - 5:30 PM CET"

const WEEKEND = new Set(["Saturday", "Sunday"])

const PRE_MARKET_OPEN = 8 * 60       // 08:00 CET
const REGULAR_OPEN = 9 * 60          // 09:00 CET
const REGULAR_CLOSE = 17 * 60 + 30   // 17:30 CET
const AFTER_HOURS_CLOSE = 20 * 60    // 20:00 CET

function cetClock(now: Date): { weekday: string; minutes: number; y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ""

  return {
    weekday: get("weekday"),
    minutes: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
    y: parseInt(get("year"), 10),
    m: parseInt(get("month"), 10),
    d: parseInt(get("day"), 10),
  }
}

function easterSundayMonthDay(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const mn = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * mn + 114) / 31)
  const day = ((h + l - 7 * mn + 114) % 31) + 1
  return { month, day }
}

function goodFridayMonthDay(year: number): { month: number; day: number } {
  const e = easterSundayMonthDay(year)
  const dt = new Date(year, e.month - 1, e.day)
  dt.setDate(dt.getDate() - 2)
  return { month: dt.getMonth() + 1, day: dt.getDate() }
}

function easterMondayMonthDay(year: number): { month: number; day: number } {
  const e = easterSundayMonthDay(year)
  const dt = new Date(year, e.month - 1, e.day)
  dt.setDate(dt.getDate() + 1)
  return { month: dt.getMonth() + 1, day: dt.getDate() }
}

/**
 * Common EU exchange holidays observed across Euronext, Xetra, and LSE.
 * Individual exchanges may have additional closures, but these are
 * the dates where essentially all major EU markets are shut.
 */
export function isEuMarketHoliday(y: number, m: number, d: number): boolean {
  // New Year's Day
  if (m === 1 && d === 1) return true

  // Good Friday
  const gf = goodFridayMonthDay(y)
  if (m === gf.month && d === gf.day) return true

  // Easter Monday
  const em = easterMondayMonthDay(y)
  if (m === em.month && d === em.day) return true

  // Labour Day (May 1) - Euronext, Xetra
  if (m === 5 && d === 1) return true

  // Christmas Day
  if (m === 12 && d === 25) return true

  // Boxing Day / St. Stephen's Day (Dec 26)
  if (m === 12 && d === 26) return true

  return false
}

export function getEuMarketPhase(now: Date = new Date()): EuMarketPhase {
  const { weekday, minutes, y, m, d } = cetClock(now)

  if (WEEKEND.has(weekday)) return "closed"
  if (isEuMarketHoliday(y, m, d)) return "closed"

  if (minutes >= REGULAR_OPEN && minutes < REGULAR_CLOSE) return "regular"
  if (minutes >= PRE_MARKET_OPEN && minutes < REGULAR_OPEN) return "pre_market"
  if (minutes >= REGULAR_CLOSE && minutes < AFTER_HOURS_CLOSE) return "after_hours"
  return "closed"
}

export function isEuRegularSessionOpen(now: Date = new Date()): boolean {
  return getEuMarketPhase(now) === "regular"
}

export function euMarketPhaseLabel(phase: EuMarketPhase): string {
  switch (phase) {
    case "regular":     return "Market Open"
    case "pre_market":  return "Pre-Market"
    case "after_hours": return "After Hours"
    case "closed":      return "Market Closed"
  }
}
