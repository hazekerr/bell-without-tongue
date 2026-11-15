import { Combat } from '../engine/combat.ts';
import { BASIC_DECKS, CARDS, ROLE_INFO } from '../engine/cards.ts';
import { ENEMIES } from '../engine/enemies.ts';
import { RELICS } from '../engine/relics.ts';
import { Rng } from '../engine/rng.ts';
import {
  type PageGrant, cardEnabled, exportChronicle, grantPage, importChronicle, isCardUnlocked, newChronicle, tryGrantPage, unlockRole,
} from '../engine/chronicle.ts';
import {
  type MapNode, type ReturnReport, FLOORS, MAX_CIRCLE, addCard, addRelic, available, bodyPage, finishCombat, genShop, nextCircle, nodeById, onDeath,
  onVictory, removable, restHeal, rngOf, saveRng, startCombat, startRun, upgradeable,
} from '../engine/run.ts';
import { pickEvent } from '../engine/events.ts';
import { PAGES, PAGE_LIST, NAMES } from '../content/pages.ts';
import { HUB_TALKS, type HubTalk } from '../content/hub.ts';
import { audio } from './audio.ts';
import { cardArt, enemyArt, motifArt, sceneArt, visionArt } from './art.ts';
import { cardEl } from './cardview.ts';
import { buildCombat } from './combatview.ts';
import { clear, h, sleep } from './dom.ts';
import { startFx, type FxKind } from './fx.ts';
import { NODE_ICON, NODE_LABEL, svgIcon } from './icons.ts';
import { G, applySettings, clearRun, loadRun, save, saveRun } from './state.ts';
import {
  btn, cardsGrid, chooseFromDeck, dialogue, inspect, inspectCard, pageReveal, pageReveals, pickCard, relicChip, relicSheet, sheet, stage, toast,
} from './kit.ts';

const CIRCLE_NAME: Record<number, string> = { 1: 'Круг I · Мелководье', 2: 'Круг II · Рёбра', 3: 'Круг III · Нижний Хор' };
const ROMAN = ['', 'I', 'II', 'III'];

/* ───────────────── Монтаж экранов ───────────────── */
let stops: (() => void)[] = [];
function mount(el: HTMLElement, stop?: () => void) {
  stops.forEach((s) => s());
  stops = stop ? [stop] : [];
  const st = stage();
  st.querySelectorAll('.screen, .sheet, .dialog, .toast, .fade-to').forEach((n) => n.remove());
  st.append(el);
}

function screen(cls: string, bgKind: Parameters<typeof sceneArt>[0], fxKind?: FxKind, drift = true) {
  const bg = h('div', { class: `bg${drift ? ' drift' : ''}`, html: sceneArt(bgKind) });
  const canvas = h('canvas', { class: 'fx' });
  const layer = h('div', { class: 'layer' });
  const root = h('div', { class: `screen ${cls}` }, bg, fxKind ? canvas : null, layer);
  const stopFx = fxKind ? () => startFx(canvas as HTMLCanvasElement, fxKind, G.chron.settings.reduceMotion) : undefined;
  return { root, layer, startFx: stopFx };
}

function mountScreen(s: ReturnType<typeof screen>) {
  let stop: (() => void) | undefined;
  mount(s.root, () => stop?.());
  if (s.startFx) stop = s.startFx();
}

/* ───────────────── Титул ───────────────── */
export function showTitle() {
  const s = screen('title-screen', 'title', 'embers');
  const hasRun = !!G.run;
  s.layer.append(
    h('div', { class: 'logo' }, h('div', { class: 'bellglyph', html: svgIcon('bell') }), h('h1', null, 'Колокол', h('span', null, 'без языка')), h('p', null, 'Смерть — это тоже страница.')),
    btn(G.chron.prologueDone ? (hasRun ? 'Продолжить спуск' : 'Войти в Сальвен') : 'Начать', 'primary', async () => {
      audio.unlock();
      if (!G.chron.prologueDone) startPrologue();
      else if (hasRun) showMap();
      else showHub();
    }),
    G.chron.prologueDone ? btn('Настройки', 'ghost', () => openSettings()) : h('div'),
    h('div', { class: 'vers' }, 'Вертикальный срез · v0.1'),
  );
  mountScreen(s);
  audio.play('title');
}

/* ───────────────── Пролог ───────────────── */
async function startPrologue() {
  audio.unlock();
  audio.play('vision');
  const black = h('div', { class: 'screen', style: { background: '#000' } });
  mount(black);
  await dialogue([
    { who: 'Рассказчик', text: 'Триста лет назад над Ор-Вейлом погасло солнце. Свет остался только в колоколах.' },
    { who: 'Рассказчик', text: 'Колокола зовут мёртвых обратно. Не из милости. Им нужны руки, чтобы спускаться в колодец.' },
    { who: 'Рассказчик', text: 'Ты — одна из этих рук. Ты не помнишь своего имени. Ты не помнишь, как умер. Помнишь только звон.' },
    { who: 'Рассказчик', text: 'Сейчас колокол зазвонит снова. Это нормально. Это — начало.' },
  ]);
  const run = startRun(G.chron, 'gravedigger', 'prologue');
  run.hp = run.maxHp = 44;
  const combat = new Combat({ rng: new Rng(11), role: 'gravedigger', deck: run.deck, hp: 44, maxHp: 44, relics: [], enemies: ['gatekeeper'], circle: 1 });
  const hints: Record<number, string> = {
    1: 'Разные типы карт за ход — Удар, Оберег, Обряд — складываются в Аккорд. Для Могильщика это возврат карты из Могилы.',
    2: 'Над врагом видно, что он сделает. Если удар тяжёлый — закройся Оберегом.',
    3: 'Привратник бьёт всё сильнее с каждым ходом.',
    4: 'Ты не победишь. Это нормально. Продержись и посмотри, что будет.',
  };
  combat.listener = (e) => {
    if (e.t === 'turn' && e.who === 'hero' && hints[e.n]) setTimeout(() => toast('Подсказка', hints[e.n]), 900);
  };
  await runCombatUI(combat, { circle: 1, boss: true });
  const rep = onDeath(run, combat, G.chron);
  G.chron.prologueDone = true;
  save();
  await returnSequence(rep, run, true);
}

/* ───────────────── Бой (общая обёртка) ───────────────── */
async function runCombatUI(combat: Combat, o: { circle: number; boss: boolean }): Promise<'win' | 'lose'> {
  audio.play(o.boss ? 'boss' : 'combat');
  const ui = buildCombat(combat, {
    circle: o.circle,
    boss: o.boss,
    onInspect: (t, x) => inspect(t, x),
    onPiles: (k) => showPile(combat, k),
  });
  mount(ui.el, ui.stop);
  const intensityTimer = window.setInterval(() => {
    audio.intensity = Math.min(1, Math.max(0, 1 - combat.hero.hp / combat.hero.maxHp));
  }, 800);
  const res = await ui.done;
  clearInterval(intensityTimer);
  audio.intensity = 0;
  return res;
}

function showPile(combat: Combat, kind: 'draw' | 'discard' | 'grave' | 'exhaust') {
  const src = kind === 'draw' ? [...combat.drawPile].sort((a, b) => a.id.localeCompare(b.id)) : kind === 'discard' ? combat.discard : kind === 'grave' ? combat.grave : combat.exhausted;
  const name = { draw: 'Колода (порядок скрыт)', discard: 'Сброс', grave: 'Могила', exhaust: 'Исчерпано' }[kind];
  const s = sheet([h('h2', { class: 'title' }, `${name} · ${src.length}`), h('div', { style: { height: '10px' } }), src.length ? cardsGrid(src.map((c) => ({ id: c.id, up: c.up }))) : h('p', { class: 'sub' }, 'Пусто.'), h('div', { style: { height: '12px' } }), btn('Закрыть', 'ghost', () => s.close())]);
}

/* ───────────────── Хаб ───────────────── */
function pickTalk(): HubTalk | null {
  const c = G.chron;
  const special = HUB_TALKS.filter((t) => t.priority >= 20 && t.when(c)).sort((a, b) => b.priority - a.priority);
  if (special.length) return special[0];
  if (Math.random() < 0.45) {
    const gen = HUB_TALKS.filter((t) => t.priority < 20);
    return gen[Math.floor(Math.random() * gen.length)];
  }
  return null;
}

export async function showHub(opts: { talk?: boolean } = {}) {
  audio.play('hub');
  const s = screen('hub', 'hub', 'embers');
  const last = G.chron.bodies[0];
  const board = h(
    'div',
    { class: 'board' },
    h('b', null, `Звонов: ${G.chron.tolls}`),
    last ? h('i', null, last.epitaph) : h('i', null, 'Доска Мёрка пуста. Пока.'),
  );
  const settings = h('button', { class: 'icon-btn', 'aria-label': 'Настройки', html: '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5v-2l-2.2-.6a7 7 0 0 0-.7-1.7l1.2-2-1.4-1.4-2 1.2a7 7 0 0 0-1.7-.7L13 3h-2l-.6 2.2a7 7 0 0 0-1.7.7l-2-1.2L5.3 6.1l1.2 2a7 7 0 0 0-.7 1.7L3.6 10.4v2l2.2.6c.1.6.4 1.2.7 1.7l-1.2 2 1.4 1.4 2-1.2c.5.3 1.1.6 1.7.7L11 21h2l.6-2.2c.6-.1 1.2-.4 1.7-.7l2 1.2 1.4-1.4-1.2-2c.3-.5.6-1.1.7-1.7z"/></svg>' });
  settings.addEventListener('click', () => openSettings());
  s.layer.append(
    h('div', { class: 'hub-top' }, board, settings),
    h(
      'div',
      { class: 'hub-bottom' },
      G.run
        ? h('div', { class: 'stack' }, btn('Продолжить спуск', 'primary', () => showMap(), `${CIRCLE_NAME[G.run.circle]} · ${G.run.hp}/${G.run.maxHp}`), btn('Оставить спуск', 'ghost', () => abandonConfirm()))
        : btn('Спуститься', 'primary', () => openRolePick(), 'Колода и здоровье не сохраняются'),
      h('div', { class: 'row' }, btn('Хроника', 'ghost', () => openChronicle(), `${G.chron.pages.length}/${PAGE_LIST.length}`), btn('Карты', 'ghost', () => openLibrary(), `${countUnlocked()}/${Object.keys(CARDS).length}`)),
    ),
  );
  mountScreen(s);
  if (opts.talk) {
    await sleep(500);
    const t = pickTalk();
    if (t) {
      await dialogue(t.lines);
      const special = t.priority >= 20;
      if (special) G.chron.seenTalks.push(t.id);
      const gs: PageGrant[] = [];
      for (const id of t.grants ?? []) {
        const g = tryGrantPage(G.chron, id);
        if (g?.isNew) gs.push(g);
      }
      save();
      await pageReveals(gs);
    }
  }
}

const countUnlocked = () => Object.keys(CARDS).filter((id) => isCardUnlocked(G.chron, id)).length;

function abandonConfirm() {
  const s = sheet([
    h('h2', { class: 'title' }, 'Оставить спуск?'),
    h('p', { class: 'sub', style: { margin: '10px 0 16px' } }, 'Колода, здоровье и монеты пропадут. Хроника останется: она не зависит от забега.'),
    h('div', { class: 'stack' }, btn('Оставить', 'primary', () => { s.close(); clearRun(); showHub(); }), btn('Вернуться', 'ghost', () => s.close())),
  ], { center: true });
}

/* ───────────────── Выбор роли ───────────────── */
function openRolePick() {
  const roles: ('gravedigger' | 'wickkeeper' | 'bellringer' | 'penitent')[] = ['gravedigger', 'wickkeeper', 'bellringer', 'penitent'];
  const list = h('div', { class: 'stack' });
  const s = sheet([h('h2', { class: 'title' }, 'Кого ты вспомнишь?'), h('p', { class: 'sub' }, 'Безымянный надевает чужую память.'), h('div', { style: { height: '8px' } }), list, h('div', { style: { height: '8px' } }), btn('Назад', 'ghost', () => s.close())]);
  for (const r of roles) {
    const info = ROLE_INFO[r];
    const open = G.chron.roles.includes(r) && BASIC_DECKS[r].length > 0;
    const card = h(
      'button',
      { class: `role-card${open ? '' : ' locked'}` },
      h('div', { class: 'rart', html: motifArt(r === 'gravedigger' ? 'spade' : r === 'wickkeeper' ? 'candle' : r === 'bellringer' ? 'bell' : 'iou', r === 'wickkeeper' ? 'strike' : 'rite', 84, 120) }),
      h('div', null, h('h3', null, info.name), h('div', { class: 'tag' }, info.tagline), h('p', null, open ? info.blurb : 'Откроется по ходу истории.'), open ? h('p', { style: { color: 'var(--candle)', marginTop: '6px' } }, info.chord) : null, open ? h('div', { class: 'deck-start' }, `ЗДР ${info.hp} · 10 карт · 3 Дыхания`) : null),
    );
    if (open) card.addEventListener('click', () => { audio.sfx('tap'); s.close(); beginRun(r); });
    list.append(card);
  }
}

async function beginRun(role: 'gravedigger' | 'wickkeeper' | 'bellringer' | 'penitent') {
  G.run = startRun(G.chron, role);
  save();
  audio.sfx('bell');
  const black = h('div', { class: 'screen', style: { background: '#000' } });
  mount(black);
  const intro = [
    { who: 'Рассказчик' as const, text: `Ты надеваешь память ${role === 'gravedigger' ? 'могильщика' : 'свечницы'}. Она тяжёлая, но своя.` },
  ];
  await dialogue(intro);
  showMap();
}

/* ───────────────── Карта ───────────────── */
export function showMap() {
  const run = G.run;
  if (!run) return showHub();
  audio.play('map');
  const s = screen('map', run.circle >= 2 ? 'map2' : 'map1', run.circle >= 2 ? 'ash' : 'rain');
  const avail = new Set(available(run).map((n) => n.id));
  const ROW = 104;
  const H0 = 90 + (FLOORS + 1) * ROW + 120;
  const posX = (n: MapNode) => (n.type === 'boss' ? 50 : 14 + (n.col / 3) * 72);
  const posY = (n: MapNode) => (n.type === 'boss' ? 90 + FLOORS * ROW + 20 : 90 + n.floor * ROW);
  const inner = h('div', { class: 'map-inner', style: { height: `${H0}px` } });
  const wrap = h('div', { class: 'map-wrap' }, inner);
  // линии
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'lines');
  svg.setAttribute('viewBox', `0 0 100 ${H0}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const done = new Set<string>();
  let cur = run.at ? nodeById(run, run.at) : undefined;
  while (cur) {
    done.add(cur.id);
    cur = run.map.find((n) => n.next.includes(cur!.id) && n.floor === cur!.floor - 1 && (done.has(n.id) || true) && pathDone(run, n.id, cur!.id));
  }
  for (const n of run.map) {
    for (const nid of n.next) {
      const m = nodeById(run, nid);
      if (!m) continue;
      const p = document.createElementNS(svgNS, 'path');
      const x1 = posX(n), y1 = posY(n), x2 = posX(m), y2 = posY(m);
      p.setAttribute('d', `M${x1} ${y1}C${x1} ${y1 + 44} ${x2} ${y2 - 44} ${x2} ${y2}`);
      p.setAttribute('fill', 'none');
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      const used = done.has(n.id) && (done.has(m.id) || avail.has(m.id));
      p.setAttribute('stroke', used ? '#e8a94a' : 'rgba(217,210,192,.22)');
      p.setAttribute('stroke-width', used ? '2.4' : '1.4');
      p.setAttribute('stroke-dasharray', used ? '' : '3 6');
      svg.append(p);
    }
  }
  inner.append(svg);
  let focusY = 0;
  for (const n of run.map) {
    const isAvail = avail.has(n.id);
    const isDone = done.has(n.id);
    const el = h(
      'button',
      {
        class: `node ${n.type}${isAvail ? ' avail' : ''}${isDone ? ' done' : ''}${!isAvail && !isDone ? ' locked' : ''}${run.at === n.id ? ' cur' : ''}`,
        style: { left: `${posX(n)}%`, top: `${posY(n)}px` },
        'aria-label': `${NODE_LABEL[n.type]}${isAvail ? ', доступно' : ''}`,
        html: svgIcon(NODE_ICON[n.type]),
        disabled: !isAvail,
      },
    );
    el.addEventListener('click', () => { if (isAvail) enterNode(n); });
    inner.append(el);
    inner.append(h('div', { class: 'node-label', style: { left: `${posX(n)}%`, top: `${posY(n)}px` } }, isAvail || n.type === 'boss' ? NODE_LABEL[n.type] : ''));
    if (isAvail) focusY = Math.max(focusY, posY(n));
  }
  const relics = h('div', { class: 'relic-row' }, run.relics.map((r) => relicChip(r)));
  const deckBtn = h('button', { class: 'chip', 'aria-label': 'Колода' }, `Колода ${run.deck.length}`);
  deckBtn.addEventListener('click', () => showDeck());
  s.layer.append(
    h('div', { class: 'topbar' }, h('div', { class: 'grow' }, h('div', { class: 'kicker' }, CIRCLE_NAME[run.circle]), h('div', { style: { fontSize: '14px', color: 'var(--bone-dim)' } }, `${ROLE_INFO[run.role].name} · ${run.stats.nodes} шагов`)), h('span', { class: 'chip hp' }, `${run.hp}/${run.maxHp}`), h('span', { class: 'chip gold' }, `${run.gold}`), deckBtn),
    relics.childElementCount ? relics : h('div'),
    wrap,
  );
  mountScreen(s);
  requestAnimationFrame(() => {
    wrap.scrollTop = Math.max(0, (focusY || 0) - wrap.clientHeight * 0.42);
  });
}

function pathDone(run: ReturnType<typeof startRun>, fromId: string, toId: string) {
  void run; void fromId; void toId;
  return true;
}

function showDeck() {
  const run = G.run;
  if (!run) return;
  const sorted = [...run.deck].sort((a, b) => CARDS[a.id].type.localeCompare(CARDS[b.id].type) || CARDS[a.id].cost - CARDS[b.id].cost);
  const s = sheet([h('h2', { class: 'title' }, `Колода · ${run.deck.length}`), h('div', { style: { height: '8px' } }), cardsGrid(sorted.map((c) => ({ id: c.id, up: c.up })), (c) => inspectCard(c)), h('div', { style: { height: '12px' } }), btn('Закрыть', 'ghost', () => s.close())]);
}

/* ───────────────── Узлы ───────────────── */
async function enterNode(node: MapNode) {
  const run = G.run!;
  audio.sfx('step');
  run.resume = { rng: run.rng, enc: run.seenEncounters.length, ev: run.seenEvents.length };
  run.active = node.id;
  saveRun();
  switch (node.type) {
    case 'fight': case 'elite': case 'boss': return doCombat(node);
    case 'event': return doEvent(node);
    case 'shop': return doShop(node);
    case 'rest': return doRest(node);
    case 'body': return doBody(node);
  }
}

function closeNode(node: MapNode) {
  const run = G.run!;
  run.active = null;
  run.at = node.id;
  run.stats.nodes++;
  save();
}

async function doCombat(node: MapNode) {
  const run = G.run!;
  const combat = startCombat(run, node, G.chron);
  const res = await runCombatUI(combat, { circle: run.circle, boss: node.type === 'boss' });
  if (res === 'lose') {
    run.hp = 0;
    const rep = onDeath(run, combat, G.chron);
    clearRun();
    save();
    return returnSequence(rep, run, false);
  }
  audio.sfx('win');
  const reward = finishCombat(run, combat, node, G.chron);
  if (reward.relic) addRelic(run, reward.relic);
  save();
  await rewardFlow(reward, node, combat);
}

async function rewardFlow(reward: ReturnType<typeof finishCombat>, node: MapNode, combat: Combat) {
  const run = G.run!;
  const s = screen('reward', run.circle >= 2 ? 'c2' : 'c1', 'embers');
  const lines: HTMLElement[] = [h('div', { class: 'gold-line' }, `+${reward.gold} монет`)];
  if (reward.healed) lines.push(h('p', { class: 'sub' }, `Огарок исцелил ${reward.healed}.`));
  if (combat.goldGain) lines.push(h('p', { class: 'sub' }, `Из них мародёрство: ${combat.goldGain}.`));
  if (reward.relic) {
    const r = RELICS[reward.relic];
    lines.push(h('div', { class: 'relic-big' }, h('div', { class: 'relic', html: motifArt(r.art, 'rite', 120, 120) }), h('div', null, h('b', null, r.name), h('p', null, r.text))));
  }
  const cont = btn(node.type === 'boss' ? 'Спуститься глубже' : 'Выбрать карту', 'primary', async () => {
    const pick = await pickCard(reward.cards, 'Добавить в колоду', 'Пропустить (+8 монет)', G.chron.fresh);
    if (pick) addCard(run, pick);
    else run.gold += 8;
    save();
    await afterBattle(node);
  });
  s.layer.append(h('div', { style: { height: '14%' } }), h('h2', { class: 'title' }, node.type === 'boss' ? 'Страж пал' : 'Победа'), h('div', { class: 'pad stack', style: { marginTop: 'auto' } }, ...lines, cont));
  s.layer.style.justifyContent = 'flex-start';
  mountScreen(s);
  audio.play('map');
  await sleep(300);
  await pageReveals(reward.grants);
}

async function afterBattle(node: MapNode) {
  const run = G.run!;
  if (node.type === 'boss') {
    if (run.circle >= MAX_CIRCLE) return victory();
    nextCircle(run, G.chron);
    save();
    audio.sfx('bell');
    await dialogue([{ who: 'Рассказчик', text: run.circle === 2 ? 'Вода уходит. Над тобой смыкаются своды — рёбра. Не города. Чьи-то ещё.' : '…' }]);
  }
  showMap();
}

/* ───────────────── Событие ───────────────── */
async function doEvent(node: MapNode) {
  const run = G.run!;
  const ev = pickEvent(run, G.chron);
  audio.play('vision');
  const s = screen('event', run.circle >= 2 ? 'c2' : 'c1', undefined, false);
  const optsEl = h('div', { class: 'stack' });
  const textEl = h('div', { class: 'ev-text' }, ev.text.map((t) => h('p', null, t)));
  s.layer.append(
    h('div', { class: 'ev-art', html: motifArt(ev.art, 'rite', 400, 260) }),
    h('div', { class: 'ev-body' }, h('h2', null, ev.title), textEl, optsEl),
  );
  mountScreen(s);
  const renderOpts = () => {
    clear(optsEl);
    for (const o of ev.options) {
      const b = h('button', { class: `opt${o.name ? ' name' : ''}`, disabled: !!o.disabled }, o.label, o.hint || o.disabled ? h('small', null, o.disabled ?? o.hint) : null);
      b.addEventListener('click', async () => {
        audio.sfx('tap');
        const out = o.run();
        clear(optsEl);
        clear(textEl);
        textEl.append(h('p', null, out.text));
        if (out.gains?.length) textEl.append(h('p', { class: 'newtag' }, out.gains.map(gainLabel).join(' · ')));
        save();
        if (out.died) {
          await sleep(1400);
          run.hp = 0;
          const rep = onDeath(run, null, G.chron);
          clearRun();
          return returnSequence(rep, run, false);
        }
        if (out.grants?.length) await pageReveals(out.grants);
        if (out.then === 'remove') {
          const c = await chooseFromDeck(removable(run), 'Убрать карту', 'Похоронить');
          if (c) { run.deck.splice(run.deck.findIndex((x) => x.uid === c.uid), 1); run.removals++; audio.sfx('bury'); }
        } else if (out.then === 'upgrade') {
          const c = await chooseFromDeck(upgradeable(run), 'Улучшить карту', 'Улучшить');
          if (c) { c.up = true; audio.sfx('reward'); }
        } else if (out.then === 'pick' && out.pickIds) {
          const pick = await pickCard(out.pickIds, 'Выбери карту', 'Отказаться', G.chron.fresh);
          if (pick) addCard(run, pick);
        }
        closeNode(node);
        optsEl.append(btn('Дальше', 'primary', () => showMap()));
      });
      optsEl.append(b);
    }
  };
  renderOpts();
}

function gainLabel(g: string) {
  const [k, v] = g.split(':');
  if (k === 'gold') return `+${v} монет`;
  if (k === 'relic') return `Реликвия: ${RELICS[v]?.name}`;
  if (k === 'card') return `В колоду: ${CARDS[v]?.name}`;
  return g;
}

/* ───────────────── Лавка ───────────────── */
async function doShop(node: MapNode) {
  const run = G.run!;
  audio.play('vision');
  const shop = genShop(run, G.chron);
  save();
  const s = screen('event', run.circle >= 2 ? 'c2' : 'c1', undefined, false);
  const goldEl = h('span', { class: 'chip gold' }, `${run.gold}`);
  const itemsEl = h('div', { class: 'shop-items' });
  const removeBtn = btn('', 'ghost', () => {});
  const leave = btn('Уйти', 'primary', () => { closeNode(node); showMap(); });
  s.layer.append(
    h('div', { class: 'ev-art', style: { height: '24%' }, html: motifArt('lender', 'rite', 400, 190) }),
    h('div', { class: 'ev-body' }, h('h2', null, 'Лавка Гаспара'), h('div', { class: 'row', style: { justifyContent: 'center' } }, goldEl), h('p', { class: 'sub' }, '«Всё имеет цену. Особенно то, что бесплатно.»'), itemsEl, removeBtn, leave),
  );
  mountScreen(s);
  const render = () => {
    clear(itemsEl);
    goldEl.textContent = `${run.gold}`;
    for (const it of shop.items) {
      const wrap = h('div', { class: it.sold ? 'sold' : '' });
      const price = h('span', { class: `price${run.gold < it.price ? ' no' : ''}` }, it.sold ? 'продано' : `${it.price}`);
      if (it.kind === 'card') {
        const el = cardEl(it.id, { scale: 0.46, fresh: !!G.chron.fresh[it.id] });
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          const ins = inspectCard({ id: it.id }, [btn(`Купить за ${it.price}`, 'primary', () => {
            if (run.gold < it.price) { audio.sfx('deny'); return; }
            run.gold -= it.price; it.sold = true; addCard(run, it.id); audio.sfx('buy'); ins.close(); save(); render();
          })]);
        });
        wrap.append(el);
      } else {
        const r = RELICS[it.id];
        const rl = h('button', { class: 'relic', style: { width: '78px', height: '78px', margin: '14px 0' }, html: motifArt(r.art, 'rite', 120, 120), 'aria-label': r.name });
        rl.addEventListener('click', () => {
          const ins = sheet([h('div', { class: 'relic-big' }, h('div', { class: 'relic', html: motifArt(r.art, 'rite', 120, 120) }), h('div', null, h('b', null, r.name), h('p', null, r.text))), h('div', { style: { height: '12px' } }), h('div', { class: 'stack' }, btn(`Купить за ${it.price}`, 'primary', () => {
            if (run.gold < it.price) { audio.sfx('deny'); return; }
            run.gold -= it.price; it.sold = true; addRelic(run, it.id); audio.sfx('buy'); ins.close(); save(); render();
          }), btn('Закрыть', 'ghost', () => ins.close()))], { center: true });
        });
        wrap.append(rl);
        wrap.append(h('div', { style: { fontSize: '13px', textAlign: 'center', maxWidth: '110px' } }, r.name));
      }
      wrap.append(price);
      itemsEl.append(wrap);
    }
    removeBtn.firstChild!.textContent = `Похоронить карту · ${shop.removeCost}`;
    (removeBtn as HTMLButtonElement).disabled = run.gold < shop.removeCost;
  };
  removeBtn.onclick = async () => {
    const c = await chooseFromDeck(removable(run), 'Похоронить карту', 'Похоронить');
    if (c) {
      run.gold -= shop.removeCost;
      run.deck.splice(run.deck.findIndex((x) => x.uid === c.uid), 1);
      run.removals++;
      shop.removeCost += 25;
      audio.sfx('bury');
      save();
      render();
    }
  };
  render();
}

/* ───────────────── Свеча (отдых) ───────────────── */
async function doRest(node: MapNode) {
  const run = G.run!;
  audio.play('vision');
  const s = screen('event', run.circle >= 2 ? 'c2' : 'c1', 'embers', false);
  const optsEl = h('div', { class: 'stack' });
  s.layer.append(
    h('div', { class: 'ev-art', html: motifArt('rest', 'rite', 400, 260) }),
    h('div', { class: 'ev-body' }, h('h2', null, 'Свеча'), h('div', { class: 'ev-text' }, h('p', null, 'Огонёк держится на сквозняке. Рядом можно присесть, подумать или закопать лишнее.'), h('p', { class: 'sub' }, `ЗДР ${run.hp}/${run.maxHp}`)), optsEl),
  );
  mountScreen(s);
  const finish = async (text: string) => {
    clear(optsEl);
    optsEl.append(h('p', { class: 'newtag', style: { textAlign: 'center' } }, text), btn('Дальше', 'primary', () => { closeNode(node); showMap(); }));
  };
  const heal = Math.ceil(run.maxHp * 0.3);
  optsEl.append(
    h('button', { class: 'opt', onclick: () => { audio.sfx('heal'); const n = restHeal(run); save(); finish(`Исцелено: ${n}.`); } }, 'Отдохнуть', h('small', null, `Исцели ${heal} ЗДР.`)),
    h('button', { class: 'opt', onclick: async () => { const c = await chooseFromDeck(upgradeable(run), 'Закалить карту', 'Улучшить'); if (c) { c.up = true; audio.sfx('reward'); save(); finish(`Улучшено: ${CARDS[c.id].name}.`); } } }, 'Закалить', h('small', null, 'Улучши одну карту.')),
    h('button', { class: 'opt', onclick: async () => { const c = await chooseFromDeck(removable(run), 'Похоронить карту', 'Похоронить'); if (c) { run.deck.splice(run.deck.findIndex((x) => x.uid === c.uid), 1); run.removals++; audio.sfx('bury'); save(); finish(`Похоронено: ${CARDS[c.id].name}.`); } } }, 'Погрести', h('small', null, 'Убери одну карту из колоды.')),
  );
}

/* ───────────────── Тело ───────────────── */
async function doBody(node: MapNode) {
  const run = G.run!;
  audio.play('vision');
  const body = G.chron.bodies[Math.min(run.bodiesSeen, G.chron.bodies.length - 1)];
  run.bodiesSeen++;
  const boss = Object.values(ENEMIES).find((e) => e.circle === run.circle && e.tier === 'boss' && e.id !== 'gatekeeper');
  const s = screen('event', 'c1', undefined, false);
  const g = bodyPage(run, G.chron);
  const optsEl = h('div', { class: 'stack' });
  s.layer.append(
    h('div', { class: 'ev-art', html: motifArt('grave', 'debt', 400, 260) }),
    h('div', { class: 'ev-body' }, h('h2', null, 'Тело'), h('div', { class: 'ev-text' },
      h('p', null, body ? `У стены лежит Безымянный. Руки сложены. На груди — шрам-колокол. Ты узнаёшь позу.` : 'У стены лежит чужой Возвращённый. Руки сложены.'),
      body ? h('p', { class: 'sub' }, body.epitaph) : null,
      boss ? h('p', null, `Совет мёртвых: страж этого Круга — ${boss.name}. «${boss.blurb}»`) : null), optsEl),
  );
  mountScreen(s);
  optsEl.append(btn('Закрыть ему глаза', 'primary', async () => {
    run.hp = Math.min(run.maxHp, run.hp + 6);
    closeNode(node);
    if (g?.isNew) { run.pagesThisRun.push(g.page); save(); await pageReveal(g); }
    showMap();
  }, 'Исцели 6 ЗДР. Прочитай, что он оставил.'));
}

/* ───────────────── Победа (конец среза) ───────────────── */
async function victory() {
  const run = G.run!;
  audio.play('victory');
  audio.sfx('win');
  const gs = onVictory(run, G.chron);
  clearRun();
  save();
  const s = screen('hub', 'hub', 'embers');
  s.layer.append(
    h('div', { style: { height: '14%' } }),
    h('h2', { class: 'title' }, 'Нисхождение продолжается'),
    h('p', { class: 'sub', style: { padding: '10px 28px' } }, 'Хормейстер молчит. Где-то глубже кто-то зовёт тебя по имени, которого ты не помнишь.'),
    h('div', { class: 'pad stack', style: { marginTop: 'auto' } }, h('div', { class: 'autopsy' }, stat('Бои', String(run.stats.combats)), stat('Аккорды', String(run.stats.chords)), stat('Монеты', String(run.gold)), stat('Колода', String(run.deck.length))), btn('Вернуться в Сальвен', 'primary', async () => { await showHub({ talk: true }); }), h('div', { class: 'vers' }, 'Конец вертикального среза. Круги III–IV и финал впереди.')),
  );
  mountScreen(s);
  await sleep(400);
  await pageReveals(gs);
}

const stat = (k: string, v: string) => h('div', { class: 'stat' }, k, h('b', null, v));

/* ───────────────── Возвращение после смерти ───────────────── */
async function returnSequence(rep: ReturnReport, run: ReturnType<typeof startRun>, first: boolean) {
  const killer = ENEMIES[rep.cause];
  // 1. Звон
  audio.play('death');
  audio.sfx('death');
  const black = h('div', { class: 'screen', style: { background: '#000', alignItems: 'center', justifyContent: 'center', textAlign: 'center' } },
    h('div', { class: 'layer', style: { justifyContent: 'center', alignItems: 'center', padding: '0 30px' } },
      h('div', { class: 'bellglyph', html: svgIcon('bell'), style: { width: '90px', height: '90px' } }),
      h('h2', { class: 'title', style: { marginTop: '14px' } }, 'Колокол звонит'),
      h('p', { class: 'sub' }, `${killer?.name ?? 'Что-то'} закончило твой путь.`),
      h('div', { class: 'dlg-hint', style: { marginTop: '40px' } }, 'нажми')));
  mount(black);
  await waitTap(black, 900);

  // 2. Последнее видение
  if (rep.vision?.isNew) {
    const pg = PAGES[rep.vision.page];
    audio.play('vision');
    audio.sfx('page');
    const v = h('div', { class: 'screen vision' },
      h('div', { class: 'vart', html: visionArt(rep.cause) }),
      h('div', { class: 'vis-cap' }, h('div', { class: 'kicker' }, 'Последнее видение'), h('h2', null, pg.title), ...pg.text.map((t) => h('p', null, t)), h('div', { class: 'dlg-hint', style: { animationDelay: '6s' } }, 'нажми')));
    mount(v);
    await waitTap(v, 2600);
  }

  // 3. Прочтение
  audio.play('hub');
  const stationery = screen('hub shade', 'hub', 'embers');
  const newCards = [...new Set(rep.newCards)];
  const killedBy = G.chron.killedBy[rep.cause];
  stationery.layer.append(
    h('div', { class: 'pad' }, h('div', { class: 'kicker' }, 'Прочтение'), h('h2', { class: 'title', style: { textAlign: 'left' } }, 'Что запомнило тело'),
      h('div', { class: 'autopsy' }, stat('Звон №', String(rep.tollNo)), stat('Где', `${ROMAN[run.circle]} Круг · этаж ${(run.active ? nodeById(run, run.active)?.floor ?? 0 : 0) + 1}`), stat('Убийца', killer?.name ?? '—'), stat('Аккордов', String(run.stats.chords))),
      h('p', { class: 'sub', style: { textAlign: 'left' } }, killedBy > 1 ? `Это ${killedBy}-й раз. Ильзе читает быстрее.` : 'Ильзе кладёт ладонь на шрам-колокол и замирает.'),
      rep.vision?.isNew ? h('p', { class: 'newtag' }, `Видение записано: «${PAGES[rep.vision.page].title}»`) : null,
      ...rep.extra.map((g) => h('p', { class: 'newtag' }, `Страница: «${PAGES[g.page].title}»`)),
      newCards.length ? h('div', null, h('p', { class: 'kicker' }, 'Открыты карты'), h('div', { class: 'pickrow', style: { justifyContent: 'flex-start', flexWrap: 'wrap' } }, ...newCards.map((id) => cardEl(id, { scale: 0.34, fresh: true })))) : h('p', { class: 'sub', style: { textAlign: 'left' } }, 'Новых карт нет. Но ты уже знаешь, как это выглядит.')),
    h('div', { class: 'pad', style: { marginTop: 'auto' } }, btn('Дальше', 'primary', () => resolveNext())),
  );
  let resolveNext!: () => void;
  const p1 = new Promise<void>((r) => (resolveNext = r));
  mountScreen(stationery);
  await p1;
  for (const g of rep.extra) await pageReveal(g);

  // 4. Эпитафия
  const ep = screen('hub', 'hub', undefined);
  ep.layer.append(h('div', { style: { margin: 'auto 0' } }, h('div', { class: 'slab' }, h('div', { class: 'kicker' }, 'Доска Мёрка'), h('div', { class: 'epitaph' }, rep.epitaph))), h('div', { class: 'pad' }, btn(first ? 'Очнуться' : 'Очнуться снова', 'primary', () => resolveEp())));
  let resolveEp!: () => void;
  const p2 = new Promise<void>((r) => (resolveEp = r));
  mountScreen(ep);
  audio.sfx('bury');
  await p2;
  await showHub({ talk: true });
}

function waitTap(el: HTMLElement, minMs = 0) {
  return new Promise<void>((res) => {
    const t0 = performance.now();
    el.addEventListener('click', () => { audio.unlock(); if (performance.now() - t0 >= minMs) res(); });
  });
}

/* ───────────────── Хроника ───────────────── */
function openChronicle() {
  const c = G.chron;
  const kinds: [string, string][] = [['all', 'Все'], ['spine', 'История'], ['vision', 'Видения'], ['body', 'Тела'], ['event', 'События']];
  let tab = 'all';
  const list = h('div');
  const tabs = h('div', { class: 'tabs' });
  const pct = Math.round((c.pages.length / PAGE_LIST.length) * 100);
  const s = sheet([
    h('h2', { class: 'title' }, 'Хроника'),
    h('p', { class: 'sub' }, `Страниц: ${c.pages.length} из ${PAGE_LIST.length} · Звонов: ${c.tolls}`),
    h('div', { class: 'prog' }, h('i', { style: { width: `${pct}%` } })),
    c.names.length ? h('div', { style: { marginBottom: '10px' } }, h('div', { class: 'kicker' }, 'Имена'), ...c.names.map((n) => h('div', { style: { fontSize: '15px', margin: '2px 0' } }, h('b', { style: { color: 'var(--candle)', fontFamily: 'var(--f-display)', fontWeight: 400 } }, n + ' '), h('span', { style: { color: 'var(--bone-dim)' } }, NAMES[n] ?? '')))) : h('div'),
    tabs, list, h('div', { style: { height: '12px' } }), btn('Закрыть', 'ghost', () => s.close()),
  ]);
  const render = () => {
    clear(tabs); clear(list);
    for (const [k, l] of kinds) {
      const t = h('button', { class: `tab${tab === k ? ' on' : ''}` }, l);
      t.addEventListener('click', () => { tab = k; render(); });
      tabs.append(t);
    }
    for (const p of PAGE_LIST.filter((x) => tab === 'all' || x.kind === tab)) {
      const have = c.pages.includes(p.id);
      const avail = (p.requires ?? []).every((r) => c.pages.includes(r));
      const row = h('button', { class: `pagecard${have ? '' : ' locked'}` }, h('b', null, have ? p.title : '???'), h('small', null, have ? p.text[0].slice(0, 90) + '…' : avail ? 'Ещё не найдено.' : 'Нужно узнать больше.'));
      if (have) row.addEventListener('click', () => { audio.sfx('page'); void pageReveal({ page: p.id, newCards: [], newNames: [], isNew: false }); });
      list.append(row);
    }
  };
  render();
}

/* ───────────────── Библиотека карт ───────────────── */
function openLibrary() {
  const c = G.chron;
  const tabs: [string, string][] = [['gravedigger', 'Могильщик'], ['wickkeeper', 'Свечница'], ['neutral', 'Общие'], ['debt', 'Долги']];
  let tab = 'gravedigger';
  const grid = h('div');
  const tabsEl = h('div', { class: 'tabs' });
  const s = sheet([h('h2', { class: 'title' }, 'Карты'), h('p', { class: 'sub' }, `Открыто ${countUnlocked()} из ${Object.keys(CARDS).length}. Карты открывает история, а не монеты.`), h('div', { style: { height: '8px' } }), tabsEl, grid, h('div', { style: { height: '12px' } }), btn('Закрыть', 'ghost', () => s.close())]);
  const render = () => {
    clear(tabsEl); clear(grid);
    for (const [k, l] of tabs) {
      const t = h('button', { class: `tab${tab === k ? ' on' : ''}` }, l);
      t.addEventListener('click', () => { tab = k; render(); });
      tabsEl.append(t);
    }
    const ids = Object.values(CARDS).filter((d) => d.pool === tab).sort((a, b) => ['basic', 'common', 'uncommon', 'rare', 'legend'].indexOf(a.rarity) - ['basic', 'common', 'uncommon', 'rare', 'legend'].indexOf(b.rarity) || a.cost - b.cost).map((d) => d.id);
    const g = h('div', { class: 'grid-cards' });
    for (const id of ids) {
      const un = isCardUnlocked(c, id);
      const el = cardEl(id, { scale: 0.46, locked: !un, noafford: un && c.disabled.includes(id), fresh: !!c.fresh[id] });
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        if (!un) { toast('Закрыто', 'Эту карту открывает история: ищи страницы в Видениях и событиях.'); return; }
        const d = CARDS[id];
        const pool = d.rarity !== 'basic' && d.pool !== 'debt';
        const ins = inspectCard({ id }, pool ? [btn(c.disabled.includes(id) ? 'Вернуть в пул' : 'Убрать из пула', 'ghost', () => {
          if (c.disabled.includes(id)) c.disabled.splice(c.disabled.indexOf(id), 1); else c.disabled.push(id);
          save(); ins.close(); render();
        })] : []);
      });
      g.append(el);
    }
    grid.append(g);
  };
  render();
}

/* ───────────────── Настройки ───────────────── */
function openSettings() {
  const st = G.chron.settings;
  const mk = (label: string, input: HTMLElement) => h('label', null, h('span', null, label), input);
  const range = (v: number, on: (n: number) => void) => {
    const i = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: v }) as HTMLInputElement;
    i.addEventListener('input', () => { on(Number(i.value)); audio.unlock(); applySettings(); save(); });
    return i;
  };
  const check = (v: boolean, on: (b: boolean) => void) => {
    const i = h('input', { type: 'checkbox' }) as HTMLInputElement;
    i.checked = v;
    i.addEventListener('change', () => { on(i.checked); applySettings(); save(); });
    return i;
  };
  const sel = (v: number, opts: [number, string][], on: (n: number) => void) => {
    const e = h('select', { style: { background: '#14161f', color: 'var(--bone)', border: '1px solid #444', padding: '6px', fontSize: '16px' } }, opts.map(([k, l]) => h('option', { value: k, selected: k === v }, l))) as HTMLSelectElement;
    e.addEventListener('change', () => { on(Number(e.value)); applySettings(); save(); });
    return e;
  };
  const file = h('input', { type: 'file', accept: 'application/json', style: { display: 'none' } }) as HTMLInputElement;
  file.addEventListener('change', async () => {
    const t = await file.files?.[0]?.text();
    const c = t ? importChronicle(t) : null;
    if (c) { G.chron = c; applySettings(); save(); toast('Готово', 'Хроника загружена.'); } else toast('Ошибка', 'Файл не похож на сохранение.');
  });
  const s = sheet([
    h('h2', { class: 'title' }, 'Настройки'), h('div', { class: 'settings' },
      mk('Музыка', range(st.music, (n) => (st.music = n))), mk('Звуки', range(st.sfx, (n) => (st.sfx = n))),
      mk('Размер текста', sel(st.textScale, [[0.9, 'Малый'], [1, 'Обычный'], [1.15, 'Крупный'], [1.3, 'Очень крупный']], (n) => (st.textScale = n))),
      mk('Милость (враги слабее)', sel(st.mercy, [[0, 'Нет'], [1, '−10% ЗДР врагов'], [2, '−20% ЗДР врагов'], [3, '−30% ЗДР врагов']], (n) => (st.mercy = n))),
      mk('Меньше анимаций', check(st.reduceMotion, (b) => (st.reduceMotion = b))),
    ) as HTMLElement,
    h('p', { class: 'sub', style: { margin: '10px 0' } }, 'Милость не влияет на историю и не даёт силы: это только твой выбор сложности.'),
    h('div', { class: 'stack' },
      btn('Сохранить Хронику в файл', 'ghost', () => {
        const blob = new Blob([exportChronicle(G.chron)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: 'kolokol-hronika.json' });
        a.click();
      }),
      btn('Загрузить Хронику из файла', 'ghost', () => file.click()),
      btn('Начать всё заново', 'ghost', () => {
        const c2 = sheet([h('h2', { class: 'title' }, 'Стереть всё?'), h('p', { class: 'sub' }, 'Хроника, карты и забег будут удалены.'), h('div', { style: { height: '12px' } }), h('div', { class: 'stack' }, btn('Стереть', 'primary', () => { clearRun(); G.chron = newChronicle(); applySettings(); save(); location.reload(); }), btn('Отмена', 'ghost', () => c2.close()))], { center: true });
      }),
      btn('Закрыть', 'primary', () => { s.close(); }),
    ), file,
  ]);
}

/* ───────────────── Старт ───────────────── */
export function boot() {
  applySettings();
  G.run = loadRun();
  stage().insertAdjacentHTML('beforebegin', '');
  const dbg = new URLSearchParams(location.search).has('debug');
  if (dbg) {
    (window as unknown as Record<string, unknown>).__bwt = { G, showHub, showMap, showTitle, grantPage, unlockRole, save, openRolePick, beginRun, rngOf, saveRng, cardEnabled, cardArt, enemyArt, openChronicle, openLibrary, doCombat, sceneArt, motifArt, returnSequence, onDeath, startRun };
  }
  showTitle();
  // Жест пользователя запускает звук
  const unlock = () => { audio.unlock(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);
}
