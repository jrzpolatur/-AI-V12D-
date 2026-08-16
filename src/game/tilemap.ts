/**
 * src/game/tilemap.ts
 *
 * Milestone 3 — Features F19, F20
 * 3/4 Perspective Pixel Tilemap with Autotiling Walls
 *
 * Provides:
 *  - Procedurally generated dungeon floor tile sprites (stone, metal, wood, dirt)
 *  - 4-bit bitmask autotiling for seamless wall edges, corners, inner-corners
 *  - Cached full-ground-layer offscreen canvas for O(1) ground rendering
 *  - 3/4 wall rendering: top face (overhead) + front face (Y-sorted)
 *  - Viewport-culled drawing for performance
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileType =
  | "empty"
  | "floor_stone"
  | "floor_metal"
  | "floor_wood"
  | "floor_dirt"
  | "wall"
  | "pit"
  | "deco";

export interface TilemapConfig {
  /** World units per tile (default 48). */
  tileSize?: number;
  /** Grid columns. */
  cols: number;
  /** Grid rows. */
  rows: number;
  /** Floor style (default "stone"). */
  floorStyle?: "stone" | "metal" | "wood" | "dirt";
}

export interface TileCell {
  type: TileType;
  /** 4-bit bitmask for wall autotiling (NESW neighbors). */
  wallMask: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TILE_SIZE = 48;
const TILE_PX = 16; // Each tile sprite is 16x16 pixels in virtual space

// Color palettes for floor styles
const FLOOR_PALETTES: Record<string, { base: string; dark: string; crack: string; accent: string }> = {
  stone: { base: "#5a5a6a", dark: "#44444f", crack: "#3a3a44", accent: "#6a6a7a" },
  metal: { base: "#6a7080", dark: "#555b68", crack: "#4a5060", accent: "#8090a0" },
  wood:  { base: "#8b6914", dark: "#6b4e0a", crack: "#5a4008", accent: "#a07820" },
  dirt:  { base: "#7a6040", dark: "#5a4830", crack: "#4a3820", accent: "#8a7050" },
};

const WALL_TOP_COLOR = "#3a3a48";
const WALL_FRONT_COLOR = "#2a2a38";
const WALL_FRONT_LIGHT = "#484858";
const WALL_OUTLINE = "#1a1a24";

// ---------------------------------------------------------------------------
// Headless guard
// ---------------------------------------------------------------------------

function canCreateCanvas(): boolean {
  return typeof document !== "undefined" && typeof document.createElement === "function";
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (!canCreateCanvas()) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function getCtx(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = c.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
  return ctx;
}

// ---------------------------------------------------------------------------
// Tile Sprite Generation (procedural)
// ---------------------------------------------------------------------------

const _tileSpriteCache = new Map<string, HTMLCanvasElement>();

function getFloorTileSprite(style: string, variant: number): HTMLCanvasElement | null {
  const key = `floor_${style}_${variant}`;
  const cached = _tileSpriteCache.get(key);
  if (cached) return cached;

  const canvas = makeCanvas(TILE_PX, TILE_PX);
  if (!canvas) return null;
  const ctx = getCtx(canvas);
  if (!ctx) return null;

  const p = FLOOR_PALETTES[style] ?? FLOOR_PALETTES.stone;

  // Base fill
  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  // Subtle grid lines (mortar / seams)
  ctx.fillStyle = p.dark;
  ctx.fillRect(0, 0, TILE_PX, 1);
  ctx.fillRect(0, 0, 1, TILE_PX);

  // Random crack / detail based on variant
  const rng = (variant * 7919 + 1) % 97; // deterministic pseudo-random
  if (rng < 30) {
    ctx.fillStyle = p.crack;
    const cx = (rng * 3) % (TILE_PX - 2) + 1;
    const cy = (rng * 5) % (TILE_PX - 2) + 1;
    ctx.fillRect(cx, cy, 2, 1);
    ctx.fillRect(cx + 1, cy + 1, 1, 2);
  }

  // Accent dot (rivet / pebble)
  if (rng > 60 && rng < 80) {
    ctx.fillStyle = p.accent;
    const ax = (rng * 11) % (TILE_PX - 4) + 2;
    const ay = (rng * 13) % (TILE_PX - 4) + 2;
    ctx.fillRect(ax, ay, 1, 1);
  }

  // Metal style: rivet pattern
  if (style === "metal" && variant % 3 === 0) {
    ctx.fillStyle = p.accent;
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(TILE_PX - 3, 2, 1, 1);
    ctx.fillRect(2, TILE_PX - 3, 1, 1);
    ctx.fillRect(TILE_PX - 3, TILE_PX - 3, 1, 1);
  }

  // Wood style: grain lines
  if (style === "wood") {
    ctx.fillStyle = p.dark;
    for (let gy = 3; gy < TILE_PX; gy += 4) {
      ctx.fillRect(1, gy, TILE_PX - 2, 1);
    }
  }

  _tileSpriteCache.set(key, canvas);
  return canvas;
}

function getWallFrontSprite(variant: number): HTMLCanvasElement | null {
  const key = `wall_front_${variant}`;
  const cached = _tileSpriteCache.get(key);
  if (cached) return cached;

  // Wall front face is 16px wide, 12px tall (3/4 height projection)
  const fh = 12;
  const canvas = makeCanvas(TILE_PX, fh);
  if (!canvas) return null;
  const ctx = getCtx(canvas);
  if (!ctx) return null;

  // Main face
  ctx.fillStyle = WALL_FRONT_COLOR;
  ctx.fillRect(0, 0, TILE_PX, fh);

  // Brick pattern
  ctx.fillStyle = WALL_FRONT_LIGHT;
  for (let row = 0; row < fh; row += 4) {
    const offset = (row / 4) % 2 === 0 ? 0 : 4;
    for (let col = offset; col < TILE_PX; col += 8) {
      ctx.fillRect(col + 1, row + 1, 6, 2);
    }
  }

  // Top edge highlight
  ctx.fillStyle = "#505068";
  ctx.fillRect(0, 0, TILE_PX, 1);

  // Bottom edge dark
  ctx.fillStyle = WALL_OUTLINE;
  ctx.fillRect(0, fh - 1, TILE_PX, 1);

  // Side edges
  ctx.fillStyle = WALL_OUTLINE;
  ctx.fillRect(0, 0, 1, fh);
  ctx.fillRect(TILE_PX - 1, 0, 1, fh);

  _tileSpriteCache.set(key, canvas);
  return canvas;
}

function getWallTopSprite(): HTMLCanvasElement | null {
  const key = "wall_top";
  const cached = _tileSpriteCache.get(key);
  if (cached) return cached;

  const canvas = makeCanvas(TILE_PX, TILE_PX);
  if (!canvas) return null;
  const ctx = getCtx(canvas);
  if (!ctx) return null;

  ctx.fillStyle = WALL_TOP_COLOR;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  // Subtle edge shading
  ctx.fillStyle = "#2e2e3c";
  ctx.fillRect(0, TILE_PX - 1, TILE_PX, 1);
  ctx.fillRect(TILE_PX - 1, 0, 1, TILE_PX);

  ctx.fillStyle = "#484858";
  ctx.fillRect(0, 0, TILE_PX, 1);
  ctx.fillRect(0, 0, 1, TILE_PX);

  _tileSpriteCache.set(key, canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// PixelTilemap class
// ---------------------------------------------------------------------------

export class PixelTilemap {
  public readonly tileSize: number;
  public readonly cols: number;
  public readonly rows: number;
  public readonly floorStyle: string;

  private grid: TileCell[];

  /** Cached full ground layer (floor tiles only). */
  private groundCache: HTMLCanvasElement | null = null;
  private groundDirty = true;

  constructor(config: TilemapConfig) {
    this.tileSize = config.tileSize ?? DEFAULT_TILE_SIZE;
    this.cols = config.cols;
    this.rows = config.rows;
    this.floorStyle = config.floorStyle ?? "stone";

    this.grid = new Array(this.cols * this.rows);
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = { type: "floor_stone", wallMask: 0 };
    }
  }

  // -----------------------------------------------------------------------
  // Grid manipulation
  // -----------------------------------------------------------------------

  private idx(col: number, row: number): number {
    return row * this.cols + col;
  }

  private inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  /** Set the type of a single tile. */
  setTile(col: number, row: number, type: TileType): void {
    if (!this.inBounds(col, row)) return;
    this.grid[this.idx(col, row)].type = type;
    this.groundDirty = true;
  }

  /** Get the type of a tile. */
  getTile(col: number, row: number): TileType {
    if (!this.inBounds(col, row)) return "empty";
    return this.grid[this.idx(col, row)].type;
  }

  /** Check if a tile is a wall. */
  isWall(col: number, row: number): boolean {
    if (!this.inBounds(col, row)) return false;
    return this.grid[this.idx(col, row)].type === "wall";
  }

  // -----------------------------------------------------------------------
  // Wall generation from game's Wall[] array
  // -----------------------------------------------------------------------

  /**
   * Populate the tilemap from the existing wall array in engine.ts.
   * Converts world-space wall rectangles into grid-space wall tiles,
   * then fills remaining cells with floor tiles.
   */
  generateFromWalls(
    walls: Array<{ x: number; y: number; w: number; h: number; hp?: number; invisible?: boolean }>,
    arenaW: number,
    arenaH: number
  ): void {
    // Reset all to floor
    const floorType = `floor_${this.floorStyle}` as TileType;
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i].type = floorType;
      this.grid[i].wallMask = 0;
    }

    // Mark wall tiles
    for (const w of walls) {
      if (w.invisible) continue;
      const c0 = Math.floor(w.x / this.tileSize);
      const r0 = Math.floor(w.y / this.tileSize);
      const c1 = Math.ceil((w.x + w.w) / this.tileSize);
      const r1 = Math.ceil((w.y + w.h) / this.tileSize);

      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          if (this.inBounds(c, r)) {
            this.grid[this.idx(c, r)].type = "wall";
          }
        }
      }
    }

    // Mark tiles outside arena as empty
    const maxC = Math.ceil(arenaW / this.tileSize);
    const maxR = Math.ceil(arenaH / this.tileSize);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c >= maxC || r >= maxR) {
          this.grid[this.idx(c, r)].type = "empty";
        }
      }
    }

    // Compute 4-bit wall autotile masks (NESW)
    this.computeWallMasks();

    this.groundDirty = true;
  }

  /** Compute 4-bit bitmask for each wall tile based on NESW neighbors. */
  private computeWallMasks(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[this.idx(c, r)];
        if (cell.type !== "wall") {
          cell.wallMask = 0;
          continue;
        }
        let mask = 0;
        if (this.isWall(c, r - 1)) mask |= 1; // North
        if (this.isWall(c + 1, r)) mask |= 2; // East
        if (this.isWall(c, r + 1)) mask |= 4; // South
        if (this.isWall(c - 1, r)) mask |= 8; // West
        cell.wallMask = mask;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Ground cache
  // -----------------------------------------------------------------------

  /** Rebuild the full ground layer offscreen canvas. */
  private rebuildGroundCache(): void {
    if (!canCreateCanvas()) return;

    const w = this.cols * TILE_PX;
    const h = this.rows * TILE_PX;

    if (!this.groundCache || this.groundCache.width !== w || this.groundCache.height !== h) {
      this.groundCache = makeCanvas(w, h);
    }
    if (!this.groundCache) return;

    const ctx = getCtx(this.groundCache);
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[this.idx(c, r)];
        if (cell.type === "empty" || cell.type === "wall") continue;

        const style = cell.type.replace("floor_", "");
        const variant = (c * 31 + r * 17) % 8; // deterministic variety
        const sprite = getFloorTileSprite(style || this.floorStyle, variant);
        if (!sprite) continue;

        ctx.drawImage(sprite, c * TILE_PX, r * TILE_PX);
      }
    }

    this.groundDirty = false;
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  /**
   * Draw the ground layer (floor tiles) using the cached offscreen canvas.
   * Renders into virtual viewport space using camera offset.
   */
  drawGround(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number
  ): void {
    if (!ctx) return;
    if (this.groundDirty) this.rebuildGroundCache();
    if (!this.groundCache) return;

    // Scale factor: world units per tile-pixel
    const scale = this.tileSize / TILE_PX;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Source rect in tile-pixel space (viewport culling)
    const sx = Math.max(0, Math.floor(camX / scale));
    const sy = Math.max(0, Math.floor(camY / scale));
    const sw = Math.min(this.groundCache.width - sx, Math.ceil(viewW / scale) + TILE_PX);
    const sh = Math.min(this.groundCache.height - sy, Math.ceil(viewH / scale) + TILE_PX);

    if (sw <= 0 || sh <= 0) {
      ctx.restore();
      return;
    }

    // Destination in world space
    const dx = sx * scale - camX;
    const dy = sy * scale - camY;

    ctx.drawImage(
      this.groundCache,
      sx, sy, sw, sh,
      Math.round(dx), Math.round(dy),
      Math.round(sw * scale), Math.round(sh * scale)
    );

    ctx.restore();
  }

  /**
   * Draw wall top faces (overhead layer, rendered above Y-sorted entities).
   * Only draws wall tiles visible in the current viewport.
   */
  drawWallTops(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number
  ): void {
    if (!ctx) return;

    const topSprite = getWallTopSprite();
    if (!topSprite) return;

    // Visible tile range
    const c0 = Math.max(0, Math.floor(camX / this.tileSize) - 1);
    const r0 = Math.max(0, Math.floor(camY / this.tileSize) - 1);
    const c1 = Math.min(this.cols, Math.ceil((camX + viewW) / this.tileSize) + 1);
    const r1 = Math.min(this.rows, Math.ceil((camY + viewH) / this.tileSize) + 1);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (!this.isWall(c, r)) continue;

        const wx = c * this.tileSize;
        const wy = r * this.tileSize;

        ctx.drawImage(
          topSprite,
          0, 0, TILE_PX, TILE_PX,
          Math.round(wx), Math.round(wy),
          Math.round(this.tileSize), Math.round(this.tileSize)
        );
      }
    }

    ctx.restore();
  }

  /**
   * Draw wall front faces for a single wall tile (called from Y-sorted render queue).
   * The front face appears below the wall top, giving a 3/4 perspective depth effect.
   */
  drawWallFront(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number
  ): void {
    if (!ctx) return;
    if (!this.isWall(col, row)) return;

    // Only draw front face if there's no wall directly below (south)
    if (this.isWall(col, row + 1)) return;

    const frontSprite = getWallFrontSprite((col * 7 + row * 13) % 4);
    if (!frontSprite) return;

    const wx = col * this.tileSize;
    const wy = (row + 1) * this.tileSize; // bottom of wall tile
    const frontH = Math.round(this.tileSize * 0.75); // 3/4 height

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      frontSprite,
      0, 0, TILE_PX, frontSprite.height,
      Math.round(wx), Math.round(wy),
      Math.round(this.tileSize), frontH
    );
    ctx.restore();
  }

  /**
   * Mark the ground cache as dirty (needs rebuild).
   * Call when walls change (destruction, etc.).
   */
  invalidate(): void {
    this.groundDirty = true;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create a new PixelTilemap instance. */
export function createPixelTilemap(config: TilemapConfig): PixelTilemap {
  return new PixelTilemap(config);
}
