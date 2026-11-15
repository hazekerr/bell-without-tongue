/* Сквозной прогон интерфейса: бой → награда → карта → смерть → возвращение. node scripts/play.cjs */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  const tap = (sel, nth = 0) => p.evaluate(([s, n]) => {
    const el = document.querySelectorAll(s)[n];
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 7 };
    el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); el.click();
    return true;
  }, [sel, nth]);
  await p.evaluate(() => {
    const w = window.__bwt;
    w.G.chron.prologueDone = true;
    w.G.chron.pages.push('p_awake', 'p_ilse', 'p_scar');
    w.G.run = w.startRun(w.G.chron, 'gravedigger', 'play1');
    w.showMap();
  });
  await p.waitForTimeout(600);
  await p.$eval('.node.avail', (e) => e.click());
  await p.waitForTimeout(1800);
  // играем ходы
  let turns = 0;
  for (let t = 0; t < 14; t++) {
    if (await p.$('.reward')) break;
    for (let k = 0; k < 6; k++) {
      const n = await p.$$eval('.hand .cw:not(.x)', (e) => e.length);
      let played = false;
      for (let i = 0; i < n; i++) {
        const cls = await p.$$eval('.hand .cw .card', (cs, idx) => cs[idx]?.className ?? '', i);
        if (cls.includes('noafford') || cls.includes('unplayable')) continue;
        await tap('.hand .cw', i); await p.waitForTimeout(250);
        await tap('.hand .cw', i); await p.waitForTimeout(250);
        const hint = await p.$eval('.hint', (e) => e.textContent);
        if (/цель/.test(hint)) { await tap('.enemy:not(.dead)', 0); await p.waitForTimeout(250); }
        await p.waitForTimeout(700);
        played = true; break;
      }
      if (!played) break;
    }
    if (turns === 0) await p.screenshot({ path: `${OUT}/07-combat-mid.png` });
    await tap('.end-turn'); turns++;
    await p.waitForTimeout(3500);
    if (turns === 1) await p.screenshot({ path: `${OUT}/08-enemy-turn.png` });
    if (await p.$('.reward')) break;
    if (await p.$('.vision') || await p.$('.screen:has(.slab)')) break;
  }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/09-after.png` });
  console.log('turns', turns, errs.join('\n') || 'no errors');
  await b.close();
})();
