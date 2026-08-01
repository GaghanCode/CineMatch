import { BrowserSession } from "./Agent/browser"

async function main() {
  const b = new BrowserSession("bms-react", 60000)
  await b.open("https://in.bookmyshow.com/movies/bang/seat-layout/ET00452034/IMMO/60222/20260728")
  await b.wait("time", "10")

  // Select seat at index 5 (not the first)
  const r1 = await b.eval<string>(`
    (function() {
      var r = [];
      var c = document.getElementById('super-container');
      var fk = Object.keys(c).find(function(x) { return x.indexOf('__reactFiber$') !== -1; });
      if (!fk) return 'no fiber';
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
      if (!zn) return 'no z';
      var h = zn.memoizedState;
      var i = 0;
      while (h) {
        if (i === 6) {
          try {
            var v = h.memoizedState;
            if (v && v.current) {
              var stage = v.current;
              var seats = [];
              function fs(node) {
                if (!node || seats.length > 20) return;
                if (node.attrs && node.attrs.seatObj) {
                  var s = node.attrs.seatObj;
                  if (s.seatStatus === 1 && s.curPrice) seats.push(node);
                }
                if (node.children) { for (var ci = 0; ci < node.children.length; ci++) fs(node.children[ci]); }
              }
              fs(stage);
              r.push({ total: seats.length });
              var handler = stage.eventListeners.click[0].handler;
              var seat5 = seats[5];
              r.push({ targetSeat: seat5.attrs.seatObj.seatId });
              handler({ target: seat5 });
              r.push({ done: true });
              r.push({ availAfter: seats.length });
            }
          } catch(e) { r.push({ err: String(e).slice(0, 100) }); }
          break;
        }
        h = h.next;
        i++;
      }
      return JSON.stringify(r);
    })()
  `)
  console.log("=== SELECT 6TH SEAT ===")
  console.log(r1.slice(0, 1000))

  await b.wait("time", "2")

  const r2 = await b.eval<string>(`
    (function() {
      var r = [];
      var c = document.getElementById('super-container');
      var fk = Object.keys(c).find(function(x) { return x.indexOf('__reactFiber$') !== -1; });
      if (!fk) return 'no fiber';
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
      if (!zn) return 'no z';
      var h = zn.memoizedState;
      var i = 0;
      while (h) {
        if (i === 24) {
          try {
            var v = h.memoizedState;
            if (v && typeof v === 'object' && v.selectedSeats) {
              var ss = v.selectedSeats;
              r.push({ cnt: Array.isArray(ss.seats) ? ss.seats.length : 0 });
              if (Array.isArray(ss.seats) && ss.seats.length > 0) {
                for (var si = 0; si < Math.min(ss.seats.length, 4); si++) {
                  r.push({ seat: si, id: ss.seats[si].seatId });
                }
              }
            }
          } catch(e) { r.push({ err: String(e).slice(0, 100) }); }
          break;
        }
        h = h.next;
        i++;
      }
      return JSON.stringify(r);
    })()
  `)
  console.log("=== SELECTED SEATS ===")
  console.log(r2.slice(0, 2000))

  await b.close()
}
main()
