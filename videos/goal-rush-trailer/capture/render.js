// render planned shots: node render.js DIR PLAN.json ; plan = {seed, shots:[{name, from, to, rate?, cam:{...}}]}, from/to in 30fps sim frames
const rig = require('./rig');
const fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
(async () => {
  const [dir, planFile] = [process.argv[2], process.argv[3]];
  const plan = JSON.parse(fs.readFileSync(planFile));
  const { browser, page } = await rig.open(dir, plan.seed, { len: 600 });
  await page.addScriptTag({ path: path.join(__dirname, 'director.js') });
  // game time in sim frames: the sim counts a frame only once R3 exists
  await page.evaluate(() => { window.__gf = 0; });
  const adv = (n, dtF, render) => page.evaluate(([n, dtF, render]) => {
    window.NORENDER3 = render ? 0 : 1;
    for (let i = 0; i < n; i++) { window.__adv(1000 / 30 * dtF); if (window.R3) window.__gf += dtF; }
    return window.__gf;
  }, [n, dtF, render]);
  const shots = plan.shots.slice().sort((a, b) => a.from - b.from);
  const log = [];
  for (const s of shots) {
    if (process.argv[4] && !s.name.includes(process.argv[4])) continue;
    let gf = await page.evaluate(() => window.__gf);
    if (s.from < gf - 0.01) { console.log('skip overlapping', s.name); continue; }
    while (gf < s.from - 0.01) gf = await adv(Math.max(1, Math.min(600, Math.round(s.from - gf))), 1, false);
    await page.evaluate((cam) => { window.__shot = Object.assign({ cut: 1 }, cam); window.__cs = null; }, s.cam);
    const out = path.join(dir, 'shots', s.name + '.mp4');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const rate = s.rate || 1, t0 = Date.now();
    let n = 0, scoreAt = null;
    while (gf < s.to - 0.01) {
      const r = await page.evaluate((rate) => { window.NORENDER3 = 0; window.__adv(1000 / 30 * rate); window.__gf += rate; return [window.__gf, document.querySelector('#g3 canvas').toDataURL('image/jpeg', 0.93).split(',')[1], window.R3.h.score.join('-')]; }, rate);
      gf = r[0];
      if (scoreAt === null) scoreAt = r[2]; else if (r[2] !== scoreAt) { log.push(`${s.name}: score ${scoreAt}->${r[2]} at gf ${gf.toFixed(2)}`); scoreAt = r[2]; }
      if (!ff.stdin.write(Buffer.from(r[1], 'base64'))) await new Promise(res => ff.stdin.once('drain', res));
      n++;
    }
    ff.stdin.end();
    await new Promise(res => ff.on('close', res));
    await page.evaluate(() => { window.__shot = null; });
    console.log('shot', s.name, n, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  log.forEach(l => console.log(l));
  await browser.close();
})();
