import { createServer, type IncomingMessage, type ServerResponse } from "http"
import { Agent } from "../Agent"
import type { AgentInput } from "../Agent"
import { ResponseStore } from "../Agent/response-store"
import type { StepEmitter } from "../Agent/planner"

const PORT = Number(process.env.BROKER_PORT || 8787)
const AUTH_TOKEN = process.env.BROKER_AUTH_TOKEN || ""

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {})
      } catch (e) {
        reject(e as Error)
      }
    })
    req.on("error", reject)
  })
}

function buildInput(body: any): AgentInput {
  return {
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
}

async function handleExecute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: any
  try {
    body = await readJson(req)
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Invalid JSON" }))
    return
  }

  const input = buildInput(body)
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  })
  res.flushHeaders?.()

  const emit: StepEmitter = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  const agent = new Agent(input, emit)

  try {
    await agent.run(input)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
  } finally {
    res.end()
  }
}

async function handleRespond(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: any
  try {
    body = await readJson(req)
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Invalid JSON" }))
    return
  }
  const ok = ResponseStore.respond(body.requestId, body.response)
  res.writeHead(ok ? 200 : 404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ ok }))
}

function rejectIfUnauthorized(req: IncomingMessage, res: ServerResponse): boolean {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    res.writeHead(204).end()
    return true
  }
  if (AUTH_TOKEN && req.headers.authorization !== `Bearer ${AUTH_TOKEN}`) {
    res.writeHead(401, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Unauthorized" }))
    return true
  }
  return false
}

const server = createServer((req, res) => {
  if (rejectIfUnauthorized(req, res)) return
  const url = (req.url || "").split("?")[0]
  if (req.method === "POST" && url === "/api/agent/execute") void handleExecute(req, res)
  else if (req.method === "POST" && url === "/api/agent/respond") void handleRespond(req, res)
  else {
    res.writeHead(404, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Not found" }))
  }
})

server.listen(PORT, () => {
  console.log(`[broker] listening on :${PORT}`)
})