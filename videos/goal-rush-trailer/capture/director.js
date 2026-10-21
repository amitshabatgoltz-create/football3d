// camera director, evaluated in the page: window.__shot = {type, ...}; called every frame before render
window.__cs = null;
window.CAM3 = () => {
  const R = window.R3, S = window.__shot;
  if (!R || !S) { window.CAMX = null; return; }
  if (!window.CAMX) window.CAMX = R.dB.clone();
  const cam = window.CAMX, c = R.c, P = R.pA, RA = R.RA;
  const subj = S.player != null ? P[S.player] : (c.owner || null);
  const sx = subj ? subj.x : c.x, sz = subj ? subj.z : c.z;
  const dirAtk = S.dir != null ? S.dir : (c.owner ? c.owner.dir : (Math.abs(c.vx) > 1 ? Math.sign(c.vx) : 1));
  let pos, look, fov = S.fov || 30;
  const tf = S.t = (S.t || 0) + 1 / 30;
  switch (S.type) {
    case 'tele': { // tight broadcast, high side, long lens
      const side = S.side || 1;
      pos = [c.x * 0.9 + (S.dx || 0), S.h || 10, side * (S.dist || 46)];
      look = [c.x, 0.9, c.z * 0.8];
      fov = S.fov || 13; break;
    }
    case 'chase': { // behind the ball carrier, low
      pos = [sx - dirAtk * (S.back || 6.5), S.h || 2.4, sz + (S.off || 1.0)];
      look = [sx + dirAtk * (S.ahead || 2.5), S.ly || 0.5, sz];
      fov = S.fov || 34; break;
    }
    case 'low': { // touchline, near the grass, tracking
      const side = S.side || 1;
      pos = [c.x - dirAtk * (S.lead || 2), S.h || 0.45, c.z + side * (S.dist || 9)];
      look = [c.x, 0.55, c.z];
      fov = S.fov || 30; break;
    }
    case 'goal': { // behind the net, looking out at the shooter
      const gx = S.gx || dirAtk;
      pos = [gx * (RA + (S.back || 7)), S.h || 1.6, S.z || 2.5];
      look = [c.x, 0.9 + c.y * 0.6, c.z];
      fov = S.fov || 30; break;
    }
    case 'orbit': { // slow orbit around a player
      const a = (S.a0 || 0) + tf * (S.spin || 0.35);
      const r = S.r || 3.6;
      pos = [sx + Math.cos(a) * r, S.h || 1.45, sz + Math.sin(a) * r];
      look = [sx, S.ly || 1.2, sz];
      fov = S.fov || 34; break;
    }
    case 'drone': { // overhead tactical
      pos = [c.x - dirAtk * 6, S.h || 42, c.z + 8];
      look = [c.x + dirAtk * 2, 0, c.z];
      fov = S.fov || 34; break;
    }
    case 'ball': { // ahead of the ball, on the grass, looking back
      const v = Math.hypot(c.vx, c.vz) > 0.5 ? [c.vx / Math.hypot(c.vx, c.vz), c.vz / Math.hypot(c.vx, c.vz)] : [dirAtk, 0];
      pos = [c.x + v[0] * (S.ahead || 3) + v[1] * 1.2, S.h || 0.35, c.z + v[1] * (S.ahead || 3) - v[0] * 1.2];
      look = [c.x, c.y + 0.35, c.z];
      fov = S.fov || 44; break;
    }
    case 'fixed': { pos = S.pos; look = S.look || [c.x, 0.9, c.z]; fov = S.fov || 30; break; }
  }
  const k = S.smooth != null ? S.smooth : 0.12;
  const cs = window.__cs;
  if (!cs || cs.type !== S.type || S.cut) { window.__cs = { type: S.type, pos: pos.slice(), look: look.slice() }; S.cut = 0; }
  else { for (let i = 0; i < 3; i++) { cs.pos[i] += (pos[i] - cs.pos[i]) * k; cs.look[i] += (look[i] - cs.look[i]) * Math.min(1, k * 1.6); } }
  const q = window.__cs;
  cam.position.set(q.pos[0], q.pos[1], q.pos[2]);
  cam.fov = fov; cam.aspect = R.dB.aspect; cam.near = 0.1; cam.far = 2000;
  cam.updateProjectionMatrix();
  cam.lookAt(q.look[0], q.look[1], q.look[2]);
};
