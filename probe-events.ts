import { BrowserSession } from "./Agent/browser"

async function main() {
  const b = new BrowserSession("bms-probe3", 60000)
  await b.open("https://in.bookmyshow.com/movies/bang/seat-layout/ET00452034/IMMO/60222/20260728")
  await b.wait("time", "10")

  // Try dispatching on a parent React-managed element
  const r1 = await b.eval<string>(`
    (function() {
      var s = Konva.stages[0];
      var content = s.content || document.querySelector('.konvajs-content');
      var r = s.find('Rect'); var t = s.find('Text');
      var a04Rect = null;
      for (var i = 0; i < r.length; i++) {
        var a = r[i].attrs;
        if (a.x === -1000 && a.y === -500 && a.width === 3000) continue;
        if (a.width < 20 || a.height > 100) continue;
        var num = '', row = '';
        for (var ti = 0; ti < t.length; ti++) {
          var tx = t[ti].text();
          if (/^\\d+$/.test(tx) && Math.abs(t[ti].x() - (a.x + a.width / 2)) < 15 && Math.abs(t[ti].y() - (a.y + a.height / 2)) < 12) num = tx;
          if (/^[A-Z]$/.test(tx) && tx.length === 1 && Math.abs(a.y - t[ti].y()) < 35) row = tx;
        }
        if (row === 'A' && num === '04') { a04Rect = r[i]; break; }
      }
      if (!a04Rect) return 'noA04';
      var a = a04Rect.attrs;
      var cx = a.x + a.width / 2;
      var cy = a.y + a.height / 2;
      var scaleX = content.offsetWidth / s.width();
      var scaleY = content.offsetHeight / s.height();
      var cr = content.getBoundingClientRect();
      var clientX = cr.left + cx * scaleX;
      var clientY = cr.top + cy * scaleY;
      var dispatchOn = function(el) {
        el.dispatchEvent(new MouseEvent('mousedown', { clientX: clientX, clientY: clientY, bubbles: true, cancelable: true, button: 0 }));
        el.dispatchEvent(new MouseEvent('mouseup', { clientX: clientX, clientY: clientY, bubbles: true, cancelable: true, button: 0 }));
        el.dispatchEvent(new MouseEvent('click', { clientX: clientX, clientY: clientY, bubbles: true, cancelable: true, button: 0 }));
      };
      var nextRoot = document.getElementById('__next');
      if (nextRoot) dispatchOn(nextRoot);
      document.body.dispatchEvent(new MouseEvent('click', { clientX: clientX, clientY: clientY, bubbles: true, cancelable: true, button: 0 }));
      var fill = a04Rect.attrs.fill;
      var stroke = a04Rect.attrs.stroke;
      if (fill !== '#FFFFFF' || stroke !== '#1FAD3E') return 'CHANGED:' + fill + '|' + stroke;
      return JSON.stringify({ fill: fill, stroke: stroke, tried: '__next + body' });
    })()
  `)
  console.log("Result:", r1)

  // Check for a "booking bar" or seat info panel that might appear
  const r2 = await b.eval<string>(`
    (function() {
      var text = document.body.innerText || '';
      var hasBookingBar = text.indexOf('Booking') !== -1 || text.indexOf('booking') !== -1;
      var hasProceed = text.indexOf('Proceed') !== -1 || text.indexOf('proceed') !== -1 || text.indexOf('Pay') !== -1;
      var hasSelected = text.indexOf('Selected') !== -1;
      var hasSubtotal = text.indexOf('Subtotal') !== -1 || text.indexOf('subtotal') !== -1 || text.indexOf('Total') !== -1;
      return JSON.stringify({ bookingBar: hasBookingBar, proceed: hasProceed, selected: hasSelected, subtotal: hasSubtotal });
    })()
  `)
  console.log("Page text check:", r2)

  await b.close()
}
main()
