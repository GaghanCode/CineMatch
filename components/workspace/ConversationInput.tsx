"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { SendHorizonal, Mic, MicOff } from "lucide-react"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"

export function ConversationInput({
  onSend,
  loading,
}: {
  onSend: (text: string) => void
  loading: boolean
}) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevListeningRef = useRef(false)
  const { startListening, stopListening, transcript, isListening, error, isSupported } =
    useSpeechRecognition()

  // Persist transcript when user stops listening
  useEffect(() => {
    if (prevListeningRef.current && !isListening && transcript.trim()) {
      setValue(transcript.trim())
    }
    prevListeningRef.current = isListening
  }, [isListening, transcript])

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus()
    }
  }, [loading])

  const handleSend = () => {
    if (value.trim() && !loading) {
      onSend(value.trim())
      setValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMic = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const adjustHeight = () => {
    const el = inputRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  // Show transcript while listening, otherwise show value
  const displayValue = isListening && transcript ? transcript : value

  return (
    <div className="group relative flex items-end gap-2.5">
      <div className="relative flex-1">
        <div className="absolute -inset-px rounded-[22px] opacity-40 transition-opacity duration-300 group-focus-within:opacity-100"
          style={{
            background: "linear-gradient(135deg, rgba(229,9,20,0.32), rgba(178,7,16,0.32))",
          }}
        />
        <div className="relative flex items-end rounded-3xl border border-border bg-card/90 px-4 py-3 backdrop-blur-2xl transition-all duration-200 focus-within:bg-card shadow-card">
          <textarea
            ref={inputRef}
            value={displayValue}
            onChange={(e) => {
              if (!isListening) setValue(e.target.value)
              adjustHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              loading
                ? "Waiting for CineMatch..."
                : isListening
                  ? "Listening..."
                  : error === "not-supported"
                    ? "Voice input not supported in this browser"
                    : error
                      ? `Voice unavailable (${error})`
                      : "Type or speak your reply..."
            }
            rows={1}
            disabled={loading}
            className="min-h-[22px] max-h-[120px] flex-1 resize-none bg-transparent text-sm text-primary placeholder-muted/50 outline-none disabled:opacity-35 pr-12"
          />
          {/* Mic button inside textarea */}
          <button
            onClick={handleMic}
            disabled={loading || !isSupported}
            className="absolute right-3 top-1/2 -translate-y-1/2 group/mic flex items-center justify-center transition-colors duration-200"
            aria-label={isListening ? "Stop recording" : "Start recording"}
          >
            <motion.span
              className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] transition-colors duration-200 group-hover/mic:bg-white/[0.08]"
              whileHover={!loading && isSupported ? { scale: 1.05 } : {}}
              whileTap={!loading && isSupported ? { scale: 0.95 } : {}}
            >
              {isListening && (
                <motion.span
                  className="absolute inset-0 rounded-xl bg-accent/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <Mic
                className={`h-4 w-4 transition-colors duration-200 ${
                  isListening
                    ? "text-accent"
                    : error === "not-supported"
                      ? "text-muted/30"
                      : "text-muted group-hover/mic:text-primary"
                }`}
              />
              {!isListening && error === "not-supported" && (
                <MicOff className="absolute h-4 w-4 text-muted/30" />
              )}
            </motion.span>
          </button>
        </div>
      </div>

      <button
        onClick={handleSend}
        disabled={!displayValue.trim() || loading}
        className="group flex shrink-0 items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <motion.span
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-dark text-background transition-all duration-300 shadow-glow"
          whileHover={displayValue.trim() && !loading ? { scale: 1.05 } : {}}
          whileTap={displayValue.trim() && !loading ? { scale: 0.95 } : {}}
        >
          <SendHorizonal className="h-4 w-4" />
        </motion.span>
      </button>
    </div>
  )
}