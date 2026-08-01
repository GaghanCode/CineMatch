"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, History, Ticket, Clock, MapPin, Trash2, Film } from "lucide-react"
import type { BookingRecord } from "@/services/history"

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function BookingCard({ booking }: { booking: BookingRecord }) {
  const seatText =
    booking.seats.length > 0 ? booking.seats.join(", ") : `${booking.ticketCount} seat(s)`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-border bg-surface/60 p-4 shadow-card backdrop-blur-2xl transition-colors duration-200 hover:border-border-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Film className="h-3.5 w-3.5 shrink-0 text-accent" />
            <h4 className="truncate text-[14px] font-semibold text-primary">{booking.movie}</h4>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">{booking.city} · {formatDate(booking.createdAt)}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/20 bg-accent/[0.06] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Payment pending
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
        <span className="flex items-center gap-1.5 text-[11px] text-secondary">
          <MapPin className="h-3 w-3 text-muted" />
          {booking.theatre}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-secondary">
          <Clock className="h-3 w-3 text-muted" />
          {booking.showtime}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-secondary">
          <Ticket className="h-3 w-3 text-muted" />
          {seatText}
        </span>
      </div>

      {booking.date && (
        <p className="mt-2 text-[10px] text-muted/70">Show date: {booking.date}</p>
      )}
    </motion.div>
  )
}

export function HistoryPanel({
  open,
  onClose,
  history,
  onClearHistory,
}: {
  open: boolean
  onClose: () => void
  history: BookingRecord[]
  onClearHistory: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-background/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-[70] flex w-full max-w-[400px] flex-col border-l border-border bg-surface/70 backdrop-blur-3xl"
          >
            <div className="flex items-center justify-between px-6 pt-7 pb-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.06]">
                  <History className="h-4 w-4 text-accent" />
                </span>
                <div className="flex flex-col">
                  <h2 className="text-[14px] font-bold tracking-wide text-primary">Booking History</h2>
                  <span className="text-[10px] tracking-[0.18em] text-muted uppercase">
                    {history.length} {history.length === 1 ? "booking" : "bookings"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted transition-colors duration-200 hover:border-error/30 hover:text-error"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted transition-colors duration-200 hover:bg-white/[0.03] hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              {history.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex h-full flex-col items-center justify-center gap-3 text-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-3xl border border-border bg-white/[0.03]">
                    <Ticket className="h-6 w-6 text-muted/50" />
                  </span>
                  <p className="text-sm font-medium text-secondary">No bookings yet</p>
                  <p className="max-w-[220px] text-xs leading-relaxed text-muted">
                    Your past bookings and recommendations will appear here.
                  </p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((booking, i) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                    >
                      <BookingCard booking={booking} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
