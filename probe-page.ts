import { BrowserSession } from "./Agent/browser"

async function main() {
  const b = new BrowserSession("bms-probe", 120000)
  await b.open("https://in.bookmyshow.com/order-summary/ET00452034/IMMO")
  await b.wait("time", "10")

  async function run(js: string): Promise<string> {
    return b.eval<string>("(function(){" + js + "})()")
  }

  // Check for "Proceed" or "Pay" button
  const p1 = await run(`
    var r = [];
    var all = document.querySelectorAll('button, a, div[role="button"], span, label, div');
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].textContent || '').trim().replace(/\\s+/g, ' ');
      if (t.length > 0 && all[i].offsetWidth > 0 &&
          (t.indexOf('Pay') > -1 || t.indexOf('Proceed') > -1 || t.indexOf('proceed') > -1 ||
           t.indexOf('Place Order') > -1 || t.indexOf('Confirm') > -1 || t.indexOf('Make Payment') > -1 ||
           t.indexOf('Amount Payable') > -1)) {
        r.push('el[' + i + '] tag=' + all[i].tagName + ' text="' + t.slice(0, 100) + '" vis=' + (all[i].offsetWidth > 0));
        var cls = typeof all[i].className === 'string' ? all[i].className.slice(0, 80) : '';
        if (cls) r.push('  class="' + cls + '"');
      }
    }
    return r.join(' | ') || 'nothing found';
  `)
  console.log("Pay/Proceed elements:", p1)

  // Check if there's a big "Proceed" or "Pay" CTA
  const p2 = await run(`
    var all = document.querySelectorAll('button');
    var r = [];
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].textContent || '').trim().replace(/\\s+/g, ' ');
      if (t.length > 0 && all[i].offsetWidth > 0) {
        r.push('btn[' + i + '] w=' + all[i].offsetWidth + ' text="' + t.slice(0, 60) + '"');
      }
    }
    return r.join(' | ') || 'no buttons';
  `)
  console.log("All buttons:", p2)

  await b.close()
}
main()
