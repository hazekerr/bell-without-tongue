/* Пиксель-арт движок: спрайты рисуются вручную текстом (по букве на пиксель),
   затем получают контур, подсветку закатом и анимацию (покачивание, мигание, мерцание). */
import { Rng } from '../engine/rng.ts';

export const PAL: Record<string, string> = {
  k: '#07080c', f: '#050608',
  d: '#12141c', c: '#1d2230', C: '#2c3447', h: '#445168',
  g: '#3f6a60', G: '#6f9a8a', q: '#a9cdb8',
  b: '#cfc7b2', B: '#9a9484', n: '#5e5a52',
  w: '#2e2018', W: '#51371f', o: '#8a5a2b', O: '#c0833a',
  a: '#e8a94a', A: '#f6cf7a', y: '#fff0c0',
  r: '#6a1a20', R: '#b3342e', e: '#ff6a4f',
  v: '#3b2c58', V: '#6f55a0',
  u: '#27486b', U: '#4f84b0', i: '#9cc3e6',
  m: '#4d4c50', M: '#8e8d92',
  s: '#7a8a96', S: '#b9c6cf',
};
/** Глаза: мигают, цвет по букве. */
const EYES: Record<string, string> = { E: '#ff5a46', F: '#fff0c0', H: '#bfe6ff', Y: '#e8a94a' };

export interface Layer {
  /** Строки, выровненные по левому краю, начиная с (x, y). */
  rows?: string[];
  x?: number;
  y?: number;
  /** Половина симметричной фигуры: строки выровнены по центру справа, центр — последний символ. */
  half?: string[];
}

export interface SpriteDef {
  id: string;
  layers: Layer[];
  /** Сторона света (откуда ярче): к солнцу посередине сцены. */
  rim?: 'left' | 'right' | 'top';
  /** Начиная с этой строки (от верха) край подола колышется. */
  hem?: number;
  /** Рваный низ: сколько нижних строк обрывать. */
  tatter?: number;
  /** Вес покачивания (в пикселях). */
  bob?: number;
  seed?: number;
}

export interface Sprite {
  id: string;
  /** Центр тела по горизонтали (для привязки к земле). */
  ax: number;
  w: number;
  h: number;
  /** Кадры анимации: массив готовых canvas. */
  frames: HTMLCanvasElement[];
  blink: HTMLCanvasElement;
  /** Живая отрисовка каждый кадр (для плавной анимации): время и сдвиг фазы → холст. */
  live?: (t: number, phase: number) => HTMLCanvasElement;
  /** Сколько пикселей холста приходится на один дизайн-пиксель (для живых спрайтов 2). */
  k?: number;
}

const pad = (s: string, n: number, left: boolean) => (left ? s.padStart(n, '.') : s.padEnd(n, '.'));

/** Собирает сетку символов из слоёв. */
export function compose(def: SpriteDef): string[][] {
  const grid: Map<string, string> = new Map();
  let maxX = 0, maxY = 0, minX = 0, minY = 0;
  const put = (x: number, y: number, ch: string) => {
    if (ch === '.' || ch === ' ') return;
    grid.set(`${x},${y}`, ch);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  };
  const halfW = Math.max(...def.layers.flatMap((l) => (l.half ?? []).map((r) => r.length)), 0);
  const cx = halfW - 1;
  for (const l of def.layers) {
    if (l.half) {
      l.half.forEach((row, i) => {
        const y = (l.y ?? 0) + i;
        const left = pad(row, halfW, true);
        for (let j = 0; j < halfW; j++) {
          put(j, y, left[j]);
          if (j < halfW - 1) put(2 * cx - j, y, left[j]);
        }
      });
    }
    if (l.rows) {
      l.rows.forEach((row, i) => {
        for (let j = 0; j < row.length; j++) put((l.x ?? 0) + j, (l.y ?? 0) + i, row[j]);
      });
    }
  }
  (def as unknown as { ax?: number }).ax = halfW > 0 ? cx - minX : undefined;
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const out: string[][] = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [k, v] of grid) {
    const [x, y] = k.split(',').map(Number);
    out[y - minY][x - minX] = v;
  }
  // ровный зубчатый подол: правильный узор, без случайности
  if (def.tatter) {
    for (let t = 0; t < 2; t++) {
      const y = h - 1 - t;
      for (let x = 0; x < w; x++) if (out[y][x] !== '.' && (x + t * 3) % 6 < 2) out[y][x] = '.';
    }
  }
  return out;
}

/** Scale2x (EPX): удваивает разрешение, сглаживая лесенки диагоналей, не размывая пиксели. */
export function scale2x(g: string[][]): string[][] {
  const h = g.length, w = g[0].length;
  const out: string[][] = Array.from({ length: h * 2 }, () => Array(w * 2).fill('.'));
  const at = (x: number, y: number, d: string) => (x >= 0 && y >= 0 && x < w && y < h ? g[y][x] : d);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = g[y][x];
      const A = at(x, y - 1, P), B = at(x + 1, y, P), C = at(x - 1, y, P), D = at(x, y + 1, P);
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      out[y * 2][x * 2] = p1; out[y * 2][x * 2 + 1] = p2; out[y * 2 + 1][x * 2] = p3; out[y * 2 + 1][x * 2 + 1] = p4;
    }
  return out;
}

/** Фактура ткани и кожи: редкие светлые и тёмные точки, чтобы заливка не выглядела плоской. */
function texture(g: string[][]) {
  const lighter: Record<string, string> = { d: 'c', c: 'C', C: 'h', g: 'G', W: 'o', w: 'W', o: 'O', v: 'V', u: 'U', b: 'B' };
  const darker: Record<string, string> = { C: 'c', c: 'd', G: 'g', O: 'o', o: 'W', h: 'C', V: 'v', U: 'u' };
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[0].length; x++) {
      const ch = g[y][x];
      const n = (x * 7 + y * 13 + ((x ^ y) * 3)) % 11;
      if (n === 0 && lighter[ch]) g[y][x] = lighter[ch];
      else if (n === 5 && darker[ch] && (y + x) % 2 === 0) g[y][x] = darker[ch];
    }
}

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function renderGrid(g: string[][], def: SpriteDef, frame: number, blinking: boolean): HTMLCanvasElement {
  const h = g.length, w = g[0].length;
  const pw = w + 2, ph = h + 4;
  const c = document.createElement('canvas');
  c.width = pw;
  c.height = ph;
  const ctx = c.getContext('2d')!;
  const im = ctx.createImageData(pw, ph);
  const set = (x: number, y: number, col: number[]) => {
    if (x < 0 || y < 0 || x >= pw || y >= ph) return;
    const i = (y * pw + x) * 4;
    im.data[i] = col[0]; im.data[i + 1] = col[1]; im.data[i + 2] = col[2]; im.data[i + 3] = 255;
  };
  // покачивание подола
  const hem = def.hem !== undefined ? def.hem * 2 : Math.floor(h * 0.75);
  const rows: string[][] = g.map((row, y) => {
    if (y < hem) return row;
    const amp = (y - hem) / Math.max(1, h - hem);
    const sh = Math.round(Math.sin(frame * 1.57 + y * 0.22) * 2.6 * amp);
    if (!sh) return row;
    const nr = Array(w).fill('.');
    for (let x = 0; x < w; x++) {
      const nx = x + sh;
      if (nx >= 0 && nx < w) nr[nx] = row[x];
    }
    return nr;
  });
  const bob = frame % 2 === 1 ? 1 : 0;
  const oy = 2 + bob * (def.bob ?? 1) * 2;
  const at = (x: number, y: number) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] : '.');
  // контур
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      if (at(x, y) !== '.') continue;
      if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') set(x + 1, y + oy, hex(PAL.k));
    }
  const rim = def.rim ?? 'right';
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let ch = rows[y][x];
      if (ch === '.') continue;
      let col: number[];
      if (EYES[ch]) col = hex(blinking ? PAL.f : EYES[ch]);
      else {
        // мерцание огня
        if (frame % 2 === 1 && (ch === 'a' || ch === 'A')) ch = ch === 'a' ? 'A' : 'y';
        // подсветка кромки закатом: тёмные ткани у света превращаются в тёплые
        const lit = rim === 'right' ? at(x + 1, y) === '.' : rim === 'left' ? at(x - 1, y) === '.' : at(x, y - 1) === '.';
        const warm: Record<string, string> = { d: 'o', c: 'O', C: 'a', h: 'A', g: 'G', G: 'q', W: 'O', w: 'o', n: 'B', m: 'M', v: 'V', u: 'U' };
        col = hex(PAL[lit && warm[ch] ? (rim === 'top' ? warm[ch] : warm[ch]) : ch] ?? '#ff00ff');

      }
      set(x + 1, y + oy, col);
    }
  ctx.putImageData(im, 0, 0);
  return c;
}

export function makeSprite(def: SpriteDef): Sprite {
  const g = scale2x(compose(def));
  const frames = [0, 1, 2, 3].map((f) => renderGrid(g, def, f, false));
  const blink = renderGrid(g, def, 0, true);
  const bodyX = (def as unknown as { ax?: number }).ax;
  return { id: def.id, ax: bodyX !== undefined ? (bodyX + 0.5) * 2 + 1 : frames[0].width / 2, w: frames[0].width, h: frames[0].height, frames, blink };
}

/** Рисует спрайт по нижнему центру. t — время в секундах. Живые спрайты рисуются каждый кадр и слегка дышат и покачиваются. */
export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, cx: number, by: number, scale = 1, t = 0, flip = false, phase = 0) {
  if (s.live) {
    const img = s.live(t, phase);
    const k = s.k ?? 2;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(cx, by);
    ctx.rotate(Math.sin(t * 1.3 + phase * 2.1) * 0.012);
    ctx.scale(flip ? -1 : 1, 1 + Math.sin(t * 2.1 + phase * 1.7) * 0.014);
    const w = (img.width * scale) / k, h = (img.height * scale) / k;
    ctx.drawImage(img, -s.ax * scale, -(h - scale * 1.5), w, h);
    ctx.restore();
    return;
  }
  const f = Math.floor((t * 3 + phase) % 4);
  const blinking = ((t + phase * 0.37) % 4.2) > 4.05;
  const img = blinking ? s.blink : s.frames[f];
  ctx.imageSmoothingEnabled = false;
  const w = s.w * scale, h = s.h * scale;
  ctx.save();
  ctx.translate(Math.round(cx - s.ax * scale), Math.round(by - h));
  if (flip) { ctx.translate(s.ax * scale * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

/* ───────── генератор тела плаща по профилю ───────── */
export function cloak(o: { y0: number; y1: number; hw0: number; hw1: number; curve?: number; folds?: number; seed?: number; pal?: string }): string[] {
  const pal = o.pal ?? 'dcCh';
  const rows: string[] = [];
  const n = o.y1 - o.y0 + 1;
  for (let k = 0; k < n; k++) {
    const t = k / Math.max(1, n - 1);
    const hw = Math.round(o.hw0 + (o.hw1 - o.hw0) * Math.pow(t, o.curve ?? 1));
    let s = '';
    for (let j = 0; j < hw; j++) {
      const fromCenter = hw - 1 - j;
      let ch: string;
      if (j === 0) ch = pal[0];
      else if (j === 1) ch = pal[1];
      else if (fromCenter === 0) ch = pal[0];
      else {
        const band = fromCenter % 6;
        ch = band === 3 ? pal[0] : band === 4 || band === 5 ? pal[2] : band === 1 ? pal[3 % pal.length] : pal[1];
      }
      s += ch;
    }
    rows.push(s);
  }
  return rows;
}
