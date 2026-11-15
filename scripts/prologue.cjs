/* Прогон пролога с нуля: титул → диалог → бой с Привратником → смерть → возвращение → хаб. */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 700 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  await p.click('.btn.primary');
  const seen = new Set();
  const snap = async (name) => { if (!seen.has(name)) { seen.add(name); await p.screenshot({ path: `${OUT}/p-${name}.png` }); } };
  const tapHand = async () => {
    const res = await p.evaluate(() => {
      const cs = [...document.querySelectorAll('.hand .cw')];
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i].querySelector('.card');
        if (c.className.includes('noafford')) continue;
        const r = cs[i].getBoundingClientRect(); const o = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 3 };
        cs[i].dispatchEvent(new PointerEvent('pointerdown', o)); cs[i].dispatchEvent(new PointerEvent('pointerup', o));
        return true;
      }
      return false;
    });
    return res;
  };
  let hub = false;
  for (let step = 0; step < 400 && !hub; step++) {
    await p.waitForTimeout(350);
    if (await p.$('.hub-bottom')) { hub = true; break; }
    if (await p.$('.sheet .btn.primary')) { await snap('sheet'); await p.click('.sheet .btn.primary').catch(() => {}); continue; }
    if (await p.$('.dialog')) { await snap('dialog'); await p.click('.dialog .dlg-box').catch(() => {}); continue; }
    if (await p.$('.combat')) {
      await snap('combat');
      const t = await p.$$eval('.toast', (e) => e.length); if (t) await snap('toast');
      for (let k = 0; k < 3; k++) { if (await tapHand()) { await p.waitForTimeout(250); await tapHand(); await p.waitForTimeout(300); const h = await p.$eval('.hint', (e) => e.textContent); if (/цель/.test(h)) await p.$eval('.enemy', (e) => e.click()); await p.waitForTimeout(500); } }
      await p.$eval('.end-turn', (e) => e.click()).catch(() => {});
      await p.waitForTimeout(2600);
      continue;
    }
    if (await p.$('.slab')) { await snap('epitaph'); await p.click('.btn.primary'); continue; }
    if (await p.$('.vision')) { await snap('vision'); await p.waitForTimeout(2800); await p.click('.vision').catch(() => {}); continue; }
    if (await p.$('.screen .btn.primary')) { await snap('reading'); await p.click('.screen .btn.primary').catch(() => {}); continue; }
    const bell = await p.$('.screen .dlg-hint'); if (bell) { await p.waitForTimeout(1000); await p.click('.screen').catch(() => {}); }
  }
  await p.waitForTimeout(1500);
  await snap('hub-after');
  if (await p.$('.dialog')) { await p.click('.dialog .dlg-box'); await p.waitForTimeout(1200); await snap('hub-talk'); }
  const st = await p.evaluate(() => ({ tolls: window.__bwt.G.chron.tolls, pages: window.__bwt.G.chron.pages, done: window.__bwt.G.chron.prologueDone }));
  console.log('hub:', hub, JSON.stringify(st), errs.join('\n') || 'no errors');
  await b.close();
})();
