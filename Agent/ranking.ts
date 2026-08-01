import type { AgentTheatre, AgentInput } from "./types"

interface RankedTheatre extends AgentTheatre {
  score: number
}

function parsePrice(price: string): number {
  const digits = price.replace(/[^0-9]/g, "")
  return digits ? parseInt(digits, 10) : 99999
}

function parseDistance(dist: string): number {
  const digits = dist.replace(/[^0-9.]/g, "")
  return digits ? parseFloat(digits) : 99
}

function hasFormat(theatre: AgentTheatre, preferred: string): boolean {
  return theatre.formats.some((f) => f.toLowerCase().includes(preferred.toLowerCase()))
}

function scoreTheatre(theatre: AgentTheatre, input: AgentInput): number {
  let score = 0

  const timePref = input.time || (input.date ? extractTimeFromDate(input.date) : undefined)
  if (timePref) {
    score += theatre.showtimes.length * 5
  }

  const distance = parseDistance(theatre.distance)
  score += Math.max(0, 20 - distance) * 2

  if (theatre.rating) {
    const rating = parseFloat(theatre.rating)
    if (!isNaN(rating)) score += rating * 5
  }

  score += theatre.formats.length * 3

  if (input.screenType && hasFormat(theatre, input.screenType)) {
    score += 10
  }

  const price = parsePrice(theatre.priceStartsFrom)
  if (input.budget && price > 0 && price <= input.budget) {
    score += 8
  } else if (price > 0) {
    score += Math.max(0, 15 - price / 100) * 2
  }

  score += theatre.showtimes.length * 1.5

  if (theatre.specialLabels.some((l) => /fast\s*filling|almost\s*full|limited/i.test(l))) {
    score += 4
  }

  if (theatre.seatAvailability && !/sold\s*out|housefull/i.test(theatre.seatAvailability)) {
    score += 2
  }

  const lang = input.language
  if (lang && theatre.languages.some((l) => l.toLowerCase().includes(lang.toLowerCase()))) {
    score += 5
  }

  return score
}

function extractTimeFromDate(dateStr: string): string | undefined {
  const lower = dateStr.toLowerCase()
  for (const t of ["morning", "afternoon", "evening", "night"]) {
    if (lower.includes(t)) return t
  }
  return undefined
}

export function rankTheatres(theatres: AgentTheatre[], input: AgentInput): RankedTheatre[] {
  return theatres
    .map((t) => ({
      ...t,
      score: scoreTheatre(t, input),
    }))
    .sort((a, b) => {
      if (Math.abs(a.score - b.score) > 5) return b.score - a.score
      const aDist = parseDistance(a.distance)
      const bDist = parseDistance(b.distance)
      if (aDist !== bDist) return aDist - bDist
      if (a.seatAvailability && b.seatAvailability) {
        const aSold = /sold\s*out|housefull/i.test(a.seatAvailability) ? 1 : 0
        const bSold = /sold\s*out|housefull/i.test(b.seatAvailability) ? 1 : 0
        if (aSold !== bSold) return aSold - bSold
      }
      const aRating = parseFloat(a.rating) || 0
      const bRating = parseFloat(b.rating) || 0
      return bRating - aRating
    })
    .map((t, i) => ({ ...t, recommended: i === 0 }))
}

export function generateReasoning(ranked: RankedTheatre[], input: AgentInput): string {
  if (ranked.length === 0) {
    return "No theatres found for your search."
  }

  const best = ranked[0]
  const total = ranked.length
  const parts: string[] = [`I found **${total}** ${total === 1 ? "theatre" : "theatres"} showing **${input.movie}** in **${input.city}**`]

  const timePref = input.time || (input.date ? input.date.match(/\b(morning|afternoon|evening|night)\b/i)?.[1] : undefined)
  if (timePref) {
    parts.push(`with **${best.showtimes.length}** showtimes in the ${timePref} time slot`)
  }

  if (best.distance) {
    const d = parseDistance(best.distance)
    if (d > 0 && d < 5) {
      parts.push(`it's just ${best.distance} away`)
    }
  }

  if (best.rating) {
    parts.push(`rated **${best.rating}**`)
  }

  if (best.formats.length > 0) {
    parts.push(`offers **${best.formats.join(", ")}**`)
  }

  if (best.priceStartsFrom) {
    parts.push(`starting from **${best.priceStartsFrom}**`)
  }

  if (best.showtimes.length > 0) {
    parts.push(`with ${best.showtimes.length} showtimes`)
  }

  const reasoning = `Based on distance, available formats, pricing, and showtimes, I recommend **${best.name}**.`
  parts.push(reasoning)

  if (ranked.length > 1) {
    const second = ranked[1]
    const comparisons: string[] = []
    if (parseDistance(second.distance) > parseDistance(best.distance)) {
      comparisons.push("closest")
    }
    if (hasFormat(best, "imax") && !hasFormat(second, "imax")) {
      comparisons.push("IMAX available")
    }
    if (second.priceStartsFrom && best.priceStartsFrom) {
      if (parsePrice(best.priceStartsFrom) < parsePrice(second.priceStartsFrom)) {
        comparisons.push("better priced")
      }
    }
    if (comparisons.length > 0) {
      parts.push(`It's the ${comparisons.join(", ")} option.`)
    }
  }

  return parts.join(". ") + "."
}
