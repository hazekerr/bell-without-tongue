import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng.ts';
import { Combat } from '../src/engine/combat.ts';
import { BASIC_DECKS, CARDS } from '../src/engine/cards.ts';
import type { CardInst, RoleId } from '../src/engine/types.ts';

let uid = 1;
const mk = (ids: string[]): CardInst[] => ids.map((id) => ({ uid: uid++, id, up: false }));

function setup(role: RoleId, enemies: string[], seed = 1, deck?: string[]) {
  return new Combat({
    rng: new Rng(seed), role, deck: mk(deck ?? BASIC_DECKS[role]), hp: 80, maxHp: 80, relics: [], enemies, circle: 1,
  });
}

/** Подкладывает в руку конкретные карты. */
function hand(c: Combat, ids: string[]) {
  c.discard.push(...c.hand.splice(0));
  c.drawPile.push(...c.discard.splice(0));
  for (const id of ids) {
    const i = c.drawPile.findIndex((x) => x.id === id);
    if (i < 0) c.drawPile.push({ uid: uid++, id, up: false });
    const j = c.drawPile.findIndex((x) => x.id === id);
    c.hand.push(c.drawPile.splice(j, 1)[0]);
  }
}

describe('Аккорд', () => {
  it('стартовая колода даёт Аккорд в ~73% первых ходов', () => {
    let ok = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const c = setup('gravedigger', ['drowned_laundress'], i + 1);
      const t = new Set(c.hand.map((x) => CARDS[x.id].type));
      if (t.has('strike') && t.has('ward') && t.has('rite')) ok++;
    }
    const p = ok / N;
    expect(p).toBeGreaterThan(0.69);
    expect(p).toBeLessThan(0.77);
  });

  it('срабатывает при трёх разных типах за ход и только один раз', () => {
    const c = setup('gravedigger', ['stone_fisher']);
    hand(c, ['strike', 'ward', 'grave_dust', 'strike']);
    c.breath = 4;
    c.play(c.hand.find((x) => x.id === 'strike')!.uid);
    c.play(c.hand.find((x) => x.id === 'ward')!.uid);
    expect(c.chordDone).toBe(false);
    c.play(c.hand.find((x) => x.id === 'grave_dust')!.uid);
    expect(c.chordDone).toBe(true);
    expect(c.chordsThisCombat).toBe(1);
    c.play(c.hand.find((x) => x.id === 'strike')!.uid);
    expect(c.chordsThisCombat).toBe(1);
  });

  it('Свечница получает +4 Пламени и лечится', () => {
    const c = setup('wickkeeper', ['stone_fisher']);
    c.hero.hp = 50;
    hand(c, ['strike', 'ward', 'splinter']);
    for (const id of ['strike', 'ward', 'splinter']) c.play(c.hand.find((x) => x.id === id)!.uid);
    expect(c.hero.flame).toBeGreaterThanOrEqual(3 + 2);
    expect(c.hero.hp).toBe(52);
  });
});

describe('Могила', () => {
  it('Аккорд Могильщика возвращает карту из Могилы бесплатно (пример из дизайна)', () => {
    const c = setup('gravedigger', ['stone_fisher'], 7);
    const cross: CardInst = { uid: uid++, id: 'stone_cross', up: false };
    hand(c, ['earth_to_earth', 'grave_dust', 'spade']);
    c.drawPile.push(cross); // верх колоды
    c.breath = 3;
    const target = c.living[0];
    const hp0 = target.hp;
    c.play(c.hand.find((x) => x.id === 'earth_to_earth')!.uid);
    expect(c.grave.map((x) => x.id)).toContain('stone_cross');
    c.play(c.hand.find((x) => x.id === 'grave_dust')!.uid, target.uid);
    c.play(c.hand.find((x) => x.id === 'spade')!.uid, target.uid);
    // Аккорд: единственная карта в Могиле возвращается автоматически
    expect(c.chordDone).toBe(true);
    const back = c.hand.find((x) => x.id === 'stone_cross')!;
    expect(back).toBeTruthy();
    expect(c.cost(back)).toBe(0);
    c.play(back.uid, target.uid);
    expect(target.hp).toBe(hp0 - (8 + 4) - 14);
    expect(target.statuses.dread).toBe(2);
  });

  it('при нескольких картах нужен выбор', () => {
    const c = setup('gravedigger', ['stone_fisher']);
    c.grave.push({ uid: uid++, id: 'strike', up: false }, { uid: uid++, id: 'ward', up: false });
    c.exhume(1, true);
    expect(c.pending).not.toBeNull();
    expect(() => c.endTurn()).toThrow();
    c.choose_exhume([c.pending!.options[1]]);
    expect(c.pending).toBeNull();
    expect(c.hand.some((x) => x.id === 'ward' && x.free)).toBe(true);
  });
});

describe('Статусы', () => {
  it('Тлен игнорирует Броню и убывает', () => {
    const c = setup('gravedigger', ['stone_fisher']);
    const e = c.living[0];
    e.statuses.rot = 5;
    e.intent = { id: 's', name: 's', kind: 'defend', block: 50 };
    const hp = e.hp;
    hand(c, []);
    c.endTurn();
    expect(e.hp).toBe(hp - 5);
    expect(e.statuses.rot).toBe(4);
  });

  it('Страх уменьшает урон врага на 25%', () => {
    const c = setup('gravedigger', ['drowned_laundress']);
    const e = c.living[0];
    e.intent = { id: 'a', name: 'a', kind: 'attack', dmg: 16, hits: 1 };
    e.statuses.dread = 2;
    hand(c, []);
    c.endTurn();
    expect(c.hero.hp).toBe(80 - 12);
  });

  it('Оковы пропускают ход врага; у элит есть иммунитет', () => {
    const c = setup('gravedigger', ['alban']);
    const e = c.living[0];
    e.intent = { id: 'a', name: 'a', kind: 'attack', dmg: 20, hits: 1 };
    c.addStatus(e, 'chains', 1);
    hand(c, []);
    c.endTurn();
    expect(c.hero.hp).toBe(80);
    c.addStatus(e, 'chains', 1);
    expect(e.statuses.chains ?? 0).toBe(0); // иммунитет
  });

  it('Кровь ранит атакующего врага', () => {
    const c = setup('gravedigger', ['silt_hound']);
    const e = c.living[0];
    e.intent = { id: 'a', name: 'a', kind: 'attack', dmg: 4, hits: 1 };
    e.statuses.bleed = 3;
    const hp = e.hp;
    hand(c, []);
    c.endTurn();
    expect(e.hp).toBe(hp - 3);
    expect(c.hero.hp).toBe(80 - 4);
  });
});

describe('Правила боя', () => {
  it('Дыхание 3, рука 5, броня сбрасывается', () => {
    const c = setup('gravedigger', ['stone_fisher']);
    expect(c.breath).toBe(3);
    expect(c.hand.length).toBe(5);
    hand(c, ['ward']);
    c.play(c.hand[0].uid);
    expect(c.hero.block).toBe(5);
    c.endTurn();
    expect(c.hero.block).toBe(0);
  });

  it('нельзя сыграть карту дороже Дыхания', () => {
    const c = setup('gravedigger', ['stone_fisher']);
    hand(c, ['stone_cross', 'stone_cross']);
    c.play(c.hand[0].uid);
    expect(c.canPlay(c.hand[0].uid)).toBe(false);
  });

  it('Расписка в руке в конце хода отнимает 2 ЗДР', () => {
    const c = setup('gravedigger', ['stone_fisher']);
    hand(c, ['iou']);
    c.living[0].intent = { id: 'x', name: 'x', kind: 'defend', block: 1 };
    c.endTurn();
    expect(c.hero.hp).toBe(78);
  });

  it('победа и поражение определяются корректно, killedBy запоминается', () => {
    const c = setup('gravedigger', ['mussel']);
    c.living[0].hp = 1;
    hand(c, ['strike']);
    c.play(c.hand[0].uid);
    expect(c.result).toBe('win');

    const d = setup('gravedigger', ['silt_hound']);
    d.hero.hp = 3;
    d.living[0].intent = { id: 'a', name: 'a', kind: 'attack', dmg: 10, hits: 1 };
    hand(d, []);
    d.endTurn();
    expect(d.result).toBe('lose');
    expect(d.killedBy).toBe('silt_hound');
  });

  it('бой детерминирован по сиду', () => {
    const a = setup('gravedigger', ['stone_fisher'], 42);
    const b = setup('gravedigger', ['stone_fisher'], 42);
    expect(a.hand.map((c) => c.id)).toEqual(b.hand.map((c) => c.id));
    expect(a.living[0].hp).toBe(b.living[0].hp);
  });
});
