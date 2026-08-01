import { BrowserSession } from "./Agent/browser"
import {
  extractSeatLayout,
  clickSeatsOnPage,
  verifySeatsSelected,
  clickPayButton,
  clickAcceptTerms,
  clickSkipButton,
  fillUserInfo,
  submitUserInfo,
  extractPageInfo
} from "./Agent/extractor"

async function main() {
  const b = new BrowserSession("bms-e2e", 180000)
  await b.open("https://in.bookmyshow.com/movies/bang/seat-layout/ET00452034/IMMO/60222/20260728")
  await b.wait("time", "15")

  // 1. Extract seat layout
  const layout = await extractSeatLayout(b)
  if (!layout || layout.rows.length === 0) {
    console.log("FAIL: No seat layout extracted")
    await b.close()
    return
  }
  console.log("Seats extracted:", layout.rows.reduce((a, r) => a + r.seats.length, 0), "across", layout.rows.length, "rows")

  // 2. Pick first available seat and click it
  const firstRow = layout.rows[0]
  const firstSeat = firstRow.seats[0]
  console.log("Clicking seat:", firstSeat.id)
  const clicked = await clickSeatsOnPage(b, [firstSeat.id])
  console.log("Seat clicked:", clicked)
  if (!clicked) { await b.close(); return }
  await b.wait("time", "2")

  // 3. Verify selection
  const verified = await verifySeatsSelected(b, [firstSeat.id])
  console.log("Verification:", verified)
  await b.wait("time", "1")

  // 4. Click Pay
  const pay = await clickPayButton(b)
  console.log("Pay clicked:", pay)
  await b.wait("time", "3")

  // 5. Accept Terms
  const accept = await clickAcceptTerms(b)
  console.log("Accept clicked:", accept)
  await b.wait("time", "3")

  // 6. Skip food
  const skip = await clickSkipButton(b)
  console.log("Skip clicked:", skip)
  await b.wait("time", "4")

  // 7. Fill user info
  const fill = await fillUserInfo(b, "gaghanrock@gmail.com", "8892924298")
  console.log("Fill:", fill)
  await b.wait("time", "2")

  // 8. Submit
  const submit = await submitUserInfo(b)
  console.log("Submit:", submit)
  await b.wait("time", "8")

  // 9. Check final page
  const pageInfo = await extractPageInfo(b)
  console.log("Final URL:", pageInfo.url)

  const pageText = await b.eval<string>(`(document.body.innerText||'').slice(0,2000)`)
  console.log("=== PAGE ===")
  console.log(pageText)

  await b.close()
}
main()
