import { Combat, HAND_CAP } from '../engine/combat.ts';
import { CARDS } from '../engine/cards.ts';
import { ENEMIES } from '../engine/enemies.ts';
import type { CardInst, EnemyInst, GameEvent } from '../engine/types.ts';
import { cardEl } from './cardview.ts';
import { audio } from './audio.ts';
import { enemyArt, sceneArt } from './art.ts';
import { h, sleep, clear } from './dom.ts';
import { svgIcon, TYPE_ICON, INTENT_ICON, STATUS_NAME, STATUS_HINT } from './icons.ts';
import { startFx } from './fx.ts';
import { G } from './state.ts';

export interface CombatUI {
  el: HTMLElement;
  /** Завершается, когда бой окончен и анимации доиграны. */
  done: Promise<'win' | 'lose'>;
  stop: () => void;
}

interface View {
  heroHp: number;
  heroBlock: number;
  e: Map<number, { hp: number; block: number; dead: boolean }>;
}

const HAND_SCALE = 0.54;

export function buildCombat(combat: Combat, opts: { circle: number; boss: boolean; onInspect: (title: string, text: string) => void; onPiles: (kind: 'draw' | 'discard' | 'grave' | 'exhaust') => void }): CombatUI {
  const reduce = G.chron.settings.reduceMotion;
  const bg = h('div', { class: 'bg drift', html: sceneArt(opts.circle >= 2 ? 'c2' : 'c1') });
  const fx = h('canvas', { class: 'fx' });
  const hintEl = h('div', { class: 'hint' });
  const arena = h('div', { class: 'arena' });
  const handEl = h('div', { class: 'hand' });
  const chordRow = h('div', { class: 'chord-row' });
  const heroBar = h('div', { class: 'bar hero' }, h('i', { class: 'ghost' }), h('i'), h('b'));
  const heroStatuses = h('div', { class: 'statuses' });
  const heroShield = h('div', { class: 'shield', style: { display: 'none' } });
  const orbs = h('div', { class: 'breath' });
  const turnLabel = h('div', { class: 'grow' });
  const preview = h('div', { class: 'preview' });
  const hit = h('div', { class: 'vignette-hit' });
  const pileDraw = h('button', { class: 'pile', 'aria-label': 'Колода' }, h('div', null, 'Колода', h('b')));
  const pileDis = h('button', { class: 'pile', 'aria-label': 'Сброс' }, h('div', null, 'Сброс', h('b')));
  const pileGrave = h('button', { class: 'pile', 'aria-label': 'Могила', style: { display: combat.role === 'gravedigger' ? '' : 'none' } }, h('div', null, 'Могила', h('b')));
  const endBtn = h('button', { class: 'end-turn', 'aria-label': 'Конец хода' }, h('div', { html: svgIcon('bell') }), 'Конец хода');
  const sheetHost = h('div');

  const root = h(
    'div',
    { class: 'screen combat' },
    bg, fx,
    h(
      'div',
      { class: 'layer' },
      h('div', { class: 'cb-top' }, pileDraw, pileDis, pileGrave, turnLabel),
      arena,
      h(
        'div',
        { class: 'hero-zone' },
        h('div', { class: 'hero-line' }, heroBar, heroShield, orbs),
        heroStatuses,
        chordRow,
        hintEl,
      ),
      h('div', { class: 'hand-zone' }, handEl),
      endBtn,
      preview,
    ),
    hit,
    sheetHost,
  );

  const stopFx = startFx(fx as HTMLCanvasElement, opts.circle >= 2 ? 'ash' : 'rain', reduce);

  // ───── вид (отображаемые числа, пока воспроизводятся события) ─────
  const view: View = { heroHp: combat.hero.hp, heroBlock: combat.hero.block, e: new Map() };
  const syncView = () => {
    view.heroHp = combat.hero.hp;
    view.heroBlock = combat.hero.block;
    for (const e of combat.enemies) view.e.set(e.uid, { hp: e.hp, block: e.block, dead: !e.alive });
  };
  syncView();

  let selUid: number | null = null;
  let busy = false;
  let finished = false;
  let resolveDone!: (r: 'win' | 'lose') => void;
  const done = new Promise<'win' | 'lose'>((r) => (resolveDone = r));
  const justDrawn = new Set<number>();

  /* ───── отрисовка ───── */
  const statusChips = (st: Record<string, number | undefined>, extra: [string, number][] = []) => {
    const out: HTMLElement[] = [];
    for (const [k, v] of [...Object.entries(st), ...extra]) {
      if (!v) continue;
      const chip = h('button', { class: `st ${k}`, 'aria-label': `${STATUS_NAME[k]} ${v}` }, h('i'), `${STATUS_NAME[k]} ${v}`);
      chip.addEventListener('click', (ev) => {
        ev.stopPropagation();
        opts.onInspect(STATUS_NAME[k], STATUS_HINT[k]);
      });
      out.push(chip);
    }
    return out;
  };

  const intentChip = (e: EnemyInst) => {
    const m = e.intent;
    let label = m.name;
    let kind = m.kind;
    if (m.kind === 'attack' && m.dmg !== undefined) {
      const dmg = combat.enemyDamage(e, m.dmg);
      label = (m.hits ?? 1) > 1 ? `${dmg}×${m.hits}` : `${dmg}`;
    } else if (m.kind === 'defend') label = m.block ? `${m.block}` : m.blockAll ? `${m.blockAll}+` : m.name;
    else if (m.kind === 'unknown') label = m.name;
    return h('div', { class: `intent ${kind}`, title: m.name, html: `${svgIcon(INTENT_ICON[kind] ?? 'eye', kind === 'attack' || kind === 'defend' ? '' : 'i')}<span>${label}</span>` });
  };

  const needsTarget = (uid: number) => combat.needsTarget(uid);

  const renderEnemies = () => {
    clear(arena);
    const alive = combat.enemies.filter((e) => e.alive || view.e.get(e.uid)?.dead === false);
    const solo = alive.length <= 1;
    const selDef = selUid !== null ? combat.hand.find((c) => c.uid === selUid) : undefined;
    const targeting = !!selDef && needsTarget(selDef.uid);
    for (const e of combat.enemies) {
      const v = view.e.get(e.uid) ?? { hp: e.hp, block: e.block, dead: !e.alive };
      const def = ENEMIES[e.def];
      const tile = h(
        'div',
        { class: ['enemy', solo ? 'solo' : '', v.dead ? 'dead' : 'idle', targeting && !v.dead ? 'targetable' : ''].filter(Boolean).join(' '), dataset: { uid: e.uid }, tabindex: 0, role: 'button', 'aria-label': `${def.name}, ${v.hp} из ${e.maxHp}` },
        v.dead ? null : intentChip(e),
        h('div', { class: 'portrait', html: enemyArt(def.art) }),
        h('div', { class: 'ename' }, def.name),
        h(
          'div',
          { class: 'ebar' },
          h('div', { class: 'bar' }, h('i', { style: { width: `${(Math.max(0, v.hp) / e.maxHp) * 100}%` } }), h('b', null, `${Math.max(0, v.hp)} / ${e.maxHp}`)),
        ),
        v.block > 0 ? h('div', { class: 'eblock' }, h('div', { class: 'shield', html: `${svgIcon('shield')}${v.block}` })) : null,
        h('div', { class: 'statuses' }, statusChips(e.statuses as Record<string, number>, e.strength ? [['toll', 0]] : [])),
      );
      tile.addEventListener('click', () => onEnemyTap(e.uid));
      tile.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        opts.onInspect(def.name, def.blurb);
      });
      let pressT: number | undefined;
      tile.addEventListener('pointerdown', () => (pressT = window.setTimeout(() => opts.onInspect(def.name, def.blurb + '\n\n' + `Намерение: ${e.intent.name}${e.intent.text ? ' — ' + e.intent.text : ''}`), 520)));
      tile.addEventListener('pointerup', () => clearTimeout(pressT));
      tile.addEventListener('pointerleave', () => clearTimeout(pressT));
      arena.append(tile);
    }
  };

  const renderHero = () => {
    const hp = Math.max(0, view.heroHp);
    const [ghost, fill, label] = heroBar.children as unknown as HTMLElement[];
    fill.style.width = `${(hp / combat.hero.maxHp) * 100}%`;
    ghost.style.width = `${(hp / combat.hero.maxHp) * 100}%`;
    label.textContent = `${hp} / ${combat.hero.maxHp}`;
    heroShield.style.display = view.heroBlock > 0 ? '' : 'none';
    heroShield.innerHTML = `${svgIcon('shield')}${view.heroBlock}`;
    clear(heroStatuses);
    const ex: [string, number][] = [];
    if (combat.hero.flame) ex.push(['flame', combat.hero.flame]);
    if (combat.role === 'bellringer') ex.push(['toll', combat.hero.toll]);
    heroStatuses.append(...statusChips(combat.hero.statuses as Record<string, number>, ex));
    const total = Math.max(3, combat.breath);
    clear(orbs);
    for (let i = 0; i < total; i++) orbs.append(h('div', { class: `orb${i < combat.breath ? '' : ' off'}` }));
    // аккорд
    clear(chordRow);
    const full = combat.typesPlayed.size >= 3;
    chordRow.className = `chord-row${full ? ' full' : ''}`;
    for (const t of ['strike', 'ward', 'rite'] as const)
      chordRow.append(h('div', { class: `sig ${t}${combat.typesPlayed.has(t) ? ' on' : ''}`, html: svgIcon(TYPE_ICON[t]), title: t }));
    chordRow.append(h('div', { class: 'chord-label' }, 'Аккорд'));
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
    const cw = 220 * HAND_SCALE;
    const avail = 392;
    const step = n <= 1 ? 0 : Math.min(cw * 0.78, (avail - cw) / (n - 1));
    const left = (420 - (step * (n - 1) + cw)) / 2;
    return { n, cw, step, left };
  };

  const renderHand = () => {
    clear(handEl);
    const { n, cw, step } = handLayout();
    combat.hand.forEach((c, i) => {
      const mid = (n - 1) / 2;
      const off = i - mid;
      const can = combat.canPlay(c.uid);
      const d = CARDS[c.id];
      const el = cardEl(c.id, {
        up: c.up, scale: HAND_SCALE, costNow: combat.cost(c), returned: c.returned, noafford: !can && !d.unplayable && d.type !== 'debt', unplayable: !!d.unplayable,
      });
      const x = (i - mid) * step - cw / 2;
      const y = Math.abs(off) * Math.abs(off) * 2.2;
      const rot = off * (n > 6 ? 2.6 : 3.6);
      el.dataset.uid = String(c.uid);
      el.style.left = `calc(50% + ${x}px)`;
      el.style.zIndex = String(10 + i);
      el.style.transform = `translateY(${y}px) rotate(${rot}deg)`;
      el.dataset.base = el.style.transform;
      if (justDrawn.has(c.uid) && !reduce) {
        el.animate([{ transform: `translate(-60px, 90px) rotate(-20deg) scale(.6)`, opacity: 0 }, { transform: el.style.transform, opacity: 1 }], { duration: 360, delay: 40 * [...justDrawn].indexOf(c.uid), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      }
      if (c.uid === selUid) {
        el.classList.add('sel');
        el.style.transform = `translateY(-34px) scale(1.12)`;
      }
      attachCardInput(el, c);
      handEl.append(el);
    });
    justDrawn.clear();
    renderPreview();
  };

  const renderPreview = () => {
    clear(preview);
    const c = selUid !== null ? combat.hand.find((x) => x.uid === selUid) : undefined;
    if (!c) {
      hintEl.textContent = combat.phase === 'hero' ? 'Нажми карту. Разные типы за ход собирают Аккорд.' : '';
      return;
    }
    const big = cardEl(c.id, { up: c.up, scale: 0.95, costNow: combat.cost(c), returned: c.returned });
    preview.append(big);
    const d = CARDS[c.id];
    hintEl.textContent = !combat.canPlay(c.uid)
      ? d.unplayable ? 'Эту карту нельзя сыграть.' : 'Не хватает Дыхания.'
      : needsTarget(c.uid) ? 'Выбери цель.' : d.target === 'enemy' ? 'Нажми ещё раз или потяни вверх — сыграть.' : 'Нажми ещё раз или потяни вверх — сыграть.';
  };

  const renderAll = () => {
    renderEnemies();
    renderHero();
    renderHand();
  };

  /* ───── ввод ───── */
  function attachCardInput(el: HTMLElement, c: CardInst) {
    let sx = 0, sy = 0, dragging = false, pid = -1;
    el.addEventListener('pointerdown', (ev) => {
      if (busy) return;
      sx = ev.clientX; sy = ev.clientY; dragging = false; pid = ev.pointerId;
      try { el.setPointerCapture(pid); } catch { /* синтетические события */ }
    });
    el.addEventListener('pointermove', (ev) => {
      if (pid !== ev.pointerId || busy) return;
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!dragging && Math.hypot(dx, dy) > 12) {
        dragging = true;
        el.style.transition = 'none';
        el.style.zIndex = '90';
        if (selUid !== c.uid) { selUid = c.uid; }
      }
      if (dragging) {
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.04}deg) scale(1.08)`;
        const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.enemy');
        arena.querySelectorAll('.enemy').forEach((x) => x.classList.toggle('targetable', x === t));
      }
    });
    const end = (ev: PointerEvent) => {
      if (pid !== ev.pointerId) return;
      try { el.releasePointerCapture(pid); } catch { /* */ }
      pid = -1;
      el.style.transition = '';
      if (busy) return;
      if (dragging) {
        const dy = ev.clientY - sy;
        const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.enemy') as HTMLElement | null;
        if (dy < -70) {
          const uid = under ? Number(under.dataset.uid) : undefined;
          void tryPlay(c.uid, uid);
        } else {
          selUid = null;
          renderAll();
        }
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
    } else {
      selUid = uid;
      audio.sfx('card_up');
      renderAll();
    }
  }

  async function onEnemyTap(enemyUid: number) {
    if (busy) return;
    if (selUid !== null && combat.canPlay(selUid)) await tryPlay(selUid, enemyUid);
  }

  async function tryPlay(uid: number, target?: number) {
    if (busy || finished) return;
    if (!combat.canPlay(uid)) { audio.sfx('deny'); selUid = null; renderAll(); return; }
    if (needsTarget(uid) && target === undefined) {
      selUid = uid;
      renderAll();
      hintEl.textContent = 'Выбери цель: нажми на врага.';
      return;
    }
    busy = true;
    const c = combat.hand.find((x) => x.uid === uid)!;
    const d = CARDS[c.id];
    // «полёт» карты
    const src = handEl.querySelector(`[data-uid="${uid}"]`) as HTMLElement | null;
    if (src && !reduce) {
      const r = src.getBoundingClientRect();
      const fly = cardEl(c.id, { up: c.up, scale: HAND_SCALE, costNow: combat.cost(c) });
      const st = root.getBoundingClientRect();
      Object.assign(fly.style, { position: 'absolute', left: `${r.left - st.left}px`, top: `${r.top - st.top}px`, zIndex: '70', pointerEvents: 'none' });
      root.append(fly);
      fly.animate([{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(-170px) scale(1.18)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.3,.7,.3,1)' }).finished.then(() => fly.remove());
    }
    selUid = null;
    const before = combat.events.length;
    const hadChord = combat.chordDone;
    try {
      combat.play(uid, target);
    } catch (err) {
      console.error(err);
    }
    const evs = combat.events.slice(before);
    audio.sfx(d.type === 'strike' ? 'strike' : d.type === 'ward' ? 'ward' : 'rite');
    await replay(evs, 70);
    if (!hadChord && combat.chordDone) { /* визуал в replay */ }
    busy = false;
    syncView();
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
      const body = h('div', { class: 'body' }, h('h2', { class: 'title' }, 'Эксгумация'), h('p', { class: 'sub' }, `Выбери карт: ${p.count}. ${p.free ? 'В этот ход она бесплатна.' : ''}`), h('div', { style: { height: '10px' } }), grid, h('div', { style: { height: '12px' } }), btn);
      const sheet = h('div', { class: 'sheet' }, body);
      for (const uid of p.options) {
        const c = combat.grave.find((x) => x.uid === uid)!;
        const el = cardEl(c.id, { up: c.up, scale: 0.42 });
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          const i = picked.indexOf(uid);
          if (i >= 0) { picked.splice(i, 1); el.style.outline = ''; }
          else if (picked.length < p.count) { picked.push(uid); el.style.outline = '2px solid #e8a94a'; }
          (btn as HTMLButtonElement).disabled = picked.length !== p.count;
          audio.sfx('card_up');
        });
        grid.append(el);
      }
      btn.addEventListener('click', () => {
        combat.choose_exhume(picked);
        sheet.remove();
        res();
      });
      sheetHost.append(sheet);
    });
    audio.sfx('exhume');
    busy = false;
    syncView();
    renderAll();
  }

  /* ───── воспроизведение событий ───── */
  const posOf = (uid: number | 'hero') => {
    const st = root.getBoundingClientRect();
    if (uid === 'hero') {
      const r = heroBar.getBoundingClientRect();
      return { x: r.left - st.left + r.width / 2, y: r.top - st.top - 10 };
    }
    const el = arena.querySelector(`[data-uid="${uid}"] .portrait`) as HTMLElement | null;
    if (!el) return { x: st.width / 2, y: st.height * 0.3 };
    const r = el.getBoundingClientRect();
    return { x: r.left - st.left + r.width / 2, y: r.top - st.top + r.height * 0.4 };
  };
  const floatText = (uid: number | 'hero', text: string, cls = '') => {
    const p = posOf(uid);
    const f = h('div', { class: `float ${cls}`, style: { left: `${p.x + (Math.random() - 0.5) * 24}px`, top: `${p.y}px` } }, text);
    root.append(f);
    setTimeout(() => f.remove(), 1250);
  };
  const shake = (uid: number | 'hero', cls = 'hit') => {
    if (uid === 'hero') {
      hit.classList.remove('on');
      void hit.offsetWidth;
      hit.classList.add('on');
      if (!reduce) root.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-2px)' }, { transform: 'translate(0,0)' }], { duration: 260 });
      return;
    }
    const el = arena.querySelector(`[data-uid="${uid}"]`);
    el?.classList.remove('hit', 'act');
    void (el as HTMLElement | null)?.offsetWidth;
    el?.classList.add(cls);
  };

  async function replay(evs: GameEvent[], gap: number) {
    for (const e of evs) {
      switch (e.t) {
        case 'damage': {
          const tgt = e.target;
          if (tgt === 'hero') {
            view.heroBlock = Math.max(0, view.heroBlock - e.blocked);
            view.heroHp = Math.max(0, view.heroHp - e.amount);
            if (e.amount > 0) { floatText('hero', `−${e.amount}`, 'hurt'); shake('hero'); audio.sfx('hurt'); }
            else { floatText('hero', 'блок', 'block'); audio.sfx('block'); }
          } else {
            const v = view.e.get(tgt);
            if (v) { v.block = Math.max(0, v.block - e.blocked); v.hp = Math.max(0, v.hp - e.amount); }
            if (e.amount > 0) { floatText(tgt, `${e.amount}`); shake(tgt); audio.sfx('hit'); }
            else { floatText(tgt, 'блок', 'block'); audio.sfx('block'); }
          }
          renderEnemies(); renderHeroLite();
          await sleep(gap * 1.4);
          break;
        }
        case 'block': {
          if (e.target === 'hero') { view.heroBlock += e.amount; floatText('hero', `+${e.amount}`, 'block'); }
          else { const v = view.e.get(e.target); if (v) v.block += e.amount; }
          audio.sfx('block');
          renderEnemies(); renderHeroLite();
          await sleep(gap);
          break;
        }
        case 'heal': {
          if (e.target === 'hero') { view.heroHp = Math.min(combat.hero.maxHp, view.heroHp + e.amount); floatText('hero', `+${e.amount}`, 'heal'); }
          else { const v = view.e.get(e.target); if (v) v.hp += e.amount; floatText(e.target, `+${e.amount}`, 'heal'); }
          audio.sfx('heal');
          renderEnemies(); renderHeroLite();
          await sleep(gap);
          break;
        }
        case 'status': {
          floatText(e.target, `${STATUS_NAME[e.status]} ${e.n}`, 'status');
          await sleep(gap * 0.6);
          break;
        }
        case 'death': {
          const v = view.e.get(e.enemy);
          if (v) v.dead = true;
          audio.sfx('kill');
          renderEnemies();
          await sleep(gap * 4);
          break;
        }
        case 'act': {
          shake(e.enemy, 'act');
          await sleep(240);
          break;
        }
        case 'chord': {
          audio.sfx('chord');
          const st = root.getBoundingClientRect();
          const r = chordRow.getBoundingClientRect();
          const ring = h('div', { class: 'ring', style: { left: `${r.left - st.left + r.width / 2}px`, top: `${r.top - st.top + r.height / 2}px`, width: '90px', height: '90px' } });
          root.append(ring);
          setTimeout(() => ring.remove(), 1200);
          chordRow.classList.add('full');
          await sleep(gap * 5);
          break;
        }
        case 'toll': audio.sfx('toll'); await sleep(gap * 3); break;
        case 'bury': audio.sfx('bury'); await sleep(gap * 0.5); break;
        case 'draw': justDrawn.add(e.card.uid); break;
        case 'summon': await sleep(gap); break;
        case 'turn': break;
        default: break;
      }
    }
  }

  const renderHeroLite = () => {
    const hp = Math.max(0, view.heroHp);
    const [ghost, fill, label] = heroBar.children as unknown as HTMLElement[];
    fill.style.width = `${(hp / combat.hero.maxHp) * 100}%`;
    ghost.style.width = `${(Math.max(hp, 0) / combat.hero.maxHp) * 100}%`;
    label.textContent = `${hp} / ${combat.hero.maxHp}`;
    heroShield.style.display = view.heroBlock > 0 ? '' : 'none';
    heroShield.innerHTML = `${svgIcon('shield')}${view.heroBlock}`;
  };

  function checkEnd() {
    if (finished || !combat.result) return;
    finished = true;
    busy = true;
    const res = combat.result;
    setTimeout(() => resolveDone(res), res === 'win' ? 900 : 1300);
  }

  async function endTurn() {
    audio.unlock();
    if (busy || finished || combat.phase !== 'hero') return;
    if (combat.pending) return;
    busy = true;
    selUid = null;
    const hadCards = combat.hand.some((c) => combat.canPlay(c.uid));
    void hadCards;
    renderPreview();
    const before = combat.events.length;
    // фиксируем «до» для плавных чисел
    syncView();
    combat.endTurn();
    const evs = combat.events.slice(before);
    audio.sfx('turn');
    // показать ход врагов
    const banner = h('div', { class: 'turn-banner', style: { color: '#e08a70' } }, 'Ход врагов');
    root.append(banner);
    setTimeout(() => banner.remove(), 1500);
    // для воспроизведения вернём отображаемые значения «до хода врагов»
    rewindView(evs);
    renderAll();
    await sleep(380);
    await replay(evs.filter((e) => e.t !== 'draw' && e.t !== 'turn'), 120);
    busy = false;
    syncView();
    // добор нового хода
    for (const e of evs) if (e.t === 'draw') justDrawn.add(e.card.uid);
    renderAll();
    checkEnd();
    if (!combat.result) {
      const b2 = h('div', { class: 'turn-banner', style: { color: 'var(--candle)' } }, 'Твой ход');
      root.append(b2);
      setTimeout(() => b2.remove(), 1500);
    }
  }

  /** Возвращает отображаемые числа к состоянию до событий, чтобы анимировать урон по шагам. */
  function rewindView(evs: GameEvent[]) {
    // Идём по событиям в обратном порядке и откатываем эффекты damage/block/heal.
    for (let i = evs.length - 1; i >= 0; i--) {
      const e = evs[i];
      if (e.t === 'damage') {
        if (e.target === 'hero') { view.heroHp += e.amount; view.heroBlock += e.blocked; }
        else { const v = view.e.get(e.target) ?? { hp: 0, block: 0, dead: false }; v.hp += e.amount; v.block += e.blocked; view.e.set(e.target, v); }
      } else if (e.t === 'block') {
        if (e.target === 'hero') view.heroBlock -= e.amount;
        else { const v = view.e.get(e.target); if (v) v.block -= e.amount; }
      } else if (e.t === 'heal') {
        if (e.target === 'hero') view.heroHp -= e.amount;
        else { const v = view.e.get(e.target); if (v) v.hp -= e.amount; }
      } else if (e.t === 'death') {
        const v = view.e.get(e.enemy);
        if (v) v.dead = false;
      }
    }
    // Броня героя сбрасывается в начале его хода, а блок врагов в начале их хода — исправим ориентир.
    view.heroHp = Math.max(0, Math.min(combat.hero.maxHp, view.heroHp));
    view.heroBlock = Math.max(0, view.heroBlock);
  }

  endBtn.addEventListener('click', () => void endTurn());
  const openPile = (kind: 'draw' | 'discard' | 'grave') => opts.onPiles(kind);
  pileDraw.addEventListener('click', () => openPile('draw'));
  pileDis.addEventListener('click', () => openPile('discard'));
  pileGrave.addEventListener('click', () => openPile('grave'));
  root.addEventListener('click', (ev) => {
    if (busy) return;
    const t = ev.target as HTMLElement;
    if (selUid !== null && !t.closest('.cw') && !t.closest('.enemy') && !t.closest('button')) {
      selUid = null;
      renderAll();
    }
  });

  syncView();
  // Добор первого хода показываем сразу
  for (const c of combat.hand) justDrawn.add(c.uid);
  queueMicrotask(() => renderAll());
  setTimeout(() => {
    const b = h('div', { class: 'turn-banner', style: { color: opts.boss ? '#ff8a6a' : 'var(--candle)' } }, opts.boss ? 'Страж Круга' : 'Бой');
    root.append(b);
    setTimeout(() => b.remove(), 1500);
  }, 200);

  return { el: root, done, stop: () => { stopFx(); } };
}

export { HAND_CAP };
