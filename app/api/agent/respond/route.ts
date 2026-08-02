import { ResponseStore } from "@/Agent/response-store"

const BROKER_URL = process.env.AGENT_BROKER_URL || ""
const BROKER_AUTH = process.env.BROKER_AUTH_TOKEN || ""

export async function POST(req: Request) {
  const body = await req.json()
  const { requestId, response } = body

  if (!requestId || typeof response !== "string") {
    return Response.json({ error: "requestId (string) and response (string) are required" }, { status: 400 })
  }

  // Remote mode: forward the user's selection to the VM broker, which holds the
  // agent state and the pending theatre/showtime/seat/credentials request.
  if (BROKER_URL) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (BROKER_AUTH) headers["Authorization"] = `Bearer ${BROKER_AUTH}`
    const upstream = await fetch(`${BROKER_URL}/api/agent/respond`, {
      method: "POST",
      headers,
      body: JSON.stringify({ requestId, response }),
    })
    return Response.json({ ok: upstream.ok }, { status: upstream.ok ? 200 : 404 })
  }

  const ok = ResponseStore.respond(requestId, response)
  if (!ok) {
    return Response.json({ error: "No pending request found for this requestId" }, { status: 404 })
  }

  return Response.json({ ok: true })
}