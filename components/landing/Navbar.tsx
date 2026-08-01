"use client"

import { motion } from "framer-motion"
import { Play } from "lucide-react"

const links = ["Features", "How It Works", "Demo"]

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-4 pt-6"
    >
      <nav className="glass-panel flex w-full max-w-7xl items-center justify-between rounded-2xl px-5 py-3.5 shadow-card">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <motion.span
            className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark"
            animate={{ rotate: [0, 0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Play className="h-4.5 w-4.5 text-background ml-0.5" />
            <span className="absolute inset-0 rounded-xl border border-accent/30" />
          </motion.span>
          <span className="text-lg font-bold tracking-[0.02em] text-primary">
            CineMatch
          </span>
        </div>

        {/* Center navigation */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="relative text-sm font-medium text-secondary/90 transition-colors duration-200 hover:text-primary after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-accent after:to-accent-dark after:transition-all after:duration-300 hover:after:w-full"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-3">
          <motion.button
            className="btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-background shadow-glow"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            Get Started
          </motion.button>
        </div>
      </nav>
    </motion.header>
  )
}