"use client"

import { motion } from "framer-motion"
import { ExecutionStep, type StepData } from "./ExecutionStep"

export function MissionExecutionTimeline({
  steps,
  compact,
}: {
  steps: StepData[]
  compact?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={compact ? "" : "flex h-full flex-col justify-center px-2"}
    >
      <div className={compact ? "space-y-2.5" : "space-y-4"}>
        {steps.map((step, i) => (
          <ExecutionStep key={step.id} step={step} index={i} compact={compact} isLast={i === steps.length - 1} />
        ))}
      </div>
    </motion.div>
  )
}
