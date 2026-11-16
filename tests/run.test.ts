import { beforeEach, describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng.ts';
import {
  MemoryStore, setStore, loadChronicle, saveChronicle, newChronicle, grantPage, isCardUnlocked, pageAvailable, tryGrantPage,
} from '../src/engine/chronicle.ts';
import { Combat } from '../src/engine/combat.ts';
import { startRun, generateMap, startCombat, onDeath, available, nodeById, finishCombat, FLOORS, cardPool } from '../src/engine/run.ts';
import { pickEvent, EVENTS } from '../src/engine/events.ts';
import { CARDS } from '../src/engine/cards.ts';
import { PAGES, PAGE_LIST } from '../src/content/pages.ts';

beforeEach(() => setStore(new MemoryStore()));

describe('карта забега', () => {
  it('каждый узел достижим и ведёт к боссу', () => {
    for (let s = 0; s < 200; s++) {
      const rng = new Rng(s + 1);
      const map = generateMap(rng, 1, true);
      const byId = new Map(map.map((n) => [n.id, n]));
      const boss = map.find((n) => n.type === 'boss')!;
      const reach = new Set<string>(map.filter((n) => n.floor === 0).map((n) => n.id));
      for (let f = 0; f < FLOORS; f++)
        for (const n of map.filter((x) => x.floor === f)) {
          expect(n.next.length).toBeGreaterThan(0);
          if (reach.has(n.id)) n.next.forEach((i) => reach.add(i));
        }
      expect(reach.has(boss.id)).toBe(true);
      for (const n of map) if (n.floor > 0) expect(reach.has(n.id)).toBe(true);
      expect(map.some((n) => n.type === 'shop')).toBe(true);
      expect(map.filter((n) => n.floor === FLOORS - 1).every((n) => n.type === 'rest')).toBe(true);
      expect(map.filter((n) => n.floor === 0).every((n) => n.type === 'fight')).toBe(true);
      void byId;
    }
  });
});

describe('Хроника и смерть', () => {
  it('смерть сбрасывает забег, но сохраняет страницы, имена и открытые карты', () => {
    const chron = newChronicle();
    const run = startRun(chron, 'gravedigger', 's1');
    const node = available(run)[0];
    const combat = startCombat(run, node, chron);
    // игрок «нашёл» страницу во время забега
    const g = grantPage(chron, 'e_tin_ring');
    expect(g?.isNew).toBe(true);
    expect(chron.names).toContain('Тин');
    // герой погибает
    combat.hero.hp = 0;
    combat.killedBy = 'drowned_laundress';
    const rep = onDeath(run, combat, chron);
    expect(chron.tolls).toBe(1);
    expect(chron.pages).toContain('e_tin_ring');
    expect(chron.pages).toContain('v_drowned_laundress_by');
    expect(rep.epitaph).toMatch(/Безымянный № 1312/);
    // сохранение пережило перезагрузку
    const reloaded = loadChronicle();
    expect(reloaded.pages).toEqual(chron.pages);
    expect(reloaded.unlocked).toEqual(chron.unlocked);
    // новый забег начинается с чистого листа: базовая колода, базовое HP, монеты
    const run2 = startRun(reloaded, 'gravedigger', 's2');
    expect(run2.deck.length).toBe(10);
    expect(run2.hp).toBe(80);
    expect(run2.relics).toEqual([]);
    expect(run2.gold).toBe(99);
  });

  it('метапрогрессия открывает только карты — не силу', () => {
    const chron = newChronicle();
    const run0 = startRun(chron, 'gravedigger', 'a');
    grantPage(chron, 'v_drowned_laundress_of'); // открывает warm_tallow
    const run1 = startRun(chron, 'gravedigger', 'a');
    expect(run1.hp).toBe(run0.hp);
    expect(run1.gold).toBe(run0.gold);
    expect(run1.deck.length).toBe(run0.deck.length);
    expect(isCardUnlocked(chron, 'warm_tallow')).toBe(true);
    expect(isCardUnlocked(chron, 'weight_of_earth')).toBe(false);
  });

  it('требования страниц защищают от спойлеров', () => {
    const chron = newChronicle();
    expect(pageAvailable(chron, 'p_reveal1')).toBe(false);
    expect(tryGrantPage(chron, 'p_reveal1')).toBeNull();
    grantPage(chron, 'p_awake');
    grantPage(chron, 'p_order');
    expect(pageAvailable(chron, 'p_reveal1')).toBe(true);
  });

  it('контент: все карты из страниц существуют, у каждой закрытой карты есть источник', () => {
    const locked = Object.values(CARDS).filter((c) => !c.startUnlocked).map((c) => c.id);
    const sources = new Set(PAGE_LIST.flatMap((p) => p.unlocks ?? []));
    for (const s of sources) expect(CARDS[s], `карта ${s}`).toBeTruthy();
    for (const id of locked) expect(sources.has(id), `нет источника для ${id}`).toBe(true);
    for (const p of PAGE_LIST) for (const r of p.requires ?? []) expect(PAGES[r], `${p.id} требует ${r}`).toBeTruthy();
  });
});

describe('награды и события', () => {
  it('пул наград содержит только открытые карты роли и нейтральные', () => {
    const chron = newChronicle();
    const run = startRun(chron, 'wickkeeper', 'x');
    for (const id of cardPool(run, chron)) {
      expect(['wickkeeper', 'neutral']).toContain(CARDS[id].pool);
      expect(isCardUnlocked(chron, id)).toBe(true);
    }
  });

  it('события строятся и их варианты исполняются без ошибок', () => {
    for (let s = 0; s < EVENTS.length * 4; s++) {
      const chron = newChronicle();
      const run = startRun(chron, 'gravedigger', `ev${s}`);
      run.hp = 60;
      run.gold = 200;
      chron.names.push('Тин');
      const ev = pickEvent(run, chron);
      for (const o of ev.options) {
        if (o.disabled) continue;
        expect(() => o.run()).not.toThrow();
      }
    }
  });

  it('полный бой «через движок забега» заканчивается наградой', () => {
    const chron = newChronicle();
    const run = startRun(chron, 'gravedigger', 'w');
    const node = nodeById(run, available(run)[0].id)!;
    const combat = startCombat(run, node, chron);
    for (const e of combat.living) e.hp = 1;
    // добиваем любой доступной атакой
    for (let i = 0; i < 20 && !combat.result; i++) {
      const s = combat.hand.find((c) => CARDS[c.id].type === 'strike' && combat.canPlay(c.uid));
      if (s) combat.play(s.uid);
      else combat.endTurn();
    }
    expect(combat.result).toBe('win');
    const r = finishCombat(run, combat, node, chron);
    expect(r.gold).toBeGreaterThan(0);
    expect(r.cards.length).toBeGreaterThan(0);
    expect(run.at).toBe(node.id);
  });
});

describe('сохранение', () => {
  it('Хроника переживает сериализацию', () => {
    const c = newChronicle();
    grantPage(c, 'p_awake');
    saveChronicle(c);
    expect(loadChronicle().names).toContain('Мёрк');
  });
});

describe('роль Звонаря', () => {
  it('открывается после победы над боссом Круга II и даёт страницу', () => {
    const chron = newChronicle();
    expect(chron.roles).not.toContain('bellringer');
    const run = startRun(chron, 'gravedigger', 'br');
    run.circle = 2;
    const node = { id: 'c2boss', floor: 8, col: 1, type: 'boss' as const, next: [] };
    const combat = new Combat({ rng: new Rng(3), role: 'gravedigger', deck: run.deck, hp: 80, maxHp: 80, relics: [], enemies: ['choirmaster'], circle: 2 });
    combat.living[0].hp = 1;
    const s = combat.hand.find((c) => CARDS[c.id].type === 'strike');
    if (s) combat.play(s.uid);
    else { for (const e of combat.living) e.hp = 0; }
    combat.living.forEach((e) => { e.alive = false; });
    (combat as unknown as { result: string }).result = 'win';
    finishCombat(run, combat, node, chron);
    expect(chron.roles).toContain('bellringer');
    expect(chron.pages).toContain('p_ringer');
  });
});

describe('события в каждом Круге', () => {
  it('в любом Круге находится событие', () => {
    for (const circle of [1, 2, 3]) {
      const chron = newChronicle();
      const run = startRun(chron, 'gravedigger', `ev-c${circle}`);
      run.circle = circle;
      expect(() => pickEvent(run, chron)).not.toThrow();
    }
  });
});

describe('Заказы', () => {
  it('заказчики с неизвестным именем не предлагают заказ', async () => {
    const { offerCommissions } = await import('../src/engine/commissions.ts');
    const chron = newChronicle();
    for (let s = 1; s < 40; s++) for (const c of offerCommissions(chron, new Rng(s))) expect(c.needsName).toBeUndefined();
    chron.names.push('Тин', 'Гаспар');
    const seen = new Set<string>();
    for (let s = 1; s < 200; s++) for (const c of offerCommissions(chron, new Rng(s))) seen.add(c.id);
    expect(seen.has('choir_practice')).toBe(true);
    expect(seen.has('gold_miser')).toBe(true);
  });

  it('выполняется один раз; провал не даёт награды', async () => {
    const { checkCommission } = await import('../src/engine/commissions.ts');
    const chron = newChronicle();
    const run = startRun(chron, 'gravedigger', 'cm1', 'elite_hunt');
    expect(checkCommission(run)).toBeNull();
    run.stats.elites = 1;
    expect(checkCommission(run)?.id).toBe('elite_hunt');
    expect(checkCommission(run)).toBeNull();

    const r2 = startRun(chron, 'gravedigger', 'cm2', 'light_sleeper');
    r2.stats.rests = 1;
    expect(checkCommission(r2)).toBeNull();
    expect(r2.commission?.state).toBe('failed');
    r2.circle = 2;
    expect(checkCommission(r2)).toBeNull();
  });

  it('«Налегке» проверяется на входе во второй Круг', async () => {
    const { checkCommission } = await import('../src/engine/commissions.ts');
    const chron = newChronicle();
    const run = startRun(chron, 'gravedigger', 'cm3', 'light_pack');
    run.circle = 2;
    run.deck.push({ uid: 999, id: 'strike', up: false }, { uid: 998, id: 'strike', up: false }, { uid: 997, id: 'strike', up: false });
    expect(checkCommission(run)).toBeNull();
    expect(run.commission?.state).toBe('failed');
  });
});
