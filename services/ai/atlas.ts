import { z } from "zod"

export const BookingIntentSchema = z.object({
  movie: z.string().optional(),
  city: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  tickets: z.number().int().positive().optional(),
  budget: z.number().positive().optional(),
  screenType: z.string().optional(),
  language: z.string().optional(),
  theatrePreference: z.string().optional(),
  seatPreference: z.string().optional(),
  specialRequest: z.string().optional(),
  intentType: z.enum([
    "book",
    "recommend",
    "compare",
    "dateNight",
    "cheapest",
    "surprise",
  ]),
  missingFields: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

export type BookingIntent = z.infer<typeof BookingIntentSchema>

export const INTENT_LABELS: Record<BookingIntent["intentType"], string> = {
  book: "Book Tickets",
  recommend: "Get Recommendations",
  compare: "Compare Options",
  dateNight: "Date Night",
  cheapest: "Find Cheapest",
  surprise: "Surprise Me",
}

export interface AtlasResponse {
  intent: BookingIntent
  shouldAskUser: boolean
  question: string | null
  suggestions: string[] | null
  readyForBooking: boolean
}

const REQUIRED_FIELDS = ["movie", "city", "date", "time", "tickets"] as const

const INTENT_SYNONYMS: Record<string, string> = {
  booking: "book",
  book_movie: "book",
  reserve: "book",
  reservation: "book",
  purchase: "book",
  buy: "book",
  buyTickets: "book",
  bookTickets: "book",
  movie_booking: "book",
  ticket: "book",
  tickets: "book",
  recommend: "recommend",
  recommendation: "recommend",
  suggestions: "recommend",
  suggest: "recommend",
  compare: "compare",
  comparison: "compare",
  versus: "compare",
  vs: "compare",
  dateNight: "dateNight",
  date_night: "dateNight",
  date: "dateNight",
  romantic: "dateNight",
  cheapest: "cheapest",
  cheap: "cheapest",
  budget: "cheapest",
  affordable: "cheapest",
  lowest: "cheapest",
  surprise: "surprise",
  surpriseMe: "surprise",
  random: "surprise",
  anything: "surprise",
}

const VALID_INTENTS = ["book", "recommend", "compare", "dateNight", "cheapest", "surprise"]

const SYSTEM_PROMPT = `You are CineMatch, a premium AI movie booking assistant. You are helpful, concise, and polished.

RESPONSE RULES:
- Respond ONLY with valid JSON. No markdown. No explanations. No code fences.
- If a value is unknown or not mentioned, OMIT the property entirely.
- Never return null. Never return empty string.
- intentType MUST be exactly one of: book, recommend, compare, dateNight, cheapest, surprise
- confidence MUST always be a number between 0 and 1. Base it on how clearly the intent was expressed.
- readyForBooking: set to true ONLY when movie, city, date, time, and tickets are all known.
- question: if information is missing, generate a short, natural question asking ONLY for what's missing. Be conversational — vary your phrasing. If nothing is missing, set to null.
- For budget: extract the numeric value only. "₹1800" -> 1800, "under 500" -> 500.
- For tickets: "two tickets" -> 2, "a couple" -> 2, "three" -> 3.
- For dates: use relative keywords only — "today", "tomorrow", "day after tomorrow". Do NOT convert to calendar dates.
- Make smart assumptions: "tomorrow night" -> date=tomorrow, time=night. "date night" -> tickets=2. "best seats" -> seatPreference=premium. "cheapest" -> seatPreference=standard.
- Do NOT hallucinate. Only extract what is explicitly mentioned or clearly implied.`

function mergeIntents(
  existing: BookingIntent | undefined,
  update: Partial<BookingIntent>,
): BookingIntent {
  const merged = { ...(existing ?? {}), ...update }
  return merged as BookingIntent
}

function buildPrompt(text: string, currentIntent?: BookingIntent): string {
  if (!currentIntent) return text

  const parts: string[] = []
  const known: string[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = currentIntent[field as keyof BookingIntent]
    if (value) {
      known.push(`- ${field}: ${value}`)
    } else {
      known.push(`- ${field}: (not set)`)
    }
  }

  parts.push("Current booking state:")
  parts.push(...known)
  parts.push("")
  parts.push("The user just said:")
  parts.push(text)

  return parts.join("\n")
}

function normalizeBookingIntent(raw: Record<string, unknown>): BookingIntent {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue
    if (typeof value === "string" && value.trim() === "") continue
    clean[key] = value
  }

  const rawIntent = clean.intentType
  let intentType = "book"
  if (rawIntent) {
    const key = String(rawIntent).trim()
    const mapped = INTENT_SYNONYMS[key]
    intentType = mapped ?? (VALID_INTENTS.includes(key) ? key : "book")
  }

  const missingFields: string[] = []
  if (Array.isArray(clean.missingFields)) {
    for (const f of clean.missingFields) {
      if (typeof f === "string" && f.trim()) {
        missingFields.push(f.trim())
      }
    }
  }

  let confidence = 0
  if (typeof clean.confidence === "number" && isFinite(clean.confidence)) {
    confidence = Math.max(0, Math.min(1, clean.confidence))
  }

  const fields = [
    "movie", "city", "date", "time", "screenType",
    "language", "theatrePreference", "seatPreference", "specialRequest",
  ] as const

  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (typeof clean[field] === "string") {
      result[field] = (clean[field] as string).trim()
    }
  }

  if (typeof clean.tickets === "number" && Number.isInteger(clean.tickets) && clean.tickets > 0) {
    result.tickets = clean.tickets
  }
  if (typeof clean.budget === "number" && clean.budget > 0) {
    result.budget = clean.budget
  }

  return {
    ...result,
    intentType: intentType as BookingIntent["intentType"],
    missingFields,
    confidence,
  } as BookingIntent
}

function calculateMissingFields(intent: BookingIntent): string[] {
  const missing: string[] = []
  for (const field of REQUIRED_FIELDS) {
    const value = intent[field as keyof BookingIntent]
    if (!value) {
      missing.push(field)
    }
  }
  return missing
}

function generateSuggestions(missing: string[], intent: BookingIntent, text: string): string[] | null {
  if (missing.length === 0) return null

  const field = missing[0]

  switch (field) {
    case "city":
      return ["Bangalore", "Mumbai", "Delhi", "Hyderabad"]
    case "date":
      return ["Today", "Tomorrow", "This Weekend"]
    case "time": {
      const lower = text.toLowerCase()
      if (lower.includes("tomorrow night") || lower.includes("tonight") || lower.includes("this evening")) {
        return ["6–8 PM", "8–10 PM"]
      }
      if (lower.includes("night") || lower.includes("evening")) {
        return ["6–8 PM", "8–10 PM"]
      }
      if (lower.includes("morning")) {
        return ["8–10 AM", "10–12 PM"]
      }
      if (lower.includes("afternoon")) {
        return ["12–3 PM", "3–6 PM"]
      }
      return ["Morning", "Afternoon", "Evening", "Night"]
    }
    case "tickets":
      return ["1", "2", "3", "4", "5+"]
    case "screenType":
      return ["Standard", "IMAX", "3D", "4DX", "Dolby Cinema"]
    default:
      return null
  }
}

function generateQuestion(missing: string[], intent: BookingIntent, text: string): string | null {
  if (missing.length === 0) return null

  const knownCount = REQUIRED_FIELDS.filter((f) => intent[f as keyof BookingIntent]).length

  const questions: Record<string, string> = {
    movie: "Which movie are you planning to watch?",
    city: "Which city are you booking in?",
    date: "What date works best for you?",
    time: "What time would you prefer?",
    tickets: "How many tickets do you need?",
  }

  const field = missing[0]

  if (field === "time") {
    const lower = text.toLowerCase()
    if (lower.includes("night") || lower.includes("evening") || lower.includes("tonight")) {
      return "I noticed you mentioned an evening show. Would you like to go around 6–8 PM or later around 8–10 PM?"
    }
    if (lower.includes("morning")) {
      return "I gathered you'd like a morning show. Would you prefer 8–10 AM or 10–12 PM?"
    }
    if (lower.includes("afternoon")) {
      return "An afternoon show sounds nice! Would you prefer 12–3 PM or 3–6 PM?"
    }
  }

  const question = questions[field] || field

  const prefixes: Record<number, string> = {
    0: "I'd love to help you find the perfect movie.",
    1: "Great choice! I've noted that down.",
    2: "Lovely, we're making progress!",
    3: "Almost there — just a couple more details.",
    4: "Perfect! One last thing —",
  }

  const prefix = prefixes[knownCount] ?? ""

  if (missing.length === 1) {
    return `${prefix} ${question}`.trim()
  }

  const list = missing.slice(0, -1).map((f) => questions[f] || f).join(", ")
  const last = questions[missing[missing.length - 1]] || missing[missing.length - 1]

  if (knownCount === 0) {
    return `I'd love to help you find the perfect movie. To start, could you tell me ${list}, and ${last.toLowerCase()}?`
  }

  return `${prefix} I just need ${missing.length > 2 ? "a few more details" : "a couple more things"}: ${list}, and ${last.toLowerCase()}.`
}

export function generateReadyMessage(): string {
  return (
    "Perfect. I've gathered everything I need.\n\n" +
    "I'll now search nearby theatres, compare showtimes, prices and seat availability to recommend the best option for you."
  )
}

export async function analyzeIntent(
  text: string,
  currentIntent?: BookingIntent,
): Promise<AtlasResponse> {
  if (!process.env.OPENCODE_ZEN_API_KEY) {
    throw new Error("OPENCODE_ZEN_API_KEY is not set")
  }

  const userMessage = buildPrompt(text, currentIntent)

  const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENCODE_ZEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash-free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[atlas] API error:", response.status, errorText)
    throw new Error("I couldn't process that request. Please try again.")
  }

  const data = await response.json()
  const outputText = data?.choices?.[0]?.message?.content

  if (!outputText) {
    throw new Error("I didn't get a valid response. Please try again.")
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(outputText)
  } catch {
    console.error("[atlas] JSON parse error. Raw:", outputText)
    throw new Error("I couldn't fully understand that request. Could you try rephrasing it?")
  }

  const normalized = normalizeBookingIntent(parsed)
  const merged = mergeIntents(currentIntent, normalized)

  const result = BookingIntentSchema.safeParse(merged)
  if (!result.success) {
    console.error("[atlas] Zod validation failed. Parsed:", JSON.stringify(parsed))
    console.error("[atlas] Normalized:", JSON.stringify(normalized))
    console.error("[atlas] Zod errors:", result.error.format())
    throw new Error("I couldn't fully understand that request. Could you try rephrasing it?")
  }

  const intent = result.data
  const missing = calculateMissingFields(intent)
  intent.missingFields = missing
  const shouldAskUser = missing.length > 0
  const question = shouldAskUser ? generateQuestion(missing, intent, text) : null
  const suggestions = shouldAskUser ? generateSuggestions(missing, intent, text) : null

  return {
    intent,
    shouldAskUser,
    question,
    suggestions,
    readyForBooking: !shouldAskUser,
  }
}
