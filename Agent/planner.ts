import type { AgentStep, AgentInput, SeatLayout } from "./types"

export type StepEmitter = (
  event:
    | { type: "step"; step: AgentStep }
    | { type: "error"; message: string }
    | { type: "complete"; result: unknown }
    | { type: "theatre-list"; requestId: string; theatres: { index: number; name: string; price?: string; distance?: string }[] }
    | { type: "showtime-list"; requestId: string; theatre: string; showtimes: { index: number; time: string }[] }
    | { type: "seat-layout"; requestId: string; layout: SeatLayout }
    | { type: "seat-select-required"; requestId: string }
    | { type: "payment-ready" }
    | { type: "credentials-required"; requestId: string }
) => void

export function buildExecutionSteps(input: AgentInput): AgentStep[] {
  return [
    { id: "browser", label: "Launching browser", status: "pending" },
    { id: "open", label: "Opening BookMyShow", status: "pending" },
    { id: "city", label: `Setting city to ${input.city}`, status: "pending" },
    { id: "search", label: `Searching ${input.movie}`, status: "pending" },
    { id: "theatres", label: "Finding theatre listing", status: "pending" },
    { id: "theatre-list", label: "Listing available theatres", status: "pending" },
    { id: "theatre-select", label: "Waiting for theatre selection", status: "pending" },
    { id: "showtime-extract", label: "Extracting showtimes", status: "pending" },
    { id: "showtime-select", label: "Waiting for showtime selection", status: "pending" },
    { id: "seat-select", label: "Extracting seat layout", status: "pending" },
    { id: "seat-select-user", label: "Waiting for your seat selection", status: "pending" },
    { id: "seat-verify", label: "Verifying seat selection", status: "pending" },
    { id: "payment", label: "Proceeding to payment", status: "pending" },
    { id: "ready", label: "Ready", status: "pending" },
  ]
}

export function updateStep(steps: AgentStep[], id: string, updates: Partial<AgentStep>): AgentStep[] {
  return steps.map((s) => (s.id === id ? { ...s, ...updates } : s))
}

export function emitStep(emit: StepEmitter, step: AgentStep): void {
  emit({ type: "step", step })
}

export function emitError(emit: StepEmitter, message: string): void {
  emit({ type: "error", message })
}

export function emitComplete(emit: StepEmitter, result: unknown): void {
  emit({ type: "complete", result })
}
