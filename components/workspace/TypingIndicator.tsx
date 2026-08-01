"use client"

import { motion } from "framer-motion"

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-accent-dark/10 border border-accent/20">
          <span className="text-[13px] font-bold text-accent">C</span>
        </span>
        <div className="glass-panel flex items-center gap-3 rounded-3xl rounded-bl-md px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
                className="h-2 w-2 rounded-full bg-accent"
                style={{ boxShadow: i === 1 ? "0 0 8px rgba(229,9,20,0.45)" : undefined }}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted">CineMatch is thinking</span>
        </div>
      </div>
    </div>
  )
}
