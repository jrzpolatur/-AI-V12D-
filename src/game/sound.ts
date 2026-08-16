// Lightweight procedural sound effects via the Web Audio API (no assets).
// All sounds are synthesized on the fly to keep the bundle tiny.

type Wave = OscillatorType;

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private killSounds: HTMLAudioElement[] = [];
  private deathSound: HTMLAudioElement | null = null;
  private musicEl: HTMLAudioElement | null = null;
  private musicUrl: string | null = null;
  enabled = true;
  /** master volume 0..1 (scaled by BASE so the default 0.5 matches the old 0.3 gain) */
  volume = 0.5;
  private static BASE = 0.6;
  /** volume multiplier applied while an ENEMY/opponent (bot or remote foe) is
   *  the active shooter, so the player can clearly hear their own weapons.
   *  Set to 0.8 (i.e. -20%) during opponent simulation, 1 otherwise. */
  private enemyScale = 1;

  /** Create / resume the audio context. Call from a user gesture. */
  ensure() {
    try {
      if (!this.killSounds.length) {
        console.log("[Audio] Preloading WAV sound files...");
        this.killSounds = [
          new Audio("killConfirm01.wav"),
          new Audio("killconfirm02.wav"),
        ];
        this.deathSound = new Audio("DeathSound.wav");
        this.killSounds.forEach(s => s.volume = this.volume);
        if (this.deathSound) this.deathSound.volume = this.volume;
        console.log("[Audio] WAV preloaded successfully. Paths:", this.killSounds.map(x => x.src), this.deathSound.src);
      }
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * SoundManager.BASE;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.5);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stopMusic();
  }

  /** Play a looping external music track from a URL (e.g. matchmaking BGM).
   *  Calling again with the same URL is a no-op if it is already playing. */
  playMusic(url: string) {
    if (!this.enabled || !url) return;
    if (this.musicEl && this.musicUrl === url && !this.musicEl.paused) return;
    this.stopMusic();
    try {
      const a = new Audio(url);
      a.loop = true;
      a.volume = this.volume;
      a.play().catch(() => {});
      this.musicEl = a;
      this.musicUrl = url;
    } catch {
      this.musicEl = null;
      this.musicUrl = null;
    }
  }

  /** Stop the currently playing external music track (if any). */
  stopMusic() {
    if (this.musicEl) {
      try {
        this.musicEl.pause();
      } catch {
        /* ignore */
      }
      this.musicEl = null;
    }
    this.musicUrl = null;
  }

  /** Dampen all weapon/impact sounds by 20% while an enemy/opponent is acting
   *  (true) so the local player's own sounds stay prominent. Pass false to
   *  restore full volume (e.g. during world simulation / the player's turn). */
  setEnemyDampen(v: boolean) {
    this.enemyScale = v ? 0.8 : 1;
  }

  /** Set the master volume (0..1) and apply it immediately if the context exists. */
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master) {
      this.master.gain.value = this.volume * SoundManager.BASE;
    }
    this.killSounds.forEach(s => s.volume = this.volume);
    if (this.deathSound) this.deathSound.volume = this.volume;
    if (this.musicEl) this.musicEl.volume = this.volume;
  }

  playKillConfirm() {
    console.log("[Audio] playKillConfirm invoked. enabled:", this.enabled, "count:", this.killSounds.length);
    if (!this.enabled || !this.killSounds.length) return;
    const s = this.killSounds[Math.floor(Math.random() * this.killSounds.length)];
    s.volume = this.volume;
    s.currentTime = 0;
    s.play()
      .then(() => console.log("[Audio] playKillConfirm playing:", s.src))
      .catch((err) => console.error("[Audio] playKillConfirm playback failed:", err));
  }

  playDeath() {
    console.log("[Audio] playDeath invoked. enabled:", this.enabled, "hasSound:", !!this.deathSound);
    if (!this.enabled || !this.deathSound) return;
    this.deathSound.volume = this.volume;
    this.deathSound.currentTime = 0;
    this.deathSound.play()
      .then(() => console.log("[Audio] playDeath playing:", this.deathSound?.src))
      .catch((err) => console.error("[Audio] playDeath playback failed:", err));
  }

  private listenerPos: { x: number; y: number } | null = null;
  private hitStreak = 0;
  private lastHitTime = 0;

  /** Set local player listener position in world space for spatial 2D audio attenuation. */
  setListenerPos(x: number, y: number) {
    this.listenerPos = { x, y };
  }

  /** Calculate volume attenuation factor (0..1) based on distance to local player. */
  calcDistanceAttenuation(x?: number, y?: number): number {
    if (x === undefined || y === undefined || !this.listenerPos) return 1;
    const dist = Math.hypot(x - this.listenerPos.x, y - this.listenerPos.y);
    const minDist = 150;
    const maxDist = 1250;
    if (dist <= minDist) return 1;
    if (dist >= maxDist) return 0;
    const norm = 1 - (dist - minDist) / (maxDist - minDist);
    return norm * norm; // Quadratic attenuation for natural audio falloff
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(
    freq: number,
    dur: number,
    type: Wave,
    vol: number,
    slideTo?: number,
    x?: number,
    y?: number
  ) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const atten = this.calcDistanceAttenuation(x, y);
    vol *= this.enemyScale * atten;
    if (vol < 0.001) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        t + dur
      );
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.onended = () => { try { osc.disconnect(); g.disconnect(); } catch {} };
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(dur: number, vol: number, freq: number, q = 1, x?: number, y?: number) {
    if (!this.enabled || !this.ctx || !this.master || !this.noise) return;
    const atten = this.calcDistanceAttenuation(x, y);
    vol *= this.enemyScale * atten;
    if (vol < 0.001) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(60, freq * 0.4),
      t + dur
    );
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.onended = () => { try { src.disconnect(); filter.disconnect(); g.disconnect(); } catch {} };
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Electromagnetic particle hum & electric spark sound for electronic/energy weapons */
  emParticle(freq = 2400, dur = 0.08, x?: number, y?: number) {
    if (!this.enabled || !this.ctx || !this.master) return;
    this.noiseBurst(dur, 0.09, freq, 3.2, x, y);
    this.tone(freq, dur, "sawtooth", 0.07, freq * 0.35, x, y);
    this.tone(freq * 1.6, dur * 0.6, "sine", 0.05, freq * 0.8, x, y);
  }

  /** High-voltage electric arc crackle / taser discharge sound */
  electricZap(x?: number, y?: number) {
    if (!this.enabled || !this.ctx || !this.master) return;
    this.noiseBurst(0.06, 0.15, 4200, 4.5, x, y);
    this.tone(1900, 0.05, "sawtooth", 0.12, 450, x, y);
    setTimeout(() => {
      this.noiseBurst(0.04, 0.13, 4800, 5.0, x, y);
      this.tone(2600, 0.04, "square", 0.09, 650, x, y);
    }, 25);
  }

  shoot(gunId?: string, x?: number, y?: number) {
    switch (gunId) {
      // ===== 1. 手枪 / 冲锋枪 =====
      case "pistol":
        // Snappy firing pin click + 9mm mid-bass punch
        this.noiseBurst(0.03, 0.14, 1600, 1.2, x, y);
        this.tone(380, 0.07, "square", 0.18, 120, x, y);
        break;

      case "silenced_pistol":
        // Suppressed gas pop + subtle slide clack
        this.noiseBurst(0.04, 0.04, 1400, 1.5, x, y);
        this.tone(240, 0.05, "sine", 0.08, 80, x, y);
        break;

      case "r357":
        // Magnum Revolver: Heavy thud + cylinder snap + sub-bass kick
        this.noiseBurst(0.06, 0.22, 1900, 0.9, x, y);
        this.tone(180, 0.14, "sawtooth", 0.26, 45, x, y);
        this.tone(480, 0.04, "square", 0.12, 200, x, y);
        break;

      case "mac11":
        // High RPM submachine gun snap
        this.noiseBurst(0.025, 0.12, 2200, 1.4, x, y);
        this.tone(490, 0.04, "square", 0.12, 220, x, y);
        break;

      case "mp5":
        // Smooth 9mm SMG mechanical burst
        this.noiseBurst(0.035, 0.14, 1800, 1.1, x, y);
        this.tone(420, 0.06, "square", 0.15, 160, x, y);
        break;

      // ===== 2. 突击步枪 / 自动步枪 =====
      case "akm":
        // Heavy 7.62mm gas-piston punch + receiver clack
        this.noiseBurst(0.06, 0.24, 1700, 0.8, x, y);
        this.tone(260, 0.09, "sawtooth", 0.24, 55, x, y);
        this.tone(680, 0.03, "square", 0.1, 320, x, y);
        break;

      case "fcar":
        // Tactile heavy automatic rifle + heavy bolt recoil
        this.noiseBurst(0.07, 0.26, 1200, 0.8, x, y);
        this.tone(210, 0.12, "sawtooth", 0.25, 50, x, y);
        break;

      case "rifle":
        // 5.56 NATO muzzle crack + receiver pop
        this.noiseBurst(0.045, 0.18, 2000, 1.0, x, y);
        this.tone(580, 0.06, "sawtooth", 0.18, 220, x, y);
        break;

      case "lewis":
        // Heavy machine gun open-bolt chug
        this.noiseBurst(0.07, 0.22, 1400, 0.8, x, y);
        this.tone(220, 0.09, "square", 0.22, 60, x, y);
        break;

      case "gatling":
        // Rotary minigun high-RPM rapid mechanical blast
        this.noiseBurst(0.03, 0.15, 2400, 1.3, x, y);
        this.tone(480, 0.04, "square", 0.16, 180, x, y);
        break;

      // ===== 3. 霰弹枪 =====
      case "shotgun":
        // 12-Gauge pump blast: Dual-phase wide noise + sub-bass kick
        this.noiseBurst(0.16, 0.38, 850, 0.5, x, y);
        this.tone(140, 0.14, "sawtooth", 0.28, 35, x, y);
        break;

      case "sa1216":
        // Quad-barrel auto-shotgun drum blast
        this.noiseBurst(0.12, 0.32, 950, 0.6, x, y);
        this.tone(160, 0.11, "sawtooth", 0.22, 45, x, y);
        break;

      case "dragon_breath":
        // Incendiary dragon shotgun: Heavy thump + fiery roar + EM spark sizzle
        this.noiseBurst(0.18, 0.42, 700, 0.4, x, y);
        this.tone(130, 0.16, "sawtooth", 0.3, 30, x, y);
        this.emParticle(850, 0.15, x, y);
        break;

      case "m1887":
        // Lever-action heavy shotgun roar + mechanical rack
        this.noiseBurst(0.15, 0.36, 920, 0.5, x, y);
        this.tone(150, 0.13, "sawtooth", 0.26, 38, x, y);
        break;

      // ===== 4. 狙击枪 / 反器材重炮 =====
      case "sniper":
        // Supersonic bullet crack + 300 Win Mag deep body + echoing tail
        this.noiseBurst(0.14, 0.3, 1600, 0.7, x, y);
        this.tone(240, 0.22, "sawtooth", 0.28, 40, x, y);
        this.tone(850, 0.03, "sine", 0.12, 400, x, y);
        break;

      case "gold_barrett":
        // Gold .50 BMG Anti-Material Rifle: Massive muzzle brake blast + sub-bass thud
        this.noiseBurst(0.2, 0.42, 1400, 0.5, x, y);
        this.tone(160, 0.3, "sawtooth", 0.34, 25, x, y);
        this.tone(1100, 0.04, "sine", 0.15, 450, x, y);
        break;

      case "shak50":
        // 12.7mm Subsonic Heavy Rifle: Super-heavy suppressed bass thud
        this.noiseBurst(0.18, 0.32, 900, 0.6, x, y);
        this.tone(110, 0.32, "sawtooth", 0.36, 22, x, y);
        break;

      case "scout":
        // Lightweight sharp sniper whip
        this.noiseBurst(0.08, 0.2, 2200, 1.1, x, y);
        this.tone(520, 0.08, "sawtooth", 0.2, 200, x, y);
        break;

      // ===== 5. 炮击 / 重型火箭 / 榴弹 (真实炮声) =====
      case "mortar":
        // Mortar cannon launch: Pressure gas pop + deep mortar tube thud
        this.noiseBurst(0.22, 0.38, 600, 0.4, x, y);
        this.tone(130, 0.25, "sawtooth", 0.32, 25, x, y);
        break;

      case "rocket":
      case "rpg":
        // Rocket motor ignition roar + propellant shockwave
        this.noiseBurst(0.32, 0.4, 450, 0.35, x, y);
        this.tone(100, 0.35, "sawtooth", 0.35, 20, x, y);
        break;

      case "mgl32":
        // 40mm Revolving Grenade Launcher thunk
        this.noiseBurst(0.14, 0.28, 750, 0.5, x, y);
        this.tone(160, 0.18, "sawtooth", 0.28, 30, x, y);
        break;

      case "turret_cannon":
        // Auto-cannon heavy 30mm blast
        this.noiseBurst(0.18, 0.36, 700, 0.4, x, y);
        this.tone(120, 0.22, "sawtooth", 0.3, 28, x, y);
        break;

      // ===== 6. 电子性 / 能量 / 电磁粒子特效声音 =====
      case "plasma_rifle":
        // Plasma Rifle: High-tech energy capacitor release + EM particle sizzle
        this.emParticle(2600, 0.09, x, y);
        this.tone(780, 0.07, "sawtooth", 0.18, 280, x, y);
        this.noiseBurst(0.05, 0.08, 1800, 0.9, x, y);
        break;

      case "pulse":
        // Electromagnetic Pulse: Sci-fi EM particle chirp + pulse discharge
        this.emParticle(3200, 0.06, x, y);
        this.tone(980, 0.04, "sawtooth", 0.12, 620, x, y);
        break;

      case "stun_gun":
        // Taser / Stun Gun: Electric arc crackle + high voltage buzz
        this.electricZap(x, y);
        break;

      case "flamethrower":
        // Liquid fire fuel ignition + burning hiss
        this.noiseBurst(0.15, 0.22, 650, 0.4, x, y);
        this.tone(160, 0.14, "sawtooth", 0.15, 110, x, y);
        break;

      case "recurve_bow":
        // Recurve bow string snap + arrow wind slice
        this.tone(320, 0.08, "triangle", 0.22, 580, x, y);
        this.noiseBurst(0.04, 0.12, 2200, 1.2, x, y);
        break;

      case "throwing_knife":
        // Throwing knife aerodynamic wind slice
        this.noiseBurst(0.08, 0.15, 3400, 1.5, x, y);
        this.tone(960, 0.05, "sine", 0.08, 1450, x, y);
        break;

      case "flame_boomerang":
        // Flame boomerang spinning arc whoosh
        this.noiseBurst(0.2, 0.18, 750, 0.5, x, y);
        this.tone(280, 0.14, "sawtooth", 0.14, 520, x, y);
        break;

      default:
        // Generic firearm fallback
        this.noiseBurst(0.05, 0.15, 1600, 0.9, x, y);
        this.tone(480, 0.07, "square", 0.16, 180, x, y);
        break;
    }
  }

  hit(x?: number, y?: number) {
    this.noiseBurst(0.05, 0.12, 2200, 1.2, x, y);
  }

  playHit(x?: number, y?: number) {
    this.hit(x, y);
  }

  /** Melee swing whooshes — enhanced aerodynamic slice sounds for all blade & impact weapons */
  swing(gunId?: string, x?: number, y?: number) {
    switch (gunId) {
      case "lightsaber":
        // Plasma saber swing: Sci-fi hum + EM particle sizzle whoosh
        this.emParticle(2800, 0.08, x, y);
        this.noiseBurst(0.1, 0.16, 3400, 1.4, x, y);
        this.tone(880, 0.09, "sine", 0.1, 1400, x, y);
        break;

      case "spear":
        // Long spear thrust: Sharp air-slicing thrust whoosh + wood shaft thud
        this.noiseBurst(0.08, 0.16, 2800, 1.3, x, y);
        this.tone(680, 0.06, "sine", 0.08, 1100, x, y);
        break;

      case "dual_blades":
        // Scissor-like dual blade rapid double slice
        this.noiseBurst(0.05, 0.14, 3200, 1.5, x, y);
        setTimeout(() => this.noiseBurst(0.05, 0.14, 3600, 1.5, x, y), 50);
        break;

      case "thrust_sword":
        // Rapier / Thrust sword: High-frequency metallic gleam + rapid air slice
        this.noiseBurst(0.09, 0.15, 3400, 1.6, x, y);
        this.tone(740, 0.06, "sine", 0.08, 1350, x, y);
        break;

      case "lightning_whip":
        // Lightning Whip: Electric spark arc crackle + whip lash snap
        this.electricZap(x, y);
        this.noiseBurst(0.11, 0.18, 2400, 1.1, x, y);
        this.tone(1300, 0.06, "sawtooth", 0.1, 380, x, y);
        break;

      default:
        // Heavy blade / Katana / Blunt melee whoosh
        this.noiseBurst(0.1, 0.15, 3000, 1.3, x, y);
        this.tone(580, 0.07, "sine", 0.09, 1150, x, y);
        break;
    }
  }

  /** Crisp hit indicator sound. Consecutive hits within 0.85s increase pitch progressively! */
  hitConfirm(isCrit = false) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = performance.now() / 1000;
    if (now - this.lastHitTime < 0.85) {
      this.hitStreak = Math.min(18, this.hitStreak + 1);
    } else {
      this.hitStreak = 1;
    }
    this.lastHitTime = now;

    // Pitch multiplier starts at 1.0 and increases up to ~1.9 for high streaks
    const pitchMult = 1 + (this.hitStreak - 1) * 0.05 + (isCrit ? 0.2 : 0);
    const f1 = 1320 * pitchMult;
    const f2 = 1980 * pitchMult;
    const f3 = 2640 * pitchMult;

    this.tone(f1, 0.05, "triangle", 0.2, f2);
    this.tone(f2, 0.04, "sine", 0.12, f3);
  }

  slam(x?: number, y?: number) {
    this.noiseBurst(0.42, 0.45, 480, 0.4, x, y);
    this.tone(70, 0.42, "sine", 0.35, 34, x, y);
  }

  explosion(x?: number, y?: number) {
    this.noiseBurst(0.4, 0.4, 700, 0.4, x, y);
    this.tone(90, 0.4, "sine", 0.3, 40, x, y);
  }

  hurt(x?: number, y?: number) {
    this.tone(200, 0.18, "sawtooth", 0.22, 80, x, y);
  }

  /** Short error / denied buzz (e.g. gadget overheated). */
  error() {
    this.tone(140, 0.12, "square", 0.2, 90);
    this.noiseBurst(0.08, 0.1, 600, 0.6);
  }

  skill(x?: number, y?: number) {
    this.tone(300, 0.18, "triangle", 0.22, 720, x, y);
    this.tone(600, 0.18, "sine", 0.12, 1100, x, y);
  }

  pickup() {
    this.tone(520, 0.08, "triangle", 0.16, 780);
    this.tone(780, 0.1, "triangle", 0.12, 1040);
  }

  wave() {
    this.tone(330, 0.14, "triangle", 0.16, 440);
    setTimeout(() => this.tone(440, 0.18, "triangle", 0.16, 550), 120);
  }

  /** Reload start: magazine eject + insert clack. */
  reload(x?: number, y?: number) {
    this.noiseBurst(0.05, 0.22, 1400, 1.0, x, y);
    this.tone(150, 0.05, "square", 0.1, 90, x, y);
    setTimeout(() => {
      this.noiseBurst(0.05, 0.22, 1800, 1.0, x, y);
      this.tone(220, 0.05, "square", 0.1, 130, x, y);
    }, 130);
  }

  /** Reload done: sharp chambering click when the magazine is seated. */
  reloadDone(x?: number, y?: number) {
    this.noiseBurst(0.04, 0.18, 2200, 1.4, x, y);
    this.tone(300, 0.05, "sine", 0.1, 380, x, y);
  }
}

export const sound = new SoundManager();
