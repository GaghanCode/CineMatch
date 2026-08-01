"use client"

import { motion } from "framer-motion"

export function MessageBubble({
  role,
  text,
}: {
  role: "user" | "assistant"
  text: string
}) {
  const isUser = role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <span className="mr-3 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-accent-dark/10 border border-accent/20">
          <span className="text-[13px] font-bold text-accent">C</span>
        </span>
      )}

      <div
        className={`max-w-[82%] ${
          isUser
            ? "rounded-3xl rounded-br-md bg-gradient-to-br from-accent to-accent-dark px-5 py-3 text-background shadow-glow"
            : "glass-panel rounded-3xl rounded-bl-md px-5 py-3.5 shadow-card"
        }`}
      >
        <p
          className={`whitespace-pre-wrap ${
            isUser
              ? "text-sm font-semibold leading-[1.6] tracking-tight"
              : "text-sm leading-[1.75] tracking-normal text-secondary"
          }`}
        >
          {text}
        </p>
      </div>
    </motion.div>
  )
}
