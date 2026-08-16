# Scope: Milestone 1 — Pixel Viewport & Rendering Pipeline (R1)

## Architecture
- `src/game/viewport.ts`: Fixed 480×270 virtual canvas buffer, integer scale calculation, centered letterbox/pillarbox blitting with `imageSmoothingEnabled = false`, 2-stage coordinate transformation functions (`screenToVirtual`, `virtualToWorld`, `screenToWorld`, `worldToVirtual`, `worldToScreen`), integer camera snapping (`Math.round`).
- `src/game/renderQueue.ts`: Pre-allocated object pool & zero-GC array sorting by ground `footY` with stable secondary keys, supporting 3/4 perspective wall splitting (top face static/overhead, front face Y-sorted).
- `src/game/engine.ts`: Integration with headless canvas guard (safe execution when running in Node.js server where canvas/context is null).

## Feature Inventory
| # | Feature | Description | Milestone | Status | Source |
|---|---------|-------------|-----------|--------|--------|
| F01 | Fixed Virtual Viewport Buffer | 480×270 virtual canvas buffer in `src/game/viewport.ts` | M1 | DONE | ORIGINAL_REQUEST §1 |
| F02 | Integer Nearest-Neighbor Blit | `ctx.imageSmoothingEnabled = false`, pixelated scaling, centered letterbox/pillarbox | M1 | DONE | ORIGINAL_REQUEST §1 |
| F03 | 2-Stage Coordinate Mapping | Screen -> Virtual Pixel -> World for mouse & touch input handling | M1 | DONE | ORIGINAL_REQUEST §1 |
| F04 | Integer Camera Snapping | `Math.round(camX)`, `Math.round(camY)` for jitter-free pixel rendering | M1 | DONE | ORIGINAL_REQUEST §1 |
| F05 | Zero-GC Y-Sorted Render Queue | Reusable array pool sorting drawables by `footY` without per-frame GC allocations | M1 | DONE | ORIGINAL_REQUEST §1 |
| F06 | 3/4 Perspective Wall Split | Top Face overhead/roof, Front Face Y-sorted with wall base footY, collision footprint | M1 | DONE | ORIGINAL_REQUEST §1 |
| F07 | Headless Canvas Guard | Graceful null handling in engine / render systems when running headless server in Node | M1 | DONE | ORIGINAL_REQUEST §1 |

## Interface Contracts
### Viewport Interface (`src/game/viewport.ts`)
- `createPixelViewport(config?: ViewportConfig): PixelViewport`
- `PixelViewport.resize(screenWidth: number, screenHeight: number): void`
- `PixelViewport.beginFrame(screenCtx: CanvasRenderingContext2D | null, camX: number, camY: number): CanvasRenderingContext2D | null`
- `PixelViewport.endFrame(screenCtx: CanvasRenderingContext2D | null): void`
- `PixelViewport.screenToVirtual(screenX: number, screenY: number, clamp?: boolean): { x: number, y: number }`
- `PixelViewport.virtualToWorld(virtualX: number, virtualY: number, camX: number, camY: number): { x: number, y: number }`
- `PixelViewport.screenToWorld(screenX: number, screenY: number, camX: number, camY: number, clamp?: boolean): { x: number, y: number }`
- `PixelViewport.worldToVirtual(worldX: number, worldY: number, camX: number, camY: number): { x: number, y: number }`
- `PixelViewport.worldToScreen(worldX: number, worldY: number, camX: number, camY: number): { x: number, y: number }`
- `PixelViewport.snapCamera(camX: number, camY: number): { snapCamX: number, snapCamY: number }`
- `PixelViewport.getVisibleBounds(camX: number, camY: number, margin?: number): { minX: number, minY: number, maxX: number, maxY: number }`

### Render Queue Interface (`src/game/renderQueue.ts`)
- `createRenderQueue(capacity?: number): RenderQueue`
- `RenderQueue.clear(): void`
- `RenderQueue.push(item: RenderItem): void`
- `RenderQueue.pushFn(layer: RenderLayer, sortY: number, draw: (ctx: CanvasRenderingContext2D) => void, tieBreaker?: number): void`
- `RenderQueue.flush(ctx: CanvasRenderingContext2D | null): void`

### Headless Guard
- All rendering calls early-return if context is null, allowing headless simulation on server side without crashing.

## Status
- Status: **DONE**
- Gate Result: **PASS**
- Iteration: 1
