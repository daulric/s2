export type UsEquitiesMarketPhase = "regular" | "pre_market" | "after_hours" | "closed"

export const US_EQUITIES_REGULAR_HOURS_LABEL =
  "Regular session: Mon–Fri, 9:30 AM–4:00 PM ET"

export const US_MARKET_EXTENDED_HOURS_LABEL =
  "Pre-market: Mon–Fri, 4:00 AM–9:30 AM ET · After-hours: Mon–Fri, 4:00 PM–8:00 PM ET"

const WEEKEND = new Set(["Saturday", "Sunday"])

const PRE_OPEN = 4 * 60
const REGULAR_OPEN = 9 * 60 + 30
const REGULAR_CLOSE = 16 * 60
const AFTER_HOURS_CLOSE = 20 * 60

function easternClock(now: Date): { weekday: string; minutes: number; y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
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
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

function goodFridayMonthDay(year: number): { month: number; day: number } {
  const e = easterSundayMonthDay(year)
  const dt = new Date(year, e.month - 1, e.day)
  dt.setDate(dt.getDate() - 2)
  return { month: dt.getMonth() + 1, day: dt.getDate() }
}

/** Nth Monday in month (1-based n). */
function nthMondayOfMonth(year: number, month: number, n: number): number {
  const first = new Date(year, month - 1, 1)
  const firstDow = (first.getDay() + 6) % 7
  const firstMonday = 1 + ((7 - firstDow) % 7)
  return firstMonday + (n - 1) * 7
}

function lastMondayOfMonth(year: number, month: number): number {
  const last = new Date(year, month, 0)
  const dow = (last.getDay() + 6) % 7
  return last.getDate() - dow
}

function fourthThursdayOfNovember(year: number): number {
  const first = new Date(year, 10, 1)
  const firstDow = first.getDay()
  const offset = (4 - firstDow + 7) % 7
  return 1 + offset + 21
}

/** NYSE observed rule: Sunday → following Monday; Saturday → preceding Friday. */
function observedYMD(year: number, month: number, day: number): { y: number; m: number; d: number } {
  const dt = new Date(year, month - 1, day)
  const dow = dt.getDay()
  if (dow === 0) {
    dt.setDate(dt.getDate() + 1)
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
  }
  if (dow === 6) {
    dt.setDate(dt.getDate() - 1)
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
  }
  return { y: year, m: month, d: day }
}

function sameYMD(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number },
): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d
}

/**
 * Full NYSE closure days (calendar date in Eastern “wall” time already applied via y,m,d from ET clock).
 */
export function isNyseFullDayHoliday(y: number, m: number, d: number): boolean {
  const gf = goodFridayMonthDay(y)
  if (m === gf.month && d === gf.day) return true

  const mlk = nthMondayOfMonth(y, 1, 3)
  if (m === 1 && d === mlk) return true

  const pres = nthMondayOfMonth(y, 2, 3)
  if (m === 2 && d === pres) return true

  const mem = lastMondayOfMonth(y, 5)
  if (m === 5 && d === mem) return true

  const jun = observedYMD(y, 6, 19)
  if (sameYMD(jun, { y, m, d })) return true

  const july4 = observedYMD(y, 7, 4)
  if (sameYMD(july4, { y, m, d })) return true

  const labor = nthMondayOfMonth(y, 9, 1)
  if (m === 9 && d === labor) return true

  const thanks = fourthThursdayOfNovember(y)
  if (m === 11 && d === thanks) return true

  const xmas = observedYMD(y, 12, 25)
  if (sameYMD(xmas, { y, m, d })) return true

  const nye = observedYMD(y, 1, 1)
  if (sameYMD(nye, { y, m, d })) return true

  return false
}

export function getUsEquitiesMarketPhase(now: Date = new Date()): UsEquitiesMarketPhase {
  const { weekday, minutes, y, m, d } = easternClock(now)

  if (WEEKEND.has(weekday)) return "closed"
  if (isNyseFullDayHoliday(y, m, d)) return "closed"

  if (minutes >= PRE_OPEN && minutes < REGULAR_OPEN) return "pre_market"
  if (minutes >= REGULAR_OPEN && minutes < REGULAR_CLOSE) return "regular"
  if (minutes >= REGULAR_CLOSE && minutes < AFTER_HOURS_CLOSE) return "after_hours"
  return "closed"
}

export function isUsEquitiesRegularSessionOpen(now: Date = new Date()): boolean {
  return getUsEquitiesMarketPhase(now) === "regular"
}

export function usMarketPhaseLabel(phase: UsEquitiesMarketPhase): string {
  switch (phase) {
    case "regular":
      return "Market Open"
    case "pre_market":
      return "Pre-Market"
    case "after_hours":
      return "After-Hours"
    default:
      return "Market Closed"
  }
}
