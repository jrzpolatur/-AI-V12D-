## 2026-08-15T11:59:42Z
You are the Sub-Orchestrator for Milestone 1: Pixel Viewport & Rendering Pipeline (R1).
Your working directory for metadata is: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1
Project root: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini
User Request file: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\ORIGINAL_REQUEST.md
Project specification: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md

Your Scope (Features F01 - F07):
- F01: Fixed Virtual Viewport Buffer (480×270 virtual canvas buffer in `src/game/viewport.ts`)
- F02: Integer Nearest-Neighbor Blit (`ctx.imageSmoothingEnabled = false`, CSS pixelated, centered letterboxing/pillarboxing)
- F03: 2-Stage Coordinate Mapping (Screen -> Virtual Pixel -> World for mouse & touch events)
- F04: Integer Camera Snapping (`Math.round(camX)`, `Math.round(camY)` for jitter-free pixel rendering)
- F05: Zero-GC Y-Sorted Render Queue (`src/game/renderQueue.ts`, sorting objects by ground `footY`)
- F06: 3/4 Perspective Wall Split (Top Face overhead, Front Face Y-sorted, collision footprint)
- F07: Headless Canvas Guard (Safely support Node.js headless server when `ctx === null`)
