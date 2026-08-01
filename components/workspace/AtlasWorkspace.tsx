"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { WorkspaceHeader } from "./WorkspaceHeader"
import { Sidebar } from "./Sidebar"
import { ConversationPanel } from "./ConversationPanel"
import { ConversationInput } from "./ConversationInput"
import { DynamicActionButton } from "./DynamicActionButton"
import { WorkspacePreview } from "./WorkspacePreview"
import { HistoryPanel } from "./HistoryPanel"
import { useAtlas } from "@/hooks/useAtlas"

export function AtlasWorkspace({ onClose = () => {}, commandText }: { onClose?: () => void; commandText?: string }) {
  const {
    sendMessage,
    selectTheatre,
    continueWithRecommendation,
    executeMission,
    respondToAgent,
    clear,
    messages,
    loading,
    response,
    error,
    locationStatus,
    missionStatus,
    executionSteps,
    buttonState,
    buttonLabel,
    pendingRequestId,
    history,
    clearHistory,
  } = useAtlas()
  const hasStartedRef = useRef(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (commandText && !hasStartedRef.current) {
      hasStartedRef.current = true
      sendMessage(commandText)
    }
  }, [commandText, sendMessage])

  const onSuggestionSelect = useCallback((value: string) => {
    sendMessage(value)
  }, [sendMessage])

  const onContinueTheatre = useCallback(() => {
    const lastMsg = messages[messages.length - 1]
    const name = lastMsg?.theatreRecommendation?.recommended.name
    if (name) continueWithRecommendation(name)
  }, [messages, continueWithRecommendation])

  const onSelectTheatre = useCallback((id: string) => {
    selectTheatre(id)
  }, [selectTheatre])

  const onAction = useCallback(() => {
    if (buttonState === "ready") {
      executeMission()
    }
  }, [buttonState, executeMission])

  const onSeatConfirm = useCallback(() => {
    respondToAgent("done")
  }, [respondToAgent])

  const onCredentialsConfirm = useCallback((email: string, phone: string) => {
    respondToAgent(`${email}|${phone}`)
  }, [respondToAgent])

  const intent = response?.intent ?? null
  const isExecuting = missionStatus !== "idle"
  const activeLabel = executionSteps.find((s) => s.status === "active")?.label ?? null
  const showMissionStrip = missionStatus === "running" && !pendingRequestId

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-2xl"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-4 md:inset-6 lg:inset-8 z-50 flex overflow-hidden rounded-[24px] border border-border bg-background/70 backdrop-blur-3xl shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <Sidebar
          onNewBooking={clear}
          onHistory={() => setShowHistory(true)}
          historyActive={showHistory}
          missionStatus={missionStatus}
          activeLabel={activeLabel}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-6 pt-7 md:px-10">
            <WorkspaceHeader onBack={onClose} />
          </div>

          <AnimatePresence mode="wait">
            {showMissionStrip && (
              <motion.div
                key="mission-strip"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="mx-6 md:mx-10 overflow-hidden"
              >
                <div className="glass-panel mb-1 flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span className="text-xs font-medium text-secondary">
                    {activeLabel ?? "Automating your booking..."}
                  </span>
                  <div className="ml-auto h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="min-h-0 flex-1 px-6 md:px-10">
            <div className="h-full">
              <AnimatePresence mode="wait">
                {locationStatus === "detecting" && messages.length === 0 ? (
                  <motion.div
                    key="locating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full items-center justify-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span className="text-xs text-muted">Detecting your location...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="conversation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <ConversationPanel
                      messages={messages}
                      loading={loading}
                      onSuggestionSelect={onSuggestionSelect}
                      onContinueTheatre={onContinueTheatre}
                      onSelectTheatre={onSelectTheatre}
                      onSeatConfirm={onSeatConfirm}
                      onCredentialsConfirm={onCredentialsConfirm}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="shrink-0 border-t border-border px-6 py-5 md:px-10">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                {!isExecuting || (isExecuting && pendingRequestId) ? (
                  <ConversationInput onSend={sendMessage} loading={loading} />
                ) : missionStatus === "running" ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-11 items-center px-1"
                  >
                    <span className="text-xs text-muted">
                      {activeLabel ?? "Processing..."}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-11 items-center px-1"
                  >
                    <span className="text-xs text-accent">Mission complete</span>
                  </motion.div>
                )}
              </div>
              <DynamicActionButton
                state={buttonState}
                currentLabel={buttonLabel}
                onAction={onAction}
                disabled={buttonState === "collecting" || loading}
              />
            </div>
          </div>
        </div>

        <WorkspacePreview
          intent={intent}
          loading={loading}
          error={error}
          executionSteps={executionSteps}
          missionStatus={missionStatus}
        />

        <HistoryPanel
          open={showHistory}
          onClose={() => setShowHistory(false)}
          history={history}
          onClearHistory={clearHistory}
        />
      </motion.div>
    </>
  )
}
