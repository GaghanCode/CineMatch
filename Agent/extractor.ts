import type { BrowserSession } from "./browser"
import type { AgentTheatre, SeatLayout } from "./types"

interface BMSMovieCard {
  title?: string
  language?: string
  format?: string
  link?: string
}

interface BMSSearchSuggestion {
  name?: string
  url?: string
  type?: string
}

export async function extractSearchResults(browser: BrowserSession): Promise<BMSSearchSuggestion[]> {
  try {
    const results = await browser.eval<BMSSearchSuggestion[]>(`
      JSON.stringify(
        Array.from(document.querySelectorAll('[class*="suggestion"], [class*="search-result"], [class*="auto-suggest"] a, [data-onclick*="search"]'))
          .map(el => ({
            name: el.textContent?.trim() || el.getAttribute('data-name') || '',
            url: el.getAttribute('href') || '',
            type: el.getAttribute('data-type') || el.getAttribute('data-category') || ''
          }))
          .filter(item => item.name)
      )
    `)
    return Array.isArray(results) ? results : []
  } catch (err) {
    console.error("[extractor] extractSearchResults failed:", err instanceof Error ? err.message : String(err))
    return await extractSearchResultsFallback(browser)
  }
}

async function extractSearchResultsFallback(browser: BrowserSession): Promise<BMSSearchSuggestion[]> {
  try {
    const pageText = await browser.eval<string>(`
      JSON.stringify(document.body.innerText?.substring(0, 3000) || '')
    `)
    return pageText ? [{ name: pageText.slice(0, 100) }] : []
  } catch (err) {
    console.error("[extractor] extractSearchResultsFallback failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function extractMovieListing(browser: BrowserSession): Promise<BMSMovieCard[]> {
  try {
    const cards = await browser.eval<BMSMovieCard[]>(`
      JSON.stringify(
        Array.from(document.querySelectorAll('[class*="movie-card"], [class*="card"]')).slice(0, 10)
          .map(card => {
            const link = card.closest('a') || card.querySelector('a')
            return {
              title: (card.querySelector('[class*="title"], [class*="name"], h3, h4')?.textContent || '').trim(),
              language: (card.querySelector('[class*="language"]')?.textContent || '').trim(),
              format: (card.querySelector('[class*="format"], [class*="dimension"]')?.textContent || '').trim(),
              link: link?.getAttribute('href') || ''
            }
          })
          .filter(item => item.title)
      )
    `)
    return Array.isArray(cards) ? cards : []
  } catch (err) {
    console.error("[extractor] extractMovieListing failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function extractTheatres(browser: BrowserSession): Promise<AgentTheatre[]> {
  try {
    const theatres = await browser.eval<AgentTheatre[]>(`
      JSON.stringify(
        (() => {
          const theatreElements = document.querySelectorAll('[class*="list"], [class*="venue"], [class*="theatre"]');
          if (theatreElements.length === 0) return [];
          
          const results = [];
          const seen = new Set();
          
          theatreElements.forEach(el => {
            const nameEl = el.querySelector('[class*="name"], h2, h3, [class*="venue"]');
            const name = nameEl?.textContent?.trim();
            if (!name || seen.has(name)) return;
            seen.add(name);
            
            const distanceEl = el.querySelector('[class*="distance"], [class*="km"]');
            const distance = distanceEl?.textContent?.trim() || '';
            
            const ratingEl = el.querySelector('[class*="rating"], [class*="star"]');
            const rating = ratingEl?.textContent?.trim() || '';
            
            const formatEls = el.querySelectorAll('[class*="format"], [class*="dimension"], [class*="experience"]');
            const formats = Array.from(formatEls).map(f => f.textContent?.trim()).filter(Boolean);
            
            const showtimeEls = el.querySelectorAll('[class*="showtime"], [class*="time"], a[class*="btn"]');
            const showtimes = Array.from(showtimeEls).map(s => s.textContent?.trim()).filter(Boolean);
            
            const priceEl = el.querySelector('[class*="price"], [class*="rate"], [class*="rupee"]');
            const price = priceEl?.textContent?.trim() || '';
            
            const langEl = el.querySelector('[class*="lang"]');
            const language = langEl?.textContent?.trim() || '';
            
            const seatEl = el.querySelector('[class*="seat"], [class*="availability"]');
            const seats = seatEl?.textContent?.trim() || '';
            
            const labelEls = el.querySelectorAll('[class*="tag"], [class*="badge"], [class*="label"]');
            const labels = Array.from(labelEls).map(l => l.textContent?.trim()).filter(Boolean);
            
            results.push({
              name,
              distance,
              rating,
              formats: formats.length ? formats : ['Standard'],
              showtimes: showtimes.length ? showtimes : [],
              priceStartsFrom: price,
              languages: language ? [language] : [],
              seatAvailability: seats,
              recommended: false,
              specialLabels: labels
            });
          });
          
          return results;
        })()
      )
    `)

    return Array.isArray(theatres) ? theatres : []
  } catch (err) {
    console.error("[extractor] extractTheatres failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function extractTheatresFromBookingPage(browser: BrowserSession): Promise<AgentTheatre[]> {
  try {
    const names = await extractTheatreNames(browser)
    if (names.length === 0) return []
    const theatreNames = names.map((n) => n.name)
    const result = await browser.eval<unknown>(`
      (() => {
        var R = /\\b(0?[1-9]|1[0-2]):[0-5][0-9][\\s\\u00A0\\u202F]*(AM|PM)/i;
        var all = document.querySelectorAll("div,span,a,button,li");
        var results = [];
        var showtimeNodes = [];
        for (var i = 0; i < all.length; i++) {
          var t = (all[i].textContent || "").trim();
          if (R.test(t) && t.length < 50) showtimeNodes.push({ el: all[i], text: t });
        }
        for (var si = 0; si < showtimeNodes.length && results.length < 10; si++) {
          var node = showtimeNodes[si].el;
          var text = showtimeNodes[si].text;
          var match = text.match(R);
          var time = match ? match[0].trim() : "";
          var parent = node.parentElement;
          var found = false;
          for (var ci = 0; ci < results.length; ci++) {
            if (results[ci].container === parent) { results[ci].showtimes.push(time); found = true; break; }
          }
          if (!found) {
            var nameEl = parent.querySelector("[class*='venue'], [class*='name'], h2, h3");
            var name = nameEl ? (nameEl.textContent || "").trim() : "";
            if (!name) {
              var kids = parent.querySelectorAll("*");
              for (var ki = 0; ki < kids.length; ki++) {
                var kt = (kids[ki].textContent || "").trim();
                if (kt.length > 5) { name = kt; break; }
              }
            }
            if (name && name !== parent.textContent) {
              results.push({ container: parent, name: name, showtimes: [time] });
            }
          }
        }
        var output = results.map(function(r) { return { name: r.name, showtimes: r.showtimes }; });
        return JSON.stringify(output);
      })()
    `)
    let theatreData: Array<{ name: string; showtimes: string[] }>
    if (typeof result === "string") {
      theatreData = JSON.parse(result) as Array<{ name: string; showtimes: string[] }>
    } else if (Array.isArray(result)) {
      theatreData = result as Array<{ name: string; showtimes: string[] }>
    } else {
      return []
    }
    if (!Array.isArray(theatreData)) return []
    return theatreData.map((t) => ({
      name: t.name,
      distance: "",
      rating: "",
      formats: ["Standard"],
      showtimes: t.showtimes,
      priceStartsFrom: "",
      languages: ["Original"],
      seatAvailability: "",
      recommended: false,
      specialLabels: [],
    }))
  } catch (err) {
    console.error("[extractor] extractTheatresFromBookingPage failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function extractTheatreNames(browser: BrowserSession): Promise<{ index: number; name: string }[]> {
  try {
    const result = await browser.eval<unknown>(`
      (() => {
        var c = function(r){var s=r.replace(/\\s+/g," "),d=["Cancellation available","Non-cancellable","Cancellation","Non cancellable"];for(var di=0;di<d.length;di++){var i=s.indexOf(d[di]);if(i>0)return s.substring(0,i).trim()}return s};
        var P = ["PVR","INOX","Cinepolis","Miraj","AMB","Sri","Robin","Victory","Movietime","Carnival","AGS","Mukta","Screen","Mythri","Shubham","S2","CineMAX","Bharat","Shivam","Vinayaka","Venkateshwara","Rockline","Gopalan","Swagath","V Cinemas","Movietime"];
        var seen = new Set();
        var results = [];
        var pushUnique = function(t) {
          var name = c(t);
          if (name && !seen.has(name)) { seen.add(name); results.push({ index: results.length + 1, name: name }); }
        };
        var candidates = document.querySelectorAll("h2, h3, h4, [class*='__venue'], [class*='venue'], a[class*='venue'], a[class*='name'], [class*='theatre-name'], [class*='__name']");
        for (var ci = 0; ci < candidates.length && results.length < 15; ci++) {
          var t = (candidates[ci].textContent || "").trim().replace(/\\s+/g, " ");
          if (!t || t.length < 3) continue;
          for (var pi = 0; pi < P.length; pi++) { if (t.indexOf(P[pi]) === 0) { pushUnique(t); break; } }
        }
        if (results.length === 0) {
          var fallback = document.querySelectorAll("div, span, a, button, li");
          for (var fi = 0; fi < fallback.length && results.length < 15; fi++) {
            var ft = (fallback[fi].textContent || "").trim().replace(/\\s+/g, " ");
            if (!ft || ft.length < 3) continue;
            for (var pi2 = 0; pi2 < P.length; pi2++) { if (ft.indexOf(P[pi2]) === 0) { pushUnique(ft); break; } }
          }
        }
        return JSON.stringify(results);
      })()
    `)
    if (Array.isArray(result)) return result as { index: number; name: string }[]
    if (typeof result === "string") return JSON.parse(result)
    return []
  } catch (err) {
    console.error("[extractor] extractTheatreNames failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function clickTheatreByIndex(browser: BrowserSession, index: number): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (() => {
        var c = function(r){var s=r.replace(/\\s+/g," "),d=["Cancellation available","Non-cancellable","Cancellation","Non cancellable"];for(var di=0;di<d.length;di++){var i=s.indexOf(d[di]);if(i>0)return s.substring(0,i).trim()}return s};
        var P = ["PVR","INOX","Cinepolis","Miraj","AMB","Sri","Robin","Victory","Movietime","Carnival","AGS","Mukta","Screen","Mythri","Shubham","S2","CineMAX","Bharat","Shivam","Vinayaka","Venkateshwara","Rockline","Gopalan","Swagath","V Cinemas","Movietime"];
        var R = /\\b(0?[1-9]|1[0-2]):[0-5][0-9][\\s\\u00A0\\u202F]*(AM|PM)\\b/i;
        var MAX_NAME_LENGTH = 100;
        var seenClean = new Set();
        var count = 0;
        var tryClick = function(el) {
          var target = el.closest("a") || el.closest("button") || el.querySelector("a, button") || el;
          try { target.click(); return true; } catch(e) { return false; }
        };
        var scan = document.querySelectorAll("h2, h3, h4, a, div, span, li, button");
        for (var si = 0; si < scan.length; si++) {
          var raw = (scan[si].textContent || "").trim().replace(/\\s+/g, " ");
          if (!raw || raw.length < 3 || raw.length > MAX_NAME_LENGTH) continue;
          if (R.test(raw)) continue;
          for (var pi = 0; pi < P.length; pi++) {
            if (raw.indexOf(P[pi]) === 0) {
              var name = c(raw);
              if (name && !seenClean.has(name)) {
                seenClean.add(name);
                if (count === ${index}) { return tryClick(scan[si]) ? "clicked" : "error"; }
                count++;
              }
              break;
            }
          }
        }
        return "not found";
      })()
    `)
    return typeof result === "string" && result === "clicked"
  } catch (err) {
    console.error("[extractor] clickTheatreByIndex failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export type ShowtimeInfo = { time: string; elIndex: number; href: string }
export type TheatreWithShowtimes = { index: number; name: string; rawName: string; showtimes: ShowtimeInfo[]; href: string; price?: string }

export async function extractTheatresWithShowtimes(browser: BrowserSession): Promise<TheatreWithShowtimes[]> {
  try {
    const P = JSON.stringify(["PVR","INOX","Cinepolis","Miraj","AMB","Sri","Robin","Victory","Movietime","Carnival","AGS","Mukta","Screen","Mythri","Shubham","S2","CineMAX","Bharat","Shivam","Vinayaka","Venkateshwara","Rockline","Gopalan","Swagath","V Cinemas","Movietime"])
    const result = await browser.eval<unknown>(`
      (function() {
        var P = ${P};
        var TR = /\\b(0?[1-9]|1[0-2]):[0-5][0-9][\\s\\u00A0\\u202F]*(AM|PM)/i;
        var c = function(r){var s=r.replace(/\\s+/g," "),d=["Cancellation available","Non-cancellable","Cancellation","Non cancellable"];for(var di=0;di<d.length;di++){var i=s.indexOf(d[di]);if(i>0)return s.substring(0,i).trim()}return s};
        var seenClean = new Set();
        var theatreNames = [];
        var theatreEls = [];
        var allEls = document.querySelectorAll("h2, h3, h4, a, div, span, li, button");
        for (var i = 0; i < allEls.length; i++) {
          var raw = (allEls[i].textContent || "").trim().replace(/\\s+/g, " ");
          if (!raw || raw.length < 3 || raw.length > 100) continue;
          if (TR.test(raw)) continue;
          for (var pi = 0; pi < P.length; pi++) {
            if (raw.indexOf(P[pi]) === 0) {
              var clean = c(raw);
              if (clean && !seenClean.has(clean)) {
                seenClean.add(clean);
                theatreNames.push({ name: clean, rawName: raw });
                theatreEls.push(allEls[i]);
              }
              break;
            }
          }
        }
        var PRICE_RE = /(?:₹|Rs\.?|INR)\s*\d[\d,]*/i;
        var priceFor = function(name) {
          var found = "";
          for (var pi = 0; pi < theatreNames.length; pi++) {
            if (theatreNames[pi].name !== name) continue;
            var node = theatreEls[pi];
            for (var up = 0; up < 8 && node; up++) {
              var t = (node.textContent || "").replace(/\\s+/g, " ");
              var m = t.match(PRICE_RE);
              if (m) { found = m[0].trim(); break; }
              node = node.parentElement;
            }
            break;
          }
          return found;
        };
        var allTimeEls = [];
        var allElements = document.querySelectorAll("div, a, button, span, li");
        var globalTimeIndex = 0;
        for (var i = 0; i < allElements.length; i++) {
          var el = allElements[i];
          if (!el.offsetHeight || !el.offsetWidth) continue;
          var txt = (el.textContent || "").trim();
          var m = txt.match(TR);
          if (m && m[0].trim().length > 2) {
            var clickable = el.closest('a') || el.closest('button') || (el.tagName !== 'DIV' ? el : el.querySelector('a, button'));
            var href = '';
            if (clickable) {
              href = clickable.getAttribute('href') || clickable.getAttribute('data-href') || '';
            }
            allTimeEls.push({ el: el, time: m[0].trim(), elIndex: globalTimeIndex++, href: href });
          }
        }
        var theatreHrefs = {};
        for (var ti = 0; ti < theatreNames.length; ti++) theatreHrefs[ti] = '';
        var theatreLinkEls = document.querySelectorAll("a, button, div[role='button']");
        for (var li = 0; li < theatreLinkEls.length; li++) {
          var linkEl = theatreLinkEls[li];
          var linkText = (linkEl.textContent || "").trim().replace(/\\s+/g, " ");
          if (!linkText || linkText.length < 5) continue;
          for (var ti = 0; ti < theatreNames.length; ti++) {
            if (!theatreHrefs[ti] && linkText.indexOf(theatreNames[ti].name) !== -1) {
              var href = linkEl.getAttribute('href') || '';
              if (href && href.indexOf('/buytickets/') !== -1) {
                theatreHrefs[ti] = href.startsWith('http') ? href : 'https://in.bookmyshow.com' + href;
              }
            }
          }
        }
        var theatreShowtimes = {};
        for (var ti = 0; ti < theatreNames.length; ti++) theatreShowtimes[ti] = [];
        for (var si = 0; si < allTimeEls.length; si++) {
          var cur = allTimeEls[si].el.parentElement;
          var foundTheatre = -1;
          for (var up = 0; up < 10 && cur; up++) {
            var text = (cur.textContent || "").replace(/\\s+/g, " ");
            for (var ti = 0; ti < theatreNames.length; ti++) {
              if (text.indexOf(theatreNames[ti].name) !== -1 || text.indexOf(theatreNames[ti].rawName) !== -1) {
                var nameCount = 0;
                for (var ni = 0; ni < theatreNames.length; ni++) {
                  if (text.indexOf(theatreNames[ni].name) !== -1 || text.indexOf(theatreNames[ni].rawName) !== -1) {
                    nameCount++;
                    if (nameCount > 1) break;
                  }
                }
                if (nameCount === 1) { foundTheatre = ti; break; }
              }
            }
            if (foundTheatre >= 0) break;
            cur = cur.parentElement;
          }
          if (foundTheatre >= 0) {
            var info = { time: allTimeEls[si].time, elIndex: allTimeEls[si].elIndex, href: allTimeEls[si].href };
            theatreShowtimes[foundTheatre].push(info);
          }
        }
        var results = [];
        for (var ti = 0; ti < theatreNames.length && ti < 15; ti++) {
          var times = [];
          var seen = new Set();
          for (var si = 0; si < theatreShowtimes[ti].length; si++) {
            if (!seen.has(theatreShowtimes[ti][si].time)) {
              seen.add(theatreShowtimes[ti][si].time);
              times.push(theatreShowtimes[ti][si]);
            }
          }
          times.sort(function(a, b) {
            var ha = parseInt(a.time.match(/\\d+/)[0], 10), hb = parseInt(b.time.match(/\\d+/)[0], 10);
            if (a.time.indexOf("PM") !== -1 && ha !== 12) ha += 12;
            if (a.time.indexOf("AM") !== -1 && ha === 12) ha = 0;
            if (b.time.indexOf("PM") !== -1 && hb !== 12) hb += 12;
            if (b.time.indexOf("AM") !== -1 && hb === 12) hb = 0;
            return ha - hb;
          });
          results.push({ index: ti + 1, name: theatreNames[ti].name, rawName: theatreNames[ti].rawName, showtimes: times, href: theatreHrefs[ti] || '', price: priceFor(theatreNames[ti].name) });
        }
        return JSON.stringify(results);
      })()
    `)
    if (Array.isArray(result)) return result as { index: number; name: string; rawName: string; showtimes: ShowtimeInfo[]; href: string; price?: string }[]
    if (typeof result === "string") return JSON.parse(result)
    return []
  } catch (err) {
    console.error("[extractor] extractTheatresWithShowtimes failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function extractShowtimes(browser: BrowserSession): Promise<string[]> {
  try {
    const result = await browser.eval<unknown>(`
      (function() {
        var R = /\\b(0?[1-9]|1[0-2]):[0-5][0-9][\\s\\u00A0\\u202F]*(AM|PM)/i;
        var all = document.querySelectorAll("div, a, button, span, li");
        var seen = new Set();
        var results = [];
        for (var i = 0; i < all.length; i++) {
          if (!all[i].offsetHeight || !all[i].offsetWidth) continue;
          var txt = (all[i].textContent || "").trim();
          var m = txt.match(R);
          if (m) {
            var time = m[0].trim();
            if (time.length > 2 && !seen.has(time)) { seen.add(time); results.push(time); }
          }
        }
        return JSON.stringify(results);
      })()
    `)
    if (Array.isArray(result)) return result as string[]
    if (typeof result === "string") return JSON.parse(result)
    return []
  } catch (err) {
    console.error("[extractor] extractShowtimes failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function clickShowtimeByIndex(browser: BrowserSession, index: number): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        var R = /\\b(0?[1-9]|1[0-2]):[0-5][0-9][\\s\\u00A0\\u202F]*(AM|PM)/i;
        var all = document.querySelectorAll("div, a, button, span, li");
        var c = 0;
        for (var i = 0; i < all.length; i++) {
          if (!all[i].offsetHeight || !all[i].offsetWidth) continue;
          var t = (all[i].textContent || "").trim();
          if (R.test(t)) {
            if (c === ${index}) {
              try { all[i].click(); return "clicked"; } catch(e) { return "error: " + e.message; }
            }
            c++;
          }
        }
        return "not found";
      })()
    `)
    return typeof result === "string" && result === "clicked"
  } catch (err) {
    console.error("[extractor] clickShowtimeByIndex failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function selectTicketCount(browser: BrowserSession, count: number): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function(){
        var target = ${count};
        var bmsIds = ["pop_1", "pop_2", "quantity-" + target, "ticketCount", "ticket-count", "noOfTickets"];
        for (var bi = 0; bi < bmsIds.length; bi++) {
          var el = document.getElementById(bmsIds[bi]);
          if (!el) continue;
          if (el.tagName === "SELECT") {
            var opts = el.querySelectorAll("option");
            for (var oi = 0; oi < opts.length; oi++) {
              if (parseInt(opts[oi].value, 10) === target) { el.value = opts[oi].value; el.dispatchEvent(new Event("change", {bubbles:true})); return "dropdown " + opts[oi].value; }
            }
          } else {
            try { el.click(); return "clicked " + bmsIds[bi]; } catch(e) {}
          }
        }
        var inc = document.querySelector("[class*='plus'],[class*='increment'],[class*='add'],button[aria-label*='increase'],button[aria-label*='plus']");
        var dec = document.querySelector("[class*='minus'],[class*='decrement'],button[aria-label*='decrease'],button[aria-label*='minus']");
        if (inc) {
          var display = document.querySelector("[class*='count'],[class*='value'],[class*='number']");
          var cur = display ? parseInt(display.textContent, 10) : 0;
          if (!isNaN(cur)) {
            var needed = target - cur;
            for (var ci = 0; ci < needed; ci++) { inc.click(); }
            if (needed > 0) return "incremented " + needed;
          }
        }
        var allSelects = document.querySelectorAll("select");
        for (var si = 0; si < allSelects.length; si++) {
          var sel = allSelects[si];
          if (sel.offsetHeight === 0) continue;
          if (sel.closest("[class*='search'],[class*='filter']")) continue;
          var opts = sel.querySelectorAll("option");
          for (var oi = 0; oi < opts.length; oi++) {
            if (parseInt(opts[oi].value, 10) === target) { sel.value = opts[oi].value; sel.dispatchEvent(new Event("change", {bubbles:true})); return "generic-dropdown " + opts[oi].value; }
          }
        }
        var all = document.querySelectorAll("li, div[role='button'], button, span, div");
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          if (!el.offsetHeight) continue;
          var t = (el.textContent || "").trim();
          if (t === String(target)) { try { el.click(); return "clicked " + t; } catch(e) {} }
        }
        return "nf";
      })()
    `)
    return typeof result === "string" && (result.startsWith("clicked") || result.startsWith("dropdown") || result.startsWith("generic-dropdown") || result.startsWith("incremented"))
  } catch (err) {
    console.error("[extractor] selectTicketCount failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

// TEMPORARY: Investigate BMS seat-selection DOM via multiple small evals
async function probe(browser: BrowserSession, label: string, js: string): Promise<string> {
  try {
    const raw = await browser.eval<string>(js)
    return `=== ${label} ===\n${raw}`
  } catch (err) {
    return `=== ${label} ===\nERROR: ${err instanceof Error ? err.message : String(err)}`
  }
}

export async function investigateSeatPage(browser: BrowserSession): Promise<string> {
  const parts: string[] = []

  parts.push(await probe(browser, "PAGE INFO", `
    (function(){
      var kids = Array.from(document.body.children).slice(0,15).map(function(c){ return '<'+c.tagName.toLowerCase()+(c.id?' id='+c.id:'')+(typeof c.className==='string'?c.className.slice(0,60):'') }).join(', ');
      return 'url=' + window.location.href + '\\ntitle=' + document.title + '\\ncanvas=' + document.querySelectorAll('canvas').length + '\\nsvg=' + document.querySelectorAll('svg').length + '\\niframe=' + document.querySelectorAll('iframe').length + '\\nreactVirt=' + document.querySelectorAll('[class*="ReactVirtualized"]').length + '\\nbodyKids: ' + kids;
    })()
  `))

  parts.push(await probe(browser, "TAG COUNTS", `
    (function(){
      return 'div=' + document.querySelectorAll('div').length + ' span=' + document.querySelectorAll('span').length + ' a=' + document.querySelectorAll('a').length + ' button=' + document.querySelectorAll('button').length + ' svg=' + document.querySelectorAll('svg').length + ' rect=' + document.querySelectorAll('rect').length + ' circle=' + document.querySelectorAll('circle').length + ' path=' + document.querySelectorAll('path').length + ' text=' + document.querySelectorAll('text').length + ' g=' + document.querySelectorAll('g').length + ' canvas=' + document.querySelectorAll('canvas').length + ' iframe=' + document.querySelectorAll('iframe').length + ' section=' + document.querySelectorAll('section').length + ' article=' + document.querySelectorAll('article').length;
    })()
  `))

  parts.push(await probe(browser, "SVG COUNT & STRUCTURE", `
    (function(){
      var svgs = document.querySelectorAll('svg');
      var out = 'SVGs: ' + svgs.length;
      if (svgs.length === 0) return out;
      for (var i = 0; i < svgs.length; i++) {
        var s = svgs[i];
        out += '\\n['+i+'] id=' + (s.id||'') + ' viewBox=' + (s.getAttribute('viewBox')||'') + ' classes=' + (typeof s.className==='string'?s.className.slice(0,80):(s.className&&s.className.baseVal?s.className.baseVal.slice(0,80):''));
        var kids = s.querySelectorAll('rect,circle,path,text,g,ellipse');
        out += ' childCount=' + kids.length;
        var r = s.querySelectorAll('rect,circle');
        if (r.length > 0) {
          out += '\\n  First 8 rect/circle:';
          for (var j = 0; j < Math.min(r.length, 8); j++) {
            var e = r[j];
            var attrs = '';
            for (var k = 0; k < e.attributes.length; k++) {
              var a = e.attributes[k];
              attrs += ' ' + a.name + '=' + a.value.slice(0, 25);
            }
            var cls = typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal ? e.className.baseVal : '');
            out += '\\n    ['+j+'] <'+e.tagName.toLowerCase()+'> class="'+cls.slice(0,60)+'"' + attrs;
          }
        }
      }
      return out;
    })()
  `))

  parts.push(await probe(browser, "BEM CLASSES (seat-related)", `
    (function(){
      var all = document.querySelectorAll('*');
      var seen = {};
      for (var i = 0; i < all.length; i++) {
        var c = all[i].className;
        var parts = [];
        if (typeof c === 'string') parts = c.split(/\\s+/);
        else if (c && c.baseVal && typeof c.baseVal === 'string') parts = c.baseVal.split(/\\s+/);
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j].trim();
          if (p && (p.indexOf('seat') !== -1 || p.indexOf('Seat') !== -1 || p.indexOf('--') !== -1 || p.indexOf('available') !== -1 || p.indexOf('booked') !== -1 || p.indexOf('selected') !== -1)) seen[p] = (seen[p]||0) + 1;
        }
      }
      var keys = Object.keys(seen);
      if (keys.length === 0) return 'no seat-related BEM classes';
      return keys.map(function(k){ return k + '(' + seen[k] + ')'; }).join(', ');
    })()
  `))

  parts.push(await probe(browser, "NEXT DATA (__NEXT_DATA__ or __INITIAL_STATE__)", `
    (function(){
      var data = window.__NEXT_DATA__ || window.__INITIAL_STATE__ || window.__INITIAL_PROPS__ || window.__DATA__ || window.__PRELOADED_STATE__;
      if (!data) return 'none found';
      var d = typeof data === 'string' ? data : JSON.stringify(data);
      return d.slice(0, 3000);
    })()
  `))

  parts.push(await probe(browser, "ALL LINKS AND FONTS", `
    (function(){
      var links = document.querySelectorAll('link[href]');
      var out = '';
      for (var i = 0; i < links.length; i++) {
        var l = links[i];
        out += '\\n' + l.rel + ' ' + (l.href||'').slice(0,120);
      }
      return out;
    })()
  `))

  parts.push(await probe(browser, "SVG TEXT ELEMENTS", `
    (function(){
      var texts = document.querySelectorAll('svg text');
      var out = 'Total text elements: ' + texts.length;
      for (var i = 0; i < Math.min(texts.length, 20); i++) {
        var t = texts[i];
        out += '\\n['+i+'] text="' + (t.textContent||'').trim().slice(0,30) + '" x=' + (t.getAttribute('x')||'') + ' y=' + (t.getAttribute('y')||'') + ' class=' + (typeof t.className === 'string' ? t.className.slice(0,50) : (t.className && t.className.baseVal ? t.className.baseVal.slice(0,50) : ''));
      }
      return out;
    })()
  `))

  parts.push(await probe(browser, "SVG GROUPS", `
    (function(){
      var gs = document.querySelectorAll('svg g');
      var out = 'Total groups: ' + gs.length;
      for (var i = 0; i < Math.min(gs.length, 10); i++) {
        var g = gs[i];
        var rects = g.querySelectorAll('rect,circle').length;
        var txts = Array.from(g.querySelectorAll('text')).map(function(t){ return (t.textContent||'').trim(); }).filter(Boolean).join(', ');
        out += '\\n['+i+'] class=' + (typeof g.className === 'string' ? g.className.slice(0,60) : (g.className && g.className.baseVal ? g.className.baseVal.slice(0,60) : '')) + ' seats=' + rects + ' texts="' + txts.slice(0,50) + '"';
      }
      return out;
    })()
  `))

  parts.push(await probe(browser, "data-* ATTRIBUTES (on rect/circle)", `
    (function(){
      var seats = document.querySelectorAll('rect, circle');
      if (seats.length === 0) return 'no rect or circle elements';
      var patterns = {};
      var keys = Object.keys(patterns);
      if (keys.length === 0) return 'no data-* attributes found on rect/circle';
      return keys.map(function(k){ return k + '=' + patterns[k]; }).join(', ');
    })()
  `))

  parts.push(await probe(browser, "SCREEN / ROW INDICATORS", `
    (function(){
      var all = document.querySelectorAll('text, div, span');
      var results = [];
      for (var i = 0; i < all.length; i++) {
        var t = (all[i].textContent||'').trim();
        if (t === 'Screen' || t === 'SCREEN' || t.match && t.match(/^[A-Z]$/) && t.length === 1) {
          results.push({ tag: all[i].tagName.toLowerCase(), text: t.slice(0,20), class: (typeof all[i].className === 'string' ? all[i].className.slice(0,40) : '') });
        }
      }
      return JSON.stringify(results.slice(0,30));
    })()
  `))

  parts.push(await probe(browser, "CANVAS DETAILS", `
    (function(){
      var cvs = document.querySelectorAll('canvas');
      var out = 'Canvas count: ' + cvs.length;
      for (var i = 0; i < cvs.length; i++) {
        var c = cvs[i];
        out += '\\n['+i+'] w=' + c.width + ' h=' + c.height + ' id=' + (c.id||'') + ' class=' + (typeof c.className==='string'?c.className.slice(0,60):'') + ' style=' + (c.getAttribute('style')||'').slice(0,80);
      }
      return out;
    })()
  `))

  parts.push(await probe(browser, "IFRAME DETAILS", `
    (function(){
      var ifs = document.querySelectorAll('iframe');
      var out = 'Iframe count: ' + ifs.length;
      for (var i = 0; i < ifs.length; i++) {
        var f = ifs[i];
        out += '\\n['+i+'] src=' + (f.src||'').slice(0,120) + ' id=' + (f.id||'') + ' class=' + (typeof f.className==='string'?f.className.slice(0,40):'');
        try {
          var fDoc = f.contentDocument || f.contentWindow.document;
          var fKids = fDoc.querySelectorAll('rect,circle,div[class*="seat"],a[class*="seat"]');
          out += ' seatCandidates=' + fKids.length + ' bodyKids=' + fDoc.body.children.length;
        } catch(e) {
          out += ' (cross-origin)';
        }
      }
      return out;
    })()
  `))

  parts.push(await probe(browser, "KONVA STATE", `
    (function(){
      var konvajs = document.querySelector('.konvajs-content');
      if (!konvajs) return 'No .konvajs-content found';
      var winKeys = Object.keys(window);
      var konvaKeys = [];
      for (var i = 0; i < winKeys.length; i++) {
        var k = winKeys[i];
        var kl = k.toLowerCase();
        if (kl.indexOf('konva') !== -1 || kl.indexOf('konvajs') !== -1) konvaKeys.push(k);
      }
      var reactFiber = konvajs;
      var fiber = reactFiber;
      var key = Object.keys(fiber).find(function(k){ return k.indexOf('__reactFiber') !== -1 || k.indexOf('__reactInternalInstance') !== -1; });
      return 'konvaKeys on window: ' + (konvaKeys.length ? konvaKeys.join(',') : 'none') + ' | reactFiberKey: ' + (key || 'none') + ' | konvajs classes: ' + konvajs.className + ' | parent classes: ' + (konvajs.parentElement ? konvajs.parentElement.className.slice(0,60) : 'none');
    })()
  `))

  parts.push(await probe(browser, "KONVA CHILDREN (via __reactFiber)", `
    (function(){
      var konvajs = document.querySelector('.konvajs-content');
      if (!konvajs) return 'no konvajs';
      var key = Object.keys(konvajs).find(function(k){ return k.indexOf('__reactFiber') !== -1; });
      if (!key) return 'no reactFiber';
      var fiber = konvajs[key];
      var out = 'fiber tag=' + (fiber.tag||'') + ' type=' + (typeof fiber.type === 'function' ? fiber.type.name : (typeof fiber.type === 'string' ? fiber.type : typeof fiber.type));
      var s = fiber;
      for (var d = 0; d < 8 && s; d++) {
        if (s.memoizedState) {
          var ms = s.memoizedState;
          if (ms.queue) out += ' | depth' + d + ' has queue';
          if (ms.next) out += ' | depth' + d + ' has next';
          try { var msStr = JSON.stringify(ms).slice(0,100); out += ' | ms' + d + '=' + msStr; } catch(e) { out += ' | ms' + d + '=(circular)'; }
        }
        if (s.stateNode && s.stateNode.innerHTML) {
          out += ' | has stateNode with innerHTML';
        }
        s = s.child;
      }
      return out;
    })()
  `))

  parts.push(await probe(browser, "WINDOW SEAT DATA (global vars)", `
    (function(){
      var keys = Object.keys(window);
      var seatKeys = [];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var kl = k.toLowerCase();
        if (kl.indexOf('seat') !== -1 || kl.indexOf('layout') !== -1 || kl.indexOf('venue') !== -1 || kl.indexOf('show') !== -1) seatKeys.push(k);
      }
      return 'Seat/layout/venue/show keys on window: ' + (seatKeys.length ? seatKeys.join(', ') : 'none');
    })()
  `))

  parts.push(await probe(browser, "SCRIPT TAGS WITH seat/layout DATA", `
    (function(){
      var scripts = document.querySelectorAll('script');
      var out = '';
      for (var i = 0; i < scripts.length; i++) {
        var s = scripts[i];
        var text = (s.textContent || '').toLowerCase();
        if (text.indexOf('seat') !== -1 || text.indexOf('layout') !== -1 || text.indexOf('venue') !== -1 || text.indexOf('screen') !== -1) {
          var id = s.id ? ' id=' + s.id : '';
          var src = s.src ? ' src=' + s.src.slice(0,60) : '';
          out += '\\n['+i+']' + id + src + ' (contains seat/layout data, ' + (s.textContent||'').length + ' chars)';
        }
      }
      return out || 'No scripts with seat/layout/venue/screen data found';
    })()
  `))

  parts.push(await probe(browser, "SCRIPT #23 FULL (all of __INITIAL_STATE__)", `
    (function(){
      var s = document.querySelectorAll('script')[23];
      if (!s || !s.textContent) return 'no script #23';
      return s.textContent;
    })()
  `))

  parts.push(await probe(browser, "INITIAL STATE KEYS (seat/booking related)", `
    (function(){
      var state = window.__INITIAL_STATE__;
      if (!state) return 'no __INITIAL_STATE__';
      var keys = Object.keys(state);
      var relevant = [];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k.indexOf('seat') !== -1 || k.indexOf('layout') !== -1 || k.indexOf('booking') !== -1 || k.indexOf('venue') !== -1 || k.indexOf('show') !== -1 || k.indexOf('movie') !== -1 || k.indexOf('ticket') !== -1) {
          var v = state[k];
          var vStr = typeof v === 'string' ? v : JSON.stringify(v).slice(0,200);
          relevant.push(k + '=' + vStr.slice(0,100));
        }
      }
      return relevant.length ? relevant.join('\\n') : 'No seat/booking/movie keys found. ALL keys: ' + keys.join(', ');
    })()
  `))

  parts.push(await probe(browser, "KONVA STAGES (deep dive into groups)", `
    (function(){
      if (typeof Konva === 'undefined') return 'Konva not on window';
      var stages = Konva.stages;
      if (!stages || stages.length === 0) return 'No Konva stages';
      var stage = stages[0];
      var out = 'Stage: ' + stage.children.length + ' children';
      function describeNode(node, depth) {
        var indent = '  '.repeat(depth);
        var cn = node.getClassName ? node.getClassName() : (node.constructor ? node.constructor.name : 'unknown');
        var id = node.id ? node.id() || '' : '';
        var name = node.name ? node.name() || '' : '';
        var txt = '';
        if (cn === 'Text' && node.text) txt = ' text="' + node.text().slice(0,30) + '"';
        var children = node.children ? node.children.length : (node.getChildren ? node.getChildren().length : 0);
        var r = '';
        if (cn === 'Rect' && node.attrs) {
          var a = node.attrs;
          r += ' fill=' + (a.fill||'none') + ' stroke=' + (a.stroke||'none');
        }
        if (cn === 'Circle' && node.attrs) {
          var a = node.attrs;
          r += ' fill=' + (a.fill||'none') + ' stroke=' + (a.stroke||'none') + ' radius=' + (a.radius||'');
        }
        return indent + cn + (id ? '#' + id : '') + (name ? '.' + name : '') + txt + r + (children > 0 ? ' kids=' + children : '');
      }
      function walk(node, depth) {
        if (depth > 4) return '';
        var lines = [];
        var children = node.children || (node.getChildren ? node.getChildren() : []);
        if (children.length === 0) return '';
        for (var i = 0; i < Math.min(children.length, 100); i++) {
          var child = children[i];
          var cn = child.getClassName ? child.getClassName() : 'unknown';
          lines.push(describeNode(child, depth));
          if (cn === 'Group' && depth < 3) {
            var sub = walk(child, depth + 1);
            if (sub) lines.push(sub);
          }
        }
        return lines.join('\\n');
      }
      out += '\\n' + walk(stage, 0);
      return out;
    })()
  `))

  parts.push(await probe(browser, "KONVA DEEP COUNT (recursive all shapes)", `
    (function(){
      if (typeof Konva === 'undefined') return 'Konva not on window';
      var stages = Konva.stages;
      if (!stages || stages.length === 0) return 'no stages';
      var stage = stages[0];
      var allNodes = stage.find('Shape');
      var allGroups = stage.find('Group');
      var allText = stage.find('Text');
      var allRects = stage.find('Rect');
      var allCircles = stage.find('Circle');
      var textContents = [];
      for (var i = 0; i < Math.min(allText.length, 10); i++) {
        textContents.push(allText[i].text());
      }
      return 'Total shapes: ' + allNodes.length + ' groups: ' + allGroups.length + ' texts: ' + allText.length + ' rects: ' + allRects.length + ' circles: ' + allCircles.length + ' textContents: ' + JSON.stringify(textContents);
    })()
  `))

  parts.push(await probe(browser, "PAGE PERFORMANCE / RESOURCE TIMING (API endpoints)", `
    (function(){
      var entries = performance.getEntriesByType('resource') || [];
      var bmsApis = [];
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var url = e.name;
        if (url.indexOf('seat') !== -1 || url.indexOf('layout') !== -1 || url.indexOf('venue') !== -1 || url.indexOf('bookmyshow.com/api') !== -1 || url.indexOf('/api/') !== -1) {
          if (url.indexOf('doubleclick') === -1 && url.indexOf('google') === -1) {
            bmsApis.push(url.slice(0,150) + ' (' + (e.initiatorType||'') + ' ' + Math.round(e.duration||0) + 'ms)');
          }
        }
      }
      return bmsApis.length ? bmsApis.join('\\n') : 'No seat/layout/venue/api resources found in ' + entries.length + ' entries';
    })()
  `))

  parts.push(await probe(browser, "JSON DATA IN PAGE (any <script type='application/json'>)", `
    (function(){
      var scripts = document.querySelectorAll('script[type="application/json"], script[id*="__NEXT_DATA"]');
      var out = '';
      for (var i = 0; i < scripts.length; i++) {
        var s = scripts[i];
        var t = (s.textContent || '').slice(0, 1000);
        out += '\\n['+i+'] id=' + (s.id||'') + ' type=' + (s.type||'') + ' content=' + t;
      }
      return out || 'none found';
    })()
  `))

  parts.push(await probe(browser, "BODY INNERHTML (first 5000 chars)", `
    (function(){
      return (document.body.innerHTML || '').slice(0, 5000);
    })()
  `))

  const report = parts.join("\n\n")
  console.log("========== SEAT PAGE INVESTIGATION ==========")
  console.log(report)
  console.log("========== END INVESTIGATION ==========")
  return report
}

export async function extractSeatLayout(browser: BrowserSession): Promise<SeatLayout | null> {
  try {
    const result = await browser.eval<SeatLayout>(`
      (function() {
        var c = document.getElementById('super-container');
        if (!c) return JSON.stringify({ rows: [], categories: [] });
        var fk = Object.keys(c).find(function(x) { return x.indexOf('__reactFiber$') !== -1; });
        if (!fk) return JSON.stringify({ rows: [], categories: [] });
        var rt = c[fk];
        var zn = null;
        function w(n, d) {
          if (!n || zn) return;
          var t = typeof n.type === 'function' ? (n.type.name || 'anon') : (typeof n.type === 'string' ? n.type : '?');
          if (t === 'z' && d === 12) { zn = n; return; }
          w(n.child, d + 1);
          if (!zn) w(n.sibling, d);
        }
        w(rt, 0);
        if (!zn) return JSON.stringify({ rows: [], categories: [] });

        var h = zn.memoizedState;
        var i = 0;
        var seatNodes = [];
        while (h) {
          if (i === 6) {
            try {
              var v = h.memoizedState;
              if (v && v.current) {
                var stage = v.current;
                function fs(node) {
                  if (!node || seatNodes.length > 500) return;
                  if (node.attrs && node.attrs.seatObj) {
                    var s = node.attrs.seatObj;
                    if (s.seatStatus === 1 && s.curPrice) {
                      seatNodes.push(s);
                    }
                  }
                  if (node.children) { for (var ci = 0; ci < node.children.length; ci++) fs(node.children[ci]); }
                }
                fs(stage);
              }
            } catch(e) {}
            break;
          }
          h = h.next;
          i++;
        }

        if (seatNodes.length === 0) return JSON.stringify({ rows: [], categories: [] });

        seatNodes.sort(function(a, b) {
          if (a.rowId !== b.rowId) return a.rowId < b.rowId ? -1 : 1;
          var aNum = parseInt(a.seatNumber, 10);
          var bNum = parseInt(b.seatNumber, 10);
          return aNum - bNum;
        });

        var rowMap = {};
        for (var si = 0; si < seatNodes.length; si++) {
          var s = seatNodes[si];
          if (!rowMap[s.rowId]) rowMap[s.rowId] = [];
          rowMap[s.rowId].push(s);
        }

        var rowKeys = Object.keys(rowMap).sort();
        var outputRows = [];
        for (var ri = 0; ri < rowKeys.length; ri++) {
          var rk = rowKeys[ri];
          var seats = rowMap[rk];
          seats.sort(function(a, b) { return parseInt(a.seatNumber, 10) - parseInt(b.seatNumber, 10); });
          var rowSeats = [];
          for (var si = 0; si < seats.length; si++) {
            var sd = seats[si];
            rowSeats.push({
              id: sd.seatId,
              row: sd.rowId,
              number: parseInt(sd.seatNumber, 10),
              status: sd.seatStatus === 1 ? 'available' : 'booked',
              category: sd.priceCode || undefined,
              column: si
            });
          }
          outputRows.push({ row: rk, seats: rowSeats });
        }

        var cats = [];
        var seenCats = {};
        for (var si = 0; si < seatNodes.length; si++) {
          var code = seatNodes[si].priceCode;
          var desc = seatNodes[si].priceDesc;
          if (code && !seenCats[code]) {
            seenCats[code] = true;
            cats.push(desc || code);
          }
        }

        return JSON.stringify({ rows: outputRows, categories: cats });
      })()
    `)
    if (!result || !Array.isArray(result.rows)) return null
    return result as SeatLayout
  } catch (err) {
    console.error("[extractor] extractSeatLayout failed:", err instanceof Error ? err.message : String(err))
    return null
  }
}

export async function clickSeatsOnPage(browser: BrowserSession, seatIds: string[]): Promise<boolean> {
  try {
    for (let i = 0; i < seatIds.length; i++) {
      const seatId = seatIds[i]
      const ok = await browser.eval<string>(`
        (function() {
          var r = [];
          var c = document.getElementById('super-container');
          if (!c) return 'nf:no container';
          var fk = Object.keys(c).find(function(x) { return x.indexOf('__reactFiber$') !== -1; });
          if (!fk) return 'nf:no fiber';
          var rt = c[fk];
          var zn = null;
          function w(n, d) {
            if (!n || zn) return;
            var t = typeof n.type === 'function' ? (n.type.name || 'anon') : (typeof n.type === 'string' ? n.type : '?');
            if (t === 'z' && d === 12) { zn = n; return; }
            w(n.child, d + 1);
            if (!zn) w(n.sibling, d);
          }
          w(rt, 0);
          if (!zn) return 'nf:no z';

          var h = zn.memoizedState;
          var i = 0;
          var targetId = ${JSON.stringify(seatId)};
          var result = 'nf:' + targetId;

          while (h) {
            if (i === 6) {
              try {
                var v = h.memoizedState;
                if (v && v.current) {
                  var stage = v.current;
                  var handler = stage.eventListeners.click[0].handler;
                  var seats = [];
                  function fs(node) {
                    if (!node || seats.length > 100) return;
                    if (node.attrs && node.attrs.seatObj) {
                      var s = node.attrs.seatObj;
                      if (s.seatStatus === 1 && s.curPrice) seats.push(node);
                    }
                    if (node.children) { for (var ci = 0; ci < node.children.length; ci++) fs(node.children[ci]); }
                  }
                  fs(stage);
                  for (var si = 0; si < seats.length; si++) {
                    if (seats[si].attrs.seatObj.seatId === targetId) {
                      handler({ target: seats[si] });
                      result = 'ok:' + targetId;
                      break;
                    }
                  }
                }
              } catch(e) { result = 'err:' + String(e).slice(0, 100); }
              break;
            }
            h = h.next;
            i++;
          }
          return result;
        })()
      `)
      if (!ok || !ok.startsWith('ok:')) {
        console.warn(`[extractor] Could not click seat ${seatId}: ${ok}`)
        return false
      }
      await browser.wait("time", "0.5")
    }
    return true
  } catch (err) {
    console.error("[extractor] clickSeatsOnPage failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function verifySeatsSelected(browser: BrowserSession, seatIds: string[]): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        var expected = ${JSON.stringify(seatIds)};
        var c = document.getElementById('super-container');
        if (!c) return JSON.stringify({ matched: 0, total: expected.length, probe: [], error: 'no container' });
        var fk = Object.keys(c).find(function(x) { return x.indexOf('__reactFiber$') !== -1; });
        if (!fk) return JSON.stringify({ matched: 0, total: expected.length, probe: [], error: 'no fiber' });
        var rt = c[fk];
        var zn = null;
        function w(n, d) {
          if (!n || zn) return;
          var t = typeof n.type === 'function' ? (n.type.name || 'anon') : (typeof n.type === 'string' ? n.type : '?');
          if (t === 'z' && d === 12) { zn = n; return; }
          w(n.child, d + 1);
          if (!zn) w(n.sibling, d);
        }
        w(rt, 0);
        if (!zn) return JSON.stringify({ matched: 0, total: expected.length, probe: [], error: 'no z' });

        var h = zn.memoizedState;
        var i = 0;
        var selected = [];
        while (h) {
          if (i === 24) {
            try {
              var v = h.memoizedState;
              if (v && typeof v === 'object' && v.selectedSeats) {
                var ss = v.selectedSeats;
                if (Array.isArray(ss.seats)) {
                  selected = ss.seats.map(function(s) { return s.seatId; });
                }
              }
            } catch(e) {}
            break;
          }
          h = h.next;
          i++;
        }
        var matched = 0;
        var probeList = [];
        for (var ei = 0; ei < expected.length; ei++) {
          var found = selected.indexOf(expected[ei]) !== -1;
          if (found) matched++;
          probeList.push({ id: expected[ei], found: found });
        }
        return JSON.stringify({ matched: matched, total: expected.length, probe: probeList, allSelected: selected });
      })()
    `)
    if (!result) return false
    var parsed = typeof result === 'string' ? JSON.parse(result) : result;
    if (!parsed || typeof parsed.matched === 'undefined') return false;
    if (parsed.matched < parsed.total) {
      console.log('[extractor] verifySeatsSelected probe:', JSON.stringify(parsed.probe));
    }
    return parsed.matched === parsed.total;
  } catch (err) {
    console.error("[extractor] verifySeatsSelected failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function extractPageInfo(browser: BrowserSession): Promise<{ url: string; title: string }> {
  try {
    const info = await browser.eval<{ url: string; title: string }>(`
      JSON.stringify({ url: window.location.href, title: document.title })
    `)
    if (!info || typeof info.url !== "string") return { url: "", title: "" }
    return info
  } catch (err) {
    console.error("[extractor] extractPageInfo failed:", err instanceof Error ? err.message : String(err))
    return { url: "", title: "" }
  }
}

export async function detectCitySelector(browser: BrowserSession): Promise<string | null> {
  try {
    const cityText = await browser.eval<string>(`
      JSON.stringify(
        (() => {
          const cityEl = document.querySelector('[class*="city"], [class*="location"], [data-city]');
          if (cityEl) return cityEl.textContent?.trim() || null;
          const selectEl = document.querySelector('select[class*="city"], select[id*="city"]');
          if (selectEl) return selectEl.querySelector('option:checked')?.textContent?.trim() || null;
          return null;
        })()
      )
    `)
    return cityText || null
  } catch (err) {
    console.error("[extractor] detectCitySelector failed:", err instanceof Error ? err.message : String(err))
    return null
  }
}

export async function clickPayButton(browser: BrowserSession): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        var b = document.querySelectorAll('button');
        for (var i = 0; i < b.length; i++) {
          var t = (b[i].textContent || '').trim();
          if (t.indexOf('Pay') > -1) {
            b[i].click();
            return 'ok';
          }
        }
        return 'nf';
      })()
    `)
    return result === 'ok'
  } catch (err) {
    console.error("[extractor] clickPayButton failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function clickAcceptTerms(browser: BrowserSession): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        var b = document.querySelectorAll('button');
        for (var i = 0; i < b.length; i++) {
          var t = (b[i].textContent || '').trim();
          if (t === 'Accept') {
            b[i].click();
            return 'ok';
          }
        }
        return 'nf';
      })()
    `)
    return result === 'ok'
  } catch (err) {
    console.error("[extractor] clickAcceptTerms failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function clickSkipButton(browser: BrowserSession): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        var d = document.querySelectorAll('div');
        for (var i = 0; i < d.length; i++) {
          var t = (d[i].textContent || '').trim();
          if (t === 'Skip' && d[i].offsetWidth > 0) {
            d[i].click();
            return 'ok';
          }
        }
        return 'nf';
      })()
    `)
    return result === 'ok'
  } catch (err) {
    console.error("[extractor] clickSkipButton failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function fillUserInfo(browser: BrowserSession, email: string, phone: string): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        var e = document.getElementById('deemed-email');
        var p = document.getElementById('deemed-mobile-number');
        if (!e || !p) return 'nf';
        var ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        ns.call(e, ${JSON.stringify(email)});
        ns.call(p, ${JSON.stringify(phone)});
        var ep = Object.keys(e).find(function(k) { return k.indexOf('__reactProps$') !== -1; });
        var pp = Object.keys(p).find(function(k) { return k.indexOf('__reactProps$') !== -1; });
        if (ep) e[ep].onChange({ target: e, currentTarget: e });
        if (pp) p[pp].onChange({ target: p, currentTarget: p });
        return 'ok';
      })()
    `)
    return result === 'ok'
  } catch (err) {
    console.error("[extractor] fillUserInfo failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function getSelectedSeats(browser: BrowserSession): Promise<string[]> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        function hooksOf(f) {
          var out = [];
          var h = f.memoizedState;
          var n = 0;
          while (h && n < 100) {
            out.push(h);
            h = h.next;
            n++;
          }
          return out;
        }
        var found = null;
        var visited = 0;
        var maxVisited = 40000;
        function visit(f) {
          if (!f || found || visited > maxVisited) return;
          visited++;
          var t = typeof f.type;
          if (t === 'function' || t === 'object') {
            var hooks = hooksOf(f);
            for (var i = 0; i < hooks.length; i++) {
              try {
                var v = hooks[i].memoizedState;
                if (v && typeof v === 'object' && v.selectedSeats) {
                  var ss = v.selectedSeats;
                  if (Array.isArray(ss.seats) && ss.seats.length > 0) {
                    found = ss;
                    return;
                  }
                }
              } catch(e) {}
            }
          }
          visit(f.child);
          if (!found) visit(f.sibling);
        }
        var c = document.getElementById('super-container');
        if (c) {
          var fk = Object.keys(c).find(function(x) { return x.indexOf('__reactFiber$') !== -1; });
          if (fk) visit(c[fk]);
        }
        if (found) return JSON.stringify(found.seats.map(function(s) { return s && s.seatId; }).filter(Boolean));

        var domSeats = [];
        var seatEls = document.querySelectorAll('svg rect, svg circle, [class*="seat"], [aria-pressed="true"], [data-selected="true"]');
        for (var j = 0; j < seatEls.length; j++) {
          var el = seatEls[j];
          if (!el.offsetWidth && !el.offsetHeight) continue;
          var cls = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal ? el.className.baseVal : '');
          var lower = cls.toLowerCase();
          if (lower.indexOf('selected') !== -1 || lower.indexOf('sold') !== -1) continue;
          if (el.getAttribute && (el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-selected') === 'true')) {
            domSeats.push(el.getAttribute('data-seat-id') || el.getAttribute('id') || '');
            continue;
          }
          var st = (el.getAttribute && (el.getAttribute('style') || '')) || '';
          if (st.toLowerCase().indexOf('green') !== -1) {
            domSeats.push(el.getAttribute('data-seat-id') || el.getAttribute('id') || '');
          }
        }
        return JSON.stringify(domSeats.filter(Boolean));
      })()
    `)
    if (typeof result === "string") {
      const parsed = JSON.parse(result)
      return Array.isArray(parsed) ? parsed : []
    }
    return []
  } catch (err) {
    console.error("[extractor] getSelectedSeats failed:", err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function submitUserInfo(browser: BrowserSession): Promise<boolean> {
  try {
    const result = await browser.eval<string>(`
      (function() {
        var b = document.querySelectorAll('button');
        for (var i = 0; i < b.length; i++) {
          var t = (b[i].textContent || '').trim();
          if (t === 'Submit') {
            b[i].click();
            return 'ok';
          }
        }
        return 'nf';
      })()
    `)
    return result === 'ok'
  } catch (err) {
    console.error("[extractor] submitUserInfo failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}
