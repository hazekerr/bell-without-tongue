/* Симулятор баланса: простой жадный бот проходит забеги. Это нижняя граница силы игрока:
   живой игрок выигрывает чаще. Запуск: npm run sim -- [N] */
import { Rng } from '../src/engine/rng.ts';
import { Combat } from '../src/engine/combat.ts';
import { CARDS } from '../src/engine/cards.ts';
import { newChronicle, setStore, MemoryStore, type Chronicle } from '../src/engine/chronicle.ts';
import {
  startRun, available, startCombat, finishCombat, genShop, onDeath, onVictory, nextCircle, addCard, addRelic, restHeal,
  upgradeable, rngOf, saveRng, type RunState, type MapNode, MAX_CIRCLE,
} from '../src/engine/run.ts';
import { pickEvent } from '../src/engine/events.ts';
import { ENEMIES } from '../src/engine/enemies.ts';
import type { RoleId } from '../src/engine/types.ts';

setStore(new MemoryStore());

function incoming(c: Combat): number {
  let n = 0;
  for (const e of c.living) if (e.intent.kind === 'attack') n += c.enemyDamage(e, e.intent.dmg ?? 0) * (e.intent.hits ?? 1);
  return n;
}

function playTurn(c: Combat) {
  let guard = 40;
  while (!c.result && guard-- > 0) {
    if (c.pending) {
      const best = [...c.pending.options].sort((a, b) => CARDS[c.grave.find((x) => x.uid === b)!.id].cost - CARDS[c.grave.find((x) => x.uid === a)!.id].cost);
      c.choose_exhume(best.slice(0, c.pending.count));
      continue;
    }
    const need = Math.max(0, incoming(c) - c.hero.block);
    const cands = c.hand.filter((x) => c.canPlay(x.uid));
    if (!cands.length) break;
    const score = (x: typeof cands[0]) => {
      const d = CARDS[x.id];
      let s = 0;
      const t = d.type;
      if (t !== 'debt' && !c.typesPlayed.has(t) && c.typesPlayed.size < 3) s += 3;
      if (t === 'ward') s += need > 0 ? 6 + Math.min(need, 12) / 2 : -2;
      if (t === 'strike') s += 5;
      if (t === 'rite') s += 4;
      if (d.id === 'dig_deeper' || d.id === 'breath_in') s += 3;
      s -= c.cost(x) * 0.8;
      if (d.id === 'memorial_candle' && c.hero.hp < c.hero.maxHp * 0.4) s -= 8;
      if (d.id === 'burn_bridges' && c.hero.hp < 25) s -= 20;
      if (['hot_wax', 'torch', 'stub', 'whisper_fire'].includes(d.id) && c.hero.hp < c.hero.maxHp * 0.3) s -= 6;
      return s;
    };
    cands.sort((a, b) => score(b) - score(a));
    const pick = cands[0];
    if (score(pick) < -1) break;
    const d = CARDS[pick.id];
    let tgt = c.living[0];
    if (d.type === 'strike') tgt = [...c.living].sort((a, b) => a.hp + a.block - (b.hp + b.block))[0];
    else tgt = [...c.living].sort((a, b) => b.hp - a.hp)[0];
    c.play(pick.uid, tgt.uid);
  }
  if (!c.result) {
    if (c.pending) c.choose_exhume(c.pending.options.slice(0, c.pending.count));
    c.endTurn();
  }
}

function fight(run: RunState, node: MapNode, chron: Chronicle): Combat {
  const c = startCombat(run, node, chron);
  let guard = 200;
  while (!c.result && guard-- > 0) playTurn(c);
  return c;
}

function chooseNode(run: RunState, opts: MapNode[]): MapNode {
  const hpP = run.hp / run.maxHp;
  const rank = (n: MapNode) => {
    switch (n.type) {
      case 'rest': return hpP < 0.65 ? 10 : 2;
      case 'shop': return run.gold >= 100 ? 8 : 1;
      case 'elite': return hpP > 0.75 && run.deck.length >= 13 ? 6 : -4;
      case 'event': return 4;
      case 'body': return 3;
      default: return 5;
    }
  };
  return [...opts].sort((a, b) => rank(b) - rank(a))[0];
}

function takeCard(run: RunState, ids: string[], rng: Rng) {
  const prefer = ids.filter((i) => CARDS[i].type !== 'debt');
  if (!prefer.length) return;
  const strikes = run.deck.filter((c) => CARDS[c.id].type === 'strike').length;
  const wards = run.deck.filter((c) => CARDS[c.id].type === 'ward').length;
  const rites = run.deck.filter((c) => CARDS[c.id].type === 'rite').length;
  const want = (id: string) => {
    const t = CARDS[id].type;
    const lacks = t === 'strike' ? strikes : t === 'ward' ? wards : rites;
    const r = { basic: 0, common: 1, uncommon: 2, rare: 3, legend: 4 }[CARDS[id].rarity];
    return r - lacks * 0.3 + rng.next();
  };
  const best = [...prefer].sort((a, b) => want(b) - want(a))[0];
  if (run.deck.length >= 22 && rng.chance(0.5)) return;
  addCard(run, best);
}

export interface SimResult {
  won: boolean;
  circle: number;
  floor: number;
  killer: string | null;
  combats: number;
  hpEnd: number;
  deck: number;
}

export function simulate(role: RoleId, seed: string, chron: Chronicle): SimResult {
  const run = startRun(chron, role, seed);
  const rng = new Rng(Math.floor(rngOf(run).next() * 1e9) + 1);
  let lastFloor = 0;
  for (;;) {
    const opts = available(run);
    const node = chooseNode(run, opts);
    lastFloor = node.floor;
    if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') {
      const c = fight(run, node, chron);
      if (c.result === 'lose') {
        onDeath(run, c, chron);
        return { won: false, circle: run.circle, floor: lastFloor, killer: c.killedBy, combats: run.stats.combats + 1, hpEnd: 0, deck: run.deck.length };
      }
      const rw = finishCombat(run, c, node, chron);
      takeCard(run, rw.cards, rng);
      if (rw.relic) addRelic(run, rw.relic);
      if (node.type === 'boss') {
        if (run.circle >= MAX_CIRCLE) {
          onVictory(run, chron);
          return { won: true, circle: run.circle, floor: lastFloor, killer: null, combats: run.stats.combats, hpEnd: run.hp, deck: run.deck.length };
        }
        nextCircle(run, chron);
      }
    } else if (node.type === 'rest') {
      if (run.hp / run.maxHp < 0.7) restHeal(run);
      else {
        const u = upgradeable(run);
        if (u.length) rng.pick(u).up = true;
        else restHeal(run);
      }
      run.at = node.id;
    } else if (node.type === 'shop') {
      const shop = genShop(run, chron);
      for (const it of shop.items.sort((a, b) => b.price - a.price)) {
        if (run.gold >= it.price && it.kind === 'card' && run.deck.length < 20) {
          run.gold -= it.price;
          addCard(run, it.id);
        } else if (run.gold >= it.price && it.kind === 'relic') {
          run.gold -= it.price;
          addRelic(run, it.id);
        }
      }
      run.at = node.id;
    } else if (node.type === 'event') {
      const ev = pickEvent(run, chron);
      const opts2 = ev.options.filter((o) => !o.disabled);
      const o = opts2[0];
      const out = o.run();
      if (out.died) {
        onDeath(run, null, chron);
        return { won: false, circle: run.circle, floor: lastFloor, killer: 'event', combats: run.stats.combats, hpEnd: 0, deck: run.deck.length };
      }
      if (out.then === 'pick' && out.pickIds) takeCard(run, out.pickIds, rng);
      if (out.then === 'upgrade') {
        const u = upgradeable(run);
        if (u.length) rng.pick(u).up = true;
      }
      if (out.then === 'remove') {
        const junk = run.deck.find((c) => c.id === 'strike') ?? run.deck[0];
        run.deck.splice(run.deck.indexOf(junk), 1);
      }
      run.at = node.id;
    } else {
      run.at = node.id;
    }
    saveRng(run, rng);
  }
}

const N = Number(process.argv[2] ?? 300);
for (const role of ['gravedigger', 'wickkeeper', 'bellringer'] as RoleId[]) {
  const res: SimResult[] = [];
  const chron = newChronicle();
  for (let i = 0; i < N; i++) res.push(simulate(role, `${role}-${i}`, chron));
  const wins = res.filter((r) => r.won).length;
  const dist: Record<string, number> = {};
  const killers: Record<string, number> = {};
  for (const r of res) {
    if (r.won) continue;
    const k = `Круг ${r.circle}`;
    dist[k] = (dist[k] ?? 0) + 1;
    if (r.killer) killers[r.killer] = (killers[r.killer] ?? 0) + 1;
  }
  const avgCombats = res.reduce((s, r) => s + r.combats, 0) / res.length;
  console.log(`\n=== ${role} (N=${N}, бот-жадина, карты открываются по ходу) ===`);
  console.log(`побед: ${((wins / N) * 100).toFixed(1)}%   средний забег: ${avgCombats.toFixed(1)} боёв`);
  console.log('смерти по Кругам:', Object.entries(dist).map(([k, v]) => `${k}: ${((v / (N - wins)) * 100).toFixed(0)}%`).join(', '));
  console.log('убийцы:', Object.entries(killers).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${ENEMIES[k]?.name ?? k} ${v}`).join('; '));
}
