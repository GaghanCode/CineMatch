"use client"

import { motion } from "framer-motion"

export function SuggestionChips({
  suggestions,
  onSelect,
  disabled,
}: {
  suggestions: string[]
  onSelect: (value: string) => void
  disabled: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-wrap gap-2 pl-[44px] mt-2"
    >
      {suggestions.map((suggestion, i) => (
        <motion.button
          key={`${suggestion}-${i}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15, delay: i * 0.03, ease: "easeOut" }}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-secondary backdrop-blur-xl transition-all duration-200 hover:border-accent/30 hover:bg-surface hover:text-primary hover:shadow-glow active:scale-[0.95] disabled:opacity-30 disabled:pointer-events-none"
          whileHover={!disabled ? { scale: 1.04 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  )
}
