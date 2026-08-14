import { GameEngine, Base, Wall, Player, Enemy, Bullet, EnemyBullet, Particle, Effect, Deployable, Grenade, Pickup, Combatant, GridItem, COIN_STYLE, killStyleOf } from "../engine";
import { SnapPlayer, SnapEffect } from "../../net/protocol";
import { GadgetDef, GunDef, CharacterDef, OutfitDef } from "../types";
import { SCENES, getCharacter, getOutfit, getSkill } from "../content"; 
import { rgba, drawCharacter, drawMonster, shade, roundRect, drawGadgetIcon, DARK } from "../draw";
import { RUNTIME } from "../runtimeConfig";

export class Renderer {
  public cityBg: HTMLCanvasElement | null = null;
  public cityBgKey: string = "";

  /** Cached radial gradients. Canvas gradients are resolved under the current
   *  transform at PAINT time, so a gradient built at (0,0) can be reused inside
   *  a ctx.translate(x,y) and will render centered on (x,y) — letting us build
   *  each distinct glow once instead of every frame. */
  private _gradCache = new Map<string, CanvasGradient>();

  constructor(public engine: GameEngine) {}

  /** Returns a cached radial gradient. `key` must uniquely identify the
   *  geometry + color stops. Build gradients at (0,0) and draw them inside a
   *  translated context for position-independent reuse. */
  private radial(
    ctx: CanvasRenderingContext2D,
    key: string,
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    stops: Array<[number, string]>
  ): CanvasGradient {
    let g = this._gradCache.get(key);
    if (!g) {
      g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
      for (const [o, c] of stops) g.addColorStop(o, c);
      this._gradCache.set(key, g);
    }
    return g;
  }

public drawNetCharacter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    charId: string,
    outfitId: string,
    gunIndex: number,
    gunList: GunDef[],
    name: string,
    hpPct: number,
    t: number,
    size: number,
    p?: Player | SnapPlayer
  ) {
    const char = getCharacter(charId);
    const outfit = getOutfit(outfitId);
    const gun = gunList[gunIndex] ?? gunList[0];
    
    // Extrapolate values from player reference if provided
    let isCloaked = false;
    let cloakAlpha = 1;
    let lunge = 0;
    if (p && 'isCloaked' in p) {
      isCloaked = p.isCloaked ?? false;
      // 隐身期间角色半透明（具体微光特效由 drawCharacter 绘制）
      cloakAlpha = isCloaked ? 0.15 : 1;
      lunge = p.lunge ?? 0;
    }

    drawCharacter(ctx, {
      x,
      y,
      angle,
      character: char,
      outfit,
      size,
      t,
      gun,
      isCloaked,
      cloakAlpha,
      lunge
    });
    // hp bar
    const w = 32;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - w / 2, y - 24, w, 4);
    ctx.fillStyle = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#fbbf24" : "#f87171";
    ctx.fillRect(x - w / 2, y - 24, w * Math.max(0, hpPct), 4);
    // name
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, x, y - 28);
  }

public renderNet(ctx: CanvasRenderingContext2D) {
    const s = this.engine.lastSnap;
    if (!s) return;
    ctx.save();
    if (this.engine.shake > 0.2) ctx.translate((Math.random() - 0.5) * this.engine.shake, (Math.random() - 0.5) * this.engine.shake);
    ctx.translate(-this.engine.camX, -this.engine.camY);

    // age the mirrored effects by real frame time so they animate smoothly
    // between 30Hz snapshots (the host sends their current elapsed `t`).
    {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const dtfx = this.engine.netFxPrev ? Math.min(0.05, (now - this.engine.netFxPrev) / 1000) : 0;
      this.engine.netFxPrev = now;
      if (dtfx > 0 && this.engine.netEffects.length) {
        for (const e of this.engine.netEffects) e.t += dtfx;
        this.engine.netEffects = this.engine.netEffects.filter((e) => e.t < e.duration);
      }
    }

    // ease a network entity toward its latest snapshot position so 30Hz updates look smooth
    const ease = (id: number, x: number, y: number) => {
      const prev = this.engine.netRender.get(id);
      if (!prev) {
        const cur = { x, y };
        this.engine.netRender.set(id, cur);
        return cur;
      }
      prev.x += (x - prev.x) * 0.4;
      prev.y += (y - prev.y) * 0.4;
      return prev;
    };

    // Each side renders ITS OWN base at the bottom of its own screen. The
    // joiner (pid 2) defends the world's top base (this.engine.enemyBase); the creator
    // (pid 1) defends the bottom one (this.engine.base). Use selfPid so the
    // authoritative path (both peers run as "guest") orients correctly.
    if (this.engine.gameMode !== "biohazard") {
      const ownBase = this.engine.mode === "guest" ? this.engine.enemyBase : this.engine.base;
      const foeBase = this.engine.mode === "guest" ? this.engine.base : this.engine.enemyBase;
      this.drawBase(ctx, ownBase, true);
      this.drawBase(ctx, foeBase, false);
    }
    // terrain cover walls + arena border (mirrored from the snapshot)
    this.drawWalls(ctx);
    this.drawArenaBorder(ctx);
    // mirror the host's thrown grenades + deployed gadgets (the guest runs no sim)
    {
      const rg = this.engine.grenades;
      const rd = this.engine.deployables;
      this.engine.grenades = this.engine.netGrenades;
      this.engine.deployables = this.engine.netDeployables;
      this.drawGrenades(ctx);
      this.drawDeployables(ctx);
      this.engine.grenades = rg;
      this.engine.deployables = rd;
    }
    for (const e of s.enemies) {
      const r = ease(e.id, e.x, e.y);
      const c = getCharacter(e.character);
      ctx.fillStyle = c?.bodyColor ?? "#f87171";
      ctx.beginPath();
      ctx.arc(r.x, r.y, e.size, 0, Math.PI * 2);
      ctx.fill();
      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(r.x - e.size, r.y - e.size - 6, e.size * 2, 3);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(r.x - e.size, r.y - e.size - 6, e.size * 2 * (e.hp / e.maxHp), 3);
      }
    }
    for (const p of s.players) {
      if (p.hp <= 0) continue; // downed players are hidden until they respawn
      const isMe = p.id === this.engine.selfPid;
      const r = isMe ? { x: this.engine.player.x, y: this.engine.player.y } : ease(p.id, p.x, p.y);
      const gunList = isMe ? this.engine.guns : this.engine.foeGuns;
      const size = isMe ? this.engine.player.size : getCharacter(p.character).size;
      if (isMe) {
        this.drawThrustSwordChargeIndicator(ctx, this.engine.player);
      }
      this.drawNetCharacter(
        ctx,
        r.x,
        r.y,
        p.angle,
        p.character,
        p.outfit,
        p.gunIndex ?? 0,
        gunList,
        isMe ? this.engine.character.name : this.engine.peerName || "对手",
        p.hp / p.maxHp,
        this.engine.time,
        size,
        isMe ? this.engine.player : p
      );
      if (p.electrified > 0) {
        this.drawElectricArcs(ctx, r.x, r.y, size, p.electrifiedGlow, this.engine.time);
      }
    }
    // local gadget aiming preview (selection highlight + throw/deploy hint)
    this.drawAimPreview(ctx);
    // glowing bullets with a short trail (弹道) instead of bare lines
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of s.bullets) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const tx = b.x - (b.vx / sp) * b.size * 4;
      const ty = b.y - (b.vy / sp) * b.size * 4;
      ctx.strokeStyle = rgba(b.glow, 0.5);
      ctx.lineWidth = Math.max(1, b.size * 0.9);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      const R = b.size * 3.4;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = this.radial(ctx, "pbtrail_" + b.glow + "_" + Math.round(R), 0, 0, 0, 0, 0, R, [
        [0, rgba(b.glow, 0.85)],
        [1, rgba(b.glow, 0)],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // draw particles
    this.drawParticles(ctx);
    // mirrored host effects (explosions, sweeps, shockwaves, ...)
    if (this.engine.netEffects.length) this.drawEffects(ctx, this.engine.netEffects as unknown as Effect[]);
    ctx.restore();
  }

public render() {
    const ctx = this.engine.ctx;
    // headless / server mode: no canvas, simulation only
    if (!ctx) return;
    ctx.clearRect(0, 0, this.engine.W, this.engine.H);
    this.drawBackground(ctx);

    // guest / authoritative-server clients render the world straight from the snapshot
    if (this.engine.mode === "guest" || this.engine.authoritative) {
      this.renderNet(ctx);
      this.drawCrosshair(ctx);
      this.drawOverlays(ctx);
      return;
    }

    ctx.save();
    if (this.engine.shake > 0.2) {
      ctx.translate(
        (Math.random() - 0.5) * this.engine.shake,
        (Math.random() - 0.5) * this.engine.shake
      );
    }
    // camera offset for world-space rendering
    ctx.translate(-this.engine.camX, -this.engine.camY);

    this.drawWalls(ctx);
    this.drawDeployables(ctx);
    if (this.engine.gameMode !== "biohazard" && !this.engine.isDM) {
      this.drawBase(ctx, this.engine.enemyBase, false);
      this.drawBase(ctx, this.engine.base, true);
    }
    this.drawArenaBorder(ctx);
    this.drawFieldEffects(ctx);
    this.drawPickups(ctx);
    this.drawParticles(ctx);
    this.drawGrenades(ctx);
    this.drawEnemies(ctx);
    this.drawEnemyBullets(ctx);
    this.drawBeam(ctx);
    this.drawFlameCone(ctx);
    if (this.engine.isDM) {
      // draw every combatant (you + 3 bots) with its name + hp bar
      for (const c of this.engine.combatants) {
        const q = c.player;
        if (q.deadTimer && q.deadTimer > 0) continue;

        const isLocalC = this.engine.mode === "local" ? c.id === 0 : c.id === this.engine.selfPid;
        if (isLocalC) {
          this.drawThrustSwordChargeIndicator(ctx, q);
        }


        if (q.winchActive && q.winchX !== undefined && q.winchY !== undefined) {
          ctx.save();
          ctx.strokeStyle = "#4b5563";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.winchX, q.winchY);
          ctx.stroke();
          ctx.fillStyle = "#9ca3af";
          ctx.beginPath();
          ctx.arc(q.winchX, q.winchY, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        this.drawNetCharacter(
          ctx,
          q.x,
          q.y,
          q.angle,
          c.character.id,
          c.outfit.id,
          q.gunIndex ?? c.gunIndex ?? 0,
          c.guns,
          c.name,
          q.hp / q.maxHp,
          this.engine.time,
          q.size,
          q
        );
        if (q.electrifiedTime && q.electrifiedTime > 0) {
          this.drawElectricArcs(ctx, q.x, q.y, q.size, q.electrifiedGlow ?? "#38bdf8", this.engine.time);
        }
        if (q.iframes > 0 && q.dashTime <= 0) {
          ctx.save();
          ctx.globalAlpha = 0.35 + Math.sin(this.engine.time * 20) * 0.15;
          ctx.strokeStyle = "#e0f2fe";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.size + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else {
      if (!(this.engine.player.deadTimer && this.engine.player.deadTimer > 0)) this.drawPlayer(ctx);
      if (this.engine.foe && !(this.engine.foe.deadTimer && this.engine.foe.deadTimer > 0)) {
        this.drawNetCharacter(
          ctx,
          this.engine.foe.x,
          this.engine.foe.y,
          this.engine.foe.angle,
          this.engine.foeChar?.id ?? "raider",
          this.engine.foeOutfit?.id ?? "tactical",
          this.engine.foe.gunIndex ?? 0,
          this.engine.foeGuns,
          this.engine.peerName || "对手",
          this.engine.foe.hp / this.engine.foe.maxHp,
          this.engine.time,
          this.engine.foe.size,
          this.engine.foe
        );
        if (this.engine.foe.electrifiedTime && this.engine.foe.electrifiedTime > 0) {
          this.drawElectricArcs(ctx, this.engine.foe.x, this.engine.foe.y, this.engine.foe.size, this.engine.foe.electrifiedGlow ?? "#38bdf8", this.engine.time);
        }
      }
    }
    // gadget aiming preview (selection highlight + throw/deploy hint)
    this.drawAimPreview(ctx);
    // weapon aim indicator (投射榴弹炮 — deployable-style target marker)
    if (this.engine.gun.aimIndicator) this.drawLauncherIndicator(ctx);
    this.drawBullets(ctx);
    this.drawEffects(ctx);

    ctx.restore();

    this.drawCrosshair(ctx);
    this.drawOverlays(ctx);
  }

public drawBackground(ctx: CanvasRenderingContext2D) {
    const theme = this.engine.sceneTheme;
    const g = ctx.createLinearGradient(0, 0, 0, this.engine.H);
    g.addColorStop(0, theme.bgTop);
    g.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.engine.W, this.engine.H);

    // blobs at base positions (in world space, but we draw in screen space)
    // own base glows blue, opponent's glows red — for both host and guest
    if (!this.engine.isDM && this.engine.gameMode !== "biohazard") {
      const myBase = this.engine.mode === "guest" ? this.engine.enemyBase : this.engine.base;
      const foeBase = this.engine.mode === "guest" ? this.engine.base : this.engine.enemyBase;
      const blobs: [number, number, string][] = [
        [foeBase.x - this.engine.camX, foeBase.y - this.engine.camY, "#dc2626"],
        [myBase.x - this.engine.camX, myBase.y - this.engine.camY, "#1d4ed8"],
      ];
      const blobR = this.engine.W * 0.4;
      for (const [bx, by, col] of blobs) {
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = this.radial(ctx, "baseBlob_" + col, 0, 0, 0, 0, 0, blobR, [
          [0, rgba(col, 0.18)],
          [1, rgba(col, 0)],
        ]);
        ctx.fillRect(-blobR, -blobR, blobR * 2, blobR * 2);
        ctx.restore();
      }
    }

    // floor — cyber city blits a cached, world-sized neon backdrop (one
    // drawImage per frame instead of hundreds of fills); other scenes a grid
    if (theme.style === "city") {
      ctx.save();
      ctx.translate(-this.engine.camX, -this.engine.camY);
      const bg = this.getCityBg();
      if (bg) ctx.drawImage(bg, 0, 0);
      else this.drawCityBackdrop(ctx, theme);
      ctx.restore();
      // animated magenta sweep (per-frame, screen space)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const sweep = (this.engine.time * 0.05) % 1;
      const sg = ctx.createLinearGradient(0, 0, this.engine.W, 0);
      const p = sweep * this.engine.W;
      sg.addColorStop(0, "rgba(217,70,239,0)");
      sg.addColorStop(Math.min(1, p / this.engine.W), "rgba(217,70,239,0.05)");
      sg.addColorStop(1, "rgba(217,70,239,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, this.engine.W, this.engine.H);
      ctx.restore();
    } else {
      ctx.strokeStyle = theme.gridColor ?? "rgba(130,150,220,0.07)";
      ctx.lineWidth = 1;
      const step = 48;
      const offX = -this.engine.camX % step;
      const offY = -this.engine.camY % step;
      ctx.beginPath();
      for (let x = offX; x <= this.engine.W; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.engine.H);
      }
      for (let y = offY; y <= this.engine.H; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(this.engine.W, y);
      }
      ctx.stroke();
    }

    // vignette
    const vg = ctx.createRadialGradient(
      this.engine.W / 2,
      this.engine.H / 2,
      this.engine.H * 0.35,
      this.engine.W / 2,
      this.engine.H / 2,
      this.engine.H * 0.85
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.engine.W, this.engine.H);
  }

public drawCityBackdrop(
    ctx: CanvasRenderingContext2D,
    theme: { accent: string; wallDark: string; gridColor?: string }
  ) {
    // road grid (neon lines, at world coords)
    ctx.strokeStyle = theme.gridColor ?? "rgba(34,211,238,0.10)";
    ctx.lineWidth = 1.5;
    const gstep = 64;
    ctx.beginPath();
    for (let x = 0; x <= this.engine.worldW; x += gstep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.engine.worldH);
    }
    for (let y = 0; y <= this.engine.worldH; y += gstep) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.engine.worldW, y);
    }
    ctx.stroke();

    // building blocks — kept subtle so the arena reads as a faint neon-city floor
    const block = 150;
    for (let wx = 0; wx <= this.engine.worldW; wx += block) {
      for (let wy = 0; wy <= this.engine.worldH; wy += block) {
        const h = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453);
        const f = h - Math.floor(h); // pseudo-random 0..1
        const f2 = (h * 1.7) % 1;
        const pad = 24 + Math.floor(f * 22);
        const bw = block - pad * 2 - Math.floor(f2 * 20);
        const bh = block - pad * 2 - Math.floor((1 - f2) * 16);
        const bx = wx + pad;
        const by = wy + pad;

        // rooftop slab (low alpha so the floor stays in the background)
        ctx.fillStyle = rgba(theme.wallDark, 0.26);
        roundRect(ctx, bx, by, bw, bh, 7);
        ctx.fill();
        // neon edge (thin, soft)
        ctx.strokeStyle = rgba(theme.accent, 0.28);
        ctx.lineWidth = 1;
        ctx.stroke();
        // inner glow line
        ctx.strokeStyle = rgba(theme.accent, 0.08);
        ctx.lineWidth = 1;
        roundRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, 5);
        ctx.stroke();

        // lit windows (a few small squares)
        const cols = Math.max(2, Math.floor(bw / 26));
        const rows = Math.max(2, Math.floor(bh / 26));
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const lit = ((i * 7 + j * 13 + Math.floor(f * 31)) % 5) === 0;
            if (!lit) continue;
            ctx.fillStyle = rgba(theme.accent, 0.32);
            ctx.fillRect(bx + 8 + i * 22, by + 8 + j * 22, 5, 5);
          }
        }
      }
    }
  }

public getCityBg(): HTMLCanvasElement | null {
    if (typeof document === "undefined") return null;
    const key = `${this.engine.sceneIndex}|${Math.ceil(this.engine.worldW)}|${Math.ceil(this.engine.worldH)}`;
    if (this.cityBg && this.cityBgKey === key) return this.cityBg;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(this.engine.worldW));
    c.height = Math.max(1, Math.ceil(this.engine.worldH));
    const b = c.getContext("2d");
    if (!b) return null;
    this.drawCityBackdrop(b, this.engine.sceneTheme);
    this.cityBg = c;
    this.cityBgKey = key;
    return c;
  }

public drawArenaBorder(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = rgba(this.engine.sceneTheme.accent, 0.35);
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, this.engine.worldW - 4, this.engine.worldH - 4);
  }

public drawWalls(ctx: CanvasRenderingContext2D) {
    for (const w of this.engine.walls) {
      if (w.invisible) continue;
      ctx.save();
      if (w.building) {
        this.drawBuilding(ctx, w);
      } else if (w.glue) {
        // glue wall — translucent cyan gel
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, rgba("#22d3ee", 0.5));
        g.addColorStop(1, rgba("#0891b2", 0.4));
        ctx.fillStyle = g;
        roundRect(ctx, w.x, w.y, w.w, w.h, 8);
        ctx.fill();
        ctx.strokeStyle = rgba("#67e8f9", 0.7);
        ctx.lineWidth = 2;
        ctx.stroke();
        // bubbles
        ctx.fillStyle = rgba("#cffafe", 0.4);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(
            w.x + 10 + i * (w.w / 4),
            w.y + w.h / 2 + Math.sin(this.engine.time * 2 + i) * 4,
            2.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        const frac = Math.max(0, w.hp / w.maxHp);
        if (frac < 1) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, w.w - 8, 3);
          ctx.fillStyle = rgba("#22d3ee", 0.9);
          ctx.fillRect(w.x + 4, w.y + w.h + 3, (w.w - 8) * frac, 3);
        }
      } else if (w.destructible) {
        const frac = Math.max(0, w.hp / w.maxHp);
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, "#c9a36a");
        g.addColorStop(1, "#8a6a3c");
        ctx.fillStyle = g;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(20,14,6,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(60,40,20,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const horiz = w.w >= w.h;
        if (horiz) {
          for (let i = 1; i < Math.floor(w.w / 16); i++) {
            ctx.moveTo(w.x + i * 16, w.y);
            ctx.lineTo(w.x + i * 16, w.y + w.h);
          }
        } else {
          for (let i = 1; i < Math.floor(w.h / 16); i++) {
            ctx.moveTo(w.x, w.y + i * 16);
            ctx.lineTo(w.x + w.w, w.y + i * 16);
          }
        }
        ctx.stroke();
        if (frac < 0.6) {
          ctx.strokeStyle = rgba("#1a120a", 0.7);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(w.x + w.w * 0.3, w.y + w.h * 0.5);
          ctx.lineTo(w.x + w.w * 0.5, w.y + w.h * 0.2);
          ctx.lineTo(w.x + w.w * 0.7, w.y + w.h * 0.6);
          ctx.stroke();
        }
        if (frac < 1) {
          const pw = w.w - 8;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw, 3);
          ctx.fillStyle = rgba("#fbbf24", 0.9);
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw * frac, 3);
        }
      } else {
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, "#5b6478");
        g.addColorStop(1, "#2a3140");
        ctx.fillStyle = g;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(10,12,28,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = "rgba(180,190,210,0.5)";
        const r = 1.6;
        for (const [rx, ry] of [
          [w.x + 5, w.y + 5],
          [w.x + w.w - 5, w.y + 5],
          [w.x + 5, w.y + w.h - 5],
          [w.x + w.w - 5, w.y + w.h - 5],
        ]) {
          ctx.beginPath();
          ctx.arc(rx, ry, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w.x, w.y, w.w, 3);
      }
      ctx.restore();
    }
  }

public drawBuilding(ctx: CanvasRenderingContext2D, w: Wall) {
    // ground shadow so the slab reads as a raised structure
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(w.x + w.w / 2, w.y + w.h + 6, w.w / 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    switch (this.engine.sceneIndex) {
      case 1:
        this.engine.bldDesert(ctx, w);
        break;
      case 2:
        this.engine.bldArctic(ctx, w);
        break;
      case 3:
        this.engine.bldRuin(ctx, w);
        break;
      case 4:
        this.engine.bldCyber(ctx, w);
        break;
      default:
        this.engine.bldNeon(ctx, w);
        break;
    }
    // hp bar when damaged
    const frac = Math.max(0, w.hp / w.maxHp);
    if (frac < 1) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(w.x + 4, w.y + w.h + 3, w.w - 8, 3);
      ctx.fillStyle = rgba("#fbbf24", 0.9);
      ctx.fillRect(w.x + 4, w.y + w.h + 3, (w.w - 8) * frac, 3);
    }
  }

public drawDeployables(ctx: CanvasRenderingContext2D) {
    for (const d of this.engine.deployables) {
      if (!this.engine.inView(d.x, d.y, d.size + 40)) continue;
      ctx.save();
      ctx.translate(d.x, d.y);
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, d.size * 0.7, d.size * 0.8, d.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // range indicator for turrets (faint)
      if (d.kind === "turret_mg" || d.kind === "turret_cannon") {
        ctx.strokeStyle = rgba(d.color, 0.12);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (d.kind === "turret_mg") {
        ctx.rotate(d.angle + Math.PI / 2);
        drawGadgetIcon(ctx, { iconShape: "turret_mg", color: d.color } as never, 0, 0, d.size * 2);
      } else if (d.kind === "turret_cannon") {
        ctx.rotate(d.angle + Math.PI / 2);
        drawGadgetIcon(ctx, { iconShape: "turret_cannon", color: d.color } as never, 0, 0, d.size * 2);
      } else if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire") {
        // Mine blink animation
        const blink = d.armed <= 0 ? (Math.floor(this.engine.time * 4) % 2 === 0 ? 1 : 0.4) : 0.5;
        const colorWithBlink = rgba(d.color, blink);
        drawGadgetIcon(ctx, { iconShape: d.kind, color: colorWithBlink } as never, 0, 0, d.size * 2.2);

        // Pulse ring when armed
        if (d.armed <= 0) {
          ctx.strokeStyle = rgba(d.color, 0.3);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 8 + (this.engine.time * 20) % 16, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (d.kind === "healing_station") {
        // Range indicator
        ctx.strokeStyle = rgba(d.color, 0.15);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Pulsing aura
        const pulse = 0.5 + Math.sin(this.engine.time * 3) * 0.2;
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, d.size * 2);
        rg.addColorStop(0, rgba(d.color, pulse * 0.5));
        rg.addColorStop(1, rgba(d.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, d.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Render station icon
        drawGadgetIcon(ctx, { iconShape: "healing_station", color: d.color } as never, 0, 0, d.size * 2);
      }
      ctx.restore();

      // hp bar for turrets & healing station
      if ((d.kind === "turret_mg" || d.kind === "turret_cannon" || d.kind === "healing_station") && d.hp < d.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(d.x - 14, d.y - d.size - 10, 28, 4);
        ctx.fillStyle = rgba(d.color, 0.9);
        ctx.fillRect(d.x - 14, d.y - d.size - 10, 28 * (d.hp / d.maxHp), 4);
      }
    }
  }

public drawFieldEffects(ctx: CanvasRenderingContext2D) {
    for (const e of this.engine.effects) {
      if (!this.engine.inView(e.x, e.y, e.radius + 20)) continue;
      if (e.type === "poisoncloud") {
        const k = 1 - e.t / e.duration;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const R = e.radius;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = k;
        ctx.fillStyle = this.radial(ctx, "pcloud_" + e.color + "_" + Math.round(R), 0, 0, 0, 0, 0, R, [
          [0, rgba(e.color, 0.35)],
          [1, rgba(e.color, 0)],
        ]);
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        // floating bubbles
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + this.engine.time;
          ctx.fillStyle = rgba(e.color, 0.4 * k);
          ctx.beginPath();
          ctx.arc(
            e.x + Math.cos(a) * e.radius * 0.6,
            e.y + Math.sin(a) * e.radius * 0.6 - (this.engine.time * 20) % e.radius,
            4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === "firefield") {
        const k = 1 - e.t / e.duration;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const R = e.radius;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = k;
        ctx.fillStyle = this.radial(ctx, "ffield_" + e.color + "_" + Math.round(R), 0, 0, 0, 0, 0, R, [
          [0, rgba("#fde68a", 0.4)],
          [0.5, rgba(e.color, 0.35)],
          [1, rgba(e.color, 0)],
        ]);
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        ctx.restore();
      }
    }
  }

public drawBase(ctx: CanvasRenderingContext2D, b: Base, mine: boolean) {
    const isEnemy = !mine;
    ctx.save();
    ctx.translate(b.x, b.y);
    const frac = b.hp / b.maxHp;
    const col = isEnemy
      ? (frac > 0.5 ? "#f87171" : frac > 0.25 ? "#fb923c" : "#ef4444")
      : (frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#fbbf24" : "#f87171");

    ctx.save();
    ctx.rotate(b.t * 0.6);
    ctx.strokeStyle = rgba("#60a5fa", 0.25);
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();

    const haloR = b.radius * 2;
    ctx.fillStyle = this.radial(ctx, "baseHalo_" + col, 0, 0, b.radius * 0.3, 0, 0, haloR, [
      [0, rgba(col, 0.35)],
      [1, rgba(col, 0)],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(b.t * 0.4);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * b.radius;
      const py = Math.sin(a) * b.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = this.radial(ctx, "baseCore_" + col + (b.flash > 0 ? "_f" : ""), 0, 0, 2, 0, 0, b.radius, [
      [0, b.flash > 0 ? "#ffffff" : "#dbeafe"],
      [0.6, col],
      [1, shade(col, -0.3)],
    ]);
    ctx.fill();
    ctx.strokeStyle = "rgba(8,10,25,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.rotate(-b.t * 1.5);
    ctx.strokeStyle = rgba("#ffffff", 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const px = Math.cos(a) * b.radius * 0.45;
      const py = Math.sin(a) * b.radius * 0.45;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // on-map label so it's unambiguous which base is yours
    ctx.fillStyle = mine ? "rgba(186,230,253,0.95)" : "rgba(254,202,202,0.95)";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mine ? "己方基地" : "敌方基地", 0, b.radius + 40);

    ctx.restore();
  }

public drawPickups(ctx: CanvasRenderingContext2D) {
    for (const pk of this.engine.pickups) {
      if (!this.engine.inView(pk.x, pk.y, 30)) continue;
      const y = pk.y + Math.sin(pk.bob) * 3;
      const blink = pk.life < 3 && Math.floor(pk.life * 6) % 2 === 0;
      if (blink) continue;
      ctx.save();
      ctx.translate(pk.x, y);
      ctx.fillStyle = this.radial(ctx, "pickup", 0, 0, 0, 0, 0, 18, [
        [0, rgba("#4ade80", 0.5)],
        [1, rgba("#4ade80", 0)],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bbf7d0";
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-7, -7, 14, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#065f46";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.restore();
    }
  }

public drawParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.engine.particles) {
      if (!this.engine.inView(p.x, p.y, p.size + 6)) continue;
      const a = Math.max(0, p.life / p.maxLife);
      if (p.coin) {
        // spinning coin — ellipse simulates rotation; once landed it lies flat
        // and stays put, fading only in its final 0.3s on the ground.
        const flightA = Math.min(1, Math.max(0, p.life / 0.3));
        const w = p.landed
          ? p.size * 1.3
          : Math.abs(Math.cos(p.spin ?? 0)) * p.size + 1;
        const h = p.landed ? p.size * 0.5 : p.size;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rgba(p.color, Math.min(1, a * 1.5) * flightA);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba("#92400e", a * flightA);
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
      } else {
        const sz = p.shrink ? p.size * a : p.size;
        ctx.fillStyle = rgba(p.color, a * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

public drawGrenades(ctx: CanvasRenderingContext2D) {
    for (const gr of this.engine.grenades) {
      if (!this.engine.inView(gr.x, gr.y, 20)) continue;
      ctx.save();
      ctx.translate(gr.x, gr.y);
      const color = gr.kind === "fire" ? "#f97316" : gr.kind === "glue" ? "#06b6d4" : gr.kind === "poison" ? "#22c55e" : "#fbbf24";
      // Spinning rotation effect for throwing grenades
      ctx.rotate(this.engine.time * 6);
      drawGadgetIcon(ctx, { iconShape: gr.kind + "_grenade", color: color } as never, 0, 0, 15);
      ctx.restore();
    }
  }

public drawEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.engine.enemies) {
      if (!this.engine.inView(e.x, e.y, e.size * 2.5 + 30)) continue;
      const scale = e.spawnT;
      // shadow
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.size * 0.7, e.size * 0.9, e.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // enemy glow (red aura)
      if (e.type === "elite") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const R = e.size * 2.5;
        ctx.translate(e.x, e.y);
        ctx.fillStyle = this.radial(ctx, "elite_" + Math.round(R), 0, 0, 0, 0, 0, R, [
          [0, rgba("#fb7185", 0.25)],
          [1, rgba("#fb7185", 0)],
        ]);
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // biohazard monsters get a dedicated, detailed silhouette
      if (e.behavior) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale);
        drawMonster(ctx, {
          behavior: e.behavior,
          size: e.size,
          color: e.color,
          glow: e.glow,
          angle: e.angle,
          t: this.engine.time,
          flash: e.hitFlash > 0.05 ? Math.min(1, e.hitFlash) : 0,
          poison: (e.poisonT ?? 0) > 0,
          buffed: (e.buffT ?? 0) > 0,
          charging: (e.chargeT ?? 0) > 0,
        });
        ctx.restore();
      } else if (e.character && e.outfit) {
        // tint enemy red-ish by overriding colors
        const enemyChar: CharacterDef = {
          ...e.character,
          bodyColor: e.type === "elite" ? "#fb7185" : "#f87171",
          accent: "#dc2626",
        };
        const enemyOutfit: OutfitDef = {
          ...e.outfit,
          suit: e.type === "elite" ? "#9f1239" : "#991b1b",
          suitDark: e.type === "elite" ? "#881337" : "#7f1d1d",
          accent: "#fca5a5",
        };
        ctx.save();
        ctx.scale(scale, scale);
        drawCharacter(ctx, {
          x: e.x / scale,
          y: e.y / scale,
          angle: e.angle,
          character: enemyChar,
          outfit: enemyOutfit,
          size: e.size,
          t: this.engine.time,
          flash: e.hitFlash > 0.05 ? Math.min(1, e.hitFlash) : 0,
          gun: e.gun,
        });
        ctx.restore();
      } else {
        // fallback simple circle
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale);
        const body = e.hitFlash > 0.05 ? "#ffffff" : e.color;
        ctx.fillStyle = body;
        ctx.strokeStyle = shade(e.glow, -0.25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = e.glow;
        ctx.beginPath();
        ctx.arc(e.size * 0.45, -e.size * 0.22, e.size * 0.16, 0, Math.PI * 2);
        ctx.arc(e.size * 0.45, e.size * 0.22, e.size * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // poison cloud
      if (e.slowT > 0) {
        ctx.save();
        ctx.fillStyle = rgba("#84cc16", 0.2);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // active poison damage aura
      if ((e.poisonT ?? 0) > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba("#a3e635", 0.22);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // hp bar
      if (e.hp < e.maxHp) {
        const w = Math.max(24, e.size * 2);
        const hpx = e.x - w / 2;
        const hpy = e.y - e.size - 12;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(hpx - 1, hpy - 1, w + 2, 6);
        ctx.fillStyle = rgba(e.glow, 0.9);
        ctx.fillRect(hpx, hpy, w * (e.hp / e.maxHp), 4);
      }

      // electric arcs from a lightsaber hit
      if (e.electrifiedTime && e.electrifiedTime > 0) {
        this.drawElectricArcs(ctx, e.x, e.y, e.size, e.electrifiedGlow ?? "#38bdf8", this.engine.time);
      }
    }
  }

public drawEnemyBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.engine.enemyBullets) {
      if (!this.engine.inView(b.x, b.y, b.size * 3 + 6)) continue;
      const R = b.size * 3;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = this.radial(ctx, "ebul_" + b.color + "_" + Math.round(R), 0, 0, 0, 0, 0, R, [
        [0, rgba(b.color, 0.9)],
        [1, rgba(b.color, 0)],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

public drawBeam(ctx: CanvasRenderingContext2D) {
    if (!this.engine.beamActive || !this.engine.beamHit) return;
    const p = this.engine.player;
    const g = this.engine.gun;
    const ox = p.x + Math.cos(p.angle) * (p.size + 6);
    const oy = p.y + Math.sin(p.angle) * (p.size + 6);
    const ex = this.engine.beamHit.point.x;
    const ey = this.engine.beamHit.point.y;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flick = 0.8 + Math.random() * 0.2;
    ctx.strokeStyle = rgba(g.glow, 0.22 * flick);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = rgba(g.glow, 0.5 * flick);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", 0.9 * flick);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.save();
    ctx.translate(ex, ey);
    ctx.fillStyle = this.radial(ctx, "muzzle_" + g.glow, 0, 0, 0, 0, 0, 14, [
      [0, rgba("#ffffff", 0.8)],
      [0.5, rgba(g.glow, 0.7)],
      [1, rgba(g.glow, 0)],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

public drawFlameCone(ctx: CanvasRenderingContext2D) {
    if (!this.engine.flameActive) return;
    const p = this.engine.player;
    const g = this.engine.gun;
    const cone = g.flameCone ?? 0.4;
    const range = g.flameRange ?? 150;
    const ox = p.x + Math.cos(p.angle) * (p.size + g.barrel);
    const oy = p.y + Math.sin(p.angle) * (p.size + g.barrel);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = this.radial(ctx, "flame_" + g.glow + "_" + Math.round(range), 0, 0, 0, 0, 0, range, [
      [0, rgba("#fde68a", 0.5)],
      [0.4, rgba(g.glow, 0.35)],
      [1, rgba(g.glow, 0)],
    ]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, p.angle - cone, p.angle + cone);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

public drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.engine.player;
    if (p.shieldTime > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 1 + Math.sin(this.engine.time * 8) * 0.04;
      const rr = p.size * 2.1 * pulse;
      const alpha = Math.min(1, p.shieldTime / 0.6) * 0.7;
      ctx.strokeStyle = rgba("#60a5fa", alpha);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba("#dbeafe", alpha * 0.6);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = this.engine.time * 2 + (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, rr, a, a + 0.5);
        ctx.stroke();
      }
      const rg = ctx.createRadialGradient(0, 0, rr * 0.6, 0, 0, rr);
      rg.addColorStop(0, rgba("#60a5fa", 0));
      rg.addColorStop(1, rgba("#60a5fa", alpha * 0.25));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // riot shield raised visual
    if (p.shieldBlockTime > 0 && this.engine.gun.weaponClass === "shield") {
      const arc = this.engine.gun.shieldArc ?? 0.7;
      const sr = p.size + 22;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalCompositeOperation = "lighter";
      const sg = ctx.createRadialGradient(0, 0, sr * 0.3, 0, 0, sr);
      sg.addColorStop(0, rgba("#3b82f6", 0.15));
      sg.addColorStop(1, rgba("#3b82f6", 0));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, sr, -arc, arc);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba("#60a5fa", 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, sr, -arc, arc);
      ctx.stroke();
      ctx.restore();
    }

    // bow draw visual — string pulled back
    if (p.bowDrawing && this.engine.gun.weaponClass === "bow") {
      const maxT = this.engine.gun.maxChargeTime ?? 1.2;
      const pct = Math.min(1, p.bowCharge / maxT);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = rgba(this.engine.gun.glow, 0.5 * pct);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.size + 4, -8);
      ctx.lineTo(p.size + 4 - pct * 10, 0);
      ctx.lineTo(p.size + 4, 8);
      ctx.stroke();
      // charge glow
      if (pct > 0.1) {
        const cg = ctx.createRadialGradient(p.size + 4, 0, 0, p.size + 4, 0, 8 + pct * 6);
        cg.addColorStop(0, rgba(this.engine.gun.glow, pct * 0.8));
        cg.addColorStop(1, rgba(this.engine.gun.glow, 0));
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(p.size + 4, 0, 8 + pct * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // thrust longsword: dash distance + hit-range indicator + charge status while charging
    this.drawThrustSwordChargeIndicator(ctx, p);

    if (p.winchActive && p.winchX !== undefined && p.winchY !== undefined) {
      ctx.save();
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.winchX, p.winchY);
      ctx.stroke();
      ctx.fillStyle = "#9ca3af";
      ctx.beginPath();
      ctx.arc(p.winchX, p.winchY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const glow =
      p.overdriveTime > 0
        ? "#fbbf24"
        : p.dashTime > 0
        ? "#22d3ee"
        : undefined;

    // melee swing progress 0..1
    const swing = p.swingTimer > 0 ? 1 - p.swingTimer / p.swingDur : 0;

    drawCharacter(ctx, {
      x: p.x,
      y: p.y,
      angle: p.angle,
      character: this.engine.character,
      outfit: this.engine.outfit,
      size: p.size,
      t: p.t,
      flash: p.flash > 0 ? Math.min(1, p.flash) : 0,
      glow,
      gun: this.engine.gun,
      meleeSwing: swing,
      lunge: p.lunge,
      isCloaked: p.isCloaked,
      cloakAlpha: p.isCloaked ? 0.15 : 1,
      thrustCharging: p.thrustCharging,
      thrustCharge: p.thrustCharge,
    });

    // electric arcs from a lightsaber hit
    if (p.electrifiedTime && p.electrifiedTime > 0) {
      this.drawElectricArcs(ctx, p.x, p.y, p.size, p.electrifiedGlow ?? "#38bdf8", this.engine.time);
    }

    if (p.iframes > 0 && p.dashTime <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.engine.time * 20) * 0.15;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

public drawThrustSwordChargeIndicator(ctx: CanvasRenderingContext2D, p: Player) {
    if (this.engine.gun.id !== "thrust_sword" || !p.thrustCharging) return;
    const g = this.engine.gun;
    const dist = g.chargeDashDist ?? 200;
    const rng = g.chargeDashRange ?? 34;
    const pulse = 0.5 + 0.5 * Math.sin(this.engine.time * 12);
    const charge = p.thrustCharge ?? 0;
    const minCharge = g.chargeMin ?? 0.5;
    const pct = Math.min(1, charge / minCharge);
    const isReady = pct >= 1;

    // 1. Draw dash range corridors in world coordinates
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    
    // hit corridor (width = 2 * range) along the aim direction
    ctx.fillStyle = rgba(g.glow, 0.12 + 0.06 * pulse);
    ctx.fillRect(0, -rng, dist, rng * 2);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = rgba(g.glow, isReady ? 0.85 : 0.45);
    ctx.lineWidth = isReady ? 2.0 : 1.2;
    ctx.strokeRect(0, -rng, dist, rng * 2);
    ctx.setLineDash([]);
    
    // center guide line (the dash trajectory)
    ctx.strokeStyle = rgba(g.glow, isReady ? 0.95 : 0.65);
    ctx.lineWidth = isReady ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dist, 0);
    ctx.stroke();
    
    // endpoint hit circle (final range at max distance)
    ctx.fillStyle = rgba(g.glow, 0.18 + 0.1 * pulse);
    ctx.beginPath();
    ctx.arc(dist, 0, rng, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(g.glow, isReady ? 0.95 : 0.65);
    ctx.lineWidth = isReady ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(dist, 0, rng, 0, Math.PI * 2);
    ctx.stroke();
    
    // arrowhead marking the dash endpoint
    ctx.fillStyle = rgba(g.glow, isReady ? 1.0 : 0.7);
    ctx.beginPath();
    ctx.moveTo(dist + 9, 0);
    ctx.lineTo(dist - 5, -6);
    ctx.lineTo(dist - 5, 6);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // 2. Draw charge status bar above player's head
    ctx.save();
    const barW = 44;
    const barH = 6;
    const bx = p.x - barW / 2;
    const by = p.y - p.size - 26; // above the head
    
    // Background bar
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(bx, by, barW, barH);
    
    // Filled bar
    ctx.fillStyle = isReady ? "#22c55e" : "#eab308"; // green if ready, yellow if charging
    ctx.fillRect(bx, by, barW * pct, barH);
    
    // Border
    ctx.strokeStyle = isReady ? "#ffffff" : "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
    
    // Text label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 3;
    ctx.fillText(isReady ? "RELEASE TO DASH" : "CHARGING", p.x, by - 4);
    ctx.restore();
  }

public drawJaggedRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    alpha: number,
    lw: number
  ) {
    const n = 30;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const jr =
        r * (1 + Math.sin(a * 5 + this.engine.time * 12) * 0.07 + (Math.random() - 0.5) * 0.06);
      const px = x + Math.cos(a) * jr;
      const py = y + Math.sin(a) * jr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

public drawBolt(
    ctx: CanvasRenderingContext2D,
    len: number,
    lateral: number,
    color: string,
    core: string,
    life: number,
    seed: number
  ) {
    const segs = 8;
    const jag = (1 - life) * 13 + 3;
    const tip = lateral + Math.sin(this.engine.time * 24 + seed) * 7 * (1 - life);
    const yAt = (f: number) =>
      lateral * (1 - f) +
      tip * f +
      Math.sin(f * 8 + this.engine.time * 20 + seed) * jag * Math.sin(f * Math.PI) +
      (Math.random() - 0.5) * (1 - life) * 6;
    const path = (col: string, lw: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, lateral * 0.25);
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        ctx.lineTo(len * f, yAt(f));
      }
      ctx.stroke();
    };
    path(rgba(color, (1 - life) * 0.7), 4 * (1 - life) + 1.5);
    path(rgba(core, (1 - life) * 0.95), 1.6 * (1 - life) + 0.6);
    // a forking branch partway down the bolt
    const fk = 0.55;
    const bx = len * fk;
    const by = yAt(fk);
    ctx.strokeStyle = rgba(core, (1 - life) * 0.5);
    ctx.lineWidth = 1 + (1 - life);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + len * 0.22, by + (lateral >= 0 ? 1 : -1) * (14 + Math.random() * 10));
    ctx.stroke();
  }

public drawBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.engine.bullets) {
      if (!this.engine.inView(b.x, b.y - (b.z ?? 0), b.size * 3.4 + 6)) continue;
      if (b.z && b.z > 1) {
        // ground shadow at the (current) landing-projected position
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.size * 1.5, b.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // shell raised by its arc height (z-axis)
        ctx.globalCompositeOperation = "lighter";
        const R0 = b.size * 3;
        ctx.save();
        ctx.translate(b.x, b.y - b.z);
        ctx.fillStyle = this.radial(ctx, "pbshell_" + b.glow + "_" + Math.round(R0), 0, 0, 0, 0, 0, R0, [
          [0, rgba(b.glow, 0.9)],
          [1, rgba(b.glow, 0)],
        ]);
        ctx.beginPath();
        ctx.arc(0, 0, R0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y - b.z, b.size, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const R = b.size * 3.4;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = this.radial(ctx, "pbbul_" + b.glow + "_" + Math.round(R), 0, 0, 0, 0, 0, R, [
        [0, rgba(b.glow, 0.85)],
        [1, rgba(b.glow, 0)],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

public drawElectricArcs(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    time: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    const bolts = 6;
    for (let i = 0; i < bolts; i++) {
      const a0 = (i / bolts) * Math.PI * 2 + time * 4;
      const a1 = a0 + 1.1 + Math.sin(time * 9 + i * 1.7) * 0.5;
      ctx.beginPath();
      let ang = a0;
      let rad = r * 0.55;
      ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      const segs = 4;
      for (let s = 1; s <= segs; s++) {
        ang = a0 + (a1 - a0) * (s / segs) + (Math.random() - 0.5) * 0.6;
        rad = r * 0.55 + r * 1.15 * (s / segs);
        ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      // outer colored bolt
      ctx.strokeStyle = rgba(color, 0.85);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // inner white-hot core
      ctx.strokeStyle = rgba("#ffffff", 0.7);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    // thin charged ring
    ctx.strokeStyle = rgba(color, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

public drawEffects(ctx: CanvasRenderingContext2D, list: Effect[] = this.engine.effects) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of list) {
      const k = e.t / e.duration;
      if (e.type === "explosion") {
        const r = e.radius * (0.3 + k * 0.9);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#fde68a", (1 - k) * 0.9));
        rg.addColorStop(0.4, rgba(e.color, (1 - k) * 0.7));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === "shock") {
        const r = e.radius * (0.5 + k * 0.8);
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.8);
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "spawn") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * k, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "debris") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "coinburst") {
        // expanding shockwave — tinted by kill style, biased by bullet direction
        const style = e.style ?? "bullet";
        const c1 = (COIN_STYLE[style] ?? COIN_STYLE.bullet)[0];
        const c2 = (COIN_STYLE[style] ?? COIN_STYLE.bullet)[1] ?? "#fbbf24";
        const r = e.radius * (0.3 + k * 1.25);
        if (style === "explosive") {
          // aggressive jagged double ring
          this.drawJaggedRing(ctx, e.x, e.y, r, c1, (1 - k) * 0.95, 7 * (1 - k) + 2);
          this.drawJaggedRing(ctx, e.x, e.y, r * 0.66, c2, (1 - k) * 0.7, 3.5 * (1 - k) + 1);
        } else {
          ctx.strokeStyle = rgba(c1, (1 - k) * 0.95);
          ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = rgba(c2, (1 - k) * 0.6);
          ctx.lineWidth = 3 * (1 - k) + 0.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }
        // bright flash core
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#ffffff", (1 - k) * 0.5));
        rg.addColorStop(0.5, rgba(c1, (1 - k) * 0.3));
        rg.addColorStop(1, rgba(c2, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
        // directional leading crescent — coins spray with the bullet's travel
        const dx = e.dirX ?? 0, dy = e.dirY ?? 0;
        const dl = Math.hypot(dx, dy);
        if (dl > 0.01) {
          const ang = Math.atan2(dy, dx);
          ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
          ctx.lineWidth = 5 * (1 - k) + 1.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r * 0.92, ang - 0.9, ang + 0.9);
          ctx.stroke();
          ctx.strokeStyle = rgba(c1, (1 - k) * 0.8);
          ctx.lineWidth = 9 * (1 - k) + 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r * 0.92, ang - 0.5, ang + 0.5);
          ctx.stroke();
        }
      } else if (e.type === "slash") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        const arc = e.arc ?? 2;
        const range = e.range ?? 60;
        ctx.fillStyle = rgba(e.color, (1 - k) * 0.35);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, range * (0.5 + k * 0.6), -arc / 2, arc / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, range * (0.6 + k * 0.5), -arc / 2, arc / 2);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === "dual_slash") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        
        const comboStep = parseInt(e.style ?? "1", 10);
        const swingDir = e.dirX ?? 1;
        const arc = e.arc ?? 2.0;
        const range = e.range ?? 78;

        if (comboStep === 5) {
          // Double crossing slash finisher (X shape)
          // Slash 1 (clockwise)
          {
            const sweepPercent = k * 1.25;
            const head = Math.min(1, sweepPercent);
            const tail = Math.max(0, sweepPercent - 0.45);
            const startA = -arc / 2;
            const endA = arc / 2;
            const a1 = startA + tail * (endA - startA);
            const a2 = startA + head * (endA - startA);
            
            if (head > tail) {
              const curRange = range * (0.9 + 0.1 * Math.sin(k * Math.PI));
              
              // Outer glow
              ctx.lineWidth = 18 * (1 - k) + 4;
              ctx.strokeStyle = rgba(e.color, (1 - k) * 0.9);
              ctx.beginPath();
              ctx.arc(0, 0, curRange, a1, a2, false);
              ctx.stroke();
              
              // White core
              ctx.lineWidth = 5 * (1 - k) + 1.5;
              ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.95);
              ctx.beginPath();
              ctx.arc(0, 0, curRange, a1, a2, false);
              ctx.stroke();
            }
          }
          // Slash 2 (counter-clockwise)
          {
            const sweepPercent = k * 1.25;
            const head = Math.min(1, sweepPercent);
            const tail = Math.max(0, sweepPercent - 0.45);
            const startA = arc / 2;
            const endA = -arc / 2;
            const a1 = startA + tail * (endA - startA);
            const a2 = startA + head * (endA - startA);
            
            if (head > tail) {
              const curRange = range * (0.9 + 0.1 * Math.sin(k * Math.PI));
              
              // Outer glow
              ctx.lineWidth = 18 * (1 - k) + 4;
              ctx.strokeStyle = rgba(e.color, (1 - k) * 0.9);
              ctx.beginPath();
              ctx.arc(0, 0, curRange, a1, a2, true);
              ctx.stroke();
              
              // White core
              ctx.lineWidth = 5 * (1 - k) + 1.5;
              ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.95);
              ctx.beginPath();
              ctx.arc(0, 0, curRange, a1, a2, true);
              ctx.stroke();
            }
          }
          
          // Additional shockwave effect for finisher
          ctx.strokeStyle = rgba(e.color, (1 - k) * 0.45);
          ctx.lineWidth = 3 * (1 - k) + 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, range * (0.3 + k * 0.8), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Alternating normal slash (slashes 1-4)
          // Sweeps clockwise if swingDir === 1, counter-clockwise if swingDir === -1
          const sweepPercent = k * 1.35;
          const head = Math.min(1, sweepPercent);
          const tail = Math.max(0, sweepPercent - 0.4);
          
          const startA = swingDir === 1 ? -arc / 2 : arc / 2;
          const endA = swingDir === 1 ? arc / 2 : -arc / 2;
          const a1 = startA + tail * (endA - startA);
          const a2 = startA + head * (endA - startA);
          
          if (head > tail) {
            const curRange = range * (0.85 + 0.15 * Math.sin(k * Math.PI));
            const anticlockwise = swingDir === -1;
            
            // Background motion trail
            ctx.fillStyle = rgba(e.color, (1 - k) * 0.18);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, curRange, a1, a2, anticlockwise);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();
            
            // Outer glow line
            ctx.lineWidth = 14 * (1 - k) + 3;
            ctx.strokeStyle = rgba(e.color, (1 - k) * 0.85);
            ctx.beginPath();
            ctx.arc(0, 0, curRange, a1, a2, anticlockwise);
            ctx.stroke();
            
            // White core line
            ctx.lineWidth = 4 * (1 - k) + 1;
            ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.95);
            ctx.beginPath();
            ctx.arc(0, 0, curRange, a1, a2, anticlockwise);
            ctx.stroke();
            
            // Spark effect at the front tip
            const tipAngle = startA + head * (endA - startA);
            const sparkX = Math.cos(tipAngle) * curRange;
            const sparkY = Math.sin(tipAngle) * curRange;
            
            ctx.fillStyle = rgba("#ffffff", (1 - k) * 0.9);
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 4 * (1 - k) + 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else if (e.type === "saberswing") {
        // bright energy sweep of the blade, fading as it completes
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const arc = e.arc ?? 2.5;
        const range = e.range ?? 80;
        // soft outer glow wedge
        const rg = ctx.createRadialGradient(0, 0, range * 0.15, 0, 0, range * 1.05);
        rg.addColorStop(0, rgba(e.color, (1 - k) * 0.45));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, range * (0.85 + k * 0.2), -arc / 2, arc / 2);
        ctx.closePath();
        ctx.fill();
        // white-hot outer edge of the blade sweep
        ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.92, -arc / 2, arc / 2);
        ctx.stroke();
        // colored energy core
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.95);
        ctx.lineWidth = 9 * (1 - k) + 2;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.92, -arc / 2, arc / 2);
        ctx.stroke();
        // leading bright tip
        const tipA = -arc / 2 + arc * k;
        ctx.fillStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(tipA) * range * 0.92, Math.sin(tipA) * range * 0.92, 3 * (1 - k) + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.type === "whip") {
        // living, crackling energy whip — several forking bolts + glow halo
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const range = e.range ?? 90;
        const life = e.t / e.duration;
        const seed = (e.arc ?? 0) * 17.3;
        // soft glow halo trailing the whip stroke
        const halo = ctx.createRadialGradient(range * 0.4, 0, 0, range * 0.4, 0, range * 0.6);
        halo.addColorStop(0, rgba(e.color, (1 - life) * 0.22));
        halo.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(range * 0.4, 0, range * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // multiple forking bolts so it reads as a thrashing whip, not a stiff line
        const bolts = 3;
        for (let bi = 0; bi < bolts; bi++) {
          const lateral = (bi - (bolts - 1) / 2) * 8;
          this.drawBolt(ctx, range, lateral, e.color, "#ffffff", life, seed + bi * 6.1);
        }
        ctx.restore();
      } else if (e.type === "slam") {
        const r = e.radius * (0.3 + k);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#fde68a", (1 - k) * 0.8));
        rg.addColorStop(0.5, rgba(e.color, (1 - k) * 0.6));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.9);
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.7), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "flamecone") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.fillStyle = rgba(e.color, (1 - k) * 0.25);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, e.range ?? 150, -(e.arc ?? 0.4), e.arc ?? 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (e.type === "glue") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.6);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.8), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "skillcast") {
        // bright expanding ring + core flash when a skill is cast
        const r = e.radius * (0.4 + k * 1.1);
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.9);
        ctx.lineWidth = 4 * (1 - k) + 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#ffffff", (1 - k) * 0.6));
        rg.addColorStop(0.5, rgba(e.color, (1 - k) * 0.35));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

public drawAimPreview(ctx: CanvasRenderingContext2D) {
    if (this.engine.selectedGadget < 0) return;
    if (this.engine.gameOver || this.engine.paused) return;
    const def = this.engine.gadgets[this.engine.selectedGadget];
    if (!def) return;
    const p = this.engine.player;
    const maxD = this.engine.gadgetRange(def);
    const cd = this.engine.gadgetCd.get(def.id) ?? 0;
    const blocked = cd > 0;

    // clamp the aim point to the gadget's max range from the player + world bounds
    let dx = this.engine.mouse.x - p.x;
    let dy = this.engine.mouse.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > maxD) {
      dx = (dx / d) * maxD;
      dy = (dy / d) * maxD;
    }
    let tx = Math.max(20, Math.min(this.engine.worldW - 20, p.x + dx));
    let ty = Math.max(20, Math.min(this.engine.worldH - 20, p.y + dy));

    if (def.kind === "glue_grenade" || def.kind === "fire_grenade") {
      const sim = this.engine.simulateThrow(p.x, p.y, tx, ty);
      this.drawThrowArc(ctx, p.x, p.y, sim, def.color, blocked);
    } else {
      this.drawPlaceMarker(ctx, p.x, p.y, tx, ty, def, blocked);
    }
  }

public drawThrowArc(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    sim: { vx: number; vy: number; fuse: number; landX: number; landY: number },
    color: string,
    blocked: boolean
  ) {
    const r = 0.96; // matches updateGrenades drag
    const dt = 1 / 60;
    let x = px;
    let y = py;
    let vx = sim.vx;
    let vy = sim.vy;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.35)" : rgba(color, 0.85);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = Math.round(sim.fuse * 60);
    for (let i = 0; i < steps; i++) {
      x += vx * dt;
      y += vy * dt;
      vx *= r;
      vy *= r;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // landing marker
    ctx.fillStyle = blocked ? "rgba(255,255,255,0.35)" : rgba(color, 0.9);
    ctx.beginPath();
    ctx.arc(sim.landX, sim.landY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

public drawPlaceMarker(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tx: number,
    ty: number,
    def: GadgetDef,
    blocked: boolean
  ) {
    const coverage =
      def.kind === "turret_mg"
        ? 260
        : def.kind === "turret_cannon"
        ? 200
        : def.kind === "mine_explosive"
        ? 56
        : def.kind === "mine_poison"
        ? 70
        : def.kind === "mine_fire"
        ? 70
        : def.kind === "healing_station"
        ? 90
        : 60;
    ctx.save();
    // line from player to target
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.25)" : rgba(def.color, 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    // max-range ring around the player
    ctx.strokeStyle = rgba(def.color, 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, this.engine.gadgetRange(def), 0, Math.PI * 2);
    ctx.stroke();
    // ghost coverage + marker at the target
    ctx.globalAlpha = blocked ? 0.35 : 0.6;
    ctx.fillStyle = rgba(def.color, 0.22);
    ctx.beginPath();
    ctx.arc(tx, ty, coverage, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.45)" : rgba(def.color, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

public drawLauncherIndicator(ctx: CanvasRenderingContext2D) {
    if (this.engine.gameOver || this.engine.paused) return;
    const p = this.engine.player;
    const g = this.engine.gun;
    const radius = g.explosionRadius ?? 60;
    const tgt = this.engine.mortarTarget(g);
    const tx = tgt.x;
    const ty = tgt.y;
    const col = g.glow;
    const cx = p.x - this.engine.camX;
    const cy = p.y - this.engine.camY;
    const sx = tx - this.engine.camX;
    const sy = ty - this.engine.camY;
    ctx.save();
    // dashed line from player to (clamped) landing point
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = tgt.beyond ? rgba(col, 0.3) : rgba(col, 0.55);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    // max-range ring around the player (like deployable placement)
    ctx.strokeStyle = rgba(col, 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, tgt.maxD, 0, Math.PI * 2);
    ctx.stroke();
    // ghost blast coverage at the landing point
    ctx.globalAlpha = tgt.beyond ? 0.35 : 0.6;
    ctx.fillStyle = rgba(col, 0.22);
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // landing marker ring
    ctx.strokeStyle = rgba(col, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.stroke();
    // center dot
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

public drawCrosshair(ctx: CanvasRenderingContext2D) {
    // hide the mouse reticle on touch devices (aim is handled by aim assist)
    if (this.engine.touchMode) return;
    const { x, y } = this.engine.mouse;
    const sx = x - this.engine.camX;
    const sy = y - this.engine.camY;
    ctx.save();
    ctx.strokeStyle = rgba("#e2e8f0", 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.moveTo(sx - 14, sy);
    ctx.lineTo(sx - 5, sy);
    ctx.moveTo(sx + 5, sy);
    ctx.lineTo(sx + 14, sy);
    ctx.moveTo(sx, sy - 14);
    ctx.lineTo(sx, sy - 5);
    ctx.moveTo(sx, sy + 5);
    ctx.lineTo(sx, sy + 14);
    ctx.stroke();
    ctx.fillStyle = rgba(this.engine.gun.glow, 0.9);
    ctx.beginPath();
    ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

public drawOverlays(ctx: CanvasRenderingContext2D) {
    if (this.engine.timewarp > 0) {
      ctx.fillStyle = rgba("#a855f7", 0.1);
      ctx.fillRect(0, 0, this.engine.W, this.engine.H);
    }
    
    const p = this.engine.player;
    const hpFrac = p.hp / p.maxHp;
    if (hpFrac < 0.35 && !this.engine.gameOver) {
      const pulse = 0.25 + Math.sin(this.engine.time * 6) * 0.12;
      const rg = ctx.createRadialGradient(
        this.engine.W / 2,
        this.engine.H / 2,
        this.engine.H * 0.3,
        this.engine.W / 2,
        this.engine.H / 2,
        this.engine.H * 0.8
      );
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(1, rgba("#ef4444", pulse * (1 - hpFrac)));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, this.engine.W, this.engine.H);
    }
  }
}
