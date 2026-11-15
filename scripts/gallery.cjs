/* Галерея иллюстраций для ревью арта: node scripts/gallery.cjs */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    const w = window.__bwt;
    document.body.style.overflow = 'auto';
    document.getElementById('stage').remove();
    const keys = ['laundress', 'hound', 'fisher', 'mussel', 'alban', 'bellman', 'tide', 'candle', 'monk', 'seraph', 'reaper', 'choirmaster'];
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:0;left:0;width:900px;background:#14161c;display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:6px';
    for (const k of keys) { const d = document.createElement('div'); d.style.cssText = 'height:230px;background:linear-gradient(#35514c,#0b1210)'; d.innerHTML = w.enemyArt(k); d.querySelector('svg').style.cssText = 'width:100%;height:100%'; el.append(d); }
    const ids = ['strike', 'ward', 'spade', 'stone_cross', 'earth_to_earth', 'grave_dust', 'memorial_candle', 'wick', 'double_toll', 'agnetas_voice', 'iou', 'bloodletting', 'exhumation', 'funeral_march', 'holy_fear', 'window_light', 'crypt', 'headstone'];
    for (const id of ids) { const d = document.createElement('div'); d.style.cssText = 'height:100px'; d.innerHTML = w.cardArt(id); d.querySelector('svg').style.cssText = 'width:100%;height:100%'; el.append(d); }
    for (const k of ['c1', 'c2', 'hub']) { const d = document.createElement('div'); d.style.cssText = 'height:300px;grid-column:span 2'; d.innerHTML = w.sceneArt(k); d.querySelector('svg').style.cssText = 'width:100%;height:100%'; el.append(d); }
    document.body.append(el);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/gallery.png`, fullPage: true });
  await b.close();
})();
