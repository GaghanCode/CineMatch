"use client"

import { motion } from "framer-motion"

const text = "I selected PVR Phoenix because it provides better centre seats while staying within your budget."

export function ReasoningCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm leading-relaxed text-secondary">
        {text.split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.03, delay: i * 0.025, ease: "easeOut" }}
          >
            {char}
          </motion.span>
        ))}
      </p>
    </div>
  )
}
