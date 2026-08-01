import { BrowserSession } from "./Agent/browser"

async function main() {
  const b = new BrowserSession("bms-probe2", 60000)
  await b.open("https://in.bookmyshow.com/movies/bang/seat-layout/ET00452034/IMMO/60222/20260728")
  await b.wait("time", "10")

  // Check what DOM events are on content element
  const r1 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0];
      var content = s.content || document.querySelector('.konvajs-content');
      if (!content) return JSON.stringify({ error: 'no content' });
      return JSON.stringify({ tag: content.tagName, cls: content.className, kids: content.children.length, childTag0: content.children[0] ? content.children[0].tagName : 'none' });
    })()
  `)
  console.log("Content element:", r1)

  // Try dispatching a click on the canvas element
  const r2 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0];
      var content = s.content || document.querySelector('.konvajs-content');
      var canvas = content ? content.querySelector('canvas') : document.querySelector('canvas');
      if (!canvas) return 'no canvas';
      var cr = canvas.getBoundingClientRect();
      var cx = cr.left + cr.width / 2;
      var cy = cr.top + cr.height / 2;
      canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
      return 'clicked canvas at ' + Math.round(cx) + ',' + Math.round(cy);
    })()
  `)
  console.log("Canvas click:", r2)
  await b.wait("time", "1")

  // Check if URL changed or any DOM elements appeared
  const r3 = await b.eval<string>(`
    (function() {
      return JSON.stringify({
        url: window.location.href,
        buttons: Array.from(document.querySelectorAll('button')).slice(0,10).map(function(b){return b.textContent.trim().slice(0,30)}).filter(Boolean),
        selectedText: (document.body.innerText || '').indexOf('Selected') !== -1 ? 'has Selected text' : 'no Selected text'
      });
    })()
  `)
  console.log("After click:", r3)

  // Check for any clicked/selected classes
  const r4 = await b.eval<string>(`
    (function() {
      var all = document.querySelectorAll('*');
      var selectedEls = [];
      for (var i = 0; i < all.length; i++) {
        var c = typeof all[i].className === 'string' ? all[i].className : '';
        if (c.indexOf('selected') !== -1 || c.indexOf('active') !== -1 || c.indexOf('clicked') !== -1) {
          selectedEls.push(all[i].tagName + '.' + c.slice(0,60));
        }
      }
      return 'selected/active elements: ' + (selectedEls.length ? selectedEls.slice(0,10).join(', ') : 'none');
    })()
  `)
  console.log(r4)

  // Check: does BMS use react-konva? The event listeners might be on a Group parent
  const r5 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0];
      var groups = s.find('Group');
      var out = [];
      for (var i = 0; i < Math.min(groups.length, 20); i++) {
        var g = groups[i];
        var evts = g.eventListeners ? Object.keys(g.eventListeners) : [];
        if (evts.length > 0) {
          out.push('Group[' + i + '] events: ' + JSON.stringify(evts));
        }
      }
      return out.length ? out.join('\\n') : 'no groups with event listeners';
    })()
  `)
  console.log("Group listeners:", r5)

  // Check the position of the konvajs-content
  const r6 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0];
      var content = s.content || document.querySelector('.konvajs-content');
      if (!content) return 'no content';
      var cr = content.getBoundingClientRect();
      var sW = s.width();
      var sH = s.height();
      return JSON.stringify({ contentLeft: cr.left, contentTop: cr.top, contentW: cr.width, contentH: cr.height, stageW: sW, stageH: sH, offsetW: content.offsetWidth, offsetH: content.offsetHeight });
    })()
  `)
  console.log("Content bounds:", r6)

  // Check the actual canvas element position
  const r7 = await b.eval<string>(`
    (function() {
      var canvases = document.querySelectorAll('canvas');
      var out = [];
      for (var i = 0; i < canvases.length; i++) {
        var c = canvases[i];
        var cr = c.getBoundingClientRect();
        out.push({ i: i, w: c.width, h: c.height, left: cr.left, top: cr.top, right: cr.right, bottom: cr.bottom, cls: c.className.slice(0,40) });
      }
      return JSON.stringify(out);
    })()
  `)
  console.log("Canvas bounds:", r7)

  // Check the seat's position relative to page
  const r8 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0];
      var content = s.content || document.querySelector('.konvajs-content');
      var contentRect = content.getBoundingClientRect();
      var scaleX = content.offsetWidth / s.width();
      var scaleY = content.offsetHeight / s.height();
      var r = s.find('Rect'); var t = s.find('Text');
      for (var i = 0; i < r.length; i++) { var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) { var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row + num === 'A04') {
          var seatCx = contentRect.left + (a.x + a.width / 2) * scaleX;
          var seatCy = contentRect.top + (a.y + a.height / 2) * scaleY;
          return JSON.stringify({ seatX: a.x, seatY: a.y, seatW: a.width, seatH: a.height, scaleX: scaleX, scaleY: scaleY, contentLeft: contentRect.left, contentTop: contentRect.top, clientX: seatCx, clientY: seatCy });
        }
      }
      return 'not found';
    })()
  `)
  console.log("Seat A04 position:", r8)

  await b.close()
}
main()
