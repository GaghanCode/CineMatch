"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

export type StepStatus = "pending" | "active" | "completed"

export function AnimatedStatus({ status }: { status: StepStatus }) {
  if (status === "completed") {
    return (
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 border border-accent/30"
        style={{ boxShadow: "0 0 14px rgba(229,9,20,0.18)" }}
      >
        <Check className="h-3 w-3 text-accent" strokeWidth={3} />
      </motion.span>
    )
  }

  if (status === "active") {
    return (
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <motion.span
          animate={{ scale: [1, 2.1, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full border border-accent/40"
        />
        <motion.span
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="h-2.5 w-2.5 rounded-full bg-accent"
          style={{ boxShadow: "0 0 12px rgba(229,9,20,0.55)" }}
        />
      </span>
    )
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full bg-muted/30" />
    </span>
  )
}
