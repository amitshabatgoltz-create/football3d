// shared: launch the patched game on a virtual clock and kick off an AI-vs-AI match
const { chromium } = require('playwright');
const path = require('path');
exports.open = async (dir, seed, opts = {}) => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: opts.w || 1080, height: opts.h || 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
  await page.addInitScript(`window.__SEED=${seed};`);
  await page.addInitScript({ path: path.join(__dirname, 'vclock.js') });
  await page.goto('file://' + path.join(dir, 'game/game.html'));
  await page.evaluate(() => { window.__r = 0; });
  for (let i = 0; i < 600; i++) {
    await page.evaluate(() => { window.__adv(50); if (window.GR3 && !window.__hooked) { window.__hooked = 1; window.GR3.ready.then(() => window.__r = 1); } });
    await page.waitForTimeout(15);
    if (await page.evaluate(() => window.__r)) break;
  }
  await page.evaluate(({ len, seed }) => {
    window.__reseed(seed * 7919 + 17);
    const g = window.GR3;
    document.getElementById('ui').hidden = true;
    g.studioOff && g.studioOff();
    g.HU.forEach(u => u.on = false);
    window.NOMARK3 = 1;
    g.start({ len, dk: 1, ak: 1 });
    g.HU.forEach(u => u.on = false);
  }, { len: opts.len || 240, seed });
  return { browser, page };
};
