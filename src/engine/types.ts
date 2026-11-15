export type CardType = 'strike' | 'ward' | 'rite';
export type Rarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'legend';
export type RoleId = 'gravedigger' | 'wickkeeper' | 'bellringer' | 'penitent';
export type CardPool = RoleId | 'neutral' | 'debt';
export type StatusId = 'rot' | 'bleed' | 'dread' | 'chains';

export interface CardInst {
  uid: number;
  id: string;
  up: boolean;
  /** Карта вернулась из Могилы в этом ходу/бою. */
  returned?: boolean;
  /** Временная скидка на ход. */
  free?: boolean;
}

export type Statuses = Partial<Record<StatusId, number>>;

export interface HeroState {
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
  flame: number;
  toll: number;
}

export type IntentKind = 'attack' | 'defend' | 'debuff' | 'buff' | 'heal' | 'summon' | 'unknown';

export interface Move {
  id: string;
  name: string;
  kind: IntentKind;
  dmg?: number;
  hits?: number;
  block?: number;
  /** Блок всем союзникам. */
  blockAll?: number;
  /** Статус на героя. */
  apply?: { status: StatusId; n: number };
  /** Добавить карту в сброс героя. */
  junk?: { card: string; n: number };
  heal?: number;
  summon?: string;
  strength?: number;
  /** Подсказка для UI. */
  text?: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: [number, number];
  circle: 1 | 2 | 3;
  tier: 'normal' | 'elite' | 'boss';
  /** Выбор хода по номеру хода врага (с нуля) и состоянию. */
  pick: (e: EnemyInst, c: CombatLike) => Move;
  /** Для UI: стиль портрета. */
  art: string;
  blurb: string;
  /** Иммунитет к Оковам на N ходов после применения. */
  stunResist?: boolean;
}

/** Минимальный интерфейс боя для функций выбора хода. */
export interface CombatLike {
  turn: number;
  enemies: EnemyInst[];
  hero: HeroState;
  rng: { next(): number; int(a: number, b: number): number };
}

export interface EnemyInst {
  uid: number;
  def: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
  strength: number;
  moveIdx: number;
  intent: Move;
  alive: boolean;
  /** Ходов иммунитета к Оковам. */
  stunImmune: number;
  phase: number;
}

export type GameEvent =
  | { t: 'damage'; target: 'hero' | number; amount: number; blocked: number; src?: number | 'hero' }
  | { t: 'block'; target: 'hero' | number; amount: number }
  | { t: 'heal'; target: 'hero' | number; amount: number }
  | { t: 'status'; target: 'hero' | number; status: StatusId; n: number }
  | { t: 'play'; card: CardInst }
  | { t: 'draw'; card: CardInst }
  | { t: 'bury'; card: CardInst }
  | { t: 'exhume'; card: CardInst }
  | { t: 'exhaust'; card: CardInst }
  | { t: 'chord'; role: RoleId }
  | { t: 'toll' }
  | { t: 'death'; enemy: number }
  | { t: 'summon'; enemy: number }
  | { t: 'turn'; who: 'hero' | 'enemy'; n: number }
  | { t: 'act'; enemy: number; name: string }
  | { t: 'log'; text: string }
  | { t: 'end'; result: 'win' | 'lose' };
