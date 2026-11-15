/* Иллюстрации карт в пикселях 64×40: небо с дизерингом, свет, детали ручной работы и атмосфера. */
import { PAL } from './pixel.ts';
import { Rng } from '../engine/rng.ts';

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const PROPS: Record<string, string[]> = {
  shovel: ['WWWWWWW', '.wWWWw.', '...W...', '...W...', '...W...', '...W...', '...W...', '...W...', '...W...', '...W...', '...W...', '..MMM..', '.MMsMM.', '.MsMMM.', '.MMMMm.', '..MMm..', '...m...'],
  mound: ['..........dddddd..........', '........ddCccccCdd........', '......ddCcccccccccdd......', '....ddcccCcccccccccCdd....', '..ddccccccccccCcccccccdd..', '.dcccccCccccccccccccCccccd', 'dddddddddddddddddddddddddd'],
  hand: ['b.b.b.b', 'bBbBbBb', 'bbbbbbb', '.bbbbb.', '.BbbbB.', '..bbb..', '..Bbb..', '..bbB..'],
  lantern: ['...W...', '..OOO..', '.OaAaO.', '.OAyAO.', '.OaAaO.', '.OaaaO.', '..OOO..'],
  candle: ['....y....', '...yAy...', '...AaA...', '...AaA...', '....a....', '....k....', '...bbb...', '..bBbbB..', '..bBbbB..', '..bbbbB..', '.bBbbbbB.', '.bbBbbbb.', '.bbbbBbB.', '.bBbbbbb.', 'bbbBbbbbB', 'bBbbbBbbb', 'bbbbbbbbB', 'bbBbbbbbb'],
  cross: ['......nnn......', '......nBn......', '......nBn......', '......nBn......', '..nnnnnBnnnnn..', '..nBBBBBBBBBn..', '..nnnnnBnnnnn..', '......nBn......', '......nBn......', '.....nnBnn.....', '.....nBBBn.....', '.....nBBBn.....', '.....nBBBn.....', '.....nBBBn.....', '....nnBBBnn....', '....nBBBBBn....', '...nnnnnnnnn...'],
  crow: ['...dd....', '..dddd...', 'ddddddd..', '.ddddddd.', '..dddddd.', '...dd.dd.', '...d..d..'],
  crowfly: ['d.....d', 'dd...dd', '.ddddd.', '..ddd..'],
  bell: ['....OO....', '...oOOo...', '..oOAAOo..', '.oOAAAAOo.', '.oOAAyAOo.', 'oOAAAAAAOo', 'oOAAAAAAOo', 'oOAAAAAAOo', 'ooOOOOOOoo', '.ffffffff.', '....ff....'],
  tomb: ['..dddddd..', '.dCccccCd.', 'dCcccccccd', 'dccBBBBccd', 'dcccBBcccd', 'dccBBBBccd', 'dcccBBcccd', 'dcccBBcccd', 'dccccccccd', 'dddddddddd'],
  chain: ['..MMMM......', '.MmssMM.....', 'MM..mMM.....', 'MM...MM.MMM.', 'mM...MMMmsMM', '.MMMMM..M.mM', '......MM..MM', '.......MMMM.', '..MMMM......', '.MmssMM.....', 'MM..mMM.....'],
  skull: ['..bbbbb..', '.bbBbbbb.', 'bbffbffbb', 'bbffbffbb', '.bbbfbbb.', '..bbbbb..', '..bBbBb..'],
  drop: ['..r..', '.rRr.', 'rRRRr', 'rReRr', '.rRr.'],
  scroll: ['..bbbbbbbbb.', '.bBBBBBBBBBb', 'bBbbbbbbbbBb', 'bBbkkkkkbBb.', 'bBbbbbbbbBb.', 'bBbkkkkbbBb.', 'bBbbbbbbbBb.', '.bBBBBBBBb..', '..bbbbbbb...'],
};

type Ramp = string[];
interface Prop { p: string; x: number; y: number; flip?: boolean }
interface Spec {
  sky: Ramp;
  ground?: { y: number; ramp: Ramp; bump?: number };
  props: Prop[];
  light?: { x: number; y: number; r: number; color: string; k?: number };
  stars?: number;
  moon?: { x: number; y: number; r: number };
  fog?: number;
  embers?: { n: number; color: string };
  seed: number;
}

function skyFill(im: ImageData, ramp: Ramp, h: number) {
  const rr = ramp.map(hex);
  for (let y = 0; y < im.height; y++)
    for (let x = 0; x < im.width; x++) {
      const t = (y / h) * (rr.length - 1);
      const i0 = Math.min(rr.length - 2, Math.max(0, Math.floor(t)));
      const f = t - i0;
      const th = (BAYER[y & 3][x & 3] + 0.5) / 16;
      const c = rr[f > th ? i0 + 1 : i0];
      const i = (y * im.width + x) * 4;
      im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; im.data[i + 3] = 255;
    }
}
const setPx = (im: ImageData, x: number, y: number, c: number[]) => {
  if (x < 0 || y < 0 || x >= im.width || y >= im.height) return;
  const i = (y * im.width + x) * 4;
  im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; im.data[i + 3] = 255;
};
const getPx = (im: ImageData, x: number, y: number) => {
  const i = (y * im.width + x) * 4;
  return [im.data[i], im.data[i + 1], im.data[i + 2]];
};
function drawProp(im: ImageData, pr: Prop) {
  const rows = PROPS[pr.p];
  const out: string[][] = rows.map((r) => r.split(''));
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && y < h && x < w ? out[y][x] ?? '.' : '.');
  // контур
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (at(x, y) !== '.') continue;
    if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') setPx(im, pr.x + (pr.flip ? w - 1 - x : x), pr.y + y, hex(PAL.k));
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = at(x, y);
    if (ch === '.') continue;
    const px = pr.x + (pr.flip ? w - 1 - x : x);
    setPx(im, px, pr.y + y, hex(PAL[ch] ?? '#ff00ff'));
  }
}
function lightPass(im: ImageData, l: NonNullable<Spec['light']>) {
  const c = hex(l.color);
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const d = Math.hypot(x - l.x, (y - l.y) * 1.2);
    if (d > l.r) continue;
    const k = Math.pow(1 - d / l.r, 1.6) * (l.k ?? 0.8);
    if (k > (BAYER[y & 3][x & 3] + 0.5) / 16) {
      const p = getPx(im, x, y);
      const m = Math.min(0.6, k * 0.75);
      setPx(im, x, y, [p[0] + (c[0] - p[0]) * m, p[1] + (c[1] - p[1]) * m, p[2] + (c[2] - p[2]) * m].map(Math.round));
    }
  }
}

export const CARD_SPECS: Record<string, Spec> = {
  spade: {
    seed: 1, sky: ['#0d0a1c', '#1f1736', '#3b2c58', '#6a4a60'], moon: { x: 50, y: 9, r: 5 },
    ground: { y: 31, ramp: ['#14101a', '#07080c'], bump: 2 }, stars: 22,
    props: [{ p: 'mound', x: 18, y: 28 }, { p: 'shovel', x: 33, y: 11 }, { p: 'crow', x: 31, y: 5 }, { p: 'lantern', x: 8, y: 30 }, { p: 'skull', x: 49, y: 32 }],
    light: { x: 12, y: 33, r: 22, color: '#e8a94a', k: 0.9 }, fog: 0.5,
  },
  earth: {
    seed: 2, sky: ['#16282a', '#2d4a45', '#6f9a8a'], ground: { y: 30, ramp: ['#10171a', '#07080c'], bump: 1 }, stars: 0,
    props: [{ p: 'tomb', x: 6, y: 20 }, { p: 'mound', x: 20, y: 28 }, { p: 'hand', x: 30, y: 21 }, { p: 'crow', x: 50, y: 24, flip: true }],
    light: { x: 34, y: 20, r: 20, color: '#a9cdb8', k: 0.6 }, fog: 0.9,
  },
  candle: {
    seed: 3, sky: ['#050408', '#120c10', '#2a1a14'], ground: { y: 34, ramp: ['#1a120d', '#07080c'] }, stars: 0,
    props: [{ p: 'candle', x: 27, y: 14 }, { p: 'scroll', x: 6, y: 30 }, { p: 'drop', x: 52, y: 30 }],
    light: { x: 32, y: 18, r: 34, color: '#f6cf7a', k: 1 }, embers: { n: 24, color: '#ffcf70' },
  },
  cross: {
    seed: 4, sky: ['#3a1018', '#7a2a24', '#c0603a', '#e8a94a'], ground: { y: 33, ramp: ['#1a0a0c', '#07080c'], bump: 2 }, stars: 0,
    props: [{ p: 'cross', x: 25, y: 14 }, { p: 'crowfly', x: 8, y: 8 }, { p: 'crowfly', x: 46, y: 13 }, { p: 'crow', x: 42, y: 26, flip: true }],
    light: { x: 32, y: 36, r: 30, color: '#ff9a5a', k: 0.8 },
  },
  bell: {
    seed: 5, sky: ['#0a1018', '#142238', '#27486b'], ground: { y: 35, ramp: ['#0a1018', '#050608'] }, stars: 14,
    props: [{ p: 'bell', x: 27, y: 12 }],
    light: { x: 32, y: 18, r: 30, color: '#9cc3e6', k: 0.9 }, fog: 0.6,
  },
  chain: {
    seed: 6, sky: ['#1b1624', '#3a2c40', '#6a4a60'], ground: { y: 34, ramp: ['#14101a', '#07080c'] }, stars: 8,
    props: [{ p: 'chain', x: 8, y: 6 }, { p: 'chain', x: 36, y: 17 }, { p: 'skull', x: 50, y: 6 }],
    light: { x: 32, y: 20, r: 24, color: '#b9c6cf', k: 0.6 },
  },
};

export function renderCardArt(key: string, t = 0): HTMLCanvasElement {
  const s = CARD_SPECS[key];
  const c = document.createElement('canvas');
  c.width = 64; c.height = 40;
  const ctx = c.getContext('2d')!;
  const im = ctx.createImageData(64, 40);
  skyFill(im, s.sky, s.ground?.y ?? 40);
  const r = new Rng(s.seed);
  for (let i = 0; i < (s.stars ?? 0); i++) setPx(im, r.int(0, 63), r.int(0, 24), r.chance(0.3) ? hex('#fff0c0') : hex('#9cc3e6'));
  if (s.moon) {
    for (let y = -s.moon.r; y <= s.moon.r; y++) for (let x = -s.moon.r; x <= s.moon.r; x++) {
      if (x * x + y * y <= s.moon.r * s.moon.r) setPx(im, s.moon.x + x, s.moon.y + y, hex(x * x + y * y > (s.moon.r - 1.5) ** 2 ? '#c0b69c' : '#fff0c0'));
    }
    lightPass(im, { x: s.moon.x, y: s.moon.y, r: 14, color: '#c8d0e8', k: 0.5 });
  }
  if (s.ground) {
    const rr = s.ground.ramp.map(hex);
    for (let x = 0; x < 64; x++) {
      const top = s.ground.y + Math.round(Math.sin(x * 0.3 + s.seed) * (s.ground.bump ?? 0));
      for (let y = top; y < 40; y++) setPx(im, x, y, rr[(y - top) > 2 ? 1 : 0]);
    }
  }
  if (s.fog) {
    const fy = (s.ground?.y ?? 30) - 3;
    for (let y = fy; y < fy + 7; y++) for (let x = 0; x < 64; x++) {
      const k = (1 - Math.abs(y - fy - 3) / 4) * s.fog;
      if (k > (BAYER[y & 3][(x + y) & 3] + 0.5) / 16) { const p = getPx(im, x, y); setPx(im, x, y, [p[0] + (150 - p[0]) * 0.35, p[1] + (170 - p[1]) * 0.35, p[2] + (165 - p[2]) * 0.35].map(Math.round)); }
    }
  }
  for (const p of s.props) drawProp(im, p);
  if (s.light) lightPass(im, s.light);
  if (s.embers) {
    const er = new Rng(s.seed + 9);
    for (let i = 0; i < s.embers.n; i++) setPx(im, er.int(4, 59), er.int(2, 36), hex(er.chance(0.5) ? s.embers.color : '#fff0c0'));
  }
  // виньетка
  for (let y = 0; y < 40; y++) for (let x = 0; x < 64; x++) {
    const d = Math.hypot((x - 32) / 32, (y - 20) / 22);
    if (d > 0.85 && (d - 0.85) * 3 > (BAYER[y & 3][x & 3] + 0.5) / 16) { const p = getPx(im, x, y); setPx(im, x, y, [p[0] * 0.55, p[1] * 0.55, p[2] * 0.6].map(Math.round)); }
  }
  void t;
  ctx.putImageData(im, 0, 0);
  return c;
}
