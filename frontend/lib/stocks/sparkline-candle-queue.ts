import { GetStockCandles } from "@/serverActions/GetStockDetails"
import type { PriceCandle } from "@/lib/stocks/types"

const MAX_CONCURRENT = 4

type Job = {
  gen: number
  ticker: string
  resolve: (candles: PriceCandle[]) => void
}

let listSession = 0
let inFlight = 0
const queue: Job[] = []

function pump(): void {
  while (inFlight < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!
    if (job.gen !== listSession) {
      job.resolve([])
      continue
    }

    inFlight++
    GetStockCandles(job.ticker, "1W")
      .then((data) => {
        if (job.gen !== listSession) {
          job.resolve([])
          return
        }
        job.resolve(data)
      })
      .catch(() => {
        job.resolve([])
      })
      .finally(() => {
        inFlight--
        pump()
      })
  }
}

/**
 * Call when leaving `/stocks/*`. Drops queued sparkline fetches (no server call).
 * At most `MAX_CONCURRENT` `GetStockCandles` requests that already started may still complete on the server.
 */
export function bumpSparklineListSession(): void {
  listSession++
  while (queue.length > 0) {
    const job = queue.shift()!
    job.resolve([])
  }
  pump()
}

/** Serialized + session-aware fetch for list sparklines (replaces N parallel server actions). */
export function enqueueSparklineWeekCandles(ticker: string): Promise<PriceCandle[]> {
  return new Promise((resolve) => {
    queue.push({ gen: listSession, ticker, resolve })
    pump()
  })
}
