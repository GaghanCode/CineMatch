"use client"

import { useState } from "react"
import { Background } from "@/components/landing/Background"
import { Navbar } from "@/components/landing/Navbar"
import { Hero } from "@/components/landing/Hero"
import { usePageTransition, TransitionOverlay } from "@/components/landing/PageTransition"
import { AtlasWorkspace } from "@/components/workspace/AtlasWorkspace"

export default function Home() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [initialText, setInitialText] = useState("")
  const { isTransitioning } = usePageTransition()

  const handleOpenWorkspace = (text: string) => {
    setInitialText(text)
    setWorkspaceOpen(true)
  }

  if (workspaceOpen) {
    return <AtlasWorkspace commandText={initialText} onClose={() => setWorkspaceOpen(false)} />
  }

  return (
    <TransitionOverlay>
      <div className="relative min-h-screen bg-background overflow-hidden">
        <Background />
        <Navbar />
        <Hero onEnterOperations={handleOpenWorkspace} />
      </div>
    </TransitionOverlay>
  )
}
