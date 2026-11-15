/* Иллюстрации карт, реликвий и событий в пикселях. Собираются из ручных деталей: небо с дизерингом,
   ландшафт, предметы, свет, туман. Разрешение карты 128×80, события 192×108. */
import { PAL, scale2x } from './pixel.ts';
import { Rng } from '../engine/rng.ts';

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const gen = (w: number, h: number, f: (x: number, y: number, s: (x: number, y: number, c: string) => void) => void) => {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const s = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f(x, y, s);
  return g.map((r) => r.join(''));
};

const stained = (() => {
  const colors = ['U', 'V', 'R', 'a', 'G'];
  return gen(14, 22, (x, y, s) => {
    const dx = x - 6.5;
    const inside = y > 6 ? Math.abs(dx) <= 6.5 : (dx / 6.5) ** 2 + ((y - 6) / 6) ** 2 <= 1;
    if (!inside) return;
    const edge = y > 6 ? Math.abs(dx) > 5.5 : (dx / 6.5) ** 2 + ((y - 6) / 6) ** 2 > 0.78;
    const lead = edge || x === 6 || x === 7 || y % 6 === 0;
    s(x, y, lead ? 'd' : colors[(Math.floor(x / 4) + Math.floor(y / 5)) % 5]);
  });
})();
const shieldRows = gen(14, 17, (x, y, s) => {
  const half = y < 10 ? 6.5 : 6.5 * (1 - (y - 10) / 8);
  if (Math.abs(x - 6.5) > half) return;
  const edge = Math.abs(x - 6.5) > half - 1 || y === 0;
  const cross = x === 6 || x === 7 || (y >= 4 && y <= 5);
  s(x, y, edge ? 'M' : cross ? 'A' : (x + y) % 5 === 0 ? 's' : 'u');
});

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
  sword: ['...S...', '..SsS..', '..SsS..', '..SsS..', '..SsS..', '..SsS..', '..SsS..', '..SsS..', '..SsS..', '..SsS..', 'MMMMMMM', 'mmmMmmm', '...W...', '...W...', '...W...', '..OOO..'],
  axe: ['......WW......', '..MMM.WW.MMM..', '.MsMMMWWMMMsM.', 'MMsMMMWWMMMMMm', '.MMMMMWWMMMMm.', '..MMM.WW.MMm..', '......WW......', '......WW......', '......WW......', '......WW......', '......WW......', '......OO......'],
  worm: ['....dddd........', '...dRRRRd.......', '..dRrrrRRd...ddd', '.dRrd..dRRd.dRYd', 'dRrd....dRRddrRd', 'dRd......dRRRRrd', '.dd.......dddddd'],
  coffin: ['....wWWWWw....', '...wWOOOOWw...', '..wWOWWWWOWw..', '..wWOWWWWOWw..', '.wWOWWAAWWOWw.', '.wWOWWAAWWOWw.', '.wWOWAAAAWOWw.', '.wWOWWAAWWOWw.', '..wWOWWAWWOWw.', '..wWOWWWWOWw..', '...wWOWWOWw...', '....wWOOWw....', '.....wwww.....'],
  arch: ['.....nnnnnnnn.....', '...nnBBBBBBBBnn...', '..nBBnnnnnnnnBBn..', '.nBBnffffffffnBBn.', '.nBnffffffffffnBn.', 'nBBnffffffffffnBBn', 'nBnffffffffffffnBn', 'nBnffffffffffffnBn', 'nBnffffffffffffnBn', 'nBnffffffYffffffnB', 'nBnffffffffffffnBn', 'nBnffffffffffffnBn', 'nBnffffffffffffnBn', 'nBBnnnnnnnnnnnnBBn'],
  ghost: ['...ssss...', '..sSSSSs..', '.sSSffSSs.', '.sSSffSSs.', '.sSSSSSSs.', 'sSSSSSSSSs', 'sSSSSSSSSs', 'sSSSSSSSSs', '.sSSSSSSs.', '.sSsSSsSs.', '..s.ss.s..'],
  note: ['...AAAA.', '...AA.A.', '...AA.A.', '...AA...', '...AA...', '...AA...', '.AAAA...', 'AAAAA...', '.AAA....'],
  flame: ['....y.....', '....Ay....', '...AAy....', '...AAAy...', '..aAAAAy..', '..aAAyAAa.', '.aaAAyAAaa', '.aaAyyyAaa', '.aaAAyAAaa', '..aaAAAAa.', '...aaaaa..'],
  torch: ['...y.y...', '..yAyAy..', '..AAaAA..', '..aaAaa..', '...aaa...', '...WWW...', '...WwW...', '...WWW...', '...WwW...', '...WWW...', '...WwW...', '...WWW...', '..OOOOO..'],
  window: stained,
  shield: shieldRows,
  purse: ['....oooo....', '...oWWWWo...', '....WWWW....', '..WWWWWWWW..', '.WWWOaOWWWW.', '.WWOaAaOWWW.', 'WWWWOaOWWWWW', 'WWWWWWWWWWWW', '.WWWWWWWWWW.', '..wwwwwwww..'],
  eye: ['....nnnnnnnn....', '..nnBBBBBBBBnn..', '.nBBBBVVVVBBBBn.', 'nBBBVVaaaaVVBBBn', 'nBBVVaAyyAaVVBBn', 'nBBBVVaaaaVVBBBn', '.nBBBBVVVVBBBBn.', '..nnBBBBBBBBnn..', '....nnnnnnnn....'],
  ribs: ['....nnnn........nnnn....', '..nnBBnn......nnBBnn..', '.nBBnn..........nnBBn.', 'nBBn..............nBBn', 'nBn................nBn', 'nBn................nBn', 'nBn................nBn', 'nBn................nBn'],
  coin: ['.OO.', 'OAyO', 'OAaO', '.OO.'],
};

interface Prop { p: string; x: number; y: number; flip?: boolean; glow?: string }
interface Spec {
  sky: string[];
  ground?: { y: number; ramp: string[]; bump?: number };
  props: Prop[];
  light?: { x: number; y: number; r: number; color: string; k?: number };
  stars?: number;
  moon?: { x: number; y: number; r: number };
  fog?: number;
  embers?: { n: number; color: string };
  swirl?: boolean;
  seed: number;
}

const SKY = {
  s: ['#3a1018', '#7a2a24', '#c0603a', '#e8a94a'],
  w: ['#0a1018', '#142238', '#27486b', '#4f84b0'],
  r: ['#0d0a1c', '#1f1736', '#3b2c58', '#6a4a60'],
  d: ['#1b1624', '#3a2c40', '#6a4a60'],
  g: ['#16282a', '#2d4a45', '#6f9a8a'],
  k: ['#050408', '#120c10', '#2a1a14'],
};
const GROUND = { dark: ['#14101a', '#07080c'], warm: ['#1a0a0c', '#07080c'], teal: ['#10171a', '#07080c'] };

/** Набор рецептов: ключ иллюстрации → композиция. Координаты в сетке 64×40. */
export const RECIPES: Record<string, (sk: keyof typeof SKY) => Spec> = {
  blade: (sk) => ({ seed: 11, sky: SKY[sk], ground: { y: 33, ramp: GROUND.warm, bump: 2 }, props: [{ p: 'sword', x: 28, y: 10 }, { p: 'crowfly', x: 8, y: 7 }, { p: 'crowfly', x: 48, y: 12 }], light: { x: 32, y: 34, r: 28, color: '#ff9a5a', k: 0.8 }, stars: 6 }),
  ward: (sk) => ({ seed: 12, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'shield', x: 25, y: 10 }], light: { x: 32, y: 20, r: 26, color: '#9cc3e6', k: 0.8 }, stars: 12, fog: 0.5 }),
  dust: (sk) => ({ seed: 13, sky: SKY[sk], ground: { y: 32, ramp: GROUND.dark, bump: 2 }, props: [{ p: 'mound', x: 18, y: 28 }, { p: 'hand', x: 30, y: 21 }, { p: 'skull', x: 8, y: 30 }], light: { x: 32, y: 26, r: 22, color: '#e0b867', k: 0.7 }, embers: { n: 36, color: '#c8b890' }, fog: 0.6 }),
  spade: (sk) => ({ seed: 1, sky: SKY[sk], moon: { x: 50, y: 9, r: 5 }, ground: { y: 31, ramp: GROUND.dark, bump: 2 }, stars: 22, props: [{ p: 'mound', x: 18, y: 28 }, { p: 'shovel', x: 33, y: 11 }, { p: 'crow', x: 31, y: 5 }, { p: 'lantern', x: 8, y: 30 }, { p: 'skull', x: 49, y: 32 }], light: { x: 12, y: 33, r: 22, color: '#e8a94a', k: 0.9 }, fog: 0.5 }),
  cross: (sk) => ({ seed: 4, sky: SKY[sk], ground: { y: 33, ramp: GROUND.warm, bump: 2 }, props: [{ p: 'cross', x: 25, y: 14 }, { p: 'crowfly', x: 8, y: 8 }, { p: 'crowfly', x: 46, y: 13 }, { p: 'crow', x: 42, y: 26, flip: true }], light: { x: 32, y: 36, r: 30, color: '#ff9a5a', k: 0.8 } }),
  worm: (sk) => ({ seed: 14, sky: SKY[sk], ground: { y: 30, ramp: GROUND.warm, bump: 1 }, props: [{ p: 'mound', x: 6, y: 27 }, { p: 'skull', x: 40, y: 27 }, { p: 'worm', x: 20, y: 18 }], light: { x: 28, y: 24, r: 20, color: '#e0603f', k: 0.6 }, fog: 0.5, stars: 8 }),
  march: (sk) => ({ seed: 15, sky: SKY[sk], moon: { x: 52, y: 8, r: 4 }, ground: { y: 32, ramp: GROUND.dark, bump: 1 }, props: [{ p: 'tomb', x: 3, y: 23 }, { p: 'tomb', x: 22, y: 21 }, { p: 'tomb', x: 41, y: 23 }, { p: 'crow', x: 25, y: 14 }], light: { x: 32, y: 30, r: 28, color: '#8a78b8', k: 0.6 }, fog: 0.8, stars: 18 }),
  coffin: (sk) => ({ seed: 16, sky: SKY[sk], ground: { y: 33, ramp: GROUND.dark, bump: 1 }, props: [{ p: 'coffin', x: 25, y: 12 }, { p: 'mound', x: 2, y: 30 }, { p: 'crow', x: 50, y: 28 }], light: { x: 32, y: 22, r: 22, color: '#c0833a', k: 0.6 }, fog: 0.4, stars: 10 }),
  earth: (sk) => ({ seed: 2, sky: SKY[sk], ground: { y: 30, ramp: GROUND.teal, bump: 1 }, props: [{ p: 'tomb', x: 6, y: 20 }, { p: 'mound', x: 20, y: 28 }, { p: 'hand', x: 30, y: 21 }, { p: 'crow', x: 50, y: 24, flip: true }], light: { x: 34, y: 20, r: 20, color: '#a9cdb8', k: 0.6 }, fog: 0.9 }),
  slab: (sk) => ({ seed: 17, sky: SKY[sk], ground: { y: 31, ramp: GROUND.warm, bump: 1 }, props: [{ p: 'tomb', x: 26, y: 18 }, { p: 'drop', x: 40, y: 30 }, { p: 'skull', x: 12, y: 30 }], light: { x: 32, y: 28, r: 22, color: '#e0603f', k: 0.6 }, fog: 0.5 }),
  shroud: (sk) => ({ seed: 18, sky: SKY[sk], ground: { y: 33, ramp: GROUND.dark }, props: [{ p: 'ghost', x: 26, y: 14 }], light: { x: 32, y: 20, r: 24, color: '#a9cdb8', k: 0.7 }, fog: 0.9, stars: 14 }),
  crypt: (sk) => ({ seed: 19, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'arch', x: 23, y: 14 }, { p: 'crow', x: 8, y: 26 }, { p: 'lantern', x: 50, y: 30 }], light: { x: 52, y: 32, r: 16, color: '#e8a94a', k: 0.8 }, fog: 0.6, stars: 8 }),
  ash: (sk) => ({ seed: 20, sky: SKY[sk], ground: { y: 33, ramp: GROUND.dark }, props: [{ p: 'skull', x: 28, y: 26 }, { p: 'hand', x: 10, y: 27 }, { p: 'hand', x: 46, y: 27 }], embers: { n: 50, color: '#a39d8d' }, light: { x: 32, y: 30, r: 22, color: '#8a78b8', k: 0.5 }, fog: 0.8 }),
  headstone: (sk) => ({ seed: 21, sky: SKY[sk], ground: { y: 33, ramp: GROUND.dark, bump: 1 }, props: [{ p: 'tomb', x: 22, y: 14 }, { p: 'mound', x: 2, y: 30 }, { p: 'mound', x: 36, y: 31 }], light: { x: 32, y: 20, r: 24, color: '#9cc3e6', k: 0.6 }, fog: 0.6, stars: 16 }),
  grave: (sk) => ({ seed: 22, sky: SKY[sk], ground: { y: 31, ramp: GROUND.dark, bump: 2 }, props: [{ p: 'coffin', x: 8, y: 14 }, { p: 'mound', x: 24, y: 29 }, { p: 'hand', x: 38, y: 21 }], light: { x: 40, y: 22, r: 20, color: '#c0833a', k: 0.6 }, fog: 0.6, stars: 12 }),
  psalm: (sk) => ({ seed: 23, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'note', x: 14, y: 8 }, { p: 'note', x: 42, y: 12 }, { p: 'scroll', x: 24, y: 22 }, { p: 'candle', x: 6, y: 20 }], light: { x: 32, y: 22, r: 28, color: '#e0b867', k: 0.7 }, embers: { n: 20, color: '#ffcf70' } }),
  lantern: (sk) => ({ seed: 24, sky: SKY[sk], ground: { y: 32, ramp: GROUND.dark, bump: 1 }, props: [{ p: 'mound', x: 14, y: 29 }, { p: 'lantern', x: 28, y: 22 }, { p: 'crow', x: 44, y: 26 }], light: { x: 31, y: 25, r: 28, color: '#e8a94a', k: 1 }, fog: 0.7, stars: 10 }),
  ancestors: (sk) => ({ seed: 25, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'ghost', x: 6, y: 20 }, { p: 'ghost', x: 26, y: 14 }, { p: 'ghost', x: 46, y: 20 }], light: { x: 32, y: 22, r: 30, color: '#a9cdb8', k: 0.6 }, fog: 0.9, stars: 12 }),
  candle: (sk) => ({ seed: 3, sky: SKY[sk], ground: { y: 34, ramp: ['#1a120d', '#07080c'] }, props: [{ p: 'candle', x: 27, y: 14 }, { p: 'scroll', x: 6, y: 30 }, { p: 'drop', x: 52, y: 30 }], light: { x: 32, y: 18, r: 34, color: '#f6cf7a', k: 1 }, embers: { n: 24, color: '#ffcf70' } }),
  flame: (sk) => ({ seed: 26, sky: SKY[sk], ground: { y: 35, ramp: GROUND.warm }, props: [{ p: 'flame', x: 27, y: 14 }, { p: 'skull', x: 8, y: 30 }], light: { x: 32, y: 20, r: 34, color: '#ff9a3a', k: 1 }, embers: { n: 44, color: '#ffcf70' } }),
  wick: (sk) => ({ seed: 27, sky: SKY[sk], ground: { y: 35, ramp: GROUND.warm }, props: [{ p: 'candle', x: 12, y: 18 }, { p: 'candle', x: 40, y: 20 }, { p: 'flame', x: 26, y: 6 }], light: { x: 32, y: 18, r: 32, color: '#f6cf7a', k: 0.9 }, embers: { n: 20, color: '#ffcf70' } }),
  torch: (sk) => ({ seed: 28, sky: SKY[sk], ground: { y: 33, ramp: GROUND.warm, bump: 1 }, props: [{ p: 'torch', x: 14, y: 12 }, { p: 'torch', x: 42, y: 14 }, { p: 'crowfly', x: 28, y: 6 }], light: { x: 32, y: 18, r: 34, color: '#ff8a3a', k: 0.9 }, embers: { n: 30, color: '#ffcf70' } }),
  wax: (sk) => ({ seed: 29, sky: SKY[sk], ground: { y: 34, ramp: ['#1a120d', '#07080c'] }, props: [{ p: 'candle', x: 27, y: 15 }, { p: 'drop', x: 14, y: 28 }, { p: 'drop', x: 46, y: 26 }], light: { x: 32, y: 22, r: 28, color: '#f6cf7a', k: 0.9 }, embers: { n: 12, color: '#ffe9b0' } }),
  window: (sk) => ({ seed: 30, sky: SKY[sk], ground: { y: 35, ramp: GROUND.dark }, props: [{ p: 'window', x: 25, y: 10 }], light: { x: 32, y: 24, r: 34, color: '#e8a94a', k: 0.9 }, fog: 0.5, stars: 0 }),
  smoke: (sk) => ({ seed: 31, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'candle', x: 27, y: 18 }], light: { x: 32, y: 22, r: 28, color: '#c8c0d8', k: 0.7 }, fog: 1, swirl: true }),
  axe: (sk) => ({ seed: 32, sky: SKY[sk], ground: { y: 34, ramp: GROUND.warm, bump: 1 }, props: [{ p: 'axe', x: 24, y: 10 }, { p: 'mound', x: 2, y: 30 }], light: { x: 32, y: 30, r: 26, color: '#e0603f', k: 0.8 }, stars: 8 }),
  chain: (sk) => ({ seed: 6, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'chain', x: 8, y: 6 }, { p: 'chain', x: 36, y: 17 }, { p: 'skull', x: 50, y: 6 }], light: { x: 32, y: 20, r: 24, color: '#b9c6cf', k: 0.6 }, stars: 8 }),
  bell: (sk) => ({ seed: 5, sky: SKY[sk], ground: { y: 35, ramp: ['#0a1018', '#050608'] }, props: [{ p: 'bell', x: 27, y: 12 }], light: { x: 32, y: 18, r: 30, color: '#9cc3e6', k: 0.9 }, fog: 0.6, stars: 14 }),
  ribs: (sk) => ({ seed: 33, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'ribs', x: 20, y: 6 }, { p: 'skull', x: 28, y: 30 }], light: { x: 32, y: 28, r: 30, color: '#e8a94a', k: 0.6 }, fog: 0.8, stars: 6 }),
  mercy: (sk) => ({ seed: 34, sky: SKY[sk], ground: { y: 34, ramp: GROUND.warm }, props: [{ p: 'sword', x: 30, y: 12 }, { p: 'skull', x: 8, y: 30 }, { p: 'drop', x: 46, y: 28 }], light: { x: 32, y: 26, r: 24, color: '#e0603f', k: 0.7 }, fog: 0.5 }),
  purse: (sk) => ({ seed: 35, sky: SKY[sk], ground: { y: 33, ramp: GROUND.dark }, props: [{ p: 'purse', x: 24, y: 18 }, { p: 'coin', x: 10, y: 30 }, { p: 'coin', x: 46, y: 28 }, { p: 'coin', x: 38, y: 33 }], light: { x: 32, y: 26, r: 24, color: '#f6cf7a', k: 0.8 } }),
  fog: (sk) => ({ seed: 36, sky: SKY[sk], ground: { y: 33, ramp: GROUND.teal }, props: [{ p: 'lantern', x: 14, y: 24 }, { p: 'tomb', x: 40, y: 22 }], light: { x: 17, y: 26, r: 26, color: '#e8a94a', k: 0.8 }, fog: 1 }),
  breath: (sk) => ({ seed: 37, sky: SKY[sk], ground: { y: 35, ramp: GROUND.dark }, props: [{ p: 'candle', x: 27, y: 20 }], light: { x: 32, y: 22, r: 22, color: '#c8d0e8', k: 0.5 }, swirl: true, fog: 0.4 }),
  eye: (sk) => ({ seed: 38, sky: SKY[sk], ground: { y: 35, ramp: GROUND.dark }, props: [{ p: 'eye', x: 24, y: 15 }], light: { x: 32, y: 19, r: 30, color: '#a98bd0', k: 0.8 }, stars: 20 }),
  blood: (sk) => ({ seed: 39, sky: SKY[sk], ground: { y: 34, ramp: GROUND.warm }, props: [{ p: 'drop', x: 30, y: 12 }, { p: 'drop', x: 18, y: 24 }, { p: 'drop', x: 44, y: 22 }, { p: 'sword', x: 8, y: 14 }], light: { x: 32, y: 20, r: 26, color: '#e0603f', k: 0.7 } }),
  bandage: (sk) => ({ seed: 40, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'scroll', x: 24, y: 18 }, { p: 'candle', x: 6, y: 20 }], light: { x: 24, y: 24, r: 28, color: '#f6cf7a', k: 0.8 } }),
  wind: (sk) => ({ seed: 41, sky: SKY[sk], ground: { y: 35, ramp: GROUND.dark }, props: [{ p: 'crowfly', x: 20, y: 14 }, { p: 'crowfly', x: 38, y: 10 }, { p: 'tomb', x: 6, y: 25 }], swirl: true, fog: 0.6, stars: 10 }),
  voice: (sk) => ({ seed: 42, sky: SKY[sk], ground: { y: 35, ramp: GROUND.dark }, props: [{ p: 'bell', x: 27, y: 14 }, { p: 'note', x: 10, y: 8 }, { p: 'note', x: 48, y: 12 }], light: { x: 32, y: 20, r: 30, color: '#ffd36a', k: 0.9 }, stars: 16 }),
  iou: (sk) => ({ seed: 43, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'scroll', x: 22, y: 14 }, { p: 'drop', x: 44, y: 28 }, { p: 'skull', x: 8, y: 30 }], light: { x: 32, y: 22, r: 24, color: '#a89a6a', k: 0.7 } }),
  guilt: (sk) => ({ seed: 44, sky: SKY[sk], ground: { y: 34, ramp: GROUND.dark }, props: [{ p: 'ghost', x: 26, y: 12 }, { p: 'chain', x: 4, y: 24 }, { p: 'chain', x: 46, y: 24, flip: true }], light: { x: 32, y: 20, r: 26, color: '#a89a6a', k: 0.6 }, fog: 0.9 }),
};
const TONE: Record<string, keyof typeof SKY> = { strike: 's', ward: 'w', rite: 'r', debt: 'k' };

const px = (im: ImageData, x: number, y: number, c: number[]) => {
  if (x < 0 || y < 0 || x >= im.width || y >= im.height) return;
  const i = (y * im.width + x) * 4;
  im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; im.data[i + 3] = 255;
};
const get = (im: ImageData, x: number, y: number) => { const i = (y * im.width + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };

function drawProp(im: ImageData, rows0: string[], x: number, y: number, flip: boolean, F: number) {
  let grid = rows0.map((r) => r.split(''));
  const w0 = Math.max(...rows0.map((r) => r.length));
  grid = grid.map((r) => { while (r.length < w0) r.push('.'); return r; });
  if (F >= 2) grid = scale2x(grid);
  const h = grid.length, w = grid[0].length;
  const at = (xx: number, yy: number) => (xx >= 0 && yy >= 0 && yy < h && xx < w ? grid[yy][xx] : '.');
  const X = (xx: number) => x * F + (flip ? w - 1 - xx : xx);
  for (let yy = -1; yy <= h; yy++) for (let xx = -1; xx <= w; xx++) {
    if (at(xx, yy) !== '.') continue;
    if (at(xx - 1, yy) !== '.' || at(xx + 1, yy) !== '.' || at(xx, yy - 1) !== '.' || at(xx, yy + 1) !== '.') px(im, X(xx), y * F + yy, hex(PAL.k));
  }
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const ch = at(xx, yy);
    if (ch !== '.') px(im, X(xx), y * F + yy, hex(PAL[ch] ?? '#ff00ff'));
  }
}

function lightPass(im: ImageData, l: NonNullable<Spec['light']>, F: number) {
  const c = hex(l.color);
  const lx = l.x * F, ly = l.y * F, lr = l.r * F;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const d = Math.hypot(x - lx, (y - ly) * 1.2);
    if (d > lr) continue;
    const k = Math.pow(1 - d / lr, 1.6) * (l.k ?? 0.8);
    if (k > (BAYER[y & 3][x & 3] + 0.5) / 16) {
      const p = get(im, x, y);
      const m = Math.min(0.6, k * 0.75);
      px(im, x, y, [p[0] + (c[0] - p[0]) * m, p[1] + (c[1] - p[1]) * m, p[2] + (c[2] - p[2]) * m].map(Math.round));
    }
  }
}

function paint(spec: Spec, W: number, H: number, F: number, t: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const im = ctx.createImageData(W, H);
  const gy = (spec.ground?.y ?? 40) * F;
  const rr = spec.sky.map(hex);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tt = Math.min(1, y / Math.max(1, gy)) * (rr.length - 1);
    const i0 = Math.min(rr.length - 2, Math.floor(tt));
    px(im, x, y, rr[tt - i0 > (BAYER[y & 3][x & 3] + 0.5) / 16 ? i0 + 1 : i0]);
  }
  const r = new Rng(spec.seed);
  for (let i = 0; i < (spec.stars ?? 0) * F; i++) px(im, r.int(0, W - 1), r.int(0, Math.floor(gy * 0.65)), hex(r.chance(0.3) ? '#fff0c0' : '#9cc3e6'));
  if (spec.moon) {
    const m = spec.moon, mr = m.r * F;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) if (x * x + y * y <= mr * mr) px(im, m.x * F + x, m.y * F + y, hex(x * x + y * y > (mr - 1.6 * F) ** 2 ? '#c0b69c' : '#fff0c0'));
    lightPass(im, { x: m.x, y: m.y, r: 14, color: '#c8d0e8', k: 0.5 }, F);
  }
  if (spec.ground) {
    const gr = spec.ground.ramp.map(hex);
    for (let x = 0; x < W; x++) {
      const top = gy + Math.round(Math.sin(x * (0.3 / F) + spec.seed) * (spec.ground.bump ?? 0) * F);
      for (let y = top; y < H; y++) px(im, x, y, gr[y - top > 2 * F ? 1 : 0]);
    }
  }
  if (spec.swirl) {
    for (let k = 0; k < 4; k++) for (let a = 0; a < 6.2; a += 0.04) {
      const rad = (6 + a * 4 + k * 3) * F;
      px(im, Math.round(W / 2 + Math.cos(a + k * 1.6) * rad * 1.5), Math.round(H * 0.45 + Math.sin(a + k * 1.6) * rad * 0.55), hex(k % 2 ? '#c8d0e8' : '#8a78b8'));
    }
  }
  if (spec.fog) {
    const fy = gy - 3 * F;
    for (let y = fy; y < fy + 7 * F; y++) for (let x = 0; x < W; x++) {
      const k = (1 - Math.abs(y - fy - 3.5 * F) / (4 * F)) * spec.fog;
      if (k > (BAYER[y & 3][(x + y + Math.floor(t * 3)) & 3] + 0.5) / 16) { const p = get(im, x, y); px(im, x, y, [p[0] + (150 - p[0]) * 0.35, p[1] + (170 - p[1]) * 0.35, p[2] + (165 - p[2]) * 0.35].map(Math.round)); }
    }
  }
  for (const p of spec.props) drawProp(im, PROPS[p.p] ?? PROPS.skull, p.x, p.y, !!p.flip, F);
  if (spec.light) lightPass(im, spec.light, F);
  if (spec.embers) {
    const er = new Rng(spec.seed + 9);
    for (let i = 0; i < spec.embers.n * F; i++) px(im, er.int(4, W - 5), er.int(2, H - 4), hex(er.chance(0.5) ? spec.embers.color : '#fff0c0'));
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 1.8));
    if (d > 0.85 && (d - 0.85) * 3 > (BAYER[y & 3][x & 3] + 0.5) / 16) { const p = get(im, x, y); px(im, x, y, [p[0] * 0.55, p[1] * 0.55, p[2] * 0.6].map(Math.round)); }
  }
  ctx.putImageData(im, 0, 0);
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();
/** Иллюстрация карты 128×80 по ключу арта и типу карты. */
export function cardArt(art: string, type: string): HTMLCanvasElement {
  const k = `${art}:${type}`;
  let c = cache.get(k);
  if (!c) {
    const rec = RECIPES[art] ?? RECIPES.skullfallback ?? RECIPES.iou;
    c = paint(rec(TONE[type] ?? 'r'), 128, 80, 2, 0);
    cache.set(k, c);
  }
  return c;
}

/** Иллюстрация события/реликвии: крупнее, с несколькими предметами. */
export function bannerArt(art: string, W = 192, H = 108, tone: keyof typeof SKY = 'r'): HTMLCanvasElement {
  const k = `b:${art}:${W}:${tone}`;
  let c = cache.get(k);
  if (!c) {
    const rec = RECIPES[art] ?? RECIPES.lantern;
    const sp = rec(tone);
    // растягиваем композицию на широкий кадр: сдвигаем и добавляем окружение
    const F = 2;
    const dy = Math.max(0, (H / F - 40) * 0.8);
    const dxo = (W / F - 64) / 2;
    const wide: Spec = {
      ...sp,
      ground: sp.ground ? { ...sp.ground, y: sp.ground.y + dy } : undefined,
      props: sp.props.map((p) => ({ ...p, x: p.x + dxo, y: p.y + dy })),
      light: sp.light ? { ...sp.light, x: sp.light.x + dxo, y: sp.light.y + dy, r: sp.light.r * 1.3 } : undefined,
    };
    wide.props.push({ p: 'tomb', x: 4, y: (sp.ground?.y ?? 30) + dy - 8 }, { p: 'crow', x: W / F - 14, y: (sp.ground?.y ?? 30) + dy - 10, flip: true });
    c = paint(wide, W, H, F, 0);
    cache.set(k, c);
  }
  return c;
}

/** Иконка реликвии 40×40. */
const REL: Record<string, string> = { cord: 'chain', robe: 'shroud', veil: 'ancestors', censer: 'lantern', key: 'sword', lung: 'blood', pearl: 'eye', baton: 'sword', tin: 'bell', lender: 'purse', shrine: 'candle', scroll: 'psalm', mirror: 'window', cart: 'purse', rest: 'candle' };
export function iconArt(art: string): HTMLCanvasElement {
  return bannerArt(REL[art] ?? art, 64, 64, 'r');
}
export const eventKey = (art: string) => REL[art] ?? art;
