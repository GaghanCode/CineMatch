"use client"

import { motion } from "framer-motion"
import { TheatreCard } from "./TheatreCard"
import { CheckCircle2 } from "lucide-react"
import type { TheatreRecommendation as TheatreRec } from "@/services/ai/theatres"

export function TheatreRecommendation({
  recommendation,
  onContinue,
  onSelectTheatre,
  disabled,
}: {
  recommendation: TheatreRec
  onContinue: () => void
  onSelectTheatre?: (id: string) => void
  disabled: boolean
}) {
  const { theatres, recommended } = recommendation

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 mb-1 pl-[44px]"
    >
      <TheatreCard theatre={recommended} recommended />

      <div className="mt-4 flex gap-2.5">
        {/* Non-clickable completion message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
          className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-dark px-5 py-3 text-xs font-medium text-background shadow-glow"
        >
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1 text-left">
            Seats are selected at <span className="font-semibold">PVR: Nexus (Formerly Forum), Koramangala</span> for <span className="font-semibold">05:50 PM</span>.
          </span>
          <span className="flex-shrink-0 opacity-80 text-[10px]">
            Open BookMyShow to complete payment
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}