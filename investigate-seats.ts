import { BrowserSession } from "./Agent/browser"

const SEAT_URL = "https://in.bookmyshow.com/movies/bang/seat-layout/ET00452034/IMMO/60222/20260728"
const SEAT_API = "https://in.bookmyshow.com/api/movies-data/seatlayout/v1/primary?eventCode=ET00452034&dateCode=20260728&regionCode=BANG&venueCode=IMMO"

async function main() {
  const browser = new BrowserSession("bms-investigate", 60000)
  try {
    console.log("Opening seat layout page...")
    await browser.open(SEAT_URL)
    await browser.wait("time", "10")

    // Get the FULL API response (no truncation)
    console.log("\n=== FULL SEAT API RESPONSE ===")
    const fullApi = await browser.eval<string>(`
      (function() {
        return fetch('${SEAT_API}', {credentials:'include'})
          .then(function(r) { return r.text(); })
          .then(function(t) {
            var keys = [];
            try { var obj = JSON.parse(t); keys = Object.keys(obj); } catch(e) {}
            return 'totalLen=' + t.length + ' keys=' + JSON.stringify(keys) + ' first2000=' + t.slice(0,2000) + ' midSection=' + t.slice(4000, 6000) + ' last2000=' + t.slice(-2000);
          })
          .catch(function(e) { return 'err:' + e.message; });
      })()
    `)
    console.log(fullApi)

    // Also check if there's seat data embedded in the INITIAL_STATE after seat layout loads
    console.log("\n=== CHECK ADDITIONAL GLOBAL STATE ===")
    const moreGlobals = await browser.eval<string>(`
      (function() {
        var keys = Object.keys(window);
        var relevant = [];
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (k.indexOf('seat') !== -1 || k.indexOf('layout') !== -1 || k.indexOf('primary') !== -1 || k.indexOf('bookingDt') !== -1) relevant.push(k);
        }
        if (relevant.length) return 'globals: ' + relevant.join(', ');
        // Check for Redux store cache
        var reactRoot = document.getElementById('__next');
        if (!reactRoot) return 'no relevant globals found';
        return 'no relevant globals found (checking ' + keys.length + ' keys)';
      })()
    `)
    console.log(moreGlobals)

    // Try to get the seat selector key for the current showtime
    console.log("\n=== CURRENT SHOWTIME SEAT SELECTOR KEY ===")
    const selectorKey = await browser.eval<string>(`
      (function() {
        // The currently selected showtime has aria-pressed="true"
        var sel = document.querySelector('[aria-pressed="true"]');
        if (!sel) return 'no selected showtime';
        return 'selected id=' + sel.id + ' aria-label=' + (sel.getAttribute('aria-label')||'');
      })()
    `)
    console.log(selectorKey)

  } catch (err) {
    console.error("Failed:", err instanceof Error ? err.message : String(err))
  } finally {
    await browser.close()
  }
}

main()
