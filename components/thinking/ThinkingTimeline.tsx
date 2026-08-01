"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

const stages = [
  "Understanding",
  "Planning",
  "Comparing",
  "Reasoning",
  "Seat Selection",
  "Mission Ready",
]

export function ThinkingTimeline({ currentStage }: { currentStage: number }) {
  return (
    <div className="space-y-0">
      {stages.map((label, i) => {
        const isDone = i < currentStage
        const isCurrent = i === currentStage
        return (
          <div key={label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                animate={
                  isCurrent
                    ? { scale: [1, 1.3, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0, ease: "easeInOut" }}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isDone
                    ? "border-accent bg-accent/20"
                    : isCurrent
                      ? "border-accent/60 bg-accent/10"
                      : "border-border bg-transparent"
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3 text-accent" />
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isCurrent ? "bg-accent" : "bg-muted/40"
                    }`}
                  />
                )}
              </motion.div>
              {i < stages.length - 1 && (
                <div
                  className={`mt-0.5 h-8 w-px ${
                    isDone ? "bg-accent/30" : "bg-border"
                  }`}
                />
              )}
            </div>
            <span
              className={`pt-0.5 text-xs ${
                isDone
                  ? "text-accent"
                  : isCurrent
                    ? "text-primary"
                    : "text-muted"
              }`}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
