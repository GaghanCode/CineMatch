export interface BookingRecord {
  id: string
  movie: string
  city: string
  theatre: string
  showtime: string
  seats: string[]
  ticketCount: number
  date?: string
  createdAt: number
  status: "payment-pending" | "booked"
}

const STORAGE_KEY = "cinematch:booking-history"
const MAX_ENTRIES = 50

function safeParse(raw: string | null): BookingRecord[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadHistory(): BookingRecord[] {
  if (typeof window === "undefined") return []
  return safeParse(window.localStorage.getItem(STORAGE_KEY))
}

export function saveBooking(booking: Omit<BookingRecord, "id" | "createdAt">): BookingRecord[] {
  const record: BookingRecord = {
    ...booking,
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  }
  const history = [record, ...loadHistory()].slice(0, MAX_ENTRIES)
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }
  return history
}

export function clearHistory(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
