import { ResponseStore } from "@/Agent/response-store"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { requestId, response } = body

    if (!requestId || typeof response !== "string") {
      return Response.json({ error: "requestId (string) and response (string) are required" }, { status: 400 })
    }

    const ok = ResponseStore.respond(requestId, response)
    if (!ok) {
      return Response.json({ error: "No pending request found for this requestId" }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
