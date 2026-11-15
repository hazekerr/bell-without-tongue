import { Rng } from '../engine/rng.ts';
import { CARDS } from '../engine/cards.ts';

/** Общие SVG-фильтры: «масло», шершавый край, зерно. Вставляются один раз в документ. */
export const SVG_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <filter id="f-paint" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="3" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="f-rough" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="8" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="f-blur2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="f-blur5"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="f-blur12" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="f-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 -.25"/>
  </filter>
  <filter id="f-ink"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  <radialGradient id="g-vig" cx="50%" cy="48%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".78"/></radialGradient>
  <linearGradient id="g-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb2ab" stop-opacity="0"/><stop offset=".6" stop-color="#9fb2ab" stop-opacity=".22"/><stop offset="1" stop-color="#9fb2ab" stop-opacity="0"/></linearGradient>
</defs></svg>`;

interface Pal {
  top: string;
  bot: string;
  acc: string;
  mid: string;
}
const PAL: Record<string, Pal> = {
  strike: { top: '#4a1d1c', bot: '#140a0b', acc: '#e0603f', mid: '#2a1114' },
  ward: { top: '#1f3144', bot: '#0a111a', acc: '#9cc3e6', mid: '#12202f' },
  rite: { top: '#3a2a4f', bot: '#0f0a18', acc: '#e0b867', mid: '#1c1228' },
  debt: { top: '#3a3626', bot: '#0d0c08', acc: '#a89a6a', mid: '#1c1a10' },
  c1: { top: '#35514c', bot: '#0b1210', acc: '#b7d4c4', mid: '#16241f' },
  c2: { top: '#4a3a30', bot: '#0f0b0a', acc: '#e8a94a', mid: '#221915' },
  c3: { top: '#223a52', bot: '#080e16', acc: '#a9c9ee', mid: '#101c2a' },
  hub: { top: '#2a2338', bot: '#0b0a12', acc: '#e8a94a', mid: '#161222' },
};
export const palOf = (k: string) => PAL[k] ?? PAL.hub;

/* ───────── Силуэты (viewBox 0 0 100 100, центр 50,50) ───────── */
const M: Record<string, string> = {
  sword: `<path d="M48 2h4l2.5 62h-9z"/><rect x="36" y="62" width="28" height="5" rx="2"/><rect x="47" y="67" width="6" height="22" rx="2"/><circle cx="50" cy="92" r="4"/>`,
  axe: `<rect x="47" y="8" width="5" height="88" rx="2"/><path d="M52 14c20-6 34 4 32 20-2 14-14 20-32 18 8-8 8-30 0-38z"/>`,
  spade: `<rect x="48" y="4" width="5" height="52" rx="2"/><rect x="40" y="2" width="21" height="6" rx="3"/><path d="M33 56c0-6 8-8 17-8s17 2 17 8c0 18-10 38-17 42-7-4-17-24-17-42z"/>`,
  cross: `<path d="M42 4h16v26h26v16H58v50H42V46H16V30h26z"/><path d="M24 36l6 4M70 38l8 3" stroke="#000" stroke-width="1.2" opacity=".6" fill="none"/>`,
  tomb: `<path d="M22 96V38c0-18 12-30 28-30s28 12 28 30v58z"/><path d="M50 30v26M40 40h20" stroke="#000" stroke-width="3" opacity=".55" fill="none"/>`,
  coffin: `<path d="M34 6h32l14 32-10 56H30L20 38z"/><path d="M50 22v50M36 40h28" stroke="#000" stroke-width="2.4" opacity=".5" fill="none"/>`,
  candle: `<rect x="40" y="38" width="20" height="58" rx="3"/><path d="M50 8c8 12 10 20 0 28-10-8-8-16 0-28z"/><path d="M42 54c-4 8-2 14 2 14 2-6 2-10-2-14z" opacity=".7"/>`,
  flame: `<path d="M50 4c20 22 32 40 24 62-4 14-16 24-24 24s-20-10-24-24C18 44 32 36 38 18c4 8 8 12 12-14z"/><path d="M50 44c10 14 12 28 0 40-12-12-10-26 0-40z" opacity=".55"/>`,
  torch: `<rect x="45" y="46" width="9" height="50" rx="3"/><path d="M50 2c18 18 24 32 14 46H36C28 34 38 24 50 2z"/>`,
  bell: `<path d="M50 4c-6 0-9 4-9 8-16 6-24 22-24 40v14L8 78h84l-9-12V52c0-18-8-34-24-40 0-4-3-8-9-8z"/><path d="M40 82h20c0 10-6 14-10 14s-10-4-10-14z"/>`,
  chain: `<g fill="none" stroke="#0a0b0f" stroke-width="7"><ellipse cx="30" cy="30" rx="16" ry="9" transform="rotate(-35 30 30)"/><ellipse cx="52" cy="52" rx="16" ry="9" transform="rotate(-35 52 52)"/><ellipse cx="74" cy="74" rx="16" ry="9" transform="rotate(-35 74 74)"/></g>`,
  eye: `<path d="M4 50C20 24 36 16 50 16s30 8 46 34C80 76 64 84 50 84S20 76 4 50z"/><circle cx="50" cy="50" r="14" fill="#e0b867" opacity=".85"/><circle cx="50" cy="50" r="6"/>`,
  ribs: `<g fill="none" stroke="#0a0b0f" stroke-width="7" stroke-linecap="round"><path d="M10 96C10 40 30 10 50 10s40 30 40 86"/><path d="M26 96C26 52 38 28 50 28s24 24 24 68"/><path d="M42 96c0-30 4-46 8-46s8 16 8 46"/></g>`,
  shield: `<path d="M50 4l40 12v34c0 24-16 38-40 46C26 88 10 74 10 50V16z"/><path d="M50 14v72M24 38h52" stroke="#000" stroke-width="2" opacity=".45" fill="none"/>`,
  hood: `<path d="M50 4c-14 0-24 12-24 28 0 8 2 12-4 20-8 12-12 26-12 44h80c0-18-4-32-12-44-6-8-4-12-4-20 0-16-10-28-24-28z"/><ellipse cx="50" cy="34" rx="11" ry="14" fill="#000"/>`,
  dust: `<g>${Array.from({ length: 26 }, (_, i) => `<circle cx="${14 + ((i * 37) % 72)}" cy="${12 + ((i * 53) % 76)}" r="${1.6 + ((i * 7) % 5)}"/>`).join('')}</g><path d="M20 90c10-14 20-8 30-18s20-4 30 8l-4 10z"/>`,
  mound: `<path d="M2 96c8-32 24-48 48-48s40 16 48 48z"/><path d="M52 50c-2-14-4-26 0-40 4 0 6 6 6 12l4-10c4 0 4 8 2 14l5-6c3 2 1 8-2 12l-3 8c-3 6-8 10-12 10z"/>`,
  lantern: `<path d="M36 18h28l6 14v46l-6 10H36l-6-10V32z"/><rect x="40" y="6" width="20" height="8" rx="3"/><rect x="42" y="38" width="16" height="30" rx="4" fill="#e8a94a" opacity=".9"/>`,
  purse: `<path d="M34 24l-8-18h48l-8 18c18 10 26 30 22 50-4 14-16 22-38 22S16 88 14 74C10 54 18 34 34 24z"/><rect x="36" y="22" width="28" height="7" rx="3" fill="#000" opacity=".4"/>`,
  scroll: `<path d="M18 14c0-6 8-6 12-6h46c6 0 6 8 6 12v66c0 6-6 8-12 8H24c-8 0-10-6-10-12V30c0-8 4-16 4-16z"/><path d="M28 30h44M28 42h44M28 54h30" stroke="#000" stroke-width="2" opacity=".5" fill="none"/>`,
  drop: `<path d="M50 4C70 34 82 50 82 68c0 18-14 28-32 28S18 86 18 68C18 50 30 34 50 4z"/>`,
  wind: `<g fill="none" stroke="#0a0b0f" stroke-width="6" stroke-linecap="round"><path d="M8 34c24-4 40 0 56-8 12-6 22 4 14 12"/><path d="M8 54c30-6 50 2 66-4 14-4 18 10 6 14"/><path d="M8 74c20-2 34 2 48-2 10-3 16 6 8 12"/></g>`,
  window: `<path d="M14 96V40c0-22 16-36 36-36s36 14 36 36v56z"/><path d="M50 4v92M14 56h72M30 20c4 12 4 22 0 30M70 20c-4 12-4 22 0 30" stroke="#e8a94a" stroke-width="2" opacity=".6" fill="none"/>`,
  note: `<ellipse cx="38" cy="78" rx="17" ry="12" transform="rotate(-20 38 78)"/><rect x="50" y="10" width="6" height="64"/><path d="M56 10c16 6 22 16 20 30-6-8-12-10-20-12z"/>`,
  worm: `<path d="M10 74c10-24 22-30 34-20 8 8 14 4 22-10 8-14 18-16 24-8-6 0-12 4-14 12-6 18-22 32-40 22-6-4-12-6-18 6z"/><circle cx="86" cy="38" r="4" fill="#d7b25e"/>`,
  march: `<g>${[0, 1, 2, 3].map((i) => `<rect x="${12 + i * 20}" y="${44 - (i % 2) * 8}" width="12" height="${48 + (i % 2) * 8}" rx="6"/><circle cx="${18 + i * 20}" cy="${40 - (i % 2) * 8}" r="9"/>`).join('')}</g>`,
  iou: `<path d="M14 18h72v64H14z"/><path d="M24 34h52M24 46h52M24 58h28" stroke="#000" stroke-width="2" opacity=".5" fill="none"/><path d="M60 72c6-6 12-6 18 0" stroke="#7a1f24" stroke-width="3" fill="none"/>`,
  guilt: `<path d="M50 6c20 0 30 16 30 34 0 12-6 20-6 30 0 16 10 24 10 26H16s10-10 10-26c0-10-6-18-6-30C20 22 30 6 50 6z" opacity=".95"/>`,
};
export const MOTIFS = M;
const MAP: Record<string, keyof typeof M> = {
  blade: 'sword', ward: 'shield', dust: 'dust', spade: 'spade', cross: 'cross', worm: 'worm', march: 'march', coffin: 'coffin', earth: 'mound',
  slab: 'tomb', shroud: 'hood', crypt: 'tomb', ash: 'dust', headstone: 'tomb', grave: 'mound', psalm: 'note', lantern: 'lantern', ancestors: 'hood',
  candle: 'candle', flame: 'flame', wick: 'candle', torch: 'torch', wax: 'candle', window: 'window', smoke: 'wind', axe: 'axe', chain: 'chain',
  bell: 'bell', ribs: 'ribs', mercy: 'drop', purse: 'purse', fog: 'wind', breath: 'wind', eye: 'eye', blood: 'drop', bandage: 'scroll', wind: 'wind',
  voice: 'note', iou: 'iou', guilt: 'guilt', cord: 'chain', robe: 'hood', veil: 'hood', censer: 'lantern', key: 'sword', lung: 'drop', pearl: 'eye',
  baton: 'sword', tin: 'bell', lender: 'purse', shrine: 'candle', scroll: 'scroll', mirror: 'window', cart: 'purse', rest: 'candle',
};

function ground(r: Rng, w: number, h: number, base: number, amp: number, fill: string, op: number) {
  let d = `M0 ${h}L0 ${base}`;
  const steps = 14;
  for (let i = 1; i <= steps; i++) d += `L${(i / steps) * w} ${base + (r.next() - 0.5) * amp}`;
  d += `L${w} ${h}Z`;
  return `<path d="${d}" fill="${fill}" opacity="${op}"/>`;
}

function embers(r: Rng, w: number, h: number, n: number, color: string) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${(r.next() * w).toFixed(1)}" cy="${(r.next() * h).toFixed(1)}" r="${(0.4 + r.next() * 1.4).toFixed(2)}" fill="${color}" opacity="${(0.25 + r.next() * 0.6).toFixed(2)}"/>`;
  return s;
}

function shafts(r: Rng, w: number, h: number, color: string, n = 3) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = w * (0.15 + r.next() * 0.7);
    s += `<polygon points="${x},-10 ${x + 30 + r.next() * 30},-10 ${x + 90 + r.next() * 60},${h} ${x - 20},${h}" fill="${color}" opacity="${(0.05 + r.next() * 0.06).toFixed(3)}"/>`;
  }
  return s;
}

const cache = new Map<string, string>();

/** Иллюстрация карты (300×190). */
export function cardArt(cardId: string, up = false): string {
  const key = `${cardId}:${up}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const d = CARDS[cardId];
  const pal = palOf(d.type);
  const r = Rng.fromSeed(cardId);
  const motif = M[MAP[d.art] ?? 'hood'];
  const rot = (r.next() - 0.5) * 22;
  const sc = 1.15 + r.next() * 0.35;
  const svg = `<svg viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="s${cardId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.top}"/><stop offset="1" stop-color="${pal.bot}"/></linearGradient>
  <radialGradient id="h${cardId}" cx="50%" cy="46%" r="50%"><stop offset="0" stop-color="${pal.acc}" stop-opacity=".62"/><stop offset="1" stop-color="${pal.acc}" stop-opacity="0"/></radialGradient></defs>
  <rect width="300" height="190" fill="url(#s${cardId})"/>
  <g filter="url(#f-paint)">${shafts(r, 300, 190, pal.acc)}
  ${ground(r, 300, 190, 118, 26, pal.mid, 0.95)}${ground(r, 300, 190, 140, 20, '#07080c', 0.8)}</g>
  <ellipse cx="150" cy="90" rx="110" ry="80" fill="url(#h${cardId})"/>
  <g transform="translate(150 98) rotate(${rot.toFixed(1)}) scale(${(sc * 1.05).toFixed(2)}) translate(-50 -50)">
    <g fill="${pal.acc}" opacity=".6" filter="url(#f-blur5)">${motif}</g>
    <g fill="#08090d" stroke="${pal.acc}" stroke-width=".8" stroke-opacity=".55" filter="url(#f-rough)">${motif}</g>
  </g>
  <rect y="132" width="300" height="46" fill="url(#g-fog)"/>
  ${embers(r, 300, 190, 22, pal.acc)}
  <rect width="300" height="190" fill="url(#g-vig)"/>
  <rect width="300" height="190" filter="url(#f-grain)" opacity=".22" style="mix-blend-mode:overlay"/>
  </svg>`;
  cache.set(key, svg);
  return svg;
}

/** Иллюстрация реликвии/события (произвольный motif key). */
export function motifArt(art: string, kind: 'rite' | 'strike' | 'ward' | 'debt' | 'c1' | 'c2' | 'hub' = 'rite', w = 300, h = 190): string {
  const k = `m:${art}:${kind}:${w}x${h}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const pal = palOf(kind);
  const r = Rng.fromSeed(art + kind);
  const motif = M[MAP[art] ?? 'hood'];
  const sc = (h / 190) * 1.25;
  const svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="s${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.top}"/><stop offset="1" stop-color="${pal.bot}"/></linearGradient>
  <radialGradient id="h${k}" cx="50%" cy="46%" r="50%"><stop offset="0" stop-color="${pal.acc}" stop-opacity=".55"/><stop offset="1" stop-color="${pal.acc}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#s${k})"/>
  <g filter="url(#f-paint)">${shafts(r, w, h, pal.acc)}${ground(r, w, h, h * 0.62, h * 0.14, pal.mid, 0.95)}${ground(r, w, h, h * 0.76, h * 0.1, '#07080c', 0.85)}</g>
  <ellipse cx="${w / 2}" cy="${h * 0.48}" rx="${w * 0.4}" ry="${h * 0.42}" fill="url(#h${k})"/>
  <g transform="translate(${w / 2} ${h * 0.52}) scale(${sc.toFixed(2)}) translate(-50 -50)">
    <g fill="${pal.acc}" opacity=".6" filter="url(#f-blur5)">${motif}</g>
    <g fill="#08090d" stroke="${pal.acc}" stroke-width=".8" stroke-opacity=".55" filter="url(#f-rough)">${motif}</g>
  </g>
  <rect y="${h * 0.7}" width="${w}" height="${h * 0.24}" fill="url(#g-fog)"/>${embers(r, w, h, 20, pal.acc)}
  <rect width="${w}" height="${h}" fill="url(#g-vig)"/><rect width="${w}" height="${h}" filter="url(#f-grain)" opacity=".2" style="mix-blend-mode:overlay"/></svg>`;
  cache.set(k, svg);
  return svg;
}

/* ───────── Враги (viewBox 0 0 260 300) ───────── */
interface Fig {
  shape: string; // тёмный силуэт
  extra?: string; // цветные детали поверх (пламя, окна, глаза)
  glow: string;
  scale?: number;
}
const eyes = (x: number, y: number, gap: number, c: string, r = 2.6) =>
  `<g fill="${c}" filter="url(#f-blur2)"><ellipse cx="${x - gap / 2}" cy="${y}" rx="${r}" ry="${r * 0.7}"/><ellipse cx="${x + gap / 2}" cy="${y}" rx="${r}" ry="${r * 0.7}"/></g>`;
const flameAt = (x: number, y: number, s = 1, c = '#f0932a') =>
  `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#f-blur2)"><path d="M0 -26C10 -12 16 -2 10 10C6 18 -6 18 -10 10C-16 -2 -6 -10 0 -26Z" fill="${c}" opacity=".95"/><path d="M0 -12C5 -4 6 4 0 10C-6 4 -5 -4 0 -12Z" fill="#ffe7a8"/></g>`;
const drips = (x: number, y: number, n: number, c: string) => Array.from({ length: n }, (_, i) => `<ellipse cx="${x + i * 11 - n * 5}" cy="${y + (i % 3) * 9}" rx="1.8" ry="3.4" fill="${c}" opacity=".7"/>`).join('');

const FIGS: Record<string, () => Fig> = {
  laundress: () => ({
    glow: '#9ec8d4',
    shape: `<path d="M88 300C86 232 96 176 112 142C102 118 108 92 130 90C152 94 158 118 148 142C164 176 172 232 170 300Z"/>
      <path d="M110 96C80 128 70 200 84 284L100 286C96 214 108 152 128 102Z"/>
      <path d="M150 100C170 130 180 190 172 262L160 262C164 200 156 146 142 106Z" opacity=".9"/>
      <ellipse cx="130" cy="106" rx="17" ry="20"/>
      <path d="M112 152C84 168 62 190 54 226L70 232C80 206 96 190 120 174Z"/>
      <path d="M44 218C48 262 84 292 126 296L130 232Z"/>
      <path d="M148 154C170 170 188 196 192 236L176 238C170 210 158 190 142 176Z"/>`,
    extra: `${eyes(130, 108, 14, '#d7f1f6')}${drips(56, 262, 6, '#9ec8d4')}<path d="M44 218C50 262 84 292 126 296" fill="none" stroke="#9ec8d4" stroke-width="1" opacity=".5"/>`,
  }),
  hound: () => ({
    glow: '#8bb7a2',
    shape: `<path d="M24 236c4-30 18-56 48-68 18-8 30-22 42-38l22-30 4 24 26 6-6 16 16 8c0 16-10 26-26 28l-4 30c14 4 22 14 24 32h-26l-10-22-52 2 10 20H80l-10-18-30 10z"/>
      <path d="M64 188h60M62 204h62M66 220h54" stroke="#000" stroke-width="3" opacity=".6" fill="none"/>
      <path d="M170 124l14 -26 4 22z"/>`,
    extra: `${eyes(172, 124, 0, '#d3efe0', 3.2)}<path d="M176 146c8 4 16 2 22-4" stroke="#8bb7a2" stroke-width="1.5" fill="none" opacity=".8"/>${drips(80, 250, 4, '#8bb7a2')}`,
  }),
  fisher: () => ({
    glow: '#8bb7a2',
    shape: `<path d="M74 300C74 220 86 168 108 132C108 112 116 96 130 92C146 96 152 112 152 132C174 168 186 220 186 300Z"/>
      <ellipse cx="130" cy="90" rx="46" ry="9"/><path d="M104 88C106 62 118 50 130 50C142 50 154 62 156 88Z"/>
      <path d="M150 150C186 150 218 170 220 210" stroke="#050607" stroke-width="7" fill="none" stroke-linecap="round"/>
      <g fill="none" stroke="#050607" stroke-width="2.2"><path d="M30 120Q64 150 56 250M30 120Q10 170 40 262M22 160q36 20 72 4M20 196q40 24 70 2M26 230q30 20 58 -2"/></g>`,
    extra: `${eyes(130, 112, 14, '#d3efe0')}<g fill="#8bb7a2" opacity=".7">${[[30, 120], [56, 250], [40, 262]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`,
  }),
  mussel: () => {
    const shell = (x: number, y: number, s: number, o: number) =>
      `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><path d="M0 44C0 8 22-16 44-16s44 24 44 60C66 62 22 62 0 44z"/><path d="M44-14v66M20 2c5 20 5 38 0 50M68 2c-5 20-5 38 0 50" stroke="#000" stroke-width="2.4" opacity=".55" fill="none"/></g>`;
    return {
      glow: '#9ed1c6',
      shape: shell(10, 168, 1.35, 1) + shell(120, 190, 1.0, 1) + shell(78, 112, 1.5, 1),
      extra: `<g fill="#cfeee6" filter="url(#f-blur2)"><circle cx="128" cy="178" r="4"/><circle cx="178" cy="214" r="3"/><circle cx="60" cy="226" r="3.4"/></g><path d="M86 160c20 8 40 8 60 0" stroke="#9ed1c6" stroke-width="1.4" fill="none" opacity=".6"/>`,
    };
  },
  alban: () => ({
    glow: '#d1a45c',
    shape: `<path d="M62 300L76 168C80 136 104 118 130 116C156 118 180 136 184 168L198 300Z"/>
      <ellipse cx="130" cy="92" rx="56" ry="10"/><path d="M96 90C98 58 112 44 130 44C148 44 162 58 164 90Z"/>
      <rect x="196" y="48" width="8" height="250" rx="3"/><path d="M178 262h46l-8 38h-30z"/>
      <path d="M80 176C56 196 44 226 44 262L60 262C62 230 74 206 96 192Z"/>
      <path d="M180 176C200 190 206 210 202 230L190 228C192 212 186 198 170 190Z"/>`,
    extra: `<g><rect x="34" y="244" width="18" height="26" rx="4" fill="#e8a94a" filter="url(#f-blur2)" opacity=".95"/><path d="M43 232v12" stroke="#050607" stroke-width="2"/></g>${eyes(130, 100, 16, '#ffd68a', 2.2)}`,
  }),
  bellman: () => ({
    glow: '#b8b0e0',
    shape: `<path d="M72 300C74 232 84 184 106 150L154 150C176 184 186 232 188 300Z"/>
      <g transform="translate(88 40) scale(.84)">${M.bell}</g>
      <path d="M104 156C80 190 72 226 70 262L86 264C90 232 98 204 116 180Z"/>
      <path d="M156 156C180 190 188 226 190 262L174 264C170 232 162 204 144 180Z"/>
      <path d="M72 260c-4 20-4 34 0 44h20c4-10 4-24 0-44z"/>`,
    extra: `<ellipse cx="130" cy="132" rx="14" ry="6" fill="#000" opacity=".9"/><path d="M130 66v-12" stroke="#b8b0e0" stroke-width="1.5" opacity=".7"/><circle cx="130" cy="124" r="2.6" fill="#e5e1ff" filter="url(#f-blur2)"/>`,
  }),
  tide: () => ({
    glow: '#9ed1c6',
    shape: `<path d="M0 300V214C14 176 44 150 74 142C90 136 100 122 104 104C108 70 124 44 146 44C166 44 178 62 172 86C196 94 214 118 216 150C236 160 252 180 260 204V300Z"/>
      <path d="M72 142C30 170 6 214 10 270L30 270C30 222 54 182 90 160Z"/>
      <path d="M176 160C226 176 252 214 250 264L230 266C232 228 212 196 170 180Z"/>
      <g fill="none" stroke="#050607" stroke-width="8" stroke-linecap="round"><path d="M110 70C78 100 70 150 82 210"/><path d="M164 60C188 80 196 110 192 140"/></g>`,
    extra: `${eyes(142, 78, 22, '#e0fff8', 3.4)}<g fill="none" stroke="#9ed1c6" stroke-width="1.6" opacity=".6"><path d="M0 232c28 14 50 2 80 12s54 28 92 18 60-16 88-2"/><path d="M0 258c30 12 56 0 86 8s56 22 96 12 56-12 78 0"/><path d="M120 54c-10 10-14 24-12 40"/></g>`,
  }),
  candle: () => ({
    glow: '#ffcf7a',
    shape: `<path d="M84 300C84 252 92 218 108 196L152 196C168 218 176 252 176 300Z"/>
      <rect x="112" y="108" width="36" height="92" rx="9"/>
      <path d="M108 120c-6 22-2 38 4 44l4-34zM152 124c6 18 4 34-2 40l-4-30z"/>
      <path d="M96 218C70 238 64 262 64 290L80 290C82 268 90 252 106 238Z"/><path d="M164 218C190 238 196 262 196 290L180 290C178 268 170 252 154 238Z"/>`,
    extra: `${flameAt(130, 92, 1.5, '#ffb347')}<ellipse cx="130" cy="150" rx="40" ry="60" fill="#ffcf7a" opacity=".08" filter="url(#f-blur12)"/>${eyes(130, 152, 14, '#fff0c4', 2.4)}`,
  }),
  monk: () => ({
    glow: '#f08a4a',
    shape: `<path d="M70 300C72 226 84 174 106 136C106 112 116 94 130 92C144 94 154 112 154 136C176 174 188 226 190 300Z"/>
      <path d="M104 150C72 168 52 196 48 234L66 238C72 210 90 190 116 174Z"/><path d="M156 150C190 164 208 192 212 230L194 232C190 208 176 190 150 176Z"/>
      <rect x="122" y="40" width="8" height="260" rx="3" transform="translate(-60 6) rotate(-4 126 170)"/>`,
    extra: `${flameAt(56, 232, 1.2)}${flameAt(203, 228, 1.3)}${flameAt(130, 90, 0.9, '#f06a2a')}${flameAt(92, 250, 0.8)}${flameAt(172, 258, 0.9)}<path d="M86 300c4-30 8-60 18-82" stroke="#f08a4a" stroke-width="1.4" opacity=".4" fill="none"/>${eyes(130, 114, 12, '#ffd1a1')}`,
  }),
  seraph: () => {
    const wing = (m: number) =>
      `<path d="M${130 + m * 4} 120C${130 + m * 100} 50 ${130 + m * 150} 110 ${130 + m * 120} 200C${130 + m * 100} 160 ${130 + m * 60} 150 ${130 + m * 4} 170Z"/>`;
    return {
      glow: '#9bd0ff',
      shape: `${wing(-1)}${wing(1)}<path d="M104 300C106 240 112 190 118 156C108 136 110 112 130 108C150 112 152 136 142 156C148 190 154 240 156 300Z"/><circle cx="130" cy="98" r="16"/>`,
      extra: `<g stroke="#bfe3ff" stroke-width="1.2" opacity=".55" fill="none">${[-1, 1].map((m) => `<path d="M${130 + m * 20} 130L${130 + m * 90} 100M${130 + m * 20} 150L${130 + m * 108} 138M${130 + m * 20} 170L${130 + m * 104} 176M${130 + m * 70} 80L${130 + m * 96} 190"/>`).join('')}</g>
        <g opacity=".42">${[[-1, 108, 120, '#5aa8ff'], [1, 108, 124, '#e8a94a'], [-1, 140, 150, '#d94a4a'], [1, 140, 154, '#7ee0a0'], [-1, 168, 176, '#e8a94a'], [1, 170, 180, '#5aa8ff']].map(([m, x, y, c]) => `<polygon points="${130 + (m as number) * 40},${y} ${130 + (m as number) * 70},${(y as number) - 14} ${130 + (m as number) * 80},${(y as number) + 14}" fill="${c}"/>`).join('')}</g>
        <ellipse cx="130" cy="64" rx="26" ry="7" fill="none" stroke="#fff3c0" stroke-width="2.4" filter="url(#f-blur2)"/>${eyes(130, 100, 12, '#ffffff')}`,
    };
  },
  reaper: () => ({
    glow: '#d94a4a',
    shape: `<path d="M64 300L72 252L84 296L96 240L112 296L126 232L140 296L158 238L172 296L184 246L196 300Z"/>
      <path d="M78 262C80 200 94 156 112 128C106 102 114 82 130 80C146 82 154 102 148 128C166 156 180 200 182 262Z"/>
      <path d="M110 134C80 170 66 210 70 250L86 250C86 214 98 180 120 152Z"/>
      <rect x="198" y="-10" width="6" height="310" rx="3" transform="rotate(8 200 150)"/>
      <path d="M196 -4C260 4 262 74 220 110C236 66 216 36 192 26Z"/>
      <path d="M120 78l-8-26 10 12 8-18 8 18 10-12-8 26z"/>`,
    extra: `${eyes(130, 100, 12, '#ff8f8f', 2.8)}<path d="M196 -4C260 4 262 74 220 110" stroke="#ffb0b0" stroke-width="1.2" fill="none" opacity=".6"/>`,
  }),
  choirmaster: () => ({
    glow: '#e8a94a',
    shape: `<path d="M84 300L96 168C100 136 112 122 130 120C148 122 160 136 164 168L176 300L152 276L130 300L108 276Z"/>
      <circle cx="130" cy="96" r="19"/><path d="M110 92c2-26 14-36 20-36s18 10 20 36z"/>
      <path d="M104 146C74 130 58 96 62 56L76 58C76 92 92 118 118 130Z"/>
      <path d="M156 146C186 130 202 96 198 56L184 58C184 92 168 118 142 130Z"/>
      <path d="M198 56L232 4" stroke="#050607" stroke-width="5" stroke-linecap="round"/>
      <g opacity=".95">${[0, 1, 2, 3, 4].map((i) => `<path d="M${18 + i * 52} 300c0-26 8-40 20-40s20 14 20 40z"/><circle cx="${38 + i * 52}" cy="252" r="9"/>`).join('')}</g>`,
    extra: `<g stroke="#e8a94a" stroke-width="1" opacity=".5" fill="none">${[0, 1, 2, 3, 4].map((i) => `<path d="M${40 + i * 4} ${30 + i * 8}h180"/>`).join('')}<circle cx="60" cy="42" r="3"/><circle cx="104" cy="58" r="3"/><circle cx="156" cy="38" r="3"/><circle cx="192" cy="62" r="3"/></g>${eyes(130, 98, 12, '#ffe0a0', 2.4)}<circle cx="232" cy="4" r="4" fill="#ffe0a0" filter="url(#f-blur2)"/>`,
  }),
};

/** Портрет врага (viewBox 260×300), прозрачный фон — кладётся на сцену. */
export function enemyArt(key: string): string {
  const k = `e:${key}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const f = (FIGS[key] ?? FIGS.alban)();
  const svg = `<svg viewBox="0 0 260 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
  <ellipse cx="130" cy="150" rx="124" ry="136" fill="${f.glow}" opacity=".16" filter="url(#f-blur12)"/>
  <ellipse cx="130" cy="292" rx="96" ry="9" fill="#000" opacity=".55" filter="url(#f-blur5)"/>
  <g fill="${f.glow}" opacity=".5" filter="url(#f-blur5)">${f.shape}</g>
  <g fill="#050608" stroke="${f.glow}" stroke-width="1.3" stroke-opacity=".6" filter="url(#f-rough)">${f.shape}</g>
  ${f.extra ?? ''}
  <rect x="0" y="246" width="260" height="54" fill="url(#g-fog)"/>
  </svg>`;
  cache.set(k, svg);
  return svg;
}

/* ───────── Сцены (фон боя / карты / хаба) — viewBox 400×700 ───────── */
export function sceneArt(kind: 'c1' | 'c2' | 'c3' | 'hub' | 'map1' | 'map2' | 'title'): string {
  const k = `s:${kind}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const base = kind.startsWith('map') ? (kind === 'map1' ? 'c1' : 'c2') : kind === 'title' ? 'hub' : kind;
  const pal = palOf(base);
  const r = Rng.fromSeed(`scene-${kind}`);
  let arches = '';
  if (base === 'c2') {
    // рёбра собора: тяжёлые дуги
    for (let i = 0; i < 6; i++) {
      const x = -40 + i * 90;
      arches += `<path d="M${x} 700C${x + 10} 380 ${x + 60} 200 ${x + 140} 120" fill="none" stroke="#07080b" stroke-width="${22 - i * 1.5}" stroke-linecap="round" opacity="${0.55 + (i % 3) * 0.1}"/>`;
      arches += `<path d="M${x + 200} 700C${x + 190} 380 ${x + 140} 200 ${x + 60} 120" fill="none" stroke="#07080b" stroke-width="${22 - i * 1.5}" stroke-linecap="round" opacity="${0.5 + (i % 3) * 0.1}"/>`;
    }
  } else if (base === 'c1') {
    // затопленный рынок: арки и кровли
    for (let i = 0; i < 7; i++) {
      const x = i * 60 - 10;
      const hgt = 120 + r.next() * 130;
      arches += `<path d="M${x} 430v-${hgt}l30-34 30 34v${hgt}z" fill="#0a1110" opacity="${0.5 + r.next() * 0.3}"/>`;
      if (r.chance(0.5)) arches += `<rect x="${x + 18}" y="${430 - hgt + 14}" width="14" height="22" rx="7" fill="#e8c277" opacity=".14"/>`;
    }
  } else if (base === 'hub') {
    // Сальвен: кровли, колокольня
    for (let i = 0; i < 9; i++) {
      const x = i * 48 - 8;
      const hgt = 60 + r.next() * 110;
      arches += `<path d="M${x} 470v-${hgt}l24-30 24 30v${hgt}z" fill="#0a0910" opacity="${0.6 + r.next() * 0.3}"/>`;
      if (r.chance(0.5)) arches += `<rect x="${x + 16}" y="${470 - hgt + 20}" width="9" height="13" fill="#e8a94a" opacity=".5"/>`;
    }
    arches += `<g transform="translate(268 128)"><path d="M-30 460L-22 150L-26 130H26L22 150L30 460Z" fill="#07070c"/><path d="M-30 130L0-26 30 130Z" fill="#07070c"/><path d="M-2-26h4v-22h10v-4h-10v-12h-4v12H-12v4h10z" fill="#07070c"/>
      <path d="M-15 130v-52a15 15 0 0 1 30 0v52z" fill="#e8a94a" opacity=".25" filter="url(#f-blur5)"/><path d="M-15 130v-52a15 15 0 0 1 30 0v52z" fill="#241a10"/>
      <g transform="translate(-13 84) scale(.26)" fill="#050507" stroke="#e8a94a" stroke-opacity=".8" stroke-width="3">${M.bell}</g>
      <g fill="#e8a94a" opacity=".7"><rect x="-3" y="200" width="6" height="14" rx="3"/><rect x="-3" y="260" width="6" height="14" rx="3"/><rect x="-3" y="320" width="6" height="14" rx="3"/></g>
      <path d="M-22 150L22 150" stroke="#e8a94a" stroke-opacity=".35"/></g>`;
  }
  const waterY = base === 'c1' ? 470 : 520;
  const svg = `<svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sc-${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.top}"/><stop offset=".55" stop-color="${pal.mid}"/><stop offset="1" stop-color="${pal.bot}"/></linearGradient>
  <radialGradient id="sg-${kind}" cx="50%" cy="22%" r="60%"><stop offset="0" stop-color="${pal.acc}" stop-opacity=".42"/><stop offset="1" stop-color="${pal.acc}" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="700" fill="url(#sc-${kind})"/>
  <rect width="400" height="700" fill="url(#sg-${kind})"/>
  <g filter="url(#f-paint)">${shafts(r, 400, 700, pal.acc, 4)}${ground(r, 400, 700, 360, 60, pal.mid, 0.7)}</g>
  <g filter="url(#f-rough)">${arches}</g>
  ${base !== 'c2' ? `<g opacity=".55" filter="url(#f-paint)"><rect y="${waterY}" width="400" height="230" fill="#06090b"/><rect y="${waterY}" width="400" height="3" fill="${pal.acc}" opacity=".35"/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${(i * 77) % 360}" y="${waterY + 20 + i * 24}" width="${60 + (i * 31) % 90}" height="2" fill="${pal.acc}" opacity=".18"/>`).join('')}</g>` : ''}
  <rect y="${waterY - 70}" width="400" height="190" fill="url(#g-fog)"/>
  <rect y="300" width="400" height="200" fill="url(#g-fog)" opacity=".6"/>
  <rect width="400" height="700" fill="url(#g-vig)"/>
  <rect width="400" height="700" filter="url(#f-grain)" opacity=".16" style="mix-blend-mode:overlay"/></svg>`;
  cache.set(k, svg);
  return svg;
}

/** Гравюрная виньетка для «последнего видения» — чёрно-белая, штриховая. */
export function visionArt(seed: string, tint = '#d9d2c0'): string {
  const r = Rng.fromSeed(seed);
  let lines = '';
  for (let i = 0; i < 70; i++) {
    const x = r.next() * 400;
    const y = r.next() * 560;
    const len = 20 + r.next() * 120;
    lines += `<path d="M${x} ${y}l${len} ${(r.next() - 0.5) * 6}" stroke="${tint}" stroke-width="${(0.4 + r.next() * 1.2).toFixed(2)}" opacity="${(0.08 + r.next() * 0.26).toFixed(2)}"/>`;
  }
  const rad = 70 + r.next() * 50;
  return `<svg viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="560" fill="#0a0a0c"/>
  <circle cx="${150 + r.next() * 100}" cy="${170 + r.next() * 70}" r="${rad}" fill="${tint}" opacity=".08" filter="url(#f-blur12)"/>
  <g filter="url(#f-ink)">${lines}</g>
  <g filter="url(#f-ink)" fill="#050507" stroke="${tint}" stroke-width="1.3" stroke-opacity=".7"><path d="M0 470c60-30 110-8 170-22s120-40 230-10v122H0z"/><g transform="translate(150 190) scale(2.1)"><path d="M50 4c-14 0-24 12-24 28 0 8 2 12-4 20-8 12-12 26-12 44h80c0-18-4-32-12-44-6-8-4-12-4-20 0-16-10-28-24-28z"/></g></g>
  <rect width="400" height="560" fill="url(#g-vig)"/><rect width="400" height="560" filter="url(#f-grain)" opacity=".3" style="mix-blend-mode:overlay"/></svg>`;
}
