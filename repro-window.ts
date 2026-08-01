import { BrowserSession } from "./Agent/browser"

async function main() {
  const b = new BrowserSession("repro-int")
  console.log("[1] open")
  await b.open("https://example.com")
  console.log("[2] wait 3")
  await b.wait("time", "3")
  console.log("[3] wait 5")
  await b.wait("time", "5")
  console.log("[4] state")
  const s = await b.state()
  console.log("[4] url:", s.url)
  console.log("done")
}

main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
