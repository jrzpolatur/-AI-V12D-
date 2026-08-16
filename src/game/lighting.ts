/**
 * src/game/lighting.ts
 *
 * Milestone 2: Dynamic Lighting & Ambient Lantern System
 * Features:
 * - F08: Dynamic Lighting Mask System (480x270 offscreen buffer, destination-out carving, zero-GC reuse, headless safe)
 * - F09: 5-Theme Ambient Darkness Presets (Citadel, Ice Outpost, Wild West, Cyber City, Biohazard Dungeon)
 * - F10: Player Ambient Lantern Halo (Breathing flicker + directional aim cone illumination)
 * - F11: Bullet Glow & Projectile Illumination
 * - F12: Explosion Shockwave Light Punchout
 * - F13: Acid Pool & Hazard Luminescence
 */

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  intensity: number; // 0.0 to 1.0
  color?: string;
  coneAngle?: number; // radians for directional lantern
  coneDir?: number;   // aim angle in radians
}

export interface AmbientLightingPreset {
  id: string;
  name: string;
  ambientTint: string; // e.g. "rgba(10, 15, 35, 0.45)"
  darkness: number;    // 0.0 (full day) to 1.0 (pitch black)
  lanternRadius: number; // Base player lantern radius in pixels
  lanternColor: string;
  flickerSpeed: number;
}

export const THEME_LIGHTING_PRESETS: Record<string, AmbientLightingPreset> = {
  citadel: {
    id: "citadel",
    name: "Dark Night / Citadel",
    ambientTint: "rgba(10, 15, 35, 0.45)",
    darkness: 0.45,
    lanternRadius: 180,
    lanternColor: "rgba(255, 240, 200, 1)",
    flickerSpeed: 5.0,
  },
  ice_outpost: {
    id: "ice_outpost",
    name: "Ice Outpost (Permafrost)",
    ambientTint: "rgba(180, 210, 240, 0.18)",
    darkness: 0.18,
    lanternRadius: 160,
    lanternColor: "rgba(200, 240, 255, 1)",
    flickerSpeed: 3.5,
  },
  wild_west: {
    id: "wild_west",
    name: "Wild West (Dusk)",
    ambientTint: "rgba(70, 35, 10, 0.35)",
    darkness: 0.35,
    lanternRadius: 200,
    lanternColor: "rgba(255, 180, 80, 1)",
    flickerSpeed: 4.5,
  },
  cyber_city: {
    id: "cyber_city",
    name: "Cyber City (Neon Void)",
    ambientTint: "rgba(15, 10, 30, 0.55)",
    darkness: 0.55,
    lanternRadius: 170,
    lanternColor: "rgba(0, 240, 255, 1)",
    flickerSpeed: 4.0,
  },
  biohazard_dungeon: {
    id: "biohazard_dungeon",
    name: "Biohazard Dungeon",
    ambientTint: "rgba(15, 35, 20, 0.50)",
    darkness: 0.50,
    lanternRadius: 150,
    lanternColor: "rgba(163, 230, 53, 1)",
    flickerSpeed: 5.0,
  },
};

export class PixelLightingSystem {
  public width: number;
  public height: number;
  public lightCanvas: HTMLCanvasElement | null = null;
  public lightCtx: CanvasRenderingContext2D | null = null;

  private currentPreset: AmbientLightingPreset = THEME_LIGHTING_PRESETS.citadel;
  private lightPool: LightSource[] = [];
  private lightCount = 0;

  constructor(width = 480, height = 270) {
    this.width = width;
    this.height = height;

    // Zero-GC Pre-allocation for light sources
    const initialPoolSize = 256;
    for (let i = 0; i < initialPoolSize; i++) {
      this.lightPool.push({
        x: 0,
        y: 0,
        radius: 0,
        intensity: 1,
      });
    }

    // Headless Canvas Guard (Node.js / Headless server execution safe)
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      try {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        this.lightCanvas = c;
        this.lightCtx = c.getContext("2d", { willReadFrequently: false });
      } catch (err) {
        this.lightCanvas = null;
        this.lightCtx = null;
      }
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.lightCanvas) {
      this.lightCanvas.width = width;
      this.lightCanvas.height = height;
    }
  }

  public setTheme(theme: string | number): void {
    if (typeof theme === "number") {
      const keys = ["citadel", "ice_outpost", "wild_west", "cyber_city", "biohazard_dungeon"];
      const key = keys[Math.max(0, Math.min(keys.length - 1, Math.floor(theme)))];
      this.currentPreset = THEME_LIGHTING_PRESETS[key] ?? THEME_LIGHTING_PRESETS.citadel;
      return;
    }

    if (!theme) {
      this.currentPreset = THEME_LIGHTING_PRESETS.citadel;
      return;
    }

    const t = theme.toLowerCase().trim();
    if (t === "citadel" || t === "lobby" || t === "night" || t === "dark_night" || t === "default") {
      this.currentPreset = THEME_LIGHTING_PRESETS.citadel;
    } else if (t === "ice_outpost" || t === "permafrost" || t === "ice" || t === "arctic" || t === "arctic_zone") {
      this.currentPreset = THEME_LIGHTING_PRESETS.ice_outpost;
    } else if (t === "wild_west" || t === "dusk" || t === "western" || t === "desert") {
      this.currentPreset = THEME_LIGHTING_PRESETS.wild_west;
    } else if (t === "cyber_city" || t === "neon_void" || t === "cyber" || t === "neon") {
      this.currentPreset = THEME_LIGHTING_PRESETS.cyber_city;
    } else if (t === "biohazard_dungeon" || t === "biohazard" || t === "dungeon" || t === "ruin" || t === "jungle") {
      this.currentPreset = THEME_LIGHTING_PRESETS.biohazard_dungeon;
    } else if (THEME_LIGHTING_PRESETS[t]) {
      this.currentPreset = THEME_LIGHTING_PRESETS[t];
    } else {
      this.currentPreset = THEME_LIGHTING_PRESETS.citadel;
    }
  }

  public getPreset(): AmbientLightingPreset {
    return this.currentPreset;
  }

  public isHeadless(): boolean {
    return !this.lightCanvas || !this.lightCtx;
  }

  public beginFrame(): void {
    this.lightCount = 0;
  }

  public addLight(light: LightSource): void {
    if (this.lightCount >= this.lightPool.length) {
      // Geometric pool expansion
      const newPoolSize = this.lightPool.length * 2;
      for (let i = this.lightPool.length; i < newPoolSize; i++) {
        this.lightPool.push({ x: 0, y: 0, radius: 0, intensity: 1 });
      }
    }

    const target = this.lightPool[this.lightCount++];
    target.x = light.x;
    target.y = light.y;
    target.radius = light.radius;
    target.intensity = Math.max(0, Math.min(1, light.intensity));
    target.color = light.color;
    target.coneAngle = light.coneAngle;
    target.coneDir = light.coneDir;
  }

  /** F10: Player Ambient Lantern with breathing flicker and directional aim cone */
  public addPlayerLantern(x: number, y: number, aimAngle: number, time: number, baseRadius?: number): void {
    const preset = this.currentPreset;
    const r = (baseRadius ?? preset.lanternRadius) * (1 + 0.04 * Math.sin(time * preset.flickerSpeed));
    this.addLight({
      x,
      y,
      radius: r,
      intensity: 1.0,
      color: preset.lanternColor,
      coneAngle: Math.PI * 0.45,
      coneDir: aimAngle,
    });
  }

  /** F11: Bullet Glow & Projectile Illumination */
  public addBulletLight(x: number, y: number, radius = 24, color?: string): void {
    this.addLight({
      x,
      y,
      radius,
      intensity: 0.85,
      color,
    });
  }

  /** F12: Explosion Shockwave Light Punchout */
  public addExplosionLight(x: number, y: number, progress: number, maxRadius = 120): void {
    const k = Math.max(0, Math.min(1, progress));
    const r = Math.max(12, maxRadius * Math.sin(k * Math.PI * 0.5));
    const intensity = Math.max(0, 1 - k);
    this.addLight({
      x,
      y,
      radius: r,
      intensity,
      color: "#ffedd5",
    });
  }

  /** F13: Acid Pool & Hazard Luminescence */
  public addHazardGlow(x: number, y: number, radius = 35, color = "rgba(74, 222, 128, 0.75)"): void {
    this.addLight({
      x,
      y,
      radius,
      intensity: 0.7,
      color,
    });
  }

  public getLightCount(): number {
    return this.lightCount;
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.lightCanvas;
  }

  public getContext(): CanvasRenderingContext2D | null {
    return this.lightCtx;
  }

  /**
   * Renders the darkness mask and carves out light shapes with destination-out composite mode.
   * @param worldCameraX Integer-snapped camera X in world coordinates
   * @param worldCameraY Integer-snapped camera Y in world coordinates
   */
  public renderMask(worldCameraX: number, worldCameraY: number): void {
    const ctx = this.lightCtx;
    if (!ctx || !this.lightCanvas) return;

    const w = this.width;
    const h = this.height;

    // 1. Clear offscreen virtual buffer
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    // 2. Fill Ambient Darkness Mask
    ctx.fillStyle = this.currentPreset.ambientTint;
    ctx.fillRect(0, 0, w, h);

    // 3. Switch to destination-out to carve holes for light sources
    ctx.globalCompositeOperation = "destination-out";

    for (let i = 0; i < this.lightCount; i++) {
      const light = this.lightPool[i];
      const sx = Math.round(light.x - worldCameraX);
      const sy = Math.round(light.y - worldCameraY);
      const r = Math.max(1, Math.round(light.radius));
      const intensity = light.intensity;

      if (intensity <= 0) continue;

      // Viewport culling (with margin for directional cone)
      const maxReach = light.coneAngle !== undefined ? r * 1.5 : r;
      if (sx + maxReach < 0 || sx - maxReach > w || sy + maxReach < 0 || sy - maxReach > h) {
        continue;
      }

      // Directional aim cone carving (if specified)
      if (light.coneAngle !== undefined && light.coneDir !== undefined) {
        const coneAngle = light.coneAngle;
        const coneDir = light.coneDir;
        const coneRadius = Math.round(r * 1.4);

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, coneRadius, coneDir - coneAngle / 2, coneDir + coneAngle / 2);
        ctx.closePath();

        const coneGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, coneRadius);
        coneGrad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
        coneGrad.addColorStop(0.5, `rgba(0, 0, 0, ${intensity * 0.65})`);
        coneGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = coneGrad;
        ctx.fill();
      }

      // Omnidirectional soft radial falloff halo
      const radialGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      radialGrad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
      radialGrad.addColorStop(0.4, `rgba(0, 0, 0, ${intensity * 0.75})`);
      radialGrad.addColorStop(0.8, `rgba(0, 0, 0, ${intensity * 0.25})`);
      radialGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset composite operation to default
    ctx.globalCompositeOperation = "source-over";
  }

  /**
   * Blits the offscreen dynamic lighting mask onto the target canvas.
   * @param targetCtx Destination canvas rendering context
   * @param renderX Destination X offset (defaults to 0 or camera world offset if matrix is active)
   * @param renderY Destination Y offset (defaults to 0 or camera world offset if matrix is active)
   */
  public composite(targetCtx: CanvasRenderingContext2D | null, renderX = 0, renderY = 0): void {
    if (!targetCtx || !this.lightCanvas) return;
    targetCtx.drawImage(this.lightCanvas, renderX, renderY);
  }

  public dispose(): void {
    this.lightCanvas = null;
    this.lightCtx = null;
    this.lightPool.length = 0;
    this.lightCount = 0;
  }
}

export function createPixelLightingSystem(width = 480, height = 270): PixelLightingSystem {
  return new PixelLightingSystem(width, height);
}
