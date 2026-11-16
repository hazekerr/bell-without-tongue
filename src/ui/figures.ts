/* Слой персонажей поверх сцены: живые силуэты в разрешении экрана, с подсветкой за спиной.
   Используется на экранах событий, свечи, лавки, тела и финала среза. */
import { sprite, drawSprite } from '../art/index.ts';
import { stage } from './kit.ts';

export interface Fig { id: string; x: number; scale?: number; flip?: boolean; warm?: boolean; ph?: number }

const HERO_ART: Record<string, string> = { gravedigger: 'gravedigger', wickkeeper: 'wickkeeper', bellringer: 'bellringer', penitent: 'penitent' };
export const heroArt = (role: string) => HERO_ART[role] ?? 'gravedigger';

/** Реальный размер сцены на экране в устройственных пикселях (stage масштабируется CSS-преобразованием). */
export function realScale() {
  const r = stage().getBoundingClientRect();
  return { h: Math.max(270, r.height * (window.devicePixelRatio || 1)) };
}

export function figureLayer(figs: Fig[], feet = 150, reduce = false) {
  const cv = document.createElement('canvas');
  cv.className = 'figs';
  let raf = 0;
  const frame = (ms: number) => {
    if (!cv.isConnected) return; // экран закрыт: цикл останавливается сам
    raf = requestAnimationFrame(frame);
    const host = cv.parentElement!;
    const { h: realH } = realScale();
    const w = host.clientWidth, h = host.clientHeight;
    const cw = Math.round(realH * w / h), ch = Math.round(realH);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const u = ch / 270; // единица внутренней сетки сцены (высота 270)
    const IW = 270 * w / h;
    const x = cv.getContext('2d')!;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, cw, ch);
    x.setTransform(u, 0, 0, u, 0, 0);
    const t = reduce ? 0 : ms / 1000;
    const res = Math.max(2, Math.min(4, Math.ceil(u)));
    figs.forEach((f, i) => {
      const cx = f.x * IW;
      const s = sprite(f.id);
      const sc = f.scale ?? 1;
      const gh = 60 + s.h * sc * 0.4;
      const g = x.createRadialGradient(cx, feet - gh * 0.5, 4, cx, feet - gh * 0.5, gh * 0.95);
      g.addColorStop(0, f.warm ? 'rgba(232,169,74,.34)' : 'rgba(170,205,215,.40)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(cx - gh, feet - gh * 1.6, gh * 2, gh * 1.8); x.globalCompositeOperation = 'source-over';
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(Math.round(cx - (22 + s.w * sc * 0.3) / 2), feet - 1, Math.round(22 + s.w * sc * 0.3), 4);
      drawSprite(x, s, cx, feet + 3, sc, t, !!f.flip, f.ph ?? i, res);
    });
  };
  return { el: cv, start: () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }, stop: () => cancelAnimationFrame(raf) };
}
