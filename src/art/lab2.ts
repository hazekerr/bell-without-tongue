import { buildVariants } from './variants.ts';
import { sceneCanvas } from './scenes.ts';

const root = document.getElementById('app')!;
const el = (t: string, c = '', h = '') => { const e = document.createElement(t); if (c) e.className = c; if (h) e.innerHTML = h; return e; };
const vs = buildVariants();
const bg = sceneCanvas('c1', 480);
const draw: (() => void)[] = [];
for (const v of vs) {
  const box = el('section');
  box.append(el('h2', '', `${v.id}. ${v.name}`), el('p', 'note', v.note));
  const cv = el('canvas', 'stage') as HTMLCanvasElement; cv.width = 480; cv.height = 270; box.append(cv);
  const k = v.id === 'В' ? 2 : 1.4;
  draw.push(() => {
    const t = performance.now() / 1000;
    const x = cv.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(bg, 0, 0);
    x.fillStyle = 'rgba(0,0,0,.4)'; for (const cx of [90, 270, 380]) x.fillRect(cx - 28, 202, 56, 4);
    const put = (c: HTMLCanvasElement, cx: number, ph: number, flip = false) => {
      const w = c.width * k, h = c.height * k, bob = Math.round(Math.sin(t * 2.4 + ph) * 1.5);
      x.save(); x.translate(Math.round(cx), Math.round(206 - h + bob)); if (flip) { x.translate(w / 2, 0); x.scale(-1, 1); x.translate(-w / 2, 0); } x.translate(-w / 2, 0); x.drawImage(c, 0, 0, w, h); x.restore();
    };
    put(v.hero, 90, 0); put(v.foe2, 270, 1.5); put(v.foe1, 385, 3);
  });
  const row = el('div', 'row'); box.append(row);
  for (const c of [v.hero, v.foe1, v.foe2]) { const big = el('canvas', 'big') as HTMLCanvasElement; big.width = c.width; big.height = c.height; big.getContext('2d')!.drawImage(c, 0, 0); row.append(big); }
  root.append(box);
}
const loop = () => { draw.forEach((f) => f()); requestAnimationFrame(loop); };
requestAnimationFrame(loop);
