"use client"

import { motion } from "framer-motion"
import { ArrowRight, Play } from "lucide-react"

export function Hero({ onEnterOperations }: { onEnterOperations?: (text: string) => void }) {
  const handleEnter = () => {
    if (onEnterOperations) {
      onEnterOperations("")
    }
  }

  return (
    <section className="relative z-10 flex h-screen flex-col items-start justify-center px-6 pt-20 pb-10 md:px-10 lg:px-16 overflow-hidden">
      {/* AI Browser Online Badge */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="mb-4 flex items-center gap-2 rounded-full glass-panel px-3 py-1"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-success animate-pulse-ring" />
          <span className="relative block h-full w-full rounded-full bg-success animate-badge-pulse" />
        </span>
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-secondary">
          AI BROWSER ONLINE
        </span>
      </motion.div>

      {/* Main Heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="mb-3 flex flex-col gap-1 max-w-4xl"
      >
        <h1 className="hero-heading font-semibold tracking-[-0.03em] leading-[0.95] text-primary select-none">
          <span className="block">Book Movies</span>
          <span className="block">Like You&apos;re Talking</span>
          <span className="block">
            To A <span className="text-gradient-red">Human.</span>
          </span>
        </h1>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5 max-w-xl text-sm text-secondary/90 leading-snug"
      >
        Tell CineMatch what you want to watch. Our AI compares theatres, finds the best
        showtimes, selects seats, and navigates BookMyShow automatically.
      </motion.p>

      {/* Primary Button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <motion.button
          onClick={handleEnter}
          className="btn-primary group flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold text-background shadow-glow"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Enter Operations Center</span>
          <motion.span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"
            whileHover={{ x: 3 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowRight className="h-4.5 w-4.5" />
          </motion.span>
        </motion.button>
      </motion.div>

      {/* Compact trust indicators */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-center gap-4 md:gap-6 text-[11px]"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent-dark/10 border border-accent/20">
            <span className="text-[12px] font-bold text-accent">99%</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">Seat Accuracy</p>
            <p className="text-[10px] text-muted">AI-powered selection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-success/20 to-success/10 border border-success/20">
            <span className="text-[12px] font-bold text-success">{'<30s'}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">Avg. Booking Time</p>
            <p className="text-[10px] text-muted">End-to-end automation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent-dark/10 border border-accent/20">
            <span className="text-[12px] font-bold text-accent">500+</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">Theatres Connected</p>
            <p className="text-[10px] text-muted">Across major cities</p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}