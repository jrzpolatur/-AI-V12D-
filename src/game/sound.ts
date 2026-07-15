// Lightweight procedural sound effects via the Web Audio API (no assets).
// All sounds are synthesized on the fly to keep the bundle tiny.

type Wave = OscillatorType;

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;

  /** Create / resume the audio context. Call from a user gesture. */
  ensure() {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
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
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(
    freq: number,
    dur: number,
    type: Wave,
    vol: number,
    slideTo?: number
  ) {
    if (!this.enabled || !this.ctx || !this.master) return;
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
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(dur: number, vol: number, freq: number, q = 1) {
    if (!this.enabled || !this.ctx || !this.master || !this.noise) return;
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
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  shoot(gunId: string) {
    switch (gunId) {
      case "pistol":
        this.tone(420, 0.08, "square", 0.18, 180);
        break;
      case "smg":
        this.tone(520, 0.05, "square", 0.1, 260);
        break;
      case "shotgun":
        this.noiseBurst(0.18, 0.35, 900, 0.6);
        this.tone(160, 0.12, "sawtooth", 0.18, 70);
        break;
      case "rifle":
        this.tone(680, 0.06, "sawtooth", 0.16, 300);
        break;
      case "sniper":
        this.tone(300, 0.25, "sawtooth", 0.22, 90);
        this.noiseBurst(0.12, 0.18, 1500, 0.8);
        break;
      case "rocket":
        this.tone(220, 0.3, "sawtooth", 0.2, 60);
        this.noiseBurst(0.3, 0.2, 500, 0.5);
        break;
      case "akm":
        this.tone(360, 0.07, "square", 0.16, 160);
        this.noiseBurst(0.05, 0.06, 1800, 1);
        break;
      case "fcar":
        this.tone(240, 0.12, "sawtooth", 0.22, 90);
        this.noiseBurst(0.08, 0.12, 700, 0.8);
        break;
      case "pulse":
        this.tone(900, 0.04, "sawtooth", 0.05, 680);
        break;
    }
  }

  hit() {
    this.noiseBurst(0.05, 0.12, 2200, 1.2);
  }

  swing() {
    this.noiseBurst(0.1, 0.12, 3200, 1.4);
    this.tone(640, 0.07, "sine", 0.07, 1200);
  }

  slam() {
    this.noiseBurst(0.42, 0.45, 480, 0.4);
    this.tone(70, 0.42, "sine", 0.35, 34);
  }

  explosion() {
    this.noiseBurst(0.4, 0.4, 700, 0.4);
    this.tone(90, 0.4, "sine", 0.3, 40);
  }

  hurt() {
    this.tone(200, 0.18, "sawtooth", 0.22, 80);
  }

  skill() {
    this.tone(300, 0.18, "triangle", 0.22, 720);
    this.tone(600, 0.18, "sine", 0.12, 1100);
  }

  pickup() {
    this.tone(520, 0.08, "triangle", 0.16, 780);
    this.tone(780, 0.1, "triangle", 0.12, 1040);
  }

  wave() {
    this.tone(330, 0.14, "triangle", 0.16, 440);
    setTimeout(() => this.tone(440, 0.18, "triangle", 0.16, 550), 120);
  }
}

export const sound = new SoundManager();
