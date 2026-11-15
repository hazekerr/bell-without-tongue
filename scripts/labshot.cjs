const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('file:///tmp/claude-0/-home-user/d82239f7-e40e-50bc-bad2-04413d5695d0/scratchpad/lab/index.html'); await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/claude-0/shots/lab.png', fullPage: true });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
