const rig = require('./rig');
const fs = require('fs');
(async () => {
  const [dir, seed, secs] = [process.argv[2], +process.argv[3], +process.argv[4]];
  const { browser, page } = await rig.open(dir, seed, { len: 600, w: 270, h: 480 });
  await page.evaluate(() => { window.NORENDER3 = 1; window.__log = []; window.__f = 0; });
  const frames = Math.round(secs * 30);
  const t0 = Date.now();
  for (let k = 0; k < frames; k += 300) {
    if (k % 1800 === 0) console.log('t', k / 30, 's', ((Date.now() - t0) / 1000).toFixed(0));
    await page.evaluate((n) => {
      for (let i = 0; i < n; i++) {
        window.__adv(1000 / 30);
        const R = window.R3; if (!R) continue;
        const c = R.c, h = R.h;
        window.__log.push([window.__f++, +c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2), +Math.hypot(c.vx, c.vz).toFixed(1), c.owner ? R.pA.indexOf(c.owner) : -1, h.score.join('-'), h.st ? h.st.shots : 0, h.celT > 0 ? 1 : 0, h.celCam ? 1 : 0, h.freeze ? 1 : 0, h.goalT > 0 ? 1 : 0]);
      }
    }, Math.min(300, frames - k));
  }
  const out = await page.evaluate(() => ({ log: window.__log, events: window.R3.h.events, RA: window.R3.RA, nP: window.R3.pA.length, teams: window.R3.pA.map(p => p.team), active: window.R3.h.active, time: window.R3.h.time }));
  fs.writeFileSync(`${dir}/sim-${seed}.json`, JSON.stringify(out));
  console.log('frames', out.log.length, 'RA', out.RA, 'players', out.nP, 'score', out.log[out.log.length - 1][6], 'events', JSON.stringify(out.events).slice(0, 600));
  await browser.close();
})();
