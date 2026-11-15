/* Хроника, библиотека карт, настройки. */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    const w = window.__bwt; const c = w.G.chron;
    c.prologueDone = true; c.tolls = 5;
    for (const id of ['p_awake', 'p_ilse', 'p_scar', 'p_order', 'v_drowned_laundress_by', 'v_silt_hound_by', 'e_tin_ring', 'b_1']) w.grantPage(c, id);
    w.showHub(); w.openChronicle();
  });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/20-chronicle.png` });
  await p.evaluate(() => { document.querySelector('.sheet').remove(); window.__bwt.openLibrary(); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/21-library.png` });
  console.log(await p.evaluate(() => Object.keys(window.__bwt.G.chron).length), errs.join('\n') || 'no errors');
  await b.close();
})();
