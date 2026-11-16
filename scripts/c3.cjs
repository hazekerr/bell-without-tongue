const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  for (const [i, enc] of [['a', 'agneta'], ['b', 'twin']].entries()) {
    await p.evaluate(([name]) => { const w = window.__bwt; const c = w.G.chron; c.prologueDone = true; if (!c.roles.includes('bellringer')) c.roles.push('bellringer'); const r = w.startRun(c, 'bellringer', 'c3-' + name); w.nextCircle(r, c); w.nextCircle(r, c); w.G.run = r; for (const n of r.map.filter((x) => x.floor === 0)) n.type = name === 'agneta' ? 'elite' : 'boss'; w.showMap(); }, [enc[1]]);
    await p.waitForTimeout(500);
    await p.$eval('.node.avail', (e) => e.click());
    await p.waitForTimeout(2600);
    await p.screenshot({ path: `/tmp/claude-0/shots/C3-${enc[1]}.png` });
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
