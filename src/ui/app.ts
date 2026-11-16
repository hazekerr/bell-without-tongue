import { Combat } from '../engine/combat.ts';
import { BASIC_DECKS, CARDS, ROLE_INFO } from '../engine/cards.ts';
import { ENEMIES } from '../engine/enemies.ts';
import { RELICS } from '../engine/relics.ts';
import { Rng } from '../engine/rng.ts';
import { type PageGrant, cardEnabled, exportChronicle, grantPage, importChronicle, isCardUnlocked, newChronicle, tryGrantPage, unlockRole } from '../engine/chronicle.ts';
import {
  type MapNode, type ReturnReport, FLOORS, MAX_CIRCLE, addCard, addRelic, available, bodyPage, finishCombat, genShop, nextCircle, nodeById, onDeath,
  onVictory, removable, restHeal, rngOf, saveRng, startCombat, startRun, upgradeable,
} from '../engine/run.ts';
import { pickEvent } from '../engine/events.ts';
import { PAGES, PAGE_LIST, NAMES } from '../content/pages.ts';
import { HUB_TALKS, type HubTalk } from '../content/hub.ts';
import { audio } from './audio.ts';
import { bannerArt, drawSprite, eventKey, fogTexture, iconArt, sceneCanvas, sprite, type SceneKind } from '../art/index.ts';
import { cardEl } from './cardview.ts';
import { buildCombat } from './combatview.ts';
import { clear, h, sleep } from './dom.ts';
import { NODE_ICON, NODE_LABEL, svgIcon } from './icons.ts';
import { G, applySettings, clearRun, loadRun, save, saveRun } from './state.ts';
import { btn, cardsGrid, chooseFromDeck, cloneCanvas, dialogue, inspect, inspectCard, pageReveal, pageReveals, pickCard, relicChip, sheet, stage, toast } from './kit.ts';

const CIRCLE_NAME: Record<number, string> = { 1: 'Круг I · Мелководье', 2: 'Круг II · Рёбра', 3: 'Круг III · Нижний Хор' };
const ROMAN = ['', 'I', 'II', 'III'];
const SW = () => stage().clientWidth || 800;
const IW = () => Math.round((270 * SW()) / 390);

/* ───────────────── Монтаж экранов ───────────────── */
let stops: (() => void)[] = [];
function mount(el: HTMLElement, stop?: () => void) {
  stops.forEach((s) => s());
  stops = stop ? [stop] : [];
  const st = stage();
  st.querySelectorAll('.screen, .sheet, .dialog, .toast').forEach((n) => n.remove());
  st.append(el);
}

/** Анимированный фон сцены: туман и искры. */
function animBg(kind: SceneKind, particles: 'embers' | 'rain' | 'ash' | 'none' = 'embers') {
  const W = IW();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = 270; cv.className = 'bgc';
  const bg = sceneCanvas(kind, W);
  const fog = fogTexture(W, 80, 9);
  const reduce = G.chron.settings.reduceMotion;
  const ps = Array.from({ length: reduce || particles === 'none' ? 0 : 36 }, (_, i) => ({ x: (i * 71) % W, y: (i * 43) % 270, v: 0.2 + (i % 4) * 0.15 }));
  let raf = 0;
  const loop = (ms: number) => {
    const t = ms / 1000;
    const x = cv.getContext('2d')!;
    x.drawImage(bg, 0, 0);
    if (!reduce) { x.globalAlpha = 0.5; x.drawImage(fog, -((t * 5) % W), 130); x.drawImage(fog, W - ((t * 5) % W), 130); x.globalAlpha = 1; }
    for (const p of ps) {
      if (particles === 'embers') { p.y -= p.v; p.x += Math.sin(t + p.v * 9) * 0.2; x.fillStyle = p.v > 0.5 ? '#ffe9b0' : '#e8a94a'; } else { p.y += p.v * 3; p.x -= 0.6; x.fillStyle = 'rgba(200,215,225,.45)'; }
      if (p.y < -2) p.y = 272; if (p.y > 272) p.y = -2; if (p.x < 0) p.x = W;
      x.fillRect(Math.floor(p.x), Math.floor(p.y), 1, particles === 'rain' ? 3 : 1);
    }
    raf = requestAnimationFrame(loop);
  };
  return { cv, start: () => { raf = requestAnimationFrame(loop); }, stop: () => cancelAnimationFrame(raf) };
}

function scene(cls: string, kind: SceneKind, particles: 'embers' | 'rain' | 'ash' | 'none' = 'embers', shade: '' | 'l' | 'r' | 'full' = '') {
  const a = animBg(kind, particles);
  const root = h('div', { class: `screen ${cls}` }, a.cv, shade ? h('div', { class: `shade ${shade === 'l' ? '' : shade}` }) : null);
  return { root, mount: () => { mount(root, a.stop); a.start(); } };
}

/* ───────────────── Титул ───────────────── */
export function showTitle() {
  const s = scene('title', 'title', 'embers');
  const hasRun = !!G.run;
  s.root.append(
    h('div', { class: 'logo' }, h('h1', null, 'КОЛОКОЛ', h('span', null, 'БЕЗ ЯЗЫКА')), h('p', null, 'Смерть — это тоже страница.')),
    h('div', { class: 'menu' },
      btn(G.chron.prologueDone ? (hasRun ? 'Продолжить спуск' : 'Войти в Сальвен') : 'Начать', 'primary', () => { audio.unlock(); if (!G.chron.prologueDone) void startPrologue(); else if (hasRun) showMap(); else void showHub(); }),
      G.chron.prologueDone ? btn('Настройки', 'ghost', () => openSettings()) : h('div')),
    h('div', { class: 'vers' }, 'Вертикальный срез · v0.2 · горизонталь'),
  );
  s.mount();
  audio.play('title');
}

/* ───────────────── Пролог ───────────────── */
async function startPrologue() {
  audio.unlock();
  audio.play('vision');
  mount(h('div', { class: 'screen', style: { background: '#000' } }));
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
    1: 'Разные типы карт за ход (Удар, Оберег, Обряд) складываются в Аккорд. Для Могильщика это возврат карты из Могилы.',
    2: 'Над врагом видно, что он сделает. Если удар тяжёлый, закройся Оберегом.',
    3: 'Привратник бьёт всё сильнее с каждым ходом.',
    4: 'Ты не победишь. Это нормально. Продержись и посмотри, что будет.',
  };
  combat.listener = (e) => { if (e.t === 'turn' && e.who === 'hero' && hints[e.n]) setTimeout(() => toast('Подсказка', hints[e.n]), 900); };
  await runCombatUI(combat, { circle: 1, boss: true });
  const rep = onDeath(run, combat, G.chron);
  G.chron.prologueDone = true;
  save();
  await returnSequence(rep, run, true);
}

async function runCombatUI(combat: Combat, o: { circle: number; boss: boolean }): Promise<'win' | 'lose'> {
  audio.play(o.boss ? 'boss' : 'combat');
  const ui = buildCombat(combat, { circle: o.circle, boss: o.boss, onInspect: (t, x) => inspect(t, x), onPiles: (k) => showPile(combat, k) });
  mount(ui.el, ui.stop);
  const timer = window.setInterval(() => { audio.intensity = Math.min(1, Math.max(0, 1 - combat.hero.hp / combat.hero.maxHp)); }, 800);
  const res = await ui.done;
  clearInterval(timer);
  audio.intensity = 0;
  return res;
}

function showPile(combat: Combat, kind: 'draw' | 'discard' | 'grave' | 'exhaust') {
  const src = kind === 'draw' ? [...combat.drawPile].sort((a, b) => a.id.localeCompare(b.id)) : kind === 'discard' ? combat.discard : kind === 'grave' ? combat.grave : combat.exhausted;
  const name = { draw: 'Колода (порядок скрыт)', discard: 'Сброс', grave: 'Могила', exhaust: 'Исчерпано' }[kind];
  const s = sheet([h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 4 } }, `${name} · ${src.length}`), btn('Закрыть', 'ghost', () => s.close())), src.length ? cardsGrid(src.map((c) => ({ id: c.id, up: c.up })), undefined, 0.62) : h('p', { class: 'sub' }, 'Пусто.')], { cls: 'wide' });
}

/* ───────────────── Хаб ───────────────── */
function pickTalk(): HubTalk | null {
  const c = G.chron;
  const special = HUB_TALKS.filter((t) => t.priority >= 20 && t.when(c)).sort((a, b) => b.priority - a.priority);
  if (special.length) return special[0];
  if (Math.random() < 0.45) { const gen = HUB_TALKS.filter((t) => t.priority < 20); return gen[Math.floor(Math.random() * gen.length)]; }
  return null;
}
const countUnlocked = () => Object.keys(CARDS).filter((id) => isCardUnlocked(G.chron, id)).length;

export async function showHub(opts: { talk?: boolean } = {}) {
  audio.play('hub');
  const s = scene('hub', 'hub', 'embers');
  const last = G.chron.bodies[0];
  const settings = h('button', { class: 'icon-btn', 'aria-label': 'Настройки', style: { position: 'absolute', left: '14px', bottom: '12px', zIndex: 4 } }, '⚙');
  settings.addEventListener('click', () => openSettings());
  s.root.append(
    h('div', { class: 'board' }, h('b', null, `ЗВОНОВ: ${G.chron.tolls}`), last ? h('i', null, last.epitaph) : h('i', null, 'Доска Мёрка пуста. Пока.')),
    h('div', { class: 'side' },
      G.run ? h('div', null, btn('Продолжить спуск', 'primary', () => showMap(), `${CIRCLE_NAME[G.run.circle]} · ${G.run.hp}/${G.run.maxHp}`), btn('Оставить спуск', 'ghost', () => abandonConfirm())) : btn('Спуститься', 'primary', () => openRolePick(), 'Колода и здоровье не сохраняются'),
      h('div', { class: 'row' }, btn('Хроника', 'ghost', () => openChronicle(), `${G.chron.pages.length}/${PAGE_LIST.length}`), btn('Карты', 'ghost', () => openLibrary(), `${countUnlocked()}/${Object.keys(CARDS).length}`))),
    settings,
  );
  s.mount();
  if (opts.talk) {
    await sleep(500);
    const t = pickTalk();
    if (t) {
      await dialogue(t.lines);
      if (t.priority >= 20) G.chron.seenTalks.push(t.id);
      const gs: PageGrant[] = [];
      for (const id of t.grants ?? []) { const g = tryGrantPage(G.chron, id); if (g?.isNew) gs.push(g); }
      save();
      await pageReveals(gs);
    }
  }
}

function abandonConfirm() {
  const s = sheet([h('h2', { class: 'title-l' }, 'Оставить спуск?'), h('p', { class: 'sub', style: { margin: '8px 0 10px' } }, 'Колода, здоровье и монеты пропадут. Хроника останется.'), h('div', { class: 'row' }, btn('Оставить', 'primary', () => { s.close(); clearRun(); void showHub(); }), btn('Вернуться', 'ghost', () => s.close()))], { cls: 'narrow' });
}

/* ───────────────── Выбор роли ───────────────── */
function openRolePick() {
  const roles: ('gravedigger' | 'wickkeeper' | 'bellringer' | 'penitent')[] = ['gravedigger', 'wickkeeper', 'bellringer', 'penitent'];
  const row = h('div', { class: 'role-row' });
  const s = sheet([h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 3 } }, 'Кого ты вспомнишь?'), btn('Назад', 'ghost', () => s.close())), row], { cls: 'wide' });
  for (const r of roles) {
    const info = ROLE_INFO[r];
    const open = G.chron.roles.includes(r) && BASIC_DECKS[r].length > 0;
    const cvs = document.createElement('canvas');
    cvs.width = 64; cvs.height = 64;
    const x = cvs.getContext('2d')!;
    x.fillStyle = '#18141f'; x.fillRect(0, 0, 64, 64);
    const sp = sprite(r === 'wickkeeper' ? 'wickkeeper' : r === 'bellringer' ? 'bellringer' : 'gravedigger');
    drawSprite(x, sp, 32, 62, Math.min(1, 56 / sp.h), 0, false, 0);
    const card = h('button', { class: `role-card${open ? '' : ' locked'}` }, cvs, h('h3', null, info.name), h('div', { class: 'tag' }, info.tagline), h('p', null, open ? info.blurb : 'Откроется по ходу истории.'), open ? h('p', { style: { color: 'var(--amber)' } }, info.chord) : h('div'), open ? h('div', { class: 'sub', style: { fontSize: '12px' } }, `ЗДР ${info.hp} · 10 карт · 3 Дыхания`) : h('div'));
    if (open) card.addEventListener('click', () => { audio.sfx('tap'); s.close(); void beginRun(r); });
    row.append(card);
  }
}

async function beginRun(role: 'gravedigger' | 'wickkeeper' | 'bellringer' | 'penitent') {
  G.run = startRun(G.chron, role);
  save();
  audio.sfx('bell');
  mount(h('div', { class: 'screen', style: { background: '#000' } }));
  await dialogue([{ who: 'Рассказчик', text: `Ты надеваешь память ${role === 'gravedigger' ? 'могильщика' : role === 'wickkeeper' ? 'свечницы' : 'звонаря'}. Она тяжёлая, но своя.` }]);
  showMap();
}

/* ───────────────── Карта спуска (слева направо) ───────────────── */
export function showMap() {
  const run = G.run;
  if (!run) { void showHub(); return; }
  audio.play('map');
  const s = scene('map', run.circle >= 3 ? 'c3' : run.circle >= 2 ? 'c2' : 'c1', run.circle >= 2 ? 'ash' : 'rain', 'full');
  const avail = new Set(available(run).map((n) => n.id));
  const COL = 112, X0 = 64, AREA = 318;
  const posX = (n: MapNode) => (n.type === 'boss' ? X0 + FLOORS * COL + 30 : X0 + n.floor * COL);
  const posY = (n: MapNode) => (n.type === 'boss' ? AREA / 2 : 48 + n.col * ((AREA - 96) / 3));
  const innerW = X0 + FLOORS * COL + 110;
  const inner = h('div', { class: 'map-inner', style: { width: `${Math.max(innerW, SW())}px` } });
  const wrap = h('div', { class: 'map-wrap' }, inner);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'lines');
  svg.setAttribute('viewBox', `0 0 ${Math.max(innerW, SW())} ${AREA}`);
  // пройденный путь
  const done = new Set<string>();
  if (run.at) {
    let cur = nodeById(run, run.at);
    while (cur) { done.add(cur.id); const prev: MapNode | undefined = run.map.find((n) => n.floor === cur!.floor - 1 && n.next.includes(cur!.id)); cur = prev; }
  }
  for (const n of run.map) for (const nid of n.next) {
    const m = nodeById(run, nid); if (!m) continue;
    const p = document.createElementNS(svgNS, 'path');
    const x1 = posX(n), y1 = posY(n), x2 = posX(m), y2 = posY(m);
    p.setAttribute('d', `M${x1} ${y1}C${x1 + 40} ${y1} ${x2 - 40} ${y2} ${x2} ${y2}`);
    p.setAttribute('fill', 'none');
    const used = done.has(n.id) && (done.has(m.id) || avail.has(m.id));
    p.setAttribute('stroke', used ? '#e8a94a' : 'rgba(217,210,192,.25)');
    p.setAttribute('stroke-width', used ? '3' : '2');
    p.setAttribute('stroke-dasharray', used ? '' : '4 6');
    svg.append(p);
  }
  inner.append(svg);
  let focusX = 0;
  for (const n of run.map) {
    const isAvail = avail.has(n.id), isDone = done.has(n.id);
    const el = h('button', { class: `node ${n.type}${isAvail ? ' avail' : ''}${isDone ? ' done' : ''}${!isAvail && !isDone ? ' locked' : ''}${run.at === n.id ? ' cur' : ''}`, style: { left: `${posX(n)}px`, top: `${posY(n)}px` }, 'aria-label': `${NODE_LABEL[n.type]}${isAvail ? ', доступно' : ''}`, html: svgIcon(NODE_ICON[n.type]) });
    (el as HTMLButtonElement).disabled = !isAvail;
    el.addEventListener('click', () => { if (isAvail) void enterNode(n); });
    inner.append(el, h('div', { class: 'nlabel', style: { left: `${posX(n)}px`, top: `${posY(n)}px` } }, isAvail || n.type === 'boss' ? NODE_LABEL[n.type] : ''));
    if (isAvail) focusX = Math.max(focusX, posX(n));
  }
  const deckBtn = h('button', { class: 'chip' }, `Колода ${run.deck.length}`);
  deckBtn.addEventListener('click', () => showDeck());
  s.root.append(
    h('div', { class: 'top' }, h('b', { class: 'kicker', style: { fontSize: '13px' } }, CIRCLE_NAME[run.circle]), h('span', { class: 'sub', style: { fontSize: '12px' } }, `${ROLE_INFO[run.role].name} · ${run.stats.nodes} шагов`), h('div', { class: 'grow' }), h('span', { class: 'chip hp' }, `ЗДР ${run.hp}/${run.maxHp}`), h('span', { class: 'chip gold' }, `${run.gold}`), deckBtn),
    wrap,
    h('div', { class: 'maptip' }, h('div', { class: 'rel' }, run.relics.map((r) => relicChip(r))), h('span', { class: 'hint-t' }, 'Спуск идёт вправо. Глубже: Страж Круга.')),
  );
  s.mount();
  requestAnimationFrame(() => { wrap.scrollLeft = Math.max(0, focusX - wrap.clientWidth * 0.4); });
}

function showDeck() {
  const run = G.run;
  if (!run) return;
  const sorted = [...run.deck].sort((a, b) => CARDS[a.id].type.localeCompare(CARDS[b.id].type) || CARDS[a.id].cost - CARDS[b.id].cost);
  const s = sheet([h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 4 } }, `Колода · ${run.deck.length}`), btn('Закрыть', 'ghost', () => s.close())), cardsGrid(sorted.map((c) => ({ id: c.id, up: c.up })), (c) => inspectCard(c), 0.62)], { cls: 'wide' });
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
  run.active = null; run.at = node.id; run.stats.nodes++;
  save();
}

async function doCombat(node: MapNode) {
  const run = G.run!;
  const combat = startCombat(run, node, G.chron);
  const res = await runCombatUI(combat, { circle: run.circle, boss: node.type === 'boss' });
  if (res === 'lose') {
    run.hp = 0;
    const rep = onDeath(run, combat, G.chron);
    clearRun(); save();
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
  const s = scene('reward', run.circle >= 3 ? 'c3' : run.circle >= 2 ? 'c2' : 'c1', 'embers', 'full');
  const left: HTMLElement[] = [h('div', { class: 'gold-line' }, `+${reward.gold} монет`)];
  if (reward.healed) left.push(h('p', { class: 'sub' }, `Огарок исцелил ${reward.healed}.`));
  if (combat.goldGain) left.push(h('p', { class: 'sub' }, `Из них мародёрство: ${combat.goldGain}.`));
  if (reward.relic) { const r = RELICS[reward.relic]; left.push(h('div', { class: 'relic-big' }, h('div', { class: 'relic' }, cloneCanvas(iconArt(r.art))), h('div', null, h('b', null, r.name), h('p', null, r.text)))); }
  const cont = btn(node.type === 'boss' ? 'Спуститься глубже' : 'Выбрать карту', 'primary', async () => {
    const pick = await pickCard(reward.cards, 'Добавить в колоду', 'Пропустить (+8 монет)', G.chron.fresh);
    if (pick) addCard(run, pick); else run.gold += 8;
    save();
    await afterBattle(node);
  });
  s.root.append(h('div', { class: 'center-col' }, h('h2', { class: 'title-l', style: { fontSize: '18px' } }, node.type === 'boss' ? 'СТРАЖ ПАЛ' : 'ПОБЕДА'), h('div', { class: 'panel', style: { width: '320px' } }, ...left), h('div', { style: { width: '260px' } }, cont)));
  s.mount();
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
    await dialogue([{ who: 'Рассказчик', text: run.circle === 2 ? 'Вода уходит. Над тобой смыкаются своды — рёбра. Не города. Чьи-то ещё.' : 'Лестница вниз ведёт к синему свету. Там, в двенадцати нишах, стоят хористы. Одиннадцать лиц смотрят на тебя. Двенадцатая ниша пуста.' }]);
  }
  showMap();
}

/* ───────────────── Событие ───────────────── */
function splitScreen(art: string, tone: 'r' | 's' | 'w' | 'd' | 'g' | 'k' = 'r') {
  const cvs = cloneCanvas(bannerArt(eventKey(art), 192, 160, tone as never));
  const s = scene('event', 'hub', 'none');
  s.root.querySelector('canvas')!.style.display = 'none';
  const body = h('div', { class: 'split-body' });
  s.root.append(h('div', { class: 'split-art' }, cvs), body);
  return { s, body };
}

async function doEvent(node: MapNode) {
  const run = G.run!;
  const ev = pickEvent(run, G.chron);
  audio.play('vision');
  const { s, body } = splitScreen(ev.art);
  const optsEl = h('div', { class: 'stack' });
  const textEl = h('div', { class: 'ev-text' }, ev.text.map((t) => h('p', null, t)));
  body.append(h('h2', null, ev.title), textEl, optsEl);
  s.mount();
  for (const o of ev.options) {
    const b = h('button', { class: `opt${o.name ? ' name' : ''}`, disabled: !!o.disabled }, o.label, o.hint || o.disabled ? h('small', null, o.disabled ?? o.hint) : null);
    b.addEventListener('click', async () => {
      audio.sfx('tap');
      const out = o.run();
      clear(optsEl); clear(textEl);
      textEl.append(h('p', null, out.text));
      if (out.gains?.length) textEl.append(h('p', { class: 'newtag' }, out.gains.map(gainLabel).join(' · ')));
      save();
      if (out.died) { await sleep(1400); run.hp = 0; const rep = onDeath(run, null, G.chron); clearRun(); return returnSequence(rep, run, false); }
      if (out.grants?.length) await pageReveals(out.grants);
      if (out.then === 'remove') { const c = await chooseFromDeck(removable(run), 'Убрать карту', 'Похоронить'); if (c) { run.deck.splice(run.deck.findIndex((x) => x.uid === c.uid), 1); run.removals++; audio.sfx('bury'); } }
      else if (out.then === 'upgrade') { const c = await chooseFromDeck(upgradeable(run), 'Улучшить карту', 'Улучшить'); if (c) { c.up = true; audio.sfx('reward'); } }
      else if (out.then === 'pick' && out.pickIds) { const pick = await pickCard(out.pickIds, 'Выбери карту', 'Отказаться', G.chron.fresh); if (pick) addCard(run, pick); }
      closeNode(node);
      optsEl.append(btn('Дальше', 'primary', () => showMap()));
    });
    optsEl.append(b);
  }
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
  const { s, body } = splitScreen('lender');
  const goldEl = h('span', { class: 'chip gold' }, `${run.gold}`);
  const itemsEl = h('div', { class: 'shop-items' });
  const removeBtn = btn('', 'ghost', () => {});
  const leave = btn('Уйти', 'primary', () => { closeNode(node); showMap(); });
  body.append(h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { style: { flex: 3 } }, 'Лавка Гаспара'), goldEl), h('div', { class: 'row' }, removeBtn, leave), itemsEl);
  s.mount();
  const render = () => {
    clear(itemsEl);
    goldEl.textContent = `${run.gold}`;
    for (const it of shop.items) {
      const wrap = h('div', { class: it.sold ? 'sold' : '' });
      const price = h('span', { class: `price${run.gold < it.price ? ' no' : ''}` }, it.sold ? 'продано' : `${it.price}`);
      if (it.kind === 'card') {
        const el = cardEl(it.id, { scale: 0.62, fresh: !!G.chron.fresh[it.id] });
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => { const ins = inspectCard({ id: it.id }, [btn(`Купить за ${it.price}`, 'primary', () => { if (run.gold < it.price) { audio.sfx('deny'); return; } run.gold -= it.price; it.sold = true; addCard(run, it.id); audio.sfx('buy'); ins.close(); save(); render(); })]); });
        wrap.append(el);
      } else {
        const r = RELICS[it.id];
        const rl = h('button', { class: 'relic', style: { width: '58px', height: '58px', margin: '14px 8px' }, 'aria-label': r.name }, cloneCanvas(iconArt(r.art)));
        rl.addEventListener('click', () => { const ins = sheet([h('div', { class: 'relic-big' }, h('div', { class: 'relic' }, cloneCanvas(iconArt(r.art))), h('div', null, h('b', null, r.name), h('p', null, r.text))), h('div', { class: 'row' }, btn(`Купить за ${it.price}`, 'primary', () => { if (run.gold < it.price) { audio.sfx('deny'); return; } run.gold -= it.price; it.sold = true; addRelic(run, it.id); audio.sfx('buy'); ins.close(); save(); render(); }), btn('Закрыть', 'ghost', () => ins.close()))], { cls: 'narrow' }); });
        wrap.append(rl, h('div', { style: { fontSize: '9px', textAlign: 'center', maxWidth: '80px' } }, r.name));
      }
      wrap.append(price);
      itemsEl.append(wrap);
    }
    removeBtn.firstChild!.textContent = `Похоронить карту · ${shop.removeCost}`;
    (removeBtn as HTMLButtonElement).disabled = run.gold < shop.removeCost;
  };
  removeBtn.onclick = async () => {
    const c = await chooseFromDeck(removable(run), 'Похоронить карту', 'Похоронить');
    if (c) { run.gold -= shop.removeCost; run.deck.splice(run.deck.findIndex((x) => x.uid === c.uid), 1); run.removals++; shop.removeCost += 25; audio.sfx('bury'); save(); render(); }
  };
  render();
}

/* ───────────────── Свеча (отдых) ───────────────── */
async function doRest(node: MapNode) {
  const run = G.run!;
  audio.play('vision');
  const { s, body } = splitScreen('rest');
  const optsEl = h('div', { class: 'rest-opts' });
  body.append(h('h2', null, 'СВЕЧА'), h('div', { class: 'ev-text' }, h('p', null, 'Огонёк держится на сквозняке. Рядом можно присесть, подумать или закопать лишнее.'), h('p', { class: 'sub' }, `ЗДР ${run.hp}/${run.maxHp}`)), optsEl);
  s.mount();
  const finish = (text: string) => { clear(optsEl); body.append(h('p', { class: 'newtag' }, text), btn('Дальше', 'primary', () => { closeNode(node); showMap(); })); };
  const heal = Math.ceil(run.maxHp * 0.3);
  const o = (t: string, sub: string, f: () => void) => { const b = h('button', { class: 'opt' }, h('b', null, t), h('small', null, sub)); b.addEventListener('click', f); return b; };
  optsEl.append(
    o('Отдохнуть', `Исцели ${heal} ЗДР.`, () => { audio.sfx('heal'); const n = restHeal(run); save(); finish(`Исцелено: ${n}.`); }),
    o('Закалить', 'Улучши одну карту.', async () => { const c = await chooseFromDeck(upgradeable(run), 'Закалить карту', 'Улучшить'); if (c) { c.up = true; audio.sfx('reward'); save(); finish(`Улучшено: ${CARDS[c.id].name}.`); } }),
    o('Погрести', 'Убери одну карту.', async () => { const c = await chooseFromDeck(removable(run), 'Похоронить карту', 'Похоронить'); if (c) { run.deck.splice(run.deck.findIndex((x) => x.uid === c.uid), 1); run.removals++; audio.sfx('bury'); save(); finish(`Похоронено: ${CARDS[c.id].name}.`); } }),
  );
}

/* ───────────────── Тело ───────────────── */
async function doBody(node: MapNode) {
  const run = G.run!;
  audio.play('vision');
  const bodyRec = G.chron.bodies[Math.min(run.bodiesSeen, G.chron.bodies.length - 1)];
  run.bodiesSeen++;
  const boss = Object.values(ENEMIES).find((e) => e.circle === run.circle && e.tier === 'boss' && e.id !== 'gatekeeper');
  const g = bodyPage(run, G.chron);
  const { s, body } = splitScreen('grave', 'k');
  body.append(h('h2', null, 'ТЕЛО'), h('div', { class: 'ev-text' },
    h('p', null, bodyRec ? 'У стены лежит Безымянный. Руки сложены. На груди шрам-колокол. Ты узнаёшь позу.' : 'У стены лежит чужой Возвращённый. Руки сложены.'),
    bodyRec ? h('p', { class: 'sub' }, bodyRec.epitaph) : null,
    boss ? h('p', null, `Совет мёртвых: страж этого Круга — ${boss.name}. «${boss.blurb}»`) : null),
    btn('Закрыть ему глаза', 'primary', async () => { run.hp = Math.min(run.maxHp, run.hp + 6); closeNode(node); if (g?.isNew) { run.pagesThisRun.push(g.page); save(); await pageReveal(g); } showMap(); }, 'Исцели 6 ЗДР. Прочитай, что он оставил.'));
  s.mount();
}

/* ───────────────── Победа (конец среза) ───────────────── */
async function victory() {
  const run = G.run!;
  audio.play('victory'); audio.sfx('win');
  const gs = onVictory(run, G.chron);
  clearRun(); save();
  const s = scene('hub', 'hub', 'embers', 'l');
  s.root.append(h('div', { class: 'center-col', style: { alignItems: 'flex-start', paddingLeft: '8%', width: '62%' } },
    h('h2', { class: 'title-l', style: { fontSize: '16px' } }, 'НИСХОЖДЕНИЕ ПРОДОЛЖАЕТСЯ'),
    h('p', { class: 'sub', style: { fontSize: '17px' } }, 'Хормейстер молчит. Где-то глубже кто-то зовёт тебя по имени, которого ты не помнишь.'),
    h('div', { class: 'autopsy', style: { width: '100%' } }, stat('Бои', String(run.stats.combats)), stat('Аккорды', String(run.stats.chords)), stat('Монеты', String(run.gold)), stat('Колода', String(run.deck.length))),
    h('div', { style: { width: '260px' } }, btn('Вернуться в Сальвен', 'primary', () => { void showHub({ talk: true }); })),
    h('div', { class: 'hint-t' }, 'Конец среза. Круги IV–VII и финал впереди.')));
  s.mount();
  await sleep(400);
  await pageReveals(gs);
}
const stat = (k: string, v: string) => h('div', { class: 'stat' }, k, h('b', null, v));

/* ───────────────── Возвращение после смерти ───────────────── */
function visionScreen(cause: string, page: { title: string; text: string[] }) {
  const W = IW();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = 270; cv.className = 'bgc';
  const x = cv.getContext('2d')!;
  x.fillStyle = '#050407'; x.fillRect(0, 0, W, 270);
  const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  // дизеринговое сияние за убийцей
  const cx = W * 0.3;
  for (let y = 0; y < 270; y++) for (let xx = 0; xx < W; xx++) { const d = Math.hypot((xx - cx) / 120, (y - 150) / 130); const k = Math.max(0, 1 - d); if (k * 0.8 > (BAY[y & 3][xx & 3] + 0.5) / 16) { x.fillStyle = '#4a3a22'; x.fillRect(xx, y, 1, 1); } }
  const sp = sprite(ENEMIES[cause]?.art ?? 'reaper');
  const sc = Math.min(4, 230 / sp.h);
  x.fillStyle = 'rgba(0,0,0,.55)';
  drawSprite(x, sp, cx, 262, sc, 0, false, 0);
  x.fillRect(0, 0, W, 270);
  x.globalCompositeOperation = 'source-over';
  const root = h('div', { class: 'screen vision' }, cv, h('div', { class: 'vis-cap' }, h('div', { class: 'kicker' }, 'ПОСЛЕДНЕЕ ВИДЕНИЕ'), h('h2', null, page.title), ...page.text.map((t) => h('p', null, t)), h('div', { class: 'dlg-hint' }, 'нажми')));
  // силуэт убийцы: перерисовываем поверх с затемнением
  const cv2 = document.createElement('canvas'); cv2.width = W; cv2.height = 270; cv2.className = 'bgc';
  const y2 = cv2.getContext('2d')!;
  drawSprite(y2, sp, cx, 262, sc, 0, false, 0);
  y2.globalCompositeOperation = 'source-atop'; y2.fillStyle = 'rgba(8,6,12,.78)'; y2.fillRect(0, 0, W, 270);
  root.insertBefore(cv2, root.children[1]);
  return root;
}

async function returnSequence(rep: ReturnReport, run: ReturnType<typeof startRun>, first: boolean) {
  const killer = ENEMIES[rep.cause];
  audio.play('death'); audio.sfx('death');
  const black = h('div', { class: 'screen', style: { background: '#000', display: 'grid', placeItems: 'center', textAlign: 'center' } },
    h('div', null, h('div', { style: { width: '56px', margin: '0 auto 8px' }, html: svgIcon('bell') }), h('h2', { class: 'title-l', style: { fontSize: '16px' } }, 'КОЛОКОЛ ЗВОНИТ'), h('p', { class: 'sub' }, `${killer?.name ?? 'Что-то'} закончило твой путь.`), h('div', { class: 'dlg-hint', style: { marginTop: '18px', textAlign: 'center' } }, 'нажми')));
  black.querySelector('svg')!.style.fill = '#e8a94a';
  mount(black);
  await waitTap(black, 900);

  if (rep.vision?.isNew) {
    const pg = PAGES[rep.vision.page];
    audio.play('vision'); audio.sfx('page');
    const v = visionScreen(rep.cause, pg);
    mount(v);
    await waitTap(v, 2600);
  }

  audio.play('hub');
  const read = scene('hub', 'hub', 'embers', 'full');
  const newCards = [...new Set(rep.newCards)];
  const killedBy = G.chron.killedBy[rep.cause];
  let resolveNext!: () => void;
  const p1 = new Promise<void>((r) => (resolveNext = r));
  read.root.append(h('div', { class: 'abs', style: { inset: '14px 24px 12px', display: 'flex', gap: '20px', zIndex: 3 } },
    h('div', { style: { flex: 1.3, display: 'flex', flexDirection: 'column' } }, h('div', { class: 'kicker' }, 'ПРОЧТЕНИЕ'), h('h2', { class: 'title-l' }, 'Что запомнило тело'),
      h('div', { class: 'autopsy' }, stat('Звон №', String(rep.tollNo)), stat('Где', `${ROMAN[run.circle]} Круг · этаж ${(run.active ? nodeById(run, run.active)?.floor ?? 0 : 0) + 1}`), stat('Убийца', killer?.name ?? '—'), stat('Аккордов', String(run.stats.chords))),
      h('p', { class: 'sub' }, killedBy > 1 ? `Это ${killedBy}-й раз. Ильзе читает быстрее.` : 'Ильзе кладёт ладонь на шрам-колокол и замирает.'),
      rep.vision?.isNew ? h('p', { class: 'newtag' }, `Видение записано: «${PAGES[rep.vision.page].title}»`) : null,
      ...rep.extra.map((g) => h('p', { class: 'newtag' }, `Страница: «${PAGES[g.page].title}»`)),
      h('div', { style: { marginTop: 'auto', width: '240px' } }, btn('Дальше', 'primary', () => resolveNext()))),
    h('div', { style: { flex: 1, textAlign: 'center' } }, newCards.length ? h('div', null, h('div', { class: 'kicker', style: { marginBottom: '4px' } }, 'ОТКРЫТЫ КАРТЫ'), h('div', { class: 'pickrow' }, ...newCards.slice(0, 3).map((id) => cardEl(id, { scale: 0.85, fresh: true })))) : h('p', { class: 'sub' }, 'Новых карт нет. Но ты уже знаешь, как это выглядит.'))));
  read.mount();
  await p1;
  for (const g of rep.extra) await pageReveal(g);

  const ep = scene('hub', 'hub', 'none', 'full');
  let resolveEp!: () => void;
  const p2 = new Promise<void>((r) => (resolveEp = r));
  ep.root.append(h('div', { class: 'center-col' }, h('div', { class: 'slab' }, h('div', { class: 'kicker' }, 'ДОСКА МЁРКА'), h('div', { class: 'epitaph' }, rep.epitaph)), h('div', { style: { width: '240px' } }, btn(first ? 'Очнуться' : 'Очнуться снова', 'primary', () => resolveEp()))));
  ep.mount();
  audio.sfx('bury');
  await p2;
  await showHub({ talk: true });
}

function waitTap(el: HTMLElement, minMs = 0) {
  return new Promise<void>((res) => { const t0 = performance.now(); el.addEventListener('click', () => { audio.unlock(); if (performance.now() - t0 >= minMs) res(); }); });
}

/* ───────────────── Хроника ───────────────── */
function openChronicle() {
  const c = G.chron;
  const kinds: [string, string][] = [['all', 'Все'], ['spine', 'История'], ['vision', 'Видения'], ['body', 'Тела'], ['event', 'События']];
  let tab = 'all';
  const list = h('div', { style: { maxHeight: '230px', overflowY: 'auto' } });
  const tabs = h('div', { class: 'tabs' });
  const pct = Math.round((c.pages.length / PAGE_LIST.length) * 100);
  const s = sheet([
    h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 4 } }, 'Хроника'), btn('Закрыть', 'ghost', () => s.close())),
    h('p', { class: 'sub' }, `Страниц: ${c.pages.length} из ${PAGE_LIST.length} · Звонов: ${c.tolls}`),
    h('div', { class: 'prog' }, h('i', { style: { width: `${pct}%` } })),
    c.names.length ? h('div', { style: { marginBottom: '6px', fontSize: '12px' } }, h('span', { class: 'kicker' }, 'ИМЕНА: '), ...c.names.map((n) => h('span', { style: { marginRight: '10px' } }, h('b', { style: { color: 'var(--amber)', fontWeight: 600 } }, n), ' ', h('span', { style: { color: 'var(--dim)' } }, NAMES[n] ?? '')))) : h('div'),
    tabs, list,
  ], { cls: 'wide' });
  const render = () => {
    clear(tabs); clear(list);
    for (const [k, l] of kinds) { const t = h('button', { class: `tab${tab === k ? ' on' : ''}` }, l); t.addEventListener('click', () => { tab = k; render(); }); tabs.append(t); }
    for (const p of PAGE_LIST.filter((x) => tab === 'all' || x.kind === tab)) {
      const have = c.pages.includes(p.id);
      const avail = (p.requires ?? []).every((r) => c.pages.includes(r));
      const row = h('button', { class: `pagecard${have ? '' : ' locked'}` }, h('b', null, have ? p.title : '???'), h('small', null, have ? p.text[0].slice(0, 110) + '…' : avail ? 'Ещё не найдено.' : 'Нужно узнать больше.'));
      if (have) row.addEventListener('click', () => { audio.sfx('page'); void pageReveal({ page: p.id, newCards: [], newNames: [], isNew: false }); });
      list.append(row);
    }
  };
  render();
}

/* ───────────────── Библиотека карт ───────────────── */
function openLibrary() {
  const c = G.chron;
  const tabs: [string, string][] = [['gravedigger', 'Могильщик'], ['wickkeeper', 'Свечница'], ['bellringer', 'Звонарь'], ['neutral', 'Общие'], ['debt', 'Долги']];
  let tab = 'gravedigger';
  const grid = h('div', { style: { maxHeight: '250px', overflowY: 'auto' } });
  const tabsEl = h('div', { class: 'tabs' });
  const s = sheet([h('div', { class: 'row', style: { alignItems: 'center' } }, h('div', { style: { flex: 4 } }, h('h2', { class: 'title-l' }, 'Карты'), h('p', { class: 'sub', style: { fontSize: '13px' } }, `Открыто ${countUnlocked()} из ${Object.keys(CARDS).length}. Карты открывает история, а не монеты.`)), btn('Закрыть', 'ghost', () => s.close())), tabsEl, grid], { cls: 'wide' });
  const render = () => {
    clear(tabsEl); clear(grid);
    for (const [k, l] of tabs) { const t = h('button', { class: `tab${tab === k ? ' on' : ''}` }, l); t.addEventListener('click', () => { tab = k; render(); }); tabsEl.append(t); }
    const order = ['basic', 'common', 'uncommon', 'rare', 'legend'];
    const ids = Object.values(CARDS).filter((d) => d.pool === tab).sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity) || a.cost - b.cost).map((d) => d.id);
    const g = h('div', { class: 'grid-cards' });
    for (const id of ids) {
      const un = isCardUnlocked(c, id);
      const el = cardEl(id, { scale: 0.7, locked: !un, noafford: un && c.disabled.includes(id), fresh: !!c.fresh[id] });
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        if (!un) { toast('Закрыто', 'Эту карту открывает история: ищи страницы в Видениях и событиях.'); return; }
        const d = CARDS[id];
        const pool = d.rarity !== 'basic' && d.pool !== 'debt';
        const ins = inspectCard({ id }, pool ? [btn(c.disabled.includes(id) ? 'Вернуть в пул' : 'Убрать из пула', 'ghost', () => { if (c.disabled.includes(id)) c.disabled.splice(c.disabled.indexOf(id), 1); else c.disabled.push(id); save(); ins.close(); render(); })] : []);
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
  const range = (v: number, on: (n: number) => void) => { const i = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: v }) as HTMLInputElement; i.addEventListener('input', () => { on(Number(i.value)); audio.unlock(); applySettings(); save(); }); return i; };
  const check = (v: boolean, on: (b: boolean) => void) => { const i = h('input', { type: 'checkbox' }) as HTMLInputElement; i.checked = v; i.addEventListener('change', () => { on(i.checked); applySettings(); save(); }); return i; };
  const sel = (v: number, opts: [number, string][], on: (n: number) => void) => { const e = h('select', null, opts.map(([k, l]) => h('option', { value: k, selected: k === v }, l))) as HTMLSelectElement; e.addEventListener('change', () => { on(Number(e.value)); applySettings(); save(); }); return e; };
  const file = h('input', { type: 'file', accept: 'application/json', style: { display: 'none' } }) as HTMLInputElement;
  file.addEventListener('change', async () => { const t = await file.files?.[0]?.text(); const c = t ? importChronicle(t) : null; if (c) { G.chron = c; applySettings(); save(); toast('Готово', 'Хроника загружена.'); } else toast('Ошибка', 'Файл не похож на сохранение.'); });
  const s = sheet([
    h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { class: 'title-l', style: { flex: 4 } }, 'Настройки'), btn('Готово', 'primary', () => s.close())),
    h('div', { class: 'cols' },
      h('div', { class: 'grow settings' }, mk('Музыка', range(st.music, (n) => (st.music = n))), mk('Звуки', range(st.sfx, (n) => (st.sfx = n))), mk('Меньше анимаций', check(st.reduceMotion, (b) => (st.reduceMotion = b))), mk('Размер текста', sel(st.textScale, [[0.9, 'Малый'], [1, 'Обычный'], [1.15, 'Крупный'], [1.3, 'Очень крупный']], (n) => (st.textScale = n))), mk('Милость (враги слабее)', sel(st.mercy, [[0, 'Нет'], [1, '−10% ЗДР врагов'], [2, '−20% ЗДР врагов'], [3, '−30% ЗДР врагов']], (n) => (st.mercy = n))), h('p', { class: 'sub', style: { fontSize: '12px' } }, 'Милость не влияет на историю и не даёт силы.')),
      h('div', { class: 'grow stack' },
        btn('Сохранить Хронику в файл', 'ghost', () => { const blob = new Blob([exportChronicle(G.chron)], { type: 'application/json' }); h('a', { href: URL.createObjectURL(blob), download: 'kolokol-hronika.json' }).click(); }),
        btn('Загрузить Хронику из файла', 'ghost', () => file.click()),
        btn('Начать всё заново', 'ghost', () => { const c2 = sheet([h('h2', { class: 'title-l' }, 'Стереть всё?'), h('p', { class: 'sub' }, 'Хроника, карты и забег будут удалены.'), h('div', { class: 'row' }, btn('Стереть', 'primary', () => { clearRun(); G.chron = newChronicle(); applySettings(); save(); location.reload(); }), btn('Отмена', 'ghost', () => c2.close()))], { cls: 'narrow' }); }), file)),
  ]);
}

/* ───────────────── Старт ───────────────── */
export function boot() {
  applySettings();
  G.run = loadRun();
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as Record<string, unknown>).__bwt = { G, showHub, showMap, showTitle, grantPage, unlockRole, save, openRolePick, beginRun, rngOf, saveRng, cardEnabled, openChronicle, openLibrary, doCombat, returnSequence, onDeath, startRun, sprite, nextCircle };
  }
  showTitle();
  const unlock = () => { audio.unlock(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);
}
