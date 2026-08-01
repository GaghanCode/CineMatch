"use client"

import { useState, useCallback, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function usePageTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const navigate = useCallback((url: string) => {
    setIsTransitioning(true)
    setTimeout(() => {
      window.location.href = url
    }, 400)
  }, [])
  return { navigate, isTransitioning }
}

export function TransitionOverlay({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
