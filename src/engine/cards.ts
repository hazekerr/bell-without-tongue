import type { Ctx } from './combat.ts';
import type { CardPool, CardType, EnemyInst, Rarity } from './types.ts';

export interface CardDef {
  id: string;
  name: string;
  type: CardType | 'debt';
  cost: number;
  pool: CardPool;
  rarity: Rarity;
  target: 'enemy' | 'all' | 'none';
  /** Мотив иллюстрации. */
  art: string;
  text: (u: boolean) => string;
  play: (x: Ctx, u: boolean, t?: EnemyInst) => void;
  exhaust?: boolean;
  /** Улучшенная версия не исчерпывается. */
  exhaustUnlessUp?: boolean;
  ethereal?: boolean;
  /** Эта карта после розыгрыша уходит в Могилу, а не в сброс. */
  selfBury?: boolean;
  unplayable?: boolean;
  onTurnEnd?: (x: Ctx) => void;
  /** Доступна в пуле с самого начала игры. */
  startUnlocked?: boolean;
  flavor?: string;
}

type Spec = Omit<CardDef, 'type'> & { type: CardType | 'debt' };
export const CARDS: Record<string, CardDef> = {};
const add = (c: Spec) => {
  CARDS[c.id] = c as CardDef;
};
const v = (u: boolean, a: number, b: number) => (u ? b : a);
const T = { rot: 'Тлен', bleed: 'Кровь', dread: 'Страх', chains: 'Оковы' } as const;

/* ═════════════ Общие базовые ═════════════ */
add({
  id: 'strike', name: 'Удар', type: 'strike', cost: 1, pool: 'neutral', rarity: 'basic', target: 'enemy', art: 'blade', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 6, 9)} урона.`,
  play: (x, u, t) => x.dmg(t!, v(u, 6, 9)),
});
add({
  id: 'ward', name: 'Оберег', type: 'ward', cost: 1, pool: 'neutral', rarity: 'basic', target: 'none', art: 'ward', startUnlocked: true,
  text: (u) => `Получи ${v(u, 5, 8)} Брони.`,
  play: (x, u) => x.block(v(u, 5, 8)),
});

/* ═════════════ Могильщик ═════════════ */
add({
  id: 'grave_dust', name: 'Горсть праха', type: 'rite', cost: 1, pool: 'gravedigger', rarity: 'basic', target: 'enemy', art: 'dust', startUnlocked: true,
  text: (u) => `Наложи ${v(u, 5, 7)} ${T.rot}.`,
  play: (x, u, t) => x.apply(t!, 'rot', v(u, 5, 7)),
  flavor: 'Земля помнит всех, кого в неё клали.',
});
add({
  id: 'dig_deeper', name: 'Копать глубже', type: 'rite', cost: 0, pool: 'gravedigger', rarity: 'basic', target: 'none', art: 'spade', startUnlocked: true,
  text: (u) => `Погреби верхнюю карту колоды. Возьми ${v(u, 1, 2)}.`,
  play: (x, u) => {
    x.buryTop();
    x.draw(v(u, 1, 2));
  },
});
add({
  id: 'spade', name: 'Лопата', type: 'strike', cost: 1, pool: 'gravedigger', rarity: 'common', target: 'enemy', art: 'spade', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 8, 10)} урона. Если у цели есть ${T.rot}: +${v(u, 4, 5)}.`,
  play: (x, u, t) => x.dmg(t!, v(u, 8, 10) + ((t!.statuses.rot ?? 0) > 0 ? v(u, 4, 5) : 0)),
  flavor: 'Рукоять вытерта до блеска чужими ладонями.',
});
add({
  id: 'stone_cross', name: 'Каменный Крест', type: 'strike', cost: 2, pool: 'gravedigger', rarity: 'common', target: 'enemy', art: 'cross', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 14, 17)} урона. Если вернулась из Могилы: ${T.dread} 2.`,
  play: (x, u, t) => {
    const back = !!x.card.returned;
    x.dmg(t!, v(u, 14, 17));
    if (back && t!.alive) x.apply(t!, 'dread', 2);
  },
});
add({
  id: 'grave_worm', name: 'Могильный червь', type: 'strike', cost: 1, pool: 'gravedigger', rarity: 'common', target: 'enemy', art: 'worm', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 5, 6)} урона. Наложи ${v(u, 3, 4)} ${T.rot}.`,
  play: (x, u, t) => {
    x.dmg(t!, v(u, 5, 6));
    if (t!.alive) x.apply(t!, 'rot', v(u, 3, 4));
  },
});
add({
  id: 'funeral_march', name: 'Похоронный марш', type: 'strike', cost: 2, pool: 'gravedigger', rarity: 'uncommon', target: 'all', art: 'march',
  text: (u) => `Нанеси ${v(u, 6, 8)} урона всем. +1 за каждую карту в Могиле (макс. +${v(u, 4, 6)}).`,
  play: (x, u) => x.dmgAll(v(u, 6, 8) + Math.min(x.graveSize, v(u, 4, 6))),
});
add({
  id: 'rotten_coffin', name: 'Гнилой гроб', type: 'strike', cost: 1, pool: 'gravedigger', rarity: 'uncommon', target: 'enemy', art: 'coffin',
  text: (u) => `Нанеси ${v(u, 8, 11)} урона. Если у цели 5+ ${T.rot}: ${T.chains} 1.`,
  play: (x, u, t) => {
    const big = (t!.statuses.rot ?? 0) >= 5;
    x.dmg(t!, v(u, 8, 11));
    if (big && t!.alive) x.apply(t!, 'chains', 1);
  },
});
add({
  id: 'weight_of_earth', name: 'Тяжесть земли', type: 'strike', cost: 2, pool: 'gravedigger', rarity: 'rare', target: 'enemy', art: 'earth',
  text: (u) => `Нанеси ${v(u, 6, 8)} урона +2 за каждую карту в Могиле (макс. ${v(u, 16, 20)}).`,
  play: (x, u, t) => x.dmg(t!, Math.min(v(u, 6, 8) + 2 * x.graveSize, v(u, 16, 20))),
});
add({
  id: 'rustle_slab', name: 'Шорох под плитой', type: 'strike', cost: 1, pool: 'gravedigger', rarity: 'common', target: 'enemy', art: 'slab',
  text: (u) => `Нанеси ${v(u, 4, 6)} урона. Наложи ${v(u, 3, 4)} ${T.bleed}.`,
  play: (x, u, t) => {
    x.dmg(t!, v(u, 4, 6));
    if (t!.alive) x.apply(t!, 'bleed', v(u, 3, 4));
  },
});
add({
  id: 'earth_to_earth', name: 'Земля к земле', type: 'ward', cost: 1, pool: 'gravedigger', rarity: 'common', target: 'none', art: 'earth', startUnlocked: true,
  text: (u) => `Получи ${v(u, 6, 8)} Брони. Погреби верхнюю карту колоды. +1 Брони за каждую карту в Могиле (макс. +${v(u, 5, 7)}).`,
  play: (x, u) => {
    x.buryTop();
    x.block(v(u, 6, 8) + Math.min(x.graveSize, v(u, 5, 7)));
  },
  flavor: 'Прах к праху — и никаких вопросов.',
});
add({
  id: 'shroud', name: 'Саван', type: 'ward', cost: 1, pool: 'gravedigger', rarity: 'common', target: 'none', art: 'shroud', startUnlocked: true,
  text: (u) => `Получи ${v(u, 7, 10)} Брони. В следующем ходу возьми на 1 карту больше.`,
  play: (x, u) => {
    x.block(v(u, 7, 10));
    x.nextDraw(1);
  },
});
add({
  id: 'crypt', name: 'Склеп', type: 'ward', cost: 2, pool: 'gravedigger', rarity: 'common', target: 'none', art: 'crypt', startUnlocked: true,
  text: (u) => `Получи ${v(u, 14, 18)} Брони.`,
  play: (x, u) => x.block(v(u, 14, 18)),
});
add({
  id: 'ash_to_ash', name: 'Пепел к пеплу', type: 'ward', cost: 1, pool: 'gravedigger', rarity: 'uncommon', target: 'none', art: 'ash',
  text: (u) => `Получи ${v(u, 5, 7)} Брони. Наложи ${v(u, 2, 3)} ${T.rot} всем врагам.`,
  play: (x, u) => {
    x.block(v(u, 5, 7));
    x.applyAll('rot', v(u, 2, 3));
  },
});
add({
  id: 'coffin_lid', name: 'Крышка гроба', type: 'ward', cost: 0, pool: 'gravedigger', rarity: 'uncommon', target: 'none', art: 'coffin', exhaust: true,
  text: (u) => `Получи ${v(u, 5, 8)} Брони. Исчерпай.`,
  play: (x, u) => x.block(v(u, 5, 8)),
});
add({
  id: 'headstone', name: 'Надгробие', type: 'ward', cost: 2, pool: 'gravedigger', rarity: 'uncommon', target: 'none', art: 'headstone', selfBury: true,
  text: (u) => `Получи ${v(u, 11, 14)} Брони. После розыгрыша уходит в Могилу.`,
  play: (x, u) => x.block(v(u, 11, 14)),
});
add({
  id: 'grave_whisper', name: 'Пыль могилы', type: 'rite', cost: 1, pool: 'gravedigger', rarity: 'common', target: 'enemy', art: 'dust', startUnlocked: true,
  text: (u) => `Наложи ${v(u, 5, 8)} ${T.rot}. Погреби случайную карту из руки.`,
  play: (x, u, t) => {
    x.apply(t!, 'rot', v(u, 5, 8));
    x.buryHand();
  },
});
add({
  id: 'exhumation', name: 'Эксгумация', type: 'rite', cost: 1, pool: 'gravedigger', rarity: 'uncommon', target: 'none', art: 'grave',
  exhaust: true, exhaustUnlessUp: true,
  text: (u) => `Верни 1 карту из Могилы в руку, она бесплатна в этот ход.${u ? '' : ' Исчерпай.'}`,
  play: (x) => x.exhume(1, true),
});
add({
  id: 'burial_psalm', name: 'Погребальная песнь', type: 'rite', cost: 1, pool: 'gravedigger', rarity: 'rare', target: 'enemy', art: 'psalm', exhaust: true,
  text: (u) => `Удвой ${T.rot} цели. Исчерпай.${u ? ' Стоит 0.' : ''}`,
  play: (x, _u, t) => x.apply(t!, 'rot', t!.statuses.rot ?? 0),
});
add({
  id: 'gravekeeper', name: 'Кладбищенский сторож', type: 'rite', cost: 1, pool: 'gravedigger', rarity: 'common', target: 'none', art: 'lantern',
  text: (u) => `Возьми ${v(u, 2, 3)}. Погреби случайную карту из руки.`,
  play: (x, u) => {
    x.draw(v(u, 2, 3));
    x.buryHand();
  },
});
add({
  id: 'resurrection_rite', name: 'Ритуал подъёма', type: 'rite', cost: 2, pool: 'gravedigger', rarity: 'rare', target: 'none', art: 'grave', exhaust: true,
  text: (u) => `Верни ${v(u, 2, 3)} карты из Могилы в руку. Исчерпай.`,
  play: (x, u) => x.exhume(v(u, 2, 3), false),
});
add({
  id: 'ancestors', name: 'Голоса предков', type: 'rite', cost: 2, pool: 'gravedigger', rarity: 'uncommon', target: 'none', art: 'ancestors',
  text: (u) => `Возьми ${v(u, 3, 4)}. Получи ${v(u, 6, 9)} Брони.`,
  play: (x, u) => {
    x.draw(v(u, 3, 4));
    x.block(v(u, 6, 9));
  },
});

/* ═════════════ Свечница ═════════════ */
add({
  id: 'memorial_candle', name: 'Поминальная свеча', type: 'rite', cost: 0, pool: 'wickkeeper', rarity: 'basic', target: 'none', art: 'candle', startUnlocked: true,
  text: (u) => `Потеряй ${v(u, 3, 2)} ЗДР. Получи ${v(u, 3, 4)} Пламени. Возьми 1.`,
  play: (x, u) => {
    x.loseHp(v(u, 3, 2));
    x.flame(v(u, 3, 4));
    x.draw(1);
  },
  flavor: 'Каждая свеча — чья-то последняя просьба.',
});
add({
  id: 'splinter', name: 'Лучина', type: 'rite', cost: 1, pool: 'wickkeeper', rarity: 'basic', target: 'none', art: 'flame', startUnlocked: true,
  text: (u) => `Получи ${v(u, 2, 3)} Пламени. Возьми 1.`,
  play: (x, u) => {
    x.flame(v(u, 2, 3));
    x.draw(1);
  },
});
add({
  id: 'wick', name: 'Фитиль', type: 'strike', cost: 1, pool: 'wickkeeper', rarity: 'common', target: 'enemy', art: 'wick', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 3, 4)} урона дважды. Если ЗДР ниже половины: трижды.`,
  play: (x, u, t) => {
    const n = x.hpPct < 0.5 ? 3 : 2;
    for (let i = 0; i < n && t!.alive; i++) x.dmg(t!, v(u, 3, 4));
  },
});
add({
  id: 'hot_wax', name: 'Жар', type: 'strike', cost: 2, pool: 'wickkeeper', rarity: 'common', target: 'enemy', art: 'flame', startUnlocked: true,
  text: (u) => `Потеряй 3 ЗДР. Нанеси ${v(u, 12, 15)} урона. Получи 2 Пламени.`,
  play: (x, u, t) => {
    x.loseHp(3);
    x.dmg(t!, v(u, 12, 15));
    x.flame(2);
  },
});
add({
  id: 'torch', name: 'Факел', type: 'strike', cost: 1, pool: 'wickkeeper', rarity: 'uncommon', target: 'all', art: 'torch',
  text: (u) => `Потеряй 2 ЗДР. Нанеси ${v(u, 5, 7)} урона всем.`,
  play: (x, u) => {
    x.loseHp(2);
    x.dmgAll(v(u, 5, 7));
  },
});
add({
  id: 'burn_bridges', name: 'Сжечь мосты', type: 'strike', cost: 3, pool: 'wickkeeper', rarity: 'rare', target: 'enemy', art: 'flame', exhaust: true,
  text: (u) => `Потеряй 8 ЗДР. Нанеси ${v(u, 24, 30)} урона. Исчерпай.`,
  play: (x, u, t) => {
    x.loseHp(8);
    x.dmg(t!, v(u, 24, 30));
  },
});
add({
  id: 'stub', name: 'Огарок', type: 'strike', cost: 0, pool: 'wickkeeper', rarity: 'common', target: 'enemy', art: 'wick',
  text: (u) => `Потеряй 1 ЗДР. Нанеси ${v(u, 4, 6)} урона. Получи 1 Пламя.`,
  play: (x, u, t) => {
    x.loseHp(1);
    x.dmg(t!, v(u, 4, 6));
    x.flame(1);
  },
});
add({
  id: 'wax_shoulders', name: 'Воск на плечи', type: 'ward', cost: 1, pool: 'wickkeeper', rarity: 'common', target: 'none', art: 'wax', startUnlocked: true,
  text: (u) => `Получи ${v(u, 6, 9)} Брони. Получи 1 Пламя.`,
  play: (x, u) => {
    x.block(v(u, 6, 9));
    x.flame(1);
  },
});
add({
  id: 'window_light', name: 'Свет в окне', type: 'ward', cost: 1, pool: 'wickkeeper', rarity: 'common', target: 'none', art: 'window',
  text: (u) => `Получи ${v(u, 6, 8)} Брони. Исцели ${v(u, 2, 3)}.`,
  play: (x, u) => {
    x.block(v(u, 6, 8));
    x.heal(v(u, 2, 3));
  },
});
add({
  id: 'snuffer', name: 'Колпак', type: 'ward', cost: 2, pool: 'wickkeeper', rarity: 'uncommon', target: 'none', art: 'ward',
  text: (u) => `Получи ${v(u, 12, 16)} Брони. Теряешь всё Пламя.`,
  play: (x, u) => {
    x.block(v(u, 12, 16));
    x.hero.flame = 0;
  },
});
add({
  id: 'smoke_veil', name: 'Завеса дыма', type: 'ward', cost: 1, pool: 'wickkeeper', rarity: 'uncommon', target: 'none', art: 'smoke',
  text: (u) => `Получи ${v(u, 5, 7)} Брони. Наложи ${T.dread} 1 всем врагам.`,
  play: (x, u) => {
    x.block(v(u, 5, 7));
    x.applyAll('dread', 1);
  },
});
add({
  id: 'confession_wax', name: 'Исповедь воска', type: 'rite', cost: 1, pool: 'wickkeeper', rarity: 'uncommon', target: 'none', art: 'wax', exhaust: true,
  text: (u) => `Исцели ${v(u, 8, 12)}. Исчерпай.`,
  play: (x, u) => x.heal(v(u, 8, 12)),
});
add({
  id: 'fire_in_palms', name: 'Пламя в ладонях', type: 'rite', cost: 1, pool: 'wickkeeper', rarity: 'rare', target: 'none', art: 'flame',
  text: (u) => `Удвой Пламя (макс. +${v(u, 8, 12)}).`,
  play: (x, u) => x.flame(Math.min(x.hero.flame, v(u, 8, 12))),
});
add({
  id: 'whisper_fire', name: 'Шёпот огня', type: 'rite', cost: 1, pool: 'wickkeeper', rarity: 'common', target: 'enemy', art: 'flame',
  text: (u) => `Потеряй 2 ЗДР. Наложи ${v(u, 4, 6)} ${T.bleed}.`,
  play: (x, u, t) => {
    x.loseHp(2);
    x.apply(t!, 'bleed', v(u, 4, 6));
  },
});
add({
  id: 'warm_tallow', name: 'Тёплый сальный воск', type: 'rite', cost: 1, pool: 'wickkeeper', rarity: 'common', target: 'none', art: 'wax',
  text: (u) => `Исцели ${v(u, 4, 6)}. Получи 2 Пламени.`,
  play: (x, u) => {
    x.heal(v(u, 4, 6));
    x.flame(2);
  },
});

/* ═════════════ Нейтральные ═════════════ */
add({
  id: 'rusty_axe', name: 'Ржавый топор', type: 'strike', cost: 1, pool: 'neutral', rarity: 'common', target: 'enemy', art: 'axe', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 9, 12)} урона.`,
  play: (x, u, t) => x.dmg(t!, v(u, 9, 12)),
});
add({
  id: 'chain_lash', name: 'Хлёст цепью', type: 'strike', cost: 1, pool: 'neutral', rarity: 'common', target: 'enemy', art: 'chain', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 5, 7)} урона. Если у цели ${T.dread}: ${T.chains} 1.`,
  play: (x, u, t) => {
    const f = (t!.statuses.dread ?? 0) > 0;
    x.dmg(t!, v(u, 5, 7));
    if (f && t!.alive) x.apply(t!, 'chains', 1);
  },
});
add({
  id: 'double_toll', name: 'Двойной звон', type: 'strike', cost: 1, pool: 'neutral', rarity: 'common', target: 'enemy', art: 'bell', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 4, 5)} урона дважды.`,
  play: (x, u, t) => {
    x.dmg(t!, v(u, 4, 5));
    if (t!.alive) x.dmg(t!, v(u, 4, 5));
  },
});
add({
  id: 'vault_fall', name: 'Падение свода', type: 'strike', cost: 2, pool: 'neutral', rarity: 'uncommon', target: 'all', art: 'ribs',
  text: (u) => `Нанеси ${v(u, 8, 11)} урона всем.`,
  play: (x, u) => x.dmgAll(v(u, 8, 11)),
});
add({
  id: 'last_mercy', name: 'Последняя милость', type: 'strike', cost: 1, pool: 'neutral', rarity: 'uncommon', target: 'enemy', art: 'mercy',
  text: (u) => `Нанеси ${v(u, 5, 7)} урона. Если у цели меньше 30% ЗДР: вдвое больше.`,
  play: (x, u, t) => {
    const low = t!.hp < t!.maxHp * 0.3;
    x.dmg(t!, v(u, 5, 7) * (low ? 2 : 1));
  },
});
add({
  id: 'looter', name: 'Мародёр', type: 'strike', cost: 1, pool: 'neutral', rarity: 'common', target: 'enemy', art: 'purse',
  text: (u) => `Нанеси ${v(u, 6, 8)} урона. Если убьёт: +${v(u, 8, 12)} монет.`,
  play: (x, u, t) => {
    if (x.dmg(t!, v(u, 6, 8))) x.bounty(v(u, 8, 12));
  },
});
add({
  id: 'tin_shield', name: 'Оловянный щит', type: 'ward', cost: 1, pool: 'neutral', rarity: 'common', target: 'none', art: 'ward', startUnlocked: true,
  text: (u) => `Получи ${v(u, 8, 11)} Брони.`,
  play: (x, u) => x.block(v(u, 8, 11)),
});
add({
  id: 'fog_cloak', name: 'Плащ из тумана', type: 'ward', cost: 1, pool: 'neutral', rarity: 'common', target: 'none', art: 'fog', startUnlocked: true,
  text: (u) => `Получи ${v(u, 6, 8)} Брони. Возьми 1.`,
  play: (x, u) => {
    x.block(v(u, 6, 8));
    x.draw(1);
  },
});
add({
  id: 'stance', name: 'Стойка', type: 'ward', cost: 0, pool: 'neutral', rarity: 'common', target: 'none', art: 'ward',
  text: (u) => `Получи ${v(u, 3, 5)} Брони.`,
  play: (x, u) => x.block(v(u, 3, 5)),
});
add({
  id: 'breath_in', name: 'Вдох', type: 'rite', cost: 0, pool: 'neutral', rarity: 'common', target: 'none', art: 'breath', startUnlocked: true,
  text: (u) => `Возьми ${v(u, 2, 3)}.`,
  play: (x, u) => x.draw(v(u, 2, 3)),
});
add({
  id: 'holy_fear', name: 'Страх божий', type: 'rite', cost: 1, pool: 'neutral', rarity: 'uncommon', target: 'none', art: 'eye',
  text: (u) => `Наложи ${T.dread} ${v(u, 2, 3)} всем врагам.`,
  play: (x, u) => x.applyAll('dread', v(u, 2, 3)),
});
add({
  id: 'bloodletting', name: 'Кровопускание', type: 'rite', cost: 1, pool: 'neutral', rarity: 'common', target: 'enemy', art: 'blood', startUnlocked: true,
  text: (u) => `Наложи ${v(u, 5, 8)} ${T.bleed}.`,
  play: (x, u, t) => x.apply(t!, 'bleed', v(u, 5, 8)),
});
add({
  id: 'gulp_dark', name: 'Глоток тьмы', type: 'rite', cost: 1, pool: 'neutral', rarity: 'uncommon', target: 'none', art: 'breath', exhaust: true,
  text: (u) => `Получи 2 Дыхания. Исчерпай.${u ? ' Стоит 0.' : ''}`,
  play: (x) => x.breath(2),
});
add({
  id: 'bandages', name: 'Бинты', type: 'rite', cost: 1, pool: 'neutral', rarity: 'common', target: 'none', art: 'bandage', exhaust: true,
  text: (u) => `Исцели ${v(u, 4, 7)}. Исчерпай.`,
  play: (x, u) => x.heal(v(u, 4, 7)),
});
add({
  id: 'wind_whisper', name: 'Шёпот ветра', type: 'rite', cost: 0, pool: 'neutral', rarity: 'common', target: 'enemy', art: 'wind',
  text: (u) => `Наложи ${T.dread} ${v(u, 1, 2)}. Возьми 1.`,
  play: (x, u, t) => {
    x.apply(t!, 'dread', v(u, 1, 2));
    x.draw(1);
  },
});
add({
  id: 'agnetas_voice', name: 'Голос Агнеты', type: 'ward', cost: 2, pool: 'neutral', rarity: 'legend', target: 'enemy', art: 'voice', exhaust: true,
  text: (u) => `Атака цели в этот ход не наносит урона. Исчерпай.${u ? ' Стоит 1.' : ''}`,
  play: (x, _u, t) => x.mute(t!),
  flavor: 'Седьмая из Двенадцати. Спела так, что услышал даже камень.',
});


/* ═════════════ Звонарь ═════════════ */
const toll = (x: Ctx) => x.hero.toll;
add({
  id: 'bell_strike', name: 'Удар в колокол', type: 'rite', cost: 1, pool: 'bellringer', rarity: 'basic', target: 'none', art: 'bell', startUnlocked: true,
  text: (u) => `+${v(u, 2, 3)} Звона. Возьми 1.`,
  play: (x, u) => { x.toll(v(u, 2, 3)); x.draw(1); },
  flavor: 'Колокол без языка всё равно звучит.',
});
add({
  id: 'pull_cord', name: 'Потянуть шнур', type: 'rite', cost: 0, pool: 'bellringer', rarity: 'basic', target: 'none', art: 'chain', startUnlocked: true,
  text: (u) => `Получи ${v(u, 3, 5)} Брони. +1 Звон.`,
  play: (x, u) => { x.block(v(u, 3, 5)); x.toll(1); },
});
add({
  id: 'copper_tongue', name: 'Медный язык', type: 'strike', cost: 1, pool: 'bellringer', rarity: 'common', target: 'enemy', art: 'bell', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 7, 9)} урона. +1 Звон.`,
  play: (x, u, t) => { x.dmg(t!, v(u, 7, 9)); x.toll(1); },
});
add({
  id: 'muffled_toll', name: 'Глухой звон', type: 'ward', cost: 1, pool: 'bellringer', rarity: 'common', target: 'none', art: 'ward', startUnlocked: true,
  text: (u) => `Получи ${v(u, 7, 10)} Брони. +1 Звон.`,
  play: (x, u) => { x.block(v(u, 7, 10)); x.toll(1); },
});
add({
  id: 'triple_peal', name: 'Трезвон', type: 'strike', cost: 1, pool: 'bellringer', rarity: 'common', target: 'enemy', art: 'bell', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 3, 4)} урона трижды.`,
  play: (x, u, t) => { for (let i = 0; i < 3 && t!.alive; i++) x.dmg(t!, v(u, 3, 4)); },
});
add({
  id: 'echo', name: 'Эхо', type: 'strike', cost: 0, pool: 'bellringer', rarity: 'common', target: 'enemy', art: 'wind', startUnlocked: true,
  text: (u) => `Нанеси ${v(u, 4, 6)} урона. +1 Звон.`,
  play: (x, u, t) => { x.dmg(t!, v(u, 4, 6)); x.toll(1); },
});
add({
  id: 'bell_tower', name: 'Колокольня', type: 'ward', cost: 2, pool: 'bellringer', rarity: 'common', target: 'none', art: 'crypt', startUnlocked: true,
  text: (u) => `Получи ${v(u, 12, 16)} Брони. +2 Звона.`,
  play: (x, u) => { x.block(v(u, 12, 16)); x.toll(2); },
});
add({
  id: 'peal', name: 'Перезвон', type: 'rite', cost: 1, pool: 'bellringer', rarity: 'common', target: 'none', art: 'voice', startUnlocked: true,
  text: (u) => `+${v(u, 3, 4)} Звона.`,
  play: (x, u) => x.toll(v(u, 3, 4)),
});
add({
  id: 'alarm', name: 'Набат', type: 'strike', cost: 2, pool: 'bellringer', rarity: 'uncommon', target: 'all', art: 'march',
  text: (u) => `Нанеси ${v(u, 5, 7)} урона всем. +2 Звона.`,
  play: (x, u) => { x.dmgAll(v(u, 5, 7)); x.toll(2); },
});
add({
  id: 'great_strike', name: 'Колокольный удар', type: 'strike', cost: 2, pool: 'bellringer', rarity: 'uncommon', target: 'enemy', art: 'cross',
  text: (u) => `Нанеси ${v(u, 12, 15)} урона. Если Звона 4+: +${v(u, 6, 8)}.`,
  play: (x, u, t) => x.dmg(t!, v(u, 12, 15) + (toll(x) >= 4 ? v(u, 6, 8) : 0)),
});
add({
  id: 'resonance', name: 'Резонанс', type: 'rite', cost: 1, pool: 'bellringer', rarity: 'uncommon', target: 'enemy', art: 'eye',
  text: (u) => `Если Звона 3+: ${T.chains} 1. Иначе ${T.dread} ${v(u, 2, 3)}.`,
  play: (x, u, t) => { if (toll(x) >= 3) x.apply(t!, 'chains', 1); else x.apply(t!, 'dread', v(u, 2, 3)); },
});
add({
  id: 'rust_bell', name: 'Ржавый колокол', type: 'rite', cost: 2, pool: 'bellringer', rarity: 'uncommon', target: 'none', art: 'bell',
  text: (u) => `Наложи ${T.dread} ${v(u, 2, 3)} всем врагам. +3 Звона.`,
  play: (x, u) => { x.applyAll('dread', v(u, 2, 3)); x.toll(3); },
});
add({
  id: 'silence', name: 'Тишина', type: 'ward', cost: 1, pool: 'bellringer', rarity: 'uncommon', target: 'none', art: 'shroud',
  text: (u) => `Получи ${v(u, 6, 9)} Брони. В следующем ходу возьми на 1 карту больше.`,
  play: (x, u) => { x.block(v(u, 6, 9)); x.nextDraw(1); },
});
add({
  id: 'choir_of_one', name: 'Хор из одного', type: 'ward', cost: 1, pool: 'bellringer', rarity: 'uncommon', target: 'none', art: 'ancestors',
  text: (u) => `Получи ${v(u, 4, 5)} Брони за каждый тип карты, сыгранный в этом ходу.`,
  play: (x, u) => x.block(v(u, 4, 5) * Math.max(1, x.types.size)),
});
add({
  id: 'funeral_peal', name: 'Погребальный звон', type: 'rite', cost: 2, pool: 'bellringer', rarity: 'rare', target: 'none', art: 'psalm', exhaust: true,
  text: (u) => `Звон станет 5, затем +1: колокол бьёт сразу. Исчерпай.${u ? ' Стоит 1.' : ''}`,
  play: (x) => { x.hero.toll = 5; x.toll(1); },
});
add({
  id: 'not_for_you', name: 'Колокол не по тебе', type: 'rite', cost: 1, pool: 'bellringer', rarity: 'rare', target: 'none', art: 'bell', exhaust: true,
  text: (u) => `Возьми ${v(u, 2, 3)}. +2 Звона. Получи 1 Дыхание. Исчерпай.`,
  play: (x, u) => { x.draw(v(u, 2, 3)); x.toll(2); x.breath(1); },
});
add({
  id: 'iron_clapper', name: 'Железный язык', type: 'strike', cost: 1, pool: 'bellringer', rarity: 'rare', target: 'enemy', art: 'axe',
  text: (u) => `Нанеси ${v(u, 4, 5)} +3 за каждый Звон (макс. ${v(u, 22, 26)}).`,
  play: (x, u, t) => x.dmg(t!, Math.min(v(u, 4, 5) + 3 * toll(x), v(u, 22, 26))),
});
add({
  id: 'last_note', name: 'Последняя нота', type: 'strike', cost: 3, pool: 'bellringer', rarity: 'rare', target: 'enemy', art: 'note', exhaust: true,
  text: (u) => `Нанеси ${v(u, 20, 26)} урона. Если ЗДР ниже 30%: +10. Исчерпай.`,
  play: (x, u, t) => x.dmg(t!, v(u, 20, 26) + (x.hpPct < 0.3 ? 10 : 0)),
});

/* ═════════════ Долги ═════════════ */
add({
  id: 'iou', name: 'Расписка Ростовщика', type: 'debt', cost: 0, pool: 'debt', rarity: 'common', target: 'none', art: 'iou', unplayable: true, startUnlocked: true,
  text: () => 'Нельзя сыграть. Если в руке в конце хода: потеряй 2 ЗДР.',
  play: () => {},
  onTurnEnd: (x) => x.loseHp(2),
  flavor: 'Подпись твоя. Или очень похожа.',
});
add({
  id: 'guilt', name: 'Тяжесть вины', type: 'debt', cost: 0, pool: 'debt', rarity: 'common', target: 'none', art: 'guilt', unplayable: true, ethereal: true, startUnlocked: true,
  text: () => 'Нельзя сыграть. Эфемерна.',
  play: () => {},
});

/* Улучшаемые стоимости: стоимость зависит от улучшения. */
export function cardCost(id: string, up: boolean): number {
  const d = CARDS[id];
  if (up && (id === 'agnetas_voice')) return 1;
  if (up && (id === 'gulp_dark' || id === 'burial_psalm')) return 0;
  return d.cost;
}

export const BASIC_DECKS: Record<string, string[]> = {
  gravedigger: ['strike', 'strike', 'strike', 'strike', 'ward', 'ward', 'ward', 'ward', 'grave_dust', 'dig_deeper'],
  wickkeeper: ['strike', 'strike', 'strike', 'strike', 'ward', 'ward', 'ward', 'ward', 'memorial_candle', 'splinter'],
  bellringer: ['strike', 'strike', 'strike', 'strike', 'ward', 'ward', 'ward', 'ward', 'bell_strike', 'pull_cord'],
  penitent: [],
};

export const ROLE_INFO: Record<string, { name: string; hp: number; tagline: string; chord: string; blurb: string }> = {
  gravedigger: {
    name: 'Могильщик', hp: 80,
    tagline: 'Тлен · Могила',
    chord: 'Аккорд: верни карту из Могилы в руку, она бесплатна.',
    blurb: 'Хоронит собственные карты и возвращает их, когда они нужнее. Медленный, прочный, терпеливый.',
  },
  wickkeeper: {
    name: 'Свечница', hp: 66,
    tagline: 'Пламя · Кровь',
    chord: 'Аккорд: +3 Пламени и исцели 2.',
    blurb: 'Платит здоровьем за свет. Каждая сгоревшая свеча — удар сильнее. Хрупкая и яркая.',
  },
  bellringer: { name: 'Звонарь', hp: 72, tagline: 'Звон · Оковы', chord: 'Аккорд: +2 Звона.', blurb: 'Каждая сыгранная карта звенит. На шестом ударе колокол бьёт по всем врагам на 6 урона. Ритм вместо расчёта.' },
  penitent: { name: 'Исповедник', hp: 70, tagline: 'Долг · Страх', chord: '—', blurb: 'Откроется по ходу истории.' },
};
