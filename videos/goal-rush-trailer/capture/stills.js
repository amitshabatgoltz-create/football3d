// node stills.js DIR seed frame '[{cam},...]' prefix — render several cameras at one game frame
const rig = require('./rig');
const fs = require('fs'), path = require('path');
(async () => {
  const [dir, seed, frame, cams, prefix] = [process.argv[2], +process.argv[3], +process.argv[4], JSON.parse(process.argv[5]), process.argv[6]];
  const { browser, page } = await rig.open(dir, seed, { len: 600 });
  await page.addScriptTag({ path: path.join(__dirname, 'director.js') });
  await page.evaluate((frame) => { window.NORENDER3 = 1; let f = 0; while (f < frame) { window.__adv(1000 / 30); if (window.R3) f++; } }, frame);
  for (let i = 0; i < cams.length; i++) {
    const b64 = await page.evaluate((cam) => { window.__shot = Object.assign({ cut: 1 }, cam); window.__cs = null; window.CAM3(); const R = window.R3; R.Bw.render(R.OB, window.CAMX); return document.querySelector('#g3 canvas').toDataURL('image/jpeg', 0.85).split(',')[1]; }, cams[i]);
    fs.writeFileSync(path.join(dir, `${prefix}-${i}.jpg`), Buffer.from(b64, 'base64'));
  }
  await browser.close();
})();
