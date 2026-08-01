"use client"

import { motion } from "framer-motion"
import { AnimatedStatus, type StepStatus } from "./AnimatedStatus"

export interface StepData {
  id: string
  label: string
  status: StepStatus
  detail?: string
}

export function ExecutionStep({
  step,
  index,
  compact,
  isLast,
}: {
  step: StepData
  index: number
  compact?: boolean
  isLast?: boolean
}) {
  const isDimmed = step.status === "pending"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-stretch gap-3.5 transition-all duration-500 ${
        isDimmed ? "opacity-35" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center">
        <AnimatedStatus status={step.status} />
        {!isLast && (
          <div
            className={`mt-1.5 w-px flex-1 min-h-[14px] rounded-full transition-colors duration-500 ${
              step.status === "completed"
                ? "bg-gradient-to-b from-accent/50 to-accent/20"
                : step.status === "active"
                  ? "bg-gradient-to-b from-accent/40 to-accent/10"
                  : "bg-white/[0.06]"
            }`}
          />
        )}
      </div>
      <div className={`flex-1 ${compact ? "pb-3" : "pb-4"}`}>
        <p
          className={`${
            compact ? "text-xs" : "text-sm"
          } font-medium leading-snug transition-all duration-500 ${
            step.status === "active"
              ? "text-primary"
              : step.status === "completed"
                ? "text-secondary"
                : "text-muted"
          }`}
        >
          {step.label}
          {step.detail && (
            <span className="mt-0.5 block text-[11px] font-normal text-muted">
              {step.detail}
            </span>
          )}
        </p>
      </div>
    </motion.div>
  )
}
