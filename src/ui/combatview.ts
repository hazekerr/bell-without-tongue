import { Combat } from '../engine/combat.ts';
import { CARDS } from '../engine/cards.ts';
import { ENEMIES } from '../engine/enemies.ts';
import type { CardInst, EnemyInst, GameEvent } from '../engine/types.ts';
import { cardEl } from './cardview.ts';
import { audio } from './audio.ts';
import { drawSprite, fogTexture, sceneCanvas, sprite } from '../art/index.ts';
import { h, sleep, clear } from './dom.ts';
import { svgIcon, TYPE_ICON, INTENT_ICON, STATUS_NAME, STATUS_HINT } from './icons.ts';
import { G } from './state.ts';
import { stage } from './kit.ts';

export interface CombatUI {
  el: HTMLElement;
  done: Promise<'win' | 'lose'>;
  stop: () => void;
}

interface View { heroHp: number; heroBlock: number; e: Map<number, { hp: number; block: number; dead: boolean }> }
interface Anim { shake: number; lunge: number; alpha: number }

const HAND_SCALE = 0.68;
const SPRITE_SCALE: Record<string, number> = { tide: 0.72, choirmaster: 0.78, gatekeeper: 0.8, alban: 0.92, reaper: 0.92, seraph: 0.9, fisher: 0.92 };
const FEET = 140; // нижняя точка спрайтов во внутренних координатах (высота сцены 270)
const KIND: Record<number, 'c1' | 'c2' | 'c3'> = { 1: 'c1', 2: 'c2', 3: 'c3' };

export function buildCombat(combat: Combat, opts: { circle: number; boss: boolean; onInspect: (title: string, text: string) => void; onPiles: (kind: 'draw' | 'discard' | 'grave' | 'exhaust') => void }): CombatUI {
  const reduce = G.chron.settings.reduceMotion;
  const SW = stage().clientWidth || 800; // ширина сцены в дизайн-пикселях
  const IW = Math.round(270 * SW / 390);
  const K = 390 / 270;
  // Низкое разрешение рисуем в off, затем растим целым множителем без сглаживания:
  // пиксели остаются чёткими, браузер лишь слегка сжимает остаток до размера экрана.
  const off = document.createElement('canvas');
  off.width = IW; off.height = 270;
  const cv = document.createElement('canvas');
  cv.className = 'bgc';
  let kUp = 0;
  const fitUp = () => {
    const k = Math.max(2, Math.min(4, Math.ceil(((stage().clientHeight || 390) * (window.devicePixelRatio || 1)) / 270)));
    if (k !== kUp) { kUp = k; cv.width = IW * k; cv.height = 270 * k; }
  };
  fitUp();
  const bg = sceneCanvas(KIND[opts.circle] ?? 'c2', IW);
  const fog = fogTexture(IW, 80);
  const heroId = combat.role === 'wickkeeper' ? 'wickkeeper' : combat.role === 'bellringer' ? 'bellringer' : combat.role === 'penitent' ? 'penitent' : 'gravedigger';

  const hintEl = h('div', { class: 'hint' });
  const arena = h('div', { class: 'abs', style: { inset: '0', zIndex: 4 } });
  const handEl = h('div', { class: 'hand' });
  const sigs = h('div', { class: 'sigs' });
  const orbs = h('div', { class: 'orbs' });
  const heroHud = h('div', { class: 'herohud' });
  const turnLabel = h('div', { class: 'grow' });
  const preview = h('div', { class: 'preview', style: { left: '33%', top: '34px' } });
  const hit = h('div', { class: 'hitflash' });
  const pile = (n: string) => h('button', { class: 'pile', 'aria-label': n }, n, h('b', null, '0'));
  const pileDraw = pile('Колода'), pileDis = pile('Сброс'), pileGrave = pile('Могила');
  if (combat.role !== 'gravedigger') pileGrave.style.display = 'none';
  const endBtn = h('button', { class: 'end-turn', 'aria-label': 'Конец хода' }, h('div', { html: svgIcon('bell') }), 'Конец хода');
  const sheetHost = h('div');
  const root = h('div', { class: 'screen combat' }, cv, arena,
    h('div', { class: 'top' }, pileDraw, pileDis, pileGrave, turnLabel),
    heroHud, hintEl, h('div', { class: 'leftcol' }, orbs, sigs),
    h('div', { class: 'hand-zone' }, handEl), endBtn, preview, hit, sheetHost);

  /* ───── положение существ ───── */
  const slots = (n: number) => (n <= 1 ? [0.72] : n === 2 ? [0.6, 0.84] : n === 3 ? [0.5, 0.68, 0.86] : [0.45, 0.59, 0.73, 0.88]);
  const heroX = 0.17 * IW;
  const posX = new Map<number, number>();
  const anim = new Map<number, Anim>();
  const layout = () => {
    const living = combat.enemies;
    const xs = slots(Math.max(1, living.length));
    living.forEach((e, i) => { if (!posX.has(e.uid)) posX.set(e.uid, xs[i] * IW); anim.set(e.uid, anim.get(e.uid) ?? { shake: 0, lunge: 0, alpha: 1 }); });
    // перераспределяем, если число врагов изменилось
    const alive = living.filter((e) => e.alive);
    const xs2 = slots(Math.max(1, alive.length));
    alive.forEach((e, i) => posX.set(e.uid, xs2[i] * IW));
  };
  const heroAnim: Anim = { shake: 0, lunge: 0, alpha: 1 };
  const spr = (e: EnemyInst) => sprite(ENEMIES[e.def].art);
  const sc = (e: EnemyInst) => SPRITE_SCALE[ENEMIES[e.def].art] ?? 1;

  /* ───── рисование арены ───── */
  const rain = Array.from({ length: reduce ? 0 : 60 }, (_, i) => ({ x: (i * 53) % IW, y: (i * 97) % 270, v: 1.5 + (i % 5) * 0.4 }));
  let raf = 0;
  let lastMs = 0;
  const frame = (ms: number) => {
    const t = ms / 1000;
    const x = off.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    // сцена сдвинута вверх на 14, чтобы подписи и полоски врагов оставались над рукой карт
    x.drawImage(bg, 0, -14);
    x.drawImage(bg, 0, 236, IW, 34, 0, 256, IW, 14);
    if (!reduce) { x.globalAlpha = 0.6; x.drawImage(fog, -((t * 6) % IW), 118); x.drawImage(fog, IW - ((t * 6) % IW), 118); x.globalAlpha = 1; }
    // тень под героями
    x.fillStyle = 'rgba(0,0,0,.4)';
    const shadow = (cx: number, w: number) => x.fillRect(Math.round(cx - w / 2), FEET - 1, Math.round(w), 4);
    shadow(heroX, 54);
    for (const e of combat.enemies) shadow(posX.get(e.uid) ?? 0, 22 + spr(e).w * sc(e) * 0.3);
    const dt = Math.min(2, (ms - (lastMs || ms)) / 16.7); lastMs = ms;
    for (const a of [heroAnim, ...anim.values()]) { a.shake *= Math.pow(0.85, dt); a.lunge *= Math.pow(0.9, dt); }
    // дождь или пепел
    x.fillStyle = opts.circle >= 3 ? 'rgba(214,236,255,.7)' : opts.circle >= 2 ? 'rgba(210,200,185,.5)' : 'rgba(200,215,225,.4)';
    for (const r of rain) {
      r.y += r.v; r.x -= opts.circle >= 2 ? 0.2 : 0.7;
      if (r.y > 270) { r.y = -4; r.x = Math.random() * IW; }
      if (r.x < 0) r.x = IW;
      if (opts.circle >= 2) x.fillRect(Math.floor(r.x), Math.floor(r.y), 1, 1); else x.fillRect(Math.floor(r.x), Math.floor(r.y), 1, 3);
    }
    fitUp();
    const vx = cv.getContext('2d')!;
    vx.imageSmoothingEnabled = false;
    vx.drawImage(off, 0, 0, cv.width, cv.height);
    // персонажи рисуются сразу в экранном разрешении: контур остаётся чётким
    vx.save(); vx.setTransform(kUp, 0, 0, kUp, 0, 0);
    const ha = heroAnim;
    // мягкая подсветка за силуэтами: чёрная форма читается на фоне
    const glow = (cx: number, h: number, warm: boolean) => {
      const g = vx.createRadialGradient(cx, FEET - h * 0.5, 4, cx, FEET - h * 0.5, h * 0.95);
      g.addColorStop(0, warm ? 'rgba(232,169,74,.34)' : 'rgba(170,205,215,.42)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      vx.globalCompositeOperation = 'lighter'; vx.fillStyle = g;
      vx.fillRect(cx - h, FEET - h * 1.6, h * 2, h * 1.8);
      vx.globalCompositeOperation = 'source-over';
    };
    glow(heroX, 80, true);
    for (const e of combat.enemies) if (e.alive) glow(posX.get(e.uid) ?? 0, 60 + spr(e).h * sc(e) * 0.4, false);
    drawSprite(vx, sprite(heroId), heroX + Math.sin(ha.shake * 6) * ha.shake - ha.lunge * 16, FEET + 3, 1, t, false, 0, kUp);
    combat.enemies.forEach((e, i) => {
      const a = anim.get(e.uid)!;
      const v = view.e.get(e.uid);
      if (v?.dead) a.alpha = Math.max(0, a.alpha - 0.025); else a.alpha = 1;
      if (a.alpha <= 0) return;
      vx.globalAlpha = a.alpha;
      const ox = (posX.get(e.uid) ?? 0) - a.lunge * 22 + Math.sin(a.shake * 6) * a.shake;
      drawSprite(vx, spr(e), ox, FEET + 3, sc(e), t, false, i + 1, kUp);
      vx.globalAlpha = 1;
    });
    vx.restore();
    raf = requestAnimationFrame(frame);
  };

  /* ───── вид ───── */
  const view: View = { heroHp: combat.hero.hp, heroBlock: combat.hero.block, e: new Map() };
  const syncView = () => {
    view.heroHp = combat.hero.hp;
    view.heroBlock = combat.hero.block;
    for (const e of combat.enemies) view.e.set(e.uid, { hp: e.hp, block: e.block, dead: !e.alive });
  };
  syncView();
  layout();

  let selUid: number | null = null;
  let busy = false;
  let finished = false;
  let resolveDone!: (r: 'win' | 'lose') => void;
  const done = new Promise<'win' | 'lose'>((r) => (resolveDone = r));
  const justDrawn = new Set<number>();

  const statusChips = (st: Record<string, number | undefined>, extra: [string, number][] = []) => {
    const out: HTMLElement[] = [];
    for (const [k, v] of [...Object.entries(st), ...extra]) {
      if (!v) continue;
      const chip = h('button', { class: `st ${k}`, 'aria-label': `${STATUS_NAME[k]} ${v}` }, h('i'), `${STATUS_NAME[k]} ${v}`);
      chip.addEventListener('click', (ev) => { ev.stopPropagation(); opts.onInspect(STATUS_NAME[k], STATUS_HINT[k]); });
      out.push(chip);
    }
    return out;
  };

  const intentChip = (e: EnemyInst) => {
    const m = e.intent;
    let label = m.name;
    if (m.kind === 'attack' && m.dmg !== undefined) {
      const dmg = combat.enemyDamage(e, m.dmg);
      label = (m.hits ?? 1) > 1 ? `${dmg}×${m.hits}` : `${dmg}`;
    } else if (m.kind === 'defend') label = m.block ? `${m.block}` : m.blockAll ? `${m.blockAll}+` : m.name;
    const cls = m.kind === 'attack' ? '' : m.kind === 'defend' ? 'defend' : 'other';
    return h('div', { class: `intent ${cls}`, title: m.name, html: `${svgIcon(INTENT_ICON[m.kind] ?? 'eye')}<span>${label}</span>` });
  };

  const needsTarget = (uid: number) => combat.needsTarget(uid);
  const dx = (ix: number) => ix * K;

  const renderEnemies = () => {
    clear(arena);
    const selDef = selUid !== null ? combat.hand.find((c) => c.uid === selUid) : undefined;
    const targeting = !!selDef && needsTarget(selDef.uid);
    for (const e of combat.enemies) {
      const v = view.e.get(e.uid) ?? { hp: e.hp, block: e.block, dead: !e.alive };
      const def = ENEMIES[e.def];
      const s = spr(e), scl = sc(e);
      const w = s.w * scl * K, hh = s.h * scl * K;
      const feetY = FEET * K;
      const tile = h('div', { class: `en${v.dead ? ' dead' : ''}${targeting && !v.dead ? ' targetable' : ''}`, dataset: { uid: e.uid }, tabindex: 0, role: 'button', 'aria-label': `${def.name}, ${v.hp} из ${e.maxHp}`, style: { left: `${dx(posX.get(e.uid) ?? 0)}px`, top: `${feetY - hh - 4}px`, width: `${w}px`, height: `${hh + 28}px` } },
        h('div', { class: 'tg' }),
        v.dead ? null : (() => { const c = intentChip(e); c.style.top = '-24px'; return c; })(),
        h('div', { class: 'info', style: { top: `${hh + 6}px` } },
          h('div', { class: 'ename' }, def.name),
          h('div', { class: 'bar' }, h('i', { style: { width: `${(Math.max(0, v.hp) / e.maxHp) * 100}%` } }), h('b', null, `${Math.max(0, v.hp)}/${e.maxHp}`)),
          h('div', { class: 'row2', style: { display: 'flex', gap: '3px', alignItems: 'center' } }, v.block > 0 ? h('div', { class: 'shield', html: `${svgIcon('shield')}${v.block}` }) : null, h('div', { class: 'statuses' }, statusChips(e.statuses as Record<string, number>)))),
      );
      tile.addEventListener('click', () => onEnemyTap(e.uid));
      tile.addEventListener('contextmenu', (ev) => { ev.preventDefault(); opts.onInspect(def.name, def.blurb); });
      let pressT: number | undefined;
      tile.addEventListener('pointerdown', () => (pressT = window.setTimeout(() => opts.onInspect(def.name, def.blurb + '\n\n' + `Намерение: ${e.intent.name}${e.intent.text ? ' — ' + e.intent.text : ''}`), 520)));
      tile.addEventListener('pointerup', () => clearTimeout(pressT));
      tile.addEventListener('pointerleave', () => clearTimeout(pressT));
      arena.append(tile);
    }
  };

  const renderHero = () => {
    const hp = Math.max(0, view.heroHp);
    clear(heroHud);
    heroHud.style.left = `${dx(heroX)}px`;
    heroHud.style.top = `${FEET * K + 6}px`;
    heroHud.append(
      h('div', { class: 'bar hero' }, h('i', { style: { width: `${(hp / combat.hero.maxHp) * 100}%` } }), h('b', null, `${hp} / ${combat.hero.maxHp}`)),
      h('div', { class: 'row2' }, view.heroBlock > 0 ? h('div', { class: 'shield', html: `${svgIcon('shield')}${view.heroBlock}` }) : null,
        h('div', { class: 'statuses' }, statusChips(combat.hero.statuses as Record<string, number>, [...(combat.hero.flame ? [['flame', combat.hero.flame] as [string, number]] : []), ...(combat.role === 'bellringer' ? [['toll', combat.hero.toll] as [string, number]] : [])]))),
    );
    const total = Math.max(3, combat.breath);
    clear(orbs);
    orbs.append(h('div', { class: `energy${combat.breath <= 0 ? ' off' : ''}`, 'aria-label': `Дыхание ${combat.breath} из ${total}` }, h('b', null, `${combat.breath}`), h('small', null, `/${total}`)), h('div', { class: 'energy-cap' }, 'ДЫХАНИЕ'));
    clear(sigs);
    const full = combat.typesPlayed.size >= 3;
    sigs.className = `sigs${full ? ' full' : ''}`;
    for (const t of ['strike', 'ward', 'rite'] as const) sigs.append(h('div', { class: `sig ${t}${combat.typesPlayed.has(t) ? ' on' : ''}`, html: svgIcon(TYPE_ICON[t]) }));
    turnLabel.textContent = `Ход ${combat.turn}`;
    (pileDraw.querySelector('b') as HTMLElement).textContent = String(combat.drawPile.length);
    (pileDis.querySelector('b') as HTMLElement).textContent = String(combat.discard.length);
    (pileGrave.querySelector('b') as HTMLElement).textContent = String(combat.grave.length);
    const noMoves = !combat.hand.some((c) => combat.canPlay(c.uid));
    endBtn.classList.toggle('dim', !noMoves);
    endBtn.classList.toggle('pulse', noMoves && combat.phase === 'hero' && !combat.pending);
  };

  const handLayout = () => {
    const n = combat.hand.length;
    const area = Math.max(200, SW - 156);
    const cw = 120 * HAND_SCALE;
    const step = n <= 1 ? 0 : Math.min(cw * 1.04, (area - cw) / (n - 1));
    return { n, cw, step, area };
  };

  const renderHand = () => {
    clear(handEl);
    const { n, cw, step, area } = handLayout();
    const x0 = (area - (step * (n - 1) + cw)) / 2;
    combat.hand.forEach((c, i) => {
      const mid = (n - 1) / 2;
      const off = i - mid;
      const can = combat.canPlay(c.uid);
      const d = CARDS[c.id];
      const el = cardEl(c.id, { up: c.up, scale: HAND_SCALE, costNow: combat.cost(c), returned: c.returned, noafford: !can && !d.unplayable && d.type !== 'debt', unplayable: !!d.unplayable });
      el.style.left = `${x0 + i * step}px`;
      el.style.zIndex = String(10 + i);
      const y = Math.abs(off) * Math.abs(off) * 0.8;
      el.style.transform = `translateY(${y}px) rotate(${off * (n > 6 ? 1.2 : 1.6)}deg)`;
      el.dataset.uid = String(c.uid);
      if (justDrawn.has(c.uid) && !reduce) {
        el.animate([{ transform: `translate(-80px, 60px) rotate(-20deg) scale(.6)`, opacity: 0 }, { transform: el.style.transform, opacity: 1 }], { duration: 340, delay: 40 * [...justDrawn].indexOf(c.uid), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      }
      if (c.uid === selUid) { el.classList.add('sel'); el.style.transform = `translateY(-28px) scale(1.06)`; }
      attachCardInput(el, c);
      handEl.append(el);
    });
    justDrawn.clear();
    renderPreview();
  };

  const renderPreview = () => {
    clear(preview);
    const c = selUid !== null ? combat.hand.find((x) => x.uid === selUid) : undefined;
    if (!c) { hintEl.textContent = combat.phase === 'hero' && combat.turn <= 2 && combat.chordsThisCombat === 0 && !G.chron.tolls ? 'Сыграй Удар, Оберег и Обряд за один ход: это Аккорд.' : ''; return; }
    preview.append(cardEl(c.id, { up: c.up, scale: 1.1, costNow: combat.cost(c), returned: c.returned, flavor: true }));
    const d = CARDS[c.id];
    hintEl.textContent = !combat.canPlay(c.uid)
      ? d.unplayable ? 'Эту карту нельзя сыграть.' : 'Не хватает Дыхания.'
      : needsTarget(c.uid) ? 'Выбери цель: нажми на врага.' : 'Нажми ещё раз или потяни вверх, чтобы сыграть.';
  };

  const renderAll = () => { renderEnemies(); renderHero(); renderHand(); };

  /* ───── ввод ───── */
  const toDesign = (clientX: number, clientY: number) => { const r = stage().getBoundingClientRect(); const s = r.width / SW; return { x: (clientX - r.left) / s, y: (clientY - r.top) / s }; };
  function attachCardInput(el: HTMLElement, c: CardInst) {
    let sx = 0, sy = 0, dragging = false, pid = -1;
    el.addEventListener('pointerdown', (ev) => {
      if (busy) return;
      sx = ev.clientX; sy = ev.clientY; dragging = false; pid = ev.pointerId;
      try { el.setPointerCapture(pid); } catch { /* */ }
    });
    el.addEventListener('pointermove', (ev) => {
      if (pid !== ev.pointerId || busy) return;
      const dx2 = ev.clientX - sx, dy2 = ev.clientY - sy;
      if (!dragging && Math.hypot(dx2, dy2) > 12) { dragging = true; el.style.transition = 'none'; el.style.zIndex = '90'; selUid = c.uid; }
      if (dragging) {
        el.style.transform = `translate(${dx2}px, ${dy2}px) rotate(${dx2 * 0.03}deg) scale(1.05)`;
        const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.en');
        arena.querySelectorAll('.en').forEach((x) => x.classList.toggle('targetable', x === t));
      }
    });
    const end = (ev: PointerEvent) => {
      if (pid !== ev.pointerId) return;
      try { el.releasePointerCapture(pid); } catch { /* */ }
      pid = -1;
      el.style.transition = '';
      if (busy) return;
      if (dragging) {
        const dy2 = ev.clientY - sy;
        const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.en') as HTMLElement | null;
        if (dy2 < -50) void tryPlay(c.uid, under ? Number(under.dataset.uid) : undefined);
        else { selUid = null; renderAll(); }
        return;
      }
      void onCardTap(c.uid);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { pid = -1; renderAll(); });
  }

  async function onCardTap(uid: number) {
    audio.unlock();
    if (selUid === uid) {
      if (!combat.canPlay(uid)) { audio.sfx('deny'); return; }
      if (needsTarget(uid)) { audio.sfx('deny'); hintEl.textContent = 'Выбери цель: нажми на врага.'; return; }
      await tryPlay(uid);
    } else { selUid = uid; audio.sfx('card_up'); renderAll(); }
  }
  async function onEnemyTap(enemyUid: number) {
    if (busy) return;
    if (selUid !== null && combat.canPlay(selUid)) await tryPlay(selUid, enemyUid);
  }

  async function tryPlay(uid: number, target?: number) {
    if (busy || finished) return;
    if (!combat.canPlay(uid)) { audio.sfx('deny'); selUid = null; renderAll(); return; }
    if (needsTarget(uid) && target === undefined) { selUid = uid; renderAll(); hintEl.textContent = 'Выбери цель: нажми на врага.'; return; }
    busy = true;
    const c = combat.hand.find((x) => x.uid === uid)!;
    const d = CARDS[c.id];
    const src = handEl.querySelector(`[data-uid="${uid}"]`) as HTMLElement | null;
    if (src && !reduce) {
      const r = src.getBoundingClientRect(), st = stage().getBoundingClientRect(), s = st.width / SW;
      const fly = cardEl(c.id, { up: c.up, scale: HAND_SCALE, costNow: combat.cost(c) });
      Object.assign(fly.style, { position: 'absolute', left: `${(r.left - st.left) / s}px`, top: `${(r.top - st.top) / s}px`, zIndex: '70', pointerEvents: 'none' });
      root.append(fly);
      fly.animate([{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(-120px) scale(1.2)', opacity: 0 }], { duration: 400, easing: 'cubic-bezier(.3,.7,.3,1)' }).finished.then(() => fly.remove());
    }
    selUid = null;
    const before = combat.events.length;
    try { combat.play(uid, target); } catch (err) { console.error(err); }
    const evs = combat.events.slice(before);
    audio.sfx(d.type === 'strike' ? 'strike' : d.type === 'ward' ? 'ward' : 'rite');
    if (d.type === 'strike') heroAnim.lunge = -1;
    await replay(evs, 70);
    busy = false;
    syncView();
    layout();
    renderAll();
    if (combat.pending) await chooseExhume();
    checkEnd();
  }

  async function chooseExhume() {
    const p = combat.pending;
    if (!p) return;
    busy = true;
    const picked: number[] = [];
    await new Promise<void>((res) => {
      const grid = h('div', { class: 'grid-cards' });
      const btn = h('button', { class: 'btn primary', disabled: true }, 'Вернуть');
      const body = h('div', { class: 'body wide' }, h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 3 } }, `Эксгумация: выбери ${p.count}`), btn), grid);
      const sheet = h('div', { class: 'sheet' }, body);
      for (const uid of p.options) {
        const c = combat.grave.find((x) => x.uid === uid)!;
        const el = cardEl(c.id, { up: c.up, scale: 0.7 });
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          const i = picked.indexOf(uid);
          if (i >= 0) { picked.splice(i, 1); el.style.outline = ''; } else if (picked.length < p.count) { picked.push(uid); el.style.outline = '2px solid #e8a94a'; }
          (btn as HTMLButtonElement).disabled = picked.length !== p.count;
          audio.sfx('card_up');
        });
        grid.append(el);
      }
      btn.addEventListener('click', () => { combat.choose_exhume(picked); sheet.remove(); res(); });
      sheetHost.append(sheet);
    });
    audio.sfx('exhume');
    busy = false;
    syncView();
    renderAll();
  }

  /* ───── воспроизведение событий ───── */
  const posOf = (uid: number | 'hero') => {
    if (uid === 'hero') return { x: dx(heroX), y: FEET * K - 90 };
    const e = combat.enemies.find((q) => q.uid === uid);
    const hh = e ? spr(e).h * sc(e) * K : 100;
    return { x: dx(posX.get(uid) ?? 0), y: FEET * K - hh * 0.6 };
  };
  const floatText = (uid: number | 'hero', text: string, cls = '') => {
    const p = posOf(uid);
    const f = h('div', { class: `float ${cls}`, style: { left: `${p.x + (Math.random() - 0.5) * 20}px`, top: `${p.y}px` } }, text);
    root.append(f);
    setTimeout(() => f.remove(), 1200);
  };
  const shake = (uid: number | 'hero', kind: 'hit' | 'act' = 'hit') => {
    if (uid === 'hero') { heroAnim.shake = 6; hit.classList.remove('on'); void hit.offsetWidth; hit.classList.add('on'); return; }
    const a = anim.get(uid);
    if (a) { if (kind === 'hit') a.shake = 6; else a.lunge = 1; }
  };

  async function replay(evs: GameEvent[], gap: number) {
    for (const e of evs) {
      switch (e.t) {
        case 'damage': {
          const tgt = e.target;
          if (tgt === 'hero') {
            view.heroBlock = Math.max(0, view.heroBlock - e.blocked);
            view.heroHp = Math.max(0, view.heroHp - e.amount);
            if (e.amount > 0) { floatText('hero', `−${e.amount}`, 'hurt'); shake('hero'); audio.sfx('hurt'); } else { floatText('hero', 'блок', 'block'); audio.sfx('block'); }
          } else {
            const v = view.e.get(tgt);
            if (v) { v.block = Math.max(0, v.block - e.blocked); v.hp = Math.max(0, v.hp - e.amount); }
            if (e.amount > 0) { floatText(tgt, `${e.amount}`); shake(tgt); audio.sfx('hit'); } else { floatText(tgt, 'блок', 'block'); audio.sfx('block'); }
          }
          renderEnemies(); renderHeroLite();
          await sleep(gap * 1.4);
          break;
        }
        case 'block': {
          if (e.target === 'hero') { view.heroBlock += e.amount; floatText('hero', `+${e.amount}`, 'block'); } else { const v = view.e.get(e.target); if (v) v.block += e.amount; }
          audio.sfx('block'); renderEnemies(); renderHeroLite(); await sleep(gap); break;
        }
        case 'heal': {
          if (e.target === 'hero') { view.heroHp = Math.min(combat.hero.maxHp, view.heroHp + e.amount); floatText('hero', `+${e.amount}`, 'heal'); } else { const v = view.e.get(e.target); if (v) v.hp += e.amount; floatText(e.target, `+${e.amount}`, 'heal'); }
          audio.sfx('heal'); renderEnemies(); renderHeroLite(); await sleep(gap); break;
        }
        case 'status': floatText(e.target, `${STATUS_NAME[e.status]} ${e.n}`, 'status'); await sleep(gap * 0.6); break;
        case 'death': { const v = view.e.get(e.enemy); if (v) v.dead = true; audio.sfx('kill'); renderEnemies(); await sleep(gap * 4); break; }
        case 'act': shake(e.enemy, 'act'); await sleep(260); break;
        case 'chord': {
          audio.sfx('chord');
          const r = sigs.getBoundingClientRect(), st = stage().getBoundingClientRect(), s = st.width / SW;
          const ring = h('div', { class: 'ring', style: { left: `${(r.left - st.left + r.width / 2) / s}px`, top: `${(r.top - st.top + r.height / 2) / s}px`, width: '50px', height: '50px' } });
          root.append(ring); setTimeout(() => ring.remove(), 1100);
          sigs.classList.add('full'); await sleep(gap * 5); break;
        }
        case 'toll': audio.sfx('toll'); await sleep(gap * 3); break;
        case 'bury': audio.sfx('bury'); await sleep(gap * 0.5); break;
        case 'draw': justDrawn.add(e.card.uid); break;
        case 'summon': await sleep(gap); break;
        default: break;
      }
    }
  }

  const renderHeroLite = () => {
    const hp = Math.max(0, view.heroHp);
    const bar = heroHud.querySelector('.bar.hero');
    if (bar) { (bar.children[0] as HTMLElement).style.width = `${(hp / combat.hero.maxHp) * 100}%`; (bar.children[1] as HTMLElement).textContent = `${hp} / ${combat.hero.maxHp}`; }
  };

  function checkEnd() {
    if (finished || !combat.result) return;
    finished = true; busy = true;
    const res = combat.result;
    setTimeout(() => resolveDone(res), res === 'win' ? 900 : 1300);
  }

  function rewindView(evs: GameEvent[]) {
    for (let i = evs.length - 1; i >= 0; i--) {
      const e = evs[i];
      if (e.t === 'damage') {
        if (e.target === 'hero') { view.heroHp += e.amount; view.heroBlock += e.blocked; } else { const v = view.e.get(e.target) ?? { hp: 0, block: 0, dead: false }; v.hp += e.amount; v.block += e.blocked; view.e.set(e.target, v); }
      } else if (e.t === 'block') {
        if (e.target === 'hero') view.heroBlock -= e.amount; else { const v = view.e.get(e.target); if (v) v.block -= e.amount; }
      } else if (e.t === 'heal') {
        if (e.target === 'hero') view.heroHp -= e.amount; else { const v = view.e.get(e.target); if (v) v.hp -= e.amount; }
      } else if (e.t === 'death') { const v = view.e.get(e.enemy); if (v) v.dead = false; }
    }
    view.heroHp = Math.max(0, Math.min(combat.hero.maxHp, view.heroHp));
    view.heroBlock = Math.max(0, view.heroBlock);
  }

  async function endTurn() {
    audio.unlock();
    if (busy || finished || combat.phase !== 'hero' || combat.pending) return;
    busy = true; selUid = null; renderPreview();
    const before = combat.events.length;
    syncView();
    combat.endTurn();
    const evs = combat.events.slice(before);
    audio.sfx('turn');
    const banner = h('div', { class: 'banner', style: { color: '#e08a70' } }, 'ХОД ВРАГОВ');
    root.append(banner); setTimeout(() => banner.remove(), 1400);
    rewindView(evs);
    layout();
    renderAll();
    await sleep(380);
    await replay(evs.filter((e) => e.t !== 'draw' && e.t !== 'turn'), 120);
    busy = false;
    syncView();
    for (const e of evs) if (e.t === 'draw') justDrawn.add(e.card.uid);
    layout();
    renderAll();
    checkEnd();
    if (!combat.result) { const b2 = h('div', { class: 'banner', style: { color: 'var(--amber)' } }, 'ТВОЙ ХОД'); root.append(b2); setTimeout(() => b2.remove(), 1400); }
  }

  endBtn.addEventListener('click', () => void endTurn());
  pileDraw.addEventListener('click', () => opts.onPiles('draw'));
  pileDis.addEventListener('click', () => opts.onPiles('discard'));
  pileGrave.addEventListener('click', () => opts.onPiles('grave'));
  root.addEventListener('click', (ev) => {
    if (busy) return;
    const t = ev.target as HTMLElement;
    if (selUid !== null && !t.closest('.cw') && !t.closest('.en') && !t.closest('button')) { selUid = null; renderAll(); }
  });

  for (const c of combat.hand) justDrawn.add(c.uid);
  queueMicrotask(() => { renderAll(); raf = requestAnimationFrame(frame); });
  setTimeout(() => {
    const b = h('div', { class: 'banner', style: { color: opts.boss ? '#ff8a6a' : 'var(--amber)' } }, opts.boss ? 'СТРАЖ КРУГА' : 'БОЙ');
    root.append(b); setTimeout(() => b.remove(), 1400);
  }, 200);

  return { el: root, done, stop: () => cancelAnimationFrame(raf) };
}
