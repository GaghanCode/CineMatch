"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mic, SendHorizonal } from "lucide-react"

export function WorkspaceInput({ onLaunch, initialValue = "" }: { onLaunch: () => void; initialValue?: string }) {
  const [value, setValue] = useState(initialValue)

  const handleSend = () => {
    if (value.trim()) {
      onLaunch()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-3 backdrop-blur-2xl transition-all duration-300 focus-within:border-accent/30 focus-within:bg-card shadow-card">
        <button
          className="group relative flex shrink-0 items-center justify-center"
          aria-label="Start recording"
        >
          <motion.span
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] transition-colors duration-300 group-hover:bg-white/[0.08]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="absolute inset-0 rounded-full border border-border group-hover:border-border-hover" />
            <motion.span
              className="absolute inset-0 rounded-full bg-white/[0.02]"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <Mic className="relative h-4 w-4 text-muted transition-colors duration-300 group-hover:text-primary" />
          </motion.span>
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CineMatch to plan your movie..."
          className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder-muted/50 outline-none"
        />

        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="group flex shrink-0 items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <motion.span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-background transition-all duration-200 shadow-glow"
            whileHover={value.trim() ? { scale: 1.05 } : {}}
            whileTap={value.trim() ? { scale: 0.95 } : {}}
          >
            <SendHorizonal className="h-3.5 w-3.5" />
          </motion.span>
        </button>
      </div>
    </motion.div>
  )
}
