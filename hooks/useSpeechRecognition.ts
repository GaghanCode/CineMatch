"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type SpeechRecognitionErrorType =
  | "not-supported"
  | "permission-denied"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "language-not-supported"
  | "service-not-allowed"
  | "timeout"
  | "unknown"

export interface UseSpeechRecognitionReturn {
  startListening: () => void
  stopListening: () => void
  transcript: string
  isListening: boolean
  error: SpeechRecognitionErrorType | null
  isSupported: boolean
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<SpeechRecognitionErrorType | null>(null)
  const recognitionRef = useRef<any>(null)

  const isSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const startListening = useCallback(() => {
    setError(null)
    setTranscript("")

    if (!isSupported) {
      setError("not-supported")
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ""
      let interimTranscript = ""
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript = result[0].transcript
        }
      }
      setTranscript(finalTranscript || interimTranscript)
    }

    recognition.onerror = (event: any) => {
      console.warn("[SpeechRecognition] error:", event.error, event.message || "")
      const errorMap: Record<string, SpeechRecognitionErrorType> = {
        "not-allowed": "permission-denied",
        "permission-denied": "permission-denied",
        "no-speech": "no-speech",
        "audio-capture": "audio-capture",
        "network": "network",
        "aborted": "aborted",
        "language-not-supported": "language-not-supported",
        "service-not-allowed": "service-not-allowed",
        "timeout": "timeout",
      }
      setError(errorMap[event.error] || "unknown")
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setError("unknown")
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
        recognitionRef.current = null
      }
    }
  }, [])

  return {
    startListening,
    stopListening,
    transcript,
    isListening,
    error,
    isSupported,
  }
}
