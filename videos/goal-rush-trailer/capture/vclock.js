// virtual clock + seeded randomness, injected before the game runs
(() => {
  let seed = (window.__SEED || 12345) >>> 0;
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const __pn = performance.now.bind(performance);
  window.__rt = () => __pn();
  window.__reseed = (v) => { seed = v >>> 0; };
  // render-side randomness (three.js UUIDs, camera clones) must not touch the game's stream
  let alt = 987654321;
  const altRand = () => { alt |= 0; alt = (alt + 0x6d2b79f5) | 0; let t = Math.imul(alt ^ (alt >>> 15), 1 | alt); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__isoR = (fn) => { const keep = Math.random; Math.random = altRand; try { return fn(); } finally { Math.random = keep; } };
  let T = 1000;
  const raf = new Map(); let rid = 0;
  const timers = new Map(); let tid = 0;
  performance.now = () => T;
  Date.now = () => 1.7e12 + T;
  window.requestAnimationFrame = (cb) => { raf.set(++rid, cb); return rid; };
  window.cancelAnimationFrame = (id) => raf.delete(id);
  const st = (cb, ms, rep, args) => { const id = ++tid; timers.set(id, { cb, at: T + Math.max(0, +ms || 0), every: rep ? Math.max(1, +ms || 0) : 0, args }); return id; };
  window.setTimeout = (cb, ms, ...a) => st(cb, ms, false, a);
  window.setInterval = (cb, ms, ...a) => st(cb, ms, true, a);
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  window.__tstat = () => { const o = {}; for (const [, t] of timers) { const k = String(t.cb).slice(0, 60) + '|' + t.every; o[k] = (o[k] || 0) + 1; } return { n: timers.size, raf: raf.size, top: Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5) }; };
  window.__adv = (ms) => {
    T += ms;
    for (let guard = 0; guard < 1000; guard++) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= T && (!next || t.at < next[1].at)) next = [id, t];
      if (!next) break;
      const [id, t] = next;
      if (t.every) t.at += t.every; else timers.delete(id);
      try { typeof t.cb === 'function' ? t.cb(...t.args) : eval(t.cb); } catch (e) { console.error('timer', e); }
    }
    const cbs = [...raf.values()]; raf.clear();
    for (const cb of cbs) { try { cb(T); } catch (e) { console.error('raf', e); } }
  };
})();
