import { BrowserSession } from "./Agent/browser"
import { extractSeatLayout, clickSeatsOnPage, verifySeatsSelected } from "./Agent/extractor"

const SEAT_URL = "https://in.bookmyshow.com/movies/bang/seat-layout/ET00452034/IMMO/60222/20260728"

async function main() {
  const browser = new BrowserSession("bms-investigate", 60000)
  try {
    console.log("Opening seat layout page...")
    await browser.open(SEAT_URL)
    await browser.wait("time", "10")

    console.log("\n=== TESTING NEW extractSeatLayout ===")
    const layout = await extractSeatLayout(browser)
    if (!layout) {
      console.log("extractSeatLayout returned null")
      return
    }
    console.log("Categories:", JSON.stringify(layout.categories))
    console.log("Rows found:", layout.rows.length)
    for (const r of layout.rows) {
      const avail = r.seats.filter(s => s.status === "available").length
      const booked = r.seats.filter(s => s.status === "booked").length
      console.log(`  Row ${r.row}: ${r.seats.length} seats (${avail} avail, ${booked} booked)`)
    }
    const allAvail = layout.rows.flatMap(r => r.seats.filter(s => s.status === "available"))
    console.log(`\nTotal available seats: ${allAvail.length}`)
    if (allAvail.length > 0) {
      const sample = allAvail.slice(0, 3).map(s => s.id)
      console.log(`Sample available: ${sample.join(", ")}`)
      
      console.log("\n=== TESTING clickSeatsOnPage ===")
      const clicked = await clickSeatsOnPage(browser, [sample[0]])
      console.log(`Clicked ${sample[0]}: ${clicked}`)
      await browser.wait("time", "1")
      
      console.log("\n=== TESTING verifySeatsSelected ===")
      const verified = await verifySeatsSelected(browser, [sample[0]])
      console.log(`Verified ${sample[0]} selected: ${verified}`)
    }
  } catch (err) {
    console.error("Failed:", err instanceof Error ? err.message : String(err))
  } finally {
    await browser.close()
  }
}

main()
