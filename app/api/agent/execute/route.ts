import { Agent } from "@/Agent"
import type { AgentInput } from "@/Agent"

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
