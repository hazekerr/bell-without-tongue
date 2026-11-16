/* Силуэтные персонажи: чёрная форма с одним контурным светом, светящимися глазами и огнём.
   Каждый нарисован своей геометрией (многоугольники и кривые), анимация считается по фазе (подол, огонь, фонарь, дыхание, мигание). */
import { Pix, ell, poly, rect, bar, type Path } from './variants.ts';
import type { Sprite } from './pixel.ts';

type Draw = (p: Pix, ph: number, blink: boolean) => void;
interface Def { w: number; h: number; rim: string; dir: 1 | -1; draw: Draw }

const wob = (ph: number, i: number, a = 1.2) => Math.sin(ph * 1.57 + i * 0.9) * a;
/** Зубчатый подол с лёгким колыханием. */
const hem = (x0: number, x1: number, y: number, n: number, ph: number, d = 3, a = 1.2): number[][] =>
  Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y + (i % 2 ? d : 0) + wob(ph, i, a)]);
const eyes = (p: Pix, blink: boolean, c: string, pts: [number, number][], w = 3, h = 2) => {
  for (const [x, y] of pts) p.accent(blink ? rect(x, y + h - 1, x + w, y + h) : rect(x, y, x + w, y + h), blink ? '#0a0b11' : c);
};
const flame = (p: Pix, x: number, y: number, s: number, ph: number, c1 = '#ff9a3a', c2 = '#fff0c0') => {
  const k = s * (1 + wob(ph, 2, 0.12)), sw = wob(ph, 5, 1);
  p.accent(poly([[x, y - 9 * k], [x + 4 * k + sw, y - 1 * k], [x + 2.5 * k, y + 3 * k], [x - 2.5 * k, y + 3 * k], [x - 4 * k + sw, y - 1 * k]]), c1);
  p.accent(poly([[x, y - 4 * k], [x + 1.8 * k, y], [x, y + 2.4 * k], [x - 1.8 * k, y]]), c2);
};

/* ───── Могильщик ───── */
const gravedigger: Draw = (p, ph, bl) => {
  p.x.translate(0, ph % 2 ? 0 : 0);
  p.shape(bar(14, 66, 21, 12, 2.4), [] as never, [12, 10, 24, 68]);
  p.shape(poly([[15, 3], [25, 3], [26, 11], [20, 15], [14, 11]]), [] as never, [14, 3, 26, 15]);
  p.shape(rect(22, 76, 30, 84), [] as never, [22, 76, 30, 84]); p.shape(rect(34, 76, 42, 84), [] as never, [34, 76, 42, 84]);
  p.shape(poly([[22, 27], [40, 27], [44, 50], [47, 78], [15, 78], [18, 50]]), [] as never, [15, 27, 47, 78]);
  p.shape(ell(31, 27, 10, 4), [] as never, [21, 23, 41, 31]);
  const lx = 51 + wob(ph, 1, 1.6);
  p.shape(bar(39, 31, 47, 52, 6), [] as never, [38, 30, 50, 54]);
  p.shape(bar(23, 31, 17, 56, 5), [] as never, [14, 30, 24, 58]);
  p.shape(ell(31, 21, 8, 8), [] as never, [23, 13, 39, 29]);
  p.shape(poly([[22, 16], [24, 4], [38, 4], [40, 16]]), [] as never, [22, 4, 40, 16]);
  p.shape(ell(31, 17, 15, 4), [] as never, [16, 13, 46, 21]);
  p.accent(bar(48, 52, lx, 56, 1), '#8a5a2b');
  p.accent(rect(lx - 3.5, 56, lx + 3.5, 66), '#e8a94a'); p.accent(rect(lx - 2, 58, lx + 2, 64), '#fff0c0');
  p.accent(ell(lx, 61, 8, 8), 'rgba(232,169,74,.18)');
  eyes(p, bl, '#fff0c0', [[27, 21], [33, 21]]);
  p.accent(poly([[29, 38], [33, 38], [34, 43], [28, 43]]), '#e8a94a');
};

/* ───── Свечница ───── */
const wickkeeper: Draw = (p, ph, bl) => {
  for (let k = -2; k <= 2; k++) {
    const x = 30 + k * 6, y = 8 + Math.abs(k) * 2;
    p.shape(rect(x - 1.6, y, x + 1.6, y + 7), [] as never, [x - 2, y, x + 2, y + 7]);
    flame(p, x, y - 3, 0.5, ph + k);
  }
  p.shape(ell(30, 24, 10, 11), [] as never, [20, 13, 40, 35]);
  p.shape(poly([[22, 18], [30, 12], [38, 18], [40, 34], [20, 34]]), [] as never, [20, 12, 40, 34]);
  p.shape(poly([[24, 32], [36, 32], [40, 48], [18, 48]]), [] as never, [18, 32, 40, 48]);
  p.shape(poly([[22, 34], [38, 34], [44, 56], [50, 88], ...hem(50, 10, 88, 8, ph, 3, 1.1), [16, 56]]), [] as never, [10, 34, 50, 92]);
  p.shape(bar(46, 30, 48, 90, 2.4), [] as never, [44, 20, 52, 92]);
  p.shape(rect(45, 18, 51, 28), [] as never, [45, 18, 51, 28]);
  flame(p, 48, 14, 0.9, ph + 1);
  p.shape(ell(45, 44, 3, 3.4), [] as never, [42, 41, 48, 48]);
  eyes(p, bl, '#e8a94a', [[25, 23], [32, 23]]);
  p.accent(rect(24, 36, 26, 40), '#e6d9b8'); p.accent(rect(35, 38, 37, 43), '#e6d9b8'); p.accent(rect(27, 60, 29, 64), '#e6d9b8');
};

/* ───── Утопленница-прачка ───── */
const laundress: Draw = (p, ph, bl) => {
  p.shape(poly([[20, 12], [44, 12], [50, 80], [14, 80]]), [] as never, [14, 12, 50, 80]);
  p.shape(poly([[24, 30], [40, 30], [47, 80], [17, 80]]), [] as never, [17, 30, 47, 80]);
  p.shape(poly([[6, 48], [28, 46], [30, 74], [9, 78]]), [] as never, [6, 46, 30, 78]);
  p.shape(bar(26, 34, 20, 50, 4.5), [] as never, [16, 32, 30, 52]); p.shape(bar(38, 34, 40, 50, 4.5), [] as never, [36, 32, 44, 52]);
  p.shape(ell(32, 21, 8, 10), [] as never, [24, 11, 40, 31]);
  p.shape(bar(23, 26, 21, 66, 4), [] as never, [18, 24, 26, 68]); p.shape(bar(41, 26, 44, 62, 4), [] as never, [39, 24, 47, 64]);
  const d1 = (ph * 2.4) % 6, d2 = (ph * 2.4 + 3) % 6;
  p.accent(rect(12, 79 + d1 * 0.4, 14, 83 + d1 * 0.4), '#9ec8d4'); p.accent(rect(22, 78 + d2 * 0.4, 24, 82 + d2 * 0.4), '#9ec8d4');
  for (let i = 0; i < 3; i++) p.accent(rect(9, 54 + i * 8, 28, 55 + i * 8), 'rgba(158,200,212,.45)');
  eyes(p, bl, '#bfe6ff', [[28, 20]]); p.accent(rect(34, 20, 37, 22), '#05060a');
  p.accent(ell(20, 51, 2.6, 2.6), '#a9cdb8'); p.accent(ell(40, 51, 2.6, 2.6), '#a9cdb8');
};

/* ───── Свечник ───── */
const candle: Draw = (p, ph, bl) => {
  p.shape(poly([[12, 30], [32, 30], [38, 56], [6, 56]]), [] as never, [6, 30, 38, 56]);
  p.shape(rect(13, 10, 31, 32), [] as never, [13, 10, 31, 32]);
  p.shape(ell(22, 11, 9, 3), [] as never, [13, 8, 31, 14]);
  p.shape(bar(33, 34, 40, 42, 3), [] as never, [32, 33, 42, 44]);
  p.shape(rect(39, 42, 44, 50), [] as never, [39, 42, 44, 50]);
  flame(p, 22, 4, 1.15, ph); flame(p, 41.5, 38, 0.55, ph + 2);
  eyes(p, bl, '#fff0c0', [[17, 17], [24, 17]], 3, 3);
  p.accent(ell(22, 8, 14, 14), 'rgba(255,200,110,.15)');
};

/* ───── Утонувший звонарь ───── */
const bellman: Draw = (p, ph, bl) => {
  p.shape(ell(36, 6, 3.4, 3.4), [] as never, [32, 3, 40, 9]);
  p.shape(poly([[27, 10], [45, 10], [49, 24], [56, 40], [58, 46], [14, 46], [16, 40], [23, 24]]), [] as never, [14, 10, 58, 46]);
  p.shape(poly([[24, 46], [48, 46], [54, 70], [60, 98], ...hem(60, 12, 98, 9, ph, 3, 1.4), [18, 70]]), [] as never, [12, 46, 60, 102]);
  p.shape(bar(36, 46, 36, 80, 2), [] as never, [34, 46, 38, 82]);
  p.shape(ell(30, 62, 4, 3.4), [] as never, [26, 59, 34, 66]); p.shape(ell(42, 70, 4, 3.4), [] as never, [38, 67, 46, 74]);
  p.accent(bar(36, 52, 36, 80, 1.4), '#8a5a2b'); p.accent(rect(33, 80, 39, 86), '#8a5a2b');
  p.accent(ell(36, 46, 17, 2.6), '#05060a');
  eyes(p, bl, '#bfe6ff', [[27, 44], [41, 44]], 3, 3);
  p.accent(rect(30, 24, 32, 38), 'rgba(232,169,74,.55)');
};

/* ───── Певчая ракушка ───── */
const mussel: Draw = (p, ph, bl) => {
  const open = 3 + Math.sin(ph * 1.57) * 1.6;
  p.shape(ell(30, 34 + open, 26, 8), [] as never, [4, 28, 56, 46]);
  p.shape(ell(30, 19 - open * 0.4, 26, 16), [] as never, [4, 3, 56, 35]);
  p.accent(rect(8, 26 - open * 0.4, 52, 29 + open), '#7a1f24');
  for (let i = 0; i < 8; i++) { const x = 10 + i * 5.2; p.accent(poly([[x, 26 - open * 0.4], [x + 2.4, 26 - open * 0.4], [x + 1.2, 30 - open * 0.4]]), '#e6dcc4'); p.accent(poly([[x, 31 + open], [x + 2.4, 31 + open], [x + 1.2, 27 + open]]), '#e6dcc4'); }
  p.accent(ell(30, 29, 3, 3), '#fff0c0'); p.accent(ell(30, 29, 7, 7), 'rgba(255,240,192,.15)');
  eyes(p, bl, '#bfe6ff', [[16, 14], [41, 14]], 3, 3);
};

/* ───── Тинный пёс (смотрит влево) ───── */
const hound: Draw = (p, ph, bl) => {
  const t = wob(ph, 0, 2);
  p.shape(poly([[2, 25], [8, 19], [14, 15], [17, 5], [21, 13], [26, 7], [28, 15], [36, 16], [44, 12], [48, 17], [54, 11], [58, 17], [64, 12], [68, 18], [74 + t, 8], [78 + t, 12], [72, 24], [68, 34], [70, 47], [63, 47], [60, 36], [50, 34], [36, 34], [32, 47], [25, 47], [24, 35], [18, 34], [12, 32], [6, 31], [10, 28], [4, 28]]), [] as never, [2, 4, 78, 47]);
  for (let i = 0; i < 4; i++) p.accent(rect(38 + i * 4, 20, 39.6 + i * 4, 31), 'rgba(111,154,138,.55)');
  for (let i = 0; i < 3; i++) p.accent(poly([[5 + i * 2.5, 25], [6.6 + i * 2.5, 25], [5.8 + i * 2.5, 29]]), '#e6dcc4');
  eyes(p, bl, '#ffcf70', [[12, 20]], 3, 2);
  p.accent(rect(60, 46, 62, 49), 'rgba(111,154,138,.8)'); p.accent(rect(26, 46, 28, 48), 'rgba(111,154,138,.8)');
};

/* ───── Каменный рыбак ───── */
const fisher: Draw = (p, ph, bl) => {
  p.shape(poly([[30, 28], [50, 28], [56, 60], [60, 92], ...hem(60, 20, 92, 9, ph, 3, 1), [24, 60]]), [] as never, [20, 28, 60, 96]);
  p.shape(poly([[12, 30], [30, 27], [34, 68], [10, 74]]), [] as never, [10, 27, 34, 74]);
  p.shape(ell(40, 25, 8, 8), [] as never, [32, 17, 48, 33]);
  p.shape(ell(40, 16, 22, 5), [] as never, [18, 11, 62, 21]);
  p.shape(poly([[28, 16], [30, 4], [50, 4], [52, 16]]), [] as never, [28, 4, 52, 16]);
  p.shape(bar(56, 56, 76, 6, 1.8), [] as never, [54, 4, 78, 58]);
  for (let i = 0; i < 6; i++) { p.accent(rect(12, 32 + i * 7, 33, 33 + i * 7), 'rgba(111,154,138,.5)'); }
  for (let i = 0; i < 5; i++) p.accent(rect(13 + i * 5, 28, 14 + i * 5, 72), 'rgba(111,154,138,.35)');
  const sw = wob(ph, 2, 1.2);
  p.accent(bar(76, 6, 76 + sw, 50, 0.9), '#9aa8b0');
  p.accent(poly([[72 + sw, 52], [80 + sw, 52], [78 + sw, 55], [74 + sw, 55]]), '#b9c6cf'); p.accent(poly([[80 + sw, 53.5], [84 + sw, 51], [84 + sw, 56]]), '#b9c6cf');
  eyes(p, bl, '#d3efe0', [[35, 24], [42, 24]]);
};

/* ───── Альбан ───── */
const alban: Draw = (p, ph, bl) => {
  p.shape(poly([[32, 36], [64, 36], [74, 60], [78, 104], [18, 104], [22, 60]]), [] as never, [18, 36, 78, 104]);
  p.shape(ell(48, 27, 10, 10), [] as never, [38, 17, 58, 37]);
  p.shape(poly([[34, 18], [38, 8], [58, 8], [62, 18]]), [] as never, [34, 8, 62, 18]);
  p.shape(ell(48, 18, 17, 4), [] as never, [31, 14, 65, 22]);
  p.shape(bar(84, 22, 84, 106, 3.2), [] as never, [80, 20, 88, 108]);
  p.shape(rect(76, 18, 92, 23), [] as never, [76, 18, 92, 23]);
  p.shape(poly([[78, 96], [90, 96], [88, 108], [80, 108]]), [] as never, [78, 96, 90, 108]);
  p.shape(bar(70, 40, 80, 62, 7), [] as never, [66, 38, 84, 66]); p.shape(bar(26, 40, 14, 60, 7), [] as never, [10, 38, 30, 64]);
  const lx = 14 + wob(ph, 1, 1.2);
  p.accent(bar(14, 60, lx, 66, 1.2), '#8a5a2b'); p.accent(rect(lx - 4, 66, lx + 4, 78), '#e8a94a'); p.accent(rect(lx - 2, 68, lx + 2, 76), '#fff0c0'); p.accent(ell(lx, 72, 11, 11), 'rgba(232,169,74,.18)');
  eyes(p, bl, '#ffd68a', [[42, 25], [51, 25]]);
  for (let i = 0; i < 3; i++) p.accent(ell(40 + i * 8, 62, 2.2, 2.2), '#c0833a');
};

/* ───── Пепельный монах ───── */
const monk: Draw = (p, ph, bl) => {
  p.shape(ell(32, 18, 11, 12), [] as never, [21, 6, 43, 30]);
  p.shape(poly([[24, 26], [40, 26], [46, 54], [52, 88], ...hem(52, 12, 88, 8, ph, 3, 1.1), [18, 54]]), [] as never, [12, 26, 52, 92]);
  p.shape(bar(54, 10, 54, 90, 2.4), [] as never, [50, 8, 58, 92]);
  p.shape(bar(24, 36, 12, 52, 6), [] as never, [8, 34, 28, 56]); p.shape(bar(40, 36, 50, 50, 6), [] as never, [36, 34, 54, 54]);
  flame(p, 54, 6, 1.1, ph); flame(p, 10, 50, 0.9, ph + 1); flame(p, 48, 52, 0.8, ph + 2); flame(p, 32, 6, 0.7, ph + 3); flame(p, 20, 70, 0.6, ph + 1);
  eyes(p, bl, '#ffd1a1', [[27, 16], [34, 16]]);
};

/* ───── Стеклянный серафим ───── */
const seraph: Draw = (p, ph, bl) => {
  const lift = Math.sin(ph * 1.57) * 2.4;
  p.x.translate(0, lift);
  for (const s of [-1, 1]) {
    const X = (d: number) => 50 + s * d;
    const wing = poly([[X(6), 38], [X(20), 14], [X(40), 6], [X(48), 22], [X(44), 40], [X(36), 58], [X(26), 66], [X(14), 56]]);
    p.shape(wing, [] as never, [Math.min(X(6), X(48)), 6, Math.max(X(6), X(48)), 66], s === 1 ? 1 : -1);
    const cols = ['#4f84b0', '#7a5aa0', '#b83a32', '#e8a94a', '#6f9a8a'];
    p.x.save(); p.x.beginPath(); wing(p.x); p.x.clip();
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) { p.x.fillStyle = cols[(r + c) % 5]; p.x.globalAlpha = 0.78; p.x.fillRect(Math.min(X(4 + c * 9), X(12 + c * 9)), 8 + r * 10 + 1, 7, 8); }
    p.x.restore(); p.x.globalAlpha = 1;
  }
  p.shape(poly([[44, 34], [56, 34], [60, 98], [40, 98]]), [] as never, [40, 34, 60, 98]);
  p.shape(ell(50, 24, 7, 9), [] as never, [43, 15, 57, 33]);
  p.x.strokeStyle = '#ffd36a'; p.x.lineWidth = 1.6; p.x.beginPath(); p.x.ellipse(50, 10, 10, 3, 0, 0, Math.PI * 2); p.x.stroke();
  eyes(p, bl, '#ffffff', [[46, 23], [51, 23]], 2, 2);
  p.accent(ell(50, 12, 16, 8), 'rgba(255,211,106,.14)');
};

/* ───── Жнец Хора ───── */
const reaper: Draw = (p, ph, bl) => {
  p.shape(bar(56, 14, 58, 100, 2.6), [] as never, [54, 12, 61, 102], -1);
  p.shape(poly([[56, 8], [34, 3], [14, 14], [10, 26], [18, 19], [34, 12], [56, 15]]), [] as never, [10, 3, 58, 26], -1);
  p.shape(poly([[38, 3], [28, 12], [24, 30], [18, 56], [8, 92], ...hem(8, 62, 96, 10, ph, 4, 1.3), [62, 92], [54, 56], [48, 30], [46, 12]]), [] as never, [8, 3, 62, 100], -1);
  p.shape(poly([[37, -1], [29, 12], [45, 12]]), [] as never, [29, 0, 45, 12], -1);
  p.shape(bar(46, 34, 54, 44, 5), [] as never, [44, 32, 56, 46], -1);
  p.accent(poly([[35, 42], [41, 42], [44, 96], [32, 96]]), 'rgba(122,31,36,.55)');
  p.accent(rect(36, 5, 39, 9), '#e8a94a');
  p.accent(rect(33, 31, 41, 33), '#cfc7b2');
  p.accent(rect(34, 31, 35, 33), '#12141c'); p.accent(rect(36, 31, 37, 33), '#12141c'); p.accent(rect(38, 31, 39, 33), '#12141c');
  eyes(p, bl, '#ff5a46', [[31, 22], [40, 22]], 3, 3);
  p.accent(rect(52, 42, 60, 46), '#cfc7b2'); p.accent(rect(52, 52, 60, 56), '#cfc7b2');
};

/* ───── Хормейстер Оттон ───── */
const choirmaster: Draw = (p, ph, bl) => {
  const arm = wob(ph, 0, 1.6);
  p.shape(poly([[36, 38], [56, 38], [63, 70], [72, 112], [56, 104], [46, 114], [36, 104], [20, 112], [29, 70]]), [] as never, [20, 38, 72, 114]);
  p.shape(ell(46, 27, 8, 9), [] as never, [38, 18, 54, 36]);
  p.shape(poly([[36, 20], [32, 8], [40, 14], [42, 2], [46, 12], [50, 2], [52, 14], [60, 8], [56, 20]]), [] as never, [32, 2, 60, 20]);
  p.shape(bar(56, 44, 74, 16 + arm, 4.4), [] as never, [54, 12, 78, 48]); p.shape(bar(36, 44, 20, 22 - arm, 4.4), [] as never, [16, 18, 40, 48]);
  p.shape(bar(74, 16 + arm, 90, 2 + arm, 1.8), [] as never, [72, 0, 92, 18]);
  p.accent(ell(90, 2 + arm, 2.2, 2.2), '#ffe9b0');
  const sheet = (x: number, y: number) => { p.accent(rect(x, y, x + 11, y + 8), '#d9d2c0'); for (let i = 0; i < 3; i++) p.accent(rect(x + 1, y + 1.4 + i * 2.2, x + 10, y + 2.2 + i * 2.2), '#33343c'); };
  sheet(2, 34 + arm); sheet(76, 52 - arm); sheet(4, 76);
  p.accent(poly([[43, 44], [49, 44], [46, 60]]), '#d9d2c0');
  eyes(p, bl, '#fff0c0', [[41, 25], [47, 25]], 3, 2);
  p.accent(ell(46, 33, 3, 2), '#1a1418');
  p.accent(rect(63, 22, 65, 28), '#e8a94a'); p.accent(rect(66, 18, 68, 24), '#e8a94a');
};

/* ───── Привратник Колодца ───── */
const gatekeeper: Draw = (p, ph, bl) => {
  p.shape(poly([[34, 36], [66, 36], [72, 80], [82, 122], [18, 122], [28, 80]]), [] as never, [18, 36, 82, 122]);
  p.shape(poly([[38, 4], [62, 4], [66, 20], [62, 32], [38, 32], [34, 20]]), [] as never, [34, 4, 66, 32]);
  p.shape(poly([[50, 0], [46, 6], [54, 6]]), [] as never, [46, 0, 54, 6]);
  p.shape(ell(26, 40, 15, 9), [] as never, [11, 31, 41, 49]); p.shape(ell(74, 40, 15, 9), [] as never, [59, 31, 89, 49]);
  p.shape(poly([[14, 36], [10, 26], [20, 33]]), [] as never, [10, 26, 20, 36]); p.shape(poly([[86, 36], [90, 26], [80, 33]]), [] as never, [80, 26, 90, 36]);
  p.shape(bar(90, 50, 90, 120, 3.4), [] as never, [86, 46, 94, 122]);
  p.shape(poly([[86, 104], [96, 104], [96, 108], [90, 108], [90, 112], [96, 112], [96, 116], [86, 116]]), [] as never, [86, 104, 96, 116]);
  p.x.strokeStyle = '#c0833a'; p.x.lineWidth = 2.4; p.x.beginPath(); p.x.arc(90, 42, 8, 0, Math.PI * 2); p.x.stroke();
  p.x.strokeStyle = 'rgba(142,141,146,.7)'; p.x.lineWidth = 1; for (let i = 0; i < 4; i++) { p.x.beginPath(); p.x.moveTo(26, 52 + i * 12); p.x.lineTo(74, 52 + i * 12); p.x.stroke(); }
  p.accent(blink0(bl) ? rect(40, 18, 60, 19) : rect(40, 16, 60, 20), '#ff5a46');
  p.accent(ell(50, 18, 22, 10), 'rgba(255,90,70,.12)');
  void ph;
};
const blink0 = (b: boolean) => b;

/* ───── Мать Приливов ───── */
const tide: Draw = (p, ph, bl) => {
  const crest: number[][] = [];
  for (let i = 0; i <= 16; i++) crest.push([i * 7.5, 118 + Math.sin(i * 1.1 + ph * 1.57) * 6]);
  p.shape(poly([[60, 4], [46, 16], [42, 40], [30, 66], [10, 100], [0, 122], ...crest, [120, 122], [110, 100], [90, 66], [78, 40], [74, 16]]), [] as never, [0, 4, 120, 132], -1);
  p.shape(bar(42, 50, 12, 74 + wob(ph, 1, 3), 8), [] as never, [6, 46, 50, 84], -1); p.shape(bar(78, 50, 108, 74 + wob(ph, 3, 3), 8), [] as never, [70, 46, 114, 84], -1);
  for (let k = 0; k < 4; k++) p.shape(bar(50 + k * 7, 28, 44 + k * 9 + wob(ph, k, 2), 104, 3.4), [] as never, [36, 28, 90, 108], -1);
  p.shape(poly([[10, 74], [6, 84], [12, 80], [14, 88], [18, 78]]), [] as never, [6, 74, 18, 88], -1); p.shape(poly([[108, 74], [112, 84], [106, 80], [104, 88], [102, 78]]), [] as never, [102, 74, 112, 88], -1);
  for (let i = 0; i < 12; i++) p.accent(ell(8 + i * 9.4, 116 + Math.sin(i * 1.7 + ph * 1.57) * 6, 2.2, 1.4), '#d6f0ec');
  for (const [x, y] of [[22, 70], [96, 62], [30, 40], [88, 90]]) p.accent(ell(x, y + wob(ph, x, 2), 2, 2), 'rgba(214,240,236,.7)');
  eyes(p, bl, '#e0fff8', [[50, 21], [66, 21]], 4, 3);
  p.accent(ell(60, 23, 14, 8), 'rgba(224,255,248,.12)');
};


/* ───── Звонарь (герой): колокол за спиной, железный язык в руке ───── */
const bellringer: Draw = (p, ph, bl) => {
  p.shape(poly([[8, 12], [24, 12], [30, 40], [34, 52], [4, 52], [8, 40]]), [] as never, [4, 12, 34, 52]);
  p.shape(poly([[22, 27], [40, 27], [45, 52], [49, 80], ...hem(49, 13, 80, 7, ph, 3, 0.9), [17, 52]]), [] as never, [13, 27, 49, 84]);
  p.shape(ell(31, 21, 8, 8), [] as never, [23, 13, 39, 29]);
  p.shape(poly([[21, 20], [31, 5], [41, 20], [42, 30], [20, 30]]), [] as never, [20, 5, 42, 30]);
  p.shape(bar(38, 32, 48, 52, 5.4), [] as never, [36, 30, 52, 56]);
  const sw = wob(ph, 1, 1.4);
  p.shape(bar(48, 52, 54 + sw, 22, 2.6), [] as never, [46, 12, 60, 56]);
  p.shape(ell(54 + sw, 17, 4.4, 5.4), [] as never, [49, 12, 60, 24]);
  p.shape(bar(24, 32, 20, 54, 5), [] as never, [16, 30, 28, 58]);
  p.shape(rect(22, 80, 30, 86), [] as never, [22, 80, 30, 86]); p.shape(rect(34, 80, 42, 86), [] as never, [34, 80, 42, 86]);
  p.accent(bar(11, 20, 22, 52, 0.9), 'rgba(232,169,74,.65)');
  p.accent(ell(18, 52, 12, 1.8), '#05060a');
  p.accent(rect(33, 51, 35, 56), '#e8a94a');
  eyes(p, bl, '#fff0c0', [[27, 20], [34, 20]]);
  p.accent(poly([[29, 38], [33, 38], [34, 43], [28, 43]]), '#e8a94a');
  p.accent(ell(54 + sw, 17, 6.5, 7.5), 'rgba(232,169,74,.13)');
};

/* ───── Тень хориста: поёт одну строчку ───── */
const shade: Draw = (p, ph, bl) => {
  const lean = wob(ph, 0, 1.2);
  p.shape(poly([[20, 28], [32, 28], [40, 56], [44, 84], ...hem(44, 6, 84, 8, ph, 4, 2.4), [10, 56]]), [] as never, [6, 28, 44, 92]);
  p.shape(ell(26 + lean, 18, 7.5, 9.5), [] as never, [18, 8, 34, 28]);
  p.shape(bar(26, 28, 26 + lean, 22, 5), [] as never, [20, 20, 32, 30]);
  p.shape(poly([[18, 12], [26 + lean, 4], [35, 12]]), [] as never, [16, 4, 36, 14]);
  p.shape(bar(15, 40, 24, 54, 4), [] as never, [12, 38, 28, 56]); p.shape(bar(37, 40, 28, 54, 4), [] as never, [26, 38, 40, 56]);
  p.accent(rect(20, 50, 33, 60), 'rgba(217,210,192,.9)'); for (let i = 0; i < 3; i++) p.accent(rect(21.5, 52 + i * 2.6, 31.5, 52.8 + i * 2.6), '#33343c');
  const m = 1 + Math.sin(ph * 3.14) * 0.4;
  p.accent(ell(26 + lean, 19, 3, 4 * m), '#bfe6ff');
  eyes(p, bl, '#bfe6ff', [[22 + lean, 14], [28 + lean, 14]], 2, 2);
  for (let k = 0; k < 3; k++) { p.x.strokeStyle = `rgba(191,230,255,${0.45 - k * 0.12})`; p.x.lineWidth = 1; p.x.beginPath(); p.x.arc(30 + lean, 19, 6 + k * 4 + ((ph * 3) % 4), -0.8, 0.8); p.x.stroke(); }
};

/* ───── Ледяной горгул ───── */
const gargoyle: Draw = (p, ph, bl) => {
  const fl = wob(ph, 0, 1.4);
  p.shape(rect(18, 60, 62, 70), [] as never, [18, 60, 62, 70]);
  for (const s of [-1, 1]) {
    const X = (d: number) => 40 + s * d;
    p.shape(poly([[X(8), 36], [X(26), 8 + fl], [X(40), 14 + fl], [X(34), 30], [X(38), 44], [X(22), 48], [X(10), 52]]), [] as never, [Math.min(X(4), X(40)), 8, Math.max(X(4), X(40)), 52], s === 1 ? 1 : -1);
  }
  p.shape(ell(40, 48, 15, 14), [] as never, [25, 34, 55, 62]);
  p.shape(ell(40, 30, 9, 8.5), [] as never, [31, 21, 49, 39]);
  p.shape(poly([[33, 26], [29, 12], [37, 22]]), [] as never, [29, 12, 37, 26]); p.shape(poly([[47, 26], [51, 12], [43, 22]]), [] as never, [43, 12, 51, 26]);
  p.shape(poly([[26, 56], [20, 68], [30, 68]]), [] as never, [20, 56, 30, 68]); p.shape(poly([[54, 56], [60, 68], [50, 68]]), [] as never, [50, 56, 60, 68]);
  p.shape(poly([[52, 56], [68, 50], [72, 58], [60, 62]]), [] as never, [52, 50, 72, 62]);
  for (const [x, y] of [[28, 38], [52, 38], [34, 50], [46, 50]]) p.accent(poly([[x, y - 5], [x + 2, y], [x, y + 2], [x - 2, y]]), 'rgba(191,230,255,.85)');
  eyes(p, bl, '#bfe6ff', [[35, 29], [43, 29]], 3, 2);
  p.accent(ell(40, 30, 14, 10), 'rgba(191,230,255,.1)');
};

/* ───── Склепный страж ───── */
const knight: Draw = (p, ph, bl) => {
  p.shape(poly([[26, 36], [46, 36], [52, 62], [56, 96], [16, 96], [20, 62]]), [] as never, [16, 36, 56, 96]);
  p.shape(poly([[26, 6], [46, 6], [48, 20], [46, 32], [26, 32], [24, 20]]), [] as never, [24, 6, 48, 32]);
  p.shape(poly([[36, 0], [32, 8], [40, 8]]), [] as never, [32, 0, 40, 8]);
  p.shape(poly([[10, 38], [30, 36], [30, 72], [20, 82], [10, 72]]), [] as never, [10, 36, 30, 82]);
  p.shape(bar(46, 42, 62, 22, 4.4), [] as never, [44, 18, 66, 46]);
  p.shape(bar(62, 22, 66 + wob(ph, 0, 0.6), 0, 2.6), [] as never, [60, -2, 70, 24]);
  p.shape(bar(56, 24, 70, 28, 2), [] as never, [54, 22, 72, 30]);
  p.accent(rect(18, 44, 22, 66), 'rgba(217,210,192,.55)'); p.accent(rect(13, 52, 27, 55), 'rgba(217,210,192,.55)');
  p.accent(poly([[36, 0], [30, -4], [38, 4]]), '#b83a32');
  p.accent(bl ? rect(28, 19, 44, 20) : rect(28, 18, 44, 21), '#bfe6ff');
  p.accent(ell(36, 20, 14, 7), 'rgba(191,230,255,.12)');
};

/* ───── Агнета Седьмая (элита) ───── */
const agneta: Draw = (p, ph, bl) => {
  const hv = wob(ph, 0, 2.2);
  p.shape(poly([[34, 12], [58, 12], [70 + hv, 40], [74 + hv * 1.4, 70], [60, 44], [50, 64], [44, 44], [32, 66], [20, 44], [14 + hv * 1.4, 70], [18 + hv, 40]]), [] as never, [14, 12, 74, 70]);
  p.shape(poly([[34, 36], [58, 36], [64, 70], [70, 108], ...hem(70, 20, 108, 9, ph, 4, 2), [28, 70]]), [] as never, [20, 36, 70, 112]);
  p.shape(ell(46, 28, 9, 11), [] as never, [37, 17, 55, 39]);
  p.shape(bar(36, 44, 22, 22 + hv * 0.6, 5), [] as never, [18, 18, 40, 48]); p.shape(bar(56, 44, 70, 22 - hv * 0.6, 5), [] as never, [54, 18, 74, 48]);
  const wv = (ph * 5) % 8;
  for (let k = 0; k < 3; k++) { p.x.strokeStyle = `rgba(191,230,255,${0.65 - k * 0.2})`; p.x.lineWidth = 1.4; p.x.beginPath(); p.x.arc(40, 30, 14 + k * 9 + wv, Math.PI * 0.7, Math.PI * 1.3); p.x.stroke(); }
  p.accent(ell(46, 32, 3.4, 4.4 * (1 + Math.sin(ph * 4) * 0.25)), '#bfe6ff');
  p.accent(ell(46, 56, 4, 4), '#e8a94a'); p.accent(rect(45, 54, 47, 58), '#7a4a14');
  eyes(p, bl, '#e0f4ff', [[41, 26], [49, 26]], 3, 2);
};

/* ───── Близнецы Хора ───── */
function twin(p: Pix, ph: number, bl: boolean, who: 'a' | 'b') {
  const w = who === 'a' ? 1 : -1;
  p.shape(poly([[30, 34], [50, 34], [57, 64], [64, 104], ...hem(64, 16, 104, 9, ph + (who === 'b' ? 1 : 0), 3, 1.4), [23, 64]]), [] as never, [16, 34, 64, 108]);
  p.shape(poly([[26, 8], [54, 8], [52, 32], [28, 32]]), [] as never, [26, 8, 54, 32]);
  p.shape(poly([[40, 0], [30, 10], [50, 10]]), [] as never, [30, 0, 50, 10]);
  p.shape(bar(30, 40, 26, 62, 5), [] as never, [22, 38, 34, 64]); p.shape(bar(50, 40, 54, 62, 5), [] as never, [48, 38, 60, 64]);
  p.accent(poly(w === 1 ? [[28, 14], [40, 14], [40, 32], [28, 32]] : [[40, 14], [52, 14], [52, 32], [40, 32]]), 'rgba(217,210,192,.9)');
  p.accent(rect(34, 36, 46, 38), 'rgba(217,210,192,.4)');
  if (who === 'a') {
    p.shape(bar(66, 10, 66, 104, 2.6), [] as never, [62, 8, 70, 106]);
    const sw = wob(ph, 0, 2.4);
    p.shape(poly([[58, 14], [74, 14], [78, 30 + sw * 0.2], [84, 40], [48, 40], [54, 30]]), [] as never, [48, 14, 84, 40]);
    p.accent(rect(62 + sw * 0.3, 40, 68 + sw * 0.3, 46), '#c0833a');
  } else {
    p.shape(bar(14, 20, 14, 100, 2), [] as never, [10, 18, 18, 102]);
    const wv = wob(ph, 1, 1.6);
    p.accent(poly([[4, 40], [24, 40 + wv], [24, 70 + wv], [4, 66]]), '#d9d2c0');
    for (let i = 0; i < 4; i++) p.accent(rect(6, 44 + i * 5 + wv * 0.4, 22, 44.8 + i * 5 + wv * 0.4), '#33343c');
    p.accent(bar(20, 28, 28, 40, 1.2), '#8a5a2b');
  }
  eyes(p, bl, '#fff0c0', [[w === 1 ? 44 : 31, 21], [w === 1 ? 49 : 36, 21]], 3, 2);
}
const twinA: Draw = (p, ph, bl) => twin(p, ph, bl, 'a');
const twinB: Draw = (p, ph, bl) => twin(p, ph, bl, 'b');


/* ───── Исповедник (герой): согнут под бременем, цепи и книга долгов ───── */
const penitent: Draw = (p, ph, bl) => {
  const swing = wob(ph, 0, 2.6);
  p.shape(poly([[22, 30], [42, 30], [48, 56], [52, 84], ...hem(52, 12, 84, 8, ph, 3, 1), [16, 56]]), [] as never, [12, 30, 52, 88]);
  p.shape(ell(30, 28, 9, 8), [] as never, [21, 20, 39, 36]);
  p.shape(poly([[20, 28], [26, 14], [38, 14], [44, 28], [40, 38], [24, 38]]), [] as never, [20, 14, 44, 38]);
  p.shape(bar(26, 34, 20, 58, 5), [] as never, [14, 32, 30, 62]);
  p.shape(bar(40, 34, 46, 58, 5), [] as never, [40, 32, 52, 62]);
  p.shape(rect(36, 50, 52, 66), [] as never, [36, 50, 52, 66]);
  for (let i = 0; i < 5; i++) {
    const x1 = 20 - swing * (i * 0.35), y1 = 60 + i * 5;
    p.accent(rect(x1 - 1.5, y1, x1 + 1.5, y1 + 3.6), i % 2 ? '#8e8d92' : '#4d4c50');
  }
  p.shape(poly([[14, 84], [26, 84], [26, 90], [14, 90]]), [] as never, [14, 84, 26, 90]);
  const bx = 20 - swing * 1.8;
  p.accent(rect(bx - 4, 78, bx + 4, 86), '#4d4c50');
  p.accent(rect(38, 52, 50, 64), '#cfc7b2'); for (let i = 0; i < 4; i++) p.accent(rect(40, 54 + i * 2.6, 48, 54.8 + i * 2.6), '#33343c');
  p.accent(rect(36, 50, 38, 66), '#8a5a2b');
  p.accent(rect(29, 44, 35, 50), '#c0833a'); p.accent(ell(32, 44, 2.6, 2.6), 'rgba(0,0,0,0)');
  eyes(p, bl, '#fff0c0', [[26, 28], [33, 28]]);
};

const DEFS: Record<string, Def> = {
  gravedigger: { w: 64, h: 88, rim: '#e8a94a', dir: 1, draw: gravedigger },
  wickkeeper: { w: 60, h: 94, rim: '#e8a94a', dir: 1, draw: wickkeeper },
  laundress: { w: 64, h: 90, rim: '#9ec8d4', dir: -1, draw: laundress },
  candle: { w: 46, h: 58, rim: '#ffcf7a', dir: -1, draw: candle },
  bellman: { w: 72, h: 104, rim: '#e8a94a', dir: -1, draw: bellman },
  mussel: { w: 60, h: 50, rim: '#9ed1c6', dir: -1, draw: mussel },
  hound: { w: 84, h: 52, rim: '#8bb7a2', dir: -1, draw: hound },
  fisher: { w: 90, h: 100, rim: '#8bb7a2', dir: -1, draw: fisher },
  alban: { w: 96, h: 110, rim: '#d1a45c', dir: -1, draw: alban },
  monk: { w: 64, h: 94, rim: '#f08a4a', dir: -1, draw: monk },
  seraph: { w: 100, h: 106, rim: '#9bd0ff', dir: -1, draw: seraph },
  reaper: { w: 78, h: 106, rim: '#e0603f', dir: -1, draw: reaper },
  choirmaster: { w: 96, h: 118, rim: '#e8a94a', dir: -1, draw: choirmaster },
  gatekeeper: { w: 100, h: 124, rim: '#8e9fb4', dir: -1, draw: gatekeeper },
  tide: { w: 122, h: 134, rim: '#9ed1c6', dir: -1, draw: tide },
  penitent: { w: 64, h: 94, rim: '#e8a94a', dir: 1, draw: penitent },
  bellringer: { w: 64, h: 90, rim: '#e8a94a', dir: 1, draw: bellringer },
  shade: { w: 50, h: 96, rim: '#bfe6ff', dir: -1, draw: shade },
  gargoyle: { w: 82, h: 72, rim: '#9cc3e6', dir: -1, draw: gargoyle },
  knight: { w: 76, h: 100, rim: '#9cc3e6', dir: -1, draw: knight },
  agneta: { w: 88, h: 114, rim: '#bfe6ff', dir: -1, draw: agneta },
  twin_a: { w: 88, h: 110, rim: '#e8a94a', dir: -1, draw: twinA },
  twin_b: { w: 88, h: 110, rim: '#a98bd0', dir: -1, draw: twinB },
};
export const SIL_IDS = Object.keys(DEFS);
export const SIL_NAMES: Record<string, string> = {
  gravedigger: 'Могильщик', wickkeeper: 'Свечница', laundress: 'Утопленница-прачка', candle: 'Свечник', bellman: 'Утонувший звонарь', mussel: 'Певчая ракушка', hound: 'Тинный пёс',
  fisher: 'Каменный рыбак', alban: 'Альбан', monk: 'Пепельный монах', seraph: 'Стеклянный серафим', reaper: 'Жнец Хора', bellringer: 'Звонарь', penitent: 'Исповедник', shade: 'Тень хориста', gargoyle: 'Ледяной горгул', knight: 'Склепный страж', agneta: 'Агнета Седьмая', twin_a: 'Ильм Первый', twin_b: 'Ильва Вторая', choirmaster: 'Хормейстер Оттон', gatekeeper: 'Привратник', tide: 'Мать Приливов',
};

/** Живая отрисовка: каждый кадр заново, холст переиспользуется. Фаза непрерывная, поэтому подол, огонь и фонарь движутся плавно. */
const pool = new Map<string, Pix>();
function live(id: string, d: Def, t: number, phase: number): HTMLCanvasElement {
  const key = `${id}:${phase}`;
  let p = pool.get(key);
  if (!p) {
    p = new Pix(d.w, d.h, 'flat', d.rim, 2);
    const orig = p.shape.bind(p);
    p.shape = (path: Path, mat, bb, dir) => orig(path, mat, bb, dir ?? d.dir);
    pool.set(key, p);
  }
  p.reset();
  const blink = ((t + phase * 0.37) % 4.2) > 4.05;
  d.draw(p, t * 1.25 + phase * 1.7, blink);
  return p.finishSoft();
}

const cache = new Map<string, Sprite>();
export function silSprite(id: string): Sprite {
  const hit = cache.get(id);
  if (hit) return hit;
  const d = DEFS[id] ?? DEFS.reaper;
  const dummy = document.createElement('canvas');
  const s: Sprite = { id, ax: d.w / 2 + 1, w: d.w + 2, h: d.h + 2, frames: [dummy], blink: dummy, k: 2, live: (t, ph) => live(id, d, t, ph) };
  cache.set(id, s);
  return s;
}
