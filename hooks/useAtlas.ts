"use client"

import { useState, useRef, useCallback } from "react"
import type { BookingIntent, AtlasResponse } from "@/services/ai/atlas"
import { generateReadyMessage } from "@/services/ai/atlas"
import type { TheatreRecommendation } from "@/services/ai/theatres"
import type { AgentResult } from "@/services/ai/theatres"
import { getTheatresForCity, getTheatresNearLocation, getBestTheatre } from "@/services/ai/theatres"
import { getUserLocation, type LocationResult } from "@/services/ai/location"
import { loadHistory, saveBooking, clearHistory, type BookingRecord } from "@/services/history"
import type { StepData } from "@/components/workspace/ExecutionStep"
import type { ButtonState } from "@/components/workspace/DynamicActionButton"

let messageIdCounter = 0
function nextId(): string {
  messageIdCounter += 1
  return `msg-${messageIdCounter}-${Date.now()}`
}

export interface Message {
  id: string
  role: "user" | "assistant"
  text: string
  suggestions?: string[]
  theatreRecommendation?: TheatreRecommendation
  agentResult?: AgentResult
  theatreList?: { index: number; name: string; price?: string; distance?: string }[]
  showtimeList?: { index: number; time: string }[]
  seatSelection?: { row: string; numbers: string[] }
  credentialsRequest?: { requestId: string }
  seatSelectRequest?: { requestId: string }
}

interface UseAtlasReturn {
  sendMessage: (text: string) => Promise<void>
  selectTheatre: (theatreId: string) => Promise<void>
  continueWithRecommendation: (theatreName: string) => Promise<void>
  executeMission: () => void
  respondToAgent: (text: string) => Promise<void>
  loading: boolean
  response: AtlasResponse | null
  error: string | null
  messages: Message[]
  currentIntent: BookingIntent | null
  readyForBooking: boolean
  locationStatus: "idle" | "detecting" | "granted" | "denied"
  missionStatus: "idle" | "running" | "completed"
  executionSteps: StepData[]
  buttonState: ButtonState
  buttonLabel: string
  pendingRequestId: string | null
  history: BookingRecord[]
  clearHistory: () => void
  clear: () => void
}

function buildExecutionSteps(intent: BookingIntent | null): StepData[] {
  const steps: StepData[] = [
    { id: "browser", label: "Launching browser", status: "pending" },
    { id: "open", label: "Opening BookMyShow", status: "pending" },
  ]

  if (intent?.city) {
    steps.push({ id: "city", label: `Setting city to ${intent.city}`, status: "pending" })
  }

  steps.push(
    { id: "search", label: `Searching "${intent?.movie || "showtimes"}"`, status: "pending" },
    { id: "theatres", label: "Finding theatre listing", status: "pending" },
    { id: "theatre-list", label: "Listing available theatres", status: "pending" },
    { id: "theatre-select", label: "Waiting for theatre selection", status: "pending" },
    { id: "showtime-extract", label: "Extracting showtimes", status: "pending" },
    { id: "showtime-select", label: "Waiting for showtime selection", status: "pending" },
    { id: "seat-select", label: "Selecting ticket count", status: "pending" },
    { id: "seat-select-user", label: "Waiting for your seat selection", status: "pending" },
    { id: "seat-verify", label: "Verifying seat selection", status: "pending" },
    { id: "payment", label: "Proceeding to payment", status: "pending" },
    { id: "ready", label: "Ready", status: "pending" },
  )

  return steps
}

const RUNNING_LABELS: Record<string, string> = {
  browser: "Launching browser...",
  open: "Opening BookMyShow...",
  city: "Setting city...",
  search: "Searching...",
  theatres: "Finding theatres...",
  "theatre-list": "Finding theatre listing...",
  "theatre-select": "Waiting for your selection...",
  "showtime-extract": "Extracting showtimes...",
  "showtime-select": "Waiting for showtime selection...",
  "seat-select": "Setting ticket count...",
  "seat-select-user": "Waiting for your seat selection...",
  "seat-verify": "Verifying seat selection...",
  payment: "Proceeding to payment...",
  ready: "Finalizing...",
}

export function useAtlas(): UseAtlasReturn {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AtlasResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentIntent, setCurrentIntent] = useState<BookingIntent | null>(null)
  const [readyForBooking, setReadyForBooking] = useState(false)
  const [locationStatus, setLocationStatus] = useState<"idle" | "detecting" | "granted" | "denied">("idle")
  const [missionStatus, setMissionStatus] = useState<"idle" | "running" | "completed">("idle")
  const [executionSteps, setExecutionSteps] = useState<StepData[]>([])
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [history, setHistory] = useState<BookingRecord[]>(() => loadHistory())
  const currentIntentRef = useRef<BookingIntent | null>(null)
  const sendingRef = useRef(false)
  const theatresShownRef = useRef(false)
  const readyForBookingRef = useRef(false)
  const locationRef = useRef<LocationResult | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const buttonState: ButtonState =
    missionStatus === "running"
      ? "running"
      : missionStatus === "completed"
        ? "completed"
        : readyForBooking
          ? "ready"
          : "collecting"

  const getButtonLabel = useCallback((): string => {
    if (missionStatus === "running") {
      const activeStep = executionSteps.find((s) => s.status === "active")
      if (activeStep) return RUNNING_LABELS[activeStep.id] ?? "Searching..."
      return "Searching..."
    }
    if (missionStatus === "completed") return "Recommendation Ready"
    if (readyForBooking) return "Search BookMyShow"
    return "Continue"
  }, [missionStatus, executionSteps, readyForBooking])

  const clearExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const executeMission = useCallback(() => {
    if (missionStatus !== "idle" || !readyForBookingRef.current) return

    const intent = currentIntentRef.current
    if (!intent?.movie || !intent?.city) return

    const steps = buildExecutionSteps(intent)
    setExecutionSteps(steps)
    setMissionStatus("running")

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const updateStepStatus = (id: string, status: StepData["status"], detail?: string) => {
      setExecutionSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, detail } : s)),
      )
    }

    const run = async () => {
      try {
        const res = await fetch("/api/agent/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movie: intent.movie,
            city: intent.city,
            date: intent.date,
            time: intent.time,
            tickets: intent.tickets,
            budget: intent.budget,
            screenType: intent.screenType,
            language: intent.language,
            lat: locationRef.current?.lat,
            lng: locationRef.current?.lng,
          }),
          signal: abortController.signal,
        })

        if (!res.ok) {
          throw new Error(`Agent request failed (${res.status})`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response stream")

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const payload = line.slice(6).trim()
            if (!payload) continue

            try {
              const event = JSON.parse(payload)

              switch (event.type) {
                case "step": {
                  const step = event.step as StepData
                  updateStepStatus(step.id, step.status, step.detail)
                  break
                }
                case "theatre-list": {
                  const tl = event as { type: "theatre-list"; requestId: string; theatres: { index: number; name: string; price?: string; distance?: string }[] }
                  setPendingRequestId(tl.requestId)
                  const theatreLines = tl.theatres
                    .map((t) => {
                      const details = [
                        t.price ? `from ${t.price}` : null,
                        t.distance ? `${t.distance} away` : null,
                      ].filter(Boolean).join(" · ")
                      return `${t.index}. ${t.name}${details ? ` — ${details}` : ""}`
                    })
                    .join("\n")
                  const msg: Message = {
                    id: nextId(),
                    role: "assistant",
                    text: `I found the following theatres. Please select one:\n\n${theatreLines}\n\n**Type the number of the theatre you prefer.**`,
                    theatreList: tl.theatres,
                  }
                  setMessages((prev) => [...prev, msg])
                  break
                }
                case "showtime-list": {
                  const sl = event as { type: "showtime-list"; requestId: string; theatre: string; showtimes: { index: number; time: string }[] }
                  setPendingRequestId(sl.requestId)
                  const showLines = sl.showtimes.map((st) => `${st.index}. ${st.time}`).join("\n")
                  const msg: Message = {
                    id: nextId(),
                    role: "assistant",
                    text: `Showtimes for **${sl.theatre}**:\n\n${showLines}\n\n**Type the number of the showtime you prefer.**`,
                    showtimeList: sl.showtimes,
                  }
                  setMessages((prev) => [...prev, msg])
                  break
                }
                case "seat-select-required": {
                  const sr = event as { type: "seat-select-required"; requestId: string }
                  setPendingRequestId(sr.requestId)
                  const msg: Message = {
                    id: nextId(),
                    role: "assistant",
                    text: "**Select your seats on the BookMyShow page** that just opened. Click **Done** here when you've finished selecting.",
                    seatSelectRequest: { requestId: sr.requestId },
                  }
                  setMessages((prev) => [...prev, msg])
                  break
                }
                case "credentials-required": {
                  const cr = event as { type: "credentials-required"; requestId: string }
                  setPendingRequestId(cr.requestId)
                  const msg: Message = {
                    id: nextId(),
                    role: "assistant",
                    text: "**Contact details required.** Please enter your email and phone number to proceed with the booking.",
                    credentialsRequest: { requestId: cr.requestId },
                  }
                  setMessages((prev) => [...prev, msg])
                  break
                }
                case "payment-ready": {
                  const msg: Message = {
                    id: nextId(),
                    role: "assistant",
                    text: "**Your seats are selected and the payment page is ready.** Please open the BookMyShow page to complete the payment.",
                  }
                  setMessages((prev) => [...prev, msg])
                  setMissionStatus("completed")
                  break
                }
                case "error": {
                  setExecutionSteps((prev) =>
                    prev.map((s) => ({ ...s, status: "pending" as const })),
                  )
                  const errMsg: Message = {
                    id: nextId(),
                    role: "assistant",
                    text: `**${event.message}**`,
                  }
                  setMessages((prev) => [...prev, errMsg])
                  setMissionStatus("completed")
                  setError(event.message)
                  break
                }
                case "complete": {
                  const result = event.result as AgentResult
                  setExecutionSteps((prev) =>
                    prev.map((s) => ({ ...s, status: "completed" as const })),
                  )

                    const agentTheatres = result.theatres || []
                    const theatres = agentTheatres.map((t, i) => ({
                      id: `agent-${i}`,
                      name: t.name,
                      distance: parseFloat(t.distance.replace(/[^0-9.]/g, "")) || 0,
                      rating: parseFloat(t.rating) || 0,
                      formats: t.formats,
                      startingPrice: t.priceStartsFrom ? parseInt(t.priceStartsFrom.replace(/[^0-9]/g, "")) || 0 : 0,
                      showtimesCount: t.showtimes.length,
                      address: `${t.distance}${t.distance ? " km" : ""}`,
                    }))

                  const recommended = theatres.find((_, i) => agentTheatres[i]?.recommended) || theatres[0]

                  if (theatres.length > 0) {
                    const recText =
                      result.reasoning ||
                      `I found **${theatres.length}** ${theatres.length === 1 ? "theatre" : "theatres"} showing **${result.movie}** in **${result.city}**.`

                    const recMsg: Message = {
                      id: nextId(),
                      role: "assistant",
                      text: recText,
                      theatreRecommendation: {
                        theatres,
                        recommended,
                      },
                      agentResult: result,
                    }
                    setMessages((prev) => [...prev, recMsg])
                  }

                  setMissionStatus("completed")
                  if (result.booking) {
                    setHistory(saveBooking({
                      movie: result.movie,
                      city: result.city,
                      theatre: result.booking.theatre,
                      showtime: result.booking.showtime,
                      seats: result.booking.seats,
                      ticketCount: result.booking.ticketCount,
                      date: result.booking.date,
                      status: "payment-pending",
                    }))
                  }
                  break
                }
              }
            } catch (e) {
              console.warn("[useAtlas] SSE parse warning:", e instanceof Error ? e.message : String(e), "payload:", payload)
            }
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) return
        const message = err instanceof Error ? err.message : "Mission failed"
        setError(message)
        setMissionStatus("completed")
        const errMsg: Message = {
          id: nextId(),
          role: "assistant",
          text: `Sorry, the search failed: ${message}`,
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        abortControllerRef.current = null
      }
    }

    run()
  }, [missionStatus])

  const doSend = useCallback(async (text: string, preloadedCity?: string) => {
    if (sendingRef.current) return
    sendingRef.current = true
    setLoading(true)
    setError(null)

    const userMsg: Message = { id: nextId(), role: "user", text }
    setMessages((prev) => [...prev, userMsg])

    try {
      let contextForApi = currentIntentRef.current
      if (preloadedCity) {
        contextForApi = { ...(contextForApi ?? {}), city: preloadedCity } as BookingIntent
      }

      const res = await fetch("/api/analyze-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          currentIntent: contextForApi ?? undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const atlasResponse = data as AtlasResponse
      currentIntentRef.current = atlasResponse.intent
      setCurrentIntent(atlasResponse.intent)
      setResponse(atlasResponse)
      setReadyForBooking(atlasResponse.readyForBooking)
      readyForBookingRef.current = atlasResponse.readyForBooking

      const assistantText =
        atlasResponse.question ??
        generateReadyMessage()

      const assistantMsg: Message = {
        id: nextId(),
        role: "assistant",
        text: assistantText,
        suggestions: atlasResponse.suggestions ?? undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])

      const city = atlasResponse.intent.city
      if (city && !theatresShownRef.current) {
        theatresShownRef.current = true
        const loc = locationRef.current
        const theatres =
          loc && loc.lat && loc.lng
            ? getTheatresNearLocation(loc.lat, loc.lng, city)
            : getTheatresForCity(city)
        if (theatres.length > 0) {
          const recommended = getBestTheatre(theatres)
          if (recommended) {
            const recMsg: Message = {
              id: nextId(),
              role: "assistant",
              text: `I found ${theatres.length} theatres near you in ${city}. Based on distance, ratings, and available formats, I recommend **${recommended.name}** at ${recommended.address} (${recommended.distance} km away, rated ${recommended.rating}). You can continue with my recommendation or browse all options.`,
              theatreRecommendation: { theatres, recommended },
            }
            setMessages((prev) => [...prev, recMsg])
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong"
      const errorMsg: Message = {
        id: nextId(),
        role: "assistant",
        text: `Sorry, I ran into an error: ${message}`,
      }
      setMessages((prev) => [...prev, errorMsg])
      setError(message)
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (sendingRef.current) return

    // Check if there's a pending agent request
    if (pendingRequestId) {
      const userMsg: Message = { id: nextId(), role: "user", text }
      setMessages((prev) => [...prev, userMsg])
      try {
        const res = await fetch("/api/agent/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: pendingRequestId, response: text }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Respond failed (${res.status})`)
        }
        setPendingRequestId(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong"
        const errorMsg: Message = {
          id: nextId(),
          role: "assistant",
          text: `Sorry, I couldn't process your response: ${message}`,
        }
        setMessages((prev) => [...prev, errorMsg])
        setError(message)
      }
      return
    }

    const needsCity = !currentIntentRef.current?.city && locationStatus === "idle"

    if (needsCity) {
      setLocationStatus("detecting")
      const loc = await getUserLocation()
      if (loc) {
        setLocationStatus("granted")
        locationRef.current = loc
        await doSend(text, loc.city)
        return
      }
      setLocationStatus("denied")
    }

    await doSend(text)
  }, [doSend, locationStatus, pendingRequestId])

  const respondToAgent = useCallback(async (text: string) => {
    if (!pendingRequestId) return
    const userMsg: Message = { id: nextId(), role: "user", text }
    setMessages((prev) => [...prev, userMsg])
    try {
      const res = await fetch("/api/agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: pendingRequestId, response: text }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Respond failed (${res.status})`)
      }
      setPendingRequestId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      const errorMsg: Message = {
        id: nextId(),
        role: "assistant",
        text: `Sorry, I couldn't process your response: ${message}`,
      }
      setMessages((prev) => [...prev, errorMsg])
      setError(message)
    }
  }, [pendingRequestId])

  const selectTheatre = useCallback(async (theatreId: string) => {
    if (sendingRef.current) return
    const intent = currentIntentRef.current
    const city = intent?.city
    if (!city) return

    const theatres = getTheatresForCity(city)
    const theatre = theatres.find((t) => t.id === theatreId)
    if (!theatre) return

    await doSend(theatre.name)
  }, [doSend])
  const continueWithRecommendation = useCallback(async (theatreName: string) => {
    if (sendingRef.current) return
    const userMsg: Message = { id: nextId(), role: "user", text: `Let's book at ${theatreName}` }
    setMessages((prev) => [...prev, userMsg])
    setReadyForBooking(true)
    readyForBookingRef.current = true
    executeMission()
  }, [executeMission])

  const handleClearHistory = useCallback(() => {
    clearHistory()
    setHistory([])
  }, [])

  const clear = useCallback(() => {
    clearExecution()
    setResponse(null)
    setError(null)
    setMessages([])
    setCurrentIntent(null)
    setReadyForBooking(false)
    readyForBookingRef.current = false
    setLocationStatus("idle")
    setMissionStatus("idle")
    setExecutionSteps([])
    setPendingRequestId(null)
    currentIntentRef.current = null
    sendingRef.current = false
    theatresShownRef.current = false
  }, [clearExecution])

  return {
    sendMessage,
    selectTheatre,
    continueWithRecommendation,
    executeMission,
    respondToAgent,
    loading,
    response,
    error,
    messages,
    currentIntent,
    readyForBooking,
    locationStatus,
    missionStatus,
    executionSteps,
    buttonState,
    buttonLabel: getButtonLabel(),
    pendingRequestId,
    history,
    clearHistory: handleClearHistory,
    clear,
  }
}
