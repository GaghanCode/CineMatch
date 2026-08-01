"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Mic, SendHorizonal } from "lucide-react"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"

export interface CommandBoxHandle {
  fill: (text: string) => void
}

export const CommandBox = forwardRef<CommandBoxHandle, { onOpenWorkspace: (text: string) => void }>(
  function CommandBox({ onOpenWorkspace }, ref) {
    const [value, setValue] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const { startListening, stopListening, transcript, isListening, error, isSupported } =
      useSpeechRecognition()

    useImperativeHandle(ref, () => ({
      fill: (text: string) => {
        setValue(text)
        inputRef.current?.focus()
      },
    }))

    const handleSend = () => {
      if (value.trim()) {
        onOpenWorkspace(value.trim())
        setValue("")
      }
    }

    const handleMic = () => {
      if (isListening) {
        stopListening()
      } else {
        startListening()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSend()
      }
    }

    return (
      <div className="group relative w-full max-w-xl">
        <div
          className="absolute -inset-px rounded-2xl opacity-40 transition-opacity duration-300 group-focus-within:opacity-100"
          style={{
            background: "linear-gradient(135deg, rgba(229,9,20,0.32), rgba(255,183,3,0.32))",
          }}
        />
        <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-3 backdrop-blur-2xl transition-all duration-300 focus-within:border-accent/30 focus-within:bg-card shadow-card">
          <button
            onClick={handleMic}
            className="group/mic relative flex shrink-0 items-center justify-center"
            aria-label={isListening ? "Stop recording" : "Start recording"}
          >
            <motion.span
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] transition-colors duration-300 group-hover:bg-white/[0.08]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="absolute inset-0 rounded-full border border-border group-hover:border-border-hover" />
              {isListening && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-accent/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <Mic
                className={`relative h-4 w-4 transition-colors duration-300 ${
                  isListening ? "text-accent" : "text-muted group-hover/mic:text-primary"
                }`}
              />
            </motion.span>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={isListening && transcript ? transcript : value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening..."
                : error === "not-supported"
                  ? "Voice input not supported in this browser"
                  : error
                    ? `Voice input unavailable (${error})`
                    : "Ask CineMatch to book your tickets..."
            }
            className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder-muted/50 outline-none"
          />

          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="group/send flex shrink-0 items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
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
      </div>
    )
  },
)
