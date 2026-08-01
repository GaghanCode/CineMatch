"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Loader2, AlertCircle, CheckCircle2, Gauge, Activity, Target } from "lucide-react"
import type { BookingIntent } from "@/services/ai/atlas"
import { INTENT_LABELS } from "@/services/ai/atlas"
import { MissionExecutionTimeline } from "./MissionExecutionTimeline"
import type { StepData } from "./ExecutionStep"

interface FieldDisplay {
  label: string
  value: string
}

function intentToFields(intent: BookingIntent): FieldDisplay[] {
  const fields: FieldDisplay[] = []
  if (intent.movie) fields.push({ label: "Movie", value: intent.movie })
  if (intent.tickets) fields.push({ label: "Tickets", value: String(intent.tickets) })
  if (intent.date) fields.push({ label: "Date", value: intent.date })
  if (intent.time) fields.push({ label: "Time", value: intent.time })
  if (intent.budget) fields.push({ label: "Budget", value: `₹${intent.budget.toLocaleString()}` })
  if (intent.screenType) fields.push({ label: "Screen", value: intent.screenType })
  if (intent.city) fields.push({ label: "City", value: intent.city })
  if (intent.language) fields.push({ label: "Language", value: intent.language })
  if (intent.theatrePreference) fields.push({ label: "Theatre", value: intent.theatrePreference })
  if (intent.seatPreference) fields.push({ label: "Seats", value: intent.seatPreference })
  if (intent.specialRequest) fields.push({ label: "Note", value: intent.specialRequest })
  return fields
}

function SectionCard({
  title,
  icon,
  delay = 0,
  children,
}: {
  title: string
  icon: React.ReactNode
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-3xl p-5 shadow-card"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.04] border border-border">
          {icon}
        </span>
        <h3 className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
          {title}
        </h3>
      </div>
      <div className="mt-4">{children}</div>
    </motion.div>
  )
}

export function WorkspacePreview({
  intent,
  loading,
  error,
  executionSteps,
  missionStatus,
}: {
  intent: BookingIntent | null
  loading: boolean
  error: string | null
  executionSteps?: StepData[]
  missionStatus?: "idle" | "running" | "completed"
}) {
  const activeStep =
    executionSteps?.find((s) => s.status === "active")?.label ?? null

  const automationLabel =
    missionStatus === "running"
      ? "Executing"
      : missionStatus === "completed"
        ? "Completed"
        : "Idle"

  const automationTone =
    missionStatus === "running"
      ? "text-accent border-accent/25 bg-accent/[0.06]"
      : missionStatus === "completed"
        ? "text-success border-success/25 bg-success/[0.06]"
        : "text-muted border-border bg-white/[0.02]"

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="hidden xl:flex h-full w-[340px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-surface/30 px-6 py-8 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold tracking-wide text-primary">
          Live Booking Summary
        </h2>
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${automationTone}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {automationLabel}
        </span>
      </div>

      {/* Live booking summary */}
      <SectionCard title="Mission Summary" icon={<Gauge className="h-3.5 w-3.5 text-accent" />} delay={0.05}>
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-card border border-border">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
              <span className="text-xs text-muted">Analyzing request...</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-start gap-2.5 rounded-2xl border border-error/15 bg-error/[0.04] px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                <span className="text-xs text-error leading-relaxed">{error}</span>
              </div>
            </motion.div>
          )}

          {!loading && !error && !intent && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card border border-border">
                <Target className="h-5 w-5 text-muted" />
              </div>
              <span className="max-w-[200px] text-xs text-muted leading-relaxed">
                Describe your booking and CineMatch will build a mission here.
              </span>
            </motion.div>
          )}

          {!loading && !error && intent && (
            <motion.div
              key="intent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="space-y-2.5">
                {intentToFields(intent).map((field, i) => (
                  <motion.div
                    key={`${field.label}:${field.value}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-[11px] text-muted">{field.label}</span>
                    <span className="truncate text-xs font-medium text-secondary">
                      {field.value}
                    </span>
                  </motion.div>
                ))}
                {intentToFields(intent).length === 0 && (
                  <p className="text-xs text-muted">No details captured yet.</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.02] border border-border px-4 py-2.5">
                <span className="text-[11px] text-muted">Intent</span>
                <span className="text-xs font-medium text-accent">
                  {INTENT_LABELS[intent.intentType]}
                </span>
              </div>

              {intent.missingFields.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {intent.missingFields.map((field) => (
                    <span
                      key={field}
                      className="rounded-full border border-accent/20 bg-accent/[0.05] px-2.5 py-0.5 text-[10px] text-accent"
                    >
                      {field} needed
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* Progress timeline */}
      <SectionCard title="Progress Timeline" icon={<Target className="h-3.5 w-3.5 text-accent" />} delay={0.15}>
        {executionSteps && executionSteps.length > 0 ? (
          <MissionExecutionTimeline steps={executionSteps} compact />
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            Launch the mission to track each automated step live.
          </p>
        )}
      </SectionCard>

      {/* Current task + automation status */}
      {(missionStatus === "running" || missionStatus === "completed") && (
        <SectionCard title="Current Task" icon={<Activity className="h-3.5 w-3.5 text-accent" />} delay={0.2}>
          {missionStatus === "running" ? (
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              <span className="text-xs font-medium text-secondary">
                {activeStep ?? "Automating booking..."}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-success">
                Booking flow complete — payment is ready for you.
              </span>
            </div>
          )}
        </SectionCard>
      )}
    </motion.div>
  )
}
