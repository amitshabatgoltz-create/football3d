---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Grab a friend, grab the ball — 1v1 3D football, right in your browser"
destination: tiktok
aspect: 1080x1920
language: en
length: 60s
angle: action-trailer
---

## Intent

An action trailer for Football 3D (the browser game in this repo): real gameplay
footage of the 3D pitch, fast cuts on the beat, kinetic "GOAL!" typography,
ending on the logo and a call to play. User picked "טריילר אקשן" from the pitch list.

## Assets

- ../../football3d_final.html — the game itself; gameplay is recorded from it headlessly.

## Customizations

- Kinetic text hits ("GOAL!", "1 v 1", "2:00") cut to the music.

## Notes

- Stadium GLB (Google Drive) and the Babylon CDN are blocked from this sandbox: the
  game is served locally with Babylon from npm, and a stand-in pitch is drawn for capture.
- No narration — music + SFX only (inferred: action trailer).
- On-screen copy in English, matching the game's own HUD (inferred).
