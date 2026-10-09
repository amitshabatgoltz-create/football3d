// FootballCharacter — stylized 3D footballer built from Babylon.js primitives,
// with a joint skeleton and a keyframe animation system you can extend.
//
// Usage:
//   const hero = FootballCharacter.create(scene, { shirt:"#3B82F6", number:10 });
//   hero.root.position.x = 5;      // move/rotate hero.root like any node
//   hero.setSpeed(1);              // 0 = idle, 1 = full run (blends automatically)
//   hero.play("kick");             // one-shot animation, then back to idle/run
//   scene.onBeforeRenderObservable.add(() => hero.update(engine.getDeltaTime()/1000));
//
// Adding your own animation — add an entry to FootballCharacter.ANIMATIONS:
//   FootballCharacter.ANIMATIONS.myDance = {
//     label: "My dance", duration: 1.2, loop: false,
//     keys: [
//       { t: 0,   pose: {} },                                   // {} = rest pose
//       { t: 0.5, pose: { shoulderR: [0,0,2.8], pos: [0,0.3,0] } },
//       { t: 1,   pose: {} },
//     ],
//   };
//   hero.play("myDance");
//
// Joints (values are [x,y,z] rotations in radians):
//   body (whole-body spin), spine, neck, head,
//   shoulderL, elbowL, shoulderR, elbowR,
//   hipL, kneeL, ankleL, hipR, kneeR, ankleR
//   pos = [x,y,z] whole-body offset (jumping, bobbing)
// Direction cheat-sheet (character faces +z):
//   legs/arms:  x < 0 swings forward,  x > 0 swings backward
//   knees:      x > 0 bends;  elbows: x < 0 bends
//   shoulderR:  z > 0 raises arm sideways;  shoulderL: z < 0 raises it
//   spine/neck/head: x > 0 leans forward, y turns
(function (global) {
  const B = () => global.BABYLON;

  const JOINTS = ["body", "spine", "neck", "head",
    "shoulderL", "elbowL", "shoulderR", "elbowR",
    "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR"];

  // ---------- Animations ----------
  const ANIMATIONS = {
    idle: {
      label: "עמידה", duration: 2.4, loop: true,
      keys: [
        { t: 0,   pose: { spine: [0.02,0,0], shoulderL: [0,0,-0.12], shoulderR: [0,0,0.12], elbowL: [-0.15,0,0], elbowR: [-0.15,0,0], kneeL: [0.06,0,0], kneeR: [0.06,0,0], hipL: [-0.03,0,0], hipR: [-0.03,0,0] } },
        { t: 1.2, pose: { spine: [0.05,0,0], head: [0,0.12,0], shoulderL: [0,0,-0.16], shoulderR: [0,0,0.16], elbowL: [-0.22,0,0], elbowR: [-0.22,0,0], kneeL: [0.1,0,0], kneeR: [0.1,0,0], hipL: [-0.05,0,0], hipR: [-0.05,0,0], pos: [0,-0.012,0] } },
        { t: 2.4, pose: { spine: [0.02,0,0], shoulderL: [0,0,-0.12], shoulderR: [0,0,0.12], elbowL: [-0.15,0,0], elbowR: [-0.15,0,0], kneeL: [0.06,0,0], kneeR: [0.06,0,0], hipL: [-0.03,0,0], hipR: [-0.03,0,0] } },
      ],
    },
    run: {
      label: "ריצה", duration: 0.62, loop: true,
      keys: [
        { t: 0,     pose: { spine: [0.2,0,0], head: [-0.12,0,0], hipR: [-0.75,0,0], kneeR: [0.3,0,0], hipL: [0.55,0,0], kneeL: [0.8,0,0], shoulderR: [0.7,0,0.12], shoulderL: [-0.7,0,-0.12], elbowR: [-1.2,0,0], elbowL: [-1.4,0,0], pos: [0,0,0] } },
        { t: 0.155, pose: { spine: [0.2,0,0], head: [-0.12,0,0], hipR: [0.05,0,0], kneeR: [0.25,0,0], hipL: [-0.15,0,0], kneeL: [1.6,0,0], shoulderR: [0,0,0.12], shoulderL: [0,0,-0.12], elbowR: [-1.3,0,0], elbowL: [-1.3,0,0], pos: [0,0.07,0] } },
        { t: 0.31,  pose: { spine: [0.2,0,0], head: [-0.12,0,0], hipL: [-0.75,0,0], kneeL: [0.3,0,0], hipR: [0.55,0,0], kneeR: [0.8,0,0], shoulderL: [0.7,0,-0.12], shoulderR: [-0.7,0,0.12], elbowL: [-1.2,0,0], elbowR: [-1.4,0,0], pos: [0,0,0] } },
        { t: 0.465, pose: { spine: [0.2,0,0], head: [-0.12,0,0], hipL: [0.05,0,0], kneeL: [0.25,0,0], hipR: [-0.15,0,0], kneeR: [1.6,0,0], shoulderL: [0,0,-0.12], shoulderR: [0,0,0.12], elbowL: [-1.3,0,0], elbowR: [-1.3,0,0], pos: [0,0.07,0] } },
        { t: 0.62,  pose: { spine: [0.2,0,0], head: [-0.12,0,0], hipR: [-0.75,0,0], kneeR: [0.3,0,0], hipL: [0.55,0,0], kneeL: [0.8,0,0], shoulderR: [0.7,0,0.12], shoulderL: [-0.7,0,-0.12], elbowR: [-1.2,0,0], elbowL: [-1.4,0,0], pos: [0,0,0] } },
      ],
    },
    kick: {
      label: "בעיטה", duration: 0.55, loop: false,
      keys: [
        { t: 0,    pose: {} },
        { t: 0.12, pose: { spine: [0.1,0,0], hipR: [0.85,0,0], kneeR: [1.5,0,0], ankleR: [0.4,0,0], kneeL: [0.25,0,0], shoulderL: [-0.3,0,-0.9], shoulderR: [0.4,0,0.6], elbowL: [-0.4,0,0] } },
        { t: 0.22, pose: { spine: [-0.12,0,0], hipR: [-1.35,0,0], kneeR: [0.05,0,0], ankleR: [0.5,0,0], kneeL: [0.3,0,0], shoulderL: [-0.2,0,-1.1], shoulderR: [0.6,0,0.5], elbowL: [-0.3,0,0], pos: [0,0.02,0] } },
        { t: 0.36, pose: { spine: [-0.05,0,0], hipR: [-0.9,0,0], kneeR: [0.4,0,0], kneeL: [0.2,0,0], shoulderL: [0,0,-0.6], shoulderR: [0.3,0,0.4] } },
        { t: 0.55, pose: {} },
      ],
    },
    header: {
      label: "נגיחה", duration: 0.75, loop: false,
      keys: [
        { t: 0,    pose: {} },
        { t: 0.15, pose: { kneeL: [0.8,0,0], kneeR: [0.8,0,0], hipL: [-0.5,0,0], hipR: [-0.5,0,0], spine: [0.25,0,0], shoulderL: [0.6,0,-0.3], shoulderR: [0.6,0,0.3], pos: [0,-0.15,0] } },
        { t: 0.35, pose: { spine: [-0.35,0,0], neck: [-0.3,0,0], kneeL: [0.6,0,0], kneeR: [0.6,0,0], shoulderL: [-0.3,0,-1.2], shoulderR: [-0.3,0,1.2], pos: [0,0.55,0] } },
        { t: 0.47, pose: { spine: [0.35,0,0], neck: [0.35,0,0], head: [0.2,0,0], kneeL: [0.9,0,0], kneeR: [0.9,0,0], hipL: [-0.4,0,0], hipR: [-0.4,0,0], shoulderL: [0.3,0,-0.9], shoulderR: [0.3,0,0.9], pos: [0,0.5,0] } },
        { t: 0.62, pose: { kneeL: [0.7,0,0], kneeR: [0.7,0,0], hipL: [-0.4,0,0], hipR: [-0.4,0,0], spine: [0.2,0,0], pos: [0,-0.1,0] } },
        { t: 0.75, pose: {} },
      ],
    },
    celebrate: {
      label: "חגיגה", duration: 1.8, loop: false,
      keys: [
        { t: 0,    pose: {} },
        { t: 0.2,  pose: { kneeL: [0.7,0,0], kneeR: [0.7,0,0], hipL: [-0.35,0,0], hipR: [-0.35,0,0], shoulderL: [0,0,-0.4], shoulderR: [0,0,0.4], elbowL: [-1.5,0,0], elbowR: [-1.5,0,0], pos: [0,-0.12,0] } },
        { t: 0.45, pose: { spine: [-0.2,0,0], head: [-0.3,0,0], shoulderL: [0,0,-2.8], shoulderR: [0,0,2.8], elbowL: [-0.2,0,0], elbowR: [-0.2,0,0], kneeL: [0.4,0,0], kneeR: [0.2,0,0], pos: [0,0.65,0] } },
        { t: 0.7,  pose: { kneeL: [0.6,0,0], kneeR: [0.6,0,0], hipL: [-0.3,0,0], hipR: [-0.3,0,0], shoulderL: [0,0,-2.6], shoulderR: [0,0,2.6], pos: [0,-0.08,0] } },
        { t: 0.95, pose: { shoulderR: [-0.4,0,2.9], elbowR: [-0.6,0,0], shoulderL: [0,0,-0.5], elbowL: [-1.6,0,0], spine: [-0.1,0.2,0] } },
        { t: 1.2,  pose: { shoulderR: [-0.4,0,2.3], elbowR: [-1.5,0,0], shoulderL: [0,0,-0.5], elbowL: [-1.6,0,0], spine: [0.1,0.2,0] } },
        { t: 1.45, pose: { shoulderR: [-0.4,0,2.9], elbowR: [-0.6,0,0], shoulderL: [0,0,-0.5], elbowL: [-1.6,0,0], spine: [-0.1,0.2,0] } },
        { t: 1.8,  pose: {} },
      ],
    },
    siu: {
      label: "סיייוו!", duration: 2.0, loop: false,
      keys: [
        { t: 0,    pose: {} },
        { t: 0.25, pose: { kneeL: [0.9,0,0], kneeR: [0.9,0,0], hipL: [-0.45,0,0], hipR: [-0.45,0,0], spine: [0.2,0,0], shoulderL: [0.5,0,-0.3], shoulderR: [0.5,0,0.3], pos: [0,-0.18,0] } },
        { t: 0.55, pose: { body: [0,Math.PI*0.6,0], kneeL: [1.2,0,0], kneeR: [1.2,0,0], hipL: [-0.9,0,0], hipR: [-0.9,0,0], shoulderL: [0,0,-1.6], shoulderR: [0,0,1.6], pos: [0,0.9,0] } },
        { t: 0.8,  pose: { body: [0,Math.PI,0], kneeL: [0.6,0,0], kneeR: [0.6,0,0], hipL: [-0.2,0,-0.25], hipR: [-0.2,0,0.25], shoulderL: [0,0,-1.2], shoulderR: [0,0,1.2], pos: [0,0.15,0] } },
        { t: 1.0,  pose: { body: [0,Math.PI,0], spine: [-0.25,0,0], head: [-0.2,0,0], kneeL: [0.5,0,0], kneeR: [0.5,0,0], hipL: [-0.25,0,-0.35], hipR: [-0.25,0,0.35], shoulderL: [0.6,0,-0.6], shoulderR: [0.6,0,0.6], elbowL: [-0.1,0,0], elbowR: [-0.1,0,0], pos: [0,-0.12,0] } },
        { t: 1.6,  pose: { body: [0,Math.PI,0], spine: [-0.3,0,0], head: [-0.25,0,0], kneeL: [0.45,0,0], kneeR: [0.45,0,0], hipL: [-0.22,0,-0.35], hipR: [-0.22,0,0.35], shoulderL: [0.7,0,-0.6], shoulderR: [0.7,0,0.6], pos: [0,-0.1,0] } },
        { t: 2.0,  pose: { body: [0,Math.PI*2,0] } },
      ],
    },
    wave: {
      label: "נפנוף", duration: 1.6, loop: false,
      keys: [
        { t: 0,   pose: {} },
        { t: 0.3, pose: { shoulderR: [0,0,2.6], elbowR: [-0.5,0,0], head: [0,0.2,0] } },
        { t: 0.55,pose: { shoulderR: [0,0,2.3], elbowR: [-0.2,0,0.5], head: [0,0.2,0] } },
        { t: 0.8, pose: { shoulderR: [0,0,2.6], elbowR: [-0.5,0,-0.4], head: [0,0.2,0] } },
        { t: 1.05,pose: { shoulderR: [0,0,2.3], elbowR: [-0.2,0,0.5], head: [0,0.2,0] } },
        { t: 1.3, pose: { shoulderR: [0,0,2.6], elbowR: [-0.5,0,-0.4], head: [0,0.1,0] } },
        { t: 1.6, pose: {} },
      ],
    },
    dance: {
      label: "ריקוד", duration: 2.4, loop: false,
      keys: [
        { t: 0,   pose: {} },
        { t: 0.3, pose: { spine: [0,0,0.2], shoulderR: [-1.2,0,0.4], elbowR: [-1.4,0,0], shoulderL: [0.3,0,-0.3], kneeR: [0.4,0,0], hipR: [-0.2,0,0], pos: [0.06,-0.06,0] } },
        { t: 0.6, pose: { spine: [0,0,-0.2], shoulderL: [-1.2,0,-0.4], elbowL: [-1.4,0,0], shoulderR: [0.3,0,0.3], kneeL: [0.4,0,0], hipL: [-0.2,0,0], pos: [-0.06,-0.06,0] } },
        { t: 0.9, pose: { spine: [0,0,0.2], shoulderR: [-1.2,0,0.4], elbowR: [-1.4,0,0], shoulderL: [0.3,0,-0.3], kneeR: [0.4,0,0], hipR: [-0.2,0,0], pos: [0.06,-0.06,0] } },
        { t: 1.2, pose: { spine: [0,0,-0.2], shoulderL: [-1.2,0,-0.4], elbowL: [-1.4,0,0], shoulderR: [0.3,0,0.3], kneeL: [0.4,0,0], hipL: [-0.2,0,0], pos: [-0.06,-0.06,0] } },
        { t: 1.5, pose: { body: [0,Math.PI,0], shoulderL: [0,0,-1.4], shoulderR: [0,0,1.4], pos: [0,0.2,0] } },
        { t: 1.8, pose: { body: [0,Math.PI*2,0], shoulderL: [0,0,-1.4], shoulderR: [0,0,1.4] } },
        { t: 2.1, pose: { body: [0,Math.PI*2,0], shoulderR: [-0.3,0,2.7], shoulderL: [-0.3,0,-2.7], spine: [-0.15,0,0] } },
        { t: 2.4, pose: { body: [0,Math.PI*2,0] } },
      ],
    },
  };

  // ---------- Pose sampling (Catmull-Rom between keys) ----------
  const ZERO = [0, 0, 0];
  function keyVal(k, j) { return k.pose[j] || ZERO; }
  function catmull(p0, p1, p2, p3, u) {
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  }
  function sample(anim, t, out) {
    const keys = anim.keys, n = keys.length;
    if (anim.loop) t = ((t % anim.duration) + anim.duration) % anim.duration;
    else t = Math.max(0, Math.min(anim.duration, t));
    let i = 0;
    while (i < n - 2 && t > keys[i + 1].t) i++;
    const k1 = keys[i], k2 = keys[i + 1];
    const span = Math.max(1e-6, k2.t - k1.t);
    const u = Math.max(0, Math.min(1, (t - k1.t) / span));
    // neighbours: wrap for loops (first/last keys are equal), clamp otherwise
    const k0 = i > 0 ? keys[i - 1] : (anim.loop ? keys[n - 2] : k1);
    const k3 = i + 2 < n ? keys[i + 2] : (anim.loop ? keys[1] : k2);
    for (const j of JOINTS.concat("pos")) {
      const a = keyVal(k0, j), b = keyVal(k1, j), c = keyVal(k2, j), d = keyVal(k3, j);
      const o = out[j] || (out[j] = [0, 0, 0]);
      for (let x = 0; x < 3; x++) o[x] = catmull(a[x], b[x], c[x], d[x], u);
    }
    return out;
  }
  function mix(a, b, w, out) {
    for (const j of JOINTS.concat("pos")) {
      const o = out[j] || (out[j] = [0, 0, 0]);
      for (let x = 0; x < 3; x++) o[x] = a[j][x] + (b[j][x] - a[j][x]) * w;
    }
    return out;
  }

  // ---------- Model ----------
  function create(scene, opts) {
    const BJ = B();
    opts = Object.assign({
      name: "hero",
      shirt: "#3B82F6", shirt2: "#FFFFFF", shorts: "#FFFFFF", socks: "#3B82F6", boots: "#111111",
      skin: "#E2AE8A", hair: "#2A1B12", hairStyle: "fringe", eyes: "#4A2E1C",
      number: 10, playerName: "",
    }, opts || {});
    const N = opts.name;
    const C = (hex) => BJ.Color3.FromHexString(hex);
    const meshes = [];
    const mats = {};
    const eyes = [];
    function mat(key, hex, spec) {
      if (mats[key]) return mats[key];
      const m = new BJ.StandardMaterial(N + "_" + key, scene);
      m.diffuseColor = C(hex);
      m.specularColor = new BJ.Color3(spec || 0.05, spec || 0.05, spec || 0.05);
      return (mats[key] = m);
    }
    const shade = (hex, f) => {
      const c = C(hex); return new BJ.Color3(c.r * f, c.g * f, c.b * f).toHexString();
    };
    const mixHex = (h1, h2, w) => {
      const a = C(h1), b = C(h2);
      return new BJ.Color3(a.r + (b.r - a.r) * w, a.g + (b.g - a.g) * w, a.b + (b.b - a.b) * w).toHexString();
    };
    const M = {
      skin: mat("skin", opts.skin, 0.12),
      skinDark: mat("skinDark", shade(opts.skin, 0.88), 0.08),
      lips: mat("lips", mixHex(opts.skin, "#B5645C", 0.45), 0.15),
      hair: mat("hair", opts.hair, 0.12),
      hairHi: mat("hairHi", mixHex(opts.hair, "#8A6142", 0.3), 0.15),
      fade: mat("fade", mixHex(opts.hair, opts.skin, 0.3), 0.03),
      brow: mat("brow", shade(opts.hair, 0.8), 0.02),
      white: mat("eyeW", "#F4F1EC", 0.3),
      iris: mat("iris", opts.eyes, 0.4),
      pupil: mat("pupil", "#0B0705", 0.6),
      shirt: mat("shirt", opts.shirt, 0.08),
      shirt2: mat("shirt2", opts.shirt2, 0.08),
      shorts: mat("shorts", opts.shorts, 0.08),
      socks: mat("socks", opts.socks, 0.05),
      boots: mat("boots", opts.boots, 0.5),
      sole: mat("sole", "#E8E8E8", 0.1),
    };
    function node(name, parent, x, y, z) {
      const t = new BJ.TransformNode(N + "_" + name, scene);
      t.parent = parent; t.position.set(x || 0, y || 0, z || 0);
      return t;
    }
    function add(m, parent, material) {
      m.parent = parent; m.material = material; m.isPickable = false;
      meshes.push(m); return m;
    }
    const sphere = (name, parent, material, d, x, y, z, sx, sy, sz, extra) => {
      const m = add(BJ.MeshBuilder.CreateSphere(N + "_" + name, Object.assign({ diameter: d, segments: 16 }, extra || {}), scene), parent, material);
      m.position.set(x, y, z); m.scaling.set(sx || 1, sy || 1, sz || 1); return m;
    };
    // capsule hanging down from a joint
    const limb = (name, parent, material, len, r, top) => {
      const m = add(BJ.MeshBuilder.CreateCapsule(N + "_" + name, { height: len + r * 1.2, radius: r, tessellation: 14, subdivisions: 2 }, scene), parent, material);
      m.position.y = -(top || 0) - len / 2; return m;
    };

    const root = new BJ.TransformNode(N, scene);
    const body = node("body", root);
    const hips = node("hips", body, 0, 0.98, 0);
    const J = { body };

    // --- torso & shorts ---
    const spine = J.spine = node("spine", hips, 0, 0.04, 0);
    const torso = add(BJ.MeshBuilder.CreateCylinder(N + "_torso", { height: 0.6, diameterTop: 0.56, diameterBottom: 0.46, tessellation: 20 }, scene), spine, M.shirt);
    torso.position.y = 0.3; torso.scaling.z = 0.62;
    const chest = sphere("chest", spine, M.shirt, 0.56, 0, 0.5, 0, 1, 0.42, 0.62);
    const collar = add(BJ.MeshBuilder.CreateTorus(N + "_collar", { diameter: 0.17, thickness: 0.035, tessellation: 20 }, scene), spine, M.shirt2);
    collar.position.set(0, 0.6, 0.0); collar.scaling.z = 0.9;
    const stripe = add(BJ.MeshBuilder.CreateCylinder(N + "_stripe", { height: 0.05, diameter: 0.465, tessellation: 20 }, scene), spine, M.shirt2);
    stripe.position.y = 0.03; stripe.scaling.z = 0.63;
    const shorts = add(BJ.MeshBuilder.CreateCylinder(N + "_shorts", { height: 0.24, diameterTop: 0.47, diameterBottom: 0.5, tessellation: 20 }, scene), hips, M.shorts);
    shorts.position.y = -0.06; shorts.scaling.z = 0.66;

    // back number + name
    const tex = new BJ.DynamicTexture(N + "_numTex", { width: 256, height: 256 }, scene, true);
    tex.hasAlpha = true;
    function drawBack(num, name) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, 256, 256);
      ctx.fillStyle = opts.shirt2; ctx.textAlign = "center";
      if (name) { ctx.font = "bold 34px Arial"; ctx.fillText(String(name).toUpperCase(), 128, 52); }
      ctx.font = "bold 150px Arial"; ctx.fillText(String(num), 128, 205);
      tex.update();
    }
    drawBack(opts.number, opts.playerName);
    const numMat = new BJ.StandardMaterial(N + "_numMat", scene);
    numMat.diffuseTexture = tex; numMat.useAlphaFromDiffuseTexture = true;
    numMat.specularColor = new BJ.Color3(0, 0, 0); numMat.backFaceCulling = true;
    const back = add(BJ.MeshBuilder.CreatePlane(N + "_back", { size: 0.4 }, scene), spine, numMat);
    back.position.set(0, 0.3, -0.162); back.rotation.x = 0.08;  // planes face -z by default
    // small chest number
    const front = add(BJ.MeshBuilder.CreatePlane(N + "_front", { size: 0.13 }, scene), spine, numMat);
    front.position.set(0.1, 0.42, 0.178); front.rotation.y = Math.PI; front.rotation.x = 0.25;

    // --- neck & head ---
    const neck = J.neck = node("neck", spine, 0, 0.6, 0);
    limb("neckM", neck, M.skin, 0.08, 0.075, -0.08);
    const head = J.head = node("head", neck, 0, 0.07, 0);
    buildHead(head);

    // --- arms ---
    function arm(side) {
      const s = side === "R" ? 1 : -1;
      const sh = J["shoulder" + side] = node("shoulder" + side, spine, s * 0.3, 0.53, 0);
      sphere("delt" + side, sh, M.shirt, 0.17, 0, -0.02, 0, 1, 1, 1);
      const sleeve = add(BJ.MeshBuilder.CreateCylinder(N + "_sleeve" + side, { height: 0.17, diameterTop: 0.16, diameterBottom: 0.145, tessellation: 14 }, scene), sh, M.shirt);
      sleeve.position.y = -0.09;
      const cuff = add(BJ.MeshBuilder.CreateTorus(N + "_cuff" + side, { diameter: 0.14, thickness: 0.02, tessellation: 14 }, scene), sh, M.shirt2);
      cuff.position.y = -0.175;
      limb("upper" + side, sh, M.skin, 0.28, 0.055);
      const el = J["elbow" + side] = node("elbow" + side, sh, 0, -0.29, 0);
      limb("fore" + side, el, M.skin, 0.25, 0.05);
      sphere("hand" + side, el, M.skin, 0.115, 0, -0.29, 0.005, 0.8, 1.05, 0.9);
    }
    arm("R"); arm("L");

    // --- legs ---
    function leg(side) {
      const s = side === "R" ? 1 : -1;
      const hp = J["hip" + side] = node("hip" + side, hips, s * 0.12, -0.04, 0);
      const sh = add(BJ.MeshBuilder.CreateCylinder(N + "_shortLeg" + side, { height: 0.2, diameterTop: 0.22, diameterBottom: 0.23, tessellation: 14 }, scene), hp, M.shorts);
      sh.position.y = -0.1;
      limb("thigh" + side, hp, M.skin, 0.44, 0.08);
      const kn = J["knee" + side] = node("knee" + side, hp, 0, -0.45, 0);
      sphere("kneeCap" + side, kn, M.skin, 0.14, 0, 0, 0.01, 1, 1, 1);
      limb("shin" + side, kn, M.socks, 0.38, 0.07, 0.04);
      const band = add(BJ.MeshBuilder.CreateTorus(N + "_sockBand" + side, { diameter: 0.145, thickness: 0.03, tessellation: 14 }, scene), kn, M.shirt2);
      band.position.y = -0.1;
      const an = J["ankle" + side] = node("ankle" + side, kn, 0, -0.44, 0);
      const boot = add(BJ.MeshBuilder.CreateBox(N + "_boot" + side, { width: 0.13, height: 0.09, depth: 0.27 }, scene), an, M.boots);
      boot.position.set(0, -0.025, 0.05);
      sphere("toe" + side, an, M.boots, 0.13, 0, -0.03, 0.17, 1, 0.68, 1);
      const sole = add(BJ.MeshBuilder.CreateBox(N + "_sole" + side, { width: 0.135, height: 0.025, depth: 0.32 }, scene), an, M.sole);
      sole.position.set(0, -0.075, 0.06);
      const swoosh = add(BJ.MeshBuilder.CreateBox(N + "_swoosh" + side, { width: 0.135, height: 0.02, depth: 0.15 }, scene), an, M.shirt);
      swoosh.position.set(0, -0.02, 0.06); swoosh.rotation.x = 0.2;
    }
    leg("R"); leg("L");

    // --- head details ---
    function buildHead(h) {
      const hc = node("headCenter", h, 0, 0.23, 0.01);
      const R = { x: 0.185, y: 0.235, z: 0.21 };   // head ellipsoid radii
      sphere("skull", hc, M.skin, 2, 0, 0, 0, R.x, R.y, R.z, { segments: 24 });
      const surf = (x, y) => Math.sqrt(Math.max(0, 1 - (x / R.x) ** 2 - (y / R.y) ** 2)) * R.z;
      sphere("chin", hc, M.skin, 0.12, 0, -0.19, surf(0, -0.19) - 0.05, 1, 0.8, 0.9);
      // ears
      for (const s of [1, -1]) {
        const ear = sphere("ear" + s, hc, M.skin, 0.1, s * R.x * 0.97, -0.01, -0.01, 0.42, 1, 0.72);
        ear.rotation.y = s * 0.35;
        sphere("earIn" + s, hc, M.skinDark, 0.06, s * R.x * 1.03, -0.01, 0.0, 0.25, 0.8, 0.5);
      }
      // eyes
      for (const s of [1, -1]) {
        const ex = s * 0.074, ey = -0.004, ez = surf(ex, ey) - 0.018;
        const eye = node("eye" + s, hc, ex, ey, ez);
        sphere("eyeW" + s, eye, M.white, 0.08, 0, 0, 0, 1, 0.78, 0.55);
        sphere("iris" + s, eye, M.iris, 0.044, 0, 0, 0.016, 1, 1, 0.4);
        sphere("pupil" + s, eye, M.pupil, 0.022, 0, 0, 0.022, 1, 1, 0.4);
        sphere("shine" + s, eye, M.white, 0.01, 0.008, 0.009, 0.026, 1, 1, 0.5);
        // upper eyelid line (gives the heavy-lashed look)
        const lid = add(BJ.MeshBuilder.CreateBox(N + "_lid" + s, { width: 0.078, height: 0.011, depth: 0.03 }, scene), eye, M.pupil);
        lid.position.set(0, 0.022, 0.012); lid.rotation.z = s * -0.08;
        eyes.push(eye);
        // thick dark eyebrows
        const brow = add(BJ.MeshBuilder.CreateBox(N + "_brow" + s, { width: 0.1, height: 0.026, depth: 0.025 }, scene), hc, M.brow);
        brow.position.set(s * 0.076, 0.058, surf(s * 0.076, 0.058) - 0.002);
        brow.rotation.z = s * 0.07; brow.rotation.y = s * 0.3;
      }
      // nose
      sphere("nose", hc, M.skin, 0.06, 0, -0.045, surf(0, -0.045) + 0.002, 0.75, 1.2, 1);
      sphere("noseTip", hc, M.skin, 0.05, 0, -0.07, surf(0, -0.07) + 0.016, 1, 0.85, 0.9);
      for (const s of [1, -1]) sphere("nostril" + s, hc, M.skinDark, 0.024, s * 0.018, -0.084, surf(0, -0.084) + 0.008, 1, 0.6, 0.8);
      // lips (full)
      const mz = surf(0, -0.14) - 0.004;
      sphere("lipTop", hc, M.lips, 0.1, 0, -0.128, mz + 0.012, 0.95, 0.24, 0.35);
      sphere("lipBot", hc, M.lips, 0.1, 0, -0.152, mz + 0.008, 0.85, 0.3, 0.38);

      // hair
      const cone = (name, material, h, w, x, y, z, rx, ry, rz) => {
        const m = add(BJ.MeshBuilder.CreateCylinder(N + "_" + name, { height: h, diameterTop: w, diameterBottom: 0.004, tessellation: 8 }, scene), hc, material);
        m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scaling.z = 0.4; return m;
      };
      if (opts.hairStyle === "fringe") {
        // short faded sides & back: cap tilted forward so it starts high on the
        // temples and runs down to the nape
        const fadeCap = sphere("fade", hc, M.fade, 2, 0, 0.0, -0.004, R.x * 1.03, R.y * 1.03, R.z * 1.04, { segments: 28, slice: 0.5 });
        fadeCap.rotation.x = -0.5;
        // thick volume on top, low at the front (fringe), ending above the ears
        const top = sphere("hairTop", hc, M.hair, 2, 0, 0.03, 0.0, R.x * 1.14, R.y * 0.96, R.z * 1.13, { segments: 28, slice: 0.53 });
        top.rotation.x = -0.3;
        // jagged fringe hanging over the forehead down to the eyebrows
        const fr = [-0.13, -0.095, -0.06, -0.025, 0.01, 0.045, 0.08, 0.115, 0.145];
        fr.forEach((x, i) => {
          const len = 0.07 + ((i * 37) % 5) * 0.008;
          const y = 0.085 + Math.abs(x) * 0.35;
          const z = surf(x, y) + 0.022;
          cone("fringe" + i, i % 4 === 2 ? M.hairHi : M.hair, len, 0.06, x, y - len * 0.25, z, -0.2, -x * 1.6, x * 1.2 + 0.12);
        });
        // a few messy strands on top, swept forward
        [[-0.08, 0.2, 0.06, 0.5], [0.03, 0.225, 0.03, 0.7], [0.1, 0.19, 0.05, 0.4], [-0.02, 0.215, -0.08, 0.9], [0.07, 0.2, -0.1, 0.8]]
          .forEach(([x, y, z, rx], i) => cone("strand" + i, i % 2 ? M.hairHi : M.hair, 0.11, 0.07, x, y, z, rx + 0.8, x * 3, 0));
        // hair over the top of the ears
        for (const s of [1, -1]) {
          const side = sphere("hairSide" + s, hc, M.hair, 0.15, s * 0.172, 0.085, 0.01, 0.4, 0.75, 1.3);
          side.rotation.z = s * -0.2;
        }
      } else {
        const fadeCap = sphere("fade", hc, M.fade, 2, 0, 0, -0.004, R.x * 1.03, R.y * 1.03, R.z * 1.04, { segments: 24, slice: 0.5 });
        fadeCap.rotation.x = -0.4;
        const top = sphere("hairTop", hc, M.hair, 2, 0, 0.02, -0.01, R.x * 1.07, R.y * 0.95, R.z * 1.07, { segments: 24, slice: 0.48 });
        top.rotation.x = -0.35;
      }
    }

    // ---------- animation state ----------
    const hipsBaseY = hips.position.y;
    const anim = makeAnimator((p) => {
      for (const j of JOINTS) {
        const n = J[j]; if (!n) continue;
        n.rotation.set(p[j][0], p[j][1], p[j][2]);
      }
      hips.position.set(p.pos[0], hipsBaseY + p.pos[1], p.pos[2]);
    });
    let blinkIn = 2 + Math.random() * 3;

    const api = Object.assign(anim, {
      root, joints: J, meshes, materials: M, hipsBaseY,
      setNumber(num, name) { drawBack(num, name === undefined ? opts.playerName : name); opts.number = num; if (name !== undefined) opts.playerName = name; },
      setColor(part, hex) { if (M[part]) M[part].diffuseColor = C(hex); if (part === "shirt2") { opts.shirt2 = hex; drawBack(opts.number, opts.playerName); } },
      update(dt) {
        anim.step(dt);
        // blink
        blinkIn -= dt;
        const closed = blinkIn < 0 && blinkIn > -0.12;
        for (const e of eyes) e.scaling.y = closed ? 0.12 : 1;
        if (blinkIn <= -0.12) blinkIn = 2 + Math.random() * 4;
      },
      dispose() { root.dispose(false, true); tex.dispose(); },
    });
    api.update(0);
    return api;
  }

  // ---------- Animation driver (shared by every character type) ----------
  // applyPose(pose) writes a pose ({joint: [x,y,z], pos: [x,y,z]}) onto a model.
  function makeAnimator(applyPose) {
    const state = { t: 0, runT: 0, speed: 0, speedS: 0, loco: "run", shot: null, shotT: 0, onDone: null };
    const poseA = {}, poseB = {}, poseL = {}, poseS = {}, poseOut = {};
    return {
      setSpeed(v) { state.speed = Math.max(0, Math.min(1, v)); },
      play(name, onDone) {
        const a = ANIMATIONS[name];
        if (!a) { console.warn("Unknown animation:", name); return; }
        if (a.loop) { state.loco = name; return; }
        state.shot = a; state.shotT = 0; state.onDone = onDone || null;
      },
      isPlaying() { return !!state.shot; },
      step(dt) {
        dt = Math.min(dt, 0.1);
        state.t += dt;
        state.speedS += (state.speed - state.speedS) * Math.min(1, dt * 10);
        // locomotion: idle <-> run (or a custom loop chosen via play())
        sample(ANIMATIONS.idle, state.t, poseA);
        if (state.loco !== "idle" && state.loco !== "run") {
          sample(ANIMATIONS[state.loco], state.t, poseL);
        } else {
          state.runT += dt * (0.75 + 0.35 * state.speedS);
          sample(ANIMATIONS.run, state.runT, poseB);
          mix(poseA, poseB, Math.min(1, state.speedS * 1.4), poseL);
        }
        let out = poseL;
        if (state.shot) {
          state.shotT += dt;
          const a = state.shot, tt = state.shotT;
          sample(a, tt, poseS);
          const w = Math.max(0, Math.min(1, tt / 0.08, (a.duration - tt) / 0.12));
          // keep whole-body spin unblended so a full turn doesn't unwind
          const spin = poseS.body.slice();
          out = mix(poseL, poseS, w, poseOut);
          out.body = spin;
          if (tt >= a.duration) {
            state.shot = null;
            const cb = state.onDone; state.onDone = null;
            if (cb) cb();
          }
        }
        applyPose(out);
      },
    };
  }

  // ---------- Rigged .glb model (made with tools/autorig.py) ----------
  // const hero = await FootballCharacter.load(scene, "models/player.glb", { shirt: "#3B82F6" });
  // Same API as create(): root, setSpeed, play, update, setColor.
  async function load(scene, url, opts) {
    const BJ = B();
    opts = Object.assign({ name: "player" }, opts || {});
    // url can be a path ("models/player.glb") or a data: URL (models/player.glb.js),
    // which also works when the page is opened straight from disk (file://)
    const isData = url.startsWith("data:");
    const slash = isData ? 0 : url.lastIndexOf("/") + 1;
    const res = await BJ.SceneLoader.ImportMeshAsync("", url.slice(0, slash), url.slice(slash), scene, null, ".glb");
    const root = new BJ.TransformNode(opts.name, scene);
    res.meshes[0].parent = root;
    const J = {};
    for (const n of res.transformNodes) if (JOINTS.includes(n.name) || n.name === "hips") J[n.name] = n;
    const hips = J.hips;
    const hipsRest = hips.position.clone();
    // glTF is right-handed; Babylon mirrors the model on x when loading, so
    // sideways (y/z) rotations and x offsets flip sign to keep the same poses.
    const q = new BJ.Quaternion();
    const anim = makeAnimator((p) => {
      for (const j of JOINTS) {
        const n = J[j]; if (!n) continue;
        const r = p[j];
        BJ.Quaternion.FromEulerAnglesToRef(r[0], -r[1], -r[2], q);
        n.rotationQuaternion = n.rotationQuaternion || new BJ.Quaternion();
        n.rotationQuaternion.copyFrom(q);
      }
      hips.position.set(hipsRest.x - p.pos[0], hipsRest.y + p.pos[1], hipsRest.z + p.pos[2]);
    });
    const meshes = res.meshes.filter(m => m.getTotalVertices() > 0);
    const materials = {};
    for (const m of meshes) {
      m.alwaysSelectAsActiveMesh = true;   // skinned: bounds move with the pose
      m.isPickable = false;
      const mats = m.material && m.material.subMaterials ? m.material.subMaterials : [m.material];
      for (const mt of mats) if (mt) materials[mt.name] = mt;
    }
    const api = Object.assign(anim, {
      root, joints: J, meshes, materials,
      setColor(part, hex) {
        const mt = materials[part]; if (!mt) return;
        const c = BJ.Color3.FromHexString(hex).toLinearSpace();
        if (mt.albedoColor) mt.albedoColor = c; else mt.diffuseColor = c;
      },
      setNumber() {},
      update(dt) { anim.step(dt); },
      dispose() { root.dispose(false, true); },
    });
    for (const part of ["shirt", "shorts", "socks", "boots", "skin", "hair"]) if (opts[part]) api.setColor(part, opts[part]);
    api.update(0);
    return api;
  }

  // ---------- Export to .glb (bakes every animation as a clip) ----------
  async function exportGLB(scene, hero, fileName) {
    const BJ = B();
    if (!BJ.GLTF2Export) throw new Error("babylonjs.serializers not loaded");
    const fps = 30, groups = [];
    const nodes = JOINTS.map(j => [j, hero.joints[j]]).filter(x => x[1]);
    const hips = hero.joints.spine.parent;
    const hipsY = hero.hipsBaseY;
    const pose = {};
    let start = 0;
    for (const [name, anim] of Object.entries(ANIMATIONS)) {
      const frames = Math.max(2, Math.round(anim.duration * fps));
      const g = new BJ.AnimationGroup(name, scene);
      const tracks = {};
      for (const [j, n] of nodes) tracks[j] = { n, keys: [] };
      const posKeys = [];
      for (let f = 0; f <= frames; f++) {
        sample(anim, (f / frames) * anim.duration, pose);
        for (const [j] of nodes) {
          const r = pose[j];
          tracks[j].keys.push({ frame: start + f, value: BJ.Quaternion.FromEulerAngles(r[0], r[1], r[2]) });
        }
        posKeys.push({ frame: start + f, value: new BJ.Vector3(pose.pos[0], hipsY + pose.pos[1], pose.pos[2]) });
      }
      for (const j in tracks) {
        const a = new BJ.Animation(name + "_" + j, "rotationQuaternion", fps, BJ.Animation.ANIMATIONTYPE_QUATERNION);
        a.setKeys(tracks[j].keys);
        g.addTargetedAnimation(a, tracks[j].n);
      }
      const pa = new BJ.Animation(name + "_pos", "position", fps, BJ.Animation.ANIMATIONTYPE_VECTOR3);
      pa.setKeys(posKeys);
      g.addTargetedAnimation(pa, hips);
      groups.push(g);
      start += frames + 1;
    }
    // quaternion tracks need rotationQuaternion set on the nodes
    for (const [, n] of nodes) n.rotationQuaternion = BJ.Quaternion.FromEulerVector(n.rotation);
    const inHero = (n) => { for (let p = n; p; p = p.parent) if (p === hero.root) return true; return false; };
    try {
      const glb = await BJ.GLTF2Export.GLBAsync(scene, fileName || "football_player", {
        shouldExportNode: inHero,
        shouldExportAnimation: (a) => groups.some(g => g.targetedAnimations.some(t => t.animation === a)),
      });
      glb.downloadFiles();
    } finally {
      groups.forEach(g => g.dispose());
      for (const [, n] of nodes) n.rotationQuaternion = null;
    }
  }

  global.FootballCharacter = { create, load, exportGLB, ANIMATIONS, JOINTS, sample };
})(typeof window !== "undefined" ? window : globalThis);
