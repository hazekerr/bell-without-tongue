import { Rng } from './rng.ts';
import { Combat } from './combat.ts';
import { BASIC_DECKS, CARDS, ROLE_INFO } from './cards.ts';
import { ENEMIES, ENCOUNTERS } from './enemies.ts';
import { RELICS, RELIC_POOL } from './relics.ts';
import {
  type Chronicle, type PageGrant, cardEnabled, grantPage, tryGrantPage, ageFresh, saveChronicle,
} from './chronicle.ts';
import type { CardInst, RoleId } from './types.ts';

export type NodeType = 'fight' | 'elite' | 'event' | 'shop' | 'rest' | 'body' | 'boss';
export interface MapNode {
  id: string;
  floor: number;
  col: number;
  type: NodeType;
  next: string[];
}

export const FLOORS = 8;
export const COLS = 4;
export const MAX_CIRCLE = 2; // в срезе доступны Круги I–II

export interface RunStats {
  nodes: number;
  combats: number;
  elites: number;
  turns: number;
  chords: number;
  damageTaken: number;
}

export interface RunState {
  seed: string;
  role: RoleId;
  circle: number;
  map: MapNode[];
  /** Последний пройденный узел; null — на входе в Круг. */
  at: string | null;
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInst[];
  relics: string[];
  uid: number;
  rng: number;
  mercy: number;
  stats: RunStats;
  pagesThisRun: string[];
  seenEncounters: string[];
  seenEvents: string[];
  removals: number;
  bodiesSeen: number;
  /** Идёт ли сейчас узел (для автосохранения): id узла. */
  active: string | null;
  startedAt: number;
}

/* ───────── карта ───────── */
export function generateMap(rng: Rng, circle: number, hasBodies: boolean): MapNode[] {
  const rows: MapNode[][] = [];
  const id = (f: number, c: number) => `c${circle}f${f}c${c}`;
  for (let f = 0; f < FLOORS; f++) {
    const n = f === 0 ? 3 : rng.int(2, 4);
    const cols = rng.shuffle([0, 1, 2, 3]).slice(0, n).sort((a, b) => a - b);
    rows.push(cols.map((c) => ({ id: id(f, c), floor: f, col: c, type: 'fight' as NodeType, next: [] })));
  }
  const boss: MapNode = { id: `c${circle}boss`, floor: FLOORS, col: 1.5, type: 'boss', next: [] };
  rows.push([boss]);
  // рёбра
  for (let f = 0; f < FLOORS; f++) {
    const cur = rows[f];
    const nxt = rows[f + 1];
    if (f + 1 === FLOORS) {
      for (const n of cur) n.next = [boss.id];
      continue;
    }
    for (const n of cur) {
      const near = nxt.filter((m) => Math.abs(m.col - n.col) <= 1);
      const pool = near.length ? near : [nxt.reduce((a, b) => (Math.abs(a.col - n.col) <= Math.abs(b.col - n.col) ? a : b))];
      const k = Math.min(pool.length, rng.chance(0.45) ? 2 : 1);
      n.next = rng.shuffle([...pool]).slice(0, k).map((m) => m.id);
    }
    for (const m of nxt) {
      if (!cur.some((n) => n.next.includes(m.id))) {
        const src = cur.reduce((a, b) => (Math.abs(a.col - m.col) <= Math.abs(b.col - m.col) ? a : b));
        src.next.push(m.id);
      }
    }
  }
  // типы
  let elites = 0;
  for (let f = 1; f < FLOORS; f++) {
    for (const n of rows[f]) {
      if (f === FLOORS - 1) {
        n.type = 'rest';
        continue;
      }
      const w: [NodeType, number][] = [
        ['fight', 45], ['event', 22], ['elite', f >= 3 && elites < 2 ? 12 : 0], ['shop', f >= 2 ? 8 : 0],
        ['rest', f >= 3 ? 8 : 0], ['body', hasBodies && f >= 1 && f <= 6 ? 4 : 0],
      ];
      const tot = w.reduce((s, x) => s + x[1], 0);
      let r = rng.next() * tot;
      for (const [t, wt] of w) {
        r -= wt;
        if (r <= 0) {
          n.type = t;
          break;
        }
      }
      if (n.type === 'elite') elites++;
    }
  }
  const flat = rows.flat();
  const ensure = (type: NodeType, floors: number[]) => {
    if (flat.some((n) => n.type === type)) return;
    const cand = flat.filter((n) => floors.includes(n.floor) && (n.type === 'fight' || n.type === 'event'));
    if (cand.length) rng.pick(cand).type = type;
  };
  ensure('shop', [3, 4]);
  ensure('elite', [4, 5]);
  ensure('event', [1, 2]);
  return flat;
}

export function nodeById(run: RunState, id: string) {
  return run.map.find((n) => n.id === id);
}

/** Какие узлы можно выбрать сейчас. */
export function available(run: RunState): MapNode[] {
  if (run.active) return [];
  if (!run.at) return run.map.filter((n) => n.floor === 0);
  const cur = nodeById(run, run.at);
  return cur ? cur.next.map((i) => nodeById(run, i)!).filter(Boolean) : [];
}

/* ───────── старт забега ───────── */
export function startRun(chron: Chronicle, role: RoleId, seed = `${Date.now()}-${Math.random()}`): RunState {
  const rng = Rng.fromSeed(seed);
  let uid = 1;
  const deck: CardInst[] = BASIC_DECKS[role].map((id) => ({ uid: uid++, id, up: false }));
  const run: RunState = {
    seed, role, circle: 1, map: [], at: null, hp: ROLE_INFO[role].hp, maxHp: ROLE_INFO[role].hp, gold: 99,
    deck, relics: [], uid, rng: rng.state, mercy: chron.settings.mercy,
    stats: { nodes: 0, combats: 0, elites: 0, turns: 0, chords: 0, damageTaken: 0 }, pagesThisRun: [],
    seenEncounters: [], seenEvents: [], removals: 0, bodiesSeen: 0, active: null, startedAt: Date.now(),
  };
  run.map = generateMap(rng, 1, chron.bodies.length > 0);
  run.rng = rng.state;
  return run;
}

export const rngOf = (run: RunState) => new Rng(run.rng);
export const saveRng = (run: RunState, r: Rng) => {
  run.rng = r.state;
};

/* ───────── бои ───────── */
export function pickEncounter(run: RunState, tier: 'normal' | 'elite' | 'boss', rng: Rng): string[] {
  const table = ENCOUNTERS[run.circle][tier];
  const fresh = table.filter((e) => !run.seenEncounters.includes(e.join('+')));
  const list = fresh.length ? fresh : table;
  const e = rng.pick(list);
  run.seenEncounters.push(e.join('+'));
  return e;
}

export function startCombat(run: RunState, node: MapNode, chron: Chronicle): Combat {
  const rng = rngOf(run);
  const tier = node.type === 'boss' ? 'boss' : node.type === 'elite' ? 'elite' : 'normal';
  const enemies = pickEncounter(run, tier, rng);
  const hpScale = 1 - 0.1 * run.mercy;
  const combat = new Combat({
    rng: new Rng(rng.int(1, 2 ** 31)), role: run.role, deck: run.deck, hp: run.hp, maxHp: run.maxHp,
    relics: run.relics, enemies, circle: run.circle, hpScale,
  });
  saveRng(run, rng);
  run.active = node.id;
  void chron;
  return combat;
}

export interface CombatReward {
  gold: number;
  cards: string[];
  relic?: string;
  grants: PageGrant[];
  healed: number;
}

export function finishCombat(run: RunState, combat: Combat, node: MapNode, chron: Chronicle): CombatReward {
  const rng = rngOf(run);
  run.stats.damageTaken += Math.max(0, run.hp - combat.hero.hp);
  run.hp = combat.hero.hp;
  run.stats.combats++;
  run.stats.turns += combat.turn;
  run.stats.chords += combat.chordsThisCombat;
  if (node.type === 'elite') run.stats.elites++;
  let healed = 0;
  if (run.relics.includes('tallow')) {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + 4);
    healed = run.hp - before;
  }
  const tier = node.type;
  let gold = tier === 'boss' ? 70 : tier === 'elite' ? rng.int(30, 45) : rng.int(12, 20);
  gold += combat.goldGain;
  run.gold += gold;
  const grants: PageGrant[] = [];
  for (const k of new Set(combat.kills)) {
    chron.killed[k] = (chron.killed[k] ?? 0) + 1;
    const g = tryGrantPage(chron, `v_${k}_of`);
    if (g?.isNew) {
      grants.push(g);
      run.pagesThisRun.push(g.page);
    }
  }
  if (tier === 'boss' && run.circle === 1) {
    const g = tryGrantPage(chron, 'p_reveal1');
    if (g?.isNew) {
      grants.push(g);
      run.pagesThisRun.push(g.page);
    }
  }
  const cards = cardChoices(run, chron, tier === 'elite' || tier === 'boss' ? 'elite' : 'normal', rng);
  let relic: string | undefined;
  if (tier === 'elite') relic = pickRelic(run, 'elite', rng);
  if (tier === 'boss') relic = pickRelic(run, 'boss', rng);
  saveRng(run, rng);
  run.active = null;
  run.at = node.id;
  run.stats.nodes++;
  return { gold, cards, relic, grants, healed };
}

export function pickRelic(run: RunState, rarity: 'common' | 'elite' | 'boss', rng: Rng): string | undefined {
  const pool = RELIC_POOL(rarity).filter((r) => !run.relics.includes(r.id));
  const fallback = RELIC_POOL('common').filter((r) => !run.relics.includes(r.id));
  const from = pool.length ? pool : fallback;
  return from.length ? rng.pick(from).id : undefined;
}

export function addRelic(run: RunState, id: string) {
  run.relics.push(id);
  if (id === 'iron_lung') {
    run.maxHp += 10;
    run.hp += 10;
  }
  if (id === 'purse') run.gold += 40;
}

export function addCard(run: RunState, id: string, up = false): CardInst {
  const c = { uid: run.uid++, id, up };
  run.deck.push(c);
  return c;
}

/* ───────── награды ───────── */
export function cardPool(run: RunState, chron: Chronicle): string[] {
  return Object.values(CARDS)
    .filter((d) => (d.pool === run.role || d.pool === 'neutral') && d.rarity !== 'basic' && d.rarity !== 'legend' && cardEnabled(chron, d.id))
    .map((d) => d.id);
}

export function cardChoices(run: RunState, chron: Chronicle, kind: 'normal' | 'elite' | 'shop', rng: Rng, n = 3): string[] {
  const pool = cardPool(run, chron);
  const rw: Record<string, number> = kind === 'normal' ? { common: 60, uncommon: 33, rare: 7 } : { common: 35, uncommon: 45, rare: 20 };
  const out: string[] = [];
  const legends = Object.values(CARDS).filter((d) => d.rarity === 'legend' && cardEnabled(chron, d.id)).map((d) => d.id);
  for (let i = 0; i < n; i++) {
    const cand = pool.filter((id) => !out.includes(id));
    if (!cand.length) break;
    let id: string;
    if (legends.length && kind !== 'normal' && rng.chance(0.06)) id = rng.pick(legends);
    else id = rng.weighted(cand, (c) => (rw[CARDS[c].rarity] ?? 10) * (chron.fresh[c] ? 1.8 : 1));
    out.push(id);
  }
  return out;
}

/* ───────── лавка ───────── */
export interface ShopItem {
  kind: 'card' | 'relic';
  id: string;
  price: number;
  sold?: boolean;
}
export interface Shop {
  items: ShopItem[];
  removeCost: number;
}
export const PRICE = { common: 50, uncommon: 75, rare: 150 } as const;

export function genShop(run: RunState, chron: Chronicle): Shop {
  const rng = rngOf(run);
  const ids = cardChoices(run, chron, 'shop', rng, 5);
  const items: ShopItem[] = ids.map((id) => {
    const r = CARDS[id].rarity as keyof typeof PRICE;
    return { kind: 'card', id, price: Math.round((PRICE[r] ?? 75) * (0.85 + rng.next() * 0.3)) };
  });
  for (let i = 0; i < 2; i++) {
    const rid = pickRelic(run, 'common', rng);
    if (rid && !items.some((x) => x.id === rid)) items.push({ kind: 'relic', id: rid, price: rng.int(140, 200) });
  }
  saveRng(run, rng);
  return { items, removeCost: 75 + 25 * run.removals };
}

/* ───────── отдых ───────── */
export function restHeal(run: RunState) {
  const n = Math.ceil(run.maxHp * 0.3);
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + n);
  return run.hp - before;
}

export function upgradeable(run: RunState): CardInst[] {
  return run.deck.filter((c) => !c.up && CARDS[c.id].type !== 'debt');
}
export function removable(run: RunState): CardInst[] {
  return run.deck;
}

/* ───────── переход между Кругами / конец ───────── */
export function nextCircle(run: RunState, chron: Chronicle) {
  const rng = rngOf(run);
  run.circle++;
  run.map = generateMap(rng, run.circle, chron.bodies.length > 0);
  run.at = null;
  run.active = null;
  // отдых между Кругами: небольшое лечение
  run.hp = Math.min(run.maxHp, run.hp + Math.ceil(run.maxHp * 0.25));
  saveRng(run, rng);
}

/* ───────── смерть ───────── */
const CAUSE: Record<string, string> = {
  drowned_laundress: 'Выжат прачкой', silt_hound: 'Загрызен тинным псом', stone_fisher: 'Пойман в сеть', mussel: 'Зазвучал в хоре ракушек',
  alban: 'Закопан Альбаном', drowned_bellman: 'Прозвонен насквозь', tide_mother: 'Смыт Матерью Приливов', candle_bearer: 'Сожжён свечником',
  ash_monk: 'Обращён в пепел', stained_seraph: 'Порезан витражом', choir_reaper: 'Скошен Жнецом Хора', choirmaster: 'Принят в хор Оттона',
};
const TAIL_GENERIC = ['Копал неглубоко.', 'Просил не звонить.', 'Не доиграл Аккорд.', 'Забыл про Броню.', 'Верил расписанию.', 'Шёл на звук.', 'Слишком надеялся на Тлен.'];

export function epitaph(run: RunState, chron: Chronicle, cause: string, rng: Rng): string {
  const n = 1311 + chron.tolls;
  const head = `Безымянный № ${n}.`;
  const body = `${CAUSE[cause] ?? 'Умер'}.`;
  let tail: string;
  if (run.stats.chords === 0 && run.stats.combats > 1) tail = 'Ни одного Аккорда за всё время.';
  else if (run.deck.length >= 28) tail = 'Колода раздулась до размеров склепа.';
  else if (run.gold >= 200) tail = 'Умер богатым. Монеты не вернули.';
  else if (run.relics.length >= 4) tail = 'Нёс много, донёс мало.';
  else if (run.stats.damageTaken === 0) tail = 'Ни царапины. До этого момента.';
  else tail = rng.pick(TAIL_GENERIC);
  return `${head} ${body} ${tail}`;
}

export interface ReturnReport {
  cause: string;
  epitaph: string;
  vision: PageGrant | null;
  extra: PageGrant[];
  newCards: string[];
  tollNo: number;
}

/** Смерть героя: душа (Хроника) остаётся, тело (забег) сбрасывается. */
export function onDeath(run: RunState, combat: Combat | null, chron: Chronicle): ReturnReport {
  const rng = rngOf(run);
  const cause = combat?.killedBy ?? 'drowned_laundress';
  chron.tolls++;
  chron.runs++;
  chron.killedBy[cause] = (chron.killedBy[cause] ?? 0) + 1;
  chron.bestCircle = Math.max(chron.bestCircle, run.circle);
  const ep = epitaph(run, chron, cause, rng);
  const node = run.active ? nodeById(run, run.active) : undefined;
  chron.bodies.unshift({ circle: run.circle, floor: node?.floor ?? 0, cause, role: run.role, epitaph: ep, at: Date.now() });
  chron.bodies = chron.bodies.slice(0, 5);
  const vision = tryGrantPage(chron, `v_${cause}_by`);
  const extra: PageGrant[] = [];
  const newCards: string[] = [];
  if (vision?.isNew) newCards.push(...vision.newCards);
  // Гарантированные сюжетные страницы пролога
  for (const id of ['p_awake', 'p_ilse', 'p_scar']) {
    const g = tryGrantPage(chron, id);
    if (g?.isNew) {
      extra.push(g);
      newCards.push(...g.newCards);
    }
  }
  ageFresh(chron);
  saveChronicle(chron);
  return { cause, epitaph: ep, vision, extra, newCards, tollNo: chron.tolls };
}

/** Победа: завершает забег (в срезе — после босса Круга II). */
export function onVictory(run: RunState, chron: Chronicle): PageGrant[] {
  chron.runs++;
  chron.wins++;
  chron.bestCircle = Math.max(chron.bestCircle, run.circle);
  const out: PageGrant[] = [];
  for (const id of ['p_slice_end']) {
    const g = tryGrantPage(chron, id);
    if (g?.isNew) out.push(g);
  }
  ageFresh(chron);
  saveChronicle(chron);
  return out;
}

/** Страницы, которые тело (прошлый труп) даёт в узле «Тело». */
export function bodyPage(run: RunState, chron: Chronicle): PageGrant | null {
  const order = ['b_1', 'b_2', 'b_3', 'b_4', 'b_5', 'b_6'];
  for (const id of order) {
    if (!chron.pages.includes(id)) return grantPage(chron, id);
  }
  return null;
}

export { ENEMIES, RELICS };
