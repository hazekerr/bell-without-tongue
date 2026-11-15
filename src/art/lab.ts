import { buildCast, NAMES } from './cast.ts';
import { drawSprite } from './pixel.ts';
import { renderCardArt, CARD_SPECS } from './cardart.ts';

const cast = buildCast();
const root = document.getElementById('app')!;
const el = (t: string, c = '', h = '') => { const e = document.createElement(t); if (c) e.className = c; if (h) e.innerHTML = h; return e; };

/* сцена боя в пикселях 480×270 */
function sceneBg(w: number, h: number) {
  const K = w / 480;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const ramp = ['#15101f', '#2b1a2a', '#5a2c28', '#a85a2c', '#e8a94a'];
  const hz = Math.round(h * 0.62);
  const im = x.createImageData(w, h);
  const hx = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    let col: number[];
    if (y < hz) { const t = Math.pow(y / hz, 1.3) * (ramp.length - 1); const i0 = Math.min(ramp.length - 2, Math.floor(t)); col = hx(ramp[(t - i0) > (BAY[y & 3][xx & 3] + 0.5) / 16 ? i0 + 1 : i0]); }
    else { const t = (y - hz) / (h - hz); col = hx(t * 1.2 > (BAY[y & 3][xx & 3] + 0.5) / 16 ? '#07080c' : '#1a1218'); }
    const i = (y * w + xx) * 4; im.data[i] = col[0]; im.data[i + 1] = col[1]; im.data[i + 2] = col[2]; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  // мёртвое солнце
  x.fillStyle = '#f6cf7a'; x.beginPath(); x.arc(w / 2, hz - 4 * K, 34 * K, 0, 7); x.fill();
  x.fillStyle = '#ffe9b0'; x.beginPath(); x.arc(w / 2 - 4 * K, hz - 7 * K, 24 * K, 0, 7); x.fill();
  // рёбра собора (пиксельные дуги)
  x.strokeStyle = '#07080c'; x.lineWidth = 9;
  for (const [x0, x1, top, lw] of [[-10 * K, 150 * K, 6 * K, 12 * K], [30 * K, 200 * K, 20 * K, 8 * K], [w + 10 * K, w - 150 * K, 6 * K, 12 * K], [w - 30 * K, w - 200 * K, 20 * K, 8 * K]]) {
    x.lineWidth = lw; x.beginPath(); x.moveTo(x0, h + 4); x.bezierCurveTo(x0 + (x1 - x0) * 0.05, h * 0.5, x1 - (x1 - x0) * 0.3, top, x1, top - 4); x.stroke();
  }
  x.lineWidth = 6 * K; x.beginPath(); x.moveTo(150 * K, 4); x.bezierCurveTo(200 * K, -10, 280 * K, -10, w - 150 * K, 4); x.stroke();
  // руины
  const rr = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < 20; i++) { const bx = Math.round(i * (w / 20)), bw = Math.round(6 + rr(i) * 8), bh = Math.round(10 + rr(i + 7) * 26); x.fillStyle = '#140f18'; x.fillRect(bx, hz - bh, bw, bh); x.fillRect(bx + Math.floor(bw / 2) - 1, hz - bh - 3, 2, 3); if (rr(i + 3) < 0.4) { x.fillStyle = '#e8a94a'; x.fillRect(bx + 2, hz - Math.round(bh * 0.6), 1, 2); } }
  // отражение солнца
  for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(232,169,74,${0.55 - i * 0.035})`; const ww = Math.round(36 - i * 1.6); x.fillRect(Math.round(w / 2 - ww / 2) + ((i * 7) % 5) - 2, hz + 2 + i * 3, ww, 2); }
  return c;
}

const sec = (title: string, note: string) => {
  const s = el('section'); s.append(el('h2', '', title)); if (note) s.append(el('p', 'note', note)); root.append(s); return s;
};

/* 1. Боевая сцена с анимацией */
{
  const s = sec('Сцена боя: Круг II', 'Герои и враги нарисованы вручную. У каждого свой силуэт и своя деталь: фонарь и лопата, горящий посох, простыня и волосы, колокол вместо головы, коса и нотный знак. Всё живое: покачивание подола, мигание, мерцание огня.');
  const cv = el('canvas', 'stage') as HTMLCanvasElement; cv.width = 320; cv.height = 180; s.append(cv);
  const bg = sceneBg(320, 180); const ctx = cv.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  const sw = el('div', 'tabs'); s.append(sw);
  let hero = 'gravedigger';
  for (const h of ['gravedigger', 'wickkeeper']) { const b = el('button', 'tab', NAMES[h]); b.onclick = () => { hero = h; }; sw.append(b); }
  const loop = (ms: number) => {
    const t = ms / 1000; ctx.drawImage(bg, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (const [x, w] of [[64, 28], [222, 36], [168, 16], [282, 14]]) ctx.fillRect(x - w / 2, 142, w, 2);
    drawSprite(ctx, cast[hero], 64, 146, 1, t, false, 0);
    drawSprite(ctx, cast.reaper, 222, 152, 1, t, false, 1);
    drawSprite(ctx, cast.candle, 172, 148, 1, t, false, 2);
    drawSprite(ctx, cast.candle, 284, 148, 1, t, false, 3);
    // дождь
    ctx.fillStyle = 'rgba(200,215,225,.35)';
    for (let i = 0; i < 50; i++) { const x = (i * 53 + t * 30) % 320, y = (i * 97 + t * 170) % 180; ctx.fillRect(Math.floor(x), Math.floor(y), 1, 3); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* 2. Каждый персонаж отдельно */
{
  const s = sec('Все герои и враги', 'Крупно, ×6. Ни один не повторяет другого: разные пропорции, лица, предметы и манера двигаться.');
  const grid = el('div', 'cast'); s.append(grid);
  const items: { cv: HTMLCanvasElement; id: string; ph: number }[] = [];
  for (const id of Object.keys(cast)) {
    const box = el('div', 'cell'); const c = el('canvas') as HTMLCanvasElement; c.width = 72; c.height = 76; box.append(c, el('b', '', NAMES[id])); grid.append(box);
    items.push({ cv: c, id, ph: Math.random() * 4 });
  }
  const loop = (ms: number) => {
    for (const it of items) { const x = it.cv.getContext('2d')!; x.clearRect(0, 0, 72, 76); x.fillStyle = '#18141f'; x.fillRect(0, 0, 72, 76); x.fillStyle = 'rgba(232,169,74,.2)'; x.fillRect(0, 68, 72, 8); const sp = cast[it.id]; drawSprite(x, sp, 36, 74, 1, ms / 1000, false, it.ph); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* 3. Карты */
{
  const s = sec('Карты: новая рамка и иллюстрации в пикселях', 'Иллюстрация собирается из ручных деталей (лопата, ворон, фонарь, могильный холм, рука из земли, свеча, крест, колокол, цепи), неба с дизерингом, света и тумана. Из таких деталей можно собирать сотни карт без повторов.');
  const row = el('div', 'cards'); s.append(row);
  const defs = [
    { k: 'spade', n: 'Лопата', t: 's', c: 1, tx: 'Нанеси 8 урона. Если у цели есть Тлен: +4.', ty: 'Удар', r: 1 },
    { k: 'earth', n: 'Земля к земле', t: 'w', c: 1, tx: 'Получи 6 Брони. Погреби верхнюю карту. +1 Брони за каждую в Могиле.', ty: 'Оберег', r: 1 },
    { k: 'candle', n: 'Поминальная свеча', t: 'r', c: 0, tx: 'Потеряй 3 ЗДР. Получи 3 Пламени. Возьми 1.', ty: 'Обряд', r: 2 },
    { k: 'cross', n: 'Каменный Крест', t: 's', c: 2, tx: 'Нанеси 14 урона. Если вернулась из Могилы: Страх 2.', ty: 'Удар', r: 2 },
    { k: 'bell', n: 'Голос Агнеты', t: 'w', c: 2, tx: 'Атака цели в этот ход не наносит урона. Исчерпай.', ty: 'Оберег', r: 4 },
    { k: 'chain', n: 'Хлёст цепью', t: 's', c: 1, tx: 'Нанеси 5 урона. Если у цели Страх: Оковы 1.', ty: 'Удар', r: 1 },
  ];
  for (const d of defs) {
    const art = renderCardArt(d.k); art.className = 'art';
    const gems = '<i></i>'.repeat(d.r);
    const card = el('div', `pcard ${d.t}${d.r === 4 ? ' legend' : ''}`);
    card.innerHTML = `<div class="cost"><svg viewBox="0 0 10 12"><path d="M5 0c-1 0-1.5.5-1.5 1.2C1.8 1.8 1 3.5 1 5.6v2L0 9.4h10L9 7.6v-2C9 3.5 8.2 1.8 6.5 1.2 6.5.5 6 0 5 0zM4 10h2c0 1-.5 1.8-1 1.8S4 11 4 10z"/></svg><b>${d.c}</b></div><div class="name">${d.n}</div>`;
    card.append(art);
    const ty = el('div', 'type', `<span>${d.ty}</span>`); card.append(ty);
    card.append(el('div', 'text', d.tx)); card.append(el('div', 'gems', gems));
    row.append(card);
  }
  void CARD_SPECS;
}
