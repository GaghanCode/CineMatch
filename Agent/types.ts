export interface AgentTheatre {
  name: string
  distance: string
  rating: string
  formats: string[]
  showtimes: string[]
  priceStartsFrom: string
  languages: string[]
  seatAvailability: string
  recommended: boolean
  specialLabels: string[]
}

export interface AgentResult {
  movie: string
  city: string
  theatres: AgentTheatre[]
  reasoning: string
  booking?: {
    theatre: string
    showtime: string
    seats: string[]
    ticketCount: number
    date?: string
  }
}

export interface AgentStep {
  id: string
  label: string
  status: "pending" | "active" | "completed" | "error"
  detail?: string
}

export type AgentEvent =
  | { type: "step"; step: AgentStep }
  | { type: "error"; message: string }
  | { type: "complete"; result: AgentResult }
  | { type: "seat-layout"; requestId: string; layout: SeatLayout }
  | { type: "seat-select-required"; requestId: string }
  | { type: "payment-ready" }
  | { type: "credentials-required"; requestId: string }

export interface AgentInput {
  movie: string
  city: string
  date?: string
  time?: string
  tickets?: number
  budget?: number
  screenType?: string
  language?: string
  email?: string
  phone?: string
  lat?: number
  lng?: number
}

export interface SeatInfo {
  id: string
  row: string
  number: number
  status: "available" | "booked" | "blocked"
  category?: string
  column: number
}

export interface SeatLayout {
  rows: { row: string; seats: SeatInfo[] }[]
  categories: string[]
}
