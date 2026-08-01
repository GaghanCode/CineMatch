"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2, Rocket } from "lucide-react"

export type ButtonState = "collecting" | "ready" | "running" | "completed"

export function DynamicActionButton({
  state,
  currentLabel,
  onAction,
  disabled,
}: {
  state: ButtonState
  currentLabel?: string
  onAction: () => void
  disabled: boolean
}) {
  const labels: Record<ButtonState, string> = {
    collecting: "Continue",
    ready: "Search BookMyShow",
    running: currentLabel ?? "Searching...",
    completed: "Recommendation Ready",
  }

  const label = labels[state]

  const baseClasses =
    "shrink-0 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-0 disabled:pointer-events-none flex items-center gap-2"

  const stateClasses: Record<ButtonState, string> = {
    collecting:
      "border border-border bg-surface/60 text-muted backdrop-blur-xl",
    ready:
      "bg-gradient-to-r from-accent to-accent-dark text-background shadow-glow hover:shadow-glow-secondary cursor-pointer",
    running:
      "bg-gradient-to-r from-accent to-accent-dark text-background cursor-pointer",
    completed:
      "border border-success/25 bg-success/[0.12] text-success cursor-pointer",
  }

  return (
    <motion.button
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={onAction}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses[state]}`}
      whileHover={!disabled && state !== "collecting" ? { scale: 1.02 } : {}}
      whileTap={!disabled && state !== "collecting" ? { scale: 0.98 } : {}}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center gap-2"
        >
          {state === "running" && (
            <motion.span
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.span>
          )}
          {state === "ready" && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Rocket className="h-4 w-4" />
            </motion.span>
          )}
          {state === "completed" && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </motion.span>
          )}
          <span>{label}</span>
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}
