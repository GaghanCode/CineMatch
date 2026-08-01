import { BrowserSession } from "./Agent/browser"

async function main() {
  const b = new BrowserSession("bms-probe", 60000)
  await b.open("https://in.bookmyshow.com/movies/bang/seat-layout/ET00452034/IMMO/60222/20260728")
  await b.wait("time", "10")

  console.log("=== BEFORE CLICK ===")
  const before = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0]; var r = s.find('Rect'); var t = s.find('Text'); var out = [];
      for (var i = 0; i < r.length; i++) { var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) { var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row + num === "A04") out.push({ id: row + num, fill: a.fill, stroke: a.stroke, op: a.opacity });
      }
      return JSON.stringify(out);
    })()
  `)
  console.log("A04 state:", before)

  console.log("\n=== TRYING CLICK VIA Konva fire ===")
  const r1 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0]; var r = s.find('Rect'); var t = s.find('Text');
      for (var i = 0; i < r.length; i++) { var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) { var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row + num === "A04") { r[i].fire('click'); r[i].fire('tap'); r[i].fire('mousedown'); r[i].fire('mouseup'); return 'fired on A04'; }
      }
      return 'not found';
    })()
  `)
  console.log("fire result:", r1)
  await b.wait("time", "2")

  console.log("\n=== AFTER CLICK (Konva fire) ===")
  const after = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0]; var r = s.find('Rect'); var t = s.find('Text'); var out = [];
      for (var i = 0; i < r.length; i++) { var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) { var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row + num === "A04") out.push({ id: row + num, fill: a.fill, stroke: a.stroke, op: a.opacity });
      }
      return JSON.stringify(out);
    })()
  `)
  console.log("A04 state after:", after)

  console.log("\n=== TRYING CLICK VIA stage.content dispatchEvent ===")
  const r2 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0]; var content = s.content || document.querySelector('.konvajs-content') || s.container().querySelector('.konvajs-content');
      if (!content) return 'no content';
      var cr = content.getBoundingClientRect();
      var r = s.find('Rect'); var t = s.find('Text');
      for (var i = 0; i < r.length; i++) { var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) { var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row + num === "A04") {
          var scaleX = content.offsetWidth / s.width();
          var scaleY = content.offsetHeight / s.height();
          var cx = cr.left + (a.x + a.width / 2) * scaleX;
          var cy = cr.top + (a.y + a.height / 2) * scaleY;
          content.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
          content.dispatchEvent(new PointerEvent('pointerup', { clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
          content.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
          return 'dispatched at ' + Math.round(cx) + ',' + Math.round(cy);
        }
      }
      return 'not found';
    })()
  `)
  console.log("dispatch result:", r2)
  await b.wait("time", "2")

  console.log("\n=== AFTER DISPATCH ===")
  const after2 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0]; var r = s.find('Rect'); var t = s.find('Text'); var out = [];
      for (var i = 0; i < r.length; i++) { var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) { var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row + num === "A04") out.push({ id: row + num, fill: a.fill, stroke: a.stroke, op: a.opacity });
      }
      return JSON.stringify(out);
    })()
  `)
  console.log("A04 state after dispatch:", after2)

  console.log("\n=== CHECK IF ANY ALL CLICK LISTENERS ON A04 RECT ===")
  const listeners = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0]; var r = s.find('Rect'); var t = s.find('Text');
      for (var i = 0; i < r.length; i++) { var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) { var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row + num === "A04") {
          var events = r[i].eventListeners ? Object.keys(r[i].eventListeners) : [];
          var txtEvents = t[0].eventListeners ? Object.keys(t[0].eventListeners) : [];
          var stageEvents = s.eventListeners ? Object.keys(s.eventListeners) : [];
          var layer = r[i].getLayer();
          var layerEvents = layer && layer.eventListeners ? Object.keys(layer.eventListeners) : [];
          return JSON.stringify({ rectEvents: events, txtEvents: txtEvents, stageEvents: stageEvents, layerEvents: layerEvents });
        }
      }
      return 'not found';
    })()
  `)
  console.log("Event listeners:", listeners)

  await b.close()
}
main()
