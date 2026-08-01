"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"

export function WorkspaceHeader({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-between px-2 pb-5"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to home"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/60 text-muted backdrop-blur-xl transition-all duration-200 hover:border-accent/25 hover:text-secondary hover:shadow-glow"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="h-3 w-px bg-border" />
        <span className="text-[10px] font-medium tracking-wider text-muted uppercase">
          Workspace
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="text-xs text-muted">New Booking</span>
      </div>

      <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-3.5 py-1.5 backdrop-blur-xl">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-[11px] font-semibold tracking-wide text-accent">
          AGENT ACTIVE
        </span>
      </div>
    </motion.div>
  )
}
