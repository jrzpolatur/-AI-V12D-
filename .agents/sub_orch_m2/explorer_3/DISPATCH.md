## 2026-08-15T12:28:18Z

Investigate codebase architecture and design requirements for:
- F14: 2.5D Shell Casing Physics (`src/game/pixelParticles.ts`, ejected casings with initial vx, vy, vz, gravity, floor bounce restitution, decay to static ground decal)
- F15: Bullet Trails & Impact Sparks (pixel smoke puffs, energy tracer trails, wall collision spark bursts)
- F16: Blood & Debris Splatters (directional blood/acid splatters and destructible chunk debris)
- F17: Pixel Explosion Shockwaves (stepped pixelated expanding rings, fireballs, rising dithered smoke)
- Integration into particle pool system with zero garbage collection allocations during 60 FPS gameplay.

Inspect the particle system requirements, existing engine render loop, RenderLayer enums (Ground, Decals, YSorted, AirborneFX).
Produce a detailed technical plan and recommendations in `handoff.md`.
