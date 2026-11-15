/* Фоны: нарисованы на низком разрешении и пропущены через палитру, поэтому выглядят как пиксель-арт. */
import { Rng } from '../engine/rng.ts';

const P32 = ['#0b0d12', '#14161f', '#1f2433', '#2b3347', '#263330', '#35514c', '#4f7a6f', '#8fb8a6', '#3a2a1c', '#5a3d24', '#8a5a2b', '#c0833a', '#e8a94a', '#f4cf7a', '#ffe9b0', '#d9d2c0', '#a39d8d', '#6c6a63', '#4a1d1c', '#7a1f24', '#b83a32', '#e0603f', '#2f2440', '#4b3866', '#7a5aa0', '#a98bd0', '#1c2a3a', '#355a80', '#6a9bc7', '#9cc3e6', '#d6ecff', '#000000', '#10201f', '#0e1a1c', '#1b1220', '#3d2530', '#6e3a2c', '#a85a2c', '#15101f', '#221826'];
const R32 = P32.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export type SceneKind = 'c1' | 'c2' | 'hub' | 'title' | 'vision';

function quantize(c: HTMLCanvasElement, dither = 0.07) {
  const ctx = c.getContext('2d')!;
  const im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    const b = (BAYER[y & 3][x & 3] / 16 - 0.5) * dither * 255;
    let best = 0, bd = 1e9;
    for (let k = 0; k < R32.length; k++) { const p = R32[k]; const dr = d[i] + b - p[0], dg = d[i + 1] + b - p[1], db = d[i + 2] + b - p[2]; const dd = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.7; if (dd < bd) { bd = dd; best = k; } }
    const p = R32[best]; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}

function skyGrad(x: CanvasRenderingContext2D, w: number, hz: number, ramp: string[]) {
  const g = x.createLinearGradient(0, 0, 0, hz);
  ramp.forEach((c, i) => g.addColorStop(i / (ramp.length - 1), c));
  x.fillStyle = g; x.fillRect(0, 0, w, hz);
}
function glowDisc(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, halo: string) {
  const g = x.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 4);
  g.addColorStop(0, halo); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(cx - r * 4, cy - r * 4, r * 8, r * 8);
  x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
}
function reflect(x: CanvasRenderingContext2D, cx: number, hz: number, h: number, r: number, col: string) {
  for (let i = 0; i < 22; i++) {
    const y = hz + 3 + i * ((h - hz) / 24);
    x.fillStyle = col.replace('A', String(Math.max(0.05, 0.6 - i * 0.03)));
    const ww = Math.max(6, r * (1.8 - i * 0.06));
    x.fillRect(Math.round(cx - ww / 2 + Math.sin(i * 2.3) * 3), Math.round(y), Math.round(ww), 2);
  }
}

function drawScene(kind: SceneKind, W: number, H: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const r = new Rng(kind.length * 77 + 5);
  const hz = Math.round(H * (kind === 'c1' ? 0.56 : 0.6));
  const K = H / 270;
  if (kind === 'c1') {
    skyGrad(x, W, hz, ['#0e1a1c', '#1f3a38', '#35514c', '#6f9a8a', '#b9d4c4']);
    glowDisc(x, W * 0.62, hz - 30 * K, 22 * K, '#dfeee0', 'rgba(185,212,196,.5)');
    // дальний ряд затопленных арок
    for (let l = 0; l < 3; l++) {
      const col = ['#16282a', '#0f1b1d', '#0a1214'][l];
      for (let i = 0; i < 10; i++) {
        const bw = (34 + r.int(0, 24)) * K, bh = (30 + l * 14 + r.int(0, 36)) * K, bx = i * (W / 9) - bw / 3 + r.int(-10, 10);
        x.fillStyle = col; x.fillRect(bx, hz - bh, bw, bh);
        x.beginPath(); x.arc(bx + bw / 2, hz - bh, bw / 2, Math.PI, 0); x.fill();
        if (r.chance(0.5)) { x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(bx + bw / 2, hz - bh * 0.4, bw * 0.28, Math.PI, 0); x.fillRect(bx + bw * 0.22, hz - bh * 0.4, bw * 0.56, bh * 0.4); x.fill(); }
        if (l === 1 && r.chance(0.6)) { x.fillStyle = '#e8a94a'; x.fillRect(bx + bw * 0.4, hz - bh * 0.7, 3 * K, 4 * K); }
      }
    }
    // гирлянды фонарей
    x.strokeStyle = '#0a1214'; x.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const sx = (i * W) / 4 - 20, ex = sx + W / 4 + 10; x.beginPath(); x.moveTo(sx, 30 * K + (i % 2) * 20); x.quadraticCurveTo((sx + ex) / 2, 66 * K, ex, 30 * K + ((i + 1) % 2) * 20); x.stroke(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = '#e8a94a'; const lx = r.int(10, W - 10), ly = r.int(Math.round(30 * K), Math.round(60 * K)); x.fillRect(lx, ly, 3, 4); x.fillStyle = 'rgba(232,169,74,.25)'; x.fillRect(lx - 2, ly - 2, 7, 8); }
    // вода
    const g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#1b302e'); g.addColorStop(1, '#070d0d');
    x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
    reflect(x, W * 0.62, hz, H, 24 * K, 'rgba(223,238,224,A)');
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(111,154,138,.25)'; x.fillRect(r.int(0, W), r.int(hz + 4, H - 4), r.int(8, 30), 1); }
    // сваи
    for (const px of [W * 0.04, W * 0.97, W * 0.46]) { x.fillStyle = '#080d0e'; x.fillRect(px - 5 * K, hz - 20 * K, 10 * K, 70 * K); x.fillStyle = '#1b302e'; x.fillRect(px - 5 * K, hz - 20 * K, 2 * K, 70 * K); }
  } else if (kind === 'c2') {
    skyGrad(x, W, hz, ['#150f22', '#3a2230', '#7a3a2c', '#c0603a', '#e8a94a']);
    glowDisc(x, W / 2, hz - 10 * K, 40 * K, '#f6cf7a', 'rgba(232,169,74,.55)');
    x.fillStyle = '#ffe9b0'; x.beginPath(); x.arc(W / 2 - 8 * K, hz - 18 * K, 26 * K, 0, 7); x.fill();
    // витражные окна вдали
    for (let i = 0; i < 9; i++) {
      const wx = 20 + i * (W / 9), wh = (50 + r.int(0, 30)) * K;
      x.fillStyle = '#120c18'; x.fillRect(wx, hz - wh, 22 * K, wh); x.beginPath(); x.arc(wx + 11 * K, hz - wh, 11 * K, Math.PI, 0); x.fill();
      const cols = ['#4f84b0', '#7a5aa0', '#b83a32', '#e8a94a'];
      for (let k = 0; k < 4; k++) { x.fillStyle = cols[(i + k) % 4]; x.globalAlpha = 0.55; x.fillRect(wx + 3 * K, hz - wh + 8 * K + k * 10 * K, 16 * K, 7 * K); x.globalAlpha = 1; }
    }
    // рёбра
    x.strokeStyle = '#07080c'; x.lineCap = 'butt';
    const rib = (x0: number, x1: number, top: number, lw: number) => { x.lineWidth = lw; x.beginPath(); x.moveTo(x0, H + 6); x.bezierCurveTo(x0 + (x1 - x0) * 0.05, H * 0.5, x1 - (x1 - x0) * 0.3, top, x1, top - 5); x.stroke(); };
    rib(-12, W * 0.32, 8 * K, 15 * K); rib(26, W * 0.42, 24 * K, 9 * K); rib(W + 12, W * 0.68, 8 * K, 15 * K); rib(W - 26, W * 0.58, 24 * K, 9 * K);
    x.lineWidth = 8 * K; x.beginPath(); x.moveTo(W * 0.32, 4); x.bezierCurveTo(W * 0.42, -14, W * 0.58, -14, W * 0.68, 4); x.stroke();
    const g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#2a1d22'); g.addColorStop(1, '#06070a');
    x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
    reflect(x, W / 2, hz, H, 44 * K, 'rgba(232,169,74,A)');
    for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(180,190,200,.12)'; x.fillRect(r.int(0, W), r.int(hz + 6, H - 4), r.int(10, 36), 1); }
  } else {
    // hub / title: Сальвен у колодца, колокольня справа
    skyGrad(x, W, hz, ['#15101f', '#2b1a2a', '#5a2c28', '#a85a2c', '#e8a94a']);
    if (kind === 'title') glowDisc(x, W * 0.38, hz - 36 * K, 38 * K, '#ffe9b0', 'rgba(255,200,120,.5)'); else glowDisc(x, W * 0.35, hz - 20 * K, 26 * K, '#f6cf7a', 'rgba(232,169,74,.45)');
    for (let l = 0; l < 2; l++) {
      for (let i = 0; i < 18; i++) {
        const bw = (20 + r.int(0, 20)) * K, bh = (24 + l * 10 + r.int(0, 46)) * K, bx = i * (W / 17) - bw / 2;
        x.fillStyle = l ? '#1a1220' : '#120c18'; x.fillRect(bx, hz - bh, bw, bh);
        x.beginPath(); x.moveTo(bx - 2, hz - bh); x.lineTo(bx + bw / 2, hz - bh - bw * 0.7); x.lineTo(bx + bw + 2, hz - bh); x.fill();
        if (r.chance(0.55)) { x.fillStyle = '#e8a94a'; x.fillRect(bx + bw * 0.3, hz - bh * 0.6, 3 * K, 4 * K); }
        if (r.chance(0.3)) { x.fillStyle = '#e8a94a'; x.fillRect(bx + bw * 0.6, hz - bh * 0.3, 3 * K, 4 * K); }
      }
    }
    // колокольня
    const tx = W * (kind === 'title' ? 0.74 : 0.56);
    x.fillStyle = '#07070c'; x.beginPath(); x.moveTo(tx - 14 * K, hz + 6); x.lineTo(tx - 10 * K, hz - 150 * K); x.lineTo(tx + 10 * K, hz - 150 * K); x.lineTo(tx + 14 * K, hz + 6); x.fill();
    x.fillRect(tx - 16 * K, hz - 190 * K, 32 * K, 46 * K);
    x.beginPath(); x.moveTo(tx - 20 * K, hz - 190 * K); x.lineTo(tx, hz - 236 * K); x.lineTo(tx + 20 * K, hz - 190 * K); x.fill();
    x.fillRect(tx - 1, hz - 252 * K, 2, 18 * K); x.fillRect(tx - 6 * K, hz - 246 * K, 12 * K, 2);
    x.fillStyle = '#e8a94a'; x.globalAlpha = 0.28; x.fillRect(tx - 10 * K, hz - 184 * K, 20 * K, 34 * K); x.globalAlpha = 1;
    x.fillStyle = '#0b0a12'; x.beginPath(); x.moveTo(tx - 8 * K, hz - 152 * K); x.lineTo(tx - 7 * K, hz - 170 * K); x.quadraticCurveTo(tx, hz - 188 * K, tx + 7 * K, hz - 170 * K); x.lineTo(tx + 8 * K, hz - 152 * K); x.fill();
    x.fillStyle = '#e8a94a'; for (let k = 0; k < 6; k++) x.fillRect(tx - 1, hz - 120 * K + k * 18 * K, 2 * K, 5 * K);
    const g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#2b1a2a'); g.addColorStop(1, '#07060b');
    x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
    reflect(x, W * 0.35, hz, H, 26 * K, 'rgba(246,207,122,A)');
    for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(232,169,74,.18)'; x.fillRect(r.int(0, W), r.int(hz + 6, H - 4), r.int(10, 30), 1); }
  }
  quantize(c);
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();
export function sceneCanvas(kind: SceneKind, W: number, H = 270): HTMLCanvasElement {
  const k = `${kind}:${W}:${H}`;
  let c = cache.get(k);
  if (!c) { c = drawScene(kind === 'vision' ? 'hub' : kind, W, H); cache.set(k, c); }
  return c;
}

/** Туман: полупрозрачная текстура, прокручивается по горизонтали. */
export function fogTexture(W: number, H: number, seed = 3): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!, r = new Rng(seed);
  for (let i = 0; i < 90; i++) {
    const w = r.int(30, 80), h = r.int(3, 8), px = r.int(0, W), py = r.int(0, H);
    x.fillStyle = 'rgba(190,205,200,.05)';
    for (let k = 0; k < 3; k++) x.fillRect((px + W) % W, py + k * 2, w - k * 8, h - k * 4);
  }
  return c;
}
