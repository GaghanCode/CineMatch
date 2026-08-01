"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import type { SeatLayout } from "@/Agent/types"

interface SeatMapProps {
  layout: SeatLayout
  onConfirm: (seatIds: string[]) => void
}

export function InteractiveSeatMap({ layout, onConfirm }: SeatMapProps) {
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [seatCount, setSeatCount] = useState(2)
  const [hasConfirmed, setHasConfirmed] = useState(false)

  const availableCount = useMemo(
    () => layout.rows.reduce((a, r) => a + r.seats.filter((s) => s.status === "available").length, 0),
    [layout],
  )

  const toggleSeat = (seatId: string) => {
    if (hasConfirmed) return
    setSelectedSeats((prev) => {
      const next = new Set(prev)
      if (next.has(seatId)) {
        next.delete(seatId)
      } else if (next.size < seatCount) {
        next.add(seatId)
      }
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedSeats.size === 0) return
    setHasConfirmed(true)
    onConfirm(Array.from(selectedSeats))
  }

  const screenWidth = Math.max(
    ...layout.rows.map((r) => r.seats.length),
    10,
  )
  const seatW = 30
  const seatGap = 4
  const rowLabelW = 20

  const minCols = screenWidth

  return (
    <div className="mt-3 rounded-xl border border-border bg-card/60 p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted">Seats to select</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={hasConfirmed}
            onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-surface text-xs text-secondary disabled:opacity-30"
          >
            -
          </button>
          <span className="min-w-[1.5ch] text-center text-sm font-medium text-primary">
            {seatCount}
          </span>
          <button
            type="button"
            disabled={hasConfirmed}
            onClick={() => setSeatCount(Math.min(availableCount, seatCount + 1))}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-surface text-xs text-secondary disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent/60" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-white/[0.07]" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-error/30" /> Blocked
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border border-accent bg-accent" /> Selected
        </span>
      </div>

      <div className="mb-4 flex justify-center">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ width: Math.min(screenWidth * (seatW + seatGap), 320) }}
        />
      </div>
      <p className="mb-4 text-center text-[10px] uppercase tracking-[0.2em] text-muted">
        Screen
      </p>

      {layout.categories.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {layout.categories.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-card border border-border px-2 py-0.5 text-[10px] text-muted"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        {layout.rows.map((row) => {
          const seats = row.seats
          return (
            <div
              key={row.row}
              className="mb-1.5 flex items-center gap-1"
            >
              <div
                className="flex-shrink-0 text-center text-[10px] font-medium text-muted"
                style={{ width: rowLabelW }}
              >
                {row.row}
              </div>

              <div className="flex items-center" style={{ gap: seatGap }}>
                {Array.from({ length: minCols }).map((_, ci) => {
                  const seat = seats.find((s) => s.column === ci)
                  if (!seat) {
                    return (
                      <div
                        key={`empty-${ci}`}
                        style={{ width: seatW, height: seatW }}
                      />
                    )
                  }

                  const isSelected = selectedSeats.has(seat.id)
                  const isAvailable = seat.status === "available"

                  let bg = ""
                  if (isSelected) bg = "border border-accent bg-accent"
                  else if (seat.status === "booked") bg = "bg-white/[0.07]"
                  else if (seat.status === "blocked") bg = "bg-error/30"
                  else bg = "bg-accent/60"

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={!isAvailable || hasConfirmed}
                      onClick={() => toggleSeat(seat.id)}
                      style={{ width: seatW, height: seatW }}
                      className={`flex items-center justify-center rounded-[3px] text-[9px] font-medium leading-none transition-all duration-150 ${
                        isAvailable && !isSelected
                          ? "hover:scale-110 hover:shadow-[0_0_8px_rgba(22,242,179,0.4)]"
                          : ""
                      } ${isAvailable && !hasConfirmed ? "cursor-pointer" : "cursor-default"} ${bg} ${
                        isSelected ? "text-background" : "text-muted"
                      }`}
                      title={`${seat.row}${seat.number}${seat.category ? " - " + seat.category : ""} (${seat.status})`}
                    >
                      {seat.number}
                    </button>
                  )
                })}
              </div>

              <div
                className="flex-shrink-0 text-center text-[10px] font-medium text-muted"
                style={{ width: rowLabelW }}
              >
                {row.row}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">
          {selectedSeats.size > 0
            ? `${selectedSeats.size} seat${selectedSeats.size > 1 ? "s" : ""} selected`
            : "Click available seats to select"}
        </span>
        <button
          type="button"
          disabled={selectedSeats.size === 0 || hasConfirmed}
          onClick={handleConfirm}
          className="rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-background shadow-glow transition-all hover:bg-accent/90 disabled:opacity-30 disabled:hover:bg-accent"
        >
          {hasConfirmed ? "Confirmed" : "Confirm"}
        </button>
      </div>
    </div>
  )
}

const demoRows = ["A", "B", "C", "D", "E", "F", "G", "H"]

export function SeatMap() {
  return (
    <div className="space-y-1.5">
      <div className="mx-auto mb-3 h-2 w-1/2 rounded-full bg-white/10" />
      {demoRows.map((row, ri) => (
        <div key={row} className="flex items-center gap-1.5 justify-center">
          <span className="w-4 text-right text-[10px] text-muted">{row}</span>
          {Array.from({ length: 10 }).map((_, si) => {
            const isSelected = row === "F" && (si === 7 || si === 8)
            const seatLabel = `${row}${si + 1}`
            return (
              <motion.div
                key={seatLabel}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: isSelected ? [1, 1.15, 1] : 1,
                }}
                transition={{
                  opacity: { duration: 0.3, delay: ri * 0.04 + si * 0.02 },
                  scale: isSelected
                    ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.3 },
                }}
                className={`h-4 w-4 rounded-[3px] text-[8px] flex items-center justify-center ${
                  isSelected
                    ? "bg-accent text-background font-medium"
                    : "bg-white/10 text-muted"
                }`}
              >
                {si + 1}
              </motion.div>
            )
          })}
          <span className="w-4 text-left text-[10px] text-muted">{row}</span>
        </div>
      ))}
    </div>
  )
}
