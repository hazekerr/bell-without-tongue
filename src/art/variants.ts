/* Три подхода к персонажам для сравнения: силуэт, классический пиксель-арт, чибби.
   Фигуры рисуются кривыми и многоугольниками на малом холсте, затем края делаются чёткими, и добавляется контур. */
type Mat = [string, string, string];
type Path = (x: CanvasRenderingContext2D) => void;
export type Look = 'flat' | 'cel';

const poly = (pts: number[][]): Path => (x) => { x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.closePath(); };
const ell = (cx: number, cy: number, rx: number, ry: number): Path => (x) => { x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
const rect = (x0: number, y0: number, x1: number, y1: number): Path => (x) => { x.rect(x0, y0, x1 - x0, y1 - y0); };
const bar = (x1: number, y1: number, x2: number, y2: number, w: number): Path => {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * (w / 2), ny = (dx / l) * (w / 2);
  return poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
};

const INK = '#07080c';
const M = {
  coat: ['#3a2a1c', '#5a3d24', '#a8672b'] as Mat,
  hat: ['#12141c', '#1d2230', '#3b4660'] as Mat,
  steel: ['#4d4c50', '#8e8d92', '#d9d2c0'] as Mat,
  wood: ['#2e2018', '#51371f', '#8a5a2b'] as Mat,
  bone: ['#8c8672', '#cfc7b2', '#f0ead8'] as Mat,
  cloak: ['#0d1018', '#1d2230', '#364260'] as Mat,
  red: ['#4a1d1c', '#7a1f24', '#c0453a'] as Mat,
  teal: ['#1f3a38', '#35514c', '#6f9a8a'] as Mat,
  hair: ['#0f1a1c', '#1f3a38', '#35514c'] as Mat,
  pale: ['#6f9a8a', '#a9cdb8', '#d6ece0'] as Mat,
  sheet: ['#6a8aa0', '#b9c6cf', '#e6f0f6'] as Mat,
  dark: ['#05060a', '#0a0b11', '#10121a'] as Mat,
  amber: ['#c0833a', '#e8a94a', '#fff0c0'] as Mat,
  skin: ['#8a6a5a', '#c9a58f', '#ecd0b8'] as Mat,
};

class Pix {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  constructor(public w: number, public h: number, private look: Look, private rim = '#e8a94a') {
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
    this.x = this.c.getContext('2d')!;
  }
  /** Фигура с тремя тонами. Свет приходит справа (dir=1) или слева (dir=-1). */
  shape(path: Path, mat: Mat, bb: [number, number, number, number], dir: 1 | -1 = 1) {
    const x = this.x;
    const [x0, y0, x1, y1] = bb, w = x1 - x0;
    if (this.look === 'flat') {
      // контурный свет: сдвинутая копия светлым цветом, затем тёмная фигура
      x.save(); x.translate(dir, 0); x.fillStyle = this.rim; x.beginPath(); path(x); x.fill(); x.restore();
      x.fillStyle = M.dark[0]; x.beginPath(); path(x); x.fill();
      return;
    }
    x.save(); x.beginPath(); path(x); x.clip();
    x.fillStyle = mat[dir === 1 ? 0 : 2]; x.fillRect(x0 - 2, y0 - 2, w + 4, y1 - y0 + 4);
    x.fillStyle = mat[1]; x.fillRect(dir === 1 ? x0 + w * 0.28 : x0 + w * 0.12, y0 - 2, w * 0.6, y1 - y0 + 4);
    x.fillStyle = mat[dir === 1 ? 2 : 0]; x.fillRect(dir === 1 ? x0 + w * 0.86 : x0 - 2, y0 - 2, w * 0.15 + 2, y1 - y0 + 4);
    x.restore();
  }
  /** Деталь, которая остаётся цветной и в силуэтном стиле (глаза, огонь). */
  accent(path: Path, color: string) { this.x.fillStyle = color; this.x.beginPath(); path(this.x); this.x.fill(); }
  /** Мелкая деталь, видимая только в цветном стиле (лицо, пряжки). */
  detail(path: Path, color: string) { if (this.look === 'cel') this.accent(path, color); }
  finish(): HTMLCanvasElement {
    const { w, h } = this;
    const im = this.x.getImageData(0, 0, w, h), d = im.data;
    const solid = (i: number) => d[i + 3] >= 110;
    for (let i = 0; i < d.length; i += 4) d[i + 3] = solid(i) ? 255 : 0;
    const out = document.createElement('canvas'); out.width = w + 2; out.height = h + 2;
    const o = out.getContext('2d')!;
    const oi = o.createImageData(w + 2, h + 2);
    const ink = [7, 8, 12];
    const A = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? d[(y * w + x) * 4 + 3] : 0);
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      const k = ((y + 1) * (w + 2) + (x + 1)) * 4;
      if (A(x, y)) { const s = (y * w + x) * 4; oi.data[k] = d[s]; oi.data[k + 1] = d[s + 1]; oi.data[k + 2] = d[s + 2]; oi.data[k + 3] = 255; }
      else if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) { oi.data[k] = ink[0]; oi.data[k + 1] = ink[1]; oi.data[k + 2] = ink[2]; oi.data[k + 3] = 255; }
    }
    o.putImageData(oi, 0, 0);
    return out;
  }
}

/* ═════════ Могильщик ═════════ */
function gravedigger(look: Look): HTMLCanvasElement {
  const p = new Pix(64, 86, look);
  // лопата за спиной, лезвие поднято над плечом
  p.shape(bar(14, 66, 21, 12, 2.4), M.wood, [12, 10, 24, 68]);
  p.shape(poly([[15, 3], [25, 3], [26, 11], [20, 15], [14, 11]]), M.steel, [14, 3, 26, 15]);
  // сапоги
  p.shape(rect(22, 76, 30, 84), M.wood, [22, 76, 30, 84]);
  p.shape(rect(34, 76, 42, 84), M.wood, [34, 76, 42, 84]);
  // пальто
  p.shape(poly([[22, 27], [40, 27], [44, 50], [47, 78], [15, 78], [18, 50]]), M.coat, [15, 27, 47, 78]);
  p.detail(rect(30, 30, 32, 76), '#3a2a1c');
  p.detail(rect(17, 52, 45, 56), '#2e2018');
  p.detail(rect(29, 52, 33, 56), '#e8a94a');
  p.detail(poly([[28, 36], [32, 36], [33, 41], [27, 41]]), '#e8a94a');
  // шарф
  p.shape(ell(31, 27, 10, 4), M.red, [21, 23, 41, 31]);
  // правая рука с фонарём
  p.shape(bar(39, 31, 47, 52, 6), M.coat, [38, 30, 50, 54]);
  p.detail(rect(46, 51, 50, 55), '#c9a58f');
  p.accent(rect(48, 56, 55, 66), '#e8a94a');
  p.detail(rect(49, 57, 54, 65), '#fff0c0');
  p.shape(rect(48, 54, 55, 56), M.wood, [48, 54, 55, 56]);
  // левая рука, держит лопату
  p.shape(bar(23, 31, 17, 56, 5), M.coat, [14, 30, 24, 58]);
  p.detail(rect(15, 55, 19, 59), '#c9a58f');
  // голова: лицо в тени
  p.shape(ell(31, 21, 8, 8), M.dark, [23, 13, 39, 29]);
  p.accent(rect(27, 21, 30, 23), '#fff0c0');
  p.accent(rect(33, 21, 36, 23), '#fff0c0');
  // шляпа
  p.shape(poly([[22, 16], [24, 4], [38, 4], [40, 16]]), M.hat, [22, 4, 40, 16]);
  p.shape(ell(31, 17, 15, 4), M.hat, [16, 13, 46, 21]);
  p.detail(rect(23, 12, 39, 15), '#8a5a2b');
  return p.finish();
}

/* ═════════ Жнец Хора ═════════ */
function reaper(look: Look): HTMLCanvasElement {
  const p = new Pix(76, 104, look, '#ff7a5c');
  // коса: древко и лезвие
  p.shape(bar(56, 14, 58, 100, 2.6), M.wood, [54, 12, 61, 102], -1);
  p.shape(poly([[56, 8], [34, 3], [14, 14], [10, 26], [18, 19], [34, 12], [56, 15]]), M.steel, [10, 3, 58, 26], -1);
  // плащ с ровным зубчатым подолом
  const hem: number[][] = [];
  for (let i = 0; i <= 10; i++) hem.push([8 + i * 5.4, 96 + (i % 2 ? 4 : 0)]);
  p.shape(poly([[38, 3], [28, 12], [24, 30], [18, 56], [8, 92], ...hem, [62, 92], [54, 56], [48, 30], [46, 12]]), M.cloak, [8, 3, 62, 100], -1);
  // красная подкладка в разрезе плаща
  p.detail(poly([[33, 40], [43, 40], [47, 96], [29, 96]]), '#7a1f24');
  p.detail(poly([[36, 40], [40, 40], [42, 96], [34, 96]]), '#4a1d1c');
  // капюшон и череп
  p.shape(ell(37, 24, 10, 11), M.dark, [27, 13, 47, 35], -1);
  p.detail(rect(33, 30, 41, 33), '#cfc7b2');
  p.detail(rect(34, 30, 35, 33), '#12141c'); p.detail(rect(36, 30, 37, 33), '#12141c'); p.detail(rect(38, 30, 39, 33), '#12141c');
  p.accent(rect(31, 22, 34, 25), '#ff5a46');
  p.accent(rect(40, 22, 43, 25), '#ff5a46');
  // митра хориста
  p.shape(poly([[37, -1], [29, 12], [45, 12]]), M.cloak, [29, 0, 45, 12], -1);
  p.accent(rect(36, 5, 39, 9), '#e8a94a');
  // костяные руки на древке
  p.shape(rect(52, 42, 60, 47), M.bone, [52, 42, 60, 47], -1);
  p.shape(rect(52, 52, 60, 57), M.bone, [52, 52, 60, 57], -1);
  p.shape(bar(46, 34, 54, 44, 5), M.cloak, [44, 32, 56, 46], -1);
  return p.finish();
}

/* ═════════ Утопленница-прачка ═════════ */
function laundress(look: Look): HTMLCanvasElement {
  const p = new Pix(64, 88, look, '#9ec8d4');
  // волосы сзади
  p.shape(poly([[20, 12], [44, 12], [50, 80], [14, 80]]), M.hair, [14, 12, 50, 80], -1);
  // платье
  p.shape(poly([[24, 30], [40, 30], [47, 80], [17, 80]]), M.teal, [17, 30, 47, 80], -1);
  p.detail(rect(30, 34, 34, 78), '#1f3a38');
  // простыня в руках
  p.shape(poly([[6, 48], [28, 46], [30, 74], [9, 78]]), M.sheet, [6, 46, 30, 78], -1);
  p.detail(rect(9, 54, 28, 55), '#6a8aa0'); p.detail(rect(10, 62, 28, 63), '#6a8aa0'); p.detail(rect(11, 70, 28, 71), '#6a8aa0');
  p.accent(rect(12, 79, 14, 84), '#9ec8d4'); p.accent(rect(22, 79, 24, 82), '#9ec8d4');
  // руки
  p.shape(bar(26, 34, 20, 50, 4.5), M.teal, [16, 32, 30, 52], -1);
  p.shape(bar(38, 34, 40, 50, 4.5), M.teal, [36, 32, 44, 52], -1);
  p.shape(ell(20, 51, 3, 3), M.pale, [17, 48, 23, 54], -1);
  p.shape(ell(40, 51, 3, 3), M.pale, [37, 48, 43, 54], -1);
  // голова
  p.shape(ell(32, 21, 8, 10), M.pale, [24, 11, 40, 31], -1);
  p.shape(poly([[22, 16], [32, 9], [42, 16], [41, 20], [32, 14], [23, 21]]), M.hair, [22, 9, 42, 21], -1);
  p.accent(rect(28, 20, 31, 22), '#bfe6ff');
  p.accent(rect(34, 20, 37, 22), '#0a0b11');
  p.detail(rect(30, 27, 35, 28), '#1f3a38');
  // пряди спереди
  p.shape(bar(23, 26, 21, 66, 4), M.hair, [18, 24, 26, 68], -1);
  p.shape(bar(41, 26, 44, 62, 4), M.hair, [39, 24, 47, 64], -1);
  return p.finish();
}

/* ═════════ Чибби: большая голова, чёткий контур, плоская заливка ═════════ */
function chibiGravedigger(look: Look): HTMLCanvasElement {
  const p = new Pix(48, 56, look);
  p.shape(bar(10, 46, 15, 8, 2), M.wood, [9, 6, 17, 48]);
  p.shape(poly([[10, 3], [18, 3], [19, 9], [14, 12], [9, 9]]), M.steel, [9, 3, 19, 12]);
  p.shape(rect(17, 47, 23, 54), M.wood, [17, 47, 23, 54]);
  p.shape(rect(27, 47, 33, 54), M.wood, [27, 47, 33, 54]);
  p.shape(poly([[16, 33], [34, 33], [37, 50], [13, 50]]), M.coat, [13, 33, 37, 50]);
  p.detail(rect(15, 40, 35, 43), '#2e2018'); p.detail(rect(23, 40, 27, 43), '#e8a94a');
  p.shape(bar(34, 35, 40, 44, 5), M.coat, [32, 34, 43, 46]);
  p.accent(rect(38, 46, 44, 54), '#e8a94a'); p.detail(rect(39, 47, 43, 53), '#fff0c0');
  p.shape(ell(25, 24, 12, 11), M.skin, [13, 13, 37, 35]);
  p.detail(rect(15, 26, 35, 34), '#1a1218');
  p.accent(rect(19, 24, 22, 28), '#fff0c0'); p.accent(rect(28, 24, 31, 28), '#fff0c0');
  p.shape(ell(25, 16, 17, 4), M.hat, [8, 12, 42, 20]);
  p.shape(poly([[15, 16], [17, 4], [33, 4], [35, 16]]), M.hat, [15, 4, 35, 16]);
  p.detail(rect(17, 12, 33, 15), '#8a5a2b');
  return p.finish();
}
function chibiReaper(look: Look): HTMLCanvasElement {
  const p = new Pix(56, 62, look, '#ff7a5c');
  p.shape(bar(45, 6, 46, 58, 2), M.wood, [44, 4, 48, 60], -1);
  p.shape(poly([[45, 3], [30, 1], [18, 9], [17, 17], [24, 12], [34, 8], [45, 10]]), M.steel, [17, 1, 46, 17], -1);
  const hem: number[][] = [];
  for (let i = 0; i <= 8; i++) hem.push([10 + i * 4.5, 56 + (i % 2 ? 4 : 0)]);
  p.shape(poly([[19, 34], [37, 34], [44, 52], ...hem.slice().reverse(), [10, 52]]), M.cloak, [10, 34, 46, 62], -1);
  p.detail(poly([[24, 42], [32, 42], [35, 58], [21, 58]]), '#7a1f24');
  p.shape(ell(27, 22, 14, 14), M.cloak, [13, 8, 41, 36], -1);
  p.shape(ell(27, 25, 9, 9), M.dark, [18, 16, 36, 34], -1);
  p.accent(rect(21, 23, 25, 27), '#ff5a46'); p.accent(rect(29, 23, 33, 27), '#ff5a46');
  p.detail(rect(23, 30, 31, 32), '#cfc7b2');
  p.shape(poly([[27, 0], [18, 12], [36, 12]]), M.cloak, [18, 0, 36, 12], -1);
  p.shape(rect(42, 38, 48, 43), M.bone, [42, 38, 48, 43], -1);
  return p.finish();
}
function chibiLaundress(look: Look): HTMLCanvasElement {
  const p = new Pix(52, 60, look, '#9ec8d4');
  p.shape(poly([[10, 14], [40, 14], [46, 54], [6, 54]]), M.hair, [6, 14, 46, 54], -1);
  p.shape(poly([[17, 36], [33, 36], [38, 56], [12, 56]]), M.teal, [12, 36, 38, 56], -1);
  p.shape(poly([[3, 40], [20, 39], [21, 56], [5, 58]]), M.sheet, [3, 39, 21, 58], -1);
  p.detail(rect(5, 45, 20, 46), '#6a8aa0'); p.detail(rect(5, 51, 20, 52), '#6a8aa0');
  p.accent(rect(8, 58, 10, 60), '#9ec8d4');
  p.shape(ell(26, 24, 13, 13), M.pale, [13, 11, 39, 37], -1);
  p.shape(poly([[11, 20], [26, 8], [41, 20], [38, 24], [26, 16], [14, 26]]), M.hair, [11, 8, 41, 26], -1);
  p.accent(rect(20, 24, 24, 28), '#bfe6ff'); p.accent(rect(29, 24, 33, 28), '#0a0b11');
  p.detail(rect(23, 32, 30, 33), '#1f3a38');
  p.shape(bar(13, 28, 11, 52, 4), M.hair, [8, 26, 16, 54], -1);
  p.shape(bar(39, 28, 41, 52, 4), M.hair, [36, 26, 44, 54], -1);
  return p.finish();
}

export interface Variant { id: string; name: string; note: string; hero: HTMLCanvasElement; foe1: HTMLCanvasElement; foe2: HTMLCanvasElement }
export function buildVariants(): Variant[] {
  return [
    { id: 'A', name: 'Силуэт', note: 'Чёрные чёткие силуэты, один контурный свет, светящиеся глаза и огонь. Выглядит дорого, быстро рисуется, хорошо масштабируется на сотню врагов.', hero: gravedigger('flat'), foe1: reaper('flat'), foe2: laundress('flat') },
    { id: 'Б', name: 'Классика', note: 'Человеческие пропорции: голова, руки, ноги, плащ, лицо. Плоская заливка в три тона и чистый контур. Самый «игровой» вид, требует больше работы на каждого врага.', hero: gravedigger('cel'), foe1: reaper('cel'), foe2: laundress('cel') },
    { id: 'В', name: 'Чибби', note: 'Большая голова, маленькое тело, чёткий контур. Читается лучше всего, милее и забавнее. Тон мрачного фэнтези мягче.', hero: chibiGravedigger('cel'), foe1: chibiReaper('cel'), foe2: chibiLaundress('cel') },
  ];
}
