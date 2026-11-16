import { silSprite, SIL_IDS, SIL_NAMES } from './sil.ts';
import { drawSprite } from './pixel.ts';
import { sceneCanvas } from './scenes.ts';

const root = document.getElementById('app')!;
const el = (t: string, c = '', h = '') => { const e = document.createElement(t); if (c) e.className = c; if (h) e.innerHTML = h; return e; };
const bg = sceneCanvas('c1', 480);
const grid = el('div', 'grid'); root.append(grid);
const cells: { cv: HTMLCanvasElement; id: string; ph: number }[] = [];
for (const id of SIL_IDS) {
  const box = el('div', 'cell'); const cv = el('canvas') as HTMLCanvasElement; cv.width = 170; cv.height = 150;
  box.append(cv, el('b', '', SIL_NAMES[id])); grid.append(box); cells.push({ cv, id, ph: Math.random() * 3 });
}
const scene = el('canvas', 'stage') as HTMLCanvasElement; scene.width = 480; scene.height = 270; root.insertBefore(scene, grid);
const loop = (ms: number) => {
  const t = ms / 1000;
  for (const c of cells) {
    const x = c.cv.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(bg, 150, 60, 170, 150, 0, 0, 170, 150);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(35, 143, 100, 4);
    const s = silSprite(c.id); drawSprite(x, s, 85, 146, Math.min(1, 138 / s.h, 160 / s.w), t, false, c.ph);
  }
  const x = scene.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(bg, 0, 0);
  x.fillStyle = 'rgba(0,0,0,.4)'; for (const cx of [70, 190, 290, 410]) x.fillRect(cx - 30, 206, 60, 4);
  drawSprite(x, silSprite('gravedigger'), 70, 210, 1, t, false, 0);
  drawSprite(x, silSprite('laundress'), 190, 210, 1, t, false, 1);
  drawSprite(x, silSprite('reaper'), 300, 212, 1, t, false, 2);
  drawSprite(x, silSprite('candle'), 410, 210, 1, t, false, 3);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
