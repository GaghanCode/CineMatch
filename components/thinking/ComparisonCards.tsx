"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

const theatres = [
  { name: "PVR Phoenix", price: "₹1,640", rating: 5, seats: "Excellent Seats", highlight: true },
  { name: "INOX", price: "₹1,480", rating: 3, seats: "Front Rows", highlight: false },
  { name: "Cinepolis", price: "₹1,760", rating: 4, seats: "Middle Seats", highlight: false },
]

export function ComparisonCards() {
  return (
    <div className="space-y-3">
      {theatres.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.15, ease: "easeOut" }}
          className={`rounded-xl border p-4 transition-all duration-500 shadow-card ${
            t.highlight
              ? "border-accent/20 bg-accent/[0.04]"
              : "border-border bg-card/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary">{t.name}</span>
            <span className="text-sm font-semibold text-primary">{t.price}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star
                  key={j}
                  className={`h-3 w-3 ${
                    j < t.rating ? "text-accent" : "text-muted/30"
                  }`}
                  fill={j < t.rating ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span className="text-xs text-muted">{t.seats}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
