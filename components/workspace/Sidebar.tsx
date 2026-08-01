"use client"

import { motion } from "framer-motion"
import { PlusCircle, History, Radar, Command } from "lucide-react"

export function Sidebar({
  onNewBooking,
  onHistory,
  historyActive,
  missionStatus,
  activeLabel,
}: {
  onNewBooking: () => void
  onHistory: () => void
  historyActive: boolean
  missionStatus: "idle" | "running" | "completed"
  activeLabel: string | null
}) {
  const agentOnline = missionStatus !== "idle"

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex w-[264px] shrink-0 flex-col border-r border-border bg-surface/30 backdrop-blur-2xl"
    >
      <div className="flex items-center gap-3 px-7 pt-8 pb-7">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-accent-dark/10 border border-accent/25">
          <motion.span
            className="absolute inset-0 rounded-2xl border border-accent/40"
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-base font-bold text-accent">C</span>
        </span>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold tracking-[0.08em] text-primary">CineMatch</span>
          <span className="text-[10px] tracking-[0.22em] text-muted uppercase">Agent OS</span>
        </div>
      </div>

      <div className="mx-7 mb-6 rounded-2xl glass-panel p-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {agentOnline && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${agentOnline ? "bg-accent" : "bg-muted/50"}`} />
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-secondary">
            AI Agent {agentOnline ? "Active" : "Online"}
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          {agentOnline ? "Autonomously handling your booking flow." : "Ready to take your next booking."}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewBooking}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-accent to-accent-dark px-4 py-3 text-[13px] font-semibold text-background shadow-glow transition-all duration-300 hover:shadow-glow-secondary"
        >
          <PlusCircle className="h-4 w-4" />
          New Booking
        </motion.button>

        <button
          type="button"
          onClick={onHistory}
          className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
            historyActive
              ? "bg-white/[0.04] text-accent"
              : "text-muted hover:bg-white/[0.03] hover:text-secondary"
          }`}
        >
          <History className="h-4 w-4" />
          History
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium text-muted transition-all duration-200 hover:bg-white/[0.03] hover:text-secondary"
        >
          <Radar className="h-4 w-4" />
          Active Mission
          <span className={`ml-auto h-1.5 w-1.5 rounded-full ${missionStatus === "running" ? "bg-accent animate-pulse" : missionStatus === "completed" ? "bg-success" : "bg-muted/40"}`} />
        </button>
      </nav>

      <div className="mx-4 mb-5 mt-4 rounded-2xl border border-border bg-black/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Command className="h-3 w-3 text-muted" />
          <span className="text-[10px] font-medium tracking-wide text-muted">
            {missionStatus === "running" && activeLabel
              ? activeLabel
              : missionStatus === "completed"
                ? "Mission completed"
                : "Awaiting command"}
          </span>
        </div>
      </div>

      <div className="px-7 pb-6">
        <p className="text-[10px] text-muted/60">CineMatch OS · v0.1.0</p>
      </div>
    </motion.aside>
  )
}
