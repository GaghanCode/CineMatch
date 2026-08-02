import { Agent } from "@/Agent"
import type { AgentInput } from "@/Agent"

const BROKER_URL = process.env.AGENT_BROKER_URL || ""
const BROKER_AUTH = process.env.BROKER_AUTH_TOKEN || ""

export async function POST(req: Request) {
  const body = await req.json()
  const input: AgentInput = {
    movie: body.movie || "",
    city: body.city || "",
    date: body.date,
    time: body.time,
    tickets: body.tickets,
    budget: body.budget,
    screenType: body.screenType,
    language: body.language,
    email: body.email,
    phone: body.phone,
    lat: typeof body.lat === "number" ? body.lat : undefined,
    lng: typeof body.lng === "number" ? body.lng : undefined,
  }

  if (!input.movie || !input.city) {
    return Response.json({ error: "Movie and city are required" }, { status: 400 })
  }

  // Remote mode: the browser agent and in-memory state live on the VM broker,
  // so Vercel proxies the whole SSE stream to it (preserves state across responses).
  if (BROKER_URL) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (BROKER_AUTH) headers["Authorization"] = `Bearer ${BROKER_AUTH}`
    const upstream = await fetch(`${BROKER_URL}/api/agent/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  // Local mode (default): unchanged in-process execution.
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      const agent = new Agent(input, (event) => {
        const payload = JSON.stringify(event)
        send(payload)
      })

      try {
        await agent.run(input)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        send(JSON.stringify({ type: "error", message }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}