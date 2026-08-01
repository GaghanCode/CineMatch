"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, ClipboardList, Layers, ScanLine, CheckCircle, Sparkles } from "lucide-react"
import { ThinkingTimeline } from "./ThinkingTimeline"
import { ThinkingStage } from "./ThinkingStage"
import { ComparisonCards } from "./ComparisonCards"
import { ReasoningCard } from "./ReasoningCard"
import { SeatMap } from "./SeatMap"

const stageDurations = [3000, 4000, 3500, 3000, 4000, 3000]

export function ThinkingOverlay({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (stage >= 6) return
    const timer = setTimeout(() => setStage((s) => s + 1), stageDurations[stage])
    return () => clearTimeout(timer)
  }, [stage])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-2xl"
    >
      <div className="relative flex h-full w-full max-w-6xl gap-10 overflow-y-auto px-6 py-10">
        <div className="hidden shrink-0 pt-24 md:block md:w-44">
          <ThinkingTimeline currentStage={stage} />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            {stage < 6 ? (
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-2xl shadow-card"
              >
                {stage === 0 && (
                  <ThinkingStage icon={<Brain className="h-5 w-5 text-secondary" />} title="Understanding Request" subtitle="Analysing your mission parameters">
                    <div className="space-y-2">
                      {[
                        { label: "Movie", value: "Superman" },
                        { label: "Tickets", value: "2" },
                        { label: "Budget", value: "₹1,800" },
                        { label: "Date", value: "Tomorrow" },
                        { label: "Time", value: "After 7 PM" },
                        { label: "Location", value: "Indiranagar" },
                      ].map((f, i) => (
                        <motion.div
                          key={f.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.08 }}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs text-muted">{f.label}</span>
                          <span className="text-sm text-secondary">{f.value}</span>
                        </motion.div>
                      ))}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                        className="mt-4 flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2"
                      >
                        <CheckCircle className="h-4 w-4 text-accent" />
                        <span className="text-xs font-medium text-accent">Complete</span>
                      </motion.div>
                    </div>
                  </ThinkingStage>
                )}

                {stage === 1 && (
                  <ThinkingStage icon={<ClipboardList className="h-5 w-5 text-secondary" />} title="Building Plan" subtitle="Constructing execution strategy">
                    <div className="space-y-0">
                      {["Find movie", "Search theatres", "Compare prices", "Check seats", "Optimise choice", "Prepare booking"].map(
                        (step, i) => (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: i * 0.2 }}
                            className="flex items-center gap-3 py-1.5"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] text-muted border border-border">
                              {i + 1}
                            </span>
                            <span className="text-sm text-secondary">{step}</span>
                            {i < 5 && <span className="ml-auto text-muted">↓</span>}
                          </motion.div>
                        ),
                      )}
                    </div>
                  </ThinkingStage>
                )}

                {stage === 2 && (
                  <ThinkingStage icon={<Layers className="h-5 w-5 text-secondary" />} title="Comparing Options" subtitle="Evaluating available theatres">
                    <ComparisonCards />
                  </ThinkingStage>
                )}

                {stage === 3 && (
                  <ThinkingStage icon={<Brain className="h-5 w-5 text-secondary" />} title="Reasoning" subtitle="Making optimal decision">
                    <ReasoningCard />
                  </ThinkingStage>
                )}

                {stage === 4 && (
                  <ThinkingStage icon={<ScanLine className="h-5 w-5 text-secondary" />} title="Seat Optimisation" subtitle="Finding the best available seats">
                    <SeatMap />
                  </ThinkingStage>
                )}

                {stage === 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="h-10 w-10 text-accent" />
                    </motion.div>
                    <h3 className="mt-4 text-lg font-semibold text-primary">Mission Prepared</h3>
                    <p className="mt-1 text-xs text-muted">Estimated Total</p>
                    <p className="mt-1 text-2xl font-bold text-primary">₹1,640</p>
                    <div className="mt-6 rounded-xl border border-border bg-card/60 px-4 py-2 shadow-card">
                      <span className="text-xs text-muted">Ready to Launch Browser</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CheckCircle className="h-16 w-16 text-accent" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-primary">Mission Complete</h3>
                  <p className="mt-1 text-sm text-muted">Your booking has been prepared</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background shadow-glow transition-all duration-200 hover:bg-accent/90 hover:shadow-glow active:scale-[0.97]"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
