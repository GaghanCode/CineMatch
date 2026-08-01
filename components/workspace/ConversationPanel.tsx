"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { MessageBubble } from "./MessageBubble"
import { SuggestionChips } from "./SuggestionChips"
import { TheatreRecommendation } from "./TheatreRecommendation"
import { TypingIndicator } from "./TypingIndicator"
import { CredentialsForm } from "./CredentialsForm"
import type { Message } from "@/hooks/useAtlas"

export function ConversationPanel({
  messages,
  loading,
  onSuggestionSelect,
  onContinueTheatre,
  onSelectTheatre,
  onSeatConfirm,
  onCredentialsConfirm,
}: {
  messages: Message[]
  loading: boolean
  onSuggestionSelect: (value: string) => void
  onContinueTheatre: () => void
  onSelectTheatre: (id: string) => void
  onSeatConfirm: () => void
  onCredentialsConfirm: (email: string, phone: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    })
  }, [messages, loading])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex h-full flex-col"
    >
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/15 to-accent-dark/10 border border-accent/20">
                <motion.span
                  className="absolute inset-0 rounded-3xl border border-accent/30"
                  animate={{ opacity: [0.2, 0.8, 0.2] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="text-xl font-bold text-accent">C</span>
              </span>
              <div>
                <p className="text-sm font-medium text-secondary">CineMatch is listening</p>
                <p className="mt-1 text-xs text-muted">Describe your movie booking below</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <MessageBubble role={msg.role} text={msg.text} />
            {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
              <SuggestionChips
                suggestions={msg.suggestions}
                onSelect={onSuggestionSelect}
                disabled={loading}
              />
            )}
            {msg.role === "assistant" && msg.theatreRecommendation && (
              <TheatreRecommendation
                recommendation={msg.theatreRecommendation}
                onContinue={onContinueTheatre}
                onSelectTheatre={onSelectTheatre}
                disabled={loading}
              />
            )}
            {msg.role === "assistant" && msg.seatSelectRequest && (
              <div className="mt-4 pl-14">
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSeatConfirm()}
                  disabled={loading}
                  className="rounded-full bg-gradient-to-r from-accent to-accent-dark px-6 py-2.5 text-sm font-semibold text-background shadow-glow transition-all duration-200 hover:shadow-glow-secondary disabled:opacity-40"
                >
                  Done — Continue
                </motion.button>
              </div>
            )}
            {msg.role === "assistant" && msg.credentialsRequest && (
              <CredentialsForm
                onConfirm={onCredentialsConfirm}
                disabled={loading}
              />
            )}
          </motion.div>
        ))}

        {loading && <TypingIndicator />}
      </div>
    </motion.div>
  )
}
