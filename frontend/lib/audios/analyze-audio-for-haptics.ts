import { OfflineAudioContext } from "standardized-audio-context"

export type HapticEvent = {
  time: number
  pattern: { duration: number; delay?: number; intensity?: number }[]
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Heavy beat detection for web haptics — loaded dynamically from the music page
 * so the initial route JS stays small.
 */
export async function analyzeAudioForHaptics(
  src: string
): Promise<{ timeline: HapticEvent[]; duration: number }> {
  const response = await fetch(src)
  const arrayBuffer = await response.arrayBuffer()

  const offlineCtx = new OfflineAudioContext(2, 1, 44100)
  const decoded = await offlineCtx.decodeAudioData(arrayBuffer)

  const sampleRate = decoded.sampleRate
  const channelData = decoded.getChannelData(0)
  const totalSamples = channelData.length

  const hopSize = Math.floor(sampleRate * 0.01)
  const fftSize = 1024
  const binFreq = sampleRate / fftSize
  const halfFFT = fftSize / 2

  const bands = {
    subBass: { lo: Math.floor(20 / binFreq), hi: Math.floor(80 / binFreq) },
    kick: { lo: Math.floor(80 / binFreq), hi: Math.floor(150 / binFreq) },
    snare: { lo: Math.floor(150 / binFreq), hi: Math.floor(1000 / binFreq) },
    hihat: { lo: Math.floor(3000 / binFreq), hi: Math.min(Math.floor(8000 / binFreq), halfFFT) },
  }

  const HISTORY = 30
  const history = {
    subBass: new Float32Array(HISTORY),
    kick: new Float32Array(HISTORY),
    snare: new Float32Array(HISTORY),
    hihat: new Float32Array(HISTORY),
  }
  let histIdx = 0

  const timeline: HapticEvent[] = []
  let lastKickTime = -Infinity
  let lastSnareTime = -Infinity
  let lastHihatTime = -Infinity
  const KICK_GAP = 0.06
  const SNARE_GAP = 0.05
  const HIHAT_GAP = 0.04

  const re = new Float32Array(fftSize)
  const im = new Float32Array(fftSize)
  const magnitudes = new Float32Array(halfFFT)
  let frameCount = 0

  for (let offset = 0; offset + fftSize <= totalSamples; offset += hopSize) {
    const time = offset / sampleRate

    for (let i = 0; i < fftSize; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1))
      re[i] = channelData[offset + i] * w
      im[i] = 0
    }

    for (let size = 2; size <= fftSize; size *= 2) {
      const half = size / 2
      const angle = (-2 * Math.PI) / size
      for (let i = 0; i < fftSize; i += size) {
        for (let j = 0; j < half; j++) {
          const cos = Math.cos(angle * j)
          const sin = Math.sin(angle * j)
          const tRe = re[i + j + half] * cos - im[i + j + half] * sin
          const tIm = re[i + j + half] * sin + im[i + j + half] * cos
          re[i + j + half] = re[i + j] - tRe
          im[i + j + half] = im[i + j] - tIm
          re[i + j] += tRe
          im[i + j] += tIm
        }
      }
    }

    for (let i = 0; i < halfFFT; i++) {
      magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
    }

    const bandEnergy = (b: { lo: number; hi: number }) => {
      let sum = 0
      for (let i = b.lo; i < b.hi; i++) sum += magnitudes[i]
      return sum / Math.max(b.hi - b.lo, 1)
    }

    const subBass = bandEnergy(bands.subBass)
    const kick = bandEnergy(bands.kick)
    const snare = bandEnergy(bands.snare)
    const hihat = bandEnergy(bands.hihat)

    const avg = (arr: Float32Array) => {
      let s = 0
      for (let i = 0; i < arr.length; i++) s += arr[i]
      return s / arr.length
    }

    const kickCombined = kick + subBass * 0.6
    const kickAvg = avg(history.kick) + avg(history.subBass) * 0.6
    const snareAvg = avg(history.snare)
    const hihatAvg = avg(history.hihat)

    const kickThreshold = Math.max(kickAvg * 1.4, 0.015)
    const snareThreshold = Math.max(snareAvg * 1.5, 0.008)
    const hihatThreshold = Math.max(hihatAvg * 1.6, 0.004)

    const pattern: { duration: number; delay?: number; intensity?: number }[] = []

    if (kickCombined > kickThreshold && time - lastKickTime >= KICK_GAP) {
      const intensity = Math.min((kickCombined / kickThreshold) * 0.5, 1)
      pattern.push({ duration: 45, intensity })
      lastKickTime = time
    }

    if (snare > snareThreshold && time - lastSnareTime >= SNARE_GAP) {
      const intensity = Math.min((snare / snareThreshold) * 0.4, 0.85)
      pattern.push({ duration: 20, delay: 10, intensity })
      lastSnareTime = time
    }

    if (hihat > hihatThreshold && time - lastHihatTime >= HIHAT_GAP) {
      const intensity = Math.min((hihat / hihatThreshold) * 0.3, 0.5)
      pattern.push({ duration: 10, delay: 20, intensity })
      lastHihatTime = time
    }

    if (pattern.length > 0) {
      timeline.push({ time, pattern })
    }

    history.subBass[histIdx % HISTORY] = subBass
    history.kick[histIdx % HISTORY] = kick
    history.snare[histIdx % HISTORY] = snare
    history.hihat[histIdx % HISTORY] = hihat
    histIdx++

    frameCount++
    if (frameCount % 500 === 0) {
      await yieldToMain()
    }
  }

  return { timeline, duration: decoded.duration }
}
