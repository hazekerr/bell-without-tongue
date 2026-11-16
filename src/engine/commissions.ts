/* Заказы: необязательная цель забега от NPC хаба. Награда сюжетная и разовая в рамках забега (никакой постоянной силы). */
import { Rng } from './rng.ts';
import type { Chronicle } from './chronicle.ts';
import type { RunState } from './run.ts';

export type Giver = 'Ильза' | 'Мёрк' | 'Тин' | 'Гаспар';

export interface CommissionReward {
  gold?: number;
  relic?: 'common' | 'elite';
  heal?: 'full' | number;
  /** Выбор из трёх редких карт. */
  rarePick?: boolean;
  /** Страница Хроники. */
  page: string;
}

export interface CommissionDef {
  id: string;
  giver: Giver;
  title: string;
  goal: string;
  /** Что говорит заказчик. */
  line: string;
  /** Нужно знать имя, чтобы получить заказ. */
  needsName?: string;
  /** Выполнено ли. */
  done: (r: RunState) => boolean;
  /** Провалено ли безвозвратно. */
  failed?: (r: RunState) => boolean;
  reward: CommissionReward;
}

export const COMMISSIONS: CommissionDef[] = [
  {
    id: 'elite_hunt', giver: 'Ильза', title: 'Принеси мне голос', goal: 'Победи элитного врага.',
    line: 'Орден коллекционирует последние слова. Принеси мне одно, и я запишу его.',
    done: (r) => r.stats.elites >= 1,
    reward: { relic: 'elite', gold: 40, page: 'c_ilse_1' },
  },
  {
    id: 'light_sleeper', giver: 'Мёрк', title: 'Не присаживайся', goal: 'Победи босса Круга I, ни разу не отдохнув у Свечи.',
    line: 'Лёг отдыхать — считай, что лёг навсегда. Попробуй пройти без передышки.',
    done: (r) => r.circle >= 2 && (r.stats.rests ?? 0) === 0,
    failed: (r) => (r.stats.rests ?? 0) > 0,
    reward: { heal: 'full', rarePick: true, page: 'c_murk_1' },
  },
  {
    id: 'light_pack', giver: 'Мёрк', title: 'Налегке', goal: 'Достигни Круга II, имея в колоде не больше 12 карт.',
    line: 'Тяжёлую колоду долго копать. Проверь, сколько в тебе лишнего.',
    done: (r) => r.circle >= 2 && r.deck.length <= 12,
    failed: (r) => r.circle >= 2 && r.deck.length > 12,
    reward: { relic: 'common', heal: 15, page: 'c_murk_2' },
  },
  {
    id: 'choir_practice', giver: 'Тин', title: 'Подпой мне', goal: 'Собери 5 Аккордов за забег.',
    line: 'Я пою одну строчку. Хочу услышать, как это звучит втроём.',
    needsName: 'Тин',
    done: (r) => r.stats.chords >= 5,
    reward: { rarePick: true, page: 'c_tin_1' },
  },
  {
    id: 'gold_miser', giver: 'Гаспар', title: 'Долги надо возвращать', goal: 'Накопи 250 монет одновременно.',
    line: 'Принеси мне ровно столько, сколько я записал. И не потрать по дороге.',
    needsName: 'Гаспар',
    done: (r) => r.gold >= 250,
    reward: { relic: 'common', gold: 50, page: 'c_gaspar_1' },
  },
];
export const COMMISSION_BY_ID = Object.fromEntries(COMMISSIONS.map((c) => [c.id, c]));

/** Три предложения на выбор: заказчик с неизвестным именем не предлагает. */
export function offerCommissions(chron: Chronicle, rng: Rng): CommissionDef[] {
  const pool = COMMISSIONS.filter((c) => !c.needsName || chron.names.includes(c.needsName));
  return rng.shuffle([...pool]).slice(0, 3);
}

/** Проверка после каждого узла. Возвращает заказ, если он только что выполнен. */
export function checkCommission(run: RunState): CommissionDef | null {
  const st = run.commission;
  if (!st || st.state !== 'active') return null;
  const def = COMMISSION_BY_ID[st.id];
  if (!def) return null;
  if (def.done(run)) {
    st.state = 'done';
    return def;
  }
  if (def.failed?.(run)) st.state = 'failed';
  return null;
}
