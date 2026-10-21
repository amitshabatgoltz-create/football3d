# Recording cinematic shots from the game

Footage in `assets/clips4/` is rendered from the real GOAL RUSH build (the claude.ai artifact), with the game's own AI playing both teams and a custom camera.

1. Save the game's HTML and patch it: `python3 patch.py game-original.html game/game.html`
   (exposes the renderer/scene/ball/players, adds a camera hook, hides the HUD, skips the LED-board redraw while simulating).
2. `vclock.js` runs the page on a virtual clock with seeded `Math.random`; the stream is reseeded at kickoff and
   rendering uses its own random stream, so a seed replays the same match every time.
3. Find moments: `node sim.js DIR SEED SECONDS` (fast, no rendering) → `sim-SEED.json`; `python3 goals.py`, `python3 moments.py SEED`.
4. Frame cameras on one moment: `node stills.js DIR SEED FRAME '[{"type":"goal",...}]' prefix`.
5. Render a plan: `node render.js DIR plans/plan-A.json` (frames are 30fps sim frames; `rate` < 1 renders slow motion —
   give each slow-motion shot its own plan, since a smaller step changes what happens after it).
6. Grade into the project: `bash grade.sh DIR/shots`.

Camera types (director.js): tele, chase, low, goal (behind the keeper), orbit, drone, ball, fixed.
Needs Playwright + Chromium (`NODE_PATH` pointing at a Playwright install) and ffmpeg. The trailer uses seed 10.
