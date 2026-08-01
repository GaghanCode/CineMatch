import { NextRequest, NextResponse } from "next/server"
import { analyzeIntent } from "@/services/ai/atlas"
import type { BookingIntent } from "@/services/ai/atlas"

export async function POST(request: NextRequest) {
  try {
    const { text, currentIntent } = await request.json()

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 },
      )
    }

    const result = await analyzeIntent(
      text.trim(),
      currentIntent as BookingIntent | undefined,
    )

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred"
    console.error("[analyze-intent]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
