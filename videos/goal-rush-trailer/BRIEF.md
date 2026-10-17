---
workflow: product-launch-video
flow: automation
storyboard: no
message: "GOAL RUSH — compete, score, dominate: 7v7 3D football with a full season to climb"
destination: tiktok
aspect: 1080x1920
language: en
length: 60s
angle: action-trailer
---

## Intent

Action trailer for GOAL RUSH, the user's 3D browser football game (the live build the user shared as a
claude.ai artifact; also on Netlify). Real gameplay from the game itself — the stadium, the crowd, the
skinned players, the in-game goal celebration camera — cut fast to the music, then a tour of the
game's menus (home, store, battle pass, modes) and an end card on the GOAL RUSH key art.

Replaces the first draft (`../football3d-trailer`), which was built from an older prototype in the repo;
the user said "it doesn't look like the game".

## Assets

- the game build — gameplay recorded headlessly in 1080x1920 on a virtual clock (assets/clips/)
- assets/menus/*.jpg — menu screens captured from the same build
- assets/img/*.webp, assets/fonts/*.woff2 — key art and fonts extracted from the game itself

## Customizations

- The game's own tagline as the tease: "compete. score. dominate."
- Brand colors and type taken from the game UI (lime #B8FF3B, cyan #38D6FF, blue #1A5FE8, Saira Condensed).

## Notes

- Our side is driven by a capture-only autopilot; the CPU side is the game's own AI.
- Music: the procedurally generated 120 BPM bed from the first draft (no HeyGen sign-in here).
