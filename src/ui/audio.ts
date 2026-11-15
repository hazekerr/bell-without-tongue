/* Синтезатор: оригинальные треки и эффекты на Web Audio. Никаких сэмплов, всё считается на лету. */
import { Rng } from '../engine/rng.ts';

export type TrackId = 'none' | 'title' | 'hub' | 'map' | 'combat' | 'boss' | 'vision' | 'victory' | 'death';
export type SfxId =
  | 'tap' | 'card_up' | 'strike' | 'ward' | 'rite' | 'hit' | 'hurt' | 'block' | 'heal' | 'chord' | 'draw' | 'turn' | 'bell'
  | 'reward' | 'buy' | 'deny' | 'toll' | 'page' | 'death' | 'bury' | 'exhume' | 'step' | 'win' | 'kill';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const VOWELS: Record<string, [number, number, number]> = {
  a: [800, 1150, 2900], o: [450, 800, 2830], u: [325, 700, 2700], e: [400, 1600, 2700], i: [270, 2140, 2950],
};

interface Chord {
  root: number;
  third: number;
  fifth: number;
  ext?: number;
}
const minor = (r: number, ext?: number): Chord => ({ root: r, third: r + 3, fifth: r + 7, ext });
const major = (r: number, ext?: number): Chord => ({ root: r, third: r + 4, fifth: r + 7, ext });

const PROG: Record<string, Chord[]> = {
  hub: [minor(50, 62), major(46, 58), major(48, 60), minor(45, 57)], // Dm Bb C Am
  map: [minor(45), minor(43), minor(41), minor(40)],
  combat: [minor(38), minor(38), major(34), minor(36)],
  boss: [minor(38, 49), minor(37), minor(38, 50), { root: 35, third: 38, fifth: 41, ext: 44 }],
  title: [minor(50, 62), major(46, 58), minor(43, 55), minor(45, 57)],
  vision: [minor(40), minor(38)],
  victory: [major(50, 62), major(55, 67), major(47, 59), major(50, 62)],
  death: [minor(38)],
};

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  reverb!: ConvolverNode;
  wet!: GainNode;
  musicVol = 0.7;
  sfxVol = 0.8;
  track: TrackId = 'none';
  private timer: number | null = null;
  private beat = 0;
  private nextTime = 0;
  private rng = new Rng(7);
  intensity = 0;
  private trackGain: GainNode | null = null;
  private wantTrack: TrackId = 'none';
  enabled = true;

  /** Нужен жест пользователя. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(c.destination);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.makeImpulse(3.6);
    this.wet = c.createGain();
    this.wet.gain.value = 0.55;
    this.reverb.connect(this.wet).connect(this.master);
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(this.reverb);
    if (this.wantTrack !== 'none') this.play(this.wantTrack);
  }

  setVolumes(music: number, sfx: number) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (this.ctx) {
      this.musicBus.gain.setTargetAtTime(music, this.ctx.currentTime, 0.1);
      this.sfxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.1);
    }
  }

  private makeImpulse(sec: number) {
    const c = this.ctx!;
    const len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    return buf;
  }

  /* ───── голоса ───── */
  choir(freq: number, t: number, dur: number, vowel: keyof typeof VOWELS = 'a', gain = 0.06, bus: GainNode = this.musicBus, attack = 0.7) {
    const c = this.ctx!;
    const out = c.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(gain, t + attack);
    out.gain.setValueAtTime(gain, t + Math.max(attack, dur - 1.0));
    out.gain.linearRampToValueAtTime(0, t + dur);
    const f = VOWELS[vowel];
    const filters = f.map((fr, i) => {
      const b = c.createBiquadFilter();
      b.type = 'bandpass';
      b.frequency.value = fr;
      b.Q.value = 8 + i * 4;
      const g = c.createGain();
      g.gain.value = [1, 0.55, 0.22][i];
      b.connect(g).connect(out);
      return b;
    });
    for (const det of [-9, 0, 8]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det + (Math.random() - 0.5) * 4;
      const vib = c.createOscillator();
      vib.frequency.value = 4.6 + Math.random();
      const vg = c.createGain();
      vg.gain.value = freq * 0.004;
      vib.connect(vg).connect(o.frequency);
      vib.start(t);
      vib.stop(t + dur + 0.1);
      filters.forEach((b) => o.connect(b));
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    out.connect(bus);
  }

  bell(freq: number, t: number, gain = 0.1, bus: GainNode = this.musicBus, decay = 5) {
    const c = this.ctx!;
    const partials = [1, 2.0, 2.76, 5.4, 8.93];
    const amp = [1, 0.6, 0.5, 0.25, 0.12];
    const out = c.createGain();
    out.connect(bus);
    partials.forEach((p, i) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * p;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain * amp[i], t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + i * 0.7));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay + 0.1);
    });
  }

  drone(freq: number, t: number, dur: number, gain = 0.07) {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, t);
    lp.frequency.linearRampToValueAtTime(520 + this.intensity * 500, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(200, t + dur);
    for (const [type, mul] of [['sawtooth', 1], ['sine', 0.5], ['triangle', 2.003]] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq * mul;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    lp.connect(g).connect(this.musicBus);
  }

  taiko(t: number, gain = 0.28, f0 = 95, bus: GainNode = this.musicBus) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.42, t + 0.22);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.55);
    this.noise(t, 0.08, gain * 0.5, 900, bus);
  }

  noise(t: number, dur: number, gain: number, cutoff = 2000, bus: GainNode = this.sfxBus, type: BiquadFilterType = 'lowpass') {
    const c = this.ctx!;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = gain;
    s.connect(f).connect(g).connect(bus);
    s.start(t);
  }

  pluck(freq: number, t: number, gain = 0.07, bus: GainNode = this.musicBus) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.6);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 1.7);
  }

  /* ───── музыка ───── */
  play(id: TrackId) {
    this.wantTrack = id;
    if (!this.ctx || !this.enabled) return;
    if (this.track === id) return;
    this.stopTrack();
    this.track = id;
    if (id === 'none') return;
    const c = this.ctx;
    this.beat = 0;
    this.nextTime = c.currentTime + 0.15;
    this.rng = new Rng(id.length * 131 + 17);
    this.timer = window.setInterval(() => this.schedule(), 110);
    this.schedule();
  }

  private stopTrack() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = 'none';
  }

  private bpm(): number {
    switch (this.track) {
      case 'hub': return 52;
      case 'title': return 48;
      case 'map': return 58;
      case 'combat': return 82 + this.intensity * 14;
      case 'boss': return 92 + this.intensity * 12;
      case 'vision': return 40;
      case 'victory': return 60;
      case 'death': return 40;
      default: return 60;
    }
  }

  private schedule() {
    const c = this.ctx;
    if (!c || this.track === 'none') return;
    while (this.nextTime < c.currentTime + 0.45) {
      this.tick(this.beat, this.nextTime);
      this.nextTime += 60 / this.bpm();
      this.beat++;
    }
  }

  private tick(b: number, t: number) {
    const id = this.track;
    const prog = PROG[id] ?? PROG.hub;
    const bar = Math.floor(b / 4);
    const ch = prog[bar % prog.length];
    const beatSec = 60 / this.bpm();
    const barSec = beatSec * 4;
    const first = b % 4 === 0;
    const r = this.rng;

    if (id === 'hub' || id === 'title') {
      if (first) {
        this.drone(mtof(ch.root - 12), t, barSec * 1.15, 0.06);
        const v: (keyof typeof VOWELS)[] = ['a', 'o', 'u'];
        this.choir(mtof(ch.root), t, barSec * 1.1, v[bar % 3], 0.045);
        this.choir(mtof(ch.third), t + 0.1, barSec * 1.1, 'o', 0.04);
        this.choir(mtof(ch.fifth + 12), t + 0.2, barSec * 1.1, 'u', 0.035);
        if (bar % 2 === 0) this.bell(mtof(ch.root + 24), t + beatSec * 0.5, 0.045, this.musicBus, 6);
      }
      if (b % 2 === 1 && r.chance(0.5)) this.pluck(mtof(ch.fifth + 12 + [0, 2, 3, 7][r.int(0, 3)]), t, 0.03);
      if (id === 'title' && bar % 4 === 3 && b % 4 === 2) this.bell(mtof(50 + 12), t, 0.09, this.musicBus, 8);
    } else if (id === 'map') {
      if (first) {
        this.drone(mtof(ch.root - 12), t, barSec * 1.2, 0.07);
        this.choir(mtof(ch.root + 12), t, barSec * 1.2, 'u', 0.03);
      }
      if (b % 2 === 0 && r.chance(0.55)) this.pluck(mtof(ch.root + 12 + [0, 3, 7, 10, 12][r.int(0, 4)]), t, 0.035);
      if (b % 8 === 6) this.bell(mtof(ch.root + 24), t, 0.05, this.musicBus, 6);
    } else if (id === 'combat' || id === 'boss') {
      const boss = id === 'boss';
      if (first) {
        this.drone(mtof(ch.root - 12), t, barSec * 1.15, boss ? 0.09 : 0.07);
        if (boss || this.intensity > 0.3) this.choir(mtof(ch.root + 12), t, barSec, 'o', boss ? 0.05 : 0.035, this.musicBus, 0.3);
      }
      const pulse = boss ? [1, 0, 1, 0] : [1, 0, 0, 0];
      if (pulse[b % 4]) this.taiko(t, b % 8 === 0 ? 0.34 : 0.22, b % 8 === 0 ? 80 : 95);
      if (boss && b % 4 === 2) this.taiko(t, 0.18, 120);
      if (b % 2 === 1) this.noise(t, 0.05, 0.02 + this.intensity * 0.02, 5000, this.musicBus, 'highpass');
      if (b % 4 === 2 && r.chance(0.7)) this.choir(mtof(ch.fifth + 12 + (r.chance(0.5) ? 0 : 3)), t, beatSec * 3, 'a', 0.03, this.musicBus, 0.15);
      if (boss && first && bar % 2 === 1) this.bell(mtof(ch.root + 12), t, 0.1, this.musicBus, 4);
    } else if (id === 'vision') {
      if (first) {
        this.drone(mtof(ch.root - 12), t, barSec * 1.2, 0.06);
        this.choir(mtof(ch.root + 12), t, barSec * 1.2, 'u', 0.04, this.musicBus, 1.5);
      }
      if (b % 8 === 3) this.bell(mtof(ch.root + 31), t, 0.05, this.musicBus, 8);
    } else if (id === 'victory') {
      if (first) {
        this.drone(mtof(ch.root - 12), t, barSec * 1.1, 0.06);
        [ch.root, ch.third, ch.fifth, ch.root + 12].forEach((n, i) => this.choir(mtof(n + 12), t + i * 0.08, barSec * 1.1, (['a', 'o', 'a', 'e'] as const)[i], 0.05));
        this.bell(mtof(ch.root + 24), t, 0.08, this.musicBus, 6);
      }
    } else if (id === 'death') {
      if (b === 0) {
        this.bell(mtof(38), t, 0.2, this.musicBus, 9);
        this.choir(mtof(50), t, 7, 'o', 0.05, this.musicBus, 2);
        this.choir(mtof(53), t + 0.2, 7, 'u', 0.04, this.musicBus, 2);
      }
      if (b === 4) this.bell(mtof(26), t, 0.16, this.musicBus, 10);
    }
  }

  /* ───── эффекты ───── */
  sfx(id: SfxId) {
    const c = this.ctx;
    if (!c || !this.enabled) return;
    const t = c.currentTime + 0.005;
    const bus = this.sfxBus;
    switch (id) {
      case 'tap':
        this.pluck(880, t, 0.05, bus);
        break;
      case 'card_up':
        this.pluck(660, t, 0.04, bus);
        break;
      case 'draw':
        this.noise(t, 0.08, 0.05, 2400, bus, 'bandpass');
        break;
      case 'strike':
        this.noise(t, 0.12, 0.28, 1400, bus);
        this.taiko(t, 0.22, 140, bus);
        break;
      case 'ward':
        this.bell(mtof(74), t, 0.06, bus, 1.6);
        this.noise(t, 0.1, 0.08, 800, bus);
        break;
      case 'rite':
        this.choir(mtof(62), t, 1.3, 'o', 0.05, bus, 0.15);
        this.choir(mtof(69), t, 1.3, 'a', 0.04, bus, 0.2);
        break;
      case 'hit':
        this.noise(t, 0.14, 0.32, 1800, bus);
        this.taiko(t, 0.3, 110, bus);
        break;
      case 'kill':
        this.taiko(t, 0.35, 70, bus);
        this.bell(mtof(45), t, 0.12, bus, 3);
        break;
      case 'hurt':
        this.noise(t, 0.2, 0.3, 700, bus);
        this.taiko(t, 0.35, 70, bus);
        break;
      case 'block':
        this.bell(mtof(81), t, 0.08, bus, 0.9);
        this.noise(t, 0.06, 0.18, 3600, bus, 'highpass');
        break;
      case 'heal':
        [69, 73, 76].forEach((n, i) => this.pluck(mtof(n + 12), t + i * 0.07, 0.05, bus));
        break;
      case 'chord':
        // Три Голоса складываются в консонанс: бас, альт, дискант
        this.choir(mtof(38), t, 2.4, 'o', 0.1, bus, 0.04);
        this.choir(mtof(53), t + 0.08, 2.4, 'a', 0.08, bus, 0.04);
        this.choir(mtof(69), t + 0.16, 2.4, 'e', 0.07, bus, 0.04);
        this.bell(mtof(81), t + 0.2, 0.07, bus, 3);
        break;
      case 'toll':
        this.bell(mtof(45), t, 0.2, bus, 7);
        break;
      case 'bell':
        this.bell(mtof(50), t, 0.18, bus, 8);
        break;
      case 'turn':
        this.taiko(t, 0.1, 100, bus);
        break;
      case 'reward':
        [62, 66, 69, 74].forEach((n, i) => this.pluck(mtof(n + 12), t + i * 0.09, 0.05, bus));
        this.choir(mtof(62), t, 2.2, 'a', 0.04, bus, 0.3);
        break;
      case 'buy':
        this.pluck(mtof(86), t, 0.06, bus);
        this.pluck(mtof(91), t + 0.06, 0.05, bus);
        break;
      case 'deny':
        this.pluck(mtof(46), t, 0.08, bus);
        this.noise(t, 0.06, 0.06, 300, bus);
        break;
      case 'page':
        this.bell(mtof(86), t, 0.06, bus, 3);
        this.choir(mtof(57), t, 2.5, 'u', 0.04, bus, 0.4);
        break;
      case 'death':
        this.bell(mtof(38), t, 0.28, bus, 9);
        this.taiko(t, 0.4, 60, bus);
        break;
      case 'bury':
        this.noise(t, 0.3, 0.14, 500, bus);
        break;
      case 'exhume':
        this.noise(t, 0.3, 0.1, 900, bus, 'bandpass');
        this.pluck(mtof(55), t + 0.1, 0.05, bus);
        break;
      case 'step':
        this.noise(t, 0.1, 0.06, 600, bus);
        break;
      case 'win':
        [62, 66, 69, 74, 78].forEach((n, i) => this.pluck(mtof(n + 12), t + i * 0.1, 0.05, bus));
        this.choir(mtof(50), t, 3.5, 'a', 0.07, bus, 0.3);
        this.bell(mtof(62), t + 0.1, 0.1, bus, 6);
        break;
    }
  }
}

export const audio = new AudioEngine();
