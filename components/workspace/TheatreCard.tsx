"use client"

import { motion } from "framer-motion"
import { Star, MapPin, Clock, Languages, IndianRupee, Users } from "lucide-react"
import type { Theatre } from "@/services/ai/theatres"

export function TheatreCard({
  theatre,
  recommended,
  onSelect,
  compact,
  showtimesCount,
}: {
  theatre: Theatre
  recommended?: boolean
  onSelect?: (id: string) => void
  compact?: boolean
  showtimesCount?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-3xl border ${
        recommended
          ? "border-accent/25 bg-gradient-to-b from-accent/[0.05] to-transparent"
          : "border-border bg-surface/60"
      } p-5 backdrop-blur-2xl transition-all duration-200 hover:border-border-hover ${
        onSelect ? "cursor-pointer" : ""
      } shadow-card`}
      onClick={() => onSelect?.(theatre.id)}
      whileHover={onSelect ? { scale: 1.01, y: -1 } : {}}
      whileTap={onSelect ? { scale: 0.99 } : {}}
    >
      {recommended && (
        <div className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-accent to-accent-dark px-3 py-0.5 text-[10px] font-bold text-background shadow-glow">
          Best Pick
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-semibold text-primary truncate">
            {theatre.name}
          </h4>
          <p className="mt-1 text-[11px] text-muted truncate">
            {theatre.address || (theatre.distance ? `${theatre.distance} km` : "")}
          </p>
        </div>
        {theatre.rating > 0 && (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1">
            <Star className="h-3 w-3 text-accent" fill="currentColor" />
            <span className="text-xs font-semibold text-secondary">{theatre.rating}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {theatre.distance > 0 && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="text-[11px] text-muted">{theatre.distance} km</span>
          </div>
        )}
        {theatre.showtimes && theatre.showtimes.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="text-[11px] text-muted">{theatre.showtimes.slice(0, 3).join(", ")}{theatre.showtimes.length > 3 ? ` +${theatre.showtimes.length - 3}` : ""}</span>
          </div>
        ) : null}
        {theatre.languages && theatre.languages.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="text-[11px] text-muted">{theatre.languages.join(", ")}</span>
          </div>
        )}
        {theatre.seatAvailability && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="text-[11px] text-muted">{theatre.seatAvailability}</span>
          </div>
        )}
        {theatre.startingPrice > 0 && (
          <div className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="text-[11px] text-muted">{theatre.startingPrice}</span>
          </div>
        )}
        {compact && showtimesCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="text-[11px] text-muted">{showtimesCount} showtimes</span>
          </div>
        )}
      </div>

      {theatre.specialLabels && theatre.specialLabels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {theatre.specialLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-accent/20 bg-accent/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-accent"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
