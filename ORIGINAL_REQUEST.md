# Original User Request

## Initial Request — 2026-08-15T11:52:05Z

Refactor and upgrade the existing 2D top-down shooter game (FIRING STICKERS) into a 16-bit / 32-bit pixel dungeon shooter style (like Enter the Gungeon / Soul Knight), with a 3/4 perspective, high-performance Web pixel engine with PNG sprite sheets and sprite animation system.

Key Requirements:
1. R1: Pixel Viewport & Rendering Pipeline (fixed internal resolution e.g. 480x270 or 640x360 with integer nearest-neighbor scaling, 3/4 perspective Y-Sort depth occlusion).
2. R2: Character & Weapon Sprite Sheet Animation System (PNG atlas/spritesheets, Idle/Run/Hurt/Death 3/4 perspective frames, 360-degree weapon mount with flip & recoil tremor, pixel particle system for muzzle flash, shell casing physics ejection, bullet trail particles, explosion smoke & sparks).
3. R3: Pixel Tilemap & Interactive Props (3/4 pixel tilemap with floor tiles, wall collision, destructible crates/props with debris scattering, dynamic glowing Cashout Vault and Airdrop crates).
4. R4: Retro Pixel Arcade HUD & UI (pixel health bar, energy bar, weapon slots, ammo counter, minimap, floating combat text, retro pixel typography, high-contrast arcade HUD).
5. R5: Compatibility with existing gameplay systems & multiplayer sync (Singleplayer, BOT AI, WebSocket authoritative server / snapshot sync, all weapon mechanics, zero breaking regressions).

Acceptance Criteria:
- Unified 16-bit/32-bit pixel dungeon shooter aesthetic, pixel-grid alignment, correct Y-Sort depth.
- Smooth particle and physics ejection systems.
- Smooth pixel frame animations and weapon feedback.
- Clean TypeScript compilation & Vite build (`npm run build` succeeds).
- Stable 60 FPS, no memory leaks or jank.
- Full preservation of game modes (single, duo, zombie/biohazard, multiplayer) and arsenal.
