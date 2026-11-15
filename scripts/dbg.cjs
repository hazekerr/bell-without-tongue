const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.evaluate(() => { const w = window.__bwt; w.G.chron.prologueDone = true; w.G.run = w.startRun(w.G.chron, 'gravedigger', 'shot1'); w.showMap(); });
  await p.waitForTimeout(500);
  await p.$eval('.node.avail', (e) => e.click());
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const q = (s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return [Math.round(r.y), Math.round(r.height), getComputedStyle(e).overflow]; };
    return { arena: q('.arena'), enemy: q('.enemy'), portrait: q('.enemy .portrait'), ename: q('.enemy .ename'), ebar: q('.enemy .ebar'), bar: q('.enemy .bar'), st: q('.enemy .statuses'), hz: q('.hero-zone') };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
