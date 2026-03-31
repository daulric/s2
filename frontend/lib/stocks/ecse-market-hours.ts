export type EcseMarketPhase = "regular" | "closed"

export const ECSE_REGULAR_HOURS_LABEL =
  "Regular session: Mon–Fri, 9:00 AM–2:00 PM AST"

const WEEKEND = new Set(["Saturday", "Sunday"])

const REGULAR_OPEN = 9 * 60
const REGULAR_CLOSE = 14 * 60

function atlanticClock(now: Date): { weekday: string; minutes: number; y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
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

function whitMondayMonthDay(year: number): { month: number; day: number } {
  const e = easterSundayMonthDay(year)
  const dt = new Date(year, e.month - 1, e.day)
  dt.setDate(dt.getDate() + 49)
  return { month: dt.getMonth() + 1, day: dt.getDate() }
}

/** First Monday on or after a given date. */
function firstMondayOnOrAfter(year: number, month: number, day: number): number {
  const dt = new Date(year, month - 1, day)
  const dow = dt.getDay()
  if (dow === 1) return day
  const daysUntilMon = (8 - dow) % 7
  return day + daysUntilMon
}

/**
 * St Kitts and Nevis public holidays (ECSE headquarters).
 * The ECSE observes these as full closure days.
 */
export function isEcseHoliday(y: number, m: number, d: number): boolean {
  // New Year's Day – Jan 1
  if (m === 1 && d === 1) return true

  // Carnival Day – Jan 2
  if (m === 1 && d === 2) return true

  // Good Friday
  const gf = goodFridayMonthDay(y)
  if (m === gf.month && d === gf.day) return true

  // Easter Monday
  const em = easterMondayMonthDay(y)
  if (m === em.month && d === em.day) return true

  // Labour Day – first Monday in May
  const labourDay = firstMondayOnOrAfter(y, 5, 1)
  if (m === 5 && d === labourDay) return true

  // Whit Monday (Pentecost Monday)
  const wm = whitMondayMonthDay(y)
  if (m === wm.month && d === wm.day) return true

  // Emancipation Day – first Monday in August
  const emancipation = firstMondayOnOrAfter(y, 8, 1)
  if (m === 8 && d === emancipation) return true

  // Culturama Day – day after Emancipation Day
  if (m === 8 && d === emancipation + 1) return true

  // National Heroes Day – Sep 16
  if (m === 9 && d === 16) return true

  // Independence Day – Sep 19
  if (m === 9 && d === 19) return true

  // Christmas Day – Dec 25
  if (m === 12 && d === 25) return true

  // Boxing Day – Dec 26
  if (m === 12 && d === 26) return true

  return false
}

export function getEcseMarketPhase(now: Date = new Date()): EcseMarketPhase {
  const { weekday, minutes, y, m, d } = atlanticClock(now)

  if (WEEKEND.has(weekday)) return "closed"
  if (isEcseHoliday(y, m, d)) return "closed"

  if (minutes >= REGULAR_OPEN && minutes < REGULAR_CLOSE) return "regular"
  return "closed"
}

export function isEcseRegularSessionOpen(now: Date = new Date()): boolean {
  return getEcseMarketPhase(now) === "regular"
}

export function ecseMarketPhaseLabel(phase: EcseMarketPhase): string {
  return phase === "regular" ? "Market Open" : "Market Closed"
}
