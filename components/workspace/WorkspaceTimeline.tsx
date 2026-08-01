"use client"

import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"

const missions = [
  { id: "#1042", title: "Book Deadpool", status: "Completed" },
  { id: "#1041", title: "Find cheapest IMAX", status: "Completed" },
  { id: "#1040", title: "Book F1", status: "Completed" },
]

export function WorkspaceTimeline() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
    >
      <h3 className="text-[10px] font-medium tracking-wider text-muted uppercase">
        Recent Missions
      </h3>
      <div className="space-y-0.5">
        {missions.map((mission, i) => (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.25 + i * 0.08, ease: "easeOut" }}
            className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition-all duration-200 hover:border-border hover:bg-card/40"
          >
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-muted/60 shrink-0">{mission.id}</span>
                <span className="truncate text-xs text-muted">{mission.title}</span>
              </div>
              <span className="shrink-0 text-[10px] text-accent">{mission.status}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
