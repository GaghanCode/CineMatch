import { BrowserSession, checkWebcmdInstalled } from "./browser"
import { buildExecutionSteps, emitStep, emitError, emitComplete, type StepEmitter } from "./planner"
import { extractTheatres, extractTheatresFromBookingPage, extractTheatreNames, extractTheatresWithShowtimes, clickTheatreByIndex, extractShowtimes, clickShowtimeByIndex, selectTicketCount, getSelectedSeats, clickPayButton, clickAcceptTerms, clickSkipButton, fillUserInfo, submitUserInfo, type ShowtimeInfo } from "./extractor"
import { rankTheatres, generateReasoning } from "./ranking"
import { ResponseStore } from "./response-store"
import type { AgentInput, AgentStep, AgentResult, AgentTheatre } from "./types"

const BOOKMYSHOW_URL = "https://in.bookmyshow.com/"

// Encode a string as a single-quoted JS literal (avoids double quotes that break shell quoting)
function sq(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'"
}

function normalizeCityForUrl(city: string): string {
  return city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

function extractTimeFromDateField(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined
  const lower = dateStr.toLowerCase()
  for (const t of ["morning", "afternoon", "evening", "night"]) {
    if (lower.includes(t)) return t
  }
  return undefined
}

function stripTimeFromDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined
  return dateStr.replace(/\b(morning|afternoon|evening|night)\b/gi, "").trim() || "today"
}

function resolveDate(relative: string | undefined): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const clean = (stripTimeFromDate(relative) || "today").trim()
  const lower = clean.toLowerCase().replace(/[^a-z ]/g, "").trim()
  if (lower === "tomorrow") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  }
  if (lower === "day after tomorrow") {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
  }
  if (lower !== "today") {
    const parsed = new Date(clean)
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0)
      return parsed
    }
  }
  return today
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function dateSelectionStrings(d: Date): string[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const day = d.getDate()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const longMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const shortMon = months[d.getMonth()]
  const longMon = longMonths[d.getMonth()]
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dayName = days[d.getDay()]
  const results: string[] = []
  if (diffDays === 0) results.push("Today")
  if (diffDays === 1) results.push("Tomorrow")
  if (diffDays === 2) results.push("Day after tomorrow")
  results.push(`${dayName}, ${day} ${shortMon}`, `${shortMon} ${day}`, `${longMon} ${day}`, `${day} ${shortMon}`, `${day} ${longMon}`, String(day))
  return results
}

function parseHour(timeStr: string): number {
  const m = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const a = (m[3] || "").toUpperCase()
  if (a === "PM" && h < 12) h += 12
  if (a === "AM" && h === 12) h = 0
  return h
}

function filterShowtimesByPreference(showtimes: ShowtimeInfo[], preference: string | undefined): ShowtimeInfo[] {
  const prefs: Record<string, [number, number]> = {
    morning: [6, 12],
    afternoon: [12, 17],
    evening: [17, 21],
    night: [21, 24],
  }
  const range = prefs[(preference || "").toLowerCase()]
  if (!range) return showtimes
  const [start, end] = range
  return showtimes.filter(st => {
    const h = parseHour(st.time)
    return h >= start && h < end
  })
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const geocodeCache = new Map<string, { lat: number; lng: number }>()

const BRAND_PATTERN =
  /^(PVR|INOX|Cinepolis|CineMAX|AMB|Miraj|AGS|S2|Movietime|Carnival|Mythri|Rockline|Gopalan|Swagath|V Cinemas)/i

function cleanGeocodeName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/gi, " ")
    .replace(/4K|\s*A\/?C\s*Dolby\s*Atmos|\s*Dolby\s*Atmos|\bDolby\b|\bIMAX\b|\b3D\b/gi, " ")
    .replace(/[,\-]\s*(Bangalore|Bengaluru|India|Karnataka)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildGeocodeQueries(raw: string): string[] {
  const queries: string[] = []
  if (/mall of asia/i.test(raw)) queries.push("Phoenix Mall of Asia")
  queries.push(cleanGeocodeName(raw))
  const noBrand = cleanGeocodeName(raw.replace(BRAND_PATTERN, "").replace(/^\s*[:,\-]?\s*/, ""))
  if (noBrand && !queries.includes(noBrand)) queries.push(noBrand)
  const noRoad = noBrand.replace(/\s+(Road|Street|Marg|Layout)\s*$/i, "").trim()
  if (noRoad && !queries.includes(noRoad)) queries.push(noRoad)
  const noVenue = noBrand
    .replace(/Mall|Multiplex|Superplex|Megaplex|Cineplex|Cinemas|Cinema|Theatres|Theatre|Plex/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (noVenue && !queries.includes(noVenue)) queries.push(noVenue)
  return queries.filter(Boolean)
}

async function geocodeTheatre(
  name: string,
  city: string,
  userLat?: number,
  userLng?: number,
): Promise<{ lat: number; lng: number } | null> {
  const key = `${city.toLowerCase()}::${name.toLowerCase()}`
  const cached = geocodeCache.get(key)
  if (cached) return cached

  const cityBBoxes: Record<string, string> = {
    bangalore: "77.35,12.83,77.80,13.15",
    bengaluru: "77.35,12.83,77.80,13.15",
    mumbai: "72.80,18.88,73.02,19.30",
    delhi: "76.85,28.40,77.35,28.90",
    hyderabad: "78.30,17.30,78.60,17.60",
    chennai: "80.10,12.85,80.35,13.15",
    pune: "73.75,18.40,73.95,18.65",
    kolkata: "88.25,22.40,88.50,22.70",
  }
  const cityKey = city.toLowerCase()
  const baseBBox = cityBBoxes[cityKey] ?? (userLat != null && userLng != null
    ? `${userLng - 0.5},${userLat - 0.5},${userLng + 0.5},${userLat + 0.5}`
    : undefined)

  const queries = buildGeocodeQueries(name)

  for (const query of queries) {
    try {
      const url = new URL("https://photon.komoot.io/api/")
      url.searchParams.set("q", query)
      if (baseBBox) url.searchParams.set("bbox", baseBBox)
      url.searchParams.set("limit", "1")
      url.searchParams.set("lang", "en")

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "CineMatchOS/1.0" },
      })
      if (!res.ok) continue
      const data = await res.json()
      const first = Array.isArray(data?.features) ? data.features[0] : null
      const coords = first?.geometry?.coordinates
      if (!coords || !Array.isArray(coords) || coords.length < 2) continue
      const lng = parseFloat(coords[0])
      const lat = parseFloat(coords[1])
      if (isNaN(lat) || isNaN(lng)) continue
      const result = { lat, lng }
      geocodeCache.set(key, result)
      return result
    } catch (err) {
      console.warn("[agent] photon geocode query failed:", query, "->", err instanceof Error ? err.message : String(err))
    }
  }

  console.warn("[agent] geocode not found for", name)
  return null
}

async function formatTheatreDistance(
  name: string,
  city: string,
  userLat: number | undefined,
  userLng: number | undefined,
): Promise<string | undefined> {
  if (userLat == null || userLng == null) return undefined
  const coords = await geocodeTheatre(name, city, userLat, userLng)
  if (!coords) return undefined
  const km = haversineKm(userLat, userLng, coords.lat, coords.lng)
  return `${Math.round(km * 10) / 10} km`
}

export class Agent {
  private browser: BrowserSession
  private steps: AgentStep[] = []
  private emit: StepEmitter

  constructor(input: AgentInput, emit: StepEmitter) {
    this.browser = new BrowserSession()
    this.steps = buildExecutionSteps(input)
    this.emit = emit
  }

  private async setStepActive(id: string, detail?: string): Promise<void> {
    this.steps = this.steps.map((s) =>
      s.id === id ? { ...s, status: "active" as const, detail } : s,
    )
    const step = this.steps.find((s) => s.id === id)
    if (step) emitStep(this.emit, step)
  }

  private async setStepComplete(id: string): Promise<void> {
    this.steps = this.steps.map((s) =>
      s.id === id ? { ...s, status: "completed" as const } : s,
    )
    const step = this.steps.find((s) => s.id === id)
    if (step) emitStep(this.emit, step)
  }

  private async setStepError(id: string, detail: string): Promise<void> {
    this.steps = this.steps.map((s) =>
      s.id === id ? { ...s, status: "error" as const, detail } : s,
    )
    const step = this.steps.find((s) => s.id === id)
    if (step) emitStep(this.emit, step)
  }

  async run(input: AgentInput): Promise<void> {
    try {
      await this.setStepActive("browser", "Starting webcmd browser...")
      const installed = await checkWebcmdInstalled()
      if (!installed) {
        emitError(this.emit, "webcmd is not installed. Run: npm install -g @agentrhq/webcmd")
        return
      }

      const citySlug = normalizeCityForUrl(input.city)

      await this.browser.open(BOOKMYSHOW_URL)
      await this.browser.wait("time", "3")
      await this.setStepComplete("browser")

      await this.setStepActive("open", `Opening BookMyShow for ${input.city}`)

      const initialPage = await this.browser.state()
      const initialUrl = initialPage.url.toLowerCase()

      if (!initialUrl.includes(citySlug)) {
        const cityExploreUrl = `https://in.bookmyshow.com/explore/movies-in-${citySlug}`
        try {
          await this.browser.open(cityExploreUrl)
          await this.browser.wait("time", "2")
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[agent] direct city nav failed, trying popup click: ${msg}`)
          try {
            await this.browser.clickByText(input.city)
            await this.browser.wait("time", "3")
          } catch (err2) {
            console.error(`[agent] city popup click also failed:`, err2 instanceof Error ? err2.message : String(err2))
          }
        }
      }

      await this.setStepComplete("open")

      const cityPageInfo = await this.browser.state()
      const currentUrl = cityPageInfo.url
      const cityName = input.city

      await this.setStepComplete("city")

      await this.setStepActive("search", `Searching "${input.movie}"`)

      const SEARCH_BUTTON_LABEL = "Search for Movies, Events, Plays, Sports and Activities"

      try {
        await this.browser.clickByRole("button", SEARCH_BUTTON_LABEL)
        console.log("[agent] Search button clicked")
      } catch (err) {
        console.error("[agent] search button click failed:", err instanceof Error ? err.message : String(err))
        try {
          await this.browser.click('div[aria-label="Search for Movies, Events, Plays, Sports and Activities"]')
          console.log("[agent] Search button clicked (CSS fallback)")
        } catch (err2) {
          console.error("[agent] search button CSS fallback failed:", err2 instanceof Error ? err2.message : String(err2))
        }
      }

      await this.browser.wait("time", "3")
      console.log("[agent] Search dialog opened")

      let searchSucceeded = false

      try {
        await this.browser.typeByRole("combobox", "Search", input.movie)
        searchSucceeded = true
        console.log("[agent] Search input detected (combobox)")
      } catch (e) {
        console.error("[agent] typeByRole(combobox) failed:", e instanceof Error ? e.message : String(e))
      }

      if (!searchSucceeded) {
        try {
          await this.browser.typeByRole("textbox", "Search", input.movie)
          searchSucceeded = true
          console.log("[agent] Search input detected (textbox)")
        } catch (e) {
          console.error("[agent] typeByRole(textbox) failed:", e instanceof Error ? e.message : String(e))
        }
      }

      if (!searchSucceeded) {
        try {
          await this.browser.type('input[placeholder*="Search"]', input.movie)
          searchSucceeded = true
          console.log("[agent] Search input detected (CSS placeholder)")
        } catch (e) {
          console.error("[agent] CSS type by placeholder failed:", e instanceof Error ? e.message : String(e))
        }
      }

      if (!searchSucceeded) {
        try {
          await this.browser.type('input[aria-label*="Search"]', input.movie)
          searchSucceeded = true
          console.log("[agent] Search input detected (CSS aria-label)")
        } catch (e) {
          console.error("[agent] CSS type by aria-label failed:", e instanceof Error ? e.message : String(e))
        }
      }

      if (!searchSucceeded) {
        try {
          await this.browser.type('input:not([type="hidden"])', input.movie)
          searchSucceeded = true
          console.log("[agent] Search input detected (generic input)")
        } catch (e) {
          console.error("[agent] generic input type failed:", e instanceof Error ? e.message : String(e))
        }
      }

      if (!searchSucceeded) {
        await this.setStepError("search", "Could not find the search box")
        emitError(this.emit, `Failed to search for "${input.movie}". Could not locate the search input on BookMyShow.`)
        return
      }

      console.log("[agent] Movie typed successfully")
      await this.browser.wait("time", "3")

      try {
        await this.browser.wait("selector", "#searchResultsV2", 10000)
        console.log("[agent] Search popup found")
      } catch (err) {
        console.error("[agent] Search popup wait failed:", err instanceof Error ? err.message : String(err))
      }

      console.log("[agent] Clicking best movie result...")
      let resultClicked = false
      try {
        // Prefer a search result that links to a real movie page (/movies/... or an ET-code movie),
        // else a result whose text matches the searched movie name; fall back to first child.
        const pick = await this.browser.eval<string>(`
          (function() {
            var query = ${sq(input.movie)};
            var containers = ["#searchResultsV2", "#searchResultsDropdown", "div[id*='searchResult']"];
            var root = null;
            for (var i = 0; i < containers.length; i++) {
              root = document.querySelector(containers[i]);
              if (root) break;
            }
            var anchors = [];
            if (root) anchors = Array.from(root.querySelectorAll('a[href]'));
            if (anchors.length === 0) {
              anchors = Array.from(document.querySelectorAll('[class*="suggestion"] a[href], [class*="search-result"] a[href], [class*="auto-suggest"] a[href]'));
            }
            if (anchors.length === 0) {
              anchors = Array.from(document.querySelectorAll('a[href]'));
            }
            var bestMovie = null;
            var bestQuery = null;
            for (var j = 0; j < anchors.length; j++) {
              var a = anchors[j];
              if (!a.offsetHeight && !a.offsetWidth) continue;
              var h = a.getAttribute('href') || '';
              var t = (a.textContent || '').trim().replace(/\\s+/g, ' ');
              if (!bestMovie && (/\\/movies\\//.test(h) || /\\/movie\\-/.test(h) || /ET\\d{6,}/.test(h))) {
                bestMovie = a;
              }
              if (query && !bestQuery) {
                var q = query.toLowerCase();
                if (t.toLowerCase().indexOf(q) !== -1 || h.toLowerCase().indexOf(q) !== -1) {
                  bestQuery = a;
                }
              }
            }
            var target = bestMovie || bestQuery || anchors[0] || null;
            if (!target) return 'nf';
            target.setAttribute('data-atlas-pick', '1');
            if (target.scrollIntoView) target.scrollIntoView({behavior:'instant',block:'center'});
            return 'picked:' + (target.getAttribute('href') || '') + ':' + (target.textContent || '').trim().slice(0, 40);
          })()
        `)
        if (typeof pick === "string" && pick.startsWith("picked:")) {
          console.log(`[agent] Result chosen: ${pick.slice(7)}`)
          await this.browser.click("li[data-atlas-pick], a[data-atlas-pick], [data-atlas-pick]")
          await this.browser.eval(`(function(){ try { var e = document.querySelector('[data-atlas-pick]'); if (e) e.removeAttribute('data-atlas-pick'); } catch(err){} })()`)
          await this.browser.wait("time", "5")
          console.log("[agent] Movie result clicked")
          resultClicked = true
        }
      } catch (err) {
        console.error("[agent] movie-result pick failed:", err instanceof Error ? err.message : String(err))
      }

      if (!resultClicked) {
        try {
          await this.browser.click("#searchResultsV2 > div:first-child")
          await this.browser.wait("time", "5")
          console.log("[agent] Movie result clicked (first-child fallback)")
        } catch (err) {
          console.error("[agent] Click on movie result failed:", err instanceof Error ? err.message : String(err))
        }
      }

      await this.browser.wait("time", "3")

      const pageInfo = await this.browser.state()
      console.log(`[agent] URL after search click: ${pageInfo.url}`)

      // Resolve booking intent from input
      const resolvedTime = input.time || extractTimeFromDateField(input.date)
      const bookingDate = resolveDate(input.date)
      const dateParam = formatDateParam(bookingDate)
      console.log(`[agent] Booking intent: date=${input.date || "today"} -> ${bookingDate.toDateString()}, time=${resolvedTime || "any"}`)

      // Navigate directly to booking URL by parsing movie code from current URL
      const urlParts = pageInfo.url.replace(/\/+$/, "").split("/")
      const movieCode = urlParts[urlParts.length - 1]
      const movieSlug = urlParts[urlParts.length - 2]
      const urlCitySlug = urlParts[urlParts.length - 3]

      if (movieCode && movieCode.startsWith("ET")) {
        const bookingUrl = `https://in.bookmyshow.com/buytickets/${movieSlug}-${urlCitySlug}/movie-${urlCitySlug}-${movieCode}-MT/${dateParam}`
        console.log(`[agent] Opening booking URL: ${bookingUrl}`)
        try {
          await this.browser.open(bookingUrl)
          await this.browser.wait("time", "5")
          console.log("[agent] Booking URL open succeeded")
        } catch (navErr) {
          console.error("[agent] Booking URL navigation failed:", navErr instanceof Error ? navErr.message : String(navErr))
        }
      }

      await this.browser.wait("time", "3")
      await this.setStepComplete("search")

      await this.setStepActive("theatres", "Scanning for theatres...")
      await this.browser.wait("time", "3")

      const theatrePageInfo = await this.browser.state()
      console.log(`[agent] URL: ${theatrePageInfo.url}`)
      console.log(`[agent] Title: ${theatrePageInfo.title}`)

      // Explore booking page structure (non-critical debug)
      try {
        const allButtons = await this.browser.findAll({ css: "button, [role='button'], a[href]", limit: 100 })
        console.log(`[agent] Booking page has ${allButtons.matches_n} interactive elements`)
        for (const e of allButtons.entries.slice(0, 30)) {
          const t = (e.text || "").slice(0, 80)
          if (t) console.log(`[agent]   #${e.nth} <${e.tag}>${e.attrs?.href ? " href=" + e.attrs.href.slice(0, 60) : ""}: "${t}"`)
        }
      } catch (err) {
        console.warn("[agent] Page structure scan failed (non-critical):", err instanceof Error ? err.message : String(err))
      }

      // Step: Select the resolved booking date from the calendar strip
      const dateStrings = dateSelectionStrings(bookingDate)
      console.log(`[agent] Trying to select date: ${bookingDate.toDateString()} via "${dateStrings[0]}"...`)
      let dateClicked = false
      for (const ds of dateStrings) {
        if (dateClicked) break
        try {
          await this.browser.clickByText(ds)
          await this.browser.wait("time", "2")
          const checkUrl = await this.browser.state()
          if (checkUrl.url.includes("/buytickets/")) {
            console.log(`[agent] Selected date: "${ds}"`)
            dateClicked = true
          } else {
            console.log(`[agent] "${ds}" navigated away — ignoring`)
          }
        } catch (e) {
          console.log(`[agent] Date "${ds}" not found`)
        }
      }

      // Step: Select language — try match input.language, then English
      const langCandidates = [input.language, "English", "Hindi", "Tamil", "Telugu", "Kannada"].filter(Boolean) as string[]
      for (const lang of langCandidates) {
        try {
          await this.browser.clickByText(lang)
          await this.browser.wait("time", "2")
          const checkUrl = await this.browser.state()
          if (checkUrl.url.includes("/buytickets/")) {
            console.log(`[agent] Selected language: "${lang}"`)
            break
          }
        } catch (e) {
          console.log(`[agent] Language "${lang}" not found`)
        }
      }

      // Step: Select format — try input.screenType, then "All", "2D", "3D", "IMAX"
      const fmtCandidates = [input.screenType, "All", "2D", "3D", "IMAX"].filter(Boolean) as string[]
      for (const fmt of fmtCandidates) {
        try {
          await this.browser.clickByText(fmt)
          await this.browser.wait("time", "2")
          const checkUrl = await this.browser.state()
          if (checkUrl.url.includes("/buytickets/")) {
            console.log(`[agent] Selected format: "${fmt}"`)
            break
          }
        } catch (e) {
          console.log(`[agent] Format "${fmt}" not found`)
        }
      }

      // Step: Click "Continue" if it appears — no generic "Search"
      for (const ct of ["Continue", "Show Showtimes", "View Showtimes", "Find Showtimes"]) {
        try {
          await this.browser.clickByText(ct)
          await this.browser.wait("time", "3")
          const checkUrl = await this.browser.state()
          if (checkUrl.url.includes("/buytickets/")) {
            console.log(`[agent] Clicked "${ct}"`)
            break
          } else {
            console.log(`[agent] "${ct}" navigated away — ignoring`)
          }
        } catch (e) {
          console.log(`[agent] "${ct}" not found`)
        }
      }

      // Step: Wait for theatre cards to appear
      await this.browser.wait("time", "5")

      // Re-navigate to the booking URL to cancel any stray navigation from filter clicks
      const reNavState = await this.browser.state()
      console.log(`[agent] URL before re-nav: ${reNavState.url}`)
      if (!reNavState.url.includes("/buytickets/") && movieCode && movieCode.startsWith("ET")) {
        console.log("[agent] Re-navigating to booking page...")
        const bookingNavUrl = `https://in.bookmyshow.com/buytickets/${movieSlug}-${urlCitySlug}/movie-${urlCitySlug}-${movieCode}-MT/${dateParam}`
        try {
          await this.browser.open(bookingNavUrl)
          await this.browser.wait("time", "5")
        } catch (e) {
          console.error("[agent] Re-navigation failed:", e instanceof Error ? e.message : String(e))
        }
      }

      // Final URL check before extraction
      const preExtractUrl = await this.browser.state()
      console.log(`[agent] Pre-extraction URL: ${preExtractUrl.url}`)
      if (!preExtractUrl.url.includes("/buytickets/")) {
        console.error("[agent] Still not on booking page — aborting")
        await this.setStepError("theatres", "Could not reach the booking page.")
        emitError(this.emit, "Could not reach the booking page.")
        return
      }

      // ===== THEATRE SELECTION FLOW =====

      await this.setStepComplete("theatres")

      // Step: Extract theatre list from the movie listing page
      await this.setStepActive("theatre-list", "Scanning theatres...")
      await this.browser.wait("time", "2")

      const theatreData = await extractTheatresWithShowtimes(this.browser)
      if (theatreData.length === 0) {
        console.error("[agent] No theatres found.")
        await this.setStepError("theatre-list", "No theatres found on this page.")
        emitError(this.emit, "No theatres found on BookMyShow for this movie.")
        return
      }

      console.log(`[agent] Found ${theatreData.length} theatres`)
      for (const t of theatreData) {
        console.log(`[agent]   ${t.index}. ${t.name}${t.price ? ` (${t.price})` : ""}`)
      }

      const userLat = input.lat
      const userLng = input.lng
      const theatreList = await Promise.all(
        theatreData.map(async (t) => ({
          index: t.index,
          name: t.name,
          price: t.price && t.price.trim() ? t.price.trim() : undefined,
          distance: await formatTheatreDistance(t.name, input.city, userLat, userLng),
        })),
      )

      const theatreRequestId = `theatre-${Date.now()}`
      this.emit({ type: "theatre-list", requestId: theatreRequestId, theatres: theatreList })
      await this.setStepComplete("theatre-list")

      // Wait for user to choose a theatre
      await this.setStepActive("theatre-select", "Waiting for your theatre selection...")
      let theatreResponse: string
      try {
        theatreResponse = await ResponseStore.wait(theatreRequestId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        emitError(this.emit, `Theatre selection timed out: ${msg}`)
        return
      }

      const theatreIndex = parseInt(theatreResponse, 10) - 1
      if (isNaN(theatreIndex) || theatreIndex < 0 || theatreIndex >= theatreData.length) {
        emitError(this.emit, `Invalid theatre selection: "${theatreResponse}". Please enter a number from the list.`)
        return
      }

      const selectedTheatre = theatreData[theatreIndex]
      const selectedTheatreName = selectedTheatre.name
      console.log(`[agent] User selected: ${selectedTheatreName} (index ${theatreIndex})`)

      // Extract ALL showtimes from the listing page (theatre is already on the page)
      console.log(`[agent] Extracting showtimes for ${selectedTheatreName}...`)
      await this.browser.wait("time", "2")
      const rawShowtimes = await extractShowtimes(this.browser)
      const availableShowtimes: ShowtimeInfo[] = rawShowtimes.map((st, i) => ({
        time: st, elIndex: i, href: ''
      }))
      console.log(`[agent] Found ${availableShowtimes.length} showtimes on page`)

      if (availableShowtimes.length === 0) {
        emitError(this.emit, `No showtimes found for ${selectedTheatreName}.`)
        return
      }

      await this.setStepComplete("theatre-select")

      // Apply time preference filter
      const timePref = input.time || extractTimeFromDateField(input.date)
      let filteredShowtimes = availableShowtimes
      if (timePref && filteredShowtimes.length > 0) {
        const filtered = filterShowtimesByPreference(filteredShowtimes, timePref)
        if (filtered.length > 0) filteredShowtimes = filtered
      }

      const showtimeList = filteredShowtimes.map((st, i) => ({ index: i + 1, time: st.time }))
      console.log(`[agent] Showtimes for ${selectedTheatreName}:`)
      for (const st of showtimeList) {
        console.log(`[agent]   ${st.index}. ${st.time}`)
      }

      const showtimeRequestId = `showtime-${Date.now()}`
      this.emit({ type: "showtime-list", requestId: showtimeRequestId, theatre: selectedTheatreName, showtimes: showtimeList })
      await this.setStepComplete("showtime-extract")

      // Wait for user to choose a showtime
      await this.setStepActive("showtime-select", "Waiting for your showtime selection...")
      let showtimeResponse: string
      try {
        showtimeResponse = await ResponseStore.wait(showtimeRequestId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        emitError(this.emit, `Showtime selection timed out: ${msg}`)
        return
      }

      const showtimeIndex = parseInt(showtimeResponse, 10) - 1
      if (isNaN(showtimeIndex) || showtimeIndex < 0 || showtimeIndex >= filteredShowtimes.length) {
        emitError(this.emit, `Invalid showtime selection: "${showtimeResponse}". Please enter a number from the list.`)
        return
      }

      const selectedShowtimeInfo = filteredShowtimes[showtimeIndex]
      const selectedShowtime = selectedShowtimeInfo.time
      console.log(`[agent] User selected showtime: ${selectedShowtime}`)

      // Click the showtime using Playwright's native click (trusted events)
      await this.setStepActive("showtime-select", `Opening ${selectedShowtime}...`)
      await this.browser.wait("time", "2")

      let showtimeClicked = false

      // Step 1: Find the showtime button within the theatre block, add a temp ID, scroll to view
      const findResult = await this.browser.eval<string>(`
        (function() {
          var TEMP = "_st_click";
          var theatreName = ${sq(selectedTheatreName)};
          var showtimeStr = ${sq(selectedShowtime)};
          var norm = function(s) { return (s || '').replace(/\\s+/g, ' ').trim(); };
          var scrollContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
          if (!scrollContainer) return 'noscroll';
          var children = scrollContainer.children;
          var theatreBlock = null;
          var bestLen = Infinity;
          for (var i = 0; i < children.length; i++) {
            var c = children[i];
            var t = norm(c.textContent);
            if (t.indexOf(theatreName) !== -1 && t.length < bestLen) {
              bestLen = t.length;
              theatreBlock = c;
            }
          }
          if (!theatreBlock) return 'noblk';
          var els = theatreBlock.querySelectorAll("a, button, div[role='button'], span, li");
          var best = null;
          for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (!el.offsetHeight || !el.offsetWidth) continue;
            var t = norm(el.textContent);
            if (t.indexOf(showtimeStr) !== -1 && t.length < showtimeStr.length + 30) {
              best = el; break;
            }
          }
          if (!best) return 'nost';
          best.setAttribute('id', TEMP);
          if (best.scrollIntoView) best.scrollIntoView({behavior:'instant',block:'center'});
          return 'ok';
        })()
      `)
      console.log(`[agent] Showtime find result: ${findResult}`)

      // Step 2: Click using Playwright's CSS selector (trusted events)
      if (findResult === 'ok') {
        try {
          await this.browser.click("#_st_click")
          showtimeClicked = true
        } catch (e) {
          console.warn("[agent] Playwright click failed:", e instanceof Error ? e.message : String(e))
        }
        // Clean up temp ID
        await this.browser.eval(`try { document.getElementById('_st_click').removeAttribute('id'); } catch(e) {}`)
      }

      // Step 3: Fallback — try clickByRole with aria-label
      if (!showtimeClicked) {
        try {
          const label = await this.browser.eval<string>(`
            (function() {
              var theatreName = ${sq(selectedTheatreName)};
              var showtimeStr = ${sq(selectedShowtime)};
              var norm = function(s) { return (s || '').replace(/\\s+/g, ' ').trim(); };
              var scrollContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
              if (!scrollContainer) return '';
              var children = scrollContainer.children;
              var theatreBlock = null;
              var bestLen = Infinity;
              for (var i = 0; i < children.length; i++) {
                var c = children[i];
                var t = norm(c.textContent);
                if (t.indexOf(theatreName) !== -1 && t.length < bestLen) {
                  bestLen = t.length;
                  theatreBlock = c;
                }
              }
              if (!theatreBlock) return '';
              var els = theatreBlock.querySelectorAll("[role='button']");
              for (var i = 0; i < els.length; i++) {
                var el = els[i];
                if (!el.offsetHeight || !el.offsetWidth) continue;
                var t = norm(el.textContent);
                if (t.indexOf(showtimeStr) !== -1 && t.length < showtimeStr.length + 30) {
                  var lbl = el.getAttribute('aria-label') || '';
                  if (lbl) return 'LBL:' + lbl;
                }
              }
              return '';
            })()
          `)
          if (label && label.startsWith('LBL:')) {
            const ariaLabel = label.slice(4)
            await this.browser.clickByRole("button", ariaLabel)
            showtimeClicked = true
          }
        } catch (e) {
          console.warn("[agent] clickByRole fallback failed:", e instanceof Error ? e.message : String(e))
        }
      }

      // Step 4: Last resort — clickByText
      if (!showtimeClicked) {
        try {
          await this.browser.clickByText(selectedShowtime)
          showtimeClicked = true
        } catch (e) {
          console.warn("[agent] clickByText failed:", e instanceof Error ? e.message : String(e))
        }
      }

      // Step 5: Wait for ticket popup to appear (same page, check for popup elements)
      await this.browser.wait("time", "3")
      let popupFound = false
      for (let attempt = 0; attempt < 5; attempt++) {
        const hasPopup = await this.browser.eval<string>(`
          (function() {
            var ids = ["pop_1", "pop_2", "ticketCount", "noOfTickets", "quantity-1"];
            for (var i = 0; i < ids.length; i++) {
              if (document.getElementById(ids[i])) return 'ok';
            }
            var inc = document.querySelector("[class*='plus'],[class*='increment'],[class*='add'],[aria-label*='increase'],[aria-label*='plus'],[aria-label*='ticket']");
            if (inc && inc.offsetHeight > 0 && inc.offsetWidth > 0) return 'ok';
            return 'nf';
          })()
        `)
        if (hasPopup === 'ok') {
          popupFound = true
          break
        }
        await this.browser.wait("time", "2")
      }
      console.log(`[agent] Ticket popup found: ${popupFound}`)
      if (!showtimeClicked && !popupFound) {
        console.log("[agent] Showtime click failed — none of the click strategies caused a popup to appear.")
      }
      await this.setStepComplete("showtime-select")

      // Select number of tickets
      const ticketCount = input.tickets || 2
      await this.setStepActive("seat-select", `Selecting ${ticketCount} ${ticketCount === 1 ? "ticket" : "tickets"}...`)
      await this.browser.wait("time", "3")

      const countSelected = await selectTicketCount(this.browser, ticketCount)
      if (countSelected) {
        console.log(`[agent] Ticket count set to ${ticketCount}`)
      } else {
        console.log(`[agent] Could not find ticket count selector, trying fallback by text...`)
        try {
          await this.browser.clickByText(String(ticketCount))
        } catch (e) {
          console.warn("[agent] Ticket count clickByText fallback failed:", e instanceof Error ? e.message : String(e))
        }
      }
      await this.browser.wait("time", "3")

      // Click confirm button to open the seat map
      await this.setStepActive("seat-select", "Opening seat selection...")
      let confirmClicked = false

      try {
        const found = await this.browser.eval<string>(`
          (function(){
            var labels = ["Select Seats", "Select", "Choose Seats", "View Seats", "Book Seats", "Continue"];
            var all = document.querySelectorAll("button, a, div[role='button'], li, span, div");
            var best = null;
            var bestScore = 0;
            for (var i = 0; i < all.length; i++) {
              if (all[i].offsetHeight === 0) continue;
              var t = (all[i].textContent || "").trim().replace(/\\s+/g, " ");
              var lower = t.toLowerCase();
              for (var li = 0; li < labels.length; li++) {
                if (lower === labels[li].toLowerCase()) {
                  best = all[i]; bestScore = 100; break;
                }
              }
              if (bestScore === 100) break;
              for (var lj = 0; lj < labels.length; lj++) {
                if (lower.indexOf(labels[lj].toLowerCase()) !== -1 && t.length < 50) {
                  if (bestScore < 50) { best = all[i]; bestScore = 50; }
                }
              }
            }
            if (best) {
              var target = best.tagName === "DIV" && !best.getAttribute("role") ? (best.querySelector("button, a, [role='button']") || best) : best;
              try { target.click(); return "clicked:" + (target.textContent || "").trim().slice(0, 40); } catch(e) { return "err:" + e.message; }
            }
            return "nf";
          })()
        `)
        if (found && (found.startsWith("clicked") || found.startsWith("err:"))) {
          console.log(`[agent] Confirm eval: ${found}`)
          confirmClicked = found.startsWith("clicked")
        }
      } catch (e) {
        console.warn("[agent] Confirm eval failed:", e instanceof Error ? e.message : String(e))
      }

      if (!confirmClicked) {
        for (const ct of ["Select Seats", "Select", "Choose Seats", "Continue"]) {
          try {
            await this.browser.clickByText(ct)
            console.log(`[agent] Clicked confirm via clickByText: "${ct}"`)
            confirmClicked = true
            break
          } catch (e) { /* ignore */ }
        }
      }
      await this.browser.wait("time", "5")
      await this.setStepComplete("seat-select")

      // Let user select seats directly on the BMS page
      await this.setStepActive("seat-select-user", "Please select your seats on the BookMyShow page...")
      const seatRequestId = `seat-${Date.now()}`
      this.emit({ type: "seat-select-required", requestId: seatRequestId })

      let seatResponse: string
      try {
        seatResponse = await ResponseStore.wait(seatRequestId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        emitError(this.emit, `Seat selection timed out: ${msg}`)
        return
      }

      // Read selected seats from the browser
      const selectedSeatIds = await getSelectedSeats(this.browser)
      if (!selectedSeatIds || selectedSeatIds.length === 0) {
        console.warn("[agent] No seats detected from BMS page — continuing anyway")
      } else {
        console.log(`[agent] Detected selected seats: ${selectedSeatIds.join(", ")}`)
      }
      await this.setStepComplete("seat-select-user")
      await this.setStepComplete("seat-verify")

      // Proceed to payment flow
      await this.setStepActive("payment", "Proceeding to checkout...")

      // Wait for seat selection overlay to settle, then click BMS's "Continue" button
      // to move from the seat selection overlay to the payment/checkout page
      console.log("[agent] Waiting for seat selection to finalize...")
      await this.browser.wait("time", "3")

      console.log("[agent] Clicking BMS Continue button...")
      let continueClicked = false
      for (const ct of ["Continue", "Proceed", "Confirm Seats", "Select Seats"]) {
        try {
          await this.browser.clickByText(ct)
          console.log(`[agent] Clicked BMS "${ct}" to proceed to payment`)
          continueClicked = true
          break
        } catch (e) { /* not found, try next */ }
      }

      if (!continueClicked) {
        // Fallback: try finding any large visible button with seat-related text
        const found = await this.browser.eval<string>(`
          (function() {
            var labels = ["Continue", "Proceed", "Confirm Seats", "Select Seats", "Done"];
            var all = document.querySelectorAll("button, a, div[role='button'], div.button");
            for (var i = 0; i < all.length; i++) {
              var el = all[i];
              if (!el.offsetHeight || !el.offsetWidth) continue;
              var t = (el.textContent || "").trim().replace(/\\s+/g, " ");
              var lower = t.toLowerCase();
              for (var li = 0; li < labels.length; li++) {
                if (lower.indexOf(labels[li].toLowerCase()) !== -1) {
                  try { el.click(); return "clicked:" + labels[li]; } catch(e) { return "err:" + e.message; }
                }
              }
            }
            return "nf";
          })()
        `)
        if (found && found.startsWith("clicked")) {
          console.log(`[agent] BMS continue fallback: ${found}`)
          continueClicked = true
        }
      }

      // Wait for the payment page to load
      await this.browser.wait("time", "5")

      // Click Pay button
      console.log("[agent] Clicking Pay button...")
      const payClicked = await clickPayButton(this.browser)
      if (!payClicked) {
        console.error("[agent] Pay button not found.")
        emitError(this.emit, "Could not find the Pay button.")
        return
      }
      console.log("[agent] Pay clicked")
      await this.browser.wait("time", "3")

      // Accept terms
      console.log("[agent] Accepting terms...")
      const acceptClicked = await clickAcceptTerms(this.browser)
      if (!acceptClicked) {
        console.error("[agent] Accept button not found.")
        emitError(this.emit, "Could not find the Accept (terms) button.")
        return
      }
      console.log("[agent] Terms accepted")
      await this.browser.wait("time", "3")

      // Skip food
      console.log("[agent] Skipping food...")
      const skipClicked = await clickSkipButton(this.browser)
      if (!skipClicked) {
        console.warn("[agent] Skip button not found — continuing anyway")
      } else {
        console.log("[agent] Food skipped")
      }
      await this.browser.wait("time", "2")

      // Ask user for email/phone credentials
      await this.setStepActive("payment", "Waiting for your contact details...")
      const credentialsRequestId = `credentials-${Date.now()}`
      this.emit({ type: "credentials-required", requestId: credentialsRequestId })

      let credentialsResponse: string
      try {
        credentialsResponse = await ResponseStore.wait(credentialsRequestId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        emitError(this.emit, `Credentials input timed out: ${msg}`)
        return
      }

      // Parse email and phone from response (format: "email|phone")
      const parts = credentialsResponse.split("|")
      const userEmail = (parts[0] || "").trim()
      const userPhone = (parts[1] || "").trim()
      if (!userEmail || !userPhone) {
        emitError(this.emit, "Invalid credentials provided. Please enter both email and phone number.")
        return
      }

      console.log(`[agent] Filling user info: ${userEmail} / ${userPhone}`)
      const infoFilled = await fillUserInfo(this.browser, userEmail, userPhone)
      if (!infoFilled) {
        console.warn("[agent] User info fill failed — continuing anyway (may already be on payment page)")
      } else {
        console.log("[agent] User info filled")
      }
      await this.browser.wait("time", "2")

      // Submit user info
      console.log("[agent] Submitting user info...")
      const submitted = await submitUserInfo(this.browser)
      if (!submitted) {
        console.warn("[agent] Submit button not found — may already be on payment page")
      } else {
        console.log("[agent] User info submitted")
      }
      await this.browser.wait("time", "5")

      await this.setStepComplete("payment")
      await this.setStepComplete("ready")
      this.emit({ type: "payment-ready" })
      emitComplete(this.emit, {
        movie: input.movie,
        city: cityName,
        theatres: theatreList.map((t) => ({
          name: t.name,
          distance: "",
          rating: "",
          formats: ["Standard"],
          showtimes: t.index === theatreIndex + 1 ? availableShowtimes.map(st => st.time) : [],
          priceStartsFrom: "",
          languages: ["Original"],
          seatAvailability: "",
          recommended: false,
          specialLabels: [],
        })),
        reasoning: selectedSeatIds.length > 0
          ? `Your **${selectedSeatIds.length}** ${selectedSeatIds.length === 1 ? "seat is" : "seats are"} selected at **${selectedTheatreName}** for **${selectedShowtime}**. Please open the BookMyShow page to complete the payment.`
          : `Seats are selected at **${selectedTheatreName}** for **${selectedShowtime}**. Please open the BookMyShow page to complete the payment.`,
        booking: {
          theatre: selectedTheatreName,
          showtime: selectedShowtime,
          seats: selectedSeatIds,
          ticketCount,
          date: input.date,
        },
      })
    } catch (err) {
      try {
        await this.browser.close()
      } catch (closeErr) {
        console.error("[agent] browser.close failed:", closeErr instanceof Error ? closeErr.message : String(closeErr))
      }

      const message = err instanceof Error ? err.message : String(err)
      console.error("[agent] run failed:", message)
      if (err instanceof Error && err.stack) console.error("[agent] stack:", err.stack)
      emitError(this.emit, message)
    }
  }
}

export type { AgentInput, AgentResult, AgentStep, AgentEvent } from "./types"
