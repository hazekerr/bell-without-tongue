/* Скриншот экрана победы (конец среза). Нужен dev-сервер на :5173. */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: +(process.env.W || 844), height: +(process.env.H || 390) } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.evaluate(() => { const w = window.__bwt; const c = w.G.chron; c.prologueDone = true; w.G.run = w.startRun(c, 'wickkeeper', 'v'); w.G.run.circle = 3; void w.victory(); });
  await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) { const b2 = await p.$('.sheet .btn, .overlay .btn, button:has-text("Запомнить")'); if (b2) { await b2.click().catch(() => {}); await p.waitForTimeout(700); } }
  await p.screenshot({ path: `${OUT}/victory.png` });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
