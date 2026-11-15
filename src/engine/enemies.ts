import type { EnemyDef, EnemyInst, Move, CombatLike } from './types.ts';

const atk = (id: string, name: string, dmg: number, hits = 1, extra: Partial<Move> = {}): Move => ({
  id, name, kind: 'attack', dmg, hits, ...extra,
});
const def = (id: string, name: string, block: number, extra: Partial<Move> = {}): Move => ({
  id, name, kind: 'defend', block, ...extra,
});
const dbf = (id: string, name: string, status: 'rot' | 'bleed' | 'dread' | 'chains', n: number, extra: Partial<Move> = {}): Move => ({
  id, name, kind: 'debuff', apply: { status, n }, ...extra,
});

const t = (e: EnemyInst) => e.moveIdx;
const alive = (c: CombatLike) => c.enemies.filter((x) => x.alive).length;

export const ENEMIES: Record<string, EnemyDef> = {
  /* ───────────── Круг I · Мелководье ───────────── */
  drowned_laundress: {
    id: 'drowned_laundress', name: 'Утопленница-прачка', hp: [24, 28], circle: 1, tier: 'normal', art: 'laundress',
    blurb: 'Стирает бельё мёртвых в затопленном рынке. Руки у неё всегда мокрые.',
    pick: (e) => [atk('wring', 'Выжимать', 6), dbf('wail', 'Плач', 'dread', 1), atk('slap', 'Мокрая простыня', 9)][t(e) % 3],
  },
  silt_hound: {
    id: 'silt_hound', name: 'Тинный пёс', hp: [20, 24], circle: 1, tier: 'normal', art: 'hound',
    blurb: 'Тварь из ила. Идёт по следу тех, кого уже звали колоколом.',
    pick: (e) => [atk('bite', 'Укусы', 4, 2), atk('lunge', 'Бросок', 8, 1, { apply: { status: 'bleed', n: 2 } }), def('shake', 'Отряхнуться', 6)][t(e) % 3],
  },
  stone_fisher: {
    id: 'stone_fisher', name: 'Каменный рыбак', hp: [38, 42], circle: 1, tier: 'normal', art: 'fisher',
    blurb: 'Закидывает сеть в сухой колодец. Ловит всегда одного и того же.',
    pick: (e) => [atk('net', 'Сеть', 5, 1, { apply: { status: 'chains', n: 1 } }), def('stand', 'Стоять', 8), atk('haul', 'Подсечка', 14)][t(e) % 3],
  },
  mussel: {
    id: 'mussel', name: 'Певчая ракушка', hp: [10, 12], circle: 1, tier: 'normal', art: 'mussel',
    blurb: 'Поёт на три голоса. Поодиночке — слабо, хором — до костей.',
    pick: (e) => [atk('chip', 'Щёлк', 3, 1), def('close', 'Створки', 5), atk('chorus', 'Хор', 4, 1, { blockAll: 2 })][t(e) % 3],
  },
  alban: {
    id: 'alban', name: 'Старший могильщик Альбан', hp: [68, 72], circle: 1, tier: 'elite', art: 'alban',
    blurb: 'Копал для живых, пока не стал копать для себя. Могилы у него всегда готовы.',
    pick: (e) =>
      [
        atk('spade', 'Удар лопатой', 12),
        { id: 'bury', name: 'Закопать долг', kind: 'debuff', junk: { card: 'iou', n: 1 }, text: 'Подсунет расписку' } as Move,
        def('brace', 'Упереться', 12, { strength: 2 }),
        atk('dig', 'Копка', 6, 2),
      ][t(e) % 4],
  },
  drowned_bellman: {
    id: 'drowned_bellman', name: 'Утонувший звонарь', hp: [58, 62], circle: 1, tier: 'elite', art: 'bellman',
    blurb: 'Звонит под водой в колокол без языка. Звук идёт по костям.',
    pick: (e) => [atk('toll', 'Глухой удар', 8), dbf('muffle', 'Приглушённый звон', 'dread', 2, { blockAll: 6 }), atk('knell', 'Погребальный звон', 22)][t(e) % 3],
  },
  tide_mother: {
    id: 'tide_mother', name: 'Мать Приливов', hp: [118, 118], circle: 1, tier: 'boss', art: 'tide',
    blurb: 'Стерегла Мелководье, пока Нисхождение не перестало быть её. Прилив — её дыхание.',
    pick: (e) => {
      const hi = e.phase >= 1;
      const k = t(e) % 4;
      if (k === 0) return atk('surge', 'Накат', hi ? 14 : 11);
      if (k === 1) return def('ebb', 'Отлив', hi ? 20 : 14, { heal: hi ? 0 : 6 });
      if (k === 2) return atk('swell', 'Волны', hi ? 7 : 6, 3);
      return dbf('deep', 'Глубина', 'dread', 2, { apply: { status: 'chains', n: 1 }, text: 'Страх и оковы' });
    },
  },

  /* ───────────── Круг II · Рёбра ───────────── */
  candle_bearer: {
    id: 'candle_bearer', name: 'Свечник', hp: [6, 8], circle: 2, tier: 'normal', art: 'candle',
    blurb: 'Держит огонь, пока другой дерётся. Погаси его первым.',
    pick: (e) => [def('feed', 'Подпитка', 0, { blockAll: 5 }), atk('drip', 'Капля воска', 3)][t(e) % 2],
  },
  ash_monk: {
    id: 'ash_monk', name: 'Пепельный монах', hp: [32, 36], circle: 2, tier: 'normal', art: 'monk',
    blurb: 'Сгорел вместе с часовней, но не заметил.',
    pick: (e) => [atk('smite', 'Удар чёток', 8), dbf('smoke', 'Дым', 'bleed', 3), atk('pyre', 'Костёр', 12)][t(e) % 3],
  },
  stained_seraph: {
    id: 'stained_seraph', name: 'Стеклянный серафим', hp: [40, 46], circle: 2, tier: 'normal', art: 'seraph',
    blurb: 'Витражное крыло. Бьёт осколками, поёт стеклом.',
    pick: (e) => [atk('shards', 'Осколки', 5, 3), def('prism', 'Призма', 10), atk('shatter', 'Разбить', 15)][t(e) % 3],
  },
  choir_reaper: {
    id: 'choir_reaper', name: 'Жнец Хора', hp: [54, 54], circle: 2, tier: 'elite', art: 'reaper',
    blurb: 'Косит не колосья, а голоса. Молчащих оставляет напоследок.',
    pick: (e) => [atk('scythe', 'Косьба', 16), atk('reap', 'Жатва', 9, 2), dbf('requiem', 'Заупокой', 'dread', 2, { block: 8 })][t(e) % 3],
  },
  choirmaster: {
    id: 'choirmaster', name: 'Хормейстер Оттон', hp: [150, 150], circle: 2, tier: 'boss', art: 'choirmaster',
    blurb: 'Дирижирует мёртвыми. Руки у него — единственное живое.',
    pick: (e, c) => {
      const k = t(e) % 4;
      if (k === 0 && alive(c) < 3) return { id: 'conduct', name: 'Вступайте', kind: 'summon', summon: 'candle_bearer', text: 'Призывает свечника' };
      if (k === 0) return atk('baton', 'Палочка', 13);
      if (k === 1) return atk('tutti', 'Тутти', 7, 3);
      if (k === 2) return { id: 'cresc', name: 'Крещендо', kind: 'buff', strength: e.phase >= 1 ? 3 : 2, block: 10 };
      return atk('fermata', 'Фермата', e.phase >= 1 ? 24 : 18);
    },
  },
};

export const ENCOUNTERS: Record<number, { normal: string[][]; elite: string[][]; boss: string[][] }> = {
  1: {
    normal: [['drowned_laundress'], ['silt_hound', 'silt_hound'], ['stone_fisher'], ['mussel', 'mussel', 'mussel'], ['drowned_laundress', 'silt_hound']],
    elite: [['alban'], ['drowned_bellman']],
    boss: [['tide_mother']],
  },
  2: {
    normal: [['ash_monk'], ['stained_seraph'], ['ash_monk', 'candle_bearer', 'candle_bearer'], ['stained_seraph', 'candle_bearer']],
    elite: [['choir_reaper', 'candle_bearer', 'candle_bearer']],
    boss: [['choirmaster']],
  },
  3: { normal: [], elite: [], boss: [] },
};
